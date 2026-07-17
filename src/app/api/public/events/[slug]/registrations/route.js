import { NextResponse } from 'next/server'
import { sendToOne } from '@/lib/mailer'
import prisma from '@/lib/prisma'
import { isValidNip, normalizeNip } from '@/lib/nip'
import { computeRegistration } from '@/lib/services/eventPricing'
import { registrationClosedReason } from '@/lib/events'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
}

const jsonCors = (data, status = 200) =>
	new NextResponse(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...CORS } })

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const ADMIN_EVENTS_EMAIL = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL || 'programista@nautil.pl'
const DEFAULT_BANK_ACCOUNT = process.env.EVENTS_BANK_ACCOUNT || ''

const formatPln = kwota => `${Number(kwota).toFixed(2).replace('.', ',')} zł`
const formatDate = d => new Date(d).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })

export async function POST(request, { params }) {
	try {
		const { slug } = await params
		const body = await request.json()

		// Honeypot — ukryte pole; jeśli wypełnione, to bot. Udajemy sukces, nic nie zapisujemy.
		if (body.company_website) {
			return jsonCors({ message: 'OK' }, 200)
		}

		// Rate-limit po IP (fail-open jeśli Redis padnie)
		const ip = getClientIp(request)
		const allowed = await checkRateLimit(`event-reg:${ip}`, { limit: 10, windowSec: 600 })
		if (!allowed) {
			return jsonCors({ message: 'Zbyt wiele zgłoszeń. Spróbuj ponownie za kilka minut.' }, 429)
		}

		// --- Walidacja pól ---
		const firstName = (body.firstName || '').trim()
		const lastName = (body.lastName || '').trim()
		const email = (body.email || '').trim()
		const firmaNazwa = (body.firmaNazwa || '').trim()
		const firmaAdres = (body.firmaAdres || '').trim() || null
		const nipRaw = body.firmaNip || ''
		const nip = normalizeNip(nipRaw)

		if (!firstName || !lastName) {
			return jsonCors({ message: 'Imię i nazwisko są wymagane.' }, 400)
		}
		if (!EMAIL_RE.test(email)) {
			return jsonCors({ message: 'Podaj poprawny adres e-mail.' }, 400)
		}
		if (!firmaNazwa) {
			return jsonCors({ message: 'Nazwa firmy jest wymagana.' }, 400)
		}
		if (!isValidNip(nip)) {
			return jsonCors({ message: 'Podaj poprawny NIP (10 cyfr).' }, 400)
		}
		if (!body.zgodaRodo) {
			return jsonCors({ message: 'Zgoda na przetwarzanie danych (RODO) jest wymagana.' }, 400)
		}

		// --- Wyliczenie poziomu + zapis w transakcji ---
		const now = new Date()
		const result = await prisma.$transaction(async tx => {
			const event = await tx.event.findUnique({ where: { slug } })
			if (!event) return { error: 404 }

			const confirmedCount = await tx.eventRegistration.count({
				where: { eventId: event.id, statusRejestracji: 'POTWIERDZONA' },
			})

			// Powód liczymy JEDNĄ funkcją współdzieloną z resztą aplikacji — wcześniej trasa powielała
			// tę regułę u siebie i rozjechała się ze źródłem (patrz komentarz w src/lib/events.js).
			const powodZamkniecia = registrationClosedReason(event, confirmedCount, now)
			// STATUS i TERMIN = odmowa. LIMIT = wpuszczamy na listę rezerwową (obsługa niżej).
			if (powodZamkniecia === 'STATUS' || powodZamkniecia === 'DEADLINE') return { error: 'closed' }

			// Wykrycie członka po NIP (odporne na formatowanie — porównanie samych cyfr)
			const memberRows = await tx.$queryRaw`
				SELECT id, "memberType"
				FROM "Member"
				WHERE regexp_replace(COALESCE(nip, ''), '[^0-9]', '', 'g') = ${nip}
				  AND "deletedAt" IS NULL
				LIMIT 1
			`
			const member = memberRows[0] || null
			const isMember = !!member

			// Ile gratisów tej firmy już wykorzystano na tym wydarzeniu
			const gratisUsed = await tx.eventRegistration.count({
				where: {
					eventId: event.id,
					firmaNip: nip,
					tier: 'CZLONEK_GRATIS',
					statusRejestracji: { not: 'ANULOWANA' },
				},
			})

			const { tier, kwota, statusPlatnosci } = computeRegistration(event, { isMember, gratisUsed })

			// Limit miejsc → lista rezerwowa (ten sam powód, ta sama funkcja — bez powielania warunku)
			const statusRejestracji = powodZamkniecia === 'LIMIT' ? 'LISTA_REZERWOWA' : 'POTWIERDZONA'

			const registration = await tx.eventRegistration.create({
				data: {
					eventId: event.id,
					firstName,
					lastName,
					email,
					firmaNazwa,
					firmaNip: nip,
					firmaAdres,
					tier,
					kwota,
					statusPlatnosci,
					statusRejestracji,
					zgodaRodo: true,
					zgodaRodoAt: now,
					zrodlo: 'SELF',
					matchedMemberId: member?.id || null,
				},
			})

			return { event, registration }
		})

		if (result.error === 404) {
			return jsonCors({ message: 'Nie znaleziono wydarzenia.' }, 404)
		}
		if (result.error === 'closed') {
			return jsonCors({ message: 'Rejestracja na to wydarzenie jest już zamknięta.' }, 409)
		}

		const { event, registration } = result

		// --- Mail potwierdzający (błąd maila → 206, zapis pozostaje) ---
		try {
			await sendConfirmationEmail(event, registration)
		} catch (emailError) {
			console.error('Zapis OK, błąd wysyłki maila potwierdzającego:', emailError)
			return jsonCors(
				{
					message: 'Zgłoszenie zapisane. Potwierdzenie e-mail nie zostało wysłane — skontaktujemy się z Państwem.',
					registration: publicRegistration(registration),
				},
				206
			)
		}

		return jsonCors(
			{ message: 'Zgłoszenie zostało zapisane.', registration: publicRegistration(registration) },
			201
		)
	} catch (error) {
		console.error('Błąd zapisu na wydarzenie:', error)
		return jsonCors({ message: 'Wystąpił błąd serwera.' }, 500)
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS })
}

// Publiczna (bezpieczna) postać zgłoszenia zwracana klientowi
function publicRegistration(r) {
	return {
		tier: r.tier,
		kwota: Number(r.kwota),
		statusPlatnosci: r.statusPlatnosci,
		statusRejestracji: r.statusRejestracji,
	}
}

async function sendConfirmationEmail(event, registration) {
	const platne = Number(registration.kwota) > 0
	const bankAccount = event.bankAccount || DEFAULT_BANK_ACCOUNT
	const naLiscieRezerwowej = registration.statusRejestracji === 'LISTA_REZERWOWA'

	// Link do spotkania NIE trafia do maila potwierdzającego. Wcześniej doklejaliśmy go do „Miejsca”,
	// przez co dostawał go KAŻDY zapisany — także z listy rezerwowej i bez wpłaty — natychmiast po
	// wysłaniu formularza. Link wysyła Pani Teresa świadomą akcją z panelu, do wybranych osób.
	const miejsce = event.tryb === 'ONLINE' ? 'Online' : event.address || 'Do potwierdzenia'

	// Na liście rezerwowej NIE dajemy ŻADNEJ informacji o płatności. Wcześniej mail mówił jednocześnie
	// „trafiło na listę rezerwową” i „Do zapłaty: 500 zł, konto: …” — ludzie płacili za miejsca, których
	// nie mają, a biuro musiało robić zwroty. Kwota i konto pojawiają się dopiero w mailu o zwolnionym
	// miejscu, gdy zgłoszenie ma już status POTWIERDZONA.
	const platnoscHtml = naLiscieRezerwowej
		? ''
		: platne
			? `<p><strong>Do zapłaty:</strong> ${formatPln(registration.kwota)}</p>
			   <p><strong>Płatność:</strong> przelew na konto${bankAccount ? `: <strong>${bankAccount}</strong>` : ' (numer konta prześlemy w osobnej wiadomości)'}<br>
			   W tytule przelewu prosimy podać nazwę wydarzenia i firmę.</p>`
			: `<p><strong>Udział bezpłatny.</strong></p>`

	const rezerwowaHtml = naLiscieRezerwowej
		? `<p style="color:#b45309"><strong>Uwaga:</strong> limit miejsc został wyczerpany — Państwa zgłoszenie trafiło na <strong>listę rezerwową</strong>. Poinformujemy o zwolnieniu się miejsca.</p>`
		: ''

	const html = `
		<h2>Potwierdzenie zgłoszenia</h2>
		<p>Dziękujemy za zgłoszenie udziału w wydarzeniu:</p>
		<h3>${event.title}</h3>
		<ul>
			<li><strong>Termin:</strong> ${formatDate(event.startAt)}${event.endAt ? ` – ${formatDate(event.endAt)}` : ''}</li>
			<li><strong>Forma:</strong> ${event.tryb === 'ONLINE' ? 'Online' : 'Stacjonarnie'}</li>
			<li><strong>Miejsce:</strong> ${miejsce}</li>
			<li><strong>Uczestnik:</strong> ${registration.firstName} ${registration.lastName}</li>
			<li><strong>Firma:</strong> ${registration.firmaNazwa} (NIP: ${registration.firmaNip})</li>
		</ul>
		${rezerwowaHtml}
		${platnoscHtml}
		<p>W razie pytań prosimy o kontakt.</p>
		<p>Pozdrawiamy,<br>Polska Izba Spedycji i Logistyki</p>
	`

	// Potwierdzenie dla uczestnika
	await sendToOne({
		to: registration.email,
		replyTo: ADMIN_EVENTS_EMAIL,
		subject: `Potwierdzenie zgłoszenia — ${event.title}`,
		html,
	})

	// Powiadomienie dla organizatora (Pani Teresa)
	await sendToOne({
		to: ADMIN_EVENTS_EMAIL,
		subject: `Nowe zgłoszenie — ${event.title}`,
		html: `
			<h2>Nowe zgłoszenie na wydarzenie</h2>
			<p><strong>Wydarzenie:</strong> ${event.title}</p>
			<p><strong>Uczestnik:</strong> ${registration.firstName} ${registration.lastName} (${registration.email})</p>
			<p><strong>Firma:</strong> ${registration.firmaNazwa} (NIP: ${registration.firmaNip})</p>
			<p><strong>Poziom:</strong> ${registration.tier} — ${formatPln(registration.kwota)}</p>
			<p><strong>Status:</strong> ${registration.statusRejestracji}</p>
		`,
	})
}

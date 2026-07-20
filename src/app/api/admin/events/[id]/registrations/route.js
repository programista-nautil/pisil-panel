import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { normalizeNip } from '@/lib/nip'
import { computeRegistration } from '@/lib/services/eventPricing'
import { SCOPE, normalizeEmail, targetEmails } from '@/lib/services/eventBulkMail'

// Status ostatniej masowej wysyłki dla wydarzenia: mapa adres→status (do kolumny w tabeli) + podsumowanie
// (do bannera „ponów do brakujących"). Null, gdy nic jeszcze nie wysłano.
async function lastMailingInfo(id) {
	const mailing = await prisma.eventMailing.findFirst({
		where: { eventId: id },
		orderBy: { createdAt: 'desc' },
	})
	if (!mailing) return { statusByEmail: {}, summary: null }

	const logs = await prisma.mailSendLog.findMany({
		where: { scope: SCOPE, refId: mailing.id },
		select: { email: true, status: true },
	})
	const statusByEmail = {}
	const delivered = new Set()
	for (const l of logs) {
		statusByEmail[l.email] = l.status
		if (l.status === 'WYSLANY') delivered.add(l.email)
	}

	// WSZYSTKIE liczniki liczymy względem AKTUALNEGO zbioru odbiorców, nie względem historii logu.
	// Inaczej po anulowaniu kilku zgłoszeń banner pokazywał „dotarła do 10 z 7" (dostarczone brane
	// z logu, adresaci liczeni na żywo). Teraz zawsze zachodzi: sent + failed + reszta = targetCount.
	const targets = await targetEmails(prisma, id, mailing.recipientFilter)
	const sent = targets.filter(e => delivered.has(e)).length
	const failed = targets.filter(e => statusByEmail[e] === 'BLAD').length

	return {
		statusByEmail,
		summary: {
			id: mailing.id,
			subject: mailing.subject,
			createdAt: mailing.createdAt,
			recipientFilter: mailing.recipientFilter,
			sent,
			failed,
			targetCount: targets.length,
			missingCount: targets.length - sent,
		},
	}
}

// Lista zgłoszeń danego wydarzenia + status ostatniej masowej wysyłki (kolumna „Wysyłka").
export async function GET(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const [rows, mailing, kampanie] = await Promise.all([
			prisma.eventRegistration.findMany({ where: { eventId: id }, orderBy: { createdAt: 'asc' } }),
			lastMailingInfo(id),
			// Rodzaje wiadomości, które dla tego wydarzenia już wysłano — panel na tej podstawie przestaje
			// podpowiadać akcję, która została wykonana (np. „poinformuj listę rezerwową").
			prisma.eventMailing.findMany({ where: { eventId: id }, select: { template: true }, distinct: ['template'] }),
		])

		const registrations = rows.map(r => ({
			...r,
			mailStatus: mailing.statusByEmail[normalizeEmail(r.email)] || null,
		}))

		return NextResponse.json(
			{
				registrations,
				lastMailing: mailing.summary,
				sentTemplates: kampanie.map(k => k.template).filter(Boolean),
			},
			{ status: 200 }
		)
	} catch (error) {
		console.error('Błąd pobierania zgłoszeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Ręczne dopisanie uczestnika przez admina. Domyślnie liczymy cenę,
// ale admin może nadpisać tier/kwotę/statusy.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const b = await request.json()

		const firstName = (b.firstName || '').trim()
		const lastName = (b.lastName || '').trim()
		const email = (b.email || '').trim()
		const firmaNazwa = (b.firmaNazwa || '').trim()
		const nip = normalizeNip(b.firmaNip || '')
		const zgodaOdebrana = b.zgodaRodo === true || b.zgodaRodo === 'true'

		if (!firstName || !lastName || !firmaNazwa) {
			return NextResponse.json({ message: 'Imię, nazwisko i nazwa firmy są wymagane.' }, { status: 400 })
		}

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		// Automatyczne wyliczenie (jeśli admin nie nadpisał tier).
		// Bez NIP-u nie da się potwierdzić członkostwa → traktujemy jak nie-członka i liczymy cenę
		// nie-członka. (Wcześniej kwota była zaszyta na 0 zł, przez co uczestnik bez NIP-u na płatnym
		// szkoleniu dostawał „oczekuje na przelew 0 zł" i wypadał z rozliczeń.)
		let isMember = false
		let gratisUsed = 0
		let matchedMemberId = null
		if (nip) {
			const memberRows = await prisma.$queryRaw`
				SELECT id FROM "Member"
				WHERE regexp_replace(COALESCE(nip, ''), '[^0-9]', '', 'g') = ${nip}
				  AND "deletedAt" IS NULL
				LIMIT 1
			`
			isMember = memberRows.length > 0
			matchedMemberId = isMember ? memberRows[0].id : null
			gratisUsed = await prisma.eventRegistration.count({
				where: { eventId: id, firmaNip: nip, tier: 'CZLONEK_GRATIS', statusRejestracji: { not: 'ANULOWANA' } },
			})
		}
		const computed = computeRegistration(event, { isMember, gratisUsed })

		const registration = await prisma.eventRegistration.create({
			data: {
				eventId: id,
				firstName,
				lastName,
				email: email || '',
				firmaNazwa,
				firmaNip: nip,
				firmaAdres: b.firmaAdres || null,
				tier: b.tier || computed.tier,
				kwota: b.kwota != null && b.kwota !== '' ? b.kwota : computed.kwota,
				statusPlatnosci: b.statusPlatnosci || computed.statusPlatnosci,
				statusRejestracji: b.statusRejestracji || 'POTWIERDZONA',
				// Zgoda RODO: osoba dopisana ręcznie (telefonicznie/mailem) NICZEGO nie kliknęła, więc
				// domyślnie zapisujemy BRAK zgody. Admin może zaznaczyć, że zgodę odebrał — wtedy i tylko
				// wtedy stawiamy znacznik czasu. Rejestr zgód ma odzwierciedlać stan faktyczny.
				zgodaRodo: zgodaOdebrana,
				zgodaRodoAt: zgodaOdebrana ? new Date() : null,
				zrodlo: 'ADMIN',
				matchedMemberId,
				notatka: b.notatka || null,
			},
		})

		return NextResponse.json(registration, { status: 201 })
	} catch (error) {
		console.error('Błąd dopisywania uczestnika:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

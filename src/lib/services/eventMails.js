// Maile statusowe wydarzeń wyzwalane z panelu (pojedynczy odbiorca). Szablony są CZYSTE (bez I/O),
// żeby dało się je testować pod kątem treści (dyscyplina RODO/wizerunkowa: co mail MA i czego NIE MA).
// Wysyłka idzie przez bramę `sendToOne` (jeden adres w DO) i zapisuje ślad w MailSendLog (audyt + status).
import { sendToOne } from '@/lib/mailer'
import prisma from '@/lib/prisma'

const REPLY_TO = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL || 'programista@nautil.pl'
const DEFAULT_BANK = process.env.EVENTS_BANK_ACCOUNT || ''

const formatPln = v => `${Number(v || 0).toFixed(2).replace('.', ',')} zł`
const formatDateTime = d => (d ? new Date(d).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' }) : '')
const formatDay = d => (d ? new Date(d).toLocaleDateString('pl-PL') : '')

const FOOTER = '<p>Z poważaniem,<br>Polska Izba Spedycji i Logistyki</p>'

/**
 * Proponowany tytuł przelewu — gotowy do skopiowania, ten sam we WSZYSTKICH mailach z kwotą.
 *
 * Po co: bez tego biuro widzi w wyciągu bankowym samą nazwę firmy i kwotę, i musi dopytywać, za kogo
 * i za co jest wpłata. Podajemy nazwisko UCZESTNIKA, a nie firmę — firma i tak jest widoczna jako
 * nadawca przelewu, a przy jednej firmie płacącej za kilka osób to właśnie uczestnika nie da się
 * z wyciągu odczytać. Nazwę wydarzenia skracamy, żeby całość zmieściła się w limicie tytułu (140 znaków).
 */
export function transferTitle(event, reg) {
	const nazwa = ((event && event.title) || '').trim()
	const skrocona = nazwa.length > 90 ? `${nazwa.slice(0, 89)}…` : nazwa
	const osoba = [reg && reg.firstName, reg && reg.lastName].filter(Boolean).join(' ').trim()
	return osoba ? `${skrocona} — ${osoba}` : skrocona
}

// Blok „jak zapłacić" wspólny dla maili z kwotą (potwierdzenie zapisu i „zwolniło się miejsce").
export function paymentHtml(event, reg, { bankAccount } = {}) {
	const konto = bankAccount || (event && event.bankAccount) || DEFAULT_BANK
	return `
		<p><strong>Do zapłaty:</strong> ${formatPln(reg.kwota)}</p>
		<p><strong>Płatność:</strong> przelew na konto${konto ? `: <strong>${konto}</strong>` : ' (numer konta prześlemy w osobnej wiadomości)'}</p>
		<p><strong>Tytuł przelewu:</strong> <span style="background:#eef4f9;padding:2px 6px;">${transferTitle(event, reg)}</span><br>
		Prosimy o dokładnie taki tytuł — dzięki temu od razu rozpoznamy wpłatę i nie będziemy dopytywać.</p>
	`
}

// ---------- SZABLONY (czyste) ----------

// #6 Anulowanie zgłoszenia. To NIE jest wezwanie do zapłaty — bez kwoty i konta. Bez linku do spotkania.
export function buildCancellationEmail(event, reg) {
	return {
		subject: `Anulowano zgłoszenie — ${event.title}`,
		html: `
			<p>Szanowni Państwo,</p>
			<p>Informujemy, że Państwa zgłoszenie na wydarzenie <strong>${event.title}</strong>
			(${formatDateTime(event.startAt)}) zostało anulowane.</p>
			<p>Jeśli to pomyłka lub chcą Państwo wziąć udział, prosimy o kontakt: <a href="mailto:${REPLY_TO}">${REPLY_TO}</a>.</p>
			${FOOTER}
		`,
	}
}

// #4 Zwolniło się miejsce — DOPIERO tu pojawia się kwota i numer konta (zgłoszenie jest już POTWIERDZONE).
// Z terminem na potwierdzenie udziału, żeby miejsce nie blokowało się w nieskończoność.
export function buildSpotFreedEmail(event, reg, { deadline, bankAccount } = {}) {
	const platne = Number(reg.kwota) > 0
	const platnoscHtml = platne
		? paymentHtml(event, reg, { bankAccount })
		: `<p><strong>Udział bezpłatny.</strong></p>`
	return {
		subject: `Zwolniło się miejsce — ${event.title}`,
		html: `
			<p>Szanowni Państwo,</p>
			<p>Zwolniło się miejsce na wydarzeniu <strong>${event.title}</strong> (${formatDateTime(event.startAt)}),
			a Państwa zgłoszenie zostało <strong>potwierdzone</strong>.</p>
			${platnoscHtml}
			<p>Prosimy o potwierdzenie udziału${deadline ? ` do <strong>${formatDay(deadline)}</strong>` : ''}.
			Jeśli nie mogą Państwo wziąć udziału, prosimy o informację — zwolnimy miejsce kolejnej osobie z listy.</p>
			${FOOTER}
		`,
	}
}

// #7 Potwierdzenie wpłaty. Wpłata już wpłynęła, więc BEZWZGLĘDNIE bez numeru konta i bez kwoty
// „do zapłaty" — inaczej wyglądałoby jak ponowne wezwanie do zapłaty i ludzie płaciliby drugi raz.
// Bez linku do spotkania (ten idzie osobno, świadomą wysyłką). Kwotę podajemy tylko informacyjnie.
export function buildPaymentConfirmedEmail(event, reg) {
	const platne = Number(reg.kwota) > 0
	const kwotaHtml = platne
		? `<p><strong>Odnotowana wpłata:</strong> ${formatPln(reg.kwota)}</p>`
		: ''
	return {
		subject: `Potwierdzenie wpłaty — ${event.title}`,
		html: `
			<p>Szanowni Państwo,</p>
			<p>Potwierdzamy otrzymanie wpłaty za udział w wydarzeniu <strong>${event.title}</strong>
			(${formatDateTime(event.startAt)}). Państwa udział jest w pełni potwierdzony.</p>
			${kwotaHtml}
			<p>Szczegóły organizacyjne prześlemy w osobnej wiadomości przed wydarzeniem.</p>
			<p>W razie pytań prosimy o kontakt: <a href="mailto:${REPLY_TO}">${REPLY_TO}</a>.</p>
			${FOOTER}
		`,
	}
}

// ---------- WYSYŁKA + ŚLAD ----------

async function sendAndLog(scope, event, reg, tresc) {
	if (!reg.email) return { sent: false, reason: 'brak e-maila' }
	const klucz = { scope_refId_email: { scope, refId: event.id, email: reg.email } }
	try {
		await sendToOne({ to: reg.email, replyTo: REPLY_TO, subject: tresc.subject, html: tresc.html })
		await prisma.mailSendLog.upsert({
			where: klucz,
			create: { scope, refId: event.id, email: reg.email, status: 'WYSLANY' },
			update: { status: 'WYSLANY', sentAt: new Date(), error: null },
		})
		return { sent: true }
	} catch (e) {
		const msg = String(e && e.message ? e.message : e).slice(0, 500)
		await prisma.mailSendLog
			.upsert({
				where: klucz,
				create: { scope, refId: event.id, email: reg.email, status: 'BLAD', error: msg },
				update: { status: 'BLAD', sentAt: new Date(), error: msg },
			})
			.catch(() => {})
		return { sent: false, reason: msg }
	}
}

export function sendCancellationEmail(event, reg) {
	return sendAndLog('event:ANULOWANA', event, reg, buildCancellationEmail(event, reg))
}

export function sendSpotFreedEmail(event, reg, opcje) {
	return sendAndLog('event:ZWOLNIONE_MIEJSCE', event, reg, buildSpotFreedEmail(event, reg, opcje))
}

export function sendPaymentConfirmedEmail(event, reg) {
	return sendAndLog('event:WPLATA', event, reg, buildPaymentConfirmedEmail(event, reg))
}

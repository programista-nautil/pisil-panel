// Maile statusowe wydarzeń wyzwalane z panelu (pojedynczy odbiorca). Szablony są CZYSTE (bez I/O),
// żeby dało się je testować pod kątem treści (dyscyplina RODO/wizerunkowa: co mail MA i czego NIE MA).
// Wysyłka idzie przez bramę `sendToOne` (jeden adres w DO) i zapisuje ślad w MailSendLog (audyt + status).
import { sendToOne } from '@/lib/mailer'
import prisma from '@/lib/prisma'

const REPLY_TO = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL || 'programista@nautil.pl'
const DEFAULT_BANK = process.env.EVENTS_BANK_ACCOUNT || ''

const pln = v => `${Number(v || 0).toFixed(2).replace('.', ',')} zł`
const dataGodzina = d => (d ? new Date(d).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' }) : '')
const dzien = d => (d ? new Date(d).toLocaleDateString('pl-PL') : '')

const STOPKA = '<p>Z poważaniem,<br>Polska Izba Spedycji i Logistyki</p>'

// ---------- SZABLONY (czyste) ----------

// #6 Anulowanie zgłoszenia. To NIE jest wezwanie do zapłaty — bez kwoty i konta. Bez linku do spotkania.
export function budujMailAnulowania(event, reg) {
	return {
		subject: `Anulowano zgłoszenie — ${event.title}`,
		html: `
			<p>Szanowni Państwo,</p>
			<p>Informujemy, że Państwa zgłoszenie na wydarzenie <strong>${event.title}</strong>
			(${dataGodzina(event.startAt)}) zostało anulowane.</p>
			<p>Jeśli to pomyłka lub chcą Państwo wziąć udział, prosimy o kontakt: <a href="mailto:${REPLY_TO}">${REPLY_TO}</a>.</p>
			${STOPKA}
		`,
	}
}

// #4 Zwolniło się miejsce — DOPIERO tu pojawia się kwota i numer konta (zgłoszenie jest już POTWIERDZONE).
// Z terminem na potwierdzenie udziału, żeby miejsce nie blokowało się w nieskończoność.
export function budujMailZwolnioneMiejsce(event, reg, { termin, bankAccount } = {}) {
	const platne = Number(reg.kwota) > 0
	const konto = bankAccount || event.bankAccount || DEFAULT_BANK
	const platnoscHtml = platne
		? `<p><strong>Do zapłaty:</strong> ${pln(reg.kwota)}</p>
		   <p><strong>Płatność:</strong> przelew na konto${konto ? `: <strong>${konto}</strong>` : ' (numer konta prześlemy w osobnej wiadomości)'}<br>
		   W tytule przelewu prosimy podać nazwę wydarzenia i firmę.</p>`
		: `<p><strong>Udział bezpłatny.</strong></p>`
	return {
		subject: `Zwolniło się miejsce — ${event.title}`,
		html: `
			<p>Szanowni Państwo,</p>
			<p>Zwolniło się miejsce na wydarzeniu <strong>${event.title}</strong> (${dataGodzina(event.startAt)}),
			a Państwa zgłoszenie zostało <strong>potwierdzone</strong>.</p>
			${platnoscHtml}
			<p>Prosimy o potwierdzenie udziału${termin ? ` do <strong>${dzien(termin)}</strong>` : ''}.
			Jeśli nie mogą Państwo wziąć udziału, prosimy o informację — zwolnimy miejsce kolejnej osobie z listy.</p>
			${STOPKA}
		`,
	}
}

// ---------- WYSYŁKA + ŚLAD ----------

async function wyslijIzaloguj(scope, event, reg, tresc) {
	if (!reg.email) return { wyslano: false, powod: 'brak e-maila' }
	const klucz = { scope_refId_email: { scope, refId: event.id, email: reg.email } }
	try {
		await sendToOne({ to: reg.email, replyTo: REPLY_TO, subject: tresc.subject, html: tresc.html })
		await prisma.mailSendLog.upsert({
			where: klucz,
			create: { scope, refId: event.id, email: reg.email, status: 'WYSLANY' },
			update: { status: 'WYSLANY', sentAt: new Date(), error: null },
		})
		return { wyslano: true }
	} catch (e) {
		const msg = String(e && e.message ? e.message : e).slice(0, 500)
		await prisma.mailSendLog
			.upsert({
				where: klucz,
				create: { scope, refId: event.id, email: reg.email, status: 'BLAD', error: msg },
				update: { status: 'BLAD', sentAt: new Date(), error: msg },
			})
			.catch(() => {})
		return { wyslano: false, powod: msg }
	}
}

export function wyslijAnulowanie(event, reg) {
	return wyslijIzaloguj('event:ANULOWANA', event, reg, budujMailAnulowania(event, reg))
}

export function wyslijZwolnioneMiejsce(event, reg, opcje) {
	return wyslijIzaloguj('event:ZWOLNIONE_MIEJSCE', event, reg, budujMailZwolnioneMiejsce(event, reg, opcje))
}

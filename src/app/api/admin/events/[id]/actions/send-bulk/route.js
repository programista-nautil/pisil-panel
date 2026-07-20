import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'
import { targetEmails, isValidFilter } from '@/lib/services/eventBulkMail'
import { getTemplate, isAllowedPair } from '@/lib/eventMailTemplate'

const ADMIN_EVENTS_EMAIL = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL || 'programista@nautil.pl'

// Okno „Cofnij": zadanie startuje dopiero po tym opóźnieniu. W tym czasie da się je usunąć z kolejki
// (trasa cancel-bulk) — nic wtedy nie wychodzi. 10 s to kompromis: dość, by zdążyć kliknąć „Cofnij",
// mało, by nie opóźniać realnej wysyłki.
const UNDO_DELAY_MS = 10000

// Nowa kampania masowej wysyłki do zapisanych. Zapisujemy TREŚĆ jako EventMailing (żeby dało się potem
// „wysłać ponownie do brakujących" tą samą wiadomością), a właściwą wysyłkę robi worker — idempotentnie,
// partiami. Zadanie ma opóźnienie (okno „Cofnij"); zwracamy jobId, żeby dało się je cofnąć.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const body = await request.json().catch(() => ({}))
		const subject = (body.subject || '').trim()
		const tresc = (body.body || '').trim()
		const recipientFilter = body.recipientFilter
		const template = body.template || 'INFO'

		if (!subject || !tresc) {
			return NextResponse.json({ message: 'Temat i treść są wymagane.' }, { status: 400 })
		}

		const tpl = getTemplate(template)
		if (!tpl) return NextResponse.json({ message: 'Nieznany rodzaj wiadomości.' }, { status: 400 })
		if (!isValidFilter(recipientFilter)) {
			return NextResponse.json({ message: 'Nieznana grupa odbiorców.' }, { status: 400 })
		}
		// Para rodzaj↔odbiorcy musi się zgadzać. Bez tego dałoby się wysłać „niestety nie udało się"
		// do osób, które mają potwierdzone miejsce — pomyłka nie do odkręcenia.
		if (!isAllowedPair(template, recipientFilter)) {
			return NextResponse.json(
				{ message: 'Ta wiadomość nie może iść do wybranej grupy odbiorców.' },
				{ status: 400 }
			)
		}

		const event = await prisma.event.findUnique({ where: { id }, select: { id: true, onlineUrl: true } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		// Twarda walidacja: maila z linkiem nie wypuszczamy, gdy linku nie ma. Inaczej uczestnicy
		// dostaliby wiadomość „oto link" z pustym miejscem i nie mieliby jak dołączyć.
		if (tpl.requiresOnlineUrl && !(event.onlineUrl || '').trim()) {
			return NextResponse.json(
				{ message: 'Wydarzenie nie ma zapisanego linku do spotkania — uzupełnij go w edycji wydarzenia.' },
				{ status: 400 }
			)
		}

		// Liczymy distinct adresy (nie wiersze) — tyle maili faktycznie wyjdzie.
		const count = (await targetEmails(prisma, id, recipientFilter)).length
		if (count === 0) {
			return NextResponse.json({ message: 'Brak odbiorców pasujących do wybranego filtra.' }, { status: 409 })
		}

		const mailing = await prisma.eventMailing.create({
			data: { eventId: id, subject, body: tresc, recipientFilter, template },
			select: { id: true },
		})

		// Gdy kolejkowanie padnie, kampania nie może zostać w bazie — inaczej banner pokazywałby wysyłkę,
		// która nigdy nie ruszyła, i proponował „ponów do brakujących" dla wszystkich.
		let job
		try {
			job = await emailQueue.add(
				'event-bulk-mail',
				{ mailingId: mailing.id, onlyMissing: false, adminEmail: ADMIN_EVENTS_EMAIL },
				{ delay: UNDO_DELAY_MS, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
			)
		} catch (queueError) {
			await prisma.eventMailing.delete({ where: { id: mailing.id } }).catch(() => {})
			throw queueError
		}

		return NextResponse.json(
			{ enqueued: true, count, mailingId: mailing.id, jobId: job.id, undoMs: UNDO_DELAY_MS },
			{ status: 202 }
		)
	} catch (error) {
		console.error('Błąd kolejkowania masowej wysyłki:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

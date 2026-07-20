import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { enqueue } from '@/lib/queue'
import { missingEmails } from '@/lib/services/eventBulkMail'

const ADMIN_EVENTS_EMAIL = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL || 'programista@nautil.pl'
const UNDO_DELAY_MS = 10000

// Ponowna wysyłka TEJ SAMEJ kampanii, ale tylko do tych, do których jeszcze nie dotarła (brak lub błąd).
// Treść bierze worker z EventMailing — admin niczego nie wpisuje od nowa. Też z oknem „Cofnij".
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const body = await request.json().catch(() => ({}))
		const mailingId = (body.mailingId || '').trim()
		if (!mailingId) return NextResponse.json({ message: 'Brak identyfikatora kampanii.' }, { status: 400 })

		const mailing = await prisma.eventMailing.findUnique({ where: { id: mailingId } })
		if (!mailing || mailing.eventId !== id) {
			return NextResponse.json({ message: 'Nie znaleziono kampanii dla tego wydarzenia.' }, { status: 404 })
		}

		const missing = await missingEmails(prisma, mailing)
		if (missing.length === 0) {
			return NextResponse.json({ message: 'Wszyscy odbiorcy już dostali tę wiadomość.' }, { status: 409 })
		}

		const job = await enqueue(
			'event-bulk-mail',
			{ mailingId, onlyMissing: true, adminEmail: ADMIN_EVENTS_EMAIL },
			{ delay: UNDO_DELAY_MS, attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
		)

		return NextResponse.json(
			{ enqueued: true, count: missing.length, mailingId, jobId: job.id, undoMs: UNDO_DELAY_MS },
			{ status: 202 }
		)
	} catch (error) {
		console.error('Błąd ponownej wysyłki do brakujących:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

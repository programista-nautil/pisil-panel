import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'

// „Cofnij" wysyłkę w oknie opóźnienia. Zadanie jeszcze nie ruszyło (stan delayed/waiting) → usuwamy je
// z kolejki i nic nie wychodzi. Jeśli zdążyło wystartować (active/completed) — za późno, zwracamy false.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const body = await request.json().catch(() => ({}))
		const jobId = body.jobId != null ? String(body.jobId) : ''
		if (!jobId) return NextResponse.json({ message: 'Brak identyfikatora zadania.' }, { status: 400 })

		const job = await emailQueue.getJob(jobId)
		if (!job) {
			return NextResponse.json({ cancelled: false, reason: 'Zadanie już nie istnieje.' }, { status: 200 })
		}

		// Zadanie musi być NASZE: właściwego typu i dotyczyć kampanii z TEGO wydarzenia. Bez tego dowolny
		// jobId z żądania pozwalałby skasować z kolejki cudze zadanie (np. wysyłkę komunikatu do członków).
		const mailingId = job.data?.mailingId
		if (job.name !== 'event-bulk-mail' || !mailingId) {
			return NextResponse.json({ message: 'To zadanie nie jest wysyłką do zapisanych.' }, { status: 400 })
		}
		const mailing = await prisma.eventMailing.findUnique({ where: { id: mailingId }, select: { eventId: true } })
		if (!mailing || mailing.eventId !== id) {
			return NextResponse.json({ message: 'Zadanie dotyczy innego wydarzenia.' }, { status: 404 })
		}

		const state = await job.getState()
		if (state !== 'delayed' && state !== 'waiting') {
			// Już wystartowało — nie da się cofnąć (idempotencja i tak nie dopuści dubla).
			return NextResponse.json({ cancelled: false, reason: 'Wysyłka już się rozpoczęła.' }, { status: 200 })
		}

		await job.remove()

		// Świeża wysyłka cofnięta w oknie = kampania nigdy nie zaistniała, więc ją kasujemy (inaczej banner
		// pokazywałby wysyłkę, której nie było). Przy dosyłce do brakujących kampania zostaje — anulujemy
		// samą dosyłkę. Źródłem prawdy jest typ zadania (onlyMissing), nie liczba wierszy w logu.
		if (job.data.onlyMissing === false) {
			await prisma.eventMailing.deleteMany({ where: { id: mailingId, eventId: id } })
		}

		return NextResponse.json({ cancelled: true }, { status: 200 })
	} catch (error) {
		console.error('Błąd cofania wysyłki:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { sendCancellationEmail, sendSpotFreedEmail } from '@/lib/services/eventMails'

// Anulowanie zgłoszenia z opcjonalnym powiadomieniem i opcjonalnym przeniesieniem pierwszej osoby
// z listy rezerwowej. Wszystkie emails idą TYLKO gdy admin świadomie o nie poprosił (żaden mail bez
// potwierdzenia). Pierwszą osobę z rezerwy wybiera SERWER (najstarsze zgłoszenie), nie klient — bez
// wyścigu o to, kto naprawdę jest firstWaitlisted.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id, rid } = await params
		const body = await request.json().catch(() => ({}))
		const { notifyCancelled = false, promoteWaitlisted = false, notifyWaitlisted = false } = body

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const reg = await prisma.eventRegistration.findUnique({ where: { id: rid } })
		if (!reg || reg.eventId !== id) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const cancelled = await prisma.eventRegistration.update({
			where: { id: rid },
			data: { statusRejestracji: 'ANULOWANA' },
		})

		const result = { cancelled, promoted: null, emails: {} }

		if (notifyCancelled) {
			result.emails.cancelled = await sendCancellationEmail(event, reg)
		}

		if (promoteWaitlisted) {
			// Pierwsza osoba z listy rezerwowej = najstarsze zgłoszenie (poza właśnie anulowanym).
			const firstWaitlisted = await prisma.eventRegistration.findFirst({
				where: { eventId: id, statusRejestracji: 'LISTA_REZERWOWA', id: { not: rid } },
				orderBy: { createdAt: 'asc' },
			})
			if (firstWaitlisted) {
				const promoted = await prisma.eventRegistration.update({
					where: { id: firstWaitlisted.id },
					data: { statusRejestracji: 'POTWIERDZONA' },
				})
				result.promoted = promoted
				if (notifyWaitlisted) {
					// Termin na potwierdzenie udziału: 3 dni od teraz (żeby miejsce nie blokowało się bez końca).
					const deadline = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
					result.emails.waitlisted = await sendSpotFreedEmail(event, promoted, { deadline })
				}
			}
		}

		return NextResponse.json(result, { status: 200 })
	} catch (error) {
		console.error('Błąd anulowania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

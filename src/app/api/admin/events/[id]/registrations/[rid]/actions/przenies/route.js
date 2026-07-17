import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { wyslijZwolnioneMiejsce } from '@/lib/services/eventMails'

// Przeniesienie zgłoszenia z listy rezerwowej na POTWIERDZONA (gdy admin robi to bez anulowania kogoś,
// np. po zwiększeniu limitu). Status zmienia się OD RAZU — miejsce przestaje być wolne, więc nikt
// z formularza go nie podbierze. Mail „zwolniło się miejsce" (z kwotą, kontem, terminem) TYLKO na życzenie.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id, rid } = await params
		const body = await request.json().catch(() => ({}))
		const { powiadom = false } = body

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const reg = await prisma.eventRegistration.findUnique({ where: { id: rid } })
		if (!reg || reg.eventId !== id) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const przeniesiony = await prisma.eventRegistration.update({
			where: { id: rid },
			data: { statusRejestracji: 'POTWIERDZONA' },
		})

		const wynik = { przeniesiony, mail: null }
		if (powiadom) {
			const termin = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
			wynik.mail = await wyslijZwolnioneMiejsce(event, przeniesiony, { termin })
		}

		return NextResponse.json(wynik, { status: 200 })
	} catch (error) {
		console.error('Błąd przenoszenia zgłoszenia z listy rezerwowej:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

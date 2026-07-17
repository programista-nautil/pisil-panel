import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { wyslijAnulowanie, wyslijZwolnioneMiejsce } from '@/lib/services/eventMails'

// Anulowanie zgłoszenia z opcjonalnym powiadomieniem i opcjonalnym przeniesieniem pierwszej osoby
// z listy rezerwowej. Wszystkie maile idą TYLKO gdy admin świadomie o nie poprosił (żaden mail bez
// potwierdzenia). Pierwszą osobę z rezerwy wybiera SERWER (najstarsze zgłoszenie), nie klient — bez
// wyścigu o to, kto naprawdę jest pierwszy.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id, rid } = await params
		const body = await request.json().catch(() => ({}))
		const { powiadomAnulowanego = false, przeniesRezerwowego = false, powiadomRezerwowego = false } = body

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const reg = await prisma.eventRegistration.findUnique({ where: { id: rid } })
		if (!reg || reg.eventId !== id) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const anulowany = await prisma.eventRegistration.update({
			where: { id: rid },
			data: { statusRejestracji: 'ANULOWANA' },
		})

		const wynik = { anulowany, przeniesiony: null, maile: {} }

		if (powiadomAnulowanego) {
			wynik.maile.anulowanego = await wyslijAnulowanie(event, reg)
		}

		if (przeniesRezerwowego) {
			// Pierwsza osoba z listy rezerwowej = najstarsze zgłoszenie (poza właśnie anulowanym).
			const pierwszy = await prisma.eventRegistration.findFirst({
				where: { eventId: id, statusRejestracji: 'LISTA_REZERWOWA', id: { not: rid } },
				orderBy: { createdAt: 'asc' },
			})
			if (pierwszy) {
				const przeniesiony = await prisma.eventRegistration.update({
					where: { id: pierwszy.id },
					data: { statusRejestracji: 'POTWIERDZONA' },
				})
				wynik.przeniesiony = przeniesiony
				if (powiadomRezerwowego) {
					// Termin na potwierdzenie udziału: 3 dni od teraz (żeby miejsce nie blokowało się bez końca).
					const termin = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
					wynik.maile.rezerwowego = await wyslijZwolnioneMiejsce(event, przeniesiony, { termin })
				}
			}
		}

		return NextResponse.json(wynik, { status: 200 })
	} catch (error) {
		console.error('Błąd anulowania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

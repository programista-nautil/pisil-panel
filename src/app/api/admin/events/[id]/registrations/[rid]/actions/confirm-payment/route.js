import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { sendPaymentConfirmedEmail } from '@/lib/services/eventMails'

// Odnotowanie wpłaty (statusPlatnosci → OPLACONE) z opcjonalnym potwierdzeniem mailem. Osobna trasa,
// a nie zwykły PATCH, bo ta zmiana MOŻE wysłać maila — a maila nie da się cofnąć, więc idzie tylko
// świadomą akcją z panelu. Sama zmiana statusu bez maila też przechodzi tędy (notify=false).
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id, rid } = await params
		const body = await request.json().catch(() => ({}))
		const { notify = false } = body

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const reg = await prisma.eventRegistration.findUnique({ where: { id: rid } })
		if (!reg || reg.eventId !== id) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// Data wpłaty prowadzi się sama — ta sama reguła co w PATCH: stawiamy przy przejściu na OPŁACONE,
		// ale NIE nadpisujemy istniejącej (przelew mógł wpłynąć innego dnia niż klik w panelu).
		const data = { statusPlatnosci: 'OPLACONE' }
		if (!reg.oplaconeAt) data.oplaconeAt = new Date()

		const updated = await prisma.eventRegistration.update({ where: { id: rid }, data })

		const result = { registration: updated, email: null }
		if (notify) result.email = await sendPaymentConfirmedEmail(event, updated)

		return NextResponse.json(result, { status: 200 })
	} catch (error) {
		console.error('Błąd potwierdzania wpłaty:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

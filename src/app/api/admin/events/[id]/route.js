import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Szczegóły wydarzenia + zgłoszenia (panel admina).
export async function GET(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const event = await prisma.event.findUnique({
			where: { id },
			include: { registrations: { orderBy: { createdAt: 'asc' } } },
		})
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })
		return NextResponse.json(event, { status: 200 })
	} catch (error) {
		console.error('Błąd pobierania wydarzenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Edycja wydarzenia. Slug pozostaje stały (nie łamiemy istniejących URL-i).
export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const b = await request.json()
		const data = {}

		if (b.typ !== undefined) data.typ = b.typ
		if (b.tryb !== undefined) data.tryb = b.tryb
		if (b.title !== undefined) data.title = b.title
		if (b.description !== undefined) data.description = b.description || null
		if (b.startAt !== undefined) data.startAt = new Date(b.startAt)
		if (b.endAt !== undefined) data.endAt = b.endAt ? new Date(b.endAt) : null
		if (b.prowadzacy !== undefined) data.prowadzacy = b.prowadzacy || null
		if (b.address !== undefined) data.address = b.address || null
		if (b.onlineUrl !== undefined) data.onlineUrl = b.onlineUrl || null
		if (b.limitMiejsc !== undefined)
			data.limitMiejsc = b.limitMiejsc != null && b.limitMiejsc !== '' ? parseInt(b.limitMiejsc, 10) : null
		if (b.registrationDeadline !== undefined)
			data.registrationDeadline = b.registrationDeadline ? new Date(b.registrationDeadline) : null
		if (b.bankAccount !== undefined) data.bankAccount = b.bankAccount || null
		if (b.cenaCzlonek !== undefined)
			data.cenaCzlonek = b.cenaCzlonek != null && b.cenaCzlonek !== '' ? b.cenaCzlonek : null
		if (b.cenaNieczlonek !== undefined)
			data.cenaNieczlonek = b.cenaNieczlonek != null && b.cenaNieczlonek !== '' ? b.cenaNieczlonek : null
		if (b.pulaGratisNaFirme !== undefined)
			data.pulaGratisNaFirme = b.pulaGratisNaFirme != null && b.pulaGratisNaFirme !== '' ? parseInt(b.pulaGratisNaFirme, 10) : 0
		if (b.status !== undefined) data.status = b.status

		// Spójność: adres tylko dla stacjonarnych, link tylko dla online
		const finalTryb = data.tryb || (await prisma.event.findUnique({ where: { id }, select: { tryb: true } }))?.tryb
		if (finalTryb === 'ONLINE') data.address = null
		if (finalTryb === 'STACJONARNE') data.onlineUrl = null

		const event = await prisma.event.update({ where: { id }, data })
		return NextResponse.json(event, { status: 200 })
	} catch (error) {
		console.error('Błąd edycji wydarzenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Usunięcie wydarzenia. Gdy ma zgłoszenia — blokujemy (steruj na archiwizację).
export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const count = await prisma.eventRegistration.count({ where: { eventId: id } })
		if (count > 0) {
			return NextResponse.json(
				{ message: 'Wydarzenie ma zgłoszenia — zarchiwizuj je zamiast usuwać.' },
				{ status: 409 }
			)
		}
		await prisma.event.delete({ where: { id } })
		return NextResponse.json({ message: 'Usunięto wydarzenie' }, { status: 200 })
	} catch (error) {
		console.error('Błąd usuwania wydarzenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

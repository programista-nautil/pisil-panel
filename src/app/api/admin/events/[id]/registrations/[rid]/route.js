import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Aktualizacja zgłoszenia: statusy płatności/rejestracji, nadpisanie tier/kwoty, notatka.
export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { rid } = await params
		const b = await request.json()
		const data = {}

		if (b.statusPlatnosci !== undefined) data.statusPlatnosci = b.statusPlatnosci
		if (b.statusRejestracji !== undefined) data.statusRejestracji = b.statusRejestracji
		if (b.tier !== undefined) data.tier = b.tier
		if (b.kwota !== undefined) data.kwota = b.kwota != null && b.kwota !== '' ? b.kwota : 0
		if (b.notatka !== undefined) data.notatka = b.notatka || null
		if (b.firmaAdres !== undefined) data.firmaAdres = b.firmaAdres || null

		const registration = await prisma.eventRegistration.update({ where: { id: rid }, data })
		return NextResponse.json(registration, { status: 200 })
	} catch (error) {
		console.error('Błąd aktualizacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Usunięcie zgłoszenia.
export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { rid } = await params
		await prisma.eventRegistration.delete({ where: { id: rid } })
		return NextResponse.json({ message: 'Usunięto zgłoszenie' }, { status: 200 })
	} catch (error) {
		console.error('Błąd usuwania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Używamy metody PATCH, ponieważ jest to częściowa aktualizacja zasobu
export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	const { isVerified } = await request.json()

	// Walidacja, czy otrzymaliśmy poprawną wartość
	if (typeof isVerified !== 'boolean') {
		return NextResponse.json({ message: 'Nieprawidłowa wartość dla pola isVerified' }, { status: 400 })
	}

	try {
		const updatedSubmission = await prisma.submission.update({
			where: { id },
			data: { isVerified },
		})

		return NextResponse.json(updatedSubmission, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas aktualizacji weryfikacji:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

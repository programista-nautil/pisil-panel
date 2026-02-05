import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	const { isArchived } = await request.json()

	if (typeof isArchived !== 'boolean') {
		return NextResponse.json({ message: 'Nieprawidłowa wartość `isArchived`' }, { status: 400 })
	}

	try {
		const updatedSubmission = await prisma.submission.update({
			where: { id },
			data: { isArchived },
		})

		return NextResponse.json(updatedSubmission, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas zmiany statusu archiwizacji:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

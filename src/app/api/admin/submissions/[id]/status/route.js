import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Status } from '@prisma/client'

export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	const { status } = await request.json()

	if (!Object.values(Status).includes(status)) {
		return NextResponse.json({ message: 'Nieprawidłowa wartość statusu' }, { status: 400 })
	}

	try {
		const updatedSubmission = await prisma.submission.update({
			where: { id },
			data: { status },
		})

		return NextResponse.json(updatedSubmission, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas aktualizacji statusu:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

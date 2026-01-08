import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	try {
		await prisma.member.delete({
			where: { id },
		})

		return NextResponse.json({ message: 'Członek został pomyślnie usunięty.' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas usuwania członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	try {
		const { email, phones, company, name, address } = await request.json()

		const existingMember = await prisma.member.findUnique({
			where: { email },
		})

		if (existingMember && existingMember.id !== id) {
			return NextResponse.json({ message: 'Ten adres e-mail jest już zajęty.' }, { status: 400 })
		}

		const updatedMember = await prisma.member.update({
			where: { id },
			data: {
				email,
				phones,
				company,
				name,
				address,
			},
		})

		return NextResponse.json(updatedMember, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas edycji członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

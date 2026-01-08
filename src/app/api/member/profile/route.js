import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { syncMailingList } from '@/lib/mailingListUtils'

// 1. Pobieranie danych profilu
export async function GET(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const member = await prisma.member.findUnique({
			where: { id: session.user.id },
			select: {
				id: true,
				email: true,
				company: true,
				name: true,
				address: true,
				phones: true,
				invoiceEmail: true,
				notificationEmails: true,
			},
		})

		if (!member) {
			return NextResponse.json({ message: 'Nie znaleziono profilu' }, { status: 404 })
		}

		return NextResponse.json(member)
	} catch (error) {
		console.error('Błąd pobierania profilu:', error)
		return NextResponse.json({ message: 'Błąd serwera' }, { status: 500 })
	}
}

export async function PATCH(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const body = await request.json()
		const { company, name, address, email, phones, invoiceEmail, notificationEmails } = body

		if (email) {
			const existingUser = await prisma.member.findFirst({
				where: {
					email: email,
					NOT: { id: session.user.id },
				},
			})
			if (existingUser) {
				return NextResponse.json({ message: 'Ten adres email jest już zajęty.' }, { status: 409 })
			}
		}

		const oldMember = await prisma.member.findUnique({ where: { id: session.user.id } })

		if (oldMember) {
			await syncMailingList(oldMember.notificationEmails, notificationEmails)
		}

		const updatedMember = await prisma.member.update({
			where: { id: session.user.id },
			data: {
				company,
				name,
				address,
				email,
				phones,
				invoiceEmail,
				notificationEmails,
			},
		})

		return NextResponse.json(updatedMember)
	} catch (error) {
		console.error('Błąd aktualizacji profilu:', error)
		return NextResponse.json({ message: 'Wystąpił błąd podczas zapisu.' }, { status: 500 })
	}
}

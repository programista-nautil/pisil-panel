import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { syncMailingList } from '@/lib/mailingListUtils'
import { addToPublicList, removeFromPublicList } from '@/lib/publicListUtils'

export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	try {
		const memberToDelete = await prisma.member.findUnique({ where: { id } })

		await prisma.member.delete({ where: { id } })

		if (memberToDelete) {
			await removeFromPublicList(memberToDelete.email)
		}

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

	const { id } = await params
	try {
		const { email, phones, company, name, address, invoiceEmail, notificationEmails } = await request.json()

		if (email) {
			const existingMember = await prisma.member.findUnique({
				where: { email },
			})

			if (existingMember && existingMember.id !== id) {
				return NextResponse.json({ message: 'Ten adres e-mail jest już zajęty.' }, { status: 400 })
			}
		}

		const oldMember = await prisma.member.findUnique({ where: { id } })

		if (oldMember) {
			await syncMailingList(oldMember.notificationEmails, notificationEmails)
			if (oldMember.email !== email) {
				await removeFromPublicList(oldMember.email)
			}
		}

		const updatedMember = await prisma.member.update({
			where: { id },
			data: {
				email,
				phones,
				company,
				name,
				address,
				invoiceEmail,
				notificationEmails,
			},
		})

		await addToPublicList({
			companyName: company,
			address: address,
			email: email,
			phones: phones,
		})

		return NextResponse.json(updatedMember, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas edycji członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

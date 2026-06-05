import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { syncMailingList } from '@/lib/mailingListUtils'
import { addToPublicList } from '@/lib/publicListUtils'

// Przywrócenie byłego członka — pełne odwrócenie usunięcia:
// reaktywacja konta + powrót do spisu publicznego + powrót na listę mailingową.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	try {
		const member = await prisma.member.findUnique({ where: { id } })
		if (!member) {
			return NextResponse.json({ message: 'Nie znaleziono członka.' }, { status: 404 })
		}
		if (!member.deletedAt) {
			return NextResponse.json({ message: 'Ten członek nie jest usunięty.' }, { status: 400 })
		}

		await prisma.member.update({
			where: { id },
			data: {
				deletedAt: null,
				removalNote: null,
			},
		})

		// Powrót do spisu publicznego i na listę mailingową
		await addToPublicList({
			companyName: member.company,
			address: member.address,
			email: member.email,
			phones: member.phones,
			fax: member.fax,
			website: member.website,
		})
		await syncMailingList('', member.notificationEmails)

		return NextResponse.json({ message: 'Członek został przywrócony.' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas przywracania członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

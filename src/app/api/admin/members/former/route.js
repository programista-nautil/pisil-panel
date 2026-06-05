import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

// Lista byłych członków (miękko usuniętych) — pobierana leniwie po rozwinięciu sekcji w panelu.
export async function GET() {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const formerMembers = await prisma.member.findMany({
			where: { deletedAt: { not: null } },
			orderBy: { deletedAt: 'desc' },
			select: {
				id: true,
				memberNumber: true,
				company: true,
				name: true,
				email: true,
				phones: true,
				address: true,
				deletedAt: true,
				removalNote: true,
			},
		})

		return NextResponse.json({ formerMembers, total: formerMembers.length })
	} catch (error) {
		console.error('Błąd podczas pobierania byłych członków:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

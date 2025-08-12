import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET() {
	const session = await auth()

	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const submissions = await prisma.submission.findMany({
			orderBy: { createdAt: 'desc' },
			include: { attachments: true },
		})
		return NextResponse.json(submissions)
	} catch (error) {
		console.error('Błąd podczas pobierania zgłoszeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const [activeSubmissions, totalMembers, totalGeneralFiles] = await prisma.$transaction([
			prisma.submission.count({
				where: { isArchived: false },
			}),
			prisma.member.count(),

			prisma.generalFile.count(),
		])

		return NextResponse.json({
			activeSubmissions,
			totalMembers,
			totalGeneralFiles,
		})
	} catch (error) {
		console.error('Błąd podczas pobierania statystyk:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

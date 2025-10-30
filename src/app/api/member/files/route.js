import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Status, AttachmentSource } from '@prisma/client'

export async function GET() {
	const session = await auth()

	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const memberId = session.user.id
		console.log('ID zalogowanego członka:', memberId)

		const submission = await prisma.submission.findFirst({
			where: {
				memberId: memberId,
				formType: 'DEKLARACJA_CZLONKOWSKA',
				status: Status.ACCEPTED,
			},
			include: {
				attachments: {
					where: {
						source: {
							in: [AttachmentSource.GENERATED, AttachmentSource.ADMIN_UPLOAD],
						},
					},
					orderBy: {
						createdAt: 'desc',
					},
				},
			},
		})

		console.log('Pobrane zgłoszenie członka:', submission)

		const individualFiles = submission?.attachments || []

		const generalFiles = []

		return NextResponse.json({ generalFiles, individualFiles })
	} catch (error) {
		console.error('Błąd podczas pobierania plików członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

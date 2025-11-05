import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Status, AttachmentSource } from '@prisma/client'
import { STATIC_ACCEPTANCE_DOCUMENTS } from '@/lib/staticDocuments'

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

		const acceptanceDocs = STATIC_ACCEPTANCE_DOCUMENTS.map((name, index) => ({
			id: `static-${index}`,
			fileName: name,
			downloadUrl: `/api/member/static-document/${name}`, // Link do ich dedykowanego API
		}))

		const generalFilesCategories = [
			{
				category: 'Dokumenty członkowskie (statuty, regulaminy)',
				files: acceptanceDocs,
			},
		]

		const dynamicGeneralFiles = await prisma.generalFile.findMany({
			orderBy: { createdAt: 'desc' },
		})

		if (dynamicGeneralFiles.length > 0) {
			generalFilesCategories.push({
				category: 'Pliki Ogólne',
				files: dynamicGeneralFiles.map(file => ({
					id: file.id,
					fileName: file.fileName,
					downloadUrl: `/api/member/general-files/${file.id}/download`, // Link do nowego API
				})),
			})
		}

		return NextResponse.json({ generalFiles: generalFilesCategories, individualFiles })
	} catch (error) {
		console.error('Błąd podczas pobierania plików członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

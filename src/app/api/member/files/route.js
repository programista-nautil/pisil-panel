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
			select: {
				attachments: {
					where: { source: AttachmentSource.GENERATED },
					orderBy: { createdAt: 'desc' },
					select: { id: true, fileName: true },
				},
			},
		})

		const generatedFiles = (submission?.attachments || []).map(file => ({
			...file,
			downloadUrl: `/api/member/attachments/${file.id}/download`,
		}))

		// 2. Pobierz pliki wgrane przez admina (z 'MemberFile') i od razu je oznacz
		const adminUploadedFiles = (
			await prisma.memberFile.findMany({
				where: { memberId: memberId },
				orderBy: { createdAt: 'desc' },
				select: { id: true, fileName: true }, // Pobieramy tylko potrzebne dane
			})
		).map(file => ({
			...file,
			downloadUrl: `/api/member/member-files/${file.id}/download`, // Używamy NOWEGO endpointu
		}))

		console.log(adminUploadedFiles, 'pliki wgrane przez admina dla członka:', memberId)

		// 3. Połącz obie listy
		const individualFiles = [...generatedFiles, ...adminUploadedFiles]

		console.log('Pliki indywidualne członka:', individualFiles)

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
					downloadUrl: `/api/member/general-files/${file.id}/download`,
				})),
			})
		}

		return NextResponse.json({ generalFiles: generalFilesCategories, individualFiles })
	} catch (error) {
		console.error('Błąd podczas pobierania plików członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

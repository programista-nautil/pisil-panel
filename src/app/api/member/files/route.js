import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Status, AttachmentSource } from '@prisma/client'
import { STATIC_ACCEPTANCE_DOCUMENTS } from '@/lib/staticDocuments'
import { logDeprecated } from '@/lib/deprecatedLogger'

export async function GET(request) {
	logDeprecated(request)
	const session = await auth()

	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const memberId = session.user.id

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

		const generatedAcceptanceDocs = (submission?.attachments || []).map(file => ({
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
			downloadUrl: `/api/member/members/files/${file.id}/download`,
		}))

		const acceptanceDocs = STATIC_ACCEPTANCE_DOCUMENTS.map((name, index) => ({
			id: `static-${index}`,
			fileName: name,
			downloadUrl: `/api/member/resources/acceptance/${name}`,
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

		return NextResponse.json({
			generalFiles: generalFilesCategories,
			adminUploadedFiles: adminUploadedFiles,
			generatedAcceptanceDocs: generatedAcceptanceDocs,
		})
	} catch (error) {
		console.error('Błąd podczas pobierania plików członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

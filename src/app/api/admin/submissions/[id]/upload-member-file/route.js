import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id: submissionId } = params
	const data = await request.formData()
	const files = data.getAll('files[]')

	if (!files || files.length === 0) {
		return NextResponse.json({ message: 'Nie przesłano żadnych plików.' }, { status: 400 })
	}

	try {
		const createdAttachments = []

		for (const file of files) {
			const buffer = Buffer.from(await file.arrayBuffer())
			const filename = `${sanitizeFilename(file.name)}`
			const gcsPath = await uploadFileToGCS(buffer, filename)

			const newAttachment = await prisma.attachment.create({
				data: {
					fileName: filename,
					filePath: gcsPath,
					submissionId: submissionId,
					source: 'ADMIN_UPLOAD', // Ustawiamy nowe źródło
				},
			})
			createdAttachments.push(newAttachment)
		}

		// Zwracamy listę utworzonych załączników, aby UI mogło się zaktualizować
		return NextResponse.json(createdAttachments, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas przesyłania pliku dla członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

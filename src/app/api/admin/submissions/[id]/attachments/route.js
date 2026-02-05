import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import crypto from 'crypto'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user.role !== 'admin') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params // ID zgłoszenia

	try {
		const formData = await request.formData()
		const files = formData.getAll('files[]')

		if (!files || files.length === 0) {
			return NextResponse.json({ message: 'Nie wybrano żadnych plików.' }, { status: 400 })
		}

		// Sprawdź czy zgłoszenie istnieje
		const submission = await prisma.submission.findUnique({ where: { id } })
		if (!submission) {
			return NextResponse.json({ message: 'Zgłoszenie nie istnieje.' }, { status: 404 })
		}

		const uploadedAttachments = []

		// Przetwarzanie plików
		for (const file of files) {
			const bytes = await file.arrayBuffer()
			const buffer = Buffer.from(bytes)

			const originalName = sanitizeFilename(file.name)
			const uniqueId = crypto.randomUUID()
			const gcsFilename = `${uniqueId}_${originalName}`

			// Upload do GCS
			const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

			// Zapis w bazie
			const attachment = await prisma.attachment.create({
				data: {
					fileName: originalName,
					filePath: gcsPath,
					submissionId: id,
					source: 'CLIENT_UPLOAD', // Oznaczamy jako plik wgrany ręcznie/przez klienta
				},
			})
			uploadedAttachments.push(attachment)
		}

		return NextResponse.json(
			{
				message: 'Pliki zostały dodane pomyślnie.',
				attachments: uploadedAttachments,
			},
			{ status: 201 },
		)
	} catch (error) {
		console.error('Błąd dodawania załączników:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import crypto from 'crypto'

export async function POST(request, { params }) {
	const { id } = await params

	const submissionId = id

	const data = await request.formData()
	const files = data.getAll('additionalFiles[]')

	if (!files || files.length === 0) {
		return NextResponse.json({ message: 'Nie wybrano plików' }, { status: 400 })
	}

	try {
		const attachmentPromises = files.map(async file => {
			const bytes = await file.arrayBuffer()
			const buffer = Buffer.from(bytes)
			const filename = `${sanitizeFilename(file.name)}`
			const uniqueId = crypto.randomUUID()
			const gcsFilename = `attachments/${submissionId}/${uniqueId}_${filename}`
			const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

			return prisma.attachment.create({
				data: {
					fileName: filename,
					filePath: gcsPath,
					submissionId: submissionId,
					source: 'CLIENT_UPLOAD',
				},
			})
		})

		await Promise.all(attachmentPromises)

		return NextResponse.json({ message: 'Załączniki zostały pomyślnie dodane' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas przesyłania załączników:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

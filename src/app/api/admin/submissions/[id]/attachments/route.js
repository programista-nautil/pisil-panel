import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const submissionId = params.id
	const data = await request.formData()
	const files = data.getAll('additionalFiles[]')

	if (!files || files.length === 0) {
		return NextResponse.json({ message: 'Nie wybrano plików' }, { status: 400 })
	}

	try {
		const attachmentPromises = files.map(async file => {
			const bytes = await file.arrayBuffer()
			const buffer = Buffer.from(bytes)
			const filename = `zalacznik_${Date.now()}_${file.name}`

			const gcsPath = await uploadFileToGCS(buffer, filename)

			return prisma.attachment.create({
				data: {
					fileName: filename,
					filePath: gcsPath,
					submissionId: submissionId,
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

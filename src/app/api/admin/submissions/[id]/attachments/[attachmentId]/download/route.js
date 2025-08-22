import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { downloadFileFromGCS } from '@/lib/gcs'

export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id: submissionId, attachmentId } = params

	try {
		const attachment = await prisma.attachment.findFirst({
			where: { id: attachmentId, submissionId },
		})

		if (!attachment) {
			return NextResponse.json({ message: 'Nie znaleziono załącznika' }, { status: 404 })
		}

		const fileBuffer = await downloadFileFromGCS(attachment.filePath)

		const headers = new Headers()
		headers.set('Content-Type', 'application/octet-stream')

		const asciiFilename = attachment.fileName.replace(/[^\x00-\x7F]/g, '_')
		const utf8Filename = encodeURIComponent(attachment.fileName)
		headers.set('Content-Disposition', `attachment; filename="${asciiFilename}"; filename*=UTF-8''${utf8Filename}`)

		return new NextResponse(fileBuffer, { status: 200, headers })
	} catch (error) {
		console.error('Błąd podczas pobierania załącznika:', error)
		if (error.message.includes('File not found')) {
			return NextResponse.json({ message: 'Plik nie istnieje w magazynie' }, { status: 404 })
		}
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

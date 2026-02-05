import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { deleteFileFromGCS } from '@/lib/gcs'

export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id: submissionId, attachmentId } = await params

	try {
		const attachment = await prisma.attachment.findFirst({
			where: { id: attachmentId, submissionId },
		})

		if (!attachment) {
			return NextResponse.json({ message: 'Nie znaleziono załącznika' }, { status: 404 })
		}

		await deleteFileFromGCS(attachment.filePath)

		await prisma.attachment.delete({ where: { id: attachment.id } })

		return NextResponse.json({ message: 'Załącznik został usunięty' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas usuwania załącznika:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

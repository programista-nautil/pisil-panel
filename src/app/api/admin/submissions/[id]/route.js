import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { deleteFileFromGCS } from '@/lib/gcs'

export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
			include: { attachments: true },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// Kasujemy główny plik
		await deleteFileFromGCS(submission.fileName)

		// Kasujemy załączniki (ignorujemy błędy pojedynczych plików aby nie blokować operacji)
		if (submission.attachments?.length) {
			await Promise.allSettled(
				submission.attachments.map(a =>
					deleteFileFromGCS(a.filePath).catch(err => console.error('Attachment delete err', err))
				)
			)
		}

		await prisma.submission.delete({ where: { id } })

		return NextResponse.json({ message: 'Zgłoszenie zostało pomyślnie usunięte' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas usuwania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

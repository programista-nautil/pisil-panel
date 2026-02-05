import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { deleteFileFromGCS } from '@/lib/gcs'

export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
			include: { attachments: true },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		if (submission.acceptanceNumber) {
			await prisma.submission.update({
				where: { id },
				data: { isArchived: true },
			})

			return NextResponse.json(
				{
					message: 'Zgłoszenie zostało przeniesione do archiwum (ze względu na nadany numer członkowski).',
					action: 'archived', // Zwracamy informację o akcji dla frontendu
				},
				{ status: 200 },
			)
		} else {
			if (submission.filePath) {
				try {
					await deleteFileFromGCS(submission.filePath)
				} catch (error) {
					console.error('Błąd usuwania głównego pliku PDF:', error)
					// Kontynuujemy, nawet jeśli pliku nie ma w GCS
				}
			}

			// Kasujemy załączniki (ignorujemy błędy pojedynczych plików aby nie blokować operacji)
			if (submission.attachments?.length) {
				await Promise.allSettled(
					submission.attachments.map(a =>
						deleteFileFromGCS(a.filePath).catch(err => console.error('Attachment delete err', err)),
					),
				)
			}

			await prisma.submission.delete({ where: { id } })

			return NextResponse.json(
				{
					message: 'Zgłoszenie zostało trwale usunięte.',
					action: 'deleted',
				},
				{ status: 200 },
			)
		}
	} catch (error) {
		console.error('Błąd podczas usuwania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

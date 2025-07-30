import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { downloadFileFromGCS } from '@/lib/gcs'

export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// Pobieramy plik z GCS zamiast z lokalnego dysku
		const fileBuffer = await downloadFileFromGCS(submission.fileName)

		// Ustaw nagłówki, aby przeglądarka pobrała plik
		const headers = new Headers()
		headers.set('Content-Type', 'application/pdf')
		headers.set('Content-Disposition', `attachment; filename="${submission.fileName}"`)

		return new NextResponse(fileBuffer, { status: 200, headers })
	} catch (error) {
		console.error('Błąd podczas pobierania pliku:', error)
		if (error.message.includes('File not found')) {
			return NextResponse.json({ message: 'Plik nie istnieje w magazynie' }, { status: 404 })
		}
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

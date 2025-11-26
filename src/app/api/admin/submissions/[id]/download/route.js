import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Storage } from '@google-cloud/storage' // 1. Zmieniamy import

// 2. Konfiguracja GCS (taka sama jak w innych plikach)
const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})
const bucketName = process.env.GCS_BUCKET_NAME

export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params // Pamiętaj: w App Router params nie trzeba awaitować w tej wersji Next.js, ale w najnowszej tak. Tu zostawiamy standardowo.

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// 3. ZMIANA: Wyciągamy nazwę pliku w GCS ze ścieżki `filePath`
		// filePath zawiera zazwyczaj: https://storage.googleapis.com/NAZWA_BUCKETU/nazwa_pliku.pdf
		// Musimy wyciąć początek, żeby dostać samą nazwę pliku (klucz obiektu)
		const gcsFileName = submission.filePath.replace(`https://storage.googleapis.com/${bucketName}/`, '')

		const file = storage.bucket(bucketName).file(gcsFileName)
		const [exists] = await file.exists()

		if (!exists) {
			console.error(`Plik nie istnieje w GCS pod ścieżką: ${gcsFileName}`)
			return NextResponse.json({ message: 'Plik nie istnieje w magazynie' }, { status: 404 })
		}

		// 4. Tworzymy strumień i nagłówki (z obsługą polskich znaków)
		const stream = file.createReadStream()
		const encodedFilename = encodeURIComponent(submission.fileName)

		const headers = new Headers({
			'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
			'Content-Type': 'application/pdf',
		})

		return new Response(stream, { status: 200, headers })
	} catch (error) {
		console.error('Błąd podczas pobierania pliku:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

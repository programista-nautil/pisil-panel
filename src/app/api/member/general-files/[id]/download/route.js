import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Storage } from '@google-cloud/storage'

const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})
const bucketName = process.env.GCS_BUCKET_NAME

export async function GET(request, { params }) {
	const session = await auth()
	// 1. Sprawdzamy sesję CZŁONKA
	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	try {
		const fileRecord = await prisma.generalFile.findUnique({
			where: { id },
		})

		if (!fileRecord) {
			return NextResponse.json({ message: 'Nie znaleziono pliku' }, { status: 404 })
		}

		// 2. Logika pobierania z GCS (taka sama jak dla admina)
		const gcsFileName = fileRecord.filePath.replace(`https://storage.googleapis.com/${bucketName}/`, '')
		const file = storage.bucket(bucketName).file(gcsFileName)
		const [exists] = await file.exists()

		if (!exists) {
			return NextResponse.json({ message: 'Plik nie istnieje w GCS' }, { status: 404 })
		}

		console.log('Pobieranie pliku ogólnego przez członka:', fileRecord)

		const stream = file.createReadStream()
		const headers = new Headers({
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(fileRecord.fileName)}`,
			'Content-Type': 'application/octet-stream',
		})

		return new Response(stream, { headers })
	} catch (error) {
		console.error('Błąd podczas pobierania pliku ogólnego przez członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

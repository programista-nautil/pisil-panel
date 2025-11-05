import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { Storage } from '@google-cloud/storage' // Potrzebne do GCS

const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})
const bucketName = process.env.GCS_BUCKET_NAME

export async function GET(request, { params }) {
	const session = await auth()
	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { attachmentId } = params
	const memberId = session.user.id

	try {
		// 1. Znajdź załącznik i powiązane zgłoszenie
		const attachment = await prisma.attachment.findUnique({
			where: { id: attachmentId },
			include: { submission: true },
		})

		// 2. Sprawdź, czy załącznik istnieje i czy należy do zalogowanego członka
		if (!attachment || attachment.submission.memberId !== memberId) {
			return NextResponse.json({ message: 'Nie znaleziono pliku lub brak dostępu' }, { status: 404 })
		}
		console.log('Pobrany załącznik:', attachment)

		// 3. Pobierz plik z GCS jako strumień
		const gcsFileName = attachment.filePath.replace(`https://storage.googleapis.com/${bucketName}/`, '')
		const file = storage.bucket(bucketName).file(gcsFileName)
		const [exists] = await file.exists()

		if (!exists) {
			return NextResponse.json({ message: 'Plik nie istnieje w GCS' }, { status: 404 })
		}

		const stream = file.createReadStream()

		const encodedFilename = encodeURIComponent(attachment.fileName)

		const headers = new Headers({
			'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
			'Content-Type': 'application/octet-stream',
		})

		return new Response(stream, { headers })
	} catch (error) {
		console.error('Błąd podczas pobierania załącznika przez członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

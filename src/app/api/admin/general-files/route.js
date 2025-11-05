import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import path from 'path'

// POBIERANIE listy plików ogólnych
export async function GET(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const files = await prisma.generalFile.findMany({
			orderBy: {
				createdAt: 'desc',
			},
		})
		return NextResponse.json(files)
	} catch (error) {
		console.error('Błąd podczas pobierania plików ogólnych:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// DODAWANIE nowego pliku ogólnego
export async function POST(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const data = await request.formData()
		const file = data.get('file')

		if (!file) {
			return NextResponse.json({ message: 'Nie przesłano pliku.' }, { status: 400 })
		}

		// Przetwarzanie i wysyłka do GCS
		const buffer = Buffer.from(await file.arrayBuffer())
		const originalFilename = sanitizeFilename(file.name)
		const fileExtension = path.extname(originalFilename)
		const fileNameWithoutExt = path.basename(originalFilename, fileExtension)

		const gcsFilename = `general/${fileNameWithoutExt}_${Date.now()}${fileExtension}`
		const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

		// Zapis w bazie danych
		const newFile = await prisma.generalFile.create({
			data: {
				fileName: originalFilename, // Zapisujemy oryginalną nazwę pliku
				filePath: gcsPath,
			},
		})

		return NextResponse.json(newFile, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas dodawania pliku ogólnego:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

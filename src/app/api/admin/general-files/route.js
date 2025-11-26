import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import path from 'path'
import crypto from 'crypto'

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
		const files = data.getAll('files[]')

		if (!files || files.length === 0) {
			return NextResponse.json({ message: 'Nie przesłano żadnych plików.' }, { status: 400 })
		}

		const uploadPromises = files.map(async file => {
			const buffer = Buffer.from(await file.arrayBuffer())
			const originalFilename = sanitizeFilename(file.name)
			const fileExtension = path.extname(originalFilename)
			const fileNameWithoutExt = path.basename(originalFilename, fileExtension)

			// 3. ZMIANA KLUCZOWA: Używamy UUID zamiast Date.now()
			// Date.now() może zwrócić ten sam czas dla małych plików przetwarzanych w pętli,
			// co powoduje konflikt nazw. UUID jest zawsze unikalne.
			const uniqueId = crypto.randomUUID()
			const gcsFilename = `general/${fileNameWithoutExt}_${uniqueId}${fileExtension}`

			const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

			// Zapis w bazie danych
			return prisma.generalFile.create({
				data: {
					fileName: originalFilename,
					filePath: gcsPath,
				},
			})
		})

		// Czekamy, aż WSZYSTKIE pliki się wyślą i zapiszą
		const createdFiles = await Promise.all(uploadPromises)

		return NextResponse.json(createdFiles, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas dodawania pliku ogólnego:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

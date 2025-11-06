import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import path from 'path'

// GET - Pobiera pliki dla konkretnego członka
export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id: memberId } = params
	try {
		const files = await prisma.memberFile.findMany({
			where: { memberId },
			orderBy: { createdAt: 'desc' },
		})
		return NextResponse.json(files)
	} catch (error) {
		console.error('Błąd pobierania plików członka:', error)
		return NextResponse.json({ message: 'Błąd serwera' }, { status: 500 })
	}
}

// POST - Wgrywa nowe pliki dla konkretnego członka
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id: memberId } = params
	const data = await request.formData()
	const files = data.getAll('files[]')

	if (!files || files.length === 0) {
		return NextResponse.json({ message: 'Nie przesłano żadnych plików.' }, { status: 400 })
	}

	try {
		const createdAttachments = [] // Tablica na nowe rekordy

		for (const file of files) {
			const buffer = Buffer.from(await file.arrayBuffer())
			const originalFilename = sanitizeFilename(file.name)
			const fileExtension = path.extname(originalFilename)
			const fileNameWithoutExt = path.basename(originalFilename, fileExtension)

			const gcsFilename = `member_files/${memberId}/${fileNameWithoutExt}_${Date.now()}${fileExtension}`
			const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

			const newFile = await prisma.memberFile.create({
				data: {
					fileName: originalFilename,
					filePath: gcsPath,
					memberId: memberId,
				},
			})
			createdAttachments.push(newFile)
		}

		// Zwracamy tablicę wszystkich utworzonych plików
		return NextResponse.json(createdAttachments, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas przesyłania plików dla członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

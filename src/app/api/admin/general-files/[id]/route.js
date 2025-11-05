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
		// 1. Znajdź wpis w bazie danych
		const fileRecord = await prisma.generalFile.findUnique({
			where: { id },
		})
		if (!fileRecord) {
			return NextResponse.json({ message: 'Nie znaleziono pliku.' }, { status: 404 })
		}

		// 2. Usuń plik z GCS
		await deleteFileFromGCS(fileRecord.filePath)

		// 3. Usuń wpis z bazy danych
		await prisma.generalFile.delete({
			where: { id },
		})

		return NextResponse.json({ message: 'Plik został pomyślnie usunięty.' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas usuwania pliku ogólnego:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

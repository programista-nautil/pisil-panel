import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { deleteFileFromGCS } from '@/lib/gcs'

// Usuwa plik członka (MemberFile)
export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	try {
		const fileRecord = await prisma.memberFile.findUnique({
			where: { id },
		})
		if (!fileRecord) {
			return NextResponse.json({ message: 'Nie znaleziono pliku.' }, { status: 404 })
		}

		await deleteFileFromGCS(fileRecord.filePath)
		await prisma.memberFile.delete({
			where: { id },
		})

		return NextResponse.json({ message: 'Plik został pomyślnie usunięty.' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas usuwania pliku członka:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

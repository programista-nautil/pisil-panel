import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs/promises'
import path from 'path'
import { STATIC_ACCEPTANCE_DOCUMENTS } from '@/lib/staticDocuments'

export async function GET(request, { params }) {
	const session = await auth()

	// 1. Sprawdź, czy użytkownik jest zalogowanym członkiem
	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		let { filename } = await params
		filename = filename.join('/')

		// 2. SPRAWDZENIE BEZPIECZEŃSTWA: Upewnij się, że plik jest na liście dozwolonych
		if (!STATIC_ACCEPTANCE_DOCUMENTS.includes(filename)) {
			return NextResponse.json({ message: 'Brak dostępu do tego pliku' }, { status: 403 })
		}

		// 3. Zbuduj bezpieczną ścieżkę do pliku
		const filePath = path.join(process.cwd(), 'private', 'acceptance-documents', filename)
		const buffer = await fs.readFile(filePath)

		// 4. Zwróć plik do przeglądarki
		const headers = new Headers({
			'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
			'Content-Type': 'application/octet-stream',
		})

		return new Response(buffer, { headers })
	} catch (error) {
		console.error('Błąd pobierania pliku statycznego:', error)
		if (error.code === 'ENOENT') {
			return NextResponse.json({ message: 'Nie znaleziono pliku' }, { status: 404 })
		}
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

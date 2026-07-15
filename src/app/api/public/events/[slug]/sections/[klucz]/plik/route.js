import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { downloadFileFromGCS } from '@/lib/gcs'

const KLUCZE = ['INFORMACJE', 'PROGRAM', 'GALERIA', 'RELACJA']

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Typ po rozszerzeniu — dzięki temu PDF otwiera się w przeglądarce, a nie zapisuje na siłę.
// Nieznane rozszerzenie → pobranie pliku (bezpieczny domyślny wariant).
const TYPY = {
	pdf: 'application/pdf',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	gif: 'image/gif',
	webp: 'image/webp',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	ppt: 'application/vnd.ms-powerpoint',
	pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
	zip: 'application/zip',
	txt: 'text/plain; charset=utf-8',
}

function typPliku(nazwa) {
	const ext = String(nazwa || '').split('.').pop().toLowerCase()
	return TYPY[ext] || 'application/octet-stream'
}

// Plik dołączony do rozwijanego bloku wydarzenia (program, galeria, relacja…).
// Publiczne, bo to materiały dla uczestników — ale serwowane naszą trasą, nie z publicznego URL-a chmury.
export async function GET(request, { params }) {
	try {
		const { slug, klucz } = await params
		const KLUCZ = String(klucz || '').toUpperCase()
		if (!KLUCZE.includes(KLUCZ)) {
			return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404, headers: CORS })
		}

		// Szkice są niewidoczne publicznie — razem z ich plikami.
		const event = await prisma.event.findUnique({
			where: { slug },
			select: { id: true, status: true },
		})
		if (!event || event.status === 'DRAFT') {
			return NextResponse.json({ error: 'Nie znaleziono' }, { status: 404, headers: CORS })
		}

		const sekcja = await prisma.eventSection.findUnique({
			where: { eventId_klucz: { eventId: event.id, klucz: KLUCZ } },
		})
		if (!sekcja?.plikPath) {
			return NextResponse.json({ error: 'Nie znaleziono pliku' }, { status: 404, headers: CORS })
		}

		const buffer = await downloadFileFromGCS(sekcja.plikPath)
		const nazwa = sekcja.plikNazwa || 'plik'

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': typPliku(nazwa),
				'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(nazwa)}`,
				'Cache-Control': 'public, max-age=300',
				...CORS,
			},
		})
	} catch (error) {
		console.error('Błąd pobierania pliku bloku wydarzenia:', error)
		return NextResponse.json({ error: 'Nie znaleziono pliku' }, { status: 404, headers: CORS })
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS })
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS, deleteFileFromGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'

const KLUCZE = ['INFORMACJE', 'PROGRAM', 'GALERIA', 'RELACJA']

// Zapis jednego rozwijanego bloku strony wydarzenia (tekst / plik / link — dowolna kombinacja).
// FormData, bo blok może nieść plik. Pusty blok jest KASOWANY, nie zapisywany pusty —
// dzięki temu na stronie nie pojawia się belka bez treści.
export async function PUT(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id, klucz } = await params
		const KLUCZ = String(klucz || '').toUpperCase()
		if (!KLUCZE.includes(KLUCZ)) {
			return NextResponse.json({ message: 'Nieznany blok.' }, { status: 400 })
		}

		const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const fd = await request.formData()
		const tekst = (fd.get('tekst') ?? '').toString().trim()
		const link = (fd.get('link') ?? '').toString().trim()
		const usunPlik = fd.get('usunPlik') === '1'
		const file = fd.get('file')

		const obecna = await prisma.eventSection.findUnique({
			where: { eventId_klucz: { eventId: id, klucz: KLUCZ } },
		})

		let plikPath = obecna?.plikPath || null
		let plikNazwa = obecna?.plikNazwa || null

		if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
			// Nowy plik zastępuje poprzedni — stary sprzątamy z chmury, żeby nie zostawiać sierot.
			const buffer = Buffer.from(await file.arrayBuffer())
			const nazwa = sanitizeFilename(file.name)
			const cel = `wydarzenia/${id}/${KLUCZ.toLowerCase()}/${Date.now()}_${nazwa}`
			const nowy = await uploadFileToGCS(buffer, cel, file.type || 'application/octet-stream')
			if (plikPath) await deleteFileFromGCS(plikPath).catch(() => {})
			plikPath = nowy
			plikNazwa = nazwa
		} else if (usunPlik && plikPath) {
			await deleteFileFromGCS(plikPath).catch(() => {})
			plikPath = null
			plikNazwa = null
		}

		if (!tekst && !link && !plikPath) {
			if (obecna) await prisma.eventSection.delete({ where: { id: obecna.id } })
			return NextResponse.json({ klucz: KLUCZ, pusty: true }, { status: 200 })
		}

		const zapisana = await prisma.eventSection.upsert({
			where: { eventId_klucz: { eventId: id, klucz: KLUCZ } },
			create: { eventId: id, klucz: KLUCZ, tekst: tekst || null, link: link || null, plikPath, plikNazwa },
			update: { tekst: tekst || null, link: link || null, plikPath, plikNazwa },
		})

		return NextResponse.json(zapisana, { status: 200 })
	} catch (error) {
		console.error('Błąd zapisu bloku wydarzenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

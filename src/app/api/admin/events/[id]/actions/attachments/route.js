import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS, deleteFileFromGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import { MAX_ATTACHMENTS_BYTES, attachmentPrefix, isOwnAttachmentPath } from '@/lib/services/eventBulkMail'

// Załączniki wysyłki zbiorczej. Plik ląduje w chmurze OD RAZU przy wyborze (żeby okno wysyłki nie musiało
// nieść megabajtów przez formularz), a dopiero wysłanie kampanii wiąże go z nią w bazie. Pliki wgrane
// i nigdy niewysłane zostają w chmurze jako sieroty — świadome uproszczenie, kasujemy je przy usunięciu
// z okna oraz przy cofnięciu wysyłki.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const event = await prisma.event.findUnique({ where: { id }, select: { id: true } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		const fd = await request.formData()
		const file = fd.get('file')
		if (!file || typeof file.arrayBuffer !== 'function' || file.size === 0) {
			return NextResponse.json({ message: 'Nie wybrano pliku.' }, { status: 400 })
		}
		if (file.size > MAX_ATTACHMENTS_BYTES) {
			return NextResponse.json(
				{ message: `Plik jest za duży (limit ${Math.round(MAX_ATTACHMENTS_BYTES / 1024 / 1024)} MB).` },
				{ status: 400 }
			)
		}

		const buffer = Buffer.from(await file.arrayBuffer())
		const filename = sanitizeFilename(file.name)
		// `sanitizeFilename` nie rusza kropek, a walidator ścieżek odrzuca wszystko z „..". Bez zwinięcia
		// kropek plik o nazwie „program..pdf" wgrałby się poprawnie, ale potem NIE dałoby się go wysłać
		// (walidacja przy wysyłce by go odrzuciła) — plik-widmo w chmurze i niezrozumiały błąd dla admina.
		const nazwaDoSciezki = filename.replace(/\.{2,}/g, '.')
		const cel = `${attachmentPrefix(id)}${Date.now()}_${nazwaDoSciezki}`
		const path = await uploadFileToGCS(buffer, cel, file.type || 'application/octet-stream')

		return NextResponse.json(
			{ path, filename, size: file.size, mimeType: file.type || null },
			{ status: 201 }
		)
	} catch (error) {
		console.error('Błąd wgrywania załącznika kampanii:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Usunięcie wgranego pliku, zanim kampania powstanie (admin rozmyślił się w oknie wysyłki).
export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const body = await request.json().catch(() => ({}))
		const path = (body.path || '').trim()

		// Ścieżka przychodzi z przeglądarki — bez tej kontroli dałoby się skasować dowolny plik z chmury.
		if (!isOwnAttachmentPath(id, path)) {
			return NextResponse.json({ message: 'Ten plik nie należy do tego wydarzenia.' }, { status: 400 })
		}

		// Plik wpięty w istniejącą kampanię jest NIETYKALNY. Inaczej (np. gdy odpowiedź wysyłki nie dotarła
		// do przeglądarki i admin klika „Usuń" w wciąż otwartym oknie) plik zniknąłby z chmury, a worker
		// wywracałby się na pobraniu — kampania widniałaby jako wysłana, choć nikt nie dostałby maila.
		const wpiety = await prisma.eventMailingAttachment.findFirst({ where: { path }, select: { id: true } })
		if (wpiety) {
			return NextResponse.json(
				{ message: 'Ten plik należy już do wysłanej kampanii i nie można go usunąć.' },
				{ status: 409 }
			)
		}

		await deleteFileFromGCS(path).catch(() => {})
		return NextResponse.json({ deleted: true }, { status: 200 })
	} catch (error) {
		console.error('Błąd usuwania załącznika kampanii:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/utils'

// Generuje unikalny slug na bazie tytułu (dokleja -2, -3… przy kolizji).
async function uniqueSlug(title) {
	const base = slugify(title) || 'wydarzenie'
	let candidate = base
	let n = 1
	// eslint-disable-next-line no-await-in-loop
	while (await prisma.event.findUnique({ where: { slug: candidate } })) {
		n += 1
		candidate = `${base}-${n}`
	}
	return candidate
}

// Lista wszystkich wydarzeń (panel admina) — z liczbą zgłoszeń.
export async function GET() {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const events = await prisma.event.findMany({
			orderBy: [{ startAt: 'desc' }],
			include: { _count: { select: { registrations: true } }, sections: true },
		})
		return NextResponse.json(events, { status: 200 })
	} catch (error) {
		console.error('Błąd pobierania wydarzeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Utworzenie nowego wydarzenia.
export async function POST(request) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const b = await request.json()

		if (!b.title || !b.typ || !b.tryb || !b.startAt) {
			return NextResponse.json(
				{ message: "Wymagane pola: tytuł, typ, tryb, data rozpoczęcia." },
				{ status: 400 }
			)
		}

		const slug = await uniqueSlug(b.title)

		const event = await prisma.event.create({
			data: {
				slug,
				typ: b.typ,
				tryb: b.tryb,
				title: b.title,
				description: b.description || null,
				startAt: new Date(b.startAt),
				endAt: b.endAt ? new Date(b.endAt) : null,
				prowadzacy: b.prowadzacy || null,
				address: b.tryb === 'STACJONARNE' ? b.address || null : null,
				onlineUrl: b.tryb === 'ONLINE' ? b.onlineUrl || null : null,
				limitMiejsc: b.limitMiejsc != null && b.limitMiejsc !== '' ? parseInt(b.limitMiejsc, 10) : null,
				registrationDeadline: b.registrationDeadline ? new Date(b.registrationDeadline) : null,
				bankAccount: b.bankAccount || null,
				cenaCzlonek: b.cenaCzlonek != null && b.cenaCzlonek !== '' ? b.cenaCzlonek : null,
				cenaNieczlonek: b.cenaNieczlonek != null && b.cenaNieczlonek !== '' ? b.cenaNieczlonek : null,
				pulaGratisNaFirme: b.pulaGratisNaFirme != null && b.pulaGratisNaFirme !== '' ? parseInt(b.pulaGratisNaFirme, 10) : 0,
				status: b.status || 'DRAFT',
			},
		})

		return NextResponse.json(event, { status: 201 })
	} catch (error) {
		console.error('Błąd tworzenia wydarzenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

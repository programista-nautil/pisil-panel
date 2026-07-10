import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { normalizeNip } from '@/lib/nip'
import { computeRegistration } from '@/lib/services/eventPricing'

// Lista zgłoszeń danego wydarzenia.
export async function GET(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const registrations = await prisma.eventRegistration.findMany({
			where: { eventId: id },
			orderBy: { createdAt: 'asc' },
		})
		return NextResponse.json(registrations, { status: 200 })
	} catch (error) {
		console.error('Błąd pobierania zgłoszeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Ręczne dopisanie uczestnika przez admina. Domyślnie liczymy cenę,
// ale admin może nadpisać tier/kwotę/statusy.
export async function POST(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const b = await request.json()

		const firstName = (b.firstName || '').trim()
		const lastName = (b.lastName || '').trim()
		const email = (b.email || '').trim()
		const firmaNazwa = (b.firmaNazwa || '').trim()
		const nip = normalizeNip(b.firmaNip || '')

		if (!firstName || !lastName || !firmaNazwa) {
			return NextResponse.json({ message: 'Imię, nazwisko i nazwa firmy są wymagane.' }, { status: 400 })
		}

		const event = await prisma.event.findUnique({ where: { id } })
		if (!event) return NextResponse.json({ message: 'Nie znaleziono wydarzenia' }, { status: 404 })

		// Automatyczne wyliczenie (jeśli admin nie nadpisał tier)
		let computed = { tier: 'NIECZLONEK', kwota: 0, statusPlatnosci: 'OCZEKUJE' }
		if (nip) {
			const memberRows = await prisma.$queryRaw`
				SELECT id FROM "Member"
				WHERE regexp_replace(COALESCE(nip, ''), '[^0-9]', '', 'g') = ${nip}
				  AND "deletedAt" IS NULL
				LIMIT 1
			`
			const isMember = memberRows.length > 0
			const gratisUsed = await prisma.eventRegistration.count({
				where: { eventId: id, firmaNip: nip, tier: 'CZLONEK_GRATIS', statusRejestracji: { not: 'ANULOWANA' } },
			})
			computed = computeRegistration(event, { isMember, gratisUsed })
		}

		const registration = await prisma.eventRegistration.create({
			data: {
				eventId: id,
				firstName,
				lastName,
				email: email || '',
				firmaNazwa,
				firmaNip: nip,
				firmaAdres: b.firmaAdres || null,
				tier: b.tier || computed.tier,
				kwota: b.kwota != null && b.kwota !== '' ? b.kwota : computed.kwota,
				statusPlatnosci: b.statusPlatnosci || computed.statusPlatnosci,
				statusRejestracji: b.statusRejestracji || 'POTWIERDZONA',
				zgodaRodo: true,
				zgodaRodoAt: new Date(),
				zrodlo: 'ADMIN',
				notatka: b.notatka || null,
			},
		})

		return NextResponse.json(registration, { status: 201 })
	} catch (error) {
		console.error('Błąd dopisywania uczestnika:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

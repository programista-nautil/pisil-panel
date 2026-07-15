import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { normalizeNip } from '@/lib/nip'

// Aktualizacja zgłoszenia — pełna edycja z panelu: dane uczestnika i firmy, poziom cenowy i kwota
// (oferta poz. 3: „weryfikację zawsze mogą Państwo skorygować ręcznie”), statusy, zgoda RODO,
// obecność oraz znacznik „sprawdzone”. Każde pole ustawiane tylko wtedy, gdy przyszło w żądaniu.
export async function PATCH(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { rid } = await params
		const b = await request.json()

		const obecne = await prisma.eventRegistration.findUnique({ where: { id: rid } })
		if (!obecne) return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })

		const data = {}

		// --- dane uczestnika i firmy ---
		if (b.firstName !== undefined) data.firstName = (b.firstName || '').trim()
		if (b.lastName !== undefined) data.lastName = (b.lastName || '').trim()
		if (b.email !== undefined) data.email = (b.email || '').trim()
		if (b.firmaNazwa !== undefined) data.firmaNazwa = (b.firmaNazwa || '').trim()
		if (b.firmaAdres !== undefined) data.firmaAdres = b.firmaAdres || null
		if (b.notatka !== undefined) data.notatka = b.notatka || null

		// NIP decyduje o rozpoznaniu członka — po jego zmianie dopasowanie liczymy od nowa,
		// inaczej zgłoszenie zostałoby przy członku, który już nie ma z nim nic wspólnego.
		if (b.firmaNip !== undefined) {
			const nip = normalizeNip(b.firmaNip || '')
			data.firmaNip = nip
			if (nip !== obecne.firmaNip) {
				const rows = nip
					? await prisma.$queryRaw`
						SELECT id FROM "Member"
						WHERE regexp_replace(COALESCE(nip, ''), '[^0-9]', '', 'g') = ${nip}
						  AND "deletedAt" IS NULL
						LIMIT 1
					`
					: []
				data.matchedMemberId = rows.length > 0 ? rows[0].id : null
			}
		}

		// --- poziom cenowy, kwota, statusy ---
		if (b.tier !== undefined) data.tier = b.tier
		if (b.kwota !== undefined) data.kwota = b.kwota != null && b.kwota !== '' ? b.kwota : 0
		if (b.statusRejestracji !== undefined) data.statusRejestracji = b.statusRejestracji

		if (b.statusPlatnosci !== undefined) {
			data.statusPlatnosci = b.statusPlatnosci
			// Data wpłaty prowadzi się sama: stawiamy przy przejściu na OPŁACONE (nie nadpisując
			// istniejącej), zdejmujemy przy cofnięciu — żeby nie została data po statusie, którego już nie ma.
			if (b.statusPlatnosci === 'OPLACONE') {
				if (!obecne.oplaconeAt) data.oplaconeAt = new Date()
			} else {
				data.oplaconeAt = null
			}
		}
		// Jawna data wpłaty ma pierwszeństwo (przelew mógł wpłynąć innego dnia niż klik w panelu).
		if (b.oplaconeAt !== undefined) data.oplaconeAt = b.oplaconeAt ? new Date(b.oplaconeAt) : null

		// --- zgoda RODO i obecność ---
		if (b.zgodaRodo !== undefined) {
			const zgoda = b.zgodaRodo === true || b.zgodaRodo === 'true'
			data.zgodaRodo = zgoda
			// Nie przesuwamy znacznika czasu istniejącej zgody — ma mówić, KIEDY jej udzielono.
			data.zgodaRodoAt = zgoda ? obecne.zgodaRodoAt || new Date() : null
		}
		if (b.obecny !== undefined) {
			data.obecny = b.obecny === null || b.obecny === '' ? null : Boolean(b.obecny)
		}

		// --- znacznik „sprawdzone” ---
		if (b.zweryfikowane !== undefined) {
			const zw = b.zweryfikowane === true || b.zweryfikowane === 'true'
			data.zweryfikowane = zw
			data.zweryfikowaneAt = zw ? new Date() : null
		}

		const registration = await prisma.eventRegistration.update({ where: { id: rid }, data })
		return NextResponse.json(registration, { status: 200 })
	} catch (error) {
		console.error('Błąd aktualizacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Usunięcie zgłoszenia.
export async function DELETE(request, { params }) {
	const session = await auth()
	if (!session) return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { rid } = await params
		await prisma.eventRegistration.delete({ where: { id: rid } })
		return NextResponse.json({ message: 'Usunięto zgłoszenie' }, { status: 200 })
	} catch (error) {
		console.error('Błąd usuwania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

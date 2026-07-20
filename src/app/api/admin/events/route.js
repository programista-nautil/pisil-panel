import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { slugify } from '@/lib/utils'
import { reminderDue, waitlistNeedsInfo } from '@/lib/events'

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
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		// Flagi „coś czeka na wysyłkę" liczymy tu, a nie w przeglądarce, żeby lista nie musiała pobierać
		// zgłoszeń każdego wydarzenia z osobna. Reguły są WSPÓLNE z widokiem zgłoszeń (src/lib/events.js) —
		// bez tego dwa miejsca prędzej czy później zaczęłyby podpowiadać co innego.
		const [events, grupy, kampanie] = await Promise.all([
			prisma.event.findMany({
				orderBy: [{ startAt: 'desc' }],
				include: { _count: { select: { registrations: true } }, sections: true },
			}),
			prisma.eventRegistration.groupBy({
				by: ['eventId', 'statusRejestracji'],
				_count: { _all: true },
			}),
			prisma.eventMailing.findMany({ select: { eventId: true, template: true } }),
		])

		const licznik = {}
		for (const g of grupy) {
			const wpis = (licznik[g.eventId] ||= { confirmed: 0, waitlist: 0 })
			if (g.statusRejestracji === 'POTWIERDZONA') wpis.confirmed = g._count._all
			if (g.statusRejestracji === 'LISTA_REZERWOWA') wpis.waitlist = g._count._all
		}
		const szablony = {}
		for (const k of kampanie) {
			if (k.template) (szablony[k.eventId] ||= []).push(k.template)
		}

		const zFlagami = events.map(e => {
			const dane = {
				confirmed: licznik[e.id]?.confirmed || 0,
				waitlist: licznik[e.id]?.waitlist || 0,
				sentTemplates: szablony[e.id] || [],
			}
			return {
				...e,
				doZrobienia: {
					przypomnienie: reminderDue(e, dane),
					rezerwowa: waitlistNeedsInfo(e, dane),
				},
			}
		})

		return NextResponse.json(zFlagami, { status: 200 })
	} catch (error) {
		console.error('Błąd pobierania wydarzeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

// Utworzenie nowego wydarzenia.
export async function POST(request) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

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

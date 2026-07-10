import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { serializePublicEvent } from '@/lib/events'

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Lista opublikowanych wydarzeń (dla strony podglądu / WordPress).
export async function GET() {
	try {
		const events = await prisma.event.findMany({
			where: { status: 'PUBLISHED' },
			orderBy: { startAt: 'asc' },
		})

		// Liczba potwierdzonych zgłoszeń per wydarzenie (do wolnych miejsc)
		const counts = await prisma.eventRegistration.groupBy({
			by: ['eventId'],
			where: {
				statusRejestracji: 'POTWIERDZONA',
				eventId: { in: events.map(e => e.id) },
			},
			_count: { _all: true },
		})
		const countMap = Object.fromEntries(counts.map(c => [c.eventId, c._count._all]))

		const payload = events.map(e => serializePublicEvent(e, countMap[e.id] || 0))

		return new NextResponse(JSON.stringify(payload), {
			status: 200,
			headers: { 'Content-Type': 'application/json', ...CORS },
		})
	} catch (error) {
		console.error('Błąd API listy wydarzeń:', error)
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS })
}

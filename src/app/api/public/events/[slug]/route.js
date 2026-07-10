import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { serializePublicEvent } from '@/lib/events'

const CORS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

// Szczegóły pojedynczego opublikowanego wydarzenia.
export async function GET(request, { params }) {
	try {
		const { slug } = await params

		const event = await prisma.event.findUnique({ where: { slug } })
		if (!event || event.status !== 'PUBLISHED') {
			return NextResponse.json({ error: 'Nie znaleziono wydarzenia' }, { status: 404, headers: CORS })
		}

		const confirmedCount = await prisma.eventRegistration.count({
			where: { eventId: event.id, statusRejestracji: 'POTWIERDZONA' },
		})

		return new NextResponse(JSON.stringify(serializePublicEvent(event, confirmedCount)), {
			status: 200,
			headers: { 'Content-Type': 'application/json', ...CORS },
		})
	} catch (error) {
		console.error('Błąd API szczegółów wydarzenia:', error)
		return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
	}
}

export async function OPTIONS() {
	return new NextResponse(null, { status: 204, headers: CORS })
}

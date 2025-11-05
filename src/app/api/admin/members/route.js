import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'

export async function GET(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const page = parseInt(searchParams.get('page') || '1')
	const limit = parseInt(searchParams.get('limit') || '50')
	const skip = (page - 1) * limit

	try {
		const [members, total] = await prisma.$transaction([
			prisma.member.findMany({
				skip: skip,
				take: limit,
				orderBy: {
					company: 'asc',
				},
			}),
			prisma.member.count(),
		])

		return NextResponse.json({
			members,
			totalMembers: total,
			totalPages: Math.ceil(total / limit),
			currentPage: page,
		})
	} catch (error) {
		console.error('Błąd podczas pobierania członków:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

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
	const query = searchParams.get('search') || ''
	const skip = (page - 1) * limit

	const isNumericQuery = !isNaN(Number(query)) && query.length > 0

	const whereClause = query
		? {
				OR: [
					{ company: { contains: query, mode: 'insensitive' } },
					{ name: { contains: query, mode: 'insensitive' } },
					{ email: { contains: query, mode: 'insensitive' } },
					{ phones: { contains: query, mode: 'insensitive' } },
					{ address: { contains: query, mode: 'insensitive' } },
					...(isNumericQuery ? [{ memberNumber: { equals: parseInt(query) } }] : []),
				],
		  }
		: {}

	try {
		const [members, total] = await prisma.$transaction([
			prisma.member.findMany({
				where: whereClause,
				skip: skip,
				take: limit,
				orderBy: {
					company: 'asc',
				},
				select: {
					id: true,
					email: true,
					name: true,
					company: true,
					createdAt: true,
					memberNumber: true,
					phones: true,
					address: true,
				},
			}),
			prisma.member.count({
				where: whereClause,
			}),
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

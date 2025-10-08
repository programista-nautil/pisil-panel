import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { processAcceptance } from '@/lib/services/acceptanceService'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	const { acceptanceDate } = await request.json()

	try {
		const submission = await prisma.submission.findUnique({ where: { id } })
		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const updatedSubmissionWithAttachments = await processAcceptance(submission, acceptanceDate)

		return NextResponse.json(updatedSubmissionWithAttachments, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas akceptacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

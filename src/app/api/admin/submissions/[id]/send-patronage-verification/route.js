import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'

const textToHtml = text => {
	if (!text) return ''
	return text
		.split('\n\n')
		.map(paragraph => `<p style="margin-bottom: 1em;">${paragraph.replace(/\n/g, '<br>')}</p>`)
		.join('')
}

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	const { emailBody } = await request.json()

	try {
		const submission = await prisma.submission.findUnique({ where: { id } })
		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		})

		await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: submission.email,
			subject: `Informacja ws. wniosku o patronat: ${submission.companyName}`,
			html: textToHtml(emailBody),
		})

		return NextResponse.json({ message: 'Email weryfikacyjny został wysłany' })
	} catch (error) {
		console.error('Błąd podczas wysyłania emaila weryfikacyjnego dla patronatu:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

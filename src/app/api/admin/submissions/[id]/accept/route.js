import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { Status } from '@prisma/client'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params
	const data = await request.formData()
	const attachments = data.getAll('attachments[]') // Odczytujemy tablicę plików

	try {
		const submission = await prisma.submission.findUnique({ where: { id } })
		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// Krok 1: Zaktualizuj status w bazie danych
		await prisma.submission.update({
			where: { id },
			data: { status: Status.ACCEPTED },
		})

		// Krok 2: Przygotuj załączniki dla Nodemailer
		const nodemailerAttachments = await Promise.all(
			attachments.map(async file => {
				const bytes = await file.arrayBuffer()
				const buffer = Buffer.from(bytes)
				return {
					filename: file.name,
					content: buffer,
				}
			})
		)

		// Krok 3: Wyślij e-mail
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		const mailOptions = {
			from: process.env.SMTP_USER,
			to: submission.email,
			subject: `Witamy w PISiL! Państwa członkostwo zostało przyjęte.`,
			html: `
        <h2>Szanowni Państwo,</h2>
        <p>
          Z przyjemnością informujemy, że Rada Izby PISiL pozytywnie rozpatrzyła Państwa deklarację członkowską dla firmy <strong>${submission.companyName}</strong>.
        </p>
        <p>
          Witamy w gronie członków Polskiej Izby Specjalistów IT i Logistyki!
        </p>
        <p>W załącznikach przesyłamy stosowne dokumenty powitalne.</p>
        <p>Z pozdrowieniami,<br>Zespół PISiL</p>
      `,
			attachments: nodemailerAttachments, // Dodajemy wszystkie załączniki
		}

		await transporter.sendMail(mailOptions)

		return NextResponse.json({ message: 'Email akceptacyjny został wysłany' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas akceptacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

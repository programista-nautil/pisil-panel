import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { Status } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'

const STATIC_ATTACHMENTS = [
	'34.pdf',
	'44.pdf',
	'219 A.pdf',
	'Biuletyn_2012_11-12.pdf',
	'FIATA MR.pdf',
	'FIATA zakaz FCR steel products.pdf',
	'regulam ekspert.pdf',
	'SA regulamin-pol.pdf',
	'ubezp..pdf',
]

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params

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
			STATIC_ATTACHMENTS.map(async filename => {
				const filePath = path.join(process.cwd(), 'private', 'acceptance-documents', filename)
				const buffer = await fs.readFile(filePath)
				return {
					filename,
					content: buffer,
					contentType: 'application/pdf',
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

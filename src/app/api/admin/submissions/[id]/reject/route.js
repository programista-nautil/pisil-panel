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

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		// Krok 1: Zaktualizuj status w bazie danych na ODRZUCONY
		await prisma.submission.update({
			where: { id },
			data: { status: Status.REJECTED },
		})

		// Krok 2: Wyślij e-mail z powiadomieniem
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		const mailOptions = {
			from: process.env.SMTP_USER,
			to: submission.email,
			subject: `Informacja dot. deklaracji członkowskiej PISiL`,
			html: `
                <p>Szanowni Państwo,</p>
                <p>Z przykrością informujemy, że Państwa wniosek o członkostwo w Polskiej Izbie Spedycji i Logistyki uchwałą Rady PISiL został odrzucony. W celu uzyskania dalszych informacji prosimy o kontakt z biurem Izby.</p>
                <p>Z poważaniem,<br>Biuro PISiL</p>
            `,
		}

		await transporter.sendMail(mailOptions)

		return NextResponse.json({ message: 'Email o odrzuceniu został wysłany' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas odrzucania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

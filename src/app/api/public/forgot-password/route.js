import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request) {
	try {
		const { email } = await request.json()
		if (!email) {
			return NextResponse.json({ message: 'Email jest wymagany.' }, { status: 400 })
		}

		const member = await prisma.member.findUnique({
			where: { email },
		})

		if (!member) {
			return NextResponse.json({ message: 'Link do resetu został wysłany.' })
		}

		const token = crypto.randomBytes(32).toString('hex')
		const expires = new Date(Date.now() + 3600000) // Ważny 1 godzinę

		await prisma.member.update({
			where: { email },
			data: {
				passwordResetToken: token,
				passwordResetExpires: expires,
			},
		})

		const resetUrl = `${process.env.NEXTAUTH_URL}/zmiana-hasla?token=${token}`

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: email,
			subject: 'Reset hasła do Panelu Członka PISiL',
			html: `
                <p>Otrzymaliśmy prośbę o reset hasła do Twojego konta.</p>
                <p>Kliknij w poniższy link, aby ustawić nowe hasło:</p>
                <a href="${resetUrl}">Resetuj hasło</a>
                <p>Link jest ważny przez 1 godzinę.</p>
                <p>Jeśli nie prosiłeś o reset hasła, zignoruj tę wiadomość.</p>
            `,
		})

		return NextResponse.json({ message: 'Link do resetu został wysłany.' })
	} catch (error) {
		console.error('Błąd przy resecie hasła:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

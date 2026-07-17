import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import crypto from 'crypto'
import { sendToOne } from '@/lib/mailer'

export async function POST(request) {
	try {
		const { email } = await request.json()
		if (!email) {
			return NextResponse.json({ message: 'Email jest wymagany.' }, { status: 400 })
		}

		const member = await prisma.member.findUnique({
			where: { email },
		})

		// Były członek (soft-deleted) traktowany jak brak konta — nie wysyłamy linku
		if (!member || member.deletedAt) {
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

		await sendToOne({
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

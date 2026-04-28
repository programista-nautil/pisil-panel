import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
const PASSWORD_ERROR_MESSAGE =
	'Hasło musi mieć minimum 8 znaków, zawierać 1 dużą literę, 1 małą literę, 1 cyfrę i 1 znak specjalny.'

export async function POST(request) {
	try {
		const { token, password } = await request.json()
		if (!token || !password) {
			return NextResponse.json({ message: 'Brak tokenu lub hasła.' }, { status: 400 })
		}

		if (!PASSWORD_REGEX.test(password)) {
			return NextResponse.json({ message: PASSWORD_ERROR_MESSAGE }, { status: 400 })
		}

		// 1. Znajdź członka po tokenie, który jest ważny (nie wygasł)
		const member = await prisma.member.findFirst({
			where: {
				passwordResetToken: token,
				passwordResetExpires: {
					gt: new Date(),
				},
			},
		})

		if (!member) {
			return NextResponse.json({ message: 'Token jest nieprawidłowy lub wygasł.' }, { status: 400 })
		}

		// 2. Zahaszuj nowe hasło
		const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS)

		// 3. Zaktualizuj hasło i wyczyść tokeny
		await prisma.member.update({
			where: { id: member.id },
			data: {
				password: hashedPassword,
				passwordResetToken: null,
				passwordResetExpires: null,
			},
		})

		return NextResponse.json({ message: 'Hasło zostało pomyślnie zaktualizowane.' })
	} catch (error) {
		console.error('Błąd przy finalizacji resetu hasła:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

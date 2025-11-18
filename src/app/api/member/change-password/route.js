import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import bcrypt from 'bcrypt'

const SALT_ROUNDS = 10
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/

export async function POST(request) {
	const session = await auth()
	if (!session?.user || session.user.role !== 'member') {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const { currentPassword, newPassword } = await request.json()

		if (!currentPassword || !newPassword) {
			return NextResponse.json({ message: 'Wypełnij wszystkie pola.' }, { status: 400 })
		}

		if (!PASSWORD_REGEX.test(newPassword)) {
			return NextResponse.json(
				{ message: 'Nowe hasło musi mieć min. 8 znaków, 1 dużą literę, 1 małą literę, 1 cyfrę i 1 znak specjalny.' },
				{ status: 400 }
			)
		}

		const memberId = session.user.id

		// 1. Pobierz aktualne dane członka (potrzebujemy hasha hasła)
		const member = await prisma.member.findUnique({
			where: { id: memberId },
		})

		if (!member) {
			return NextResponse.json({ message: 'Nie znaleziono użytkownika.' }, { status: 404 })
		}

		// 2. Sprawdź, czy OBECNE hasło jest poprawne
		const isMatch = await bcrypt.compare(currentPassword, member.password)
		if (!isMatch) {
			return NextResponse.json({ message: 'Obecne hasło jest nieprawidłowe.' }, { status: 400 })
		}

		// 3. Zahaszuj i zapisz NOWE hasło
		const newHashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS)

		await prisma.member.update({
			where: { id: memberId },
			data: {
				password: newHashedPassword,
			},
		})

		return NextResponse.json({ message: 'Hasło zostało pomyślnie zmienione.' }, { status: 200 })
	} catch (error) {
		console.error('Błąd zmiany hasła:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

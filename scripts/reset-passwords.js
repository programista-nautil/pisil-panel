const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

async function main() {
	const DEFAULT_PASSWORD = '2015pisil'
	const SALT_ROUNDS = 10

	console.log(`🔒 Rozpoczynam resetowanie haseł na: ${DEFAULT_PASSWORD}`)

	// 1. Zahaszuj hasło
	const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

	// 2. Zaktualizuj wszystkich członków
	const result = await prisma.member.updateMany({
		where: {}, // Wszyscy
		data: {
			password: hashedPassword,
			mustChangePassword: true, // <--- Wymuś zmianę
		},
	})

	console.log(`✅ Zaktualizowano ${result.count} użytkowników.`)
}

main()
	.catch(e => console.error(e))
	.finally(async () => await prisma.$disconnect())

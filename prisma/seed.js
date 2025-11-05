const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const prisma = new PrismaClient()

// Definiujemy "siłę" hashowania
const SALT_ROUNDS = 10

async function main() {
	console.log('Rozpoczynam seedowanie danych członków...')

	// 1. Haszujemy jedno wspólne hasło dla wszystkich testowych kont
	// (W prawdziwym świecie każde hasło byłoby inne)
	const testPassword = 'password123'
	const hashedPassword = await bcrypt.hash(testPassword, SALT_ROUNDS)

	console.log(`Hasło dla wszystkich kont testowych: ${testPassword}`)

	// 2. Definiujemy 5 przykładowych członków
	const membersData = [
		{
			email: 'firma.a@example.com',
			company: 'Firma Testowa A Sp. z o.o.',
			name: 'Jan Kowalski',
		},
		{
			email: 'logistics.plus@example.com',
			company: 'Logistics Plus',
			name: 'Anna Nowak',
		},
		{
			email: 'spedycja.b@example.com',
			company: 'Spedycja B S.A.',
			name: 'Piotr Wiśniewski',
		},
		{
			email: 'transport.c@example.com',
			company: 'Transport Ciężki C',
			name: 'Maria Dąbrowska',
		},
		{
			email: 'global.log@example.com',
			company: 'Global E-Logistyka',
			name: 'Krzysztof Zieliński',
		},
		{
			email: 'trans.express@example.com',
			company: 'Trans Express Sp. z o.o.',
			name: 'Tomasz Lewandowski',
		},
		{
			email: 'cargo.fast@example.com',
			company: 'Cargo Fast International',
			name: 'Katarzyna Wójcik',
		},
		{
			email: 'euro.transport@example.com',
			company: 'Euro Transport Poland',
			name: 'Marek Kamiński',
		},
		{
			email: 'speedy.logistics@example.com',
			company: 'Speedy Logistics S.A.',
			name: 'Magdalena Krawczyk',
		},
		{
			email: 'rapid.cargo@example.com',
			company: 'Rapid Cargo Solutions',
			name: 'Andrzej Kaczmarek',
		},
		{
			email: 'mega.trans@example.com',
			company: 'Mega Trans Group',
			name: 'Joanna Piotrowski',
		},
		{
			email: 'inter.freight@example.com',
			company: 'Inter Freight Sp. z o.o.',
			name: 'Paweł Grabowski',
		},
		{
			email: 'pro.logistics@example.com',
			company: 'Pro Logistics Poland',
			name: 'Beata Zalewski',
		},
		{
			email: 'smart.cargo@example.com',
			company: 'Smart Cargo Systems',
			name: 'Rafał Adamczyk',
		},
		{
			email: 'premium.transport@example.com',
			company: 'Premium Transport S.A.',
			name: 'Ewa Jaworska',
		},
		{
			email: 'quick.delivery@example.com',
			company: 'Quick Delivery Services',
			name: 'Grzegorz Pawlak',
		},
		{
			email: 'total.logistics@example.com',
			company: 'Total Logistics Sp. z o.o.',
			name: 'Monika Michalska',
		},
		{
			email: 'safe.transport@example.com',
			company: 'Safe Transport Poland',
			name: 'Jacek Wróbel',
		},
		{
			email: 'blue.logistics@example.com',
			company: 'Blue Logistics Network',
			name: 'Agnieszka Mazur',
		},
		{
			email: 'first.cargo@example.com',
			company: 'First Cargo Sp. z o.o.',
			name: 'Łukasz Jankowski',
		},
	]

	// 3. Wstawiamy dane do bazy
	// Używamy `upsert`, aby skrypt można było bezpiecznie uruchamiać wielokrotnie
	// bez tworzenia duplikatów (na podstawie unikalnego pola 'email').
	for (const member of membersData) {
		const upsertedMember = await prisma.member.upsert({
			where: { email: member.email },
			update: {}, // Jeśli członek już istnieje, nic nie rób
			create: {
				...member,
				password: hashedPassword,
			},
		})
		console.log(`Stworzono lub zaktualizowano członka: ${upsertedMember.email}`)
	}

	console.log('Seedowanie zakończone.')
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

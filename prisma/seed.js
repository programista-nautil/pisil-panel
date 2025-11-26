const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()

const MEMBERS_DATA = [
	{
		company: 'Allcom Sp. z o.o.',
		name: 'Łukasz Pielesiek',
		email: 'l.pielesiek@allcom.gdynia.pl',
		phones: null, // "Brak numeru"
	},
	{
		company: 'ECS Eurocargo Sp.  z o.o.',
		name: 'Aleksander Kita',
		email: 'aleksander.kita@ecs-eurocargo.pl',
		phones: '509283461',
	},
	{
		company: 'FM Polska Sp. z o.o.',
		name: 'Alexandre Amine Soufiani',
		email: 'llasa@fmlogistic.com',
		phones: '468570260, 516010355',
	},
	{
		company: 'Mandersloot Polska Transport Sp. z o.o.',
		name: 'Ronald Mandersloot',
		email: 'infopl@mandersloot.eu',
		phones: '61 8100900',
	},
	{
		company: 'Poltrans Sochaczew Sp. z o.o.',
		name: 'Sebastian Przybylski',
		email: 'transport@poltrans.net',
		phones: '888110177',
	},
]

async function main() {
	console.log('🌱 Rozpoczynam seedowanie bazy danych...')

	// 1. Ustawiamy hasło tymczasowe dla wszystkich importowanych członków
	// Użytkownik będzie mógł je zresetować przez "Zapomniałem hasła"
	const TEMPORARY_PASSWORD = 'PisilMember2025!'
	const hashedPassword = await bcrypt.hash(TEMPORARY_PASSWORD, 10)

	// 2. Znajdujemy najwyższy dotychczasowy numer członkowski, żeby zachować ciągłość
	const maxMemberResult = await prisma.member.aggregate({
		_max: {
			memberNumber: true,
		},
	})
	let currentMaxNumber = maxMemberResult._max.memberNumber || 0

	console.log(`📈 Obecny najwyższy numer członkowski: ${currentMaxNumber}`)

	for (const memberData of MEMBERS_DATA) {
		// Sprawdzamy, czy członek już istnieje
		const existingMember = await prisma.member.findUnique({
			where: { email: memberData.email },
		})

		if (existingMember) {
			console.log(`🔄 Aktualizacja istniejącego członka: ${memberData.company}`)
			await prisma.member.update({
				where: { email: memberData.email },
				data: {
					company: memberData.company,
					name: memberData.name,
					phones: memberData.phones,
					// Nie aktualizujemy hasła ani numeru, jeśli już istnieje
				},
			})
		} else {
			currentMaxNumber++
			console.log(`➕ Dodawanie nowego członka: ${memberData.company} (Nr: ${currentMaxNumber})`)
			await prisma.member.create({
				data: {
					email: memberData.email,
					password: hashedPassword,
					company: memberData.company,
					name: memberData.name,
					phones: memberData.phones,
					memberNumber: currentMaxNumber,
				},
			})
		}
	}

	console.log('✅ Seedowanie zakończone sukcesem.')
}

main()
	.then(async () => {
		await prisma.$disconnect()
	})
	.catch(async e => {
		console.error(e)
		await prisma.$disconnect()
		process.exit(1)
	})

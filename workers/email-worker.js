const { Worker } = require('bullmq')
const IORedis = require('ioredis')
const nodemailer = require('nodemailer')
const { PrismaClient } = require('@prisma/client')
const path = require('path')

// Ładujemy zmienne środowiskowe z pliku .env w głównym katalogu
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const prisma = new PrismaClient()

const connection = new IORedis({
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT || 6379,
	maxRetriesPerRequest: null,
})

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

console.log('👷 Worker wystartował i czeka na zadania...')

const worker = new Worker(
	'email-queue',
	async job => {
		if (job.name === 'notify-members') {
			const { companyName } = job.data
			console.log(`🚀 [Job ${job.id}] Rozpoczynam kampanię mailową dla: ${companyName}`)

			try {
				// 1. Pobierz maile członków (tylko te istniejące)
				const members = await prisma.member.findMany({
					where: {
						NOT: {
							email: { startsWith: 'brak_maila_' },
						},
					},
					select: { email: true },
				})
				console.log(`📧 Znaleziono ${members.length} adresatów.`)

				if (members.length === 0) return

				const transporter = nodemailer.createTransport({
					host: 'smtp.gmail.com',
					port: 587,
					secure: false,
					pool: true, // WAŻNE: Poolowanie połączeń
					maxConnections: 3, // Ostrożnie na devie
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				})

				// 2. Konfiguracja "bąbelkowania" (małe partie dla testu)
				const BATCH_SIZE = 5 // Na devie wyślijmy po 5 maili
				const DELAY_MS = 2000 // 2 sekundy przerwy

				let sentCount = 0

				for (let i = 0; i < 3; i += BATCH_SIZE) {
					const batch = members.slice(i, i + BATCH_SIZE)

					console.log(`📦 Wysyłam partię ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} maili)...`)

					await Promise.all(
						batch.map(async member => {
							try {
								await transporter.sendMail({
									from: process.env.SMTP_USER,
									//to: member.email, // <--- NA PRODUKCJI
									to: 'programista@nautil.pl', // <--- NA DEVIE (DLA BEZPIECZEŃSTWA)
									subject: `[TEST] Nowy kandydat: ${companyName}`,
									html: `<p>Informacja o kandydacie: ${companyName}</p>`,
								})

								await sleep(100)
								sentCount++
							} catch (err) {
								console.error(`❌ Błąd wysyłki do ${member.email}:`, err.message)
							}
						})
					)

					// Czekaj przed następną partią
					if (i + BATCH_SIZE < members.length) {
						console.log(`⏳ Czekam ${DELAY_MS}ms...`)
						await sleep(DELAY_MS)
					}
				}

				console.log(`✅ Zakończono zadanie. Wysłano ${sentCount} maili.`)
			} catch (error) {
				console.error('Błąd krytyczny w workerze:', error)
				throw error // Rzuć błąd, żeby BullMQ wiedział, że zadanie się nie udało
			}
		}
	},
	{ connection }
)

// Obsługa błędów workera
worker.on('failed', (job, err) => {
	console.error(`🔥 Zadanie ${job.id} nie powiodło się: ${err.message}`)
})

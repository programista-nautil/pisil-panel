const { Worker } = require('bullmq')
const IORedis = require('ioredis')
const nodemailer = require('nodemailer')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')

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
				const listPath = path.join(__dirname, '../src/config/mailingList.json')

				if (!fs.existsSync(listPath)) {
					throw new Error(`Nie znaleziono pliku listy mailingowej: ${listPath}`)
				}

				const rawData = fs.readFileSync(listPath, 'utf-8')
				const emails = JSON.parse(rawData)

				const recipients = emails.filter(email => email && email.includes('@'))

				console.log(`📧 Wczytano listę z pliku JSON. Znaleziono ${recipients.length} adresatów.`)

				if (recipients.length === 0) {
					console.log('⚠️ Lista adresatów jest pusta. Kończę zadanie.')
					return
				}

				const transporter = nodemailer.createTransport({
					host: 'smtp.gmail.com',
					port: 587,
					secure: false,
					pool: true, // WAŻNE: Poolowanie połączeń
					maxConnections: 3,
					maxMessages: 100,
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				})

				// 2. Konfiguracja "bąbelkowania" (małe partie dla testu)
				const BATCH_SIZE = 10 // Wyślij po 10 maili
				const DELAY_MS = 3000 // 3 sekundy przerwy

				let sentCount = 0

				for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
					const batch = recipients.slice(i, i + BATCH_SIZE)

					console.log(`📦 Wysyłam partię ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} maili)...`)

					await Promise.all(
						batch.map(async emailAddress => {
							try {
								await transporter.sendMail({
									from: process.env.SMTP_USER,
									// to: emailAddress, // <--- NA PRODUKCJI
									to: 'programista@nautil.pl', // <--- NA DEVIE (DLA BEZPIECZEŃSTWA)
									subject: `Nowy kandydat na członka PISiL: ${companyName}`,
									html: `
										<p>Szanowni Państwo,</p>
										<p>Informujemy, że wpłynęła deklaracja członkowska od firmy: <strong>${companyName}</strong>.</p>
										<p>Zgłoszenie zostało wstępnie zweryfikowane przez Biuro PISiL.</p>
										<p>Pozdrawiamy,<br>Biuro PISiL</p>
									`,
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

				console.log(`✅ Zakończono zadanie. Wysłano ${sentCount} z ${recipients.length} maili.`)
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

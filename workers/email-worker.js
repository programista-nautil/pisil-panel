const { Worker } = require('bullmq')
const IORedis = require('ioredis')
const nodemailer = require('nodemailer')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')
const { Storage } = require('@google-cloud/storage')

// Ładujemy zmienne środowiskowe z pliku .env w głównym katalogu
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const storage = new Storage({
	credentials: JSON.parse(process.env.GCS_CREDENTIALS),
})
const bucketName = process.env.GCS_BUCKET_NAME

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
			const { companyName, attachmentGcsPath, attachmentFileName, adminEmail } = job.data
			console.log(`🚀 [Job ${job.id}] Kampania dla: ${companyName}. Raport trafi do: ${adminEmail}`)

			try {
				let attachmentBuffer = null
				if (attachmentGcsPath) {
					console.log(`📥 Pobieram załącznik z GCS: ${attachmentGcsPath}`)
					const cleanPath = attachmentGcsPath.replace(`https://storage.googleapis.com/${bucketName}/`, '')

					const [fileBuffer] = await storage.bucket(bucketName).file(cleanPath).download()
					attachmentBuffer = fileBuffer
					console.log('✅ Załącznik pobrany do pamięci.')
				}

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
					pool: true,
					maxConnections: 5,
					maxMessages: 50,
					rateLimit: 2,
					auth: {
						user: process.env.SMTP_USER,
						pass: process.env.SMTP_PASS,
					},
				})

				// 2. Konfiguracja "bąbelkowania" (małe partie dla testu)
				const BATCH_SIZE = 20 // Wyślij po 10 maili
				const DELAY_MS = 5000 // 3 sekundy przerwy

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
										<p>W załączniku przesyłamy komunikat ze szczegółami zgłoszenia.</p>
										<p>Pozdrawiamy,<br>Biuro PISiL</p>
									`,
									attachments: attachmentBuffer
										? [
												{
													filename: attachmentFileName,
													content: attachmentBuffer,
													contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
												},
										  ]
										: [],
								})

								await sleep(100)
								sentCount++
							} catch (err) {
								console.error(`❌ Błąd wysyłki do ${member.email}:`, err.message)
							}
						})
					)

					// Czekaj przed następną partią
					if (i + BATCH_SIZE < recipients.length) {
						console.log(`⏳ Czekam ${DELAY_MS}ms...`)
						await sleep(DELAY_MS)
					}
				}

				console.log(`✅ Zakończono zadanie. Wysłano ${sentCount} z ${recipients.length} maili.`)

				if (adminEmail) {
					try {
						await transporter.sendMail({
							from: process.env.SMTP_USER,
							to: adminEmail,
							subject: `[RAPORT] Zakończono wysyłkę komunikatu: ${companyName}`,
							html: `
                                <h3>Raport z wysyłki masowej</h3>
                                <p>Zadanie wysyłki komunikatu dotyczącego firmy <strong>${companyName}</strong> zostało zakończone.</p>
                                <ul>
                                    <li>Liczba odbiorców w bazie: <strong>${recipients.length}</strong></li>
                                    <li>Pomyślnie wysłano: <strong>${sentCount}</strong></li>
                                </ul>
                                <p>System PISiL</p>
                            `,
						})
						console.log(`📨 Wysłano raport do admina: ${adminEmail}`)
					} catch (reportError) {
						console.error('Błąd wysyłania raportu do admina:', reportError)
					}
				}
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

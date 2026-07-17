const { Worker } = require('bullmq')
const IORedis = require('ioredis')
// Brama wysyłkowa (CommonJS) — ten sam kod, przez który idą maile z tras Next.js.
// Wymusza „jeden adres w DO" i blokuje wysyłkę poza produkcją bez MAIL_CATCH_ALL/ALLOW_REAL_SMTP.
const { sendToOne } = require('../src/lib/mailer')
const { wyslijMasowoIdempotentnie } = require('../src/lib/mailBatch')
const { PrismaClient } = require('@prisma/client')
const path = require('path')
const fs = require('fs')
const { Storage } = require('@google-cloud/storage')

const prisma = new PrismaClient()

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
			const { companyName, attachmentGcsPath, attachmentFileName, adminEmail, submissionId } = job.data
			console.log(`🚀 [Job ${job.id}] Kampania dla: ${companyName}. Raport trafi do: ${adminEmail}`)

			// Klucz idempotencji: to samo zgłoszenie = ta sama kampania. Fallback na job.id (stały między
			// ponowieniami tego samego zadania) na wypadek braku submissionId.
			const refId = submissionId || `job:${job.id}`
			let totalRecipients = 0
			let sentCount = 0 // w zewnętrznym zakresie — używane też przez awaryjny raport w catch

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

				totalRecipients = recipients.length

				console.log(`📧 Wczytano listę z pliku JSON. Znaleziono ${totalRecipients} adresatów.`)

				if (totalRecipients === 0) {
					console.log('⚠️ Lista adresatów jest pusta. Kończę zadanie.')
					return
				}

				const zalaczniki = attachmentBuffer
					? [
							{
								filename: attachmentFileName,
								content: attachmentBuffer,
								contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							},
						]
					: []

				// Wysyłka masowa: idempotentna (znacznik per odbiorca w bazie) + pacing pod limit Exchange
				// Online (30 wiadomości/min → partie po 25 z przerwą 60 s). Ponowienie zadania NIE wyśle
				// nikomu drugi raz. Logika i testy: src/lib/mailBatch.js.
				const { wyslano, pominieto, bledy } = await wyslijMasowoIdempotentnie(
					{
						scope: 'notify-members',
						refId,
						odbiorcy: recipients,
						budujWiadomosc: emailAddress => ({
							to: emailAddress,
							replyTo: process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL,
							subject: `Nowy kandydat na członka PISiL: ${companyName}`,
							html: `
								<p>Szanowni Państwo,</p>
								<p>Informujemy, że wpłynęła deklaracja członkowska od firmy: <strong>${companyName}</strong>.</p>
								<p>W załączniku przesyłamy komunikat ze szczegółami zgłoszenia.</p>
								<p>Pozdrawiamy,<br>Biuro PISiL</p>
							`,
							attachments: zalaczniki,
						}),
						batchSize: 25,
						delayMs: 60000,
					},
					{ prisma, sendToOne, sleep, logger: console }
				)

				sentCount = wyslano
				console.log(
					`✅ Zakończono zadanie. Wysłano ${wyslano}, pominięto (już wysłane) ${pominieto}, błędów ${bledy.length} z ${totalRecipients}.`
				)

				if (adminEmail) {
					try {
						await sendToOne({
							from: `"PISiL Info" <${process.env.SMTP_USER}>`,
							to: adminEmail,
							subject: `[RAPORT] Zakończono wysyłkę komunikatu: ${companyName}`,
							html: `
                                <h3>Raport z wysyłki masowej</h3>
                                <p>Zadanie wysyłki komunikatu dotyczącego firmy <strong>${companyName}</strong> zostało zakończone.</p>
                                <ul>
                                    <li>Liczba odbiorców w bazie: <strong>${totalRecipients}</strong></li>
                                    <li>Pomyślnie wysłano: <strong>${wyslano}</strong></li>
                                    <li>Pominięto (już wysłane wcześniej): <strong>${pominieto}</strong></li>
                                    <li>Błędy: <strong>${bledy.length}</strong></li>
                                </ul>
                                ${
									bledy.length
										? `<p><strong>Nie dotarło do:</strong></p><ul>${bledy
												.map(b => `<li>${b.email} — ${b.error}</li>`)
												.join('')}</ul><p>Do tych osób można wysłać ponownie ręcznie.</p>`
										: ''
								}
								<p>W załączniku znajduje się kopia wysłanego komunikatu.</p>
                                <p>System PISiL</p>
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
						console.log(`📨 Wysłano raport do admina: ${adminEmail}`)
					} catch (reportError) {
						console.error('Błąd wysyłania raportu do admina:', reportError)
					}
				}
			} catch (error) {
				console.error('Błąd krytyczny w workerze:', error)

				if (adminEmail) {
					try {
						await sendToOne({
							to: adminEmail,
							subject: `[BŁĄD KRYTYCZNY] Niepowodzenie wysyłki komunikatów: ${companyName}`,
							html: `
                                <h3 style="color: red;">Wystąpił błąd podczas wysyłki masowej</h3>
                                <p>Proces został przerwany dla firmy: <strong>${companyName}</strong>.</p>
                                <p><strong>Treść błędu:</strong> ${error.message}</p>
                                <hr>
                                <p>Status w momencie awarii:</p>
                                <ul>
                                    <li>Znaleziono odbiorców: <strong>${totalRecipients}</strong></li>
                                    <li>Zdążono wysłać: <strong>${sentCount}</strong></li>
                                </ul>
                                <p>Skontaktuj się z administratorem IT.</p>
                            `,
						})
						console.log(`📨 Wysłano raport o błędzie do: ${adminEmail}`)
					} catch (emailError) {
						console.error('Nie udało się nawet wysłać maila o błędzie:', emailError)
					}
				}

				throw error
			}
		}
	},
	{
		connection,
		// concurrency 1: zadania idą JEDNO PO DRUGIM, więc dwie kampanie się nie nakładają i łącznie
		// nie przekroczą limitu Exchange. Właściwe dławienie tempa robi pacing partii wewnątrz zadania
		// (mailBatch: 25 maili / 60 s). Limiter poniżej to dodatkowe zabezpieczenie na tempo STARTU zadań.
		concurrency: 1,
		limiter: { max: 25, duration: 60000 },
	},
)

// Obsługa błędów workera
worker.on('failed', (job, err) => {
	console.error(`🔥 Zadanie ${job?.id} nie powiodło się: ${err.message}`)
})

// „stalled" = worker stracił blokadę zadania (restart/OOM/przeciążenie) i wróciło ono do kolejki.
// Jego wystąpienie oznacza, że zadanie może być przetwarzane DRUGI raz — właśnie dlatego wysyłka jest
// idempotentna (znacznik per odbiorca). Logujemy, żeby było widać, że to się dzieje.
worker.on('stalled', jobId => {
	console.warn(`⚠️ Zadanie ${jobId} „stalled" — wróciło do kolejki. Idempotencja chroni przed podwójną wysyłką.`)
})

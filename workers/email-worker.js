const { Worker } = require('bullmq')
const IORedis = require('ioredis')
// Brama wysyłkowa (CommonJS) — ten sam kod, przez który idą maile z tras Next.js.
// Wymusza „jeden adres w DO" i blokuje wysyłkę poza produkcją bez MAIL_CATCH_ALL/ALLOW_REAL_SMTP.
const { sendToOne } = require('../src/lib/mailer')
const { sendBulkIdempotent } = require('../src/lib/mailBatch')
const { textToHtml } = require('../src/lib/eventMailTemplate')
const { SCOPE, targetEmails, missingEmails } = require('../src/lib/services/eventBulkMail')
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

				const attachments = attachmentBuffer
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
				const { sent, skipped, errors } = await sendBulkIdempotent(
					{
						scope: 'notify-members',
						refId,
						recipients: recipients,
						buildMessage: emailAddress => ({
							to: emailAddress,
							replyTo: process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL,
							subject: `Nowy kandydat na członka PISiL: ${companyName}`,
							html: `
								<p>Szanowni Państwo,</p>
								<p>Informujemy, że wpłynęła deklaracja członkowska od firmy: <strong>${companyName}</strong>.</p>
								<p>W załączniku przesyłamy komunikat ze szczegółami zgłoszenia.</p>
								<p>Pozdrawiamy,<br>Biuro PISiL</p>
							`,
							attachments: attachments,
						}),
						batchSize: 25,
						delayMs: 60000,
					},
					{ prisma, sendToOne, sleep, logger: console }
				)

				sentCount = sent
				console.log(
					`✅ Zakończono zadanie. Wysłano ${sent}, pominięto (już wysłane) ${skipped}, błędów ${errors.length} z ${totalRecipients}.`
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
                                    <li>Pomyślnie wysłano: <strong>${sent}</strong></li>
                                    <li>Pominięto (już wysłane wcześniej): <strong>${skipped}</strong></li>
                                    <li>Błędy: <strong>${errors.length}</strong></li>
                                </ul>
                                ${
									errors.length
										? `<p><strong>Nie dotarło do:</strong></p><ul>${errors
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

		// Masowa wysyłka maila do zapisanych na wydarzenie (informacje organizacyjne / link / odwołanie).
		// Treść bierzemy z kampanii EventMailing (ta sama dla wszystkich — WYSIWYG). Idempotencja per
		// odbiorca w MailSendLog (scope "event-bulk", refId = id kampanii). onlyMissing → dosyłka tylko do
		// tych, do których jeszcze nie dotarło (brak wiersza WYSLANY); nieudane (BLAD) najpierw czyścimy.
		if (job.name === 'event-bulk-mail') {
			const { mailingId, onlyMissing, adminEmail } = job.data

			const mailing = await prisma.eventMailing.findUnique({ where: { id: mailingId } })
			if (!mailing) {
				console.log(`ℹ️ [Job ${job.id}] Kampania ${mailingId} nie istnieje (cofnięta?) — nic nie wysyłam.`)
				return
			}

			const event = await prisma.event.findUnique({ where: { id: mailing.eventId }, select: { title: true } })
			const eventTitle = event?.title || '(wydarzenie)'
			console.log(
				`🚀 [Job ${job.id}] Wysyłka do zapisanych — „${eventTitle}", filtr ${mailing.recipientFilter}${onlyMissing ? ', tylko brakujący' : ''}.`
			)

			let recipients
			if (onlyMissing) {
				// Nieudane (BLAD) i zawieszone (W_TRAKCIE — proces zginął w trakcie wysyłki) mają wiersz,
				// więc idempotencja by je pominęła. Kasujemy je, żeby dało się dosłać. Bezpieczne, bo worker
				// ma concurrency 1: żadna inna wysyłka tej kampanii nie leci w tym momencie.
				await prisma.mailSendLog.deleteMany({
					where: { scope: SCOPE, refId: mailingId, status: { in: ['BLAD', 'W_TRAKCIE'] } },
				})
				recipients = await missingEmails(prisma, mailing)
			} else {
				recipients = await targetEmails(prisma, mailing.eventId, mailing.recipientFilter)
			}

			const totalRecipients = recipients.length
			console.log(`📧 Odbiorców: ${totalRecipients}.`)
			if (totalRecipients === 0) {
				console.log('⚠️ Brak odbiorców. Kończę zadanie.')
				return
			}

			const html = textToHtml(mailing.body)
			const replyTo = process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL

			const { sent, skipped, errors } = await sendBulkIdempotent(
				{
					scope: SCOPE,
					refId: mailingId,
					recipients,
					buildMessage: emailAddress => ({ to: emailAddress, replyTo, subject: mailing.subject, html }),
					batchSize: 25,
					delayMs: 60000,
				},
				{ prisma, sendToOne, sleep, logger: console }
			)

			console.log(
				`✅ Zakończono wysyłkę do zapisanych. Wysłano ${sent}, pominięto ${skipped}, błędów ${errors.length} z ${totalRecipients}.`
			)

			if (adminEmail) {
				try {
					await sendToOne({
						to: adminEmail,
						subject: `[RAPORT] Wysyłka do zapisanych: ${eventTitle}`,
						html: `
							<h3>Raport z wysyłki do zapisanych${onlyMissing ? ' (ponowienie do brakujących)' : ''}</h3>
							<p>Wydarzenie: <strong>${eventTitle}</strong></p>
							<p>Temat wiadomości: <strong>${mailing.subject}</strong></p>
							<ul>
								<li>Odbiorców w tej wysyłce (filtr ${mailing.recipientFilter}): <strong>${totalRecipients}</strong></li>
								<li>Pomyślnie wysłano: <strong>${sent}</strong></li>
								<li>Pominięto (już wysłane wcześniej): <strong>${skipped}</strong></li>
								<li>Błędy: <strong>${errors.length}</strong></li>
							</ul>
							${
								errors.length
									? `<p><strong>Nie dotarło do:</strong></p><ul>${errors
											.map(b => `<li>${b.email} — ${b.error}</li>`)
											.join('')}</ul><p>Do tych osób można wysłać ponownie z panelu („ponów do brakujących").</p>`
									: ''
							}
							<p>System PISiL</p>
						`,
					})
					console.log(`📨 Wysłano raport do admina: ${adminEmail}`)
				} catch (reportError) {
					console.error('Błąd wysyłania raportu do admina:', reportError)
				}
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

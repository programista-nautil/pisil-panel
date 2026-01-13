import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import nodemailer from 'nodemailer'
import path from 'path'
import crypto from 'crypto'
import { generateCommunicationDoc } from '@/lib/services/communicationService'
import { processAcceptance } from '@/lib/services/acceptanceService'
import { emailQueue } from '@/lib/queue'

export async function GET() {
	const session = await auth()

	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const submissions = await prisma.submission.findMany({
			orderBy: { createdAt: 'desc' },
			include: { attachments: true },
		})
		return NextResponse.json(submissions)
	} catch (error) {
		console.error('Błąd podczas pobierania zgłoszeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

export async function POST(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const data = await request.formData()

		const mainPdf = data.get('mainPdf')
		const additionalFiles = data.getAll('additionalFiles[]')
		const formType = data.get('formType')
		const companyName = data.get('companyName')
		const email = data.get('email')
		const ceoName = data.get('ceoName')
		const address = data.get('address')
		const phones = data.get('phones')
		const invoiceEmail = data.get('invoiceEmail')
		const notificationEmails = data.get('notificationEmails')

		const acceptanceDate = data.get('acceptanceDate') || new Date().toISOString()

		const initialStatus = data.get('initialStatus') || 'PENDING'
		const shouldSendEmails = data.get('shouldSendEmails') === 'true'

		if (!mainPdf || !formType || !companyName || !email) {
			return NextResponse.json({ message: 'Brakujące wymagane pola.' }, { status: 400 })
		}

		// Przetwarzanie głównego pliku
		const mainPdfBytes = await mainPdf.arrayBuffer()
		const mainPdfBuffer = Buffer.from(mainPdfBytes)
		const originalFilename = sanitizeFilename(mainPdf.name)
		const fileExtension = path.extname(originalFilename)
		const fileNameWithoutExt = path.basename(originalFilename, fileExtension)

		const now = new Date()
		const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}-${now.getFullYear()}`
		const mainPdfFilename = `reczny_${fileNameWithoutExt}_${formattedDate}${fileExtension}`
		const mainGcsPath = await uploadFileToGCS(mainPdfBuffer, mainPdfFilename)

		// Używamy transakcji, aby zapewnić spójność danych
		const newSubmission = await prisma.$transaction(async tx => {
			const submission = await tx.submission.create({
				data: {
					companyName,
					email,
					formType,
					filePath: mainGcsPath,
					fileName: mainPdfFilename,
					status: 'PENDING',
					createdByAdmin: true,
					ceoName: ceoName || null,
					address: address || null,
					phones: phones || null,
					invoiceEmail: invoiceEmail || null,
					notificationEmails: notificationEmails || null,
				},
			})

			// Przetwarzanie i zapis dodatkowych załączników
			if (additionalFiles && additionalFiles.length > 0) {
				for (const file of additionalFiles) {
					const bytes = await file.arrayBuffer()
					const buffer = Buffer.from(bytes)
					const filename = `${sanitizeFilename(file.name)}`
					const uniqueId = crypto.randomUUID()
					const gcsFilename = `${uniqueId}_${filename}`
					const gcsPath = await uploadFileToGCS(buffer, gcsFilename)

					await tx.attachment.create({
						data: {
							fileName: filename,
							filePath: gcsPath,
							submissionId: submission.id,
							source: 'CLIENT_UPLOAD',
						},
					})
				}
			}
			return submission
		})

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		if (formType === 'DEKLARACJA_CZLONKOWSKA') {
			if (initialStatus === 'APPROVED') {
				const maxResult = await prisma.submission.aggregate({ _max: { communicationNumber: true } })
				const commNumber = (maxResult._max.communicationNumber || 0) + 1

				await prisma.submission.update({
					where: { id: newSubmission.id },
					data: { status: 'APPROVED', communicationNumber: commNumber },
				})

				// Generuj dokument komunikatu
				const { buffer: commBuffer, fileName: commFileName } = await generateCommunicationDoc(
					{ ...newSubmission, communicationNumber: commNumber },
					commNumber
				)
				const commGcsPath = await uploadFileToGCS(commBuffer, `communications/${commFileName}`)

				if (shouldSendEmails) {
					await transporter.sendMail({
						from: process.env.SMTP_USER,
						to: newSubmission.email,
						subject: `Twoja deklaracja członkowska PISiL została zweryfikowana`,
						html: `
                            <p>Szanowni Państwo,</p>
                            <p>Informujemy, że Państwa deklaracja członkowska dla firmy <strong>${companyName}</strong> została wstępnie zweryfikowana przez nasze biuro. Informacja o Państwa kandydaturze na członka Polskiej Izby Spedycji i Logistyki zostanie przekazana do wszystkich członków.</p>
                            <p>Kolejnym krokiem będzie przedstawienie Państwa kandydatury na najbliższym posiedzeniu Rady Izby. O decyzji Rady poinformujemy Państwa w osobnej wiadomości.</p>
                            <p>Z poważaniem,<br>Biuro PISiL</p>
                        `,
					})

					await emailQueue.add(
						'notify-members',
						{
							submissionId: newSubmission.id,
							companyName: companyName,
							attachmentGcsPath: commGcsPath,
							attachmentFileName: commFileName,
							adminEmail: process.env.ADMIN_EMAIL,
						},
						{ attempts: 3, backoff: { type: 'exponential', delay: 5000 } }
					)
				} else {
					await transporter.sendMail({
						from: process.env.SMTP_USER,
						to: process.env.ADMIN_EMAIL,
						subject: `[SYSTEM] Wygenerowano komunikat: ${companyName} (Bez wysyłki)`,
						html: `
                            <h3>Zgłoszenie zweryfikowane (Tryb cichy - dodawanie ręczne)</h3>
                            <p>Dla firmy <strong>${companyName}</strong> został wygenerowany komunikat nr <strong>${commNumber}</strong>.</p>
                            <p>Zgodnie z decyzją, <strong>NIE wysłano</strong> powiadomień do członków ani do kandydata.</p>
                            <p>Wygenerowany plik znajduje się w załączniku.</p>
                        `,
						attachments: [
							{
								filename: commFileName,
								content: commBuffer,
								contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							},
						],
					})
				}
			}

			// 2. PRZYJĘTY (ACCEPTED)
			else if (initialStatus === 'ACCEPTED') {
				await processAcceptance(newSubmission, acceptanceDate)
			}

			// 3. W TRAKCIE (PENDING)
			else {
				await transporter.sendMail({
					from: process.env.SMTP_USER,
					to: newSubmission.email,
					subject: 'Potwierdzenie otrzymania deklaracji członkowskiej - PISiL',
					html: `
                        <p>Szanowni Państwo,</p>
                        <p>Dziękujemy za przesłanie deklaracji członkowskiej. Państwa dokumenty są w trakcie weryfikacji.</p>
                        <p>W razie pytań prosimy o kontakt.</p>
						<p>Pozdrawiamy,<br>Zespół PISiL</p>
                    `,
				})
			}
		} else {
			const mailHtml = `
                <h2>Dziękujemy za przesłanie wniosku o patronat</h2>
				<p>Szanowni Państwo,</p>
				<p>Otrzymaliśmy Państwa wniosek o patronat do Polskiej Izby Spedycji i Logistyki.</p>
				<p>W razie pytań prosimy o kontakt.</p>
				<p>Pozdrawiamy,<br>Zespół PISiL</p>
            `

			await transporter.sendMail({
				from: process.env.SMTP_USER,
				to: newSubmission.email,
				subject: 'Potwierdzenie otrzymania wniosku o patronat - PISiL',
				html: mailHtml,
			})
		}

		const finalSubmission = await prisma.submission.findUnique({
			where: { id: newSubmission.id },
			include: { attachments: true },
		})

		return NextResponse.json(finalSubmission, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas dodawania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

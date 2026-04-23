import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'
import nodemailer from 'nodemailer'
import { FormType } from '@prisma/client'
import { generateCommunicationDoc } from '@/lib/services/communicationService' // Import serwisu
import { uploadFileToGCS } from '@/lib/gcs'
import { logDeprecated } from '@/lib/deprecatedLogger'

export async function POST(request, { params }) {
	logDeprecated(request)
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = await params
	let shouldSendEmails = true

	try {
		const body = await request.json()
		if (typeof body.shouldSendEmails !== 'undefined') {
			shouldSendEmails = body.shouldSendEmails
		}
	} catch (e) {}

	try {
		const submission = await prisma.submission.findUnique({
			where: { id },
		})

		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		if (submission.formType !== FormType.DEKLARACJA_CZLONKOWSKA) {
			return NextResponse.json({ message: 'Nieprawidłowy typ formularza' }, { status: 400 })
		}

		let commNumber = submission.communicationNumber
		if (!commNumber) {
			const maxResult = await prisma.submission.aggregate({ _max: { communicationNumber: true } })
			commNumber = (maxResult._max.communicationNumber || 0) + 1
		}

		const { buffer, fileName } = await generateCommunicationDoc(submission, commNumber)

		const gcsPath = await uploadFileToGCS(buffer, `communications/${fileName}`)

		await prisma.submission.update({
			where: { id },
			data: {
				communicationNumber: commNumber,
				communicationFilePath: gcsPath,
				communicationFileName: fileName,
			},
		})

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: {
				user: process.env.SMTP_USER,
				pass: process.env.SMTP_PASS,
			},
		})

		const mailOptions = {
			from: process.env.SMTP_USER,
			to: submission.email,
			subject: `Twoja deklaracja członkowska PISiL została zweryfikowana`,
			html: `
                <p>Szanowni Państwo,</p>
                <p>Informujemy, że Państwa deklaracja członkowska dla firmy <strong>${submission.companyName}</strong> została wstępnie zweryfikowana przez nasze biuro. Informacja o Państwa kandydaturze na członka Polskiej Izby Spedycji i Logistyki zostanie przekazana do wszystkich członków.</p>
                <p>Kolejnym krokiem będzie przedstawienie Państwa kandydatury na najbliższym posiedzeniu Rady Izby. O decyzji Rady poinformujemy Państwa w osobnej wiadomości.</p>
                <p>Z poważaniem,<br>Biuro PISiL</p>
            `,
		}

		await transporter.sendMail(mailOptions)

		if (shouldSendEmails) {
			await emailQueue.add(
				'notify-members',
				{
					submissionId: submission.id,
					companyName: submission.companyName,
					attachmentGcsPath: gcsPath,
					attachmentFileName: fileName,
					adminEmail: process.env.ADMIN_EMAIL,
				},
				{
					attempts: 3,
					backoff: {
						type: 'exponential',
						delay: 5000,
					},
				},
			)
		}

		const adminStatusText = shouldSendEmails
			? 'Wysłano powiadomienie do kandydata oraz URUCHOMIONO wysyłkę masową do członków (w tle).'
			: 'Wysłano powiadomienie do kandydata, ale POMINIĘTO wysyłkę masową do członków.'

		await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: process.env.ADMIN_EMAIL,
			subject: `[SYSTEM] Wygenerowano komunikat: ${submission.companyName}`,
			replyTo: process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL,
			bcc: process.env.DEKLARACJE_EMAIL || process.env.ADMIN_EMAIL,
			html: `
                <h3>Zgłoszenie zweryfikowane</h3>
                <p>Dla firmy <strong>${submission.companyName}</strong> został wygenerowany komunikat nr <strong>${commNumber}</strong>.</p>
                <p><strong>Status wysyłki:</strong> ${adminStatusText}</p>
                <p>Wygenerowany plik znajduje się w załączniku.</p>
            `,
			attachments: [
				{
					filename: fileName,
					content: buffer,
					contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
				},
			],
		})

		// 4. ZWROT KOMUNIKATU DO FRONTENDU
		const responseMessage = shouldSendEmails
			? `Zgłoszenie zweryfikowane. Wygenerowano ${fileName} i rozpoczęto wysyłkę w tle. Raport na maila.`
			: `Zgłoszenie zweryfikowane. Wygenerowano ${fileName}. Wysłano mail do kandydata i admina (Pominięto wysyłkę masową).`

		return NextResponse.json({ message: responseMessage }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas wysyłania emaila weryfikacyjnego:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

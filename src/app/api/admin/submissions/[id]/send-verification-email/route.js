import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'
import nodemailer from 'nodemailer'
import { FormType } from '@prisma/client'
import { generateCommunicationDoc } from '@/lib/services/communicationService' // Import serwisu
import { uploadFileToGCS } from '@/lib/gcs'

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params

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
			await prisma.submission.update({
				where: { id },
				data: { communicationNumber: commNumber },
			})
		}

		const { buffer, fileName } = await generateCommunicationDoc(submission, commNumber)

		const gcsPath = await uploadFileToGCS(buffer, `communications/${fileName}`)

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

		await emailQueue.add(
			'notify-members',
			{
				submissionId: submission.id,
				companyName: submission.companyName,
				attachmentGcsPath: gcsPath,
				attachmentFileName: fileName,
			},
			{
				attempts: 3,
				backoff: {
					type: 'exponential',
					delay: 5000,
				},
			}
		)

		return NextResponse.json(
			{ message: `Zgłoszenie zweryfikowane. Wygenerowano ${fileName} i rozpoczęto wysyłkę.` },
			{ status: 200 }
		)
	} catch (error) {
		console.error('Błąd podczas wysyłania emaila weryfikacyjnego:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

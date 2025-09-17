import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import * as nodemailer from 'nodemailer'
import { uploadFileToGCS } from '@/lib/gcs'
import { generateSurveyResultsPDF } from '@/lib/surveyPdfGenerator'
import { sanitizeFilename } from '@/lib/utils'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'programista@nautil.pl'

export async function POST(request) {
	try {
		const formData = await request.json()
		const { formType, ...submissionData } = formData

		// Określ nazwę firmy/zgłaszającego
		const submitterName =
			submissionData.companyNameAndAddress || submissionData.employerInfo || submissionData.fullName || 'Anonim'

		// 1. Wygeneruj PDF z wynikami ankiety
		const pdfTitle = formType.replace(/_/g, ' ')
		const pdfBuffer = generateSurveyResultsPDF(pdfTitle, submissionData)

		// 2. Prześlij wygenerowany PDF do GCS
		const filename = `ankieta_${sanitizeFilename(submitterName)}_${Date.now()}.pdf`
		const gcsPath = await uploadFileToGCS(Buffer.from(pdfBuffer), filename)

		// 3. Zapisz zgłoszenie w bazie danych
		await prisma.submission.create({
			data: {
				formType,
				companyName: submitterName,
				email: submissionData.email,
				filePath: gcsPath,
				fileName: filename,
				status: 'PENDING',
			},
		})

		// 4. Wyślij e-maile
		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		// Mail do admina z załącznikiem PDF
		await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: ADMIN_EMAIL,
			subject: `Nowe zgłoszenie w ankiecie: ${pdfTitle}`,
			html: `<p>W załączniku znajdują się wyniki ankiety od: <strong>${submitterName}</strong> (${submissionData.email}).</p>`,
			attachments: [
				{
					filename: filename,
					content: Buffer.from(pdfBuffer),
					contentType: 'application/pdf',
				},
			],
		})

		// Mail do użytkownika
		await transporter.sendMail({
			from: process.env.SMTP_USER,
			to: submissionData.email,
			subject: `Dziękujemy za udział w ankiecie: ${pdfTitle}`,
			html: `<p>Dziękujemy za poświęcony czas i przesłanie ankiety. Twoje odpowiedzi zostały zarejestrowane.</p><p>Z pozdrowieniami,<br>Zespół PISiL</p>`,
		})

		return NextResponse.json({ message: 'Ankieta została pomyślnie przesłana' })
	} catch (error) {
		console.error('Błąd podczas przesyłania ankiety:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

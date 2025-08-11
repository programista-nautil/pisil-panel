import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { PDFDocument, PDFSignature } from 'pdf-lib'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'programista@nautil.pl'

export async function POST(request) {
	try {
		const data = await request.formData()
		const file = data.get('pdf')
		const formDataString = data.get('formData')

		if (!file) {
			return NextResponse.json({ message: 'Nie wybrano pliku' }, { status: 400 })
		}

		if (!formDataString) {
			return NextResponse.json({ message: 'Brak danych formularza' }, { status: 400 })
		}

		const userData = JSON.parse(formDataString)

		const bytes = await file.arrayBuffer()
		const buffer = Buffer.from(bytes)

		// Weryfikacja obecności pola podpisu za pomocą pdf-lib
		let hasSignature = false
		try {
			const pdfDoc = await PDFDocument.load(buffer, {
				updateMetadata: false,
				ignoreEncryption: true,
			})
			const fields = pdfDoc.getForm().getFields()
			// ZMIANA 2: Używamy operatora instanceof - to jest poprawna metoda
			hasSignature = fields.some(field => field instanceof PDFSignature)
		} catch (error) {
			console.error('Błąd podczas analizy PDF w poszukiwaniu podpisu:', error)
			hasSignature = false // Bezpieczniej założyć, że nie ma podpisu, jeśli plik jest uszkodzony
		}

		const filename = `deklaracja_${userData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`

		const gcsFilePath = await uploadFileToGCS(buffer, filename)

		// Zapis metadanych do bazy danych
		await prisma.submission.create({
			data: {
				companyName: userData.companyName,
				email: userData.email,
				filePath: gcsFilePath, // Zapisujemy ścieżkę z GCS
				fileName: filename,
				formType: userData.formType,
			},
		})

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: {
				user: process.env.SMTP_USER || 'programista@nautil.pl',
				pass: process.env.SMTP_PASS || 'your-app-password',
			},
		})

		const adminMailOptions = {
			from: process.env.SMTP_USER || 'programista@nautil.pl',
			to: ADMIN_EMAIL,
			subject: `Nowa deklaracja członkowska - ${userData.companyName}`,
			html: `
        <h2>Nowa deklaracja członkowska</h2>
        <p><strong>Firma:</strong> ${userData.companyName}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Status podpisu:</strong> ${
					hasSignature ? '✅ Potwierdzono obecność pola podpisu' : '❌ Nie znaleziono pola podpisu'
				}</p>
        <p><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</p>
        
      `,
			attachments: [{ filename, content: buffer, contentType: 'application/pdf' }],
		}

		const userMailOptions = {
			from: process.env.SMTP_USER || 'programista@nautil.pl',
			to: userData.email,
			subject: 'Potwierdzenie otrzymania deklaracji członkowskiej - PISiL',
			html: `
        <h2>Dziękujemy za przesłanie deklaracji członkowskiej</h2>
        <p>Szanowni Państwo,</p>
        <p>Otrzymaliśmy Państwa deklarację członkowską do Polskiej Izby Specjalistów IT i Logistyki.</p>
        
        <h3>Podsumowanie:</h3>
        <ul>
          <li><strong>Firma:</strong> ${userData.companyName}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Status podpisu:</strong> ${
						hasSignature ? '✅ Potwierdzono obecność podpisu' : '❌ Brak wymaganego podpisu'
					}</li>
          <li><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</li>
        </ul>
        
        ${
					hasSignature
						? '<p style="color: green;">Twoja deklaracja została przesłana pomyślnie i zostanie rozpatrzona przez administrację.</p>'
						: '<p style="color: red;"><b>Uwaga:</b> W przesłanym pliku nie wykryto pola podpisu elektronicznego. Prosimy o ponowne przesłanie poprawnie podpisanego dokumentu.</p>'
				}
        
        <p>W razie pytań prosimy o kontakt.</p>
        <p>Pozdrawiamy,<br>Zespół PISiL</p>
      `,
		}

		try {
			await transporter.sendMail(adminMailOptions)
			await transporter.sendMail(userMailOptions)

			return NextResponse.json({
				message: 'Plik został przesłany pomyślnie',
				hasSignature,
			})
		} catch (emailError) {
			console.error('Błąd podczas wysyłania emaila:', emailError)
			return NextResponse.json(
				{ message: 'Plik przesłano, ale wystąpił błąd przy wysyłaniu powiadomień.' },
				{ status: 206 }
			)
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania pliku:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

export async function GET(request) {
	return NextResponse.json({ message: 'Endpoint do przesyłania plików PDF' })
}

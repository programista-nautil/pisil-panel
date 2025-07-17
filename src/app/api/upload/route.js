import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import nodemailer from 'nodemailer'

const ADMIN_EMAIL = 'programista@nautil.pl'

export async function POST(request) {
	try {
		const formData = await request.formData()
		const file = formData.get('pdf')
		const formDataString = formData.get('formData')

		if (!file) {
			return NextResponse.json({ message: 'Nie wybrano pliku' }, { status: 400 })
		}

		if (!formDataString) {
			return NextResponse.json({ message: 'Brak danych formularza' }, { status: 400 })
		}

		const userData = JSON.parse(formDataString)

		// Konwertuj plik na buffer
		const bytes = await file.arrayBuffer()
		const buffer = Buffer.from(bytes)

		// Sprawdź czy plik zawiera podpis (podstawowa walidacja)
		let hasSignature = false

		try {
			const pdfDoc = await PDFDocument.load(buffer)
			const form = pdfDoc.getForm()
			const fields = form.getFields()

			// Sprawdź czy są pola podpisu lub adnotacje
			hasSignature = fields.some(
				field =>
					field.constructor.name === 'PDFSignatureField' ||
					field.getName().toLowerCase().includes('signature') ||
					field.getName().toLowerCase().includes('podpis')
			)

			// Jeśli nie ma pól podpisu, sprawdź rozmiar pliku (podpisany PDF zwykle jest większy)
			if (!hasSignature) {
				hasSignature = buffer.length > 50000 // 50KB jako próg
			}
		} catch (error) {
			console.error('Błąd podczas analizy PDF:', error)
			// Jeśli nie można przeanalizować PDF, uznaj że może zawierać podpis
			hasSignature = true
		}

		// Zapisz plik tymczasowo
		const uploadsDir = path.join(process.cwd(), 'uploads')
		if (!fs.existsSync(uploadsDir)) {
			fs.mkdirSync(uploadsDir, { recursive: true })
		}

		const filename = `deklaracja_${userData.firstName}_${userData.lastName}_${Date.now()}.pdf`
		const filepath = path.join(uploadsDir, filename)

		fs.writeFileSync(filepath, buffer)

		// Konfiguracja nodemailer (musisz dostosować do swoich ustawień SMTP)
		const transporter = nodemailer.createTransporter({
			host: 'smtp.gmail.com', // Zmień na swój serwer SMTP
			port: 587,
			secure: false,
			auth: {
				user: process.env.SMTP_USER || 'your-email@gmail.com',
				pass: process.env.SMTP_PASS || 'your-app-password',
			},
		})

		// Email do admina
		const adminMailOptions = {
			from: process.env.SMTP_USER || 'your-email@gmail.com',
			to: ADMIN_EMAIL,
			subject: `Nowa deklaracja członkowska - ${userData.firstName} ${userData.lastName}`,
			html: `
        <h2>Nowa deklaracja członkowska</h2>
        <p><strong>Imię i nazwisko:</strong> ${userData.firstName} ${userData.lastName}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
        <p><strong>Telefon:</strong> ${userData.phone}</p>
        <p><strong>Zawód:</strong> ${userData.profession}</p>
        <p><strong>Miejsce pracy:</strong> ${userData.workplace}</p>
        <p><strong>Rodzaj członkostwa:</strong> ${userData.membershipType}</p>
        <p><strong>Status podpisu:</strong> ${hasSignature ? '✅ Prawdopodobnie podpisany' : '❌ Brak podpisu'}</p>
        <p><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</p>
        
        <h3>Pełne dane:</h3>
        <pre>${JSON.stringify(userData, null, 2)}</pre>
      `,
			attachments: [
				{
					filename: filename,
					path: filepath,
				},
			],
		}

		// Email potwierdzający do użytkownika
		const userMailOptions = {
			from: process.env.SMTP_USER || 'your-email@gmail.com',
			to: userData.email,
			subject: 'Potwierdzenie otrzymania deklaracji członkowskiej - PISiL',
			html: `
        <h2>Dziękujemy za przesłanie deklaracji członkowskiej</h2>
        <p>Szanowny/a ${userData.firstName} ${userData.lastName},</p>
        <p>Otrzymaliśmy Twoją deklarację członkowską do Polskiej Izby Specjalistów IT i Logistyki.</p>
        
        <h3>Podsumowanie:</h3>
        <ul>
          <li><strong>Imię i nazwisko:</strong> ${userData.firstName} ${userData.lastName}</li>
          <li><strong>Email:</strong> ${userData.email}</li>
          <li><strong>Rodzaj członkostwa:</strong> ${userData.membershipType}</li>
          <li><strong>Status podpisu:</strong> ${
						hasSignature ? '✅ Prawdopodobnie podpisany' : '❌ Wymaga podpisu'
					}</li>
          <li><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</li>
        </ul>
        
        ${
					hasSignature
						? '<p style="color: green;">Twoja deklaracja została przesłana pomyślnie i zostanie rozpatrzona przez administrację.</p>'
						: '<p style="color: red;">Uwaga: Nie wykryto podpisu w przesłanym pliku. Proszę o ponowne przesłanie podpisanego dokumentu.</p>'
				}
        
        <p>W razie pytań prosimy o kontakt.</p>
        <p>Pozdrawiamy,<br>Zespół PISiL</p>
      `,
		}

		// Wyślij emaile
		try {
			await transporter.sendMail(adminMailOptions)
			await transporter.sendMail(userMailOptions)

			// Usuń plik tymczasowy (opcjonalnie)
			// fs.unlinkSync(filepath)

			return NextResponse.json({
				message: 'Plik został przesłany pomyślnie',
				hasSignature,
				filename,
			})
		} catch (emailError) {
			console.error('Błąd podczas wysyłania emaila:', emailError)
			return NextResponse.json(
				{
					message: 'Plik został przesłany, ale wystąpił błąd z wysyłaniem emaila',
					hasSignature,
					filename,
				},
				{ status: 206 }
			)
		}
	} catch (error) {
		console.error('Błąd podczas przetwarzania pliku:', error)
		return NextResponse.json(
			{
				message: 'Wystąpił błąd podczas przetwarzania pliku',
			},
			{ status: 500 }
		)
	}
}

export async function GET() {
	return NextResponse.json({ message: 'Endpoint do przesyłania plików PDF' })
}

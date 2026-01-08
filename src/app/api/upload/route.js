import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { PDFDocument, PDFSignature } from 'pdf-lib'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'

const EMAILS = {
	// Pani Teresa (Deklaracje Członkowskie)
	DEKLARACJE: process.env.DEKLARACJE_EMAIL || 'programista@nautil.pl',

	// Pan Czesław (Patronaty)
	PATRONATY: process.env.PATRONATY_EMAIL || 'programista@nautil.pl',

	// Domyślny (Ankiety i inne)
	DEFAULT: process.env.ADMIN_EMAIL || 'programista@nautil.pl',
}

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

		// Dynamiczna nazwa pliku zależnie od typu formularza + bezpieczne fallbacki
		const formType = userData.formType
		const isDeclaration = formType === 'DEKLARACJA_CZLONKOWSKA'
		const displayCompanyOrOrg = userData.companyName || userData.organizerName || userData.eventName || 'Nieznana firma'
		const baseName = isDeclaration
			? `deklaracja_${sanitizeFilename(userData.companyName) || sanitizeFilename(displayCompanyOrOrg)}`
			: formType === 'PATRONAT'
			? `patronat_${
					sanitizeFilename(userData.eventName) ||
					sanitizeFilename(userData.organizerName) ||
					sanitizeFilename(displayCompanyOrOrg)
			  }`
			: `formularz_${sanitizeFilename(displayCompanyOrOrg)}`
		const now = new Date()
		const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}-${now.getFullYear()}`
		const filename = `${baseName}_${formattedDate}.pdf`

		const gcsFilePath = await uploadFileToGCS(buffer, filename)

		// Zapis metadanych do bazy danych
		const newSubmission = await prisma.submission.create({
			data: {
				companyName: userData.companyName || userData.organizerName || userData.eventName || undefined,
				email: userData.email,
				invoiceEmail: userData.invoiceEmail,
				notificationEmails: userData.email,
				filePath: gcsFilePath,
				fileName: filename,
				formType: userData.formType,
				ceoName: userData.ceoName,
				address: userData.address,
				phones: userData.phones,
				recommendations: userData.rekomendacje || userData.recommendations || null,
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
			to: isDeclaration ? EMAILS.DEKLARACJE : formType === 'PATRONAT' ? EMAILS.PATRONATY : EMAILS.DEFAULT,
			subject: isDeclaration
				? `Nowa deklaracja członkowska - ${displayCompanyOrOrg}`
				: formType === 'PATRONAT'
				? `Nowy wniosek o patronat - ${displayCompanyOrOrg}`
				: `Nowe zgłoszenie - ${displayCompanyOrOrg}`,
			html: isDeclaration
				? `
        <h2>Nowa deklaracja członkowska</h2>
        <p><strong>Firma:</strong> ${displayCompanyOrOrg}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
		<p><strong>Telefon:</strong> ${userData.phones || 'Nie podano'}</p>
        <p><strong>Status podpisu:</strong> ${
					hasSignature ? '✅ Potwierdzono obecność pola podpisu' : '❌ Nie znaleziono pola podpisu'
				}</p>
        <p><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</p>
      `
				: `
        <h2>Nowy wniosek o patronat</h2>
        <p><strong>Organizator/Wydarzenie:</strong> ${displayCompanyOrOrg}</p>
        <p><strong>Email:</strong> ${userData.email}</p>
		<p><strong>Telefon:</strong> ${userData.phones || 'Nie podano'}</p>
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
			subject: isDeclaration
				? 'Potwierdzenie otrzymania deklaracji członkowskiej - PISiL'
				: 'Potwierdzenie otrzymania wniosku o patronat - PISiL',
			html: isDeclaration
				? `
				<h2>Dziękujemy za przesłanie deklaracji członkowskiej</h2>
				<p>Szanowni Państwo,</p>
				<p>Otrzymaliśmy Państwa deklarację członkowską do Polskiej Izby Specjalistów IT i Logistyki.</p>
				<h3>Podsumowanie:</h3>
				<ul>
					<li><strong>Firma:</strong> ${displayCompanyOrOrg}</li>
					<li><strong>Email:</strong> ${userData.email}</li>
					<li><strong>Telefon:</strong> ${userData.phones || 'Nie podano'}</li>
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
			`
				: `
				<h2>Dziękujemy za przesłanie wniosku o patronat</h2>
				<p>Szanowni Państwo,</p>
				<p>Otrzymaliśmy Państwa wniosek o patronat do Polskiej Izby Spedycji i Logistyki.</p>
				<h3>Podsumowanie:</h3>
				<ul>
					<li><strong>Organizator/Wydarzenie:</strong> ${displayCompanyOrOrg}</li>
					<li><strong>Email:</strong> ${userData.email}</li>
					<li><strong>Telefon:</strong> ${userData.phones || 'Nie podano'}</li>
          <li><strong>Status podpisu:</strong> ${
						hasSignature ? '✅ Potwierdzono obecność podpisu' : '❌ Brak wymaganego podpisu'
					}</li>
					<li><strong>Data przesłania:</strong> ${new Date().toLocaleString('pl-PL')}</li>
				</ul>
        ${
					hasSignature
						? '<p style="color: green;">Wniosek został przesłany pomyślnie i zostanie rozpatrzony przez administrację.</p>'
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
				submission: newSubmission,
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

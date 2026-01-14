import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { FormType, Status } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import { uploadFileToGCS } from '@/lib/gcs'
import bcrypt from 'bcrypt'
import { STATIC_ACCEPTANCE_DOCUMENTS } from '@/lib/staticDocuments'
import { syncMailingList } from '@/lib/mailingListUtils'
import { convertDocxToPdf } from '@/lib/docxToPdfService'

const SALT_ROUNDS = 10

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'programista@nautil.pl'

const generateRandomPassword = (length = 12) => {
	const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
	let password = ''
	for (let i = 0; i < length; i++) {
		password += chars.charAt(Math.floor(Math.random() * chars.length))
	}
	return password
}

const splitAddress = address => {
	if (!address) return { line1: '', line2: '' }

	const zipCodeRegex = /\d{2}-\d{3}/
	const match = address.match(zipCodeRegex)
	if (match) {
		const index = match.index
		return {
			line1: address.substring(0, index).trim().replace(/,$/, ''),
			line2: address.substring(index).trim(),
		}
	}
	// Fallback dla adresów bez kodu pocztowego w standardowym formacie
	const parts = address.split(',')
	if (parts.length > 1) {
		return { line1: parts[0].trim(), line2: parts.slice(1).join(',').trim() }
	}
	return { line1: address, line2: '' }
}

const getCeoWithTitle = ceoName => {
	if (!ceoName) {
		return 'Brak danych'
	}
	const firstName = ceoName.trim().split(' ')[0]
	if (firstName.toLowerCase().endsWith('a')) {
		return `Pani ${ceoName}`
	}
	return `Pan ${ceoName}`
}

export async function processAcceptance(submission, acceptanceDate) {
	const userNodemailerAttachments = []
	const generatedDocsData = []

	if (submission.formType === FormType.DEKLARACJA_CZLONKOWSKA) {
		let docNumber
		let memberId = submission.memberId
		let plainPassword = null

		if (!submission.acceptanceNumber || !memberId) {
			if (submission.acceptanceNumber) {
				docNumber = submission.acceptanceNumber
			} else {
				// --- ZMIANA LOGIKI OBLICZANIA NUMERU ---

				// A. Sprawdź max w Zgłoszeniach
				const maxSubmissionResult = await prisma.submission.aggregate({
					_max: { acceptanceNumber: true },
				})
				const maxSubmissionNum = maxSubmissionResult._max.acceptanceNumber || 0

				// B. Sprawdź max w Członkach (bo mogli dojść z seeda/importu)
				const maxMemberResult = await prisma.member.aggregate({
					_max: { memberNumber: true },
				})
				const maxMemberNum = maxMemberResult._max.memberNumber || 0

				// C. Weź większą z tych dwóch liczb i dodaj 1
				docNumber = Math.max(maxSubmissionNum, maxMemberNum) + 1
			}

			// 2. Znajdź lub stwórz członka
			const existingMember = await prisma.member.findUnique({ where: { email: submission.email } })

			if (existingMember) {
				memberId = existingMember.id
				await syncMailingList(existingMember.notificationEmails, submission.notificationEmails)
				await prisma.member.update({
					where: { id: memberId },
					data: {
						company: submission.companyName,
						name: submission.ceoName,
						address: submission.address,
						memberNumber: docNumber,
						phones: submission.phones,
						invoiceEmail: submission.invoiceEmail,
						notificationEmails: submission.notificationEmails,
					},
				})
			} else {
				//plainPassword = generateRandomPassword()
				const plainPassword = '2015pisil'
				const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS)
				await syncMailingList(null, submission.notificationEmails)
				const newMember = await prisma.member.create({
					data: {
						email: submission.email,
						password: hashedPassword,
						mustChangePassword: true, //potem usunac
						company: submission.companyName,
						name: submission.ceoName,
						address: submission.address,
						memberNumber: docNumber,
						phones: submission.phones,
						invoiceEmail: submission.invoiceEmail,
						notificationEmails: submission.notificationEmails,
					},
				})
				memberId = newMember.id
			}

			await prisma.submission.update({
				where: { id: submission.id },
				data: {
					acceptanceNumber: docNumber,
					memberId: memberId,
					status: Status.ACCEPTED,
				},
			})

			submission = await prisma.submission.findUnique({ where: { id: submission.id } })
		} else {
			docNumber = submission.acceptanceNumber
		}

		const currentDate = new Date()
		const dateForDocs = acceptanceDate ? new Date(acceptanceDate) : new Date()
		const day = String(dateForDocs.getDate()).padStart(2, '0')
		const month = String(dateForDocs.getMonth() + 1).padStart(2, '0')
		const year = dateForDocs.getFullYear()
		const formattedDate = `${day}.${month}.${year}`
		const addressParts = splitAddress(submission.address)

		const template1Path = path.join(process.cwd(), 'private', 'document-templates', 'pismo zaśw. przyjęcie.docx')
		const template1Content = await fs.readFile(template1Path)
		const doc1 = new Docxtemplater(new PizZip(template1Content))
		doc1.render({
			data: currentDate.toLocaleDateString('pl-PL'),
			data_uchwala: formattedDate,
			nazwa_firmy: submission.companyName,
			imie_nazwisko_kierownika: getCeoWithTitle(submission.ceoName) || 'Brak danych',
			adres_linia1: addressParts.line1,
			adres_linia2: addressParts.line2 ? `\n${addressParts.line2}` : '',
			mail: submission.email,
			haslo: plainPassword ? plainPassword : '(Hasło pozostaje bez zmian)',
		})

		const docxBuffer1 = doc1.getZip().generate({ type: 'nodebuffer' })
		const docxFilename1 = `pismo zaśw. przyjęcie_${docNumber}.docx`

		let fileToSave1 = {
			filename: docxFilename1,
			buffer: docxBuffer1,
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		}

		try {
			if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PDF_CONVERSION === 'true') {
				const pdfResult = await convertDocxToPdf(docxBuffer1, docxFilename1)
				fileToSave1 = {
					filename: pdfResult.filename,
					buffer: pdfResult.buffer,
					contentType: 'application/pdf',
				}
			}
		} catch (err) {
			console.error('Nie udało się przekonwertować na PDF, wysyłam DOCX:', err)
		}

		generatedDocsData.push(fileToSave1)

		const template2Path = path.join(process.cwd(), 'private', 'document-templates', 'pismo w sprawie składek.docx')
		const template2Content = await fs.readFile(template2Path)
		const doc2 = new Docxtemplater(new PizZip(template2Content))
		doc2.render({
			data: currentDate.toLocaleDateString('pl-PL'),
			nazwa_firmy: submission.companyName,
			imie_nazwisko_kierownika: getCeoWithTitle(submission.ceoName) || 'Brak danych',
			adres_linia1: addressParts.line1,
			adres_linia2: addressParts.line2 ? `\n${addressParts.line2}` : '',
			mail: submission.email,
		})
		const docxBuffer2 = doc2.getZip().generate({ type: 'nodebuffer' })
		const docxFilename2 = `pismo w sprawie składek_${docNumber}.docx`

		let fileToSave2 = {
			filename: docxFilename2,
			buffer: docxBuffer2,
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		}

		try {
			if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PDF_CONVERSION === 'true') {
				const pdfResult = await convertDocxToPdf(docxBuffer2, docxFilename2)
				fileToSave2 = {
					filename: pdfResult.filename,
					buffer: pdfResult.buffer,
					contentType: 'application/pdf',
				}
			}
		} catch (err) {
			console.error('PDF error doc2:', err)
		}

		generatedDocsData.push(fileToSave2)

		const template3Path = path.join(process.cwd(), 'private', 'document-templates', 'zasw.docx')
		const template3Content = await fs.readFile(template3Path)
		const doc3 = new Docxtemplater(new PizZip(template3Content))
		doc3.render({
			numer: docNumber,
			rok: currentDate.getFullYear(),
			nazwa_firmy: submission.companyName,
			adres_linia1: addressParts.line1,
			adres_linia2: addressParts.line2 ? `\n${addressParts.line2}` : '',
			data_uchwala: formattedDate,
		})
		const docxBuffer3 = doc3.getZip().generate({ type: 'nodebuffer' })
		const docxFilename3 = `zasw_${docNumber}.docx`

		let fileToSave3 = {
			filename: docxFilename3,
			buffer: docxBuffer3,
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		}

		try {
			if (process.env.NODE_ENV === 'production' || process.env.ENABLE_PDF_CONVERSION === 'true') {
				const pdfResult = await convertDocxToPdf(docxBuffer3, docxFilename3)
				fileToSave3 = {
					filename: pdfResult.filename,
					buffer: pdfResult.buffer,
					contentType: 'application/pdf',
				}
			}
		} catch (err) {
			console.error('PDF error doc3:', err)
		}

		generatedDocsData.push(fileToSave3)

		await Promise.all(
			generatedDocsData.map(async docData => {
				const gcsPath = await uploadFileToGCS(docData.buffer, docData.filename)
				await prisma.attachment.create({
					data: {
						fileName: docData.filename,
						filePath: gcsPath,
						submissionId: submission.id,
						source: 'GENERATED',
					},
				})
			})
		)

		generatedDocsData.forEach(doc => {
			userNodemailerAttachments.push({
				filename: doc.filename,
				content: doc.buffer,
				contentType: doc.contentType,
			})
		})

		const zip = new JSZip()
		for (const filename of STATIC_ACCEPTANCE_DOCUMENTS) {
			const filePath = path.join(process.cwd(), 'private', 'acceptance-documents', filename)
			const fileContent = await fs.readFile(filePath)
			zip.file(filename, fileContent)
		}

		const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

		userNodemailerAttachments.push({
			filename: 'Załączniki do pisma w sprawie przyjęcia w poczet członków.zip',
			content: zipBuffer,
			contentType: 'application/zip',
		})
	}

	const transporter = nodemailer.createTransport({
		host: 'smtp.gmail.com',
		port: 587,
		secure: false,
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
	})

	const userMailOptions = {
		from: process.env.SMTP_USER,
		to: submission.email,
		subject: `Potwierdzenie członkostwa w Polskiej Izbie Spedycji i Logistyki`,
		html: `
            <p>Szanowni Państwo,</p>
            <p>Z przyjemnością informujemy, że uchwałą Rady PISiL firma <strong>${submission.companyName}</strong> została przyjęta w poczet członków Polskiej Izby Spedycji i Logistyki.</p>
            <p>Prosimy o zapoznanie się z załączonymi dokumentami.</p>
			<p>Do panelu członka mogą zalogować się Państwo wpisując swój email oraz hasło tymczasowe '2015pisil'. Po zalogowaniu zostaną Państwo poproszeni o zmianę hasła.</p>
            <p>Z poważaniem,<br>Biuro PISiL</p>
        `,
		attachments: userNodemailerAttachments,
	}

	await transporter.sendMail(userMailOptions)

	const adminMailOptions = {
		from: process.env.SMTP_USER,
		to: ADMIN_EMAIL,
		subject: `Potwierdzenie przyjęcia członka: ${submission.companyName}`,
		html: `Wygenerowano i wysłano dokumenty powitalne dla <strong>${submission.companyName}</strong>. Zostały one również zapisane jako załączniki do zgłoszenia w panelu.`,
		attachments: generatedDocsData.map(doc => ({
			filename: doc.filename,
			content: doc.buffer,
			contentType: doc.contentType,
		})),
	}

	await transporter.sendMail(adminMailOptions)

	const updatedSubmission = await prisma.submission.findUnique({
		where: { id: submission.id },
		include: { attachments: true },
	})

	return updatedSubmission
}

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

const SALT_ROUNDS = 10

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'programista@nautil.pl'

const STATIC_ATTACHMENTS = [
	'34.pdf',
	'44.pdf',
	'219 A.pdf',
	'Biuletyn_2012_11-12.pdf',
	'FIATA MR.pdf',
	'FIATA zakaz FCR steel products.pdf',
	'regulam ekspert.pdf',
	'SA regulamin-pol.pdf',
	'ubezp..pdf',
]

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
			let memberRecord

			const existingMember = await prisma.member.findUnique({ where: { email: submission.email } })

			if (existingMember) {
				memberRecord = existingMember
				memberId = existingMember.id

				await prisma.member.update({
					where: { id: memberId },
					data: { company: submission.companyName, name: submission.ceoName },
				})
			} else {
				plainPassword = generateRandomPassword()
				const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS)
				memberRecord = await prisma.member.create({
					data: {
						email: submission.email,
						password: hashedPassword,
						company: submission.companyName,
						name: submission.ceoName,
					},
				})
				memberId = memberRecord.id
			}

			if (!submission.acceptanceNumber) {
				const maxResult = await prisma.submission.aggregate({ _max: { acceptanceNumber: true } })
				docNumber = (maxResult._max.acceptanceNumber || 0) + 1
			} else {
				docNumber = submission.acceptanceNumber
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
			memberId = submission.memberId
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

		generatedDocsData.push({
			filename: `pismo zaśw. przyjęcie_${docNumber}.docx`,
			buffer: doc1.getZip().generate({ type: 'nodebuffer' }),
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		})

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
		generatedDocsData.push({
			filename: `pismo w sprawie składek_${docNumber}.docx`,
			buffer: doc2.getZip().generate({ type: 'nodebuffer' }),
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		})

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
		generatedDocsData.push({
			filename: `zasw_${docNumber}.docx`,
			buffer: doc3.getZip().generate({ type: 'nodebuffer' }),
			contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		})

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
		for (const filename of STATIC_ATTACHMENTS) {
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

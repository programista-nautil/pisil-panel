import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { FormType, Status } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import { uploadFileToGCS } from '@/lib/gcs'

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

export async function POST(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { id } = params

	try {
		const submission = await prisma.submission.findUnique({ where: { id } })
		if (!submission) {
			return NextResponse.json({ message: 'Nie znaleziono zgłoszenia' }, { status: 404 })
		}

		const userNodemailerAttachments = []
		const generatedDocsData = []

		if (submission.formType === FormType.DEKLARACJA_CZLONKOWSKA) {
			const counter = await prisma.documentCounter.upsert({
				where: { id: 'acceptance_letter' },
				update: { lastNumber: { increment: 1 } },
				create: { id: 'acceptance_letter', lastNumber: 1 },
			})
			const docNumber = counter.lastNumber

			const currentDate = new Date()
			const addressParts = splitAddress(submission.address)

			const template1Path = path.join(process.cwd(), 'private', 'document-templates', 'pismo zaśw. przyjęcie.docx')
			const template1Content = await fs.readFile(template1Path)
			const doc1 = new Docxtemplater(new PizZip(template1Content))
			doc1.render({
				data: currentDate.toLocaleDateString('pl-PL'),
				nazwa_firmy: submission.companyName,
				imie_nazwisko_kierownika: getCeoWithTitle(submission.ceoName) || 'Brak danych',
				adres_linia1: addressParts.line1,
				adres_linia2: addressParts.line2 ? `\n${addressParts.line2}` : '',
				mail: submission.email,
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
				data: currentDate.toLocaleDateString('pl-PL'),
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

		await prisma.submission.update({
			where: { id },
			data: { status: Status.ACCEPTED },
		})

		const transporter = nodemailer.createTransport({
			host: 'smtp.gmail.com',
			port: 587,
			secure: false,
			auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
		})

		const userMailOptions = {
			from: process.env.SMTP_USER,
			to: submission.email,
			subject: `Witamy w PISiL! Państwa członkostwo zostało przyjęte.`,
			html: `
        <h2>Szanowni Państwo,</h2>
        <p>
          Z przyjemnością informujemy, że Rada Izby PISiL pozytywnie rozpatrzyła Państwa deklarację członkowską dla firmy <strong>${submission.companyName}</strong>.
        </p>
        <p>
          Witamy w gronie członków Polskiej Izby Specjalistów IT i Logistyki!
        </p>
        <p>W załącznikach przesyłamy stosowne dokumenty powitalne.</p>
        <p>Z pozdrowieniami,<br>Zespół PISiL</p>
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

		return NextResponse.json({ message: 'Email akceptacyjny został wysłany' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas akceptacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

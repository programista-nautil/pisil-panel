import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import nodemailer from 'nodemailer'
import { FormType, Status } from '@prisma/client'
import fs from 'fs/promises'
import path from 'path'
import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'

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

		const nodemailerAttachments = await Promise.all(
			STATIC_ATTACHMENTS.map(async filename => {
				const filePath = path.join(process.cwd(), 'private', 'acceptance-documents', filename)
				const buffer = await fs.readFile(filePath)
				return {
					filename,
					content: buffer,
					contentType: 'application/pdf',
				}
			})
		)

		if (submission.formType === FormType.DEKLARACJA_CZLONKOWSKA) {
			const counter = await prisma.documentCounter.upsert({
				where: { id: 'acceptance_letter' },
				update: { lastNumber: { increment: 1 } },
				create: { id: 'acceptance_letter', lastNumber: 1 },
			})
			const docNumber = counter.lastNumber

			// 2. Wczytaj szablon .docx
			const templatePath = path.join(process.cwd(), 'private', 'document-templates', 'pismo zaśw. przyjęcie.docx')
			const templateContent = await fs.readFile(templatePath)

			const zip = new PizZip(templateContent)
			const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true })

			// 3. Przygotuj dane do wstawienia
			const addressParts = splitAddress(submission.address)
			const renderData = {
				data: new Date().toLocaleDateString('pl-PL'),
				nazwa_firmy: submission.companyName,
				imie_nazwisko_kierownika: submission.ceoName || 'Brak danych',
				adres_linia1: addressParts.line1,
				adres_linia2: addressParts.line2,
				mail: submission.email,
			}

			doc.render(renderData)

			// 4. Wygeneruj finalny plik .docx jako bufor
			const generatedDocBuffer = doc.getZip().generate({ type: 'nodebuffer' })
			const finalDocName = `pismo zaśw. przyjęcie_${docNumber}.docx`

			// 5. Dodaj wygenerowany dokument do listy załączników
			nodemailerAttachments.push({
				filename: finalDocName,
				content: generatedDocBuffer,
				contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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

		const mailOptions = {
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
			attachments: nodemailerAttachments, // Dodajemy wszystkie załączniki
		}

		await transporter.sendMail(mailOptions)

		return NextResponse.json({ message: 'Email akceptacyjny został wysłany' }, { status: 200 })
	} catch (error) {
		console.error('Błąd podczas akceptacji zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

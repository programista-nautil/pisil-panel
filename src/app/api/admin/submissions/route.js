import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import { uploadFileToGCS } from '@/lib/gcs'
import { sanitizeFilename } from '@/lib/utils'
import path from 'path'

export async function GET() {
	const session = await auth()

	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const submissions = await prisma.submission.findMany({
			orderBy: { createdAt: 'desc' },
			include: { attachments: true },
		})
		return NextResponse.json(submissions)
	} catch (error) {
		console.error('Błąd podczas pobierania zgłoszeń:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

export async function POST(request) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	try {
		const data = await request.formData()
		const mainPdf = data.get('mainPdf')
		const additionalFiles = data.getAll('additionalFiles[]')
		const formType = data.get('formType')
		const companyName = data.get('companyName')
		const email = data.get('email')

		if (!mainPdf || !formType || !companyName || !email) {
			return NextResponse.json({ message: 'Brakujące wymagane pola.' }, { status: 400 })
		}

		// Przetwarzanie głównego pliku
		const mainPdfBytes = await mainPdf.arrayBuffer()
		const mainPdfBuffer = Buffer.from(mainPdfBytes)
		const originalFilename = sanitizeFilename(mainPdf.name)
		const fileExtension = path.extname(originalFilename)
		const fileNameWithoutExt = path.basename(originalFilename, fileExtension)

		const now = new Date()
		const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}-${now.getFullYear()}`
		const mainPdfFilename = `reczny_${fileNameWithoutExt}_${formattedDate}${fileExtension}`
		const mainGcsPath = await uploadFileToGCS(mainPdfBuffer, mainPdfFilename)

		// Używamy transakcji, aby zapewnić spójność danych
		const newSubmission = await prisma.$transaction(async tx => {
			const submission = await tx.submission.create({
				data: {
					companyName,
					email,
					formType,
					filePath: mainGcsPath,
					fileName: mainPdfFilename,
					status: 'PENDING',
					createdByAdmin: true,
				},
			})

			// Przetwarzanie i zapis dodatkowych załączników
			if (additionalFiles && additionalFiles.length > 0) {
				for (const file of additionalFiles) {
					const bytes = await file.arrayBuffer()
					const buffer = Buffer.from(bytes)
					const now = new Date()
					const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
						2,
						'0'
					)}-${now.getFullYear()}`
					const filename = `attachment_${formattedDate}_${sanitizeFilename(file.name)}`
					const gcsPath = await uploadFileToGCS(buffer, filename)

					await tx.attachment.create({
						data: {
							fileName: filename,
							filePath: gcsPath,
							submissionId: submission.id,
						},
					})
				}
			}
			// Zwracamy pełne zgłoszenie z załącznikami do aktualizacji UI
			return tx.submission.findUnique({
				where: { id: submission.id },
				include: { attachments: true },
			})
		})

		return NextResponse.json(newSubmission, { status: 201 })
	} catch (error) {
		console.error('Błąd podczas dodawania zgłoszenia:', error)
		return NextResponse.json({ message: 'Wystąpił błąd serwera.' }, { status: 500 })
	}
}

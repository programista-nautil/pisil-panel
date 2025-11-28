import PizZip from 'pizzip'
import Docxtemplater from 'docxtemplater'
import fs from 'fs/promises'
import path from 'path'

export async function generateCommunicationDoc(submission, commNumber) {
	const now = new Date()

	const dataZgloszenia = now.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

	const monthDigit = String(now.getMonth() + 1).padStart(2, '0')
	const yearShort = String(now.getFullYear()).slice(-2)
	const fullYear = now.getFullYear()

	const futureDate = new Date(now)
	futureDate.setDate(now.getDate() + 14)
	const uwagiData = futureDate.toLocaleDateString('pl-PL', { day: 'numeric', month: 'numeric', year: 'numeric' })

	const numerZgloszeniaFormat = `${commNumber}/${now.getMonth() + 1}/${fullYear}`

	const fileName = `Komunikat nr ${commNumber}.${monthDigit}.${yearShort}.docx`

	const templatePath = path.join(process.cwd(), 'private', 'document-templates', 'komunikat.docx')
	const content = await fs.readFile(templatePath, 'binary')

	const zip = new PizZip(content)
	const doc = new Docxtemplater(zip, {
		paragraphLoop: true,
		linebreaks: true,
	})

	doc.render({
		numer_zgloszenia: numerZgloszeniaFormat,
		data_zgloszenia: dataZgloszenia,
		nazwa_firmy: submission.companyName,
		adres_firmy: submission.address || 'Brak adresu',
		rekomendacje: submission.recommendations || 'Brak rekomendacji',
		uwagi_data: uwagiData,
	})

	const buffer = doc.getZip().generate({ type: 'nodebuffer' })

	return { buffer, fileName }
}

import jsPDF from 'jspdf'
import { pdfRenderLines } from './pdfUtils'

// Funkcja do konwersji ArrayBuffer na string, potrzebna do osadzenia czcionki
const arrayBufferToString = buffer => {
	let binary = ''
	const bytes = new Uint8Array(buffer)
	for (let i = 0; i < bytes.byteLength; i++) {
		binary += String.fromCharCode(bytes[i])
	}
	return binary
}

// Nowa funkcja generująca estetyczny plik PDF z wynikami ankiety
export const generateSurveyResultsPDF = async (title, formData, fieldLabels = {}) => {
	// Wczytaj czcionki, które obsługują polskie znaki
	// Ścieżki są względne do folderu /public
	const fontRegularBytes = await fetch(new URL('/fonts/Roboto-Regular.ttf', process.env.NEXTAUTH_URL)).then(res =>
		res.arrayBuffer()
	)
	const fontBoldBytes = await fetch(new URL('/fonts/Roboto-Bold.ttf', process.env.NEXTAUTH_URL)).then(res =>
		res.arrayBuffer()
	)

	const fontRegularString = arrayBufferToString(fontRegularBytes)
	const fontBoldString = arrayBufferToString(fontBoldBytes)

	const doc = new jsPDF()

	// Dodaj i zarejestruj czcionki w dokumencie PDF
	doc.addFileToVFS('Roboto-Regular.ttf', fontRegularString)
	doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
	doc.addFileToVFS('Roboto-Bold.ttf', fontBoldString)
	doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

	const pageWidth = doc.internal.pageSize.getWidth()
	const margin = 15
	const contentWidth = pageWidth - margin * 2
	let yPosition = 25

	// Nagłówek
	doc.setFont('Roboto', 'bold')
	doc.setFontSize(16)
	doc.text(title, pageWidth / 2, yPosition, { align: 'center' })
	yPosition += 15

	doc.setLineWidth(0.5)
	doc.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5)

	const LINE_H = 5       // wysokość jednej linii tekstu (pt)
	const Q_GAP = 2        // odstęp między pytaniem a odpowiedzią
	const A_GAP = 10       // odstęp po odpowiedzi
	const PAGE_BOTTOM = 278 // margines dolny (przed stopką)
	const PAGE_TOP = 25

	// Iteracja po danych formularza i ich wyświetlanie
	Object.entries(formData)
		.filter(([key]) => fieldLabels[key]) // Bierzemy tylko te pola, które mają etykietę
		.forEach(([key, value]) => {
			const question = fieldLabels[key] || key
			const answer = value ? value.toString() : 'Brak odpowiedzi'

			doc.setFontSize(10)
			const questionLines = doc.splitTextToSize(question, contentWidth)
			const answerLines = doc.splitTextToSize(answer, contentWidth)

			// Oblicz całkowitą wysokość bloku przed renderowaniem
			const blockHeight = questionLines.length * LINE_H + Q_GAP + answerLines.length * LINE_H + A_GAP

			// Jeśli blok nie zmieści się na bieżącej stronie — zacznij nową
			if (yPosition + blockHeight > PAGE_BOTTOM) {
				doc.addPage()
				yPosition = PAGE_TOP
			}

			// Pytanie
			doc.setFont('Roboto', 'bold')
			doc.setTextColor(60, 60, 60)
			yPosition = pdfRenderLines(doc, questionLines, margin, yPosition, LINE_H, PAGE_BOTTOM, PAGE_TOP)
			yPosition += Q_GAP

			// Odpowiedź
			doc.setFont('Roboto', 'normal')
			doc.setTextColor(0, 0, 0)
			yPosition = pdfRenderLines(doc, answerLines, margin, yPosition, LINE_H, PAGE_BOTTOM, PAGE_TOP)
			yPosition += A_GAP
		})

	// Stopka
	const pageCount = doc.internal.getNumberOfPages()
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i)
		doc.setFont('Roboto', 'normal')
		doc.setFontSize(8)
		doc.setTextColor(150, 150, 150)
		const pageInfo = `Strona ${i} z ${pageCount}`
		const dateInfo = `Wygenerowano: ${new Date().toLocaleDateString('pl-PL')}`
		doc.text(dateInfo, margin, 290)
		doc.text(pageInfo, pageWidth - margin, 290, { align: 'right' })
	}

	return doc.output('arraybuffer')
}

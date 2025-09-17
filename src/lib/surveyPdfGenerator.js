import jsPDF from 'jspdf'

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

	// Iteracja po danych formularza i ich wyświetlanie
	Object.entries(formData)
		.filter(([key]) => fieldLabels[key]) // Bierzemy tylko te pola, które mają etykietę
		.forEach(([key, value]) => {
			if (yPosition > 270) {
				doc.addPage()
				yPosition = 25
			}

			const question = fieldLabels[key] || key
			const answer = value ? value.toString() : 'Brak odpowiedzi'

			// Pytanie
			doc.setFont('Roboto', 'bold')
			doc.setFontSize(10)
			doc.setTextColor(60, 60, 60) // Ciemnoszary dla pytania
			const questionLines = doc.splitTextToSize(question, contentWidth)
			doc.text(questionLines, margin, yPosition)
			yPosition += questionLines.length * 5 + 2 // Odstęp po pytaniu

			// Odpowiedź
			doc.setFont('Roboto', 'normal')
			doc.setFontSize(10)
			doc.setTextColor(0, 0, 0) // Czarny dla odpowiedzi
			const answerLines = doc.splitTextToSize(answer, contentWidth)
			doc.text(answerLines, margin, yPosition)
			yPosition += answerLines.length * 5 + 10 // Większy odstęp po odpowiedzi
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

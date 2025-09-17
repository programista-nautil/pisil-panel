import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Ta funkcja generuje prosty plik PDF z wynikami ankiety
export const generateSurveyResultsPDF = (title, formData) => {
	const doc = new jsPDF()

	doc.setFont('helvetica', 'bold')
	doc.setFontSize(16)
	doc.text(title, 105, 20, { align: 'center' })

	const tableBody = Object.entries(formData).map(([key, value]) => [key, value.toString()])

	autoTable(doc, {
		startY: 30,
		head: [['Pytanie', 'Odpowiedz']],
		body: tableBody,
		theme: 'grid',
		styles: {
			font: 'helvetica',
			fontStyle: 'normal',
		},
		headStyles: {
			fillColor: [41, 128, 185],
			textColor: 255,
			fontStyle: 'bold',
		},
	})

	return doc.output('arraybuffer')
}

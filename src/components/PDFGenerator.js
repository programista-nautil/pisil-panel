'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'

export default function PDFGenerator({ formData, onGenerated, disabled }) {
	const [isGenerating, setIsGenerating] = useState(false)

	const generatePDF = async () => {
		setIsGenerating(true)

		try {
			const pdf = new jsPDF('p', 'mm', 'a4')

			// Konfiguracja czcionki (używamy domyślnej)
			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(12)

			// Tytuł dokumentu
			pdf.setFontSize(16)
			pdf.setFont('helvetica', 'bold')
			pdf.text('DEKLARACJA CZŁONKOWSKA', 105, 20, { align: 'center' })
			pdf.text('Polskiej Izby Specjalistów IT i Logistyki', 105, 28, { align: 'center' })

			// Reset czcionki
			pdf.setFontSize(12)
			pdf.setFont('helvetica', 'normal')

			let yPosition = 50

			// Dane osobowe
			pdf.setFont('helvetica', 'bold')
			pdf.text('DANE OSOBOWE', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Imię: ${formData.firstName}`, 20, yPosition)
			pdf.text(`Nazwisko: ${formData.lastName}`, 120, yPosition)
			yPosition += 8

			pdf.text(`PESEL: ${formData.pesel}`, 20, yPosition)
			pdf.text(`Data urodzenia: ${formData.birthDate}`, 120, yPosition)
			yPosition += 8

			pdf.text(`Miejsce urodzenia: ${formData.birthPlace}`, 20, yPosition)
			yPosition += 15

			// Adres zamieszkania
			pdf.setFont('helvetica', 'bold')
			pdf.text('ADRES ZAMIESZKANIA', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Ulica: ${formData.street}`, 20, yPosition)
			pdf.text(`Nr domu: ${formData.houseNumber}`, 120, yPosition)
			yPosition += 8

			if (formData.apartmentNumber) {
				pdf.text(`Nr lokalu: ${formData.apartmentNumber}`, 20, yPosition)
				yPosition += 8
			}

			pdf.text(`Kod pocztowy: ${formData.postalCode}`, 20, yPosition)
			pdf.text(`Miejscowość: ${formData.city}`, 120, yPosition)
			yPosition += 8

			pdf.text(`Województwo: ${formData.voivodeship}`, 20, yPosition)
			yPosition += 15

			// Kontakt
			pdf.setFont('helvetica', 'bold')
			pdf.text('KONTAKT', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Telefon: ${formData.phone}`, 20, yPosition)
			pdf.text(`Email: ${formData.email}`, 120, yPosition)
			yPosition += 15

			// Wykształcenie i zawód
			pdf.setFont('helvetica', 'bold')
			pdf.text('WYKSZTAŁCENIE I ZAWÓD', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Wykształcenie: ${formData.education}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Zawód: ${formData.profession}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Miejsce pracy: ${formData.workplace}`, 20, yPosition)
			yPosition += 15

			// Rodzaj członkostwa
			const membershipTypeText = {
				ordinary: 'Członek zwyczajny',
				supporting: 'Członek wspierający',
				honorary: 'Członek honorowy',
			}

			pdf.setFont('helvetica', 'bold')
			pdf.text('RODZAJ CZŁONKOSTWA', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Rodzaj: ${membershipTypeText[formData.membershipType]}`, 20, yPosition)
			yPosition += 15

			// Oświadczenia
			pdf.setFont('helvetica', 'bold')
			pdf.text('OŚWIADCZENIA', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text('☑ Oświadczam, że podane przeze mnie dane są prawdziwe i zgodne z rzeczywistością.', 20, yPosition)
			yPosition += 8

			pdf.text(
				'☑ Oświadczam, że zapoznałem się ze statutem PISiL i zobowiązuję się do jego przestrzegania.',
				20,
				yPosition
			)
			yPosition += 8

			pdf.text('☑ Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO.', 20, yPosition)
			yPosition += 20

			// Data i miejsce
			pdf.text(`Data: ${formData.date}`, 20, yPosition)
			pdf.text(`Miejsce: ${formData.place}`, 120, yPosition)
			yPosition += 15

			// Miejsce na podpis
			pdf.text('Podpis:', 20, yPosition)
			pdf.text('_________________________', 20, yPosition + 5)

			// Zapisz PDF
			const pdfBlob = pdf.output('blob')
			const url = URL.createObjectURL(pdfBlob)

			// Automatyczne pobieranie
			const a = document.createElement('a')
			a.href = url
			a.download = `deklaracja_${formData.firstName}_${formData.lastName}.pdf`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)

			URL.revokeObjectURL(url)

			onGenerated()
		} catch (error) {
			console.error('Błąd podczas generowania PDF:', error)
			alert('Wystąpił błąd podczas generowania PDF. Spróbuj ponownie.')
		} finally {
			setIsGenerating(false)
		}
	}

	return (
		<button
			onClick={generatePDF}
			disabled={disabled || isGenerating}
			className={`px-6 py-2 rounded-md font-medium ${
				disabled || isGenerating
					? 'bg-gray-100 text-gray-400 cursor-not-allowed'
					: 'bg-green-600 text-white hover:bg-green-700'
			}`}>
			{isGenerating ? 'Generowanie PDF...' : 'Pobierz PDF'}
		</button>
	)
}

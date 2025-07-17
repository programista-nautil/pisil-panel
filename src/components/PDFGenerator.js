'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'

const PDFGenerator = ({ formData, onGenerated, disabled }) => {
	const [isGenerating, setIsGenerating] = useState(false)

	// Funkcja do bezpiecznego wyświetlania polskich znaków
	const formatText = text => {
		if (!text) return ''
		return text.toString()
	}

	// Ulepszona funkcja do zawijania tekstu z poprawą dla długich słów
	const wrapText = (pdf, text, x, y, maxWidth, lineHeight = 6) => {
		const lines = pdf.splitTextToSize(text, maxWidth)
		lines.forEach((line, index) => {
			pdf.text(line, x, y + index * lineHeight)
		})
		return y + lines.length * lineHeight
	}

	const generatePDF = async () => {
		setIsGenerating(true)

		try {
			// Tworzenie PDF z obsługą UTF-8
			const pdf = new jsPDF({
				orientation: 'p',
				unit: 'mm',
				format: 'a4',
				putOnlyUsedFonts: true,
				compress: true,
			})

			const pageWidth = pdf.internal.pageSize.getWidth()
			const margin = 20
			const contentWidth = pageWidth - margin * 2

			// Nagłówek dokumentu
			pdf.setFontSize(18)
			pdf.setFont('helvetica', 'bold')
			pdf.text('DEKLARACJA CZŁONKOWSKA', pageWidth / 2, 25, { align: 'center' })

			pdf.setFontSize(14)
			pdf.text('Polskiej Izby Specjalistów IT i Logistyki', pageWidth / 2, 35, { align: 'center' })

			// Linia oddzielająca
			pdf.setLineWidth(0.5)
			pdf.line(margin, 45, pageWidth - margin, 45)

			let yPosition = 60

			// ===== DANE PODSTAWOWE FIRMY =====
			pdf.setFontSize(12)
			pdf.setFont('helvetica', 'bold')
			pdf.text('I. DANE PODSTAWOWE FIRMY', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			// Nazwa firmy
			pdf.text('Pełna nazwa firmy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.companyName), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			// NIP i REGON w jednej linii
			pdf.text(`NIP: ${formatText(formData.nip)}`, margin, yPosition)
			pdf.text(`REGON: ${formatText(formData.regon)}`, margin + 80, yPosition)
			yPosition += 8

			// Adres
			pdf.text('Dokładny adres:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.address), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			// Adres korespondencyjny
			pdf.text('Adres do korespondencji:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.correspondenceAddress), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 8

			// ===== KONTAKT =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('II. DANE KONTAKTOWE', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			pdf.text('Numery telefonów:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.phones), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Adres e-mail:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.email), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Adres e-mail do przesyłania faktur:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.invoiceEmail), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			if (formData.website) {
				pdf.text('Strona internetowa:', margin, yPosition)
				yPosition = wrapText(pdf, formatText(formData.website), margin + 5, yPosition + 5, contentWidth - 5)
				yPosition += 3
			}
			yPosition += 8

			// ===== KIEROWNICTWO =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('III. KIEROWNICTWO I REPREZENTACJA', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			pdf.text('Imię i nazwisko kierownika firmy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.ceoName), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Osoby upoważnione do reprezentowania firmy wobec PISiL:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.authorizedPersons), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 8

			// Sprawdź czy trzeba nową stronę
			if (yPosition > 220) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== DANE REJESTRACYJNE =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('IV. DANE REJESTRACYJNE I CERTYFIKATY', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			pdf.text('Data rejestracji firmy, sąd rejestrowy, nr rejestru:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.registrationData), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Forma własności:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.ownershipForm), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Wielkość zatrudnienia:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.employmentSize), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Licencja na pośrednictwo przy przewozie rzeczy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.transportLicense), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Certyfikat ISO 9002:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.iso9002Certificate), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Ubezpieczenie o.c. spedytora:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.insuranceOC), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Opis prowadzonej działalności firmy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.businessDescription), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 8

			// Sprawdź czy trzeba nową stronę
			if (yPosition > 180) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== WACHLARZ USŁUG =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('V. WACHLARZ ŚWIADCZONYCH USŁUG', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			// Usługi transportowe
			const transportServices = []
			if (formData.transportMorski) transportServices.push('Transport morski')
			if (formData.transportKolejowy) transportServices.push('Transport kolejowy')
			if (formData.transportLotniczy) transportServices.push('Transport lotniczy')
			if (formData.logistyka) transportServices.push('Logistyka')
			if (formData.transportDrogowy) transportServices.push('Transport drogowy')
			if (formData.taborWlasny) transportServices.push('Taborem własnym')
			if (formData.taborObcy) transportServices.push('Taborem obcym')
			if (formData.transportInne) transportServices.push('Inne usługi transportowe')

			pdf.text('Usługi transportowe:', margin, yPosition)
			if (transportServices.length > 0) {
				yPosition = wrapText(pdf, formatText(transportServices.join(', ')), margin + 5, yPosition + 5, contentWidth - 5)
			} else {
				yPosition = wrapText(pdf, 'Brak', margin + 5, yPosition + 5, contentWidth - 5)
			}
			yPosition += 3

			// Usługi magazynowe
			const magazynServices = []
			if (formData.magazynWlasny) magazynServices.push('Magazyn własny')
			if (formData.magazynObcy) magazynServices.push('Magazyn obcy')

			pdf.text('Usługi magazynowo-dystrybucyjne:', margin, yPosition)
			if (magazynServices.length > 0) {
				yPosition = wrapText(pdf, formatText(magazynServices.join(', ')), margin + 5, yPosition + 5, contentWidth - 5)
			} else {
				yPosition = wrapText(pdf, 'Brak', margin + 5, yPosition + 5, contentWidth - 5)
			}
			yPosition += 3

			// Organizacja przewozów
			pdf.text('Organizacja przewozów drobnicy zbiorowe:', margin, yPosition)
			yPosition = wrapText(
				pdf,
				formData.organizacjaPrzewozow ? 'Tak' : 'Nie',
				margin + 5,
				yPosition + 5,
				contentWidth - 5
			)
			yPosition += 3

			// Agencje celne
			pdf.text('Agencje celne:', margin, yPosition)
			yPosition = wrapText(pdf, formData.agencjeCelne ? 'Tak' : 'Nie', margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			// Sieć krajowa
			pdf.text('Sieć krajowa (ilość oddziałów):', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.krajowaSiec), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			// Sieć zagraniczna
			pdf.text('Sieć zagraniczna (ilość firm własnych / ilość korespondentów):', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.zagranicznaSSiec), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			// Inne formy współpracy
			pdf.text('Inne formy współpracy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.inneFormy), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 8

			// ===== CZŁONKOSTWO =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('VI. CZŁONKOSTWO W ORGANIZACJACH', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			pdf.text('Do jakich organizacji firma należy i od kiedy:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.organizacje), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 3

			pdf.text('Firmy-Członkowie Izby rekomendujący przystąpienie do PISiL:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.rekomendacje), margin + 5, yPosition + 5, contentWidth - 5)
			yPosition += 8

			// Sprawdź czy trzeba nową stronę dla oświadczenia
			if (yPosition > 210) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== OŚWIADCZENIE =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('VII. OŚWIADCZENIE', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			const declarationText =
				'Oświadczam, że zapoznałem/zapoznałam się z treścią Statutu PISiL i jednocześnie zobowiązuję się do przestrzegania zawartych w nim postanowień.'
			yPosition = wrapText(pdf, `[✓] ${declarationText}`, margin, yPosition, contentWidth)
			yPosition += 15

			// Sprawdź czy trzeba nową stronę dla podpisu
			if (yPosition > 240) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== PODPIS =====
			pdf.setFont('helvetica', 'bold')
			pdf.setFontSize(12)
			pdf.text('VIII. PODPIS', margin, yPosition)
			yPosition += 12

			pdf.setFont('helvetica', 'normal')
			pdf.setFontSize(10)

			pdf.text('Imię i nazwisko:', margin, yPosition)
			yPosition = wrapText(pdf, formatText(formData.signatoryName), margin + 5, yPosition + 5, 80)

			pdf.text('Stanowisko:', margin + 90, yPosition - 8)
			wrapText(pdf, formatText(formData.signatoryPosition), margin + 95, yPosition - 3, 80)
			yPosition += 15

			// Miejsce na podpis
			pdf.text('Podpis:', margin, yPosition)
			pdf.text('Data:', margin + 90, yPosition)
			yPosition += 10

			pdf.text('_________________________________', margin, yPosition)
			pdf.text('_________________', margin + 90, yPosition)

			// Stopka
			yPosition += 20
			if (yPosition > 280) {
				pdf.addPage()
				yPosition = 260
			}
			pdf.setFontSize(8)
			pdf.setFont('helvetica', 'italic')
			pdf.text('Deklaracja członkowska - Polska Izba Specjalistów IT i Logistyki', pageWidth / 2, yPosition, {
				align: 'center',
			})

			// Zapisz PDF
			const pdfBlob = pdf.output('blob')
			const url = URL.createObjectURL(pdfBlob)

			// Automatyczne pobieranie
			const a = document.createElement('a')
			a.href = url
			a.download = `deklaracja_czlonkowska_${formData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
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

export default PDFGenerator

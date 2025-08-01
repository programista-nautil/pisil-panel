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
		pdf.text(lines, x, y)
		return y + lines.length * lineHeight
	}

	// Funkcja do konwersji ArrayBuffer na string binarny
	const arrayBufferToString = buffer => {
		let binary = ''
		const bytes = new Uint8Array(buffer)
		const len = bytes.byteLength
		for (let i = 0; i < len; i++) {
			binary += String.fromCharCode(bytes[i])
		}
		return binary
	}

	const generatePDF = async () => {
		setIsGenerating(true)

		try {
			// Wczytaj czcionki, które obsługują polskie znaki
			const fontRegularBytes = await fetch('/fonts/Roboto-Regular.ttf').then(res => res.arrayBuffer())
			const fontBoldBytes = await fetch('/fonts/Roboto-Bold.ttf').then(res => res.arrayBuffer())

			const fontRegularString = arrayBufferToString(fontRegularBytes)
			const fontBoldString = arrayBufferToString(fontBoldBytes)

			// Tworzenie PDF z obsługą UTF-8
			const pdf = new jsPDF({
				orientation: 'p',
				unit: 'mm',
				format: 'a4',
				putOnlyUsedFonts: true,
				compress: true,
			})

			// Dodaj czcionki do wirtualnego systemu plików PDF
			pdf.addFileToVFS('Roboto-Regular.ttf', fontRegularString)
			pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')

			pdf.addFileToVFS('Roboto-Bold.ttf', fontBoldString)
			pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

			const pageWidth = pdf.internal.pageSize.getWidth()
			const margin = 20
			const contentWidth = pageWidth - margin * 2

			// Nagłówek dokumentu
			pdf.setFontSize(18)
			pdf.setFont('Roboto', 'bold')
			pdf.text('DEKLARACJA CZŁONKOWSKA', pageWidth / 2, 25, { align: 'center' })

			pdf.setFontSize(14)
			pdf.text('Polskiej Izby Specjalistów IT i Logistyki', pageWidth / 2, 35, { align: 'center' })

			// Linia oddzielająca
			pdf.setLineWidth(0.5)
			pdf.line(margin, 45, pageWidth - margin, 45)

			let yPosition = 60

			// ===== DANE PODSTAWOWE FIRMY =====
			pdf.setFontSize(12)
			pdf.setFont('Roboto', 'bold')
			pdf.text('I. DANE PODSTAWOWE FIRMY', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			yPosition = wrapText(
				pdf,
				`Pełna nazwa firmy: ${formatText(formData.companyName)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			pdf.text(`NIP: ${formatText(formData.nip)}`, margin, yPosition)
			pdf.text(`REGON: ${formatText(formData.regon)}`, margin + 80, yPosition)
			yPosition += 8

			yPosition = wrapText(pdf, `Dokładny adres: ${formatText(formData.address)}`, margin, yPosition, contentWidth)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Adres do korespondencji: ${formatText(formData.correspondenceAddress)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 8

			// ===== KONTAKT =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('II. DANE KONTAKTOWE', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			yPosition = wrapText(pdf, `Numery telefonów: ${formatText(formData.phones)}`, margin, yPosition, contentWidth)
			yPosition += 3

			yPosition = wrapText(pdf, `Adres e-mail: ${formatText(formData.email)}`, margin, yPosition, contentWidth)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Adres e-mail do przesyłania faktur: ${formatText(formData.invoiceEmail)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			if (formData.website) {
				yPosition = wrapText(
					pdf,
					`Strona internetowa: ${formatText(formData.website)}`,
					margin,
					yPosition,
					contentWidth
				)
				yPosition += 3
			}
			yPosition += 8

			// ===== KIEROWNICTWO =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('III. KIEROWNICTWO I REPREZENTACJA', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			yPosition = wrapText(
				pdf,
				`Imię i nazwisko kierownika firmy: ${formatText(formData.ceoName)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Osoby upoważnione do reprezentowania firmy wobec PISiL: ${formatText(formData.authorizedPersons)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 8

			if (yPosition > 220) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== DANE REJESTRACYJNE =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('IV. DANE REJESTRACYJNE I CERTYFIKATY', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			yPosition = wrapText(
				pdf,
				`Data rejestracji firmy, sąd rejestrowy, nr rejestru: ${formatText(formData.registrationData)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Forma własności: ${formatText(formData.ownershipForm)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Wielkość zatrudnienia: ${formatText(formData.employmentSize)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Licencja na pośrednictwo przy przewozie rzeczy: ${formatText(formData.transportLicense)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Certyfikat ISO 9002: ${formatText(formData.iso9002Certificate)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Ubezpieczenie o.c. spedytora: ${formatText(formData.insuranceOC)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Opis prowadzonej działalności firmy: ${formatText(formData.businessDescription)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 8

			if (yPosition > 180) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== WACHLARZ USŁUG =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('V. WACHLARZ ŚWIADCZONYCH USŁUG', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			const transportServices = [
				formData.transportMorski && 'Transport morski',
				formData.transportKolejowy && 'Transport kolejowy',
				formData.transportLotniczy && 'Transport lotniczy',
				formData.logistyka && 'Logistyka',
				formData.transportDrogowy && 'Transport drogowy',
				formData.taborWlasny && 'Taborem własnym',
				formData.taborObcy && 'Taborem obcym',
				formData.transportInne && 'Inne usługi transportowe',
			].filter(Boolean)

			yPosition = wrapText(
				pdf,
				`Usługi transportowe: ${transportServices.length > 0 ? formatText(transportServices.join(', ')) : 'Brak'}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			const magazynServices = [
				formData.magazynWlasny && 'Magazyn własny',
				formData.magazynObcy && 'Magazyn obcy',
			].filter(Boolean)

			yPosition = wrapText(
				pdf,
				`Usługi magazynowo-dystrybucyjne: ${
					magazynServices.length > 0 ? formatText(magazynServices.join(', ')) : 'Brak'
				}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Organizacja przewozów drobnicy zbiorowe: ${formData.organizacjaPrzewozow ? 'Tak' : 'Nie'}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Agencje celne: ${formData.agencjeCelne ? 'Tak' : 'Nie'}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Sieć krajowa (ilość oddziałów): ${formatText(formData.krajowaSiec)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Sieć zagraniczna (ilość firm własnych / ilość korespondentów): ${formatText(formData.zagranicznaSSiec)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Inne formy współpracy: ${formatText(formData.inneFormy)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 8

			// ===== CZŁONKOSTWO =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('VI. CZŁONKOSTWO W ORGANIZACJACH', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			yPosition = wrapText(
				pdf,
				`Do jakich organizacji firma należy i od kiedy: ${formatText(formData.organizacje)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 3

			yPosition = wrapText(
				pdf,
				`Firmy-Członkowie Izby rekomendujący przystąpienie do PISiL: ${formatText(formData.rekomendacje)}`,
				margin,
				yPosition,
				contentWidth
			)
			yPosition += 8

			if (yPosition > 210) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== OŚWIADCZENIE =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('VII. OŚWIADCZENIE', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			const declarationText =
				'Oświadczam, że zapoznałem/zapoznałam się z treścią Statutu PISiL i jednocześnie zobowiązuję się do przestrzegania zawartych w nim postanowień.'
			const checkbox = formData.declarationStatute ? '[X]' : '[ ]'
			yPosition = wrapText(pdf, `${checkbox} ${declarationText}`, margin, yPosition, contentWidth)
			yPosition += 15

			if (yPosition > 240) {
				pdf.addPage()
				yPosition = 30
			}

			// ===== PODPIS =====
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('VIII. PODPIS', margin, yPosition)
			yPosition += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)

			pdf.text(`${formatText(formData.signatoryName)}`, margin, yPosition)
			yPosition += 8 // Odstęp między liniami
			pdf.text(`${formatText(formData.signatoryPosition)}`, margin, yPosition)
			yPosition += 15

			pdf.text('Data:', margin, yPosition)
			pdf.text('Podpis:', margin + 90, yPosition)
			yPosition += 10

			pdf.line(margin, yPosition, margin + 60, yPosition) // Linia pod datą
			pdf.line(margin + 90, yPosition, margin + 150, yPosition) // Linia pod podpisem

			// Stopka
			const pageHeight = pdf.internal.pageSize.getHeight()
			pdf.setFontSize(8)
			pdf.setFont('Roboto', 'normal')
			pdf.text('Deklaracja członkowska - Polska Izba Specjalistów IT i Logistyki', pageWidth / 2, pageHeight - 15, {
				align: 'center',
			})

			// Zapisz PDF
			const pdfBlob = pdf.output('blob')
			const url = URL.createObjectURL(pdfBlob)

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

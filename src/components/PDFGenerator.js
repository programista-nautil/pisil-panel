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

			// Dane podstawowe firmy
			pdf.setFont('helvetica', 'bold')
			pdf.text('DANE PODSTAWOWE FIRMY', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Pełna nazwa firmy: ${formData.companyName}`, 20, yPosition)
			yPosition += 8

			pdf.text(`NIP: ${formData.nip}`, 20, yPosition)
			pdf.text(`REGON: ${formData.regon}`, 120, yPosition)
			yPosition += 8

			pdf.text(`Adres: ${formData.address}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Adres korespondencyjny: ${formData.correspondenceAddress}`, 20, yPosition)
			yPosition += 15

			// Kontakt
			pdf.setFont('helvetica', 'bold')
			pdf.text('KONTAKT', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Telefony: ${formData.phones}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Email: ${formData.email}`, 20, yPosition)
			pdf.text(`Email faktur: ${formData.invoiceEmail}`, 120, yPosition)
			yPosition += 8

			if (formData.website) {
				pdf.text(`Strona: ${formData.website}`, 20, yPosition)
				yPosition += 8
			}
			yPosition += 7

			// Kierownictwo
			pdf.setFont('helvetica', 'bold')
			pdf.text('KIEROWNICTWO', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Kierownik firmy: ${formData.ceoName}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Osoby upoważnione: ${formData.authorizedPersons}`, 20, yPosition)
			yPosition += 15

			// Dane rejestracyjne - nowa strona jeśli potrzeba
			if (yPosition > 200) {
				pdf.addPage()
				yPosition = 30
			}

			pdf.setFont('helvetica', 'bold')
			pdf.text('DANE REJESTRACYJNE I CERTYFIKATY', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Rejestracja: ${formData.registrationData}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Forma własności: ${formData.ownershipForm}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Zatrudnienie: ${formData.employmentSize}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Licencja transportowa: ${formData.transportLicense}`, 20, yPosition)
			yPosition += 8

			pdf.text(`ISO 9002: ${formData.iso9002Certificate}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Ubezpieczenie OC: ${formData.insuranceOC}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Opis działalności: ${formData.businessDescription}`, 20, yPosition)
			yPosition += 15

			// Usługi transportowe
			pdf.setFont('helvetica', 'bold')
			pdf.text('WACHLARZ ŚWIADCZONYCH USŁUG', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')

			const transportServices = []
			if (formData.transportMorski) transportServices.push('Transport morski')
			if (formData.transportKolejowy) transportServices.push('Transport kolejowy')
			if (formData.transportLotniczy) transportServices.push('Transport lotniczy')
			if (formData.logistyka) transportServices.push('Logistyka')
			if (formData.transportDrogowy) transportServices.push('Transport drogowy')
			if (formData.taborWlasny) transportServices.push('Taborem własnym')
			if (formData.taborObcy) transportServices.push('Taborem obcym')
			if (formData.transportInne) transportServices.push('Inne usługi transportowe')

			if (transportServices.length > 0) {
				pdf.text(`Usługi transportowe: ${transportServices.join(', ')}`, 20, yPosition)
				yPosition += 8
			}

			const magazynServices = []
			if (formData.magazynWlasny) magazynServices.push('Magazyn własny')
			if (formData.magazynObcy) magazynServices.push('Magazyn obcy')

			if (magazynServices.length > 0) {
				pdf.text(`Usługi magazynowe: ${magazynServices.join(', ')}`, 20, yPosition)
				yPosition += 8
			}

			if (formData.organizacjaPrzewozow) {
				pdf.text('Organizacja przewozów drobnicy zbiorowe: Tak', 20, yPosition)
				yPosition += 8
			}

			if (formData.agencjeCelne) {
				pdf.text('Agencje celne: Tak', 20, yPosition)
				yPosition += 8
			}

			pdf.text(`Sieć krajowa: ${formData.krajowaSiec}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Sieć zagraniczna: ${formData.zagranicznaSSiec}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Inne formy współpracy: ${formData.inneFormy}`, 20, yPosition)
			yPosition += 15

			// Członkostwo
			pdf.setFont('helvetica', 'bold')
			pdf.text('CZŁONKOSTWO W ORGANIZACJACH', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text(`Organizacje: ${formData.organizacje}`, 20, yPosition)
			yPosition += 8

			pdf.text(`Rekomendacje: ${formData.rekomendacje}`, 20, yPosition)
			yPosition += 15

			// Oświadczenie
			pdf.setFont('helvetica', 'bold')
			pdf.text('OŚWIADCZENIE', 20, yPosition)
			yPosition += 10

			pdf.setFont('helvetica', 'normal')
			pdf.text('☑ Oświadczam, że zapoznałem się z treścią Statutu PISiL', 20, yPosition)
			yPosition += 5
			pdf.text('   i zobowiązuję się do przestrzegania zawartych w nim postanowień.', 20, yPosition)
			yPosition += 15

			// Podpis
			pdf.text(`Imię i nazwisko: ${formData.signatoryName}`, 20, yPosition)
			pdf.text(`Stanowisko: ${formData.signatoryPosition}`, 120, yPosition)
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
			a.download = `deklaracja_${formData.companyName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
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

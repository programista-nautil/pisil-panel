'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import { sanitizeFilename } from '@/lib/utils'

const PatronatPDFGenerator = ({ formData, onGenerated, disabled }) => {
	const [isGenerating, setIsGenerating] = useState(false)

	// Bezpieczne formatowanie tekstu z polskimi znakami
	const formatText = text => {
		if (!text) return ''
		return text.toString()
	}

	// Zawijanie tekstu do szerokości
	const wrapText = (pdf, text, x, y, maxWidth, lineHeight = 6) => {
		const lines = pdf.splitTextToSize(text, maxWidth)
		pdf.text(lines, x, y)
		return y + lines.length * lineHeight
	}

	// Konwersja ArrayBuffer -> string dla czcionek
	const arrayBufferToString = buffer => {
		let binary = ''
		const bytes = new Uint8Array(buffer)
		const len = bytes.byteLength
		for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
		return binary
	}

	const generatePDF = async () => {
		setIsGenerating(true)
		try {
			// Data (opcjonalnie do stopki)
			const currentDate = new Date().toLocaleDateString('pl-PL', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
			})

			// Wczytaj czcionki (UTF-8)
			const fontRegularBytes = await fetch('/fonts/Roboto-Regular.ttf').then(res => res.arrayBuffer())
			const fontBoldBytes = await fetch('/fonts/Roboto-Bold.ttf').then(res => res.arrayBuffer())

			const fontRegularString = arrayBufferToString(fontRegularBytes)
			const fontBoldString = arrayBufferToString(fontBoldBytes)

			const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true })

			// Rejestracja czcionek
			pdf.addFileToVFS('Roboto-Regular.ttf', fontRegularString)
			pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
			pdf.addFileToVFS('Roboto-Bold.ttf', fontBoldString)
			pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

			const pageWidth = pdf.internal.pageSize.getWidth()
			const pageHeight = pdf.internal.pageSize.getHeight()
			const margin = 20
			const contentWidth = pageWidth - margin * 2

			// Nagłówek
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(18)
			pdf.text('WNIOSEK O PATRONAT', pageWidth / 2, 25, { align: 'center' })
			pdf.setFontSize(14)
			pdf.text('Polska Izba Spedycji i Logistyki', pageWidth / 2, 35, { align: 'center' })

			pdf.setLineWidth(0.5)
			pdf.line(margin, 45, pageWidth - margin, 45)

			let y = 60

			const ensureSpace = extra => {
				if (y + extra > pageHeight - 20) {
					pdf.addPage()
					y = 30
				}
			}

			// Sekcja I: Dane kontaktowe wniosku
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('I. DANE KONTAKTOWE WNIOSKU', margin, y)
			y += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)
			y = wrapText(pdf, `Adres e-mail: ${formatText(formData.email)}`, margin, y, contentWidth)
			y += 3
			y = wrapText(pdf, `Rodzaj wniosku: ${formatText(formData.requestType)}`, margin, y, contentWidth)
			y += 8

			// Sekcja II: Informacja o organizatorze
			ensureSpace(24)
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('II. INFORMACJA O ORGANIZATORZE', margin, y)
			y += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)
			y = wrapText(pdf, `Nazwa organizatora: ${formatText(formData.organizerName)}`, margin, y, contentWidth)
			y += 3
			y = wrapText(
				pdf,
				`Osoba odpowiedzialna za kontakt: ${formatText(formData.contactPerson)}`,
				margin,
				y,
				contentWidth
			)
			y += 3
			y = wrapText(
				pdf,
				`Krótka charakterystyka organizatora: ${formatText(formData.organizerDescription)}`,
				margin,
				y,
				contentWidth
			)
			y += 8

			// Sekcja III: Opis wydarzenia
			ensureSpace(24)
			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(12)
			pdf.text('III. OPIS WYDARZENIA', margin, y)
			y += 12

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(10)
			y = wrapText(pdf, `Nazwa wydarzenia: ${formatText(formData.eventName)}`, margin, y, contentWidth)
			y += 3

			// Opcjonalne: opis wydarzenia – POMIŃ jeśli puste (czytelniej w PDF)
			if (formData.eventDescription) {
				y = wrapText(pdf, `Opis wydarzenia: ${formatText(formData.eventDescription)}`, margin, y, contentWidth)
				y += 3
			}

			y = wrapText(pdf, `Termin i miejsce: ${formatText(formData.eventDateAndPlace)}`, margin, y, contentWidth)
			y += 3

			// Partnerzy/sponsorzy – pokaż „Brak” gdy puste (pole często istotne decyzyjnie)
			const partnersText = formData.partners && formData.partners.trim().length > 0 ? formData.partners : 'Brak'
			y = wrapText(pdf, `Partnerzy / sponsorzy wydarzenia: ${formatText(partnersText)}`, margin, y, contentWidth)
			y += 3

			// Patroni – także „Brak” jeśli puste
			const patronsText =
				formData.eventPatrons && formData.eventPatrons.trim().length > 0 ? formData.eventPatrons : 'Brak'
			y = wrapText(pdf, `Patroni wydarzenia: ${formatText(patronsText)}`, margin, y, contentWidth)
			y += 3

			// Mapowanie zasięgu
			const reachMap = {
				ponizej_100: 'poniżej 100',
				powyzej_100: 'powyżej 100',
			}
			const reach = reachMap[formData.eventReach] || formatText(formData.eventReach)
			y = wrapText(pdf, `Zasięg wydarzenia: ${reach}`, margin, y, contentWidth)
			y += 3

			y = wrapText(
				pdf,
				`Oczekiwane świadczenie od PISiL: ${formatText(formData.expectedService)}`,
				margin,
				y,
				contentWidth
			)
			y += 3

			y = wrapText(
				pdf,
				`Oferta dla PISiL i jej członków: ${formatText(formData.offerForPISIL)}`,
				margin,
				y,
				contentWidth
			)
			y += 3

			// Opcjonalne: dodatkowe informacje – POMIŃ jeśli puste
			if (formData.additionalInfo) {
				y = wrapText(pdf, `Dodatkowe informacje: ${formatText(formData.additionalInfo)}`, margin, y, contentWidth)
				y += 3
			}

			// Stopka
			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(8)
			pdf.text(
				`Wniosek o Patronat — Polska Izba Spedycji i Logistyki | Data: ${currentDate}`,
				pageWidth / 2,
				pageHeight - 12,
				{ align: 'center' }
			)

			// Zapis
			const safeName = sanitizeFilename(formData.eventName || 'formularz')
			const pdfBlob = pdf.output('blob')
			const url = URL.createObjectURL(pdfBlob)
			const a = document.createElement('a')
			a.href = url
			a.download = `wniosek_patronat_${safeName}.pdf`
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)

			onGenerated()
		} catch (error) {
			console.error('Błąd generowania PDF:', error)
			toast.error('Wystąpił błąd podczas generowania PDF.')
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

export default PatronatPDFGenerator

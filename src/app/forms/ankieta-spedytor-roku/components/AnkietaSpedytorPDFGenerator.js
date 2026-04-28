'use client'

import { useState } from 'react'
import jsPDF from 'jspdf'
import toast from 'react-hot-toast'
import { sanitizeFilename } from '@/lib/utils'
import { pdfRenderLines } from '@/lib/pdfUtils'

const AnkietaSpedytorPDFGenerator = ({ formData, onGenerated, disabled }) => {
	const [isGenerating, setIsGenerating] = useState(false)

	const arrayBufferToString = buffer => {
		let binary = ''
		const bytes = new Uint8Array(buffer)
		for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
		return binary
	}

	const generatePDF = async () => {
		setIsGenerating(true)
		try {
			const fontRegularBytes = await fetch('/fonts/Roboto-Regular.ttf').then(r => r.arrayBuffer())
			const fontBoldBytes = await fetch('/fonts/Roboto-Bold.ttf').then(r => r.arrayBuffer())

			const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', putOnlyUsedFonts: true, compress: true })

			pdf.addFileToVFS('Roboto-Regular.ttf', arrayBufferToString(fontRegularBytes))
			pdf.addFont('Roboto-Regular.ttf', 'Roboto', 'normal')
			pdf.addFileToVFS('Roboto-Bold.ttf', arrayBufferToString(fontBoldBytes))
			pdf.addFont('Roboto-Bold.ttf', 'Roboto', 'bold')

			const pageW = pdf.internal.pageSize.getWidth()
			const pageH = pdf.internal.pageSize.getHeight()
			const margin = 15
			const contentW = pageW - margin * 2
			const pageBottom = pageH - 15
			const pageTop = 30

			const f = key => (formData[key] != null ? String(formData[key]) : '')

			let y = 20

			const ensureSpace = needed => {
				if (y + needed > pageBottom) {
					pdf.addPage()
					y = pageTop
				}
			}

			// ── Tabela z 4 kolumnami: opis | 2024 | 2025 | Punkty ────────────────
			// colW: szerokości kolumn w mm (suma = contentW = 180)
			const drawTable = (rows, colW, rowH = 7) => {
				const totalW = colW.reduce((a, b) => a + b, 0)
				const HEADER_H = rowH + 1

				rows.forEach((row, ri) => {
					const h = ri === 0 ? HEADER_H : rowH
					ensureSpace(h + 1)

					if (ri === 0) {
						// Nagłówek — ciemnoniebieski
						pdf.setFillColor(0, 86, 152)
						pdf.rect(margin, y - h + 2, totalW, h, 'F')
						pdf.setTextColor(255, 255, 255)
						pdf.setFont('Roboto', 'bold')
						pdf.setFontSize(8)
					} else {
						// Naprzemienne jasne tło
						pdf.setFillColor(ri % 2 === 1 ? 255 : 245, ri % 2 === 1 ? 255 : 247, ri % 2 === 1 ? 255 : 252)
						pdf.rect(margin, y - h + 2, totalW, h, 'F')
						pdf.setTextColor(0, 0, 0)
						pdf.setFont('Roboto', 'normal')
						pdf.setFontSize(8)
					}

					// Ramka wiersza
					pdf.setDrawColor(190, 190, 190)
					pdf.setLineWidth(0.2)
					pdf.rect(margin, y - h + 2, totalW, h, 'S')

					// Pionowe linie między kolumnami
					let cx = margin
					colW.forEach((w, ci) => {
						cx += w
						if (ci < colW.length - 1) pdf.line(cx, y - h + 2, cx, y - h + 2 + h)
					})

					// Tekst komórek (lewa kolumna wyrównana do lewej, pozostałe centralnie)
					let tx = margin
					row.forEach((cell, ci) => {
						const text = String(cell ?? '')
						const cellInner = colW[ci] - 4
						const lines = pdf.splitTextToSize(text, cellInner)
						if (ci === 0) {
							pdf.text(lines[0] ?? '', tx + 2, y)
						} else {
							// Wyśrodkuj w komórce
							const tw = pdf.getTextWidth(lines[0] ?? '')
							pdf.text(lines[0] ?? '', tx + (colW[ci] - tw) / 2, y)
						}
						tx += colW[ci]
					})

					y += h
				})

				pdf.setTextColor(0, 0, 0)
				y += 3
			}

			// ── Tabela z auto-wysokością wierszy (sekcje 1, 2, 8–12) ─────────────
			const drawTextTable = (rows, colW) => {
				const totalW = colW.reduce((a, b) => a + b, 0)
				const lineH = 4.5
				const padTop = 2
				const padBot = 3

				rows.forEach((row, ri) => {
					const isHeader = ri === 0
					pdf.setFontSize(8)
					pdf.setFont('Roboto', isHeader ? 'bold' : 'normal')

					const cellLines = row.map((cell, ci) =>
						pdf.splitTextToSize(String(cell ?? ''), colW[ci] - 4)
					)
					const maxLines = Math.max(...cellLines.map(l => l.length), 1)
					const rowH = maxLines * lineH + padTop + padBot

					ensureSpace(rowH + 1)

					if (isHeader) {
						pdf.setFillColor(0, 86, 152)
						pdf.rect(margin, y, totalW, rowH, 'F')
						pdf.setTextColor(255, 255, 255)
						pdf.setFont('Roboto', 'bold')
					} else {
						pdf.setFillColor(ri % 2 === 1 ? 255 : 245, ri % 2 === 1 ? 255 : 247, ri % 2 === 1 ? 255 : 252)
						pdf.rect(margin, y, totalW, rowH, 'F')
						pdf.setTextColor(0, 0, 0)
						pdf.setFont('Roboto', 'normal')
					}
					pdf.setFontSize(8)

					pdf.setDrawColor(190, 190, 190)
					pdf.setLineWidth(0.2)
					pdf.rect(margin, y, totalW, rowH, 'S')

					let cx = margin
					colW.forEach((w, ci) => {
						cx += w
						if (ci < colW.length - 1) pdf.line(cx, y, cx, y + rowH)
					})

					let tx = margin
					row.forEach((cell, ci) => {
						cellLines[ci].forEach((line, li) => {
							const textY = y + padTop + 3.5 + li * lineH
							if (ci === 0) {
								pdf.text(line, tx + 2, textY)
							} else {
								const tw = pdf.getTextWidth(line)
								pdf.text(line, tx + (colW[ci] - tw) / 2, textY)
							}
						})
						tx += colW[ci]
					})

					y += rowH
				})

				pdf.setTextColor(0, 0, 0)
				y += 3
			}

			// ════════════════════════════════════════════════════════════════════
			// NAGŁÓWEK DOKUMENTU
			// ════════════════════════════════════════════════════════════════════

			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(16)
			pdf.text('ANKIETA SPEDYTOR ROKU', pageW / 2, y, { align: 'center' })
			y += 6
			pdf.setFontSize(10)
			pdf.text('Polska Izba Spedycji i Logistyki', pageW / 2, y, { align: 'center' })
			y += 5
			pdf.setLineWidth(0.6)
			pdf.line(margin, y, pageW - margin, y)
			y += 8

			// ── 1. Nazwa firmy i adres ────────────────────────────────────────────

			drawTextTable([
				['1   Nazwa firmy i adres'],
				[f('companyNameAndAddress') || '—'],
			], [contentW])

			// ── 2. Struktura sprzedaży ─────────────────────────────────────────────

			drawTextTable([
				['2   Struktura sprzedaży w procentach'],
				[f('salesStructure') || '—'],
			], [contentW])

			// ── 3. Pracownicy ─────────────────────────────────────────────────────
			// Kolumny: opis (110) | 2024 (25) | 2025 (25) | Punkty (20)

			const colW3 = [110, 25, 25, 20]
			drawTable([
				['3   Pracownicy', 'Rok 2024', 'Rok 2025', '0-2'],
				['3a  Zatrudnienie na koniec roku', f('zatrudnienieKoniecRoku_2024'), f('zatrudnienieKoniecRoku_2025'), ''],
				['3b  Liczba pracowników mających dyplom FIATA', f('pracownicyDyplomFIATA_2024'), f('pracownicyDyplomFIATA_2025'), ''],
				['3c  Liczba pracowników w szkoleniach wewnętrznych (tytuły szkoleń)', f('szkoleniaWewnetrzne_2024'), f('szkoleniaWewnetrzne_2025'), ''],
				['3d  Liczba pracowników w szkoleniach zewnętrznych (tytuły szkoleń)', f('szkoleniaZewnetrzne_2024'), f('szkoleniaZewnetrzne_2025'), ''],
			], colW3)

			// ── 4. Wyniki finansowe ───────────────────────────────────────────────
			// Kolumny: opis (110) | 2024 (25) | 2025 (25) | Punkty (20)

			const colW4 = [110, 25, 25, 20]
			drawTable([
				['4   Wyniki finansowe', 'Rok 2024', 'Rok 2025', '0-3'],
				['4a  Przychody netto ze sprzedaży i zrównane z nimi', f('przychodyNetto_2024'), f('przychodyNetto_2025'), ''],
				['4b  Koszty działalności operacyjnej', f('kosztyDzialalnosciOperacyjnej_2024'), f('kosztyDzialalnosciOperacyjnej_2025'), ''],
				['4c  Zysk/strata ze sprzedaży (4a-4b)', f('zyskStrataZeSprzedazy_2024'), f('zyskStrataZeSprzedazy_2025'), ''],
				[
					'4d  Wynik na pozostałej działalności operacyjnej\n    (pozostałe przychody - pozostałe koszty)',
					f('wynikNaPozostalejDzialalnosci_2024'),
					f('wynikNaPozostalejDzialalnosci_2025'),
					'',
				],
				['4f  Wynik na działalności finansowej\n    (przychody finansowe - koszty finansowe)', f('wynikNaDzialalnosciFinansowej_2024'), f('wynikNaDzialalnosciFinansowej_2025'), ''],
				['4g  Zysk/strata brutto (4c +/- 4d +/- 4f)', f('zyskStrataBrutto_2024'), f('zyskStrataBrutto_2025'), ''],
				['4h  Wartość sprzedaży na 1 pracownika', f('wartoscSprzedazyNaPracownika_2024'), f('wartoscSprzedazyNaPracownika_2025'), ''],
				['4i  Zysk ze sprzedaży na 1 pracownika', f('zyskZeSprzedazyNaPracownika_2024'), f('zyskZeSprzedazyNaPracownika_2025'), ''],
				['4j  Wartość inwestycji ogółem', f('wartoscInwestycjiOgolem_2024'), f('wartoscInwestycjiOgolem_2025'), ''],
				['4k  Rentowność sprzedaży netto\n    (zysk netto / przychody netto ze sprzedaży)', f('rentownoscSprzedazyNetto_2024'), f('rentownoscSprzedazyNetto_2025'), ''],
			], colW4)

			// ── 5. Płynność finansowa ─────────────────────────────────────────────

			drawTable([
				['5   Płynność finansowa', 'Rok 2024', 'Rok 2025', '0-7'],
				['5a  Średni termin realizacji zobowiązań (w dniach)', f('sredniTerminRealizacjiZobowiazan_2024'), f('sredniTerminRealizacjiZobowiazan_2025'), ''],
				['5b  Wskaźnik zadłużenia DR* (na 31.12)', f('wskaznikZadluzeniaDR_2024'), f('wskaznikZadluzeniaDR_2025'), ''],
				['5c  Wskaźnik bieżącej płynności finansowej CR** (na 31.12)', f('wskaznikZadluzeniaCR_2024'), f('wskaznikZadluzeniaCR_2025'), ''],
				['5d  Średni termin realizacji należności (w dniach)', f('sredniTerminRealizacjiNaleznosci_2024'), f('sredniTerminRealizacjiNaleznosci_2025'), ''],
			], colW4)

			// Legendy wskaźników
			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(7)
			pdf.setTextColor(80, 80, 80)
			const legend1 = '* debt ratio DR – wskaźnik ogólnego zadłużenia; stosunek zobowiązań ogółem do aktywów ogółem. Wartość >0,67 wskazuje na nadmierne ryzyko kredytowe.'
			const legend2 = '** current ratio CR – wskaźnik bieżącej płynności; aktywa obrotowe / zobowiązania krótkoterminowe. Wartość ~2 = dobra płynność; <1 = ryzyko.'
			const l1 = pdf.splitTextToSize(legend1, contentW)
			const l2 = pdf.splitTextToSize(legend2, contentW)
			y = pdfRenderLines(pdf, l1, margin, y, 4, pageBottom, pageTop)
			y = pdfRenderLines(pdf, l2, margin, y, 4, pageBottom, pageTop)
			pdf.setTextColor(0, 0, 0)
			y += 5

			// ── 6. Liczba zleceń spedycyjnych ─────────────────────────────────────

			drawTable([
				['6   Liczba obsłużonych zleceń spedycyjnych', 'Rok 2024', 'Rok 2025', '0-3'],
				['    Liczba zleceń', f('liczbaObsluzzonychZlecen_2024'), f('liczbaObsluzzonychZlecen_2025'), ''],
			], colW4)

			// ── 7. Potencjał przewozowo-magazynowy ────────────────────────────────

			drawTable([
				['7   Potencjał przewozowo-magazynowy', 'Rok 2024', 'Rok 2025', '0-3'],
				['7a  Liczba pojazdów — własne', f('liczbaPojazdowWlasnych_2024'), f('liczbaPojazdowWlasnych_2025'), ''],
				['7a  Liczba pojazdów — leasingowe', f('liczbaPojazdowLeasing_2024'), f('liczbaPojazdowLeasing_2025'), ''],
				['7b  Liczba i powierzchnia magazynów własnych', f('powierzchniaMagazynowWlasnych_2024'), f('powierzchniaMagazynowWlasnych_2025'), ''],
				['7b  Liczba i powierzchnia magazynów dzierżawionych', f('powierzchniaMagazynowDzierżawionych_2024'), f('powierzchniaMagazynowDzierżawionych_2025'), ''],
			], colW4)

			// ── Pytania 8–12 ──────────────────────────────────────────────────────

			const colWQ = [contentW - 20, 20]

			drawTextTable([
				['8   Czy firma poszerzyła zakres usług w ostatnim roku (np. obsługa nowych gałęzi transportu, nowych kierunków geograficznych, zaoferowanie innowacyjnych produktów)?', '0-5'],
				[f('expandedServices') || '—', ''],
			], colWQ)

			drawTextTable([
				['9   Czy firma wdrożyła w ostatnim roku nowe rozwiązania w zakresie technologii informatycznych?', '0-5'],
				[f('implementedIT') || '—', ''],
			], colWQ)

			drawTextTable([
				['10  Jakie ubezpieczenia związane z działalnością spedycyjną/transportową posiada firma?', '0-1\nmaks.5'],
				[`OC spedytora:  ${f('insuranceOCSpedytora') || '—'}`, ''],
				[`OC przewoźnika:  ${f('insuranceOCPrzewoznika') || '—'}`, ''],
				[`OC transportu intermodalnego:  ${f('insuranceOCTransportuIntermodalnego') || '—'}`, ''],
				[`Inne:  ${f('insuranceInne') || '—'}`, ''],
			], colWQ)

			drawTextTable([
				['11  Jakie metody stosuje firma, badając zadowolenie klientów ze świadczonych przez nią usług?', '0-2'],
				[f('customerSatisfactionMethods') || '—', ''],
			], colWQ)

			drawTextTable([
				['12  Czy firma jest aktywna w działaniach na rzecz społeczności lokalnej (np. sponsoring, darowizny, stypendia, nagrody, praktyki, działalność edukacyjna)? Jeżeli tak, krótko opisać.', '0-4'],
				[f('communityActivities') || '—', ''],
			], colWQ)

			// Załączniki (dynamiczne z pola formularza)
			const zalacznikiLines = f('zalaczniki').split('\n').map(l => l.trim()).filter(Boolean)
			if (zalacznikiLines.length > 0) {
				drawTextTable([
					['Załączniki'],
					...zalacznikiLines.map((l, i) => [`Zał. ${i + 1}: ${l}`]),
				], [contentW])
			} else {
				y += 4
			}

			// ── Deklaracja i podpis ───────────────────────────────────────────────

			ensureSpace(55)
			pdf.setLineWidth(0.5)
			pdf.line(margin, y, pageW - margin, y)
			y += 7

			pdf.setFont('Roboto', 'bold')
			pdf.setFontSize(10)
			pdf.text('Niniejszym deklaruję udział firmy w konkursie Spedytor Roku 2025', margin, y)
			y += 12

			// Dane podpisującego
			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(9)
			if (f('signatoryName')) {
				pdf.setFont('Roboto', 'bold')
				pdf.text('Imię i nazwisko:', margin, y)
				pdf.setFont('Roboto', 'normal')
				pdf.text(f('signatoryName'), margin + 40, y)
				y += 6
			}
			pdf.setFont('Roboto', 'bold')
			pdf.text('Telefon:', margin, y)
			pdf.setFont('Roboto', 'normal')
			pdf.text(f('signatoryPhone'), margin + 40, y)
			pdf.setFont('Roboto', 'bold')
			pdf.text('E-mail:', margin + 85, y)
			pdf.setFont('Roboto', 'normal')
			pdf.text(f('email'), margin + 100, y)
			y += 14

			// Linie na podpis
			const lineW = (contentW - 10) / 2
			const sigDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
			const sigPlaceDate = `${f('miejscowosc') || '...............'}, ${sigDate}`

			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(9)
			pdf.setTextColor(0, 0, 0)
			pdf.text(sigPlaceDate, margin, y)
			y += 6

			pdf.setLineWidth(0.4)
			pdf.line(margin, y, margin + lineW, y)
			pdf.line(margin + lineW + 10, y, margin + contentW, y)
			y += 4
			pdf.setFont('Roboto', 'normal')
			pdf.setFontSize(8)
			pdf.setTextColor(80, 80, 80)
			pdf.text('Miejscowość i data', margin, y)
			pdf.text('Podpis (czytelny) osoby wypełniającej ankietę', margin + lineW + 10, y)
			pdf.setTextColor(0, 0, 0)

			// ── Stopka ────────────────────────────────────────────────────────────

			const currentDate = new Date().toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' })
			const pageCount = pdf.internal.getNumberOfPages()
			for (let i = 1; i <= pageCount; i++) {
				pdf.setPage(i)
				pdf.setFont('Roboto', 'normal')
				pdf.setFontSize(7)
				pdf.setTextColor(150, 150, 150)
				pdf.text(
					`Ankieta Spedytor Roku 2025 — Polska Izba Spedycji i Logistyki | ${currentDate}`,
					pageW / 2,
					pageH - 6,
					{ align: 'center' }
				)
				pdf.text(`Strona ${i} z ${pageCount}`, pageW - margin, pageH - 6, { align: 'right' })
				pdf.setTextColor(0, 0, 0)
			}

			// ── Pobieranie pliku ──────────────────────────────────────────────────

			const safeName = sanitizeFilename(formData.companyNameAndAddress?.split('\n')[0] || 'formularz')
			const blob = pdf.output('blob')
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = `ankieta_spedytor_roku_${safeName}.pdf`
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

export default AnkietaSpedytorPDFGenerator

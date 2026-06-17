import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import prisma from '@/lib/prisma'
import * as XLSX from 'xlsx'
import PizZip from 'pizzip'

// Community xlsx nie zapisuje stylów — wyróżniamy wiersz nagłówka (pogrubienie + subtelne tło)
// podmieniając styles.xml i oznaczając komórki pierwszego wiersza atrybutem s="1".
function styleHeaderRow(buffer) {
	const zip = new PizZip(buffer)
	const stylesXml =
		'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
		'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
		'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
		'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
		'<fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill></fills>' +
		'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
		'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
		'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
		'<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>' +
		'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
		'</styleSheet>'
	zip.file('xl/styles.xml', stylesXml)
	const sheet = zip.file('xl/worksheets/sheet1.xml').asText()
	// s="1" tylko dla komórek pierwszego wiersza (A1, B1, ... — nie A10/A11 itd.)
	zip.file('xl/worksheets/sheet1.xml', sheet.replace(/<c r="([A-Z]+1)"/g, '<c r="$1" s="1"'))
	return zip.generate({ type: 'nodebuffer' })
}

// Eksport list członków do Excela (.xlsx). Tylko dane wewnętrzne — lista publiczna bez zmian.
// type=mailing    -> lista wysyłkowa (korespondencja + zgoda na e-wysyłkę)
// type=invoicing  -> lista fakturowa (NIP + e-mail do faktur + pusta kolumna na kwotę)
export async function GET(request) {
	const session = await auth()
	if (!session) {
		return new NextResponse('Brak autoryzacji', { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const type = searchParams.get('type') || 'mailing'
	if (type !== 'mailing' && type !== 'invoicing') {
		return new NextResponse('Nieznany typ listy.', { status: 400 })
	}

	try {
		const members = await prisma.member.findMany({
			where: { deletedAt: null },
			orderBy: { company: 'asc' },
			select: {
				company: true,
				address: true,
				correspondenceAddress: true,
				email: true,
				invoiceEmail: true,
				nip: true,
				eDeliveryConsent: true,
				eDeliveryEmail: true,
				eDeliveryAddress: true,
			},
		})

		let rows
		let sheetName
		let fileBase
		let colWidths // szerokości kolumn w px (różne, tak by całość mieściła się na ekranie)

		if (type === 'mailing') {
			sheetName = 'Lista wysyłkowa'
			fileBase = 'lista-wysylkowa'
			rows = members.map(m => ({
				'Nazwa firmy': m.company || '',
				'Adres rejestrowy': m.address || '',
				// Brak osobnego adresu korespondencyjnego => ten sam co rejestrowy
				'Adres korespondencyjny': m.correspondenceAddress || m.address || '',
				'Zgoda na e-wysyłkę': m.eDeliveryConsent ? 'TAK' : 'NIE',
				// Brak osobnego e-maila do e-wysyłki => główny e-mail (tylko gdy jest zgoda)
				'E-mail (e-wysyłka)': m.eDeliveryConsent ? m.eDeliveryEmail || m.email || '' : '',
				'Adres e-doręczeń': m.eDeliveryAddress || '',
			}))
			// Nazwa | Adres rej. | Adres koresp. | Zgoda | E-mail | E-doręczeń  (suma ~1140 px)
			colWidths = [240, 220, 220, 110, 200, 150]
		} else {
			sheetName = 'Lista fakturowa'
			fileBase = 'lista-fakturowa'
			rows = members.map(m => ({
				'Nazwa firmy': m.company || '',
				'Adres rejestrowy': m.address || '',
				NIP: m.nip || '',
				'E-mail do faktur': m.invoiceEmail || m.email || '',
				'Kwota obciążenia': '', // pusta kolumna — do ręcznego uzupełnienia
			}))
			// Nazwa | Adres rej. | NIP | E-mail faktur | Kwota  (suma ~900 px)
			colWidths = [240, 240, 110, 210, 120]
		}

		const worksheet = XLSX.utils.json_to_sheet(rows)
		worksheet['!cols'] = colWidths.map(wpx => ({ wpx }))
		const workbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
		const buffer = styleHeaderRow(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }))

		const d = new Date()
		const stamp = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
		const filename = `${fileBase}-${stamp}.xlsx`

		return new NextResponse(buffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
			},
		})
	} catch (error) {
		console.error('Błąd generowania listy Excel:', error)
		return new NextResponse('Nie udało się wygenerować listy.', { status: 500 })
	}
}

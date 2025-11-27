const { PrismaClient } = require('@prisma/client')
const XLSX = require('xlsx')
const bcrypt = require('bcrypt')
const fs = require('fs')
const path = require('path')

const prisma = new PrismaClient()

// Ścieżki do plików
const INPUT_FILE = path.join(__dirname, 'czlonkowie_import.xlsx') // Twój plik wejściowy
const OUTPUT_FILE = path.join(__dirname, 'dane_logowania_czlonkow.xlsx') // Plik wyjściowy

// Funkcja pomocnicza do wyciągania e-maili z tekstu
const extractEmails = text => {
	if (!text) return []
	const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
	return text.toString().match(emailRegex) || []
}

// ULEPSZONA WERSJA 3.0 (Anti-split & Anti-dot)
const extractPhones = text => {
	if (!text) return null
	const str = text.toString()

	// Regex składa się z dwóch alternatyw (OR):
	// 1. Numer "rozbity" (np. 882 187 832): Wymaga grup cyfr oddzielonych spacją/kropką/myślnikiem.
	// 2. Numer "ciągły" (np. 888110177): Wymaga ciągu min. 7 cyfr.
	// Dodatkowo ignorujemy kropki/spacje na samym początku dopasowania, zaczynając od cyfry lub +
	const phoneRegex = /(?:(?:\+|00)48)?[ \t]*\(?\d{2,}\)?(?:[ \-.]+\d{2,})+|(?:\+?48)?[ \t]*\d{7,}/g

	const matches = str.match(phoneRegex)
	if (!matches) return null

	const validPhones = matches
		.map(p => {
			// KROK 1: Czyszczenie śmieci z brzegów (np. kropka na początku ".888...")
			// Usuwa kropki, myślniki i spacje z początku i końca
			let cleanStr = p.replace(/^[\s.\-]+|[\s.\-]+$/g, '')

			// KROK 2: Sprawdzenie poprawności (samych cyfr)
			const digitsOnly = cleanStr.replace(/[^\d+]/g, '')

			// Odrzucamy numery krótsze niż 6 cyfr (prawdziwych cyfr, nie znaków)
			if (digitsOnly.replace('+', '').length < 6) return null

			// Odrzucamy "lata" (np. 2024), jeśli wpadły jako pojedynczy numer (bez +48)
			// (Jeśli numer ma format YYYY i nic więcej, odrzucamy)
			if (/^(19|20)\d{2}$/.test(cleanStr)) return null

			// Odrzucamy dziwne krótkie numery zaczynające się od zera (chyba że to kierunkowy w nawiasie)
			if (cleanStr.startsWith('0') && digitsOnly.length < 9) return null

			return cleanStr
		})
		.filter(Boolean) // Usuwa nulle

	if (validPhones.length === 0) return null

	// Usuwamy duplikaty i łączymy
	return [...new Set(validPhones)].join(', ')
}

// ULEPSZONA Funkcja parsująca daty
const parseDate = dateStr => {
	if (!dateStr) return new Date('2025-01-01') // Domyślna

	const str = dateStr.toString().trim()

	// 1. Format: DD.MM.YYYY lub D.M.YYYY
	if (/^\d{1,2}\.\d{1,2}\.\d{4}/.test(str)) {
		const [day, month, year] = str.split('.')
		return new Date(`${year}-${month}-${day}`)
	}

	// 2. Format: YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
		return new Date(str)
	}

	// 3. Jeśli biblioteka xlsx mimo wszystko zwróci coś dziwnego, spróbuj standardowego parsowania
	const d = new Date(str)
	if (!isNaN(d.getTime())) return d

	return new Date('2025-01-01') // Fallback
}

// Funkcja do czyszczenia tekstu (usuwanie śmieci, trim)
const cleanText = text => {
	if (!text) return null
	return text.toString().trim()
}

// Funkcja do generowania bezpiecznego hasła
const generatePassword = () => {
	return Math.random().toString(36).slice(-8) + 'A1!'
}

async function main() {
	console.log('🚀 Rozpoczynam import członków...')

	// 1. Wczytaj Excela
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`❌ Nie znaleziono pliku: ${INPUT_FILE}`)
		process.exit(1)
	}

	const workbook = XLSX.readFile(INPUT_FILE, { cellDates: true })
	const sheetName = workbook.SheetNames[0]
	const sheet = workbook.Sheets[sheetName]
	const rawData = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' })

	console.log(`📄 Znaleziono ${rawData.length} wierszy do przetworzenia.`)

	const outputData = [] // Tu będziemy zbierać dane do raportu
	let processedCount = 0
	let skippedCount = 0

	for (const row of rawData) {
		try {
			// --- LOGIKA MPOBIERANIA DANYCH ZGODNA Z USTALENIAMI ---

			// A. Numer Członkowski (usuwamy /2024)
			let memberNumber = null
			const rawNumber = row['Numer członkowski']
			if (rawNumber) {
				// parseInt("288/2024") zwróci 288, ignorując resztę
				const parsed = parseInt(rawNumber.toString())
				if (!isNaN(parsed)) memberNumber = parsed
			}

			// B. Nazwa Firmy
			const companyName = cleanText(row['Nazwa firmy']) || 'Brak Nazwy Firmy'

			// C. Imię i Nazwisko (Prezes -> Osoba kontaktowa -> Brak)
			// Bierzemy tylko pierwszą osobę (przed przecinkiem), jeśli jest ich wiele
			let name = cleanText(row['Prezes/Właściciel'])
			if (name) name = name.split(',')[0].trim()

			if (!name) {
				name = cleanText(row['Osoba upoważniona do kontaktu '])
				if (name) name = name.split(',')[0].trim()
			}
			if (!name) name = 'Brak danych'

			// D. Email (Dane kontaktowe -> Faktury -> Komunikaty -> Placeholder)
			let email = null

			// Szukamy w 'Dane kontaktowe' (tam są maile i telefony)
			const emailsInContact = extractEmails(row['Dane kontatkowe '])
			if (emailsInContact.length > 0) email = emailsInContact[0]

			// Jeśli nie ma, szukamy w 'Adres e-mail do faktur'
			if (!email) {
				const emailsInInvoice = extractEmails(row['Adres e-mail do faktur '])
				if (emailsInInvoice.length > 0) email = emailsInInvoice[0]
			}

			// Jeśli nie ma, szukamy w 'adresy e-mail do komunikatów'
			if (!email) {
				const emailsInComm = extractEmails(row['adresy e-mail do komunikatów '])
				if (emailsInComm.length > 0) email = emailsInComm[0]
			}

			// Jeśli nadal brak - generujemy unikalny placeholder
			let isPlaceholderEmail = false
			if (!email) {
				// Tworzymy slug z nazwy firmy, np. "Firma Transportowa" -> "firma_transportowa"
				const slug = companyName
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '_')
					.slice(0, 20)
				email = `brak_maila_${slug}_${memberNumber || Date.now()}@brak.danych`
				isPlaceholderEmail = true
			}
			email = email.toLowerCase().trim()

			// E. Telefony (Tylko z 'Dane kontaktowe')
			let phones = extractPhones(row['Dane kontatkowe '])
			if (!phones) phones = 'Brak numerów telefonu'

			// F. Data przyjęcia
			let createdAt = new Date('2025-01-01') // Domyślna
			if (row['Data przyjęcia na członka ']) {
				const parsedDate = new Date(row['Data przyjęcia na członka '])
				if (!isNaN(parsedDate)) createdAt = parsedDate
			}

			// --- ZAPIS DO BAZY ---

			// Sprawdź czy mail już istnieje
			const existingMember = await prisma.member.findUnique({ where: { email } })

			if (existingMember) {
				console.log(`⚠️ Pomijam (duplikat email): ${email} (${companyName})`)
				skippedCount++
				continue
			}

			// Generowanie hasła
			const rawPassword = generatePassword()
			const hashedPassword = await bcrypt.hash(rawPassword, 10)

			// Tworzenie rekordu
			const newMember = await prisma.member.create({
				data: {
					email,
					password: hashedPassword,
					company: companyName,
					name: name,
					phones: phones,
					memberNumber: memberNumber, // Może być null
					createdAt: createdAt,
				},
			})

			// Dodanie do raportu wyjściowego
			outputData.push({
				'Nazwa Firmy': companyName,
				'Imię i Nazwisko': name,
				'Login (Email)': email,
				Telefony: phones,
				'Hasło Tymczasowe': rawPassword,
				'Data przyjęcia': createdAt,
				'Numer Członkowski': memberNumber || 'Brak',
				Uwagi: isPlaceholderEmail ? 'WYMAGA UZUPEŁNIENIA MAILA' : '',
			})

			processedCount++
			process.stdout.write('.') // Kropka postępu
		} catch (error) {
			console.error(`\nBłąd przy wierszu: ${JSON.stringify(row)}`)
			console.error(error)
		}
	}

	console.log('\n')
	console.log(`✅ Zakończono import.`)
	console.log(`➕ Dodano: ${processedCount}`)
	console.log(`⏭️ Pominięto: ${skippedCount}`)

	// --- ZAPIS PLIKU WYJŚCIOWEGO ---
	if (outputData.length > 0) {
		const newSheet = XLSX.utils.json_to_sheet(outputData)
		const newWorkbook = XLSX.utils.book_new()
		XLSX.utils.book_append_sheet(newWorkbook, newSheet, 'Dane Logowania')
		XLSX.writeFile(newWorkbook, OUTPUT_FILE)
		console.log(`💾 Plik z danymi logowania zapisano w: ${OUTPUT_FILE}`)
	}
}

main()
	.catch(e => {
		console.error(e)
		process.exit(1)
	})
	.finally(async () => {
		await prisma.$disconnect()
	})

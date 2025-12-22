const fs = require('fs')
const path = require('path')

// Ścieżki
const INPUT_FILE = path.join(__dirname, 'Członkowie.txt') // Nazwa Twojego pliku
const OUTPUT_FILE = path.join(__dirname, '../src/config/mailingList.json')

// Regex szukający standardowych adresów email (wymaga znaku @ i kropki w domenie)
// Ignoruje wpisy typu /o=ExchangeLabs...
const extractEmails = text => {
	if (!text) return []
	// Szukamy ciągu: znaki @ znaki . znaki (np. jan@firma.pl)
	const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
	return text.toString().match(emailRegex) || []
}

async function main() {
	console.log('📄 Rozpoczynam przetwarzanie pliku tekstowego...')

	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`❌ Nie znaleziono pliku: ${INPUT_FILE}`)
		console.error('Upewnij się, że plik "Członkowie.txt" znajduje się w folderze scripts.')
		process.exit(1)
	}

	try {
		// 1. Wczytaj treść pliku
		const content = fs.readFileSync(INPUT_FILE, 'utf-8')

		// 2. Znajdź wszystkie pasujące adresy e-mail
		const foundEmails = extractEmails(content)

		console.log(`🔎 Znaleziono surowych pasujących ciągów: ${foundEmails.length}`)

		// 3. Czyszczenie i deduplikacja
		const uniqueEmails = [...new Set(foundEmails)] // Usuń duplikaty
			.map(email => email.toLowerCase().trim()) // Małe litery i usuń spacje
			.filter(email => !email.endsWith('.')) // Usuń ewentualne kropki na końcu (rzadki błąd parsowania)
			.sort() // Posortuj alfabetycznie

		// 4. Podgląd pierwszych 5 i ostatnich 5 (dla pewności)
		console.log('\n--- Przykładowe znalezione maile (Początek) ---')
		console.log(uniqueEmails.slice(0, 5))
		console.log('--- Przykładowe znalezione maile (Koniec) ---')
		console.log(uniqueEmails.slice(-5))

		console.log(`\n✅ Sukces! Wygenerowano listę ${uniqueEmails.length} unikalnych adresów.`)

		// 5. Zapis do JSON
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueEmails, null, 2))
		console.log(`💾 Plik zapisano w: ${OUTPUT_FILE}`)
		console.log('👉 Pamiętaj, aby zrestartować workera (pm2 restart pisil-worker), aby wczytał nową listę.')
	} catch (error) {
		console.error('Błąd krytyczny:', error)
	}
}

main()

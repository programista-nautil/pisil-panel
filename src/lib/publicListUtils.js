import fs from 'fs'
import path from 'path'

const LIST_PATH = path.join(process.cwd(), 'src/config/publicMembersList.json')

const parseAddressToParts = fullAddress => {
	let ulica = fullAddress || ''
	let kod = ''
	let miasto = ''

	const zipMatch = fullAddress?.match(/(\d{2}-\d{3})/)

	if (zipMatch) {
		kod = zipMatch[0]
		const zipIndex = zipMatch.index

		ulica = fullAddress.substring(0, zipIndex).replace(/,$/, '').trim()

		miasto = fullAddress.substring(zipIndex + 6).trim()
	}

	return { ulica, kod, miasto }
}

export async function addToPublicList(memberData) {
	try {
		if (!fs.existsSync(LIST_PATH)) fs.writeFileSync(LIST_PATH, '[]')

		const content = fs.readFileSync(LIST_PATH, 'utf-8')
		let list = JSON.parse(content)

		const { ulica, kod, miasto } = parseAddressToParts(memberData.address)

		const newEntry = {
			Nazwa: memberData.companyName || memberData.company,
			Ulica: ulica,
			Kod: kod,
			Miasto: miasto,
			Tel: memberData.phones || '',
			Fax: '',
			Email: memberData.email,
			Strona_www: '',
		}

		const existingIndex = list.findIndex(item => item.Email === memberData.email)

		if (existingIndex > -1) {
			list[existingIndex] = newEntry
			console.log(`🔄 Zaktualizowano wpis dla ${memberData.email} w liście publicznej.`)
		} else {
			list.push(newEntry)
			console.log(`✅ Dodano ${memberData.email} do listy publicznej.`)
		}

		list.sort((a, b) => (a.Nazwa || '').localeCompare(b.Nazwa || '', 'pl'))

		fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 2))
		console.log(`✅ Dodano ${memberData.companyName} do listy publicznej.`)
	} catch (error) {
		console.error('Błąd dodawania do listy publicznej:', error)
	}
}

export async function removeFromPublicList(email) {
	try {
		if (!fs.existsSync(LIST_PATH)) return

		const content = fs.readFileSync(LIST_PATH, 'utf-8')
		let list = JSON.parse(content)

		const initialLength = list.length
		list = list.filter(item => item.Email !== email)

		if (list.length < initialLength) {
			fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 2))
			console.log(`🗑️ Usunięto ${email} z listy publicznej.`)
		}
	} catch (error) {
		console.error('Błąd usuwania z listy publicznej:', error)
	}
}

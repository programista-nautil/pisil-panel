import fs from 'fs'
import path from 'path'

const LIST_PATH = path.join(process.cwd(), 'src/config/publicMembersList.json')

const parseAddressToParts = fullAddress => {
	let ulica = fullAddress || ''
	let kod = ''
	let miasto = ''

	const zipMatch = fullAddress?.match(/(\d{2}[-\s]?\d{3})/)

	if (zipMatch) {
		kod = zipMatch[0].replace(/\s/g, '').replace(/(\d{2})(\d{3})/, '$1-$2')
		const zipIndex = zipMatch.index

		ulica = fullAddress.substring(0, zipIndex).trim().replace(/,$/, '')

		let restAfterZip = fullAddress.substring(zipIndex + zipMatch[0].length).trim()

		restAfterZip = restAfterZip.replace(/^,/, '').trim()

		miasto = restAfterZip.split(',')[0].trim()
	}

	return { ulica, kod, miasto }
}

export async function addToPublicList(memberData) {
	try {
		if (!fs.existsSync(LIST_PATH)) fs.writeFileSync(LIST_PATH, '[]')

		const content = fs.readFileSync(LIST_PATH, 'utf-8')
		let list = JSON.parse(content)

		const { ulica, kod, miasto } = parseAddressToParts(memberData.address)
		const companyName = memberData.companyName || memberData.company

		let existingIndex = list.findIndex(item => item.Email === memberData.email)

		if (existingIndex === -1 && companyName) {
			existingIndex = list.findIndex(item => item.Nazwa === companyName)
		}

		if (existingIndex > -1) {
			const oldEntry = list[existingIndex]

			const newPhones = (memberData.phones && memberData.phones !== 'Brak numerów telefonu') ? memberData.phones : oldEntry.Tel;
            const newWebsite = memberData.website ? memberData.website : (oldEntry.Strona_www || '');
            const newFax = memberData.fax ? memberData.fax : (oldEntry.Fax || '');

			list[existingIndex] = {
				...oldEntry,
				Nazwa: companyName || oldEntry.Nazwa,
				Ulica: ulica || oldEntry.Ulica,
				Kod: kod || oldEntry.Kod,
				Miasto: miasto || oldEntry.Miasto,
				Tel: newPhones,
				Email: memberData.email || oldEntry.Email,
				Strona_www: newWebsite,
                Fax: newFax
			}
			console.log(`🔄 Zaktualizowano wpis dla ${memberData.email} w liście publicznej.`)
		} else {
			const newEntry = {
				Nazwa: companyName,
				Ulica: ulica,
				Kod: kod,
				Miasto: miasto,
				Tel: memberData.phones === 'Brak numerów telefonu' ? '' : (memberData.phones || ''),
                Fax: memberData.fax || '',
				Email: memberData.email,
				Strona_www: memberData.website || '',
			}
			list.push(newEntry)
			console.log(`✅ Dodano ${memberData.email} do listy publicznej.`)
		}

		list.sort((a, b) => (a.Nazwa || '').localeCompare(b.Nazwa || '', 'pl'))

		fs.writeFileSync(LIST_PATH, JSON.stringify(list, null, 2))
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

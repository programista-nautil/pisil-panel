import fs from 'fs'
import path from 'path'

const MAILING_LIST_PATH = path.join(process.cwd(), 'src/config/mailingList.json')

const parseEmails = emailString => {
	if (!emailString) return []
	return emailString
		.split(',')
		.map(e => e.trim().toLowerCase())
		.filter(e => e.length > 0 && e.includes('@'))
}

export async function syncMailingList(oldEmailsString, newEmailsString) {
	try {
		const oldList = parseEmails(oldEmailsString)
		const newList = parseEmails(newEmailsString)

		const emailsToAdd = newList.filter(x => !oldList.includes(x))
		const emailsToRemove = oldList.filter(x => !newList.includes(x))

		if (emailsToAdd.length === 0 && emailsToRemove.length === 0) {
			return
		}

		console.log(`📧 Sync MailingList: +[${emailsToAdd}], -[${emailsToRemove}]`)
		if (!fs.existsSync(MAILING_LIST_PATH)) {
			fs.writeFileSync(MAILING_LIST_PATH, '[]')
		}

		const fileContent = fs.readFileSync(MAILING_LIST_PATH, 'utf-8')
		let currentJsonList = JSON.parse(fileContent)

		emailsToAdd.forEach(email => {
			if (!currentJsonList.includes(email)) {
				currentJsonList.push(email)
			}
		})

		if (emailsToRemove.length > 0) {
			currentJsonList = currentJsonList.filter(email => !emailsToRemove.includes(email))
		}
		currentJsonList.sort()
		fs.writeFileSync(MAILING_LIST_PATH, JSON.stringify(currentJsonList, null, 2))

		console.log('✅ mailingList.json zaktualizowany.')
	} catch (error) {
		console.error('❌ Błąd synchronizacji mailingList.json:', error)
	}
}

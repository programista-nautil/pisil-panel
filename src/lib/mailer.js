/**
 * Brama wysyłkowa — JEDYNE miejsce w projekcie, które woła transporter.sendMail.
 *
 * CommonJS celowo: ten sam plik ma działać i w trasach Next.js (import { sendToOne }),
 * i w workerze BullMQ uruchamianym jako zwykły `node` (require). Dlatego NIE importuje
 * żadnego modułu ESM z src/lib — tylko `nodemailer`.
 *
 * Po co brama istnieje (inwariant RODO): adres jednego uczestnika nie może trafić do drugiego.
 * Wcześniej `createTransport` był w 15 plikach i „jeden adres w polu DO" zależał od pamięci
 * programisty. Teraz każdy mail przechodzi przez `sendToOne`, które to WYMUSZA — złamanie jest
 * niemożliwe, także w mailu dodanym za pół roku.
 */
const nodemailer = require('nodemailer')

let _transporter = null

function buildTransporter() {
	// W testach nic nie wychodzi — treść wiadomości ląduje w info.message (jsonTransport).
	if (process.env.NODE_ENV === 'test' && process.env.ALLOW_REAL_SMTP !== 'true') {
		return nodemailer.createTransport({ jsonTransport: true })
	}
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST || 'smtp.office365.com',
		port: 587,
		secure: false,
		requireTLS: true,
		// Jeden transporter na proces + pula połączeń zamiast nowego uścisku przy każdym mailu.
		// maxConnections 3: Exchange Online tnie nadmiar równoległych połączeń SMTP AUTH.
		pool: true,
		maxConnections: 3,
		auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
	})
}

function getTransporter() {
	if (!_transporter) _transporter = buildTransporter()
	return _transporter
}

function domyslnyFrom() {
	return `"PISiL Info" <${process.env.SMTP_USER}>`
}

// Przecinek albo średnik w polu adresu = próba wpisania wielu adresów.
function assertPojedynczyAdres(pole, wartosc) {
	if (wartosc == null || wartosc === '') return
	if (Array.isArray(wartosc)) {
		throw new Error(
			`mailer: pole "${pole}" musi być jednym adresem — dostało tablicę. ` +
				'Wyślij osobną wiadomość do każdego odbiorcy (jeden adres = jeden mail).'
		)
	}
	if (typeof wartosc !== 'string' || /[,;]/.test(wartosc)) {
		throw new Error(`mailer: pole "${pole}" musi być dokładnie jednym adresem (dostało: ${JSON.stringify(wartosc)}).`)
	}
}

/**
 * Wysyła jedną wiadomość do jednego odbiorcy.
 * @param {object} msg pola nodemailera: to (wymagane, JEDEN adres), subject, html, text, from,
 *   replyTo, attachments, bcc (opcjonalnie — POJEDYNCZY adres, wzorzec „ślepa kopia na skrzynkę biura").
 *   `cc` jest ZAKAZANE (ujawnia adresy). `to`/`bcc` jako tablica lub z przecinkiem → wyjątek.
 * @returns {Promise} wynik transporter.sendMail
 */
async function sendToOne(msg = {}) {
	if (!msg.to) throw new Error('mailer: brak adresu "to".')
	assertPojedynczyAdres('to', msg.to)
	if (msg.cc != null && msg.cc !== '') {
		throw new Error('mailer: pole "cc" jest zakazane (ujawnia adresy). Użyj bcc na skrzynkę biura albo osobnej wiadomości.')
	}
	assertPojedynczyAdres('bcc', msg.bcc)

	const prod = process.env.NODE_ENV === 'production'
	const test = process.env.NODE_ENV === 'test'
	const catchAll = process.env.MAIL_CATCH_ALL
	const pozwolProd = process.env.ALLOW_REAL_SMTP === 'true'

	// Blokada wysyłki poza produkcją — działa nawet, GDY ZAPOMNISZ o przekierowaniu
	// (catch-all chroni tylko, gdy pamiętasz go włączyć; blokada chroni, gdy zapomnisz).
	if (!prod && !test && !catchAll && !pozwolProd) {
		throw new Error(
			'mailer: wysyłka poza produkcją zablokowana, żeby nie wysłać maila do prawdziwej osoby z deva. ' +
				'Ustaw MAIL_CATCH_ALL=twoj@adres (wszystkie maile trafią tam, nikt inny ich nie dostanie) ' +
				'albo ALLOW_REAL_SMTP=true, jeśli świadomie chcesz wysyłać naprawdę.'
		)
	}

	let finalMsg = { from: domyslnyFrom(), ...msg }

	// Catch-all (poza produkcją): przekieruj wszystko na jeden adres, zachowując w temacie
	// i nagłówku informację, do kogo mail POWINIEN był pójść.
	if (catchAll && !prod) {
		const oryginalny = msg.to + (msg.bcc ? ` (+bcc ${msg.bcc})` : '')
		finalMsg = {
			...finalMsg,
			to: catchAll,
			bcc: undefined,
			subject: `[TEST → ${oryginalny}] ${finalMsg.subject || ''}`,
			headers: { ...(finalMsg.headers || {}), 'X-Original-To': msg.to },
		}
	}

	return getTransporter().sendMail(finalMsg)
}

// Awaryjny reset transportera (np. po zmianie konfiguracji w długo żyjącym procesie). Rzadko potrzebny.
function resetTransporter() {
	_transporter = null
}

module.exports = { sendToOne, resetTransporter }

/** @jest-environment node */

const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'x' })
jest.mock('nodemailer', () => ({ createTransport: jest.fn(() => ({ sendMail: mockSendMail })) }))

const { sendToOne, resetTransporter } = require('./mailer')

beforeEach(() => {
	jest.clearAllMocks()
	resetTransporter()
	delete process.env.MAIL_CATCH_ALL
	process.env.SMTP_USER = 'pisil_info@pisil.pl'
})

describe('sendToOne — inwariant „jeden adres w DO"', () => {
	test('odrzuca tablicę adresów w to', async () => {
		await expect(sendToOne({ to: ['a@x.pl', 'b@x.pl'], subject: 't', html: 'h' })).rejects.toThrow(/jeden|tablic/i)
		expect(mockSendMail).not.toHaveBeenCalled()
	})

	test('odrzuca przecinek w to', async () => {
		await expect(sendToOne({ to: 'a@x.pl, b@x.pl', subject: 't', html: 'h' })).rejects.toThrow(/adres/i)
		expect(mockSendMail).not.toHaveBeenCalled()
	})

	test('odrzuca średnik w to', async () => {
		await expect(sendToOne({ to: 'a@x.pl; b@x.pl' })).rejects.toThrow(/adres/i)
		expect(mockSendMail).not.toHaveBeenCalled()
	})

	test('odrzuca cc (ujawnia adresy)', async () => {
		await expect(sendToOne({ to: 'a@x.pl', cc: 'biuro@x.pl', subject: 't' })).rejects.toThrow(/cc/i)
		expect(mockSendMail).not.toHaveBeenCalled()
	})

	test('odrzuca bcc z wieloma adresami', async () => {
		await expect(sendToOne({ to: 'a@x.pl', bcc: ['biuro@x.pl', 'szef@x.pl'] })).rejects.toThrow(/bcc/i)
		await expect(sendToOne({ to: 'a@x.pl', bcc: 'biuro@x.pl, szef@x.pl' })).rejects.toThrow(/bcc/i)
		expect(mockSendMail).not.toHaveBeenCalled()
	})

	test('brak to → wyjątek', async () => {
		await expect(sendToOne({ subject: 't' })).rejects.toThrow(/to/i)
	})
})

describe('sendToOne — poprawna wysyłka', () => {
	test('jeden adres: wysyła, wstrzykuje domyślny from', async () => {
		await sendToOne({ to: 'jan@firma.pl', subject: 'Temat', html: '<p>x</p>' })
		expect(mockSendMail).toHaveBeenCalledTimes(1)
		const msg = mockSendMail.mock.calls[0][0]
		expect(msg.to).toBe('jan@firma.pl')
		expect(msg.from).toContain('pisil_info@pisil.pl')
		expect(msg.subject).toBe('Temat')
	})

	test('pojedynczy bcc (kopia biura) jest dozwolony', async () => {
		await sendToOne({ to: 'jan@firma.pl', bcc: 'biuro@pisil.pl', subject: 't' })
		expect(mockSendMail).toHaveBeenCalledTimes(1)
		expect(mockSendMail.mock.calls[0][0].bcc).toBe('biuro@pisil.pl')
	})

	test('własny from ma pierwszeństwo przed domyślnym', async () => {
		await sendToOne({ to: 'a@x.pl', from: 'inny@x.pl', subject: 't' })
		expect(mockSendMail.mock.calls[0][0].from).toBe('inny@x.pl')
	})
})

describe('sendToOne — catch-all poza produkcją', () => {
	test('przekierowuje na jeden adres, zachowuje oryginalnego odbiorcę w temacie i nagłówku', async () => {
		process.env.MAIL_CATCH_ALL = 'test@nautil.pl'
		await sendToOne({ to: 'jan@firma.pl', bcc: 'biuro@pisil.pl', subject: 'Temat' })
		const msg = mockSendMail.mock.calls[0][0]
		expect(msg.to).toBe('test@nautil.pl')
		expect(msg.bcc).toBeUndefined() // kopia biura też nie wychodzi poza produkcją
		expect(msg.subject).toContain('jan@firma.pl')
		expect(msg.headers['X-Original-To']).toBe('jan@firma.pl')
	})
})

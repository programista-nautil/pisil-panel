/**
 * @jest-environment node
 *
 * Test integracyjny publicznego zapisu na wydarzenie.
 * Prawdziwa logika NIP i wyliczania ceny; mockowane I/O (prisma, mail, rate-limit).
 */
const mockTx = {
	event: { findUnique: jest.fn() },
	eventRegistration: { count: jest.fn(), create: jest.fn() },
	$queryRaw: jest.fn(),
}
const mockSendMail = jest.fn().mockResolvedValue({})

jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: { $transaction: jest.fn(async cb => cb(mockTx)) },
}))
jest.mock('nodemailer', () => ({
	__esModule: true,
	default: { createTransport: () => ({ sendMail: mockSendMail }) },
}))
jest.mock('@/lib/rateLimit', () => ({
	checkRateLimit: jest.fn().mockResolvedValue(true),
	getClientIp: jest.fn(() => '1.2.3.4'),
}))

import { POST } from './route'

const VALID_NIP = '1234563218'

const konfEvent = {
	id: 'e1',
	slug: 'konf',
	typ: 'KONFERENCJA',
	tryb: 'ONLINE',
	title: 'Konferencja',
	status: 'PUBLISHED',
	registrationDeadline: null,
	limitMiejsc: null,
	pulaGratisNaFirme: 2,
	cenaCzlonek: 300,
	cenaNieczlonek: 600,
	bankAccount: null,
	onlineUrl: null,
	address: null,
	startAt: new Date('2030-01-01T10:00:00Z'),
	endAt: null,
}

const req = body => ({ json: jest.fn().mockResolvedValue(body), headers: { get: () => null } })
const ctx = { params: Promise.resolve({ slug: 'konf' }) }

const validBody = (overrides = {}) => ({
	firstName: 'Jan',
	lastName: 'Kowalski',
	email: 'jan@firma.pl',
	firmaNazwa: 'Firma X',
	firmaNip: VALID_NIP,
	zgodaRodo: true,
	...overrides,
})

beforeEach(() => {
	jest.clearAllMocks()
	mockTx.eventRegistration.count.mockResolvedValue(0)
	mockTx.event.findUnique.mockResolvedValue(konfEvent)
	mockTx.$queryRaw.mockResolvedValue([]) // domyślnie: nie-członek
	mockTx.eventRegistration.create.mockImplementation(async ({ data }) => ({ id: 'reg1', ...data }))
})

test('honeypot wypełniony → 200, bez zapisu', async () => {
	const res = await POST(req(validBody({ company_website: 'bot' })), ctx)
	expect(res.status).toBe(200)
	expect(mockTx.eventRegistration.create).not.toHaveBeenCalled()
})

test('niepoprawny NIP → 400', async () => {
	const res = await POST(req(validBody({ firmaNip: '123' })), ctx)
	expect(res.status).toBe(400)
	expect(mockTx.eventRegistration.create).not.toHaveBeenCalled()
})

test('brak zgody RODO → 400', async () => {
	const res = await POST(req(validBody({ zgodaRodo: false })), ctx)
	expect(res.status).toBe(400)
})

test('członek na konferencji w puli → CZLONEK_GRATIS, kwota 0, mail wysłany', async () => {
	mockTx.$queryRaw.mockResolvedValue([{ id: 'm1', memberType: 'ZWYCZAJNY' }])

	const res = await POST(req(validBody()), ctx)
	const body = await res.json()

	expect(res.status).toBe(201)
	expect(body.registration.tier).toBe('CZLONEK_GRATIS')
	expect(body.registration.kwota).toBe(0)
	expect(mockTx.eventRegistration.create).toHaveBeenCalledWith(
		expect.objectContaining({ data: expect.objectContaining({ tier: 'CZLONEK_GRATIS', firmaNip: VALID_NIP }) })
	)
	expect(mockSendMail).toHaveBeenCalled()
})

test('nie-członek → NIECZLONEK, pełna cena', async () => {
	mockTx.$queryRaw.mockResolvedValue([]) // brak członka

	const res = await POST(req(validBody()), ctx)
	const body = await res.json()

	expect(res.status).toBe(201)
	expect(body.registration.tier).toBe('NIECZLONEK')
	expect(body.registration.kwota).toBe(600)
})

// ---------- Treść maila potwierdzającego ----------
// Asercje negatywne ZAWSZE w parze z pozytywną: bez tego test przechodzi także wtedy, gdy treść
// w ogóle nie powstała (html === undefined), czyli dokładnie wtedy, gdy kod jest zepsuty.
// Negatywnie sprawdzamy WZORCE, nie konkretne wartości — zmiana numeru konta w konfiguracji
// nie może uciszyć testu, podczas gdy mail dalej wycieka konto.

const KONTO = '12 3456 7890 1234 5678 9012 3456'
const WZORZEC_KWOTY = /\d+[.,]\d{2}\s*zł/i
const WZORZEC_KONTA = /\d{2}(\s?\d{4}){6}/

const mailDoUczestnika = () => mockSendMail.mock.calls[0][0]

test('lista rezerwowa: mail BEZ jakiejkolwiek informacji o płatności', async () => {
	// Sala pełna → zapis trafia na listę rezerwową (limit 1, jedno zgłoszenie już jest)
	mockTx.event.findUnique.mockResolvedValue({
		...konfEvent,
		limitMiejsc: 1,
		bankAccount: KONTO,
		pulaGratisNaFirme: 0,
	})
	mockTx.eventRegistration.count.mockResolvedValue(1)

	const res = await POST(req(validBody()), ctx)
	expect(res.status).toBe(201)

	const { subject, html } = mailDoUczestnika()
	const tresc = `${subject} ${html}`

	// POZYTYW — treść powstała i mówi o liście rezerwowej
	expect(tresc).toContain(konfEvent.title)
	expect(tresc).toContain('listę rezerwową')

	// NEGATYW — ani kwoty, ani konta, ani wezwania do przelewu
	expect(tresc).not.toMatch(WZORZEC_KWOTY)
	expect(tresc).not.toMatch(WZORZEC_KONTA)
	expect(tresc).not.toMatch(/do zapłaty|przelew/i)
})

test('potwierdzona + płatne: kwota i konto SĄ (para pozytywna do testu wyżej)', async () => {
	mockTx.event.findUnique.mockResolvedValue({ ...konfEvent, bankAccount: KONTO, pulaGratisNaFirme: 0 })

	const res = await POST(req(validBody()), ctx)
	expect(res.status).toBe(201)

	const { html } = mailDoUczestnika()
	expect(html).toContain(KONTO)
	expect(html).toMatch(WZORZEC_KWOTY)
})

test('link do spotkania NIE trafia do maila potwierdzającego', async () => {
	const LINK = 'https://teams.microsoft.com/l/meetup-join/TAJNY-LINK'
	mockTx.event.findUnique.mockResolvedValue({ ...konfEvent, tryb: 'ONLINE', onlineUrl: LINK })

	const res = await POST(req(validBody()), ctx)
	expect(res.status).toBe(201)

	const { subject, html } = mailDoUczestnika()
	const tresc = `${subject} ${html}`

	// POZYTYW — mail powstał i mówi, że wydarzenie jest online
	expect(tresc).toContain('Online')

	// NEGATYW — link wysyła Pani Teresa świadomą akcją, nie automat po formularzu
	expect(tresc).not.toContain(LINK)
	expect(tresc).not.toContain('teams.microsoft.com')
})

// REGRESJA: wydarzenie BEZ podanego terminu zapisów, którego data już minęła. Reguła „brak terminu →
// zapisy do startu” żyje w powodZamknieciaZapisow; wcześniej trasa powielała warunek i sprawdzała
// tylko registrationDeadline, przez co przyjmowała zgłoszenia na wydarzenia sprzed roku.
test('wydarzenie bez terminu zapisów, po dacie → odmowa (nie lista rezerwowa)', async () => {
	mockTx.event.findUnique.mockResolvedValue({
		...konfEvent,
		registrationDeadline: null,
		startAt: new Date('2020-01-01T10:00:00Z'),
	})

	const res = await POST(req(validBody()), ctx)

	expect(res.status).not.toBe(201)
	expect(mockTx.eventRegistration.create).not.toHaveBeenCalled()
	expect(mockSendMail).not.toHaveBeenCalled()
})

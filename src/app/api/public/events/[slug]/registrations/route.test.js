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

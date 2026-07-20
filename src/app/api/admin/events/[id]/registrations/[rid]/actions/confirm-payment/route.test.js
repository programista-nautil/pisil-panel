/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		event: { findUnique: jest.fn() },
		eventRegistration: { findUnique: jest.fn(), update: jest.fn() },
	},
}))
jest.mock('@/lib/services/eventMails', () => ({
	sendPaymentConfirmedEmail: jest.fn().mockResolvedValue({ sent: true }),
}))

import prisma from '@/lib/prisma'
import { sendPaymentConfirmedEmail } from '@/lib/services/eventMails'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1', rid: 'reg1' }) }

const reg = { id: 'reg1', eventId: 'ev1', email: 'jan@firma.pl', kwota: 500, statusPlatnosci: 'OCZEKUJE', oplaconeAt: null }

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', title: 'Szkolenie' })
	prisma.eventRegistration.findUnique.mockResolvedValue(reg)
	prisma.eventRegistration.update.mockImplementation(async ({ data }) => ({ ...reg, ...data }))
})

test('notify=true: zapisuje OPLACONE z datą wpłaty i wysyła potwierdzenie', async () => {
	const res = await POST(req({ notify: true }), ctx)
	const out = await res.json()

	expect(res.status).toBe(200)
	const data = prisma.eventRegistration.update.mock.calls[0][0].data
	expect(data.statusPlatnosci).toBe('OPLACONE')
	expect(data.oplaconeAt).toBeInstanceOf(Date) // data prowadzi się sama
	expect(sendPaymentConfirmedEmail).toHaveBeenCalledTimes(1)
	expect(out.email).toEqual({ sent: true })
})

test('notify=false: zapisuje wpłatę, ale ŻADEN mail nie wychodzi', async () => {
	const res = await POST(req({ notify: false }), ctx)
	expect(res.status).toBe(200)
	expect(prisma.eventRegistration.update.mock.calls[0][0].data.statusPlatnosci).toBe('OPLACONE')
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

test('domyślnie (puste body) NIE wysyła — mail tylko na wyraźne życzenie', async () => {
	const res = await POST(req({}), ctx)
	expect(res.status).toBe(200)
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

test('istniejąca data wpłaty NIE jest nadpisywana (przelew mógł wpłynąć wcześniej)', async () => {
	const wczesniej = new Date('2026-07-01T10:00:00Z')
	prisma.eventRegistration.findUnique.mockResolvedValue({ ...reg, oplaconeAt: wczesniej })

	await POST(req({ notify: false }), ctx)

	const data = prisma.eventRegistration.update.mock.calls[0][0].data
	expect(data.statusPlatnosci).toBe('OPLACONE') // pozytyw: status i tak ustawiony
	expect(data).not.toHaveProperty('oplaconeAt') // negatyw: daty nie ruszamy
})

test('nieudana wysyłka nie wywraca zapisu — wpłata zostaje, wynik maila widoczny', async () => {
	sendPaymentConfirmedEmail.mockResolvedValue({ sent: false, reason: 'SMTP padł' })
	const res = await POST(req({ notify: true }), ctx)
	const out = await res.json()

	expect(res.status).toBe(200)
	expect(prisma.eventRegistration.update).toHaveBeenCalledTimes(1)
	expect(out.email).toEqual({ sent: false, reason: 'SMTP padł' })
})

test('cudze zgłoszenie (inny eventId) → 404, bez zapisu i bez maila', async () => {
	prisma.eventRegistration.findUnique.mockResolvedValue({ ...reg, eventId: 'INNY' })
	const res = await POST(req({ notify: true }), ctx)
	expect(res.status).toBe(404)
	expect(prisma.eventRegistration.update).not.toHaveBeenCalled()
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

test('nieistniejące wydarzenie → 404', async () => {
	prisma.event.findUnique.mockResolvedValue(null)
	const res = await POST(req({ notify: true }), ctx)
	expect(res.status).toBe(404)
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

test('brak sesji → 401, bez zapisu i bez maila', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce(null)
	const res = await POST(req({ notify: true }), ctx)
	expect(res.status).toBe(401)
	expect(prisma.eventRegistration.update).not.toHaveBeenCalled()
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

test('zalogowany CZŁONEK (nie admin) → 401', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(req({ notify: true }), ctx)
	expect(res.status).toBe(401)
	expect(sendPaymentConfirmedEmail).not.toHaveBeenCalled()
})

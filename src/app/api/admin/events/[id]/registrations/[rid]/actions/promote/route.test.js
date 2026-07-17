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
	sendSpotFreedEmail: jest.fn().mockResolvedValue({ sent: true }),
}))

import prisma from '@/lib/prisma'
import { sendSpotFreedEmail } from '@/lib/services/eventMails'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1', rid: 'rez1' }) }
const rez = { id: 'rez1', eventId: 'ev1', email: 'anna@firma.pl', statusRejestracji: 'LISTA_REZERWOWA', kwota: 300 }

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', title: 'Szkolenie', startAt: new Date(), bankAccount: '' })
	prisma.eventRegistration.findUnique.mockResolvedValue(rez)
	prisma.eventRegistration.update.mockResolvedValue({ ...rez, statusRejestracji: 'POTWIERDZONA' })
})

test('przeniesienie ustawia POTWIERDZONA i (z notify) wysyła „zwolniło się miejsce"', async () => {
	const res = await POST(req({ notify: true }), ctx)
	expect(res.status).toBe(200)
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'rez1' }, data: { statusRejestracji: 'POTWIERDZONA' } })
	)
	expect(sendSpotFreedEmail).toHaveBeenCalledTimes(1)
})

test('bez notify: status zmieniony, email NIE wychodzi', async () => {
	await POST(req({ notify: false }), ctx)
	expect(prisma.eventRegistration.update).toHaveBeenCalled()
	expect(sendSpotFreedEmail).not.toHaveBeenCalled()
})

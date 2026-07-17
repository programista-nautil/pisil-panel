/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		event: { findUnique: jest.fn() },
		eventRegistration: { findUnique: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
	},
}))
jest.mock('@/lib/services/eventMails', () => ({
	sendCancellationEmail: jest.fn().mockResolvedValue({ sent: true }),
	sendSpotFreedEmail: jest.fn().mockResolvedValue({ sent: true }),
}))

import prisma from '@/lib/prisma'
import { sendCancellationEmail, sendSpotFreedEmail } from '@/lib/services/eventMails'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1', rid: 'reg1' }) }

const cancelled = { id: 'reg1', eventId: 'ev1', email: 'jan@firma.pl', statusRejestracji: 'POTWIERDZONA', kwota: 500 }
const rezerwowy = { id: 'rez1', eventId: 'ev1', email: 'anna@firma.pl', statusRejestracji: 'LISTA_REZERWOWA', kwota: 500 }

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', title: 'Szkolenie', startAt: new Date(), bankAccount: '' })
	prisma.eventRegistration.findUnique.mockResolvedValue(cancelled)
	prisma.eventRegistration.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...cancelled, ...data }))
	prisma.eventRegistration.findFirst.mockResolvedValue(null) // domyślnie brak rezerwy
})

test('anulowanie + powiadomienie + przeniesienie pierwszego z rezerwy (jest rezerwa)', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(rezerwowy)
	prisma.eventRegistration.update
		.mockResolvedValueOnce({ ...cancelled, statusRejestracji: 'ANULOWANA' }) // cancelled
		.mockResolvedValueOnce({ ...rezerwowy, statusRejestracji: 'POTWIERDZONA' }) // promoted

	const res = await POST(
		req({ notifyCancelled: true, promoteWaitlisted: true, notifyWaitlisted: true }),
		ctx
	)
	const body = await res.json()

	expect(res.status).toBe(200)
	// cancelled dostał status ANULOWANA
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'reg1' }, data: { statusRejestracji: 'ANULOWANA' } })
	)
	// firstWaitlisted z rezerwy wyszukany po najstarszej dacie i promoted
	expect(prisma.eventRegistration.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ statusRejestracji: 'LISTA_REZERWOWA', id: { not: 'reg1' } }),
			orderBy: { createdAt: 'asc' },
		})
	)
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'rez1' }, data: { statusRejestracji: 'POTWIERDZONA' } })
	)
	// oba emails poszły
	expect(sendCancellationEmail).toHaveBeenCalledTimes(1)
	expect(sendSpotFreedEmail).toHaveBeenCalledTimes(1)
	expect(body.promoted.statusRejestracji).toBe('POTWIERDZONA')
})

test('promoteWaitlisted=true, ale NIE MA rezerwy → nie przenosi, nie wysyła „zwolniło się miejsce"', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(null)

	const res = await POST(req({ notifyCancelled: true, promoteWaitlisted: true, notifyWaitlisted: true }), ctx)
	const body = await res.json()

	expect(res.status).toBe(200)
	expect(body.promoted).toBeNull()
	expect(sendSpotFreedEmail).not.toHaveBeenCalled()
	// tylko jedna aktualizacja (cancelled), bez przenoszenia
	expect(prisma.eventRegistration.update).toHaveBeenCalledTimes(1)
})

test('bez powiadomień: statusy zmienione, ale ŻADEN mail nie wychodzi', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(rezerwowy)

	await POST(req({ notifyCancelled: false, promoteWaitlisted: true, notifyWaitlisted: false }), ctx)

	expect(sendCancellationEmail).not.toHaveBeenCalled()
	expect(sendSpotFreedEmail).not.toHaveBeenCalled()
	// ale przeniesienie się odbyło (to zmiana statusu, nie mail)
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'rez1' }, data: { statusRejestracji: 'POTWIERDZONA' } })
	)
})

test('cudze zgłoszenie (inny eventId) → 404', async () => {
	prisma.eventRegistration.findUnique.mockResolvedValue({ ...cancelled, eventId: 'INNY' })
	const res = await POST(req({ notifyCancelled: true }), ctx)
	expect(res.status).toBe(404)
	expect(prisma.eventRegistration.update).not.toHaveBeenCalled()
})

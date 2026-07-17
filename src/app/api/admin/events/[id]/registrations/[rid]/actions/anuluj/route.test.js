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
	wyslijAnulowanie: jest.fn().mockResolvedValue({ wyslano: true }),
	wyslijZwolnioneMiejsce: jest.fn().mockResolvedValue({ wyslano: true }),
}))

import prisma from '@/lib/prisma'
import { wyslijAnulowanie, wyslijZwolnioneMiejsce } from '@/lib/services/eventMails'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1', rid: 'reg1' }) }

const anulowany = { id: 'reg1', eventId: 'ev1', email: 'jan@firma.pl', statusRejestracji: 'POTWIERDZONA', kwota: 500 }
const rezerwowy = { id: 'rez1', eventId: 'ev1', email: 'anna@firma.pl', statusRejestracji: 'LISTA_REZERWOWA', kwota: 500 }

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', title: 'Szkolenie', startAt: new Date(), bankAccount: '' })
	prisma.eventRegistration.findUnique.mockResolvedValue(anulowany)
	prisma.eventRegistration.update.mockImplementation(async ({ where, data }) => ({ id: where.id, ...anulowany, ...data }))
	prisma.eventRegistration.findFirst.mockResolvedValue(null) // domyślnie brak rezerwy
})

test('anulowanie + powiadomienie + przeniesienie pierwszego z rezerwy (jest rezerwa)', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(rezerwowy)
	prisma.eventRegistration.update
		.mockResolvedValueOnce({ ...anulowany, statusRejestracji: 'ANULOWANA' }) // anulowany
		.mockResolvedValueOnce({ ...rezerwowy, statusRejestracji: 'POTWIERDZONA' }) // przeniesiony

	const res = await POST(
		req({ powiadomAnulowanego: true, przeniesRezerwowego: true, powiadomRezerwowego: true }),
		ctx
	)
	const body = await res.json()

	expect(res.status).toBe(200)
	// anulowany dostał status ANULOWANA
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'reg1' }, data: { statusRejestracji: 'ANULOWANA' } })
	)
	// pierwszy z rezerwy wyszukany po najstarszej dacie i przeniesiony
	expect(prisma.eventRegistration.findFirst).toHaveBeenCalledWith(
		expect.objectContaining({
			where: expect.objectContaining({ statusRejestracji: 'LISTA_REZERWOWA', id: { not: 'reg1' } }),
			orderBy: { createdAt: 'asc' },
		})
	)
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'rez1' }, data: { statusRejestracji: 'POTWIERDZONA' } })
	)
	// oba maile poszły
	expect(wyslijAnulowanie).toHaveBeenCalledTimes(1)
	expect(wyslijZwolnioneMiejsce).toHaveBeenCalledTimes(1)
	expect(body.przeniesiony.statusRejestracji).toBe('POTWIERDZONA')
})

test('przeniesRezerwowego=true, ale NIE MA rezerwy → nie przenosi, nie wysyła „zwolniło się miejsce"', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(null)

	const res = await POST(req({ powiadomAnulowanego: true, przeniesRezerwowego: true, powiadomRezerwowego: true }), ctx)
	const body = await res.json()

	expect(res.status).toBe(200)
	expect(body.przeniesiony).toBeNull()
	expect(wyslijZwolnioneMiejsce).not.toHaveBeenCalled()
	// tylko jedna aktualizacja (anulowany), bez przenoszenia
	expect(prisma.eventRegistration.update).toHaveBeenCalledTimes(1)
})

test('bez powiadomień: statusy zmienione, ale ŻADEN mail nie wychodzi', async () => {
	prisma.eventRegistration.findFirst.mockResolvedValue(rezerwowy)

	await POST(req({ powiadomAnulowanego: false, przeniesRezerwowego: true, powiadomRezerwowego: false }), ctx)

	expect(wyslijAnulowanie).not.toHaveBeenCalled()
	expect(wyslijZwolnioneMiejsce).not.toHaveBeenCalled()
	// ale przeniesienie się odbyło (to zmiana statusu, nie mail)
	expect(prisma.eventRegistration.update).toHaveBeenCalledWith(
		expect.objectContaining({ where: { id: 'rez1' }, data: { statusRejestracji: 'POTWIERDZONA' } })
	)
})

test('cudze zgłoszenie (inny eventId) → 404', async () => {
	prisma.eventRegistration.findUnique.mockResolvedValue({ ...anulowany, eventId: 'INNY' })
	const res = await POST(req({ powiadomAnulowanego: true }), ctx)
	expect(res.status).toBe(404)
	expect(prisma.eventRegistration.update).not.toHaveBeenCalled()
})

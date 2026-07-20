/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		event: { findUnique: jest.fn() },
		eventRegistration: { findMany: jest.fn() },
		eventMailing: { create: jest.fn(), delete: jest.fn() },
	},
}))
jest.mock('@/lib/queue', () => ({ enqueue: jest.fn().mockResolvedValue({ id: 'job1' }) }))

import prisma from '@/lib/prisma'
import { enqueue } from '@/lib/queue'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1' }) }
const rows = emails => emails.map(email => ({ email }))

// Domyślne, poprawne żądanie — testy nadpisują tylko to, co badają.
const zadanie = (nadpisz = {}) => req({ subject: 'Info', body: 'Treść', recipientFilter: 'CONFIRMED', template: 'INFO', ...nadpisz })

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', onlineUrl: 'https://teams.example/abc' })
	prisma.eventRegistration.findMany.mockResolvedValue(rows(['a@x.pl', 'b@x.pl', 'c@x.pl']))
	prisma.eventMailing.create.mockResolvedValue({ id: 'm1' })
})

test('INFO/CONFIRMED: tworzy kampanię z rodzajem, kolejkuje z opóźnieniem (undo), zwraca komplet', async () => {
	const res = await POST(zadanie(), ctx)
	const out = await res.json()

	expect(res.status).toBe(202)
	expect(out).toEqual({ enqueued: true, count: 3, mailingId: 'm1', jobId: 'job1', undoMs: 10000 })
	expect(prisma.eventMailing.create).toHaveBeenCalledWith(
		expect.objectContaining({
			data: expect.objectContaining({ eventId: 'ev1', recipientFilter: 'CONFIRMED', template: 'INFO' }),
		})
	)
	const [name, payload, opts] = enqueue.mock.calls[0]
	expect(name).toBe('event-bulk-mail')
	expect(payload).toEqual(expect.objectContaining({ mailingId: 'm1', onlyMissing: false }))
	expect(opts).toEqual(expect.objectContaining({ delay: 10000, attempts: 3 }))
})

test('WAITLIST_REJECTED idzie do listy rezerwowej (where po LISTA_REZERWOWA, bez potwierdzonych)', async () => {
	await POST(zadanie({ template: 'WAITLIST_REJECTED', recipientFilter: 'WAITLIST' }), ctx)
	const where = prisma.eventRegistration.findMany.mock.calls[0][0].where
	expect(where).toEqual(expect.objectContaining({ eventId: 'ev1', statusRejestracji: 'LISTA_REZERWOWA' }))
	expect(prisma.eventMailing.create.mock.calls[0][0].data.template).toBe('WAITLIST_REJECTED')
})

test('CHANGE do potwierdzonych I rezerwowych (obie grupy w jednym zapytaniu)', async () => {
	await POST(zadanie({ template: 'CHANGE', recipientFilter: 'CONFIRMED_AND_WAITLIST' }), ctx)
	const where = prisma.eventRegistration.findMany.mock.calls[0][0].where
	expect(where.statusRejestracji).toEqual({ in: ['POTWIERDZONA', 'LISTA_REZERWOWA'] })
})

test('PAID: filtr dokłada OPLACONE', async () => {
	await POST(zadanie({ recipientFilter: 'PAID' }), ctx)
	expect(prisma.eventRegistration.findMany.mock.calls[0][0].where).toEqual(
		expect.objectContaining({ statusRejestracji: 'POTWIERDZONA', statusPlatnosci: 'OPLACONE' })
	)
})

// --- Zabezpieczenie przed wysłaniem wiadomości NIE TEJ grupie ---

test('NIEDOZWOLONA para: „nie udało się" do POTWIERDZONYCH → 400, nic nie wychodzi', async () => {
	const res = await POST(zadanie({ template: 'WAITLIST_REJECTED', recipientFilter: 'CONFIRMED' }), ctx)
	expect(res.status).toBe(400)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('NIEDOZWOLONA para: informacje organizacyjne do LISTY REZERWOWEJ → 400', async () => {
	const res = await POST(zadanie({ template: 'INFO', recipientFilter: 'WAITLIST' }), ctx)
	expect(res.status).toBe(400)
	expect(enqueue).not.toHaveBeenCalled()
})

test('nieznana grupa odbiorców → 400 (BEZ cichego podstawienia potwierdzonych)', async () => {
	const res = await POST(zadanie({ recipientFilter: 'WSZYSCY' }), ctx)
	expect(res.status).toBe(400)
	expect(prisma.eventRegistration.findMany).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('nieznany rodzaj wiadomości → 400', async () => {
	const res = await POST(zadanie({ template: 'CZEGOS_TAKIEGO_NIE_MA' }), ctx)
	expect(res.status).toBe(400)
	expect(enqueue).not.toHaveBeenCalled()
})

// --- Twarda walidacja linku (#8) ---

test('LINK bez zapisanego onlineUrl → 400, nic nie wychodzi', async () => {
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', onlineUrl: '' })
	const res = await POST(zadanie({ template: 'LINK' }), ctx)
	expect(res.status).toBe(400)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('LINK z samymi spacjami w onlineUrl → też 400 (puste znaczy puste)', async () => {
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', onlineUrl: '   ' })
	const res = await POST(zadanie({ template: 'LINK' }), ctx)
	expect(res.status).toBe(400)
	expect(enqueue).not.toHaveBeenCalled()
})

test('LINK z poprawnym onlineUrl → przechodzi i kolejkuje', async () => {
	const res = await POST(zadanie({ template: 'LINK' }), ctx)
	expect(res.status).toBe(202)
	expect(enqueue).toHaveBeenCalledTimes(1)
	expect(prisma.eventMailing.create.mock.calls[0][0].data.template).toBe('LINK')
})

test('brak linku blokuje TYLKO rodzaj LINK — INFO przechodzi mimo pustego onlineUrl', async () => {
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1', onlineUrl: '' })
	const res = await POST(zadanie({ template: 'INFO' }), ctx)
	expect(res.status).toBe(202)
})

// --- Pozostałe ---

test('licznik to DISTINCT adresy, nie wiersze', async () => {
	prisma.eventRegistration.findMany.mockResolvedValue(rows(['A@x.pl', 'a@x.pl', 'b@x.pl']))
	const out = await (await POST(zadanie(), ctx)).json()
	expect(out.count).toBe(2)
})

test('pusty temat → 400, bez kampanii i bez kolejki', async () => {
	const res = await POST(zadanie({ subject: '  ' }), ctx)
	expect(res.status).toBe(400)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('zero odbiorców → 409, bez kampanii i bez kolejki', async () => {
	prisma.eventRegistration.findMany.mockResolvedValue([])
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(409)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('nieistniejące wydarzenie → 404', async () => {
	prisma.event.findUnique.mockResolvedValue(null)
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(404)
	expect(enqueue).not.toHaveBeenCalled()
})

test('gdy kolejkowanie padnie → kampania jest kasowana (bez sieroty w bazie)', async () => {
	enqueue.mockRejectedValueOnce(new Error('Redis padł'))
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(500)
	expect(prisma.eventMailing.delete).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'm1' } }))
})

test('brak sesji → 401', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce(null)
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(401)
	expect(enqueue).not.toHaveBeenCalled()
})

test('zalogowany CZŁONEK (nie admin) → 401, bez kampanii i bez kolejki', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(401)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

// --- Zalaczniki: sciezki przychodza z przegladarki, plik idzie do WSZYSTKICH uczestnikow ---

const OK_PATH = 'wydarzenia/ev1/maile/1_program.pdf'

test('poprawny zalacznik jest zapisywany przy kampanii', async () => {
	const res = await POST(zadanie({ attachments: [{ path: OK_PATH, filename: 'program.pdf', size: 1024, mimeType: 'application/pdf' }] }), ctx)
	expect(res.status).toBe(202)
	const dane = prisma.eventMailing.create.mock.calls[0][0].data
	expect(dane.attachments.create).toEqual([
		expect.objectContaining({ path: OK_PATH, filename: 'program.pdf', size: 1024 }),
	])
})

test.each([
	['plik z CUDZEGO wydarzenia', 'wydarzenia/INNY/maile/1_x.pdf'],
	['plik spoza katalogu kampanii', 'czlonkowie/tajne/umowa.pdf'],
	['proba wyjscia w gore drzewa', 'wydarzenia/ev1/maile/../../../czlonkowie/umowa.pdf'],
])('%s → 400, nic nie wychodzi', async (_opis, path) => {
	const res = await POST(zadanie({ attachments: [{ path, filename: 'x.pdf', size: 10 }] }), ctx)
	expect(res.status).toBe(400)
	expect(prisma.eventMailing.create).not.toHaveBeenCalled()
	expect(enqueue).not.toHaveBeenCalled()
})

test('zalaczniki ponad limit → 400', async () => {
	const res = await POST(zadanie({ attachments: [{ path: OK_PATH, filename: 'duzy.pdf', size: 99 * 1024 * 1024 }] }), ctx)
	expect(res.status).toBe(400)
	expect(enqueue).not.toHaveBeenCalled()
})

test('brak zalacznikow → kampania powstaje z pusta lista (nie wywala sie)', async () => {
	const res = await POST(zadanie(), ctx)
	expect(res.status).toBe(202)
	expect(prisma.eventMailing.create.mock.calls[0][0].data.attachments.create).toEqual([])
})

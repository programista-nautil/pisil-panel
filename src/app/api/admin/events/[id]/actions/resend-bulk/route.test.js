/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		eventMailing: { findUnique: jest.fn() },
		eventRegistration: { findMany: jest.fn() },
		mailSendLog: { findMany: jest.fn() },
	},
}))
jest.mock('@/lib/queue', () => ({ emailQueue: { add: jest.fn().mockResolvedValue({ id: 'job9' }) } }))

import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1' }) }
const rows = emails => emails.map(email => ({ email }))

beforeEach(() => {
	jest.clearAllMocks()
	prisma.eventMailing.findUnique.mockResolvedValue({ id: 'm1', eventId: 'ev1', recipientFilter: 'CONFIRMED' })
	prisma.eventRegistration.findMany.mockResolvedValue(rows(['a@x.pl', 'b@x.pl', 'c@x.pl']))
	// dotarło tylko do a@ → brakuje b@ i c@
	prisma.mailSendLog.findMany.mockResolvedValue([{ email: 'a@x.pl' }])
})

test('kolejkuje ponowienie tylko do brakujących (onlyMissing=true), licznik = brakujący', async () => {
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	const out = await res.json()

	expect(res.status).toBe(202)
	expect(out).toEqual({ enqueued: true, count: 2, mailingId: 'm1', jobId: 'job9', undoMs: 10000 })
	const [name, payload, opts] = emailQueue.add.mock.calls[0]
	expect(name).toBe('event-bulk-mail')
	expect(payload).toEqual(expect.objectContaining({ mailingId: 'm1', onlyMissing: true }))
	expect(opts).toEqual(expect.objectContaining({ delay: 10000 }))
})

test('wszyscy już dostali → 409, bez kolejki', async () => {
	prisma.mailSendLog.findMany.mockResolvedValue(rows(['a@x.pl', 'b@x.pl', 'c@x.pl']))
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	expect(res.status).toBe(409)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

test('kampania nie istnieje → 404', async () => {
	prisma.eventMailing.findUnique.mockResolvedValue(null)
	const res = await POST(req({ mailingId: 'nieistnieje' }), ctx)
	expect(res.status).toBe(404)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

test('kampania z innego wydarzenia → 404 (nie wolno ponowić cudzej)', async () => {
	prisma.eventMailing.findUnique.mockResolvedValue({ id: 'm1', eventId: 'INNY', recipientFilter: 'CONFIRMED' })
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	expect(res.status).toBe(404)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

test('brak mailingId → 400', async () => {
	const res = await POST(req({}), ctx)
	expect(res.status).toBe(400)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

test('brak sesji → 401', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce(null)
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	expect(res.status).toBe(401)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

test('zalogowany CZŁONEK (nie admin) → 401, bez kolejki', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	expect(res.status).toBe(401)
	expect(emailQueue.add).not.toHaveBeenCalled()
})

/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		eventMailing: { findUnique: jest.fn(), deleteMany: jest.fn() },
	},
}))
jest.mock('@/lib/queue', () => ({ emailQueue: { getJob: jest.fn() } }))
jest.mock('@/lib/gcs', () => ({ deleteFileFromGCS: jest.fn().mockResolvedValue() }))

import prisma from '@/lib/prisma'
import { emailQueue } from '@/lib/queue'
import { deleteFileFromGCS } from '@/lib/gcs'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1' }) }

// Domyślnie: świeża wysyłka (onlyMissing=false) tej kampanii, jeszcze w opóźnieniu.
function fakeJob({ state = 'delayed', name = 'event-bulk-mail', mailingId = 'm1', onlyMissing = false } = {}) {
	return {
		name,
		data: { mailingId, onlyMissing },
		getState: jest.fn().mockResolvedValue(state),
		remove: jest.fn().mockResolvedValue(),
	}
}

beforeEach(() => {
	jest.clearAllMocks()
	prisma.eventMailing.findUnique.mockResolvedValue({ eventId: 'ev1', attachments: [] })
	prisma.eventMailing.deleteMany.mockResolvedValue({ count: 1 })
})

test('świeża wysyłka w oknie undo → usuwa zadanie I kasuje kampanię', async () => {
	const job = fakeJob({ onlyMissing: false })
	emailQueue.getJob.mockResolvedValue(job)

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect(await res.json()).toEqual({ cancelled: true })
	expect(job.remove).toHaveBeenCalledTimes(1)
	expect(prisma.eventMailing.deleteMany).toHaveBeenCalledWith(
		expect.objectContaining({ where: expect.objectContaining({ id: 'm1', eventId: 'ev1' }) })
	)
})

test('cofnięta DOSYŁKA (onlyMissing=true) → usuwa zadanie, ale kampanii NIE kasuje', async () => {
	const job = fakeJob({ onlyMissing: true })
	emailQueue.getJob.mockResolvedValue(job)

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect((await res.json()).cancelled).toBe(true)
	expect(job.remove).toHaveBeenCalledTimes(1)
	expect(prisma.eventMailing.deleteMany).not.toHaveBeenCalled()
})

test('zadanie już aktywne → nie da się cofnąć, nic nie usuwa', async () => {
	const job = fakeJob({ state: 'active' })
	emailQueue.getJob.mockResolvedValue(job)

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect((await res.json()).cancelled).toBe(false)
	expect(job.remove).not.toHaveBeenCalled()
	expect(prisma.eventMailing.deleteMany).not.toHaveBeenCalled()
})

test('CUDZE zadanie (inny typ, np. wysyłka komunikatu) → 400, NIE usuwa go z kolejki', async () => {
	const job = fakeJob({ name: 'notify-members' })
	emailQueue.getJob.mockResolvedValue(job)

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect(res.status).toBe(400)
	expect(job.remove).not.toHaveBeenCalled()
})

test('kampania z INNEGO wydarzenia → 404, NIE usuwa zadania', async () => {
	const job = fakeJob()
	emailQueue.getJob.mockResolvedValue(job)
	prisma.eventMailing.findUnique.mockResolvedValue({ eventId: 'INNY', attachments: [] })

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect(res.status).toBe(404)
	expect(job.remove).not.toHaveBeenCalled()
})

test('zadania już nie ma w kolejce → cancelled:false (bez błędu)', async () => {
	emailQueue.getJob.mockResolvedValue(null)
	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect((await res.json()).cancelled).toBe(false)
})

test('brak jobId → 400', async () => {
	const res = await POST(req({ mailingId: 'm1' }), ctx)
	expect(res.status).toBe(400)
	expect(emailQueue.getJob).not.toHaveBeenCalled()
})

test('brak sesji → 401', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce(null)
	const res = await POST(req({ jobId: 'job1' }), ctx)
	expect(res.status).toBe(401)
	expect(emailQueue.getJob).not.toHaveBeenCalled()
})

test('zalogowany CZŁONEK (nie admin) → 401, bez dostępu do kolejki', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)
	expect(res.status).toBe(401)
	expect(emailQueue.getJob).not.toHaveBeenCalled()
})

test('cofnieta swieza wysylka kasuje TAKZE pliki zalacznikow z chmury (nie zostaja sieroty)', async () => {
	emailQueue.getJob.mockResolvedValue(fakeJob({ onlyMissing: false }))
	prisma.eventMailing.findUnique.mockResolvedValue({
		eventId: 'ev1',
		attachments: [{ path: 'wydarzenia/ev1/maile/1_program.pdf' }, { path: 'wydarzenia/ev1/maile/2_mapa.png' }],
	})

	const res = await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)

	expect((await res.json()).cancelled).toBe(true)
	expect(deleteFileFromGCS).toHaveBeenCalledTimes(2)
	expect(deleteFileFromGCS).toHaveBeenCalledWith('wydarzenia/ev1/maile/1_program.pdf')
})

test('cofnieta DOSYLKA nie rusza plikow (kampania zyje dalej)', async () => {
	emailQueue.getJob.mockResolvedValue(fakeJob({ onlyMissing: true }))
	prisma.eventMailing.findUnique.mockResolvedValue({
		eventId: 'ev1',
		attachments: [{ path: 'wydarzenia/ev1/maile/1_program.pdf' }],
	})

	await POST(req({ jobId: 'job1', mailingId: 'm1' }), ctx)

	expect(deleteFileFromGCS).not.toHaveBeenCalled()
	expect(prisma.eventMailing.deleteMany).not.toHaveBeenCalled()
})

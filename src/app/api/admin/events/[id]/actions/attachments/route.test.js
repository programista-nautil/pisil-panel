/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		event: { findUnique: jest.fn() },
		eventMailingAttachment: { findFirst: jest.fn() },
	},
}))
jest.mock('@/lib/gcs', () => ({
	uploadFileToGCS: jest.fn(async (buf, cel) => cel),
	deleteFileFromGCS: jest.fn().mockResolvedValue(),
}))

import prisma from '@/lib/prisma'
import { uploadFileToGCS, deleteFileFromGCS } from '@/lib/gcs'
import { isOwnAttachmentPath } from '@/lib/services/eventBulkMail'
import { POST, DELETE } from './route'

const ctx = { params: Promise.resolve({ id: 'ev1' }) }

function plik(name, size = 100, type = 'application/pdf') {
	return { name, size, type, arrayBuffer: async () => new ArrayBuffer(size) }
}
const uploadReq = file => ({ formData: async () => ({ get: k => (k === 'file' ? file : null) }) })
const delReq = body => ({ json: jest.fn().mockResolvedValue(body) })

beforeEach(() => {
	jest.clearAllMocks()
	prisma.event.findUnique.mockResolvedValue({ id: 'ev1' })
	prisma.eventMailingAttachment.findFirst.mockResolvedValue(null)
})

test('wgrany plik ląduje pod ścieżką TEGO wydarzenia', async () => {
	const res = await POST(uploadReq(plik('program.pdf')), ctx)
	const out = await res.json()
	expect(res.status).toBe(201)
	expect(out.path.startsWith('wydarzenia/ev1/maile/')).toBe(true)
	expect(out.filename).toBe('program.pdf')
})

// Kropki w nazwie tworzyly plik, ktorego potem NIE dalo sie wyslac (walidator odrzuca ".." w sciezce).
test('nazwa z podwójną kropką → ścieżka nadal przechodzi walidację wysyłki', async () => {
	const res = await POST(uploadReq(plik('Program konferencji..pdf')), ctx)
	const out = await res.json()
	expect(res.status).toBe(201)
	expect(out.path).not.toContain('..') // negatyw
	expect(isOwnAttachmentPath('ev1', out.path)).toBe(true) // pozytyw: da się wysłać
})

test('plik ponad limit → 400, nic nie ląduje w chmurze', async () => {
	const res = await POST(uploadReq(plik('duzy.pdf', 99 * 1024 * 1024)), ctx)
	expect(res.status).toBe(400)
	expect(uploadFileToGCS).not.toHaveBeenCalled()
})

test('brak pliku → 400', async () => {
	const res = await POST(uploadReq(null), ctx)
	expect(res.status).toBe(400)
	expect(uploadFileToGCS).not.toHaveBeenCalled()
})

test('nieistniejące wydarzenie → 404', async () => {
	prisma.event.findUnique.mockResolvedValue(null)
	const res = await POST(uploadReq(plik('a.pdf')), ctx)
	expect(res.status).toBe(404)
	expect(uploadFileToGCS).not.toHaveBeenCalled()
})

test('CZŁONEK (nie admin) nie wgra pliku → 401', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(uploadReq(plik('a.pdf')), ctx)
	expect(res.status).toBe(401)
	expect(uploadFileToGCS).not.toHaveBeenCalled()
})

// --- usuwanie ---

test('usuwa plik jeszcze niewpięty w kampanię', async () => {
	const res = await DELETE(delReq({ path: 'wydarzenia/ev1/maile/1_a.pdf' }), ctx)
	expect(res.status).toBe(200)
	expect(deleteFileFromGCS).toHaveBeenCalledWith('wydarzenia/ev1/maile/1_a.pdf')
})

test('plik WPIĘTY w kampanię jest nietykalny → 409 (inaczej worker padłby na pobraniu)', async () => {
	prisma.eventMailingAttachment.findFirst.mockResolvedValue({ id: 'att1' })
	const res = await DELETE(delReq({ path: 'wydarzenia/ev1/maile/1_a.pdf' }), ctx)
	expect(res.status).toBe(409)
	expect(deleteFileFromGCS).not.toHaveBeenCalled()
})

test.each([
	['cudze wydarzenie', 'wydarzenia/INNY/maile/1_a.pdf'],
	['spoza katalogu kampanii', 'czlonkowie/tajne/umowa.pdf'],
])('nie usunie pliku spoza swojego katalogu (%s) → 400', async (_o, path) => {
	const res = await DELETE(delReq({ path }), ctx)
	expect(res.status).toBe(400)
	expect(deleteFileFromGCS).not.toHaveBeenCalled()
})

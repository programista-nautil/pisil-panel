/**
 * @jest-environment node
 *
 * Test integracyjny endpointu weryfikacji zgłoszenia.
 * Kluczowe: dla członka stowarzyszonego nadajemy numer okólnika (żeby trafił do spisu),
 * ale NIE generujemy komunikatu i NIE uruchamiamy masowej wysyłki do członków.
 */
jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		submission: { findUnique: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
		communication: { aggregate: jest.fn() },
	},
}))
jest.mock('@/lib/queue', () => ({ enqueue: jest.fn() }))
jest.mock('@/lib/mailer', () => ({ sendToOne: jest.fn().mockResolvedValue({}) }))
jest.mock('@/lib/services/communicationService', () => ({
	generateCommunicationDoc: jest.fn().mockResolvedValue({ buffer: Buffer.from('x'), fileName: 'Komunikat.docx' }),
}))
jest.mock('@/lib/gcs', () => ({ uploadFileToGCS: jest.fn().mockResolvedValue('communications/x.docx') }))

import prisma from '@/lib/prisma'
import { enqueue } from '@/lib/queue'
import { sendToOne } from '@/lib/mailer'
import { generateCommunicationDoc } from '@/lib/services/communicationService'
import { POST } from './route'

const req = (body = { shouldSendEmails: true }) => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: { id: 'sub1' } }

const sub = overrides => ({
	id: 'sub1',
	formType: 'DEKLARACJA_CZLONKOWSKA',
	memberType: 'ZWYCZAJNY',
	companyName: 'Firma X',
	email: 'x@firma.pl',
	communicationNumber: null,
	...overrides,
})

describe('POST send-verification-email — wyjątek stowarzyszonego', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		prisma.submission.update.mockResolvedValue({})
		prisma.communication.aggregate.mockResolvedValue({ _max: { number: 0 } })
		prisma.submission.aggregate.mockResolvedValue({ _max: { communicationNumber: 0 } })
	})

	test('STOWARZYSZONY: nadaje numer (spis), bez komunikatu, bez masowej wysyłki, sam mail do kandydata', async () => {
		prisma.submission.findUnique.mockResolvedValue(sub({ memberType: 'STOWARZYSZONY' }))

		const res = await POST(req({ shouldSendEmails: true }), ctx)

		expect(res.status).toBe(200)
		// numer okólnika nadany (trafia do spisu jak zwykli)
		expect(prisma.submission.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ communicationNumber: 1 }) }),
		)
		expect(generateCommunicationDoc).not.toHaveBeenCalled()
		expect(enqueue).not.toHaveBeenCalled()
		expect(sendToOne).toHaveBeenCalledTimes(1) // tylko kandydat
	})

	test('STOWARZYSZONY + shouldSendEmails=false: numer nadany, ale bez żadnych maili', async () => {
		prisma.submission.findUnique.mockResolvedValue(sub({ memberType: 'STOWARZYSZONY' }))

		const res = await POST(req({ shouldSendEmails: false }), ctx)

		expect(res.status).toBe(200)
		// numer nadajemy niezależnie od wysyłki maili (to sprawa spisu, nie powiadomień)
		expect(prisma.submission.update).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ communicationNumber: 1 }) }),
		)
		expect(generateCommunicationDoc).not.toHaveBeenCalled()
		expect(enqueue).not.toHaveBeenCalled()
		expect(sendToOne).not.toHaveBeenCalled()
	})

	test('STOWARZYSZONY z istniejącym numerem: nie nadaje ponownie', async () => {
		prisma.submission.findUnique.mockResolvedValue(sub({ memberType: 'STOWARZYSZONY', communicationNumber: 42 }))

		const res = await POST(req({ shouldSendEmails: false }), ctx)

		expect(res.status).toBe(200)
		expect(prisma.submission.update).not.toHaveBeenCalled()
	})

	test('ZWYCZAJNY: generuje komunikat i uruchamia masową wysyłkę', async () => {
		prisma.submission.findUnique.mockResolvedValue(sub({ memberType: 'ZWYCZAJNY' }))

		const res = await POST(req({ shouldSendEmails: true }), ctx)

		expect(res.status).toBe(200)
		expect(generateCommunicationDoc).toHaveBeenCalled()
		expect(enqueue).toHaveBeenCalledWith('notify-members', expect.any(Object), expect.any(Object))
	})
})

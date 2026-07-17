/**
 * Test integracyjny processAcceptance — cały serwis z zamockowanym I/O
 * (Prisma, GCS, mail, docxtemplater, jszip, fs). Weryfikuje rozgałęzienie
 * przyjęcia dla członka stowarzyszonego vs zwyczajnego oraz stawki składek.
 */

// --- Mocki I/O ---
jest.mock('@/lib/prisma', () => ({
	__esModule: true,
	default: {
		member: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), aggregate: jest.fn() },
		submission: { update: jest.fn(), findUnique: jest.fn(), aggregate: jest.fn() },
		attachment: { create: jest.fn() },
	},
}))
jest.mock('@/lib/mailer', () => ({ sendToOne: jest.fn().mockResolvedValue({}) }))
jest.mock('fs/promises', () => ({ readFile: jest.fn().mockResolvedValue(Buffer.from('plik')) }))
jest.mock('pizzip', () => jest.fn())
jest.mock('docxtemplater', () =>
	jest.fn().mockImplementation(() => ({
		render: jest.fn(),
		getZip: () => ({ generate: () => Buffer.from('docx') }),
	})),
)
jest.mock('jszip', () =>
	jest.fn().mockImplementation(() => ({
		file: jest.fn(),
		generateAsync: jest.fn().mockResolvedValue(Buffer.from('zip')),
	})),
)
jest.mock('@/lib/gcs', () => ({ uploadFileToGCS: jest.fn().mockResolvedValue('gcs/path') }))
jest.mock('bcrypt', () => ({ hash: jest.fn().mockResolvedValue('hashed') }))
jest.mock('@/lib/mailingListUtils', () => ({ syncMailingList: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/publicListUtils', () => ({ addToPublicList: jest.fn().mockResolvedValue(undefined) }))
jest.mock('./docxToPdfService', () => ({ convertDocxToPdf: jest.fn() }))

import prisma from '@/lib/prisma'
import fsPromises from 'fs/promises'
import Docxtemplater from 'docxtemplater'
import JSZip from 'jszip'
import { syncMailingList } from '@/lib/mailingListUtils'
import { addToPublicList } from '@/lib/publicListUtils'
import { STATIC_ACCEPTANCE_DOCUMENTS, STATIC_ASSOCIATE_DOCUMENTS } from '@/lib/staticDocuments'
import { processAcceptance } from './acceptanceService'

const baseSubmission = overrides => ({
	id: 'sub1',
	formType: 'DEKLARACJA_CZLONKOWSKA',
	memberType: 'ZWYCZAJNY',
	companyName: 'Firma Testowa Sp. z o.o.',
	email: 'nowy@firma.pl',
	ceoName: 'Jan Kowalski',
	address: 'ul. Testowa 1, 00-001 Warszawa',
	phones: '123456789',
	invoiceEmail: 'faktury@firma.pl',
	notificationEmails: 'kontakt@firma.pl',
	fax: '',
	website: 'www.firma.pl',
	nip: '1234567890',
	acceptanceNumber: null,
	memberId: null,
	...overrides,
})

// Zbiera dane wstrzyknięte do wszystkich render() docxtemplatera
const renderedData = () => Docxtemplater.mock.results.map(r => r.value.render.mock.calls[0][0])
// Nazwy plików dodanych do ZIP-a statycznych załączników
const zippedFiles = () => JSZip.mock.results[0].value.file.mock.calls.map(c => c[0])
// Ścieżki, z których czytano szablony/pliki
const readPaths = () => fsPromises.readFile.mock.calls.map(c => c[0])

describe('processAcceptance — członek stowarzyszony vs zwyczajny', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		delete process.env.ENABLE_PDF_CONVERSION // wymuś ścieżkę DOCX (bez LibreOffice)

		prisma.member.findUnique.mockResolvedValue(null) // nowy członek
		prisma.member.aggregate.mockResolvedValue({ _max: { memberNumber: 0 } })
		prisma.submission.aggregate.mockResolvedValue({ _max: { acceptanceNumber: 0 } })
		prisma.member.create.mockResolvedValue({ id: 'm1' })
		prisma.member.update.mockResolvedValue({ id: 'm1' })
		prisma.submission.update.mockResolvedValue({})
		prisma.attachment.create.mockResolvedValue({})
	})

	test('STOWARZYSZONY (2026): szablony STOW, tylko 2 PDF-y, bez mailingu, składka 800', async () => {
		const submission = baseSubmission({ memberType: 'STOWARZYSZONY' })
		prisma.submission.findUnique.mockResolvedValue({ ...submission, attachments: [] })

		await processAcceptance(submission, '2026-06-15')

		// szablony w wariancie STOW
		expect(readPaths()).toEqual(
			expect.arrayContaining([
				expect.stringContaining('pismo zaśw. przyjęcie STOW.docx'),
				expect.stringContaining('pismo w sprawie składek STOW.docx'),
				expect.stringContaining('zasw STOW.docx'),
			]),
		)
		// tylko 2 statyczne PDF-y
		expect(zippedFiles()).toEqual(STATIC_ASSOCIATE_DOCUMENTS)
		expect(zippedFiles()).toHaveLength(2)
		// stowarzyszony NIE trafia na mailing
		expect(syncMailingList).not.toHaveBeenCalled()
		// nowy członek z poprawnym typem
		expect(prisma.member.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.objectContaining({ memberType: 'STOWARZYSZONY' }) }),
		)
		// stawka składki 2026 dla stowarzyszonego
		expect(renderedData()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kwota_skladki: '800,00',
					rok_skladki: 2026,
					data_uchwala_skladki: '22 czerwca 2023 roku',
				}),
			]),
		)
	})

	test('ZWYCZAJNY (2026): pełne szablony, 9 PDF-ów, mailing wywołany, składka 650', async () => {
		const submission = baseSubmission({ memberType: 'ZWYCZAJNY' })
		prisma.submission.findUnique.mockResolvedValue({ ...submission, attachments: [] })

		await processAcceptance(submission, '2026-06-15')

		// szablony bez sufiksu STOW
		const paths = readPaths().join('|')
		expect(paths).toContain('pismo zaśw. przyjęcie.docx')
		expect(paths).not.toContain('STOW.docx')
		// pełny zestaw statycznych PDF-ów
		expect(zippedFiles()).toEqual(STATIC_ACCEPTANCE_DOCUMENTS)
		expect(zippedFiles().length).toBeGreaterThan(2)
		// zwyczajny trafia na mailing
		expect(syncMailingList).toHaveBeenCalled()
		expect(addToPublicList).toHaveBeenCalled()
		// stawka składki 2026 dla zwyczajnego
		expect(renderedData()).toEqual(
			expect.arrayContaining([expect.objectContaining({ kwota_skladki: '650,00', rok_skladki: 2026 })]),
		)
	})

	test('STOWARZYSZONY (2027): składka 900 i uchwała 22 maja 2026', async () => {
		const submission = baseSubmission({ memberType: 'STOWARZYSZONY' })
		prisma.submission.findUnique.mockResolvedValue({ ...submission, attachments: [] })

		await processAcceptance(submission, '2027-01-15')

		expect(renderedData()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kwota_skladki: '900,00',
					rok_skladki: 2027,
					data_uchwala_skladki: '22 maja 2026 roku',
				}),
			]),
		)
	})

	test('istniejący ZWYCZAJNY członek: update zamiast create, mailing wywołany', async () => {
		const submission = baseSubmission({ memberType: 'ZWYCZAJNY' })
		prisma.member.findUnique.mockResolvedValue({ id: 'existing', notificationEmails: 'stary@firma.pl' })
		prisma.submission.findUnique.mockResolvedValue({ ...submission, attachments: [] })

		await processAcceptance(submission, '2026-06-15')

		expect(prisma.member.update).toHaveBeenCalled()
		expect(prisma.member.create).not.toHaveBeenCalled()
		expect(syncMailingList).toHaveBeenCalled()
	})
})

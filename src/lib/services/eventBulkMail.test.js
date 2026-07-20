/** @jest-environment node */

const { SCOPE, RECIPIENT_FILTERS, whereForFilter, normalizeEmail, targetEmails, missingEmails } = require('./eventBulkMail')

function fakePrisma({ regs = [], logs = [] } = {}) {
	return {
		eventRegistration: { findMany: jest.fn().mockResolvedValue(regs.map(email => ({ email }))) },
		mailSendLog: { findMany: jest.fn().mockResolvedValue(logs) },
	}
}

describe('whereForFilter', () => {
	it('CONFIRMED: potwierdzeni, BEZ filtra płatności', () => {
		const w = whereForFilter('ev1', 'CONFIRMED')
		expect(w).toEqual({ eventId: 'ev1', statusRejestracji: 'POTWIERDZONA' })
		expect(w).not.toHaveProperty('statusPlatnosci')
	})
	it('PAID: dokłada OPLACONE', () => {
		expect(whereForFilter('ev1', 'PAID')).toEqual({
			eventId: 'ev1',
			statusRejestracji: 'POTWIERDZONA',
			statusPlatnosci: 'OPLACONE',
		})
	})
})

describe('normalizeEmail', () => {
	it('trim + lower', () => {
		expect(normalizeEmail('  Jan@Firma.PL ')).toBe('jan@firma.pl')
	})
})

describe('targetEmails', () => {
	it('deduplikuje po normalizacji i odrzuca puste/niepoprawne', async () => {
		const prisma = fakePrisma({ regs: ['A@x.pl', 'a@x.pl', 'b@x.pl', '', 'bezmalpy', '  '] })
		const out = await targetEmails(prisma, 'ev1', 'CONFIRMED')
		expect(out.sort()).toEqual(['a@x.pl', 'b@x.pl'])
	})

	it('używa filtra PAID przy zapytaniu', async () => {
		const prisma = fakePrisma({ regs: ['a@x.pl'] })
		await targetEmails(prisma, 'ev1', 'PAID')
		expect(prisma.eventRegistration.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: expect.objectContaining({ statusPlatnosci: 'OPLACONE' }) })
		)
	})
})

describe('missingEmails', () => {
	const mailing = { id: 'm1', eventId: 'ev1', recipientFilter: 'CONFIRMED' }

	it('zwraca adresy BEZ wiersza WYSLANY (nieudane BLAD też są brakujące)', async () => {
		const prisma = fakePrisma({
			regs: ['a@x.pl', 'b@x.pl', 'c@x.pl'],
			logs: [{ email: 'a@x.pl' }], // pobierane są tylko WYSLANY (filtr w zapytaniu)
		})
		const out = await missingEmails(prisma, mailing)
		expect(out.sort()).toEqual(['b@x.pl', 'c@x.pl'])
		// zapytanie o dostarczone pyta wyłącznie o status WYSLANY dla tej kampanii
		expect(prisma.mailSendLog.findMany).toHaveBeenCalledWith(
			expect.objectContaining({ where: { scope: SCOPE, refId: 'm1', status: 'WYSLANY' } })
		)
	})

	it('gdy wszyscy dostali → pusto', async () => {
		const prisma = fakePrisma({ regs: ['a@x.pl'], logs: [{ email: 'a@x.pl' }] })
		expect(await missingEmails(prisma, mailing)).toEqual([])
	})
})

// --- Rozszerzone grupy odbiorców (#5 rezerwowa, #11 potwierdzeni + rezerwowa) ---

describe('whereForFilter — nowe grupy', () => {
	it('WAITLIST: tylko lista rezerwowa (żadnych potwierdzonych)', () => {
		const w = whereForFilter('ev1', 'WAITLIST')
		expect(w).toEqual({ eventId: 'ev1', statusRejestracji: 'LISTA_REZERWOWA' })
	})

	it('CONFIRMED_AND_WAITLIST: obie grupy, ale NIE anulowani', () => {
		const w = whereForFilter('ev1', 'CONFIRMED_AND_WAITLIST')
		expect(w.statusRejestracji).toEqual({ in: ['POTWIERDZONA', 'LISTA_REZERWOWA'] })
		expect(JSON.stringify(w)).not.toContain('ANULOWANA')
	})

	it('nieznana grupa RZUCA — żadnego cichego podstawienia innej grupy odbiorców', () => {
		expect(() => whereForFilter('ev1', 'WSZYSCY')).toThrow(/nieznana grupa/i)
		expect(() => whereForFilter('ev1', undefined)).toThrow()
		expect(() => whereForFilter('ev1', 'CONFIRMED')).not.toThrow() // para pozytywna
	})

	it('anulowani nie należą do ŻADNEJ grupy', () => {
		for (const f of Object.keys(RECIPIENT_FILTERS)) {
			expect(JSON.stringify(whereForFilter('ev1', f))).not.toContain('ANULOWANA')
		}
	})
})

// --- Straznik sciezek zalacznikow (plik idzie mailem do WSZYSTKICH uczestnikow) ---

describe('isOwnAttachmentPath', () => {
	const { isOwnAttachmentPath, attachmentPrefix, MAX_ATTACHMENTS_BYTES } = require('./eventBulkMail')

	it('przepuszcza wlasny zalacznik tego wydarzenia', () => {
		expect(isOwnAttachmentPath('ev1', `${attachmentPrefix('ev1')}1234_program.pdf`)).toBe(true)
	})

	it.each([
		['cudze wydarzenie', 'wydarzenia/INNY/maile/1_program.pdf'],
		['zupelnie inny katalog', 'czlonkowie/tajne/umowa.pdf'],
		['wyjscie w gore drzewa', 'wydarzenia/ev1/maile/../../../czlonkowie/umowa.pdf'],
		['pusty', ''],
		['nie-string', null],
	])('odrzuca: %s', (_opis, sciezka) => {
		expect(isOwnAttachmentPath('ev1', sciezka)).toBe(false)
	})

	it('limit zalacznikow jest sensowny (1-25 MB)', () => {
		expect(MAX_ATTACHMENTS_BYTES).toBeGreaterThan(1024 * 1024)
		expect(MAX_ATTACHMENTS_BYTES).toBeLessThanOrEqual(25 * 1024 * 1024)
	})
})

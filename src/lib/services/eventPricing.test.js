import { computeRegistration } from './eventPricing'

const konferencja = { typ: 'KONFERENCJA', pulaGratisNaFirme: 2, cenaCzlonek: 300, cenaNieczlonek: 600 }
const szkolenie = { typ: 'SZKOLENIE', pulaGratisNaFirme: 0, cenaCzlonek: 250, cenaNieczlonek: 500 }

describe('computeRegistration — konferencja', () => {
	test('członek w ramach puli gratis → CZLONEK_GRATIS, kwota 0, ZWOLNIONY', () => {
		expect(computeRegistration(konferencja, { isMember: true, gratisUsed: 0 })).toEqual({
			tier: 'CZLONEK_GRATIS',
			kwota: 0,
			statusPlatnosci: 'ZWOLNIONY',
		})
		expect(computeRegistration(konferencja, { isMember: true, gratisUsed: 1 }).tier).toBe('CZLONEK_GRATIS')
	})

	test('członek po wyczerpaniu puli → CZLONEK_PLATNY (cena członka)', () => {
		expect(computeRegistration(konferencja, { isMember: true, gratisUsed: 2 })).toEqual({
			tier: 'CZLONEK_PLATNY',
			kwota: 300,
			statusPlatnosci: 'OCZEKUJE',
		})
	})

	test('nie-członek → NIECZLONEK (pełna cena)', () => {
		expect(computeRegistration(konferencja, { isMember: false })).toEqual({
			tier: 'NIECZLONEK',
			kwota: 600,
			statusPlatnosci: 'OCZEKUJE',
		})
	})
})

describe('computeRegistration — szkolenie', () => {
	test('członek zawsze płatny (bez gratisów)', () => {
		expect(computeRegistration(szkolenie, { isMember: true, gratisUsed: 0 })).toEqual({
			tier: 'CZLONEK_PLATNY',
			kwota: 250,
			statusPlatnosci: 'OCZEKUJE',
		})
	})

	test('nie-członek → pełna cena', () => {
		expect(computeRegistration(szkolenie, { isMember: false }).tier).toBe('NIECZLONEK')
		expect(computeRegistration(szkolenie, { isMember: false }).kwota).toBe(500)
	})
})

describe('computeRegistration — ceny zerowe/brak', () => {
	test('cena 0 → status ZWOLNIONY', () => {
		const darmowe = { typ: 'SZKOLENIE', pulaGratisNaFirme: 0, cenaCzlonek: 0, cenaNieczlonek: 0 }
		expect(computeRegistration(darmowe, { isMember: true }).statusPlatnosci).toBe('ZWOLNIONY')
		expect(computeRegistration(darmowe, { isMember: false }).statusPlatnosci).toBe('ZWOLNIONY')
	})

	test('obsługuje Decimal/string jako cenę', () => {
		const ev = { typ: 'SZKOLENIE', pulaGratisNaFirme: 0, cenaCzlonek: '250.00', cenaNieczlonek: '500.00' }
		expect(computeRegistration(ev, { isMember: true }).kwota).toBe(250)
	})
})

// --- Rozjazdy kwota vs status platnosci (podpowiedz w panelu) ---

describe('registrationIssues', () => {
	const { registrationIssues } = require('./eventPricing')

	it('spójny wiersz nie zgłasza nic', () => {
		expect(registrationIssues({ tier: 'CZLONEK_PLATNY', kwota: 300, statusPlatnosci: 'OCZEKUJE' })).toEqual([])
		expect(registrationIssues({ tier: 'CZLONEK_GRATIS', kwota: 0, statusPlatnosci: 'ZWOLNIONY' })).toEqual([])
		expect(registrationIssues({ tier: 'NIECZLONEK', kwota: 600, statusPlatnosci: 'OPLACONE' })).toEqual([])
	})

	it('zwolniony przy kwocie > 0 — wypada z należności', () => {
		const out = registrationIssues({ tier: 'CZLONEK_PLATNY', kwota: 300, statusPlatnosci: 'ZWOLNIONY' })
		expect(out).toHaveLength(1)
		expect(out[0]).toMatch(/zwolniony/i)
		expect(out[0]).toContain('300,00 zł') // konkret, nie ogólnik
	})

	it('oczekuje na wpłatę przy kwocie 0 — nie ma na co czekać', () => {
		const out = registrationIssues({ tier: 'CZLONEK_GRATIS', kwota: 0, statusPlatnosci: 'OCZEKUJE' })
		expect(out).toHaveLength(1)
		expect(out[0]).toMatch(/oczekuje/i)
	})

	it('gratis z kwotą > 0 zgłasza OBA rozjazdy (poziom i płatność)', () => {
		const out = registrationIssues({ tier: 'CZLONEK_GRATIS', kwota: 500, statusPlatnosci: 'ZWOLNIONY' })
		expect(out).toHaveLength(2)
		expect(out.join(' ')).toMatch(/gratis/i)
	})

	it('wpłata przy kwocie 0', () => {
		expect(registrationIssues({ tier: 'CZLONEK_GRATIS', kwota: 0, statusPlatnosci: 'OPLACONE' })).toHaveLength(1)
	})

	it('brak danych nie wywraca funkcji', () => {
		expect(registrationIssues(null)).toEqual([])
		expect(registrationIssues({})).toEqual([]) // kwota 0 + brak statusu = brak rozjazdu
	})

	it('to, co wylicza computeRegistration, jest ZAWSZE spójne', () => {
		const warianty = [
			[{ typ: 'KONFERENCJA', pulaGratisNaFirme: 2, cenaCzlonek: 300, cenaNieczlonek: 600 }, { isMember: true, gratisUsed: 0 }],
			[{ typ: 'KONFERENCJA', pulaGratisNaFirme: 2, cenaCzlonek: 300, cenaNieczlonek: 600 }, { isMember: true, gratisUsed: 5 }],
			[{ typ: 'SZKOLENIE', cenaCzlonek: 300, cenaNieczlonek: 600 }, { isMember: false }],
			[{ typ: 'SZKOLENIE', cenaCzlonek: 0, cenaNieczlonek: 0 }, { isMember: true }],
		]
		for (const [event, ctx] of warianty) {
			expect(registrationIssues(computeRegistration(event, ctx))).toEqual([])
		}
	})
})

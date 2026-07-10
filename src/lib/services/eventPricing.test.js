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

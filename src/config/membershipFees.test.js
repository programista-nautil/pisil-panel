import { getMembershipFee } from './membershipFees'

describe('getMembershipFee — stawki składek per rok i typ członka', () => {
	test('2026: zwyczajny 650, stowarzyszony 800, uchwała 22 czerwca 2023', () => {
		expect(getMembershipFee(2026, 'ZWYCZAJNY')).toEqual({
			kwota: '650,00',
			rok: 2026,
			dataUchwaly: '22 czerwca 2023 roku',
		})
		expect(getMembershipFee(2026, 'STOWARZYSZONY')).toEqual({
			kwota: '800,00',
			rok: 2026,
			dataUchwaly: '22 czerwca 2023 roku',
		})
	})

	test('2027: zwyczajny 700, stowarzyszony 900, uchwała 22 maja 2026', () => {
		expect(getMembershipFee(2027, 'ZWYCZAJNY')).toEqual({
			kwota: '700,00',
			rok: 2027,
			dataUchwaly: '22 maja 2026 roku',
		})
		expect(getMembershipFee(2027, 'STOWARZYSZONY')).toEqual({
			kwota: '900,00',
			rok: 2027,
			dataUchwaly: '22 maja 2026 roku',
		})
	})

	test('2028+ używa stawek najnowszego roku (2027), ale rok zostaje faktyczny', () => {
		const fee = getMembershipFee(2028, 'ZWYCZAJNY')
		expect(fee.kwota).toBe('700,00')
		expect(fee.dataUchwaly).toBe('22 maja 2026 roku')
		expect(fee.rok).toBe(2028)
	})

	test('rok wcześniejszy niż zdefiniowany (2025) -> fallback do 2026', () => {
		expect(getMembershipFee(2025, 'ZWYCZAJNY').kwota).toBe('650,00')
		expect(getMembershipFee(2025, 'STOWARZYSZONY').kwota).toBe('800,00')
	})

	test('nieznany/pusty typ członka traktowany jak zwyczajny', () => {
		expect(getMembershipFee(2027, undefined).kwota).toBe('700,00')
		expect(getMembershipFee(2027, 'ZWYCZAJNY').kwota).toBe('700,00')
	})
})

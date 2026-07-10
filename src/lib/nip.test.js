import { normalizeNip, isValidNip } from './nip'

describe('normalizeNip', () => {
	test('usuwa myślniki i spacje, zostawia cyfry', () => {
		expect(normalizeNip('123-456-32-18')).toBe('1234563218')
		expect(normalizeNip('123 456 32 18')).toBe('1234563218')
		expect(normalizeNip('PL1234563218')).toBe('1234563218')
	})

	test('obsługuje puste/nullowe wejście', () => {
		expect(normalizeNip('')).toBe('')
		expect(normalizeNip(null)).toBe('')
		expect(normalizeNip(undefined)).toBe('')
	})
})

describe('isValidNip', () => {
	test('akceptuje poprawny NIP (suma kontrolna)', () => {
		expect(isValidNip('1234563218')).toBe(true)
	})

	test('akceptuje poprawny NIP z formatowaniem', () => {
		expect(isValidNip('123-456-32-18')).toBe(true)
	})

	test('odrzuca błędną cyfrę kontrolną', () => {
		expect(isValidNip('1234563217')).toBe(false)
	})

	test('odrzuca złą długość', () => {
		expect(isValidNip('123456321')).toBe(false) // 9 cyfr
		expect(isValidNip('12345632180')).toBe(false) // 11 cyfr
	})

	test('odrzuca same zera', () => {
		expect(isValidNip('0000000000')).toBe(false)
	})

	test('odrzuca NIP, którego suma kontrolna daje mod 11 == 10', () => {
		expect(isValidNip('9000000000')).toBe(false)
	})
})

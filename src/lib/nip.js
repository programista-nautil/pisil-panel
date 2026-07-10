// Walidacja i normalizacja polskiego numeru NIP.
// NIP = 10 cyfr; ostatnia cyfra to suma kontrolna.

const WEIGHTS = [6, 5, 7, 2, 3, 4, 5, 6, 7]

/**
 * Usuwa myślniki, spacje i inne separatory — zostawia same cyfry.
 * @param {string} nip
 * @returns {string} same cyfry
 */
export function normalizeNip(nip) {
	if (!nip) return ''
	return String(nip).replace(/[^0-9]/g, '')
}

/**
 * Sprawdza poprawność NIP-u (długość + suma kontrolna).
 * @param {string} nip surowy lub znormalizowany
 * @returns {boolean}
 */
export function isValidNip(nip) {
	const digits = normalizeNip(nip)
	if (digits.length !== 10) return false

	// Odrzuć oczywiste "puste" wartości (same zera)
	if (/^0{10}$/.test(digits)) return false

	const sum = WEIGHTS.reduce((acc, weight, i) => acc + weight * Number(digits[i]), 0)
	const checkDigit = sum % 11

	// mod 11 == 10 → NIP niepoprawny (nie istnieje taka cyfra kontrolna)
	if (checkDigit === 10) return false

	return checkDigit === Number(digits[9])
}

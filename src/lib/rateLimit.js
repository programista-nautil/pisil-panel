import { connection } from '@/lib/queue'

/**
 * Prosty rate-limit oparty na Redisie (INCR + EXPIRE w oknie czasowym).
 * Fail-open: gdy Redis jest niedostępny, NIE blokujemy — legalny użytkownik
 * nie może ucierpieć przez awarię infrastruktury.
 *
 * @param {string} key unikalny klucz (np. IP + nazwa akcji)
 * @param {{ limit?: number, windowSec?: number }} opts
 * @returns {Promise<boolean>} true = w limicie (można działać), false = przekroczono
 */
const REDIS_TIMEOUT_MS = 2000

// Bez tego „fail-open" był tylko deklaracją: przy niedostępnym Redisie komenda NIE rzuca błędem,
// tylko czeka w nieskończoność (ponawianie jest bezterminowe — patrz komentarz w queue.js). `catch`
// poniżej nigdy by się nie wykonał, a wysłanie formularza publicznego wisiałoby do timeoutu
// przeglądarki. Ograniczamy więc czas oczekiwania i dopiero to zamienia awarię w przepuszczenie.
function withRedisTimeout(promise) {
	return Promise.race([
		promise,
		new Promise((_, reject) =>
			setTimeout(() => reject(new Error('Redis nie odpowiada w wyznaczonym czasie.')), REDIS_TIMEOUT_MS)
		),
	])
}

export async function checkRateLimit(key, { limit = 10, windowSec = 600 } = {}) {
	try {
		const redisKey = `ratelimit:${key}`
		const count = await withRedisTimeout(connection.incr(redisKey))
		if (count === 1) {
			// Wygaśnięcia nie pilnujemy tak samo twardo: gdyby się nie udało, klucz zostanie bez TTL,
			// ale i tak liczy tylko do limitu, a kolejne wywołanie ustawi je ponownie.
			await withRedisTimeout(connection.expire(redisKey, windowSec)).catch(() => {})
		}
		return count <= limit
	} catch (error) {
		console.error('Rate limit — błąd Redis (fail-open):', error.message)
		return true
	}
}

/**
 * Wyciąga adres IP klienta z nagłówków (za nginx/proxy: x-forwarded-for).
 * @param {Request} request
 * @returns {string}
 */
export function getClientIp(request) {
	const xff = request.headers.get('x-forwarded-for')
	if (xff) return xff.split(',')[0].trim()
	return request.headers.get('x-real-ip') || 'unknown'
}

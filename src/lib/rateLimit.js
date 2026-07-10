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
export async function checkRateLimit(key, { limit = 10, windowSec = 600 } = {}) {
	try {
		const redisKey = `ratelimit:${key}`
		const count = await connection.incr(redisKey)
		if (count === 1) {
			await connection.expire(redisKey, windowSec)
		}
		return count <= limit
	} catch (error) {
		console.error('Rate limit — błąd Redis (fail-open):', error)
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

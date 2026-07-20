import { Queue } from 'bullmq'
import IORedis from 'ioredis'

// Konfiguracja połączenia z Redisem (domyślnie localhost:6379)
// Eksportowane, bo współdzielone także przez rate-limit (src/lib/rateLimit.js)
//
// `maxRetriesPerRequest: null` = ponawiaj w nieskończoność. To ZOSTAJE świadomie: dzięki temu po
// restarcie Redisa aplikacja sama wraca do działania, bez restartu procesu. Ceną jest to, że
// pojedyncza komenda potrafi czekać bez końca — dlatego czas oczekiwania ograniczamy PER WYWOŁANIE
// (`enqueue` niżej, `withRedisTimeout` w rateLimit.js), a nie przez wyłączenie ponawiania.
export const connection = new IORedis({
	host: process.env.REDIS_HOST || '127.0.0.1',
	port: process.env.REDIS_PORT || 6379,
	maxRetriesPerRequest: null,
})

export const emailQueue = new Queue('email-queue', {
	connection,
	// Bez tego Redis trzyma KAŻDE wykonane zadanie w nieskończoność (sprawdzone: leżały tam wszystkie
	// dotychczasowe). Rośnie to powoli, ale bez ograniczenia — a Redis z polityką `noeviction` po
	// zapełnieniu zaczyna ODRZUCAĆ ZAPISY, czyli położyłby i kolejkę, i rate-limit.
	// Zostawiamy okno na diagnostykę: tydzień wykonanych, miesiąc nieudanych (te są cenniejsze).
	defaultJobOptions: {
		removeOnComplete: { age: 7 * 24 * 3600, count: 500 },
		removeOnFail: { age: 30 * 24 * 3600 },
	},
})

const ENQUEUE_TIMEOUT_MS = 8000

/**
 * Dodanie zadania z OGRANICZONYM czasem oczekiwania.
 *
 * Po co: przy niedostępnym Redisie `queue.add()` NIE rzuca błędem — czeka w nieskończoność na gotowość
 * połączenia (sprawdzone empirycznie; nie pomaga ani `commandTimeout`, ani `enableOfflineQueue: false`,
 * bo BullMQ czeka na `waitUntilReady`). Trasa panelu wisiałaby wtedy do timeoutu przeglądarki, a admin
 * nie zobaczyłby ani sukcesu, ani błędu.
 *
 * Uwaga: przegrany wyścig NIE anuluje właściwego `add()` — gdy Redis wróci, zadanie może jeszcze trafić
 * do kolejki mimo zgłoszonego błędu. To bezpieczne, bo worker jest na to odporny: kampania wycofana po
 * błędzie już nie istnieje (worker loguje „nie wysyłam"), a `notify-members` chroni idempotencja po
 * `submissionId`. Wolimy uczciwy komunikat o błędzie niż wiszące żądanie.
 */
export function enqueue(name, data, opts) {
	return Promise.race([
		emailQueue.add(name, data, opts),
		new Promise((_, reject) =>
			setTimeout(
				() => reject(new Error('Kolejka nie odpowiada — Redis jest niedostępny.')),
				ENQUEUE_TIMEOUT_MS
			)
		),
	])
}

// Wspólne helpery domenowe dla wydarzeń (współdzielone przez publiczne API).

/**
 * Czy rejestracja na wydarzenie jest otwarta. Liczone na żywo przy każdym zapytaniu —
 * po minięciu granicy wydarzenie samo przełącza się na „rejestracja zakończona”.
 * @param {object} event rekord Event (status, registrationDeadline, startAt, limitMiejsc)
 * @param {number} confirmedCount liczba potwierdzonych zgłoszeń
 * @param {Date} now
 */
export function isRegistrationOpen(event, confirmedCount, now = new Date()) {
	if (event.status !== 'PUBLISHED') return false
	// Granica zapisów: podany termin ma pierwszeństwo. Gdy go NIE podano — zapisy zamykają się
	// z chwilą rozpoczęcia wydarzenia (bez tego wydarzenie bez terminu przyjmowałoby zgłoszenia
	// w nieskończoność, także długo po fakcie). To tylko reguła wyliczania — pola
	// `registrationDeadline` NIE podstawiamy, żeby na stronie nie pojawiał się sztuczny
	// znacznik „Zapisy do …” dla wydarzeń, przy których terminu świadomie nie ustawiono.
	const granicaZapisow = event.registrationDeadline || event.startAt
	if (granicaZapisow && new Date(granicaZapisow) < now) return false
	if (event.limitMiejsc != null && confirmedCount >= event.limitMiejsc) return false
	return true
}

/**
 * Kolejność wydarzeń na stronie: najpierw NADCHODZĄCE (od najbliższego), potem MINIONE
 * (od najnowszego). Zwykłe sortowanie rosnąco po dacie wypychałoby najstarsze wydarzenia
 * na samą górę — a minione zostają publicznie widoczne (zamknięte i zarchiwizowane też),
 * więc lista bez tego szybko stanęłaby na głowie.
 * @param {Array<{startAt: string|Date}>} events
 * @param {Date} now
 */
export function sortPublicEvents(events, now = new Date()) {
	const czas = (e) => new Date(e.startAt).getTime()
	const t = now.getTime()
	return [...events].sort((a, b) => {
		const aMinione = czas(a) < t
		const bMinione = czas(b) < t
		if (aMinione !== bMinione) return aMinione ? 1 : -1 // nadchodzące zawsze przed minionymi
		return aMinione ? czas(b) - czas(a) : czas(a) - czas(b)
	})
}

function toNum(value) {
	if (value === null || value === undefined) return null
	const n = Number(value)
	return Number.isFinite(n) ? n : null
}

/**
 * Postać wydarzenia bezpieczna do wystawienia publicznie (dla strony podglądu / WordPress).
 * Konwertuje Decimal → number i dokłada pola pochodne.
 */
export function serializePublicEvent(event, confirmedCount = 0) {
	const dostepneMiejsca = event.limitMiejsc != null ? Math.max(0, event.limitMiejsc - confirmedCount) : null

	return {
		id: event.id,
		slug: event.slug,
		typ: event.typ,
		tryb: event.tryb,
		title: event.title,
		description: event.description,
		startAt: event.startAt,
		endAt: event.endAt,
		prowadzacy: event.prowadzacy,
		address: event.address,
		onlineUrl: event.onlineUrl,
		limitMiejsc: event.limitMiejsc,
		registrationDeadline: event.registrationDeadline,
		bankAccount: event.bankAccount,
		cenaCzlonek: toNum(event.cenaCzlonek),
		cenaNieczlonek: toNum(event.cenaNieczlonek),
		pulaGratisNaFirme: event.pulaGratisNaFirme,
		seriesName: event.seriesName,
		zapisani: confirmedCount,
		dostepneMiejsca,
		rejestracjaOtwarta: isRegistrationOpen(event, confirmedCount),
	}
}

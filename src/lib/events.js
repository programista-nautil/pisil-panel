// Wspólne helpery domenowe dla wydarzeń (współdzielone przez publiczne API).

/**
 * DLACZEGO zapisy są zamknięte — jedyne źródło prawdy o tej regule.
 * Rozróżnienie powodu jest istotne, bo każdy znaczy co innego: STATUS i TERMIN to odmowa zapisu,
 * a LIMIT to skierowanie na listę rezerwową. Wcześniej trasa zapisu powielała ten warunek u siebie
 * i rozjechał się z tym plikiem (sprawdzała tylko `registrationDeadline`, pomijając regułę
 * „brak terminu → zapisy do startu”), przez co na wydarzenie po terminie dało się zapisać.
 * @param {object} event rekord Event (status, registrationDeadline, startAt, limitMiejsc)
 * @param {number} confirmedCount liczba potwierdzonych zgłoszeń
 * @param {Date} now
 * @returns {'STATUS'|'DEADLINE'|'LIMIT'|null} null = zapisy otwarte
 */
export function registrationClosedReason(event, confirmedCount, now = new Date()) {
	if (event.status !== 'PUBLISHED') return 'STATUS'
	// Granica zapisów: podany termin ma pierwszeństwo. Gdy go NIE podano — zapisy zamykają się
	// z chwilą rozpoczęcia wydarzenia (bez tego wydarzenie bez terminu przyjmowałoby zgłoszenia
	// w nieskończoność, także długo po fakcie). To tylko reguła wyliczania — pola
	// `registrationDeadline` NIE podstawiamy, żeby na stronie nie pojawiał się sztuczny
	// znacznik „Zapisy do …” dla wydarzeń, przy których terminu świadomie nie ustawiono.
	const granicaZapisow = event.registrationDeadline || event.startAt
	if (granicaZapisow && new Date(granicaZapisow) < now) return 'DEADLINE'
	if (event.limitMiejsc != null && confirmedCount >= event.limitMiejsc) return 'LIMIT'
	return null
}

/**
 * Czy rejestracja na wydarzenie jest otwarta. Liczone na żywo przy każdym zapytaniu —
 * po minięciu granicy wydarzenie samo przełącza się na „rejestracja zakończona”.
 */
export function isRegistrationOpen(event, confirmedCount, now = new Date()) {
	return registrationClosedReason(event, confirmedCount, now) === null
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
		// UWAGA: `onlineUrl` (link do spotkania) CELOWO nie jest wystawiany publicznie. Wcześniej wychodził
		// przez /api/public/events bez logowania — każdy pobierał link bez zapisu i płatności. Link wysyła
		// organizator świadomą akcją z panelu, wyłącznie do wybranych osób (mail „link do spotkania").
		limitMiejsc: event.limitMiejsc,
		registrationDeadline: event.registrationDeadline,
		bankAccount: event.bankAccount,
		cenaCzlonek: toNum(event.cenaCzlonek),
		cenaNieczlonek: toNum(event.cenaNieczlonek),
		pulaGratisNaFirme: event.pulaGratisNaFirme,
		zapisani: confirmedCount,
		dostepneMiejsca,
		rejestracjaOtwarta: isRegistrationOpen(event, confirmedCount),
		// Rozwijane bloki strony wydarzenia. Pusty blok nie istnieje w bazie, więc tu nie trafia —
		// WordPress renderuje dokładnie to, co dostanie, i nic więcej.
		sekcje: (event.sections || []).map(s => ({
			klucz: s.klucz,
			tekst: s.tekst || null,
			link: s.link || null,
			plikNazwa: s.plikNazwa || null,
			// Ścieżka WZGLĘDNA — WordPress dokleja adres panelu. Nie wystawiamy publicznych URL-i
			// z chmury; plik idzie zawsze przez naszą trasę.
			plikUrl: s.plikPath
				? `/api/public/events/${event.slug}/sections/${s.klucz.toLowerCase()}/plik`
				: null,
		})),
	}
}

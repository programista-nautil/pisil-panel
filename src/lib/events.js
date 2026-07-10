// Wspólne helpery domenowe dla wydarzeń (współdzielone przez publiczne API).

/**
 * Czy rejestracja na wydarzenie jest otwarta.
 * @param {object} event rekord Event (status, registrationDeadline, limitMiejsc)
 * @param {number} confirmedCount liczba potwierdzonych zgłoszeń
 * @param {Date} now
 */
export function isRegistrationOpen(event, confirmedCount, now = new Date()) {
	if (event.status !== 'PUBLISHED') return false
	if (event.registrationDeadline && new Date(event.registrationDeadline) < now) return false
	if (event.limitMiejsc != null && confirmedCount >= event.limitMiejsc) return false
	return true
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

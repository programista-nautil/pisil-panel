// Wyliczanie poziomu cenowego (tier) i kwoty dla zgłoszenia na wydarzenie.
//
// Reguły PISiL (stały model 2-poziomowy):
//   - Konferencja: członek gratis do `pulaGratisNaFirme` osób z jednej firmy (per NIP),
//     powyżej puli — cena członka; nie-członek — cena nie-członka.
//   - Szkolenie: członek — cena członka; nie-członek — cena nie-członka (brak gratisów).
//
// Ta funkcja jest CZYSTA (bez I/O) — dane o członkostwie i liczbie wykorzystanych
// gratisów przekazuje wołający (route), który robi zapytania do bazy w transakcji.

/**
 * Bezpieczna konwersja ceny (Prisma Decimal | string | number | null) na number.
 */
function toNumber(value) {
	if (value === null || value === undefined) return 0
	const n = Number(value)
	return Number.isFinite(n) ? n : 0
}

/**
 * @param {{ typ: 'SZKOLENIE'|'KONFERENCJA', pulaGratisNaFirme?: number, cenaCzlonek?: any, cenaNieczlonek?: any }} event
 * @param {{ isMember: boolean, gratisUsed?: number }} ctx  gratisUsed = ile gratisów tej firmy już wykorzystano na tym wydarzeniu
 * @returns {{ tier: string, kwota: number, statusPlatnosci: string }}
 */
export function computeRegistration(event, { isMember, gratisUsed = 0 }) {
	const cenaCzlonek = toNumber(event.cenaCzlonek)
	const cenaNieczlonek = toNumber(event.cenaNieczlonek)
	const pula = Number(event.pulaGratisNaFirme) || 0

	if (!isMember) {
		return {
			tier: 'NIECZLONEK',
			kwota: cenaNieczlonek,
			statusPlatnosci: cenaNieczlonek > 0 ? 'OCZEKUJE' : 'ZWOLNIONY',
		}
	}

	// Członek: gratis tylko na konferencji i tylko w ramach puli
	if (event.typ === 'KONFERENCJA' && gratisUsed < pula) {
		return { tier: 'CZLONEK_GRATIS', kwota: 0, statusPlatnosci: 'ZWOLNIONY' }
	}

	return {
		tier: 'CZLONEK_PLATNY',
		kwota: cenaCzlonek,
		statusPlatnosci: cenaCzlonek > 0 ? 'OCZEKUJE' : 'ZWOLNIONY',
	}
}

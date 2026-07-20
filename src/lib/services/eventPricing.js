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

const formatPln = v => `${toNumber(v).toFixed(2).replace('.', ',')} zł`

/**
 * Rozjazdy między poziomem, kwotą a statusem płatności — czyli kombinacje, których reguły wyżej
 * NIGDY by nie wyprodukowały. Powstają przy ręcznych korektach (admin zmienia jedno pole, zapominając
 * o drugim) i cicho psują rozliczenia: „zwolniony" wypada z należności, a „oczekuje" przy zerowej
 * kwocie każe czekać na przelew, którego nie będzie. Panel pokazuje je jako podpowiedź do poprawienia.
 *
 * @param {{tier?: string, kwota?: any, statusPlatnosci?: string}} reg
 * @returns {string[]} lista opisów po polsku; pusta = wiersz spójny
 */
export function registrationIssues(reg) {
	if (!reg) return []
	const kwota = toNumber(reg.kwota)
	const problemy = []

	if (kwota > 0 && reg.statusPlatnosci === 'ZWOLNIONY') {
		problemy.push(`Zwolniony z opłaty, ale kwota to ${formatPln(kwota)} — nie liczy się do należności.`)
	}
	if (kwota === 0 && reg.statusPlatnosci === 'OCZEKUJE') {
		problemy.push('Oczekuje na wpłatę, ale kwota to 0 zł — nie ma na co czekać.')
	}
	if (reg.tier === 'CZLONEK_GRATIS' && kwota > 0) {
		problemy.push(`Poziom „członek (gratis)", ale kwota to ${formatPln(kwota)}.`)
	}
	if (kwota === 0 && reg.statusPlatnosci === 'OPLACONE') {
		problemy.push('Odnotowana wpłata przy kwocie 0 zł.')
	}

	return problemy
}

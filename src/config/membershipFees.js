// Stawki składek członkowskich per rok — używane w piśmie w sprawie składek przy przyjęciu.
// Kwota zależy od roku daty przyjęcia i typu członka (zwyczajny/stowarzyszony).
//
// Zmiana od stycznia 2027 (Uchwała Zwyczajnego Walnego Zgromadzenia Członków PISiL z dnia 22 maja 2026 r.):
//   zwyczajni 700 PLN, stowarzyszeni 900 PLN.
// Do końca 2026 (Uchwała z dnia 22 czerwca 2023 r.): zwyczajni 650 PLN, stowarzyszeni 800 PLN.

const FEE_SCHEDULE = {
	2026: { zwyczajny: '650,00', stowarzyszony: '800,00', dataUchwaly: '22 czerwca 2023 roku' },
	2027: { zwyczajny: '700,00', stowarzyszony: '900,00', dataUchwaly: '22 maja 2026 roku' },
}

// Najnowszy zdefiniowany rok — używany dla lat >= od niego (żeby 2028+ też miał stawki 2027 aż do zmiany).
const LATEST_YEAR = Math.max(...Object.keys(FEE_SCHEDULE).map(Number))

/**
 * Zwraca dane składki do wstrzyknięcia w pismo: { kwota, rok, dataUchwaly }.
 * @param {number} year - rok daty przyjęcia
 * @param {'ZWYCZAJNY'|'STOWARZYSZONY'} memberType
 */
export function getMembershipFee(year, memberType) {
	const key = FEE_SCHEDULE[year] ? year : year > LATEST_YEAR ? LATEST_YEAR : 2026
	const entry = FEE_SCHEDULE[key]
	const kwota = memberType === 'STOWARZYSZONY' ? entry.stowarzyszony : entry.zwyczajny
	return { kwota, rok: year, dataUchwaly: entry.dataUchwaly }
}

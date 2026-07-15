import { isRegistrationOpen, sortPublicEvents } from './events'

// Bazowe wydarzenie: opublikowane, bez limitu, start w przyszłości.
const bazowe = {
	status: 'PUBLISHED',
	startAt: new Date('2026-11-19T10:00:00Z'),
	registrationDeadline: null,
	limitMiejsc: null,
}
const TERAZ = new Date('2026-07-15T12:00:00Z')

describe('isRegistrationOpen', () => {
	it('otwarte: opublikowane, start w przyszłości, bez terminu i limitu', () => {
		expect(isRegistrationOpen(bazowe, 0, TERAZ)).toBe(true)
	})

	it('zamknięte: status inny niż PUBLISHED', () => {
		for (const status of ['DRAFT', 'CLOSED', 'ARCHIVED']) {
			expect(isRegistrationOpen({ ...bazowe, status }, 0, TERAZ)).toBe(false)
		}
	})

	it('termin zapisów ma pierwszeństwo: miniony zamyka, przyszły nie', () => {
		const miniety = { ...bazowe, registrationDeadline: new Date('2026-07-01T23:59:00Z') }
		expect(isRegistrationOpen(miniety, 0, TERAZ)).toBe(false)

		const przyszly = { ...bazowe, registrationDeadline: new Date('2026-11-10T23:59:00Z') }
		expect(isRegistrationOpen(przyszly, 0, TERAZ)).toBe(true)
	})

	// Sedno zabezpieczenia: bez podanego terminu zapisy zamykają się z chwilą startu wydarzenia,
	// żeby wydarzenie po fakcie nie przyjmowało zgłoszeń w nieskończoność.
	it('bez terminu zapisów: zamyka się z chwilą rozpoczęcia wydarzenia', () => {
		const poFakcie = { ...bazowe, startAt: new Date('2026-07-01T10:00:00Z') }
		expect(isRegistrationOpen(poFakcie, 0, TERAZ)).toBe(false)
	})

	it('termin zapisów wygrywa nawet, gdy start jest później', () => {
		// Termin minął, choć samo wydarzenie dopiero będzie → zamknięte.
		const ev = {
			...bazowe,
			startAt: new Date('2026-12-01T10:00:00Z'),
			registrationDeadline: new Date('2026-07-10T23:59:00Z'),
		}
		expect(isRegistrationOpen(ev, 0, TERAZ)).toBe(false)
	})

	it('limit miejsc: zamyka po osiągnięciu, brak limitu nie zamyka', () => {
		const zLimitem = { ...bazowe, limitMiejsc: 2 }
		expect(isRegistrationOpen(zLimitem, 1, TERAZ)).toBe(true)
		expect(isRegistrationOpen(zLimitem, 2, TERAZ)).toBe(false)
		expect(isRegistrationOpen(zLimitem, 3, TERAZ)).toBe(false)
		expect(isRegistrationOpen({ ...bazowe, limitMiejsc: null }, 999, TERAZ)).toBe(true)
	})
})

describe('sortPublicEvents', () => {
	const ev = (slug, data) => ({ slug, startAt: new Date(data) })

	it('nadchodzące (od najbliższego) przed minionymi (od najnowszego)', () => {
		const lista = [
			ev('stare-2019', '2019-06-21T10:00:00Z'),
			ev('nadchodzace-grudzien', '2026-12-01T10:00:00Z'),
			ev('minione-maj', '2026-05-20T10:00:00Z'),
			ev('nadchodzace-wrzesien', '2026-09-17T10:00:00Z'),
		]
		const wynik = sortPublicEvents(lista, TERAZ).map(e => e.slug)
		expect(wynik).toEqual([
			'nadchodzace-wrzesien', // najbliższe
			'nadchodzace-grudzien',
			'minione-maj', // minione: od najnowszego
			'stare-2019',
		])
	})

	it('nie modyfikuje tablicy wejściowej', () => {
		const lista = [ev('b', '2026-12-01T10:00:00Z'), ev('a', '2026-09-01T10:00:00Z')]
		const kopia = [...lista]
		sortPublicEvents(lista, TERAZ)
		expect(lista).toEqual(kopia)
	})

	it('same minione: od najnowszego', () => {
		const lista = [ev('a', '2020-01-01T10:00:00Z'), ev('c', '2026-01-01T10:00:00Z'), ev('b', '2023-01-01T10:00:00Z')]
		expect(sortPublicEvents(lista, TERAZ).map(e => e.slug)).toEqual(['c', 'b', 'a'])
	})
})

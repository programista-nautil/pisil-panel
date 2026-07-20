import { isRegistrationOpen, sortPublicEvents, registrationClosedReason, serializePublicEvent, waitlistNeedsInfo, reminderDue } from './events'

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

// Powód zamknięcia decyduje o CZYM INNYM niż samo „otwarte/zamknięte”: STATUS i TERMIN to odmowa
// zapisu, a LIMIT kieruje na listę rezerwową. Trasa zapisu opiera się na tym rozróżnieniu.
describe('registrationClosedReason', () => {
	it('otwarte → null', () => {
		expect(registrationClosedReason(bazowe, 0, TERAZ)).toBeNull()
	})

	it('rozpoznaje powód: STATUS / TERMIN / LIMIT', () => {
		expect(registrationClosedReason({ ...bazowe, status: 'CLOSED' }, 0, TERAZ)).toBe('STATUS')
		expect(
			registrationClosedReason({ ...bazowe, registrationDeadline: new Date('2026-07-01T00:00:00Z') }, 0, TERAZ)
		).toBe('DEADLINE')
		expect(registrationClosedReason({ ...bazowe, limitMiejsc: 2 }, 2, TERAZ)).toBe('LIMIT')
	})

	// REGRESJA: reguła „brak terminu → zapisy do startu” była w isRegistrationOpen, ale trasa zapisu
	// powielała warunek u siebie i sprawdzała TYLKO registrationDeadline. Efekt: na wydarzenie bez
	// podanego terminu, którego data minęła, dało się zapisać. Powód MUSI wyjść jako TERMIN.
	it('bez terminu, po dacie wydarzenia → TERMIN (nie null)', () => {
		const poFakcie = { ...bazowe, registrationDeadline: null, startAt: new Date('2026-07-01T10:00:00Z') }
		expect(registrationClosedReason(poFakcie, 0, TERAZ)).toBe('DEADLINE')
	})

	it('STATUS ma pierwszeństwo przed LIMIT (szkic z pełną salą to nie lista rezerwowa)', () => {
		const szkicPelny = { ...bazowe, status: 'DRAFT', limitMiejsc: 1 }
		expect(registrationClosedReason(szkicPelny, 5, TERAZ)).toBe('STATUS')
	})

	it('jest spójny z isRegistrationOpen', () => {
		expect(isRegistrationOpen(bazowe, 0, TERAZ)).toBe(registrationClosedReason(bazowe, 0, TERAZ) === null)
		const pelny = { ...bazowe, limitMiejsc: 1 }
		expect(isRegistrationOpen(pelny, 1, TERAZ)).toBe(registrationClosedReason(pelny, 1, TERAZ) === null)
	})
})

describe('serializePublicEvent — link do spotkania nie wycieka', () => {
	const ev = {
		id: 'e1',
		slug: 'konf',
		typ: 'KONFERENCJA',
		tryb: 'ONLINE',
		title: 'Konferencja',
		startAt: new Date('2030-01-01T10:00:00Z'),
		onlineUrl: 'https://teams.microsoft.com/l/meetup-join/TAJNY',
		limitMiejsc: null,
		pulaGratisNaFirme: 0,
	}

	it('wystawia podstawowe pola (pozytyw), ale NIE zawiera onlineUrl (negatyw)', () => {
		const out = serializePublicEvent(ev, 0)
		expect(out.slug).toBe('konf') // pozytyw: serializacja się odbyła
		expect(out.title).toBe('Konferencja')
		expect('onlineUrl' in out).toBe(false) // link nie wychodzi publicznie
		expect(JSON.stringify(out)).not.toContain('teams.microsoft.com')
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

// --- Reguly podpowiedzi (wspolne dla listy wydarzen i widoku zgloszen) ---

describe('waitlistNeedsInfo (#5)', () => {
	const bazowe = { status: 'CLOSED', startAt: new Date('2026-12-01T10:00:00Z'), limitMiejsc: 10 }

	it('zapisy zamkniete recznie + ktos na rezerwowej → podpowiadamy', () => {
		expect(waitlistNeedsInfo(bazowe, { confirmed: 5, waitlist: 2, sentTemplates: [] })).toBe(true)
	})

	it('KOMPLET MIEJSC to za malo — ktos moze zrezygnowac, wiec NIE podpowiadamy', () => {
		const pelne = { status: 'PUBLISHED', startAt: new Date('2099-01-01T10:00:00Z'), limitMiejsc: 5 }
		expect(waitlistNeedsInfo(pelne, { confirmed: 5, waitlist: 3, sentTemplates: [] })).toBe(false)
		// para pozytywna: po recznym zamknieciu ta sama sytuacja JUZ podpowiada
		expect(waitlistNeedsInfo({ ...pelne, status: 'CLOSED' }, { confirmed: 5, waitlist: 3, sentTemplates: [] })).toBe(true)
	})

	it('po minieciu terminu → podpowiadamy', () => {
		const poTerminie = { status: 'PUBLISHED', startAt: new Date('2020-01-01T10:00:00Z') }
		expect(waitlistNeedsInfo(poTerminie, { confirmed: 1, waitlist: 1, sentTemplates: [] })).toBe(true)
	})

	it('nie podpowiadamy gdy juz wyslano albo nikogo nie ma na rezerwowej', () => {
		expect(waitlistNeedsInfo(bazowe, { confirmed: 5, waitlist: 2, sentTemplates: ['WAITLIST_REJECTED'] })).toBe(false)
		expect(waitlistNeedsInfo(bazowe, { confirmed: 5, waitlist: 0, sentTemplates: [] })).toBe(false)
	})
})

describe('reminderDue (#10)', () => {
	const teraz = new Date('2026-09-16T10:00:00Z')
	const zaDobe = { status: 'PUBLISHED', startAt: new Date('2026-09-17T10:00:00Z') }

	it('start za dobe, sa potwierdzeni, nie wyslano → podpowiadamy', () => {
		expect(reminderDue(zaDobe, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(true)
	})

	it('poza oknem 48 h → nie podpowiadamy', () => {
		const zaTydzien = { status: 'PUBLISHED', startAt: new Date('2026-09-23T10:00:00Z') }
		expect(reminderDue(zaTydzien, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(false)
	})

	it('po starcie wydarzenia → nie podpowiadamy', () => {
		const wczoraj = { status: 'PUBLISHED', startAt: new Date('2026-09-15T10:00:00Z') }
		expect(reminderDue(wczoraj, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(false)
	})

	it('szkic i archiwum pomijamy, mimo ze termin pasuje', () => {
		expect(reminderDue({ ...zaDobe, status: 'DRAFT' }, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(false)
		expect(reminderDue({ ...zaDobe, status: 'ARCHIVED' }, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(false)
		// para pozytywna: zamkniete zapisy to nadal wydarzenie, ktore sie odbedzie
		expect(reminderDue({ ...zaDobe, status: 'CLOSED' }, { confirmed: 3, sentTemplates: [] }, teraz)).toBe(true)
	})

	it('brak potwierdzonych albo juz wyslano → nie podpowiadamy', () => {
		expect(reminderDue(zaDobe, { confirmed: 0, sentTemplates: [] }, teraz)).toBe(false)
		expect(reminderDue(zaDobe, { confirmed: 3, sentTemplates: ['REMINDER'] }, teraz)).toBe(false)
	})
})

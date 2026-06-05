/**
 * @jest-environment node
 *
 * Testy czystej logiki dopasowania/uzupełniania (bez bazy danych).
 * Dane są syntetyczne (nie zależą od gitignorowanego publicMembersList.json),
 * więc test jest przenośny i bezpieczny w CI.
 */
const m = require('./fill-members-from-spis')

describe('canonicalizeCompany — ujednolicanie form prawnych i znaków', () => {
	test('sp. z o.o. == spółka z ograniczoną odpowiedzialnością', () => {
		expect(m.canonicalizeCompany('Adecon Sp. z o.o.')).toBe(
			m.canonicalizeCompany('ADECON Spółka z ograniczoną odpowiedzialnością')
		)
	})
	test('wielkość liter i polskie znaki nie mają znaczenia', () => {
		expect(m.canonicalizeCompany('Żegluga Gdańska')).toBe(m.canonicalizeCompany('zegluga gdanska'))
	})
	test('S.A. == spółka akcyjna', () => {
		expect(m.canonicalizeCompany('Adampol S.A.')).toBe(m.canonicalizeCompany('Adampol Spółka Akcyjna'))
	})
	test('podwójne spacje i interpunkcja', () => {
		expect(m.canonicalizeCompany('AC Porath  Sp. z o.o.')).toBe(m.canonicalizeCompany('AC Porath Sp. z o.o.'))
	})
	test('różne firmy NIE kolidują', () => {
		expect(m.canonicalizeCompany('Agroland Sp. z o.o.')).not.toBe(
			m.canonicalizeCompany('Agroland-Cargo Sp. z o.o.')
		)
	})
})

describe('isBlank — wykrywanie pustych pól i placeholderów', () => {
	test.each([
		[null, true], [undefined, true], ['', true], ['   ', true],
		['Brak numerów telefonu', true], ['brak danych', true], ['-', true],
		['brak_maila_firma_12@brak.danych', true],
		['58 6888686', false], ['biuro@x.pl', false], ['0', false],
	])('isBlank(%p) === %p', (v, expected) => {
		expect(m.isBlank(v)).toBe(expected)
	})
})

describe('normalizeEmail — trim + lowercase (spacja na końcu w spisie)', () => {
	test('mieszana wielkość liter i trailing space', () => {
		expect(m.normalizeEmail('biuro@adecon.pl ')).toBe('biuro@adecon.pl')
		expect(m.normalizeEmail('Mieczyslaw.Koloszycz@hartrodt.com')).toBe('mieczyslaw.koloszycz@hartrodt.com')
	})
})

describe('computeFills — uzupełnia tylko puste, nigdy nie nadpisuje', () => {
	const entry = { Nazwa: 'X', Ulica: 'Hutnicza 1', Kod: '81-212', Miasto: 'Gdynia', Tel: '58 660 51 00', Fax: '58 660 51 89', Strona_www: 'www.x.pl', Email: 'biuro@x.pl' }

	test('puste pola zostają uzupełnione (w tym sklejony adres)', () => {
		const member = { phones: 'Brak numerów telefonu', fax: null, website: '', address: null }
		const fills = m.computeFills(member, entry)
		const byField = Object.fromEntries(fills.map(f => [f.field, f.newValue]))
		expect(byField.phones).toBe('58 660 51 00')
		expect(byField.fax).toBe('58 660 51 89')
		expect(byField.website).toBe('www.x.pl')
		expect(byField.address).toBe('Hutnicza 1, 81-212 Gdynia')
	})

	test('istniejące wartości NIE są nadpisywane', () => {
		const member = { phones: '111 222 333', fax: '999', website: 'www.stara.pl', address: 'Inny Adres 5, 00-001 Warszawa' }
		expect(m.computeFills(member, entry)).toHaveLength(0)
	})

	test('puste pole w spisie nie tworzy uzupełnienia', () => {
		const member = { phones: null, fax: null, website: null, address: null }
		const entry2 = { ...entry, Fax: '', Strona_www: '' }
		const fields = m.computeFills(member, entry2).map(f => f.field)
		expect(fields).toContain('phones')
		expect(fields).not.toContain('fax')
		expect(fields).not.toContain('website')
	})
})

describe('computePlan — strategia dopasowania', () => {
	const spis = [
		{ Nazwa: 'Adecon Sp. z o.o.', Ulica: 'Dębe 47a', Kod: '62-817', Miasto: 'Żelazków', Tel: '+48 625 977 725', Fax: '+48 625 977 723', Email: 'biuro@adecon.pl ', Strona_www: 'www.adecon.pl' },
		{ Nazwa: 'A.HARTRODT(Polska) Sp. z o.o.', Ulica: 'ks. Kard. Wyszyńskiego 14', Kod: '70-201', Miasto: 'Szczecin', Tel: '(91) 433 16 90', Fax: '(91) 433 16 71', Email: 'kontakt@hartrodt.com', Strona_www: 'www.hartrodt.pl' },
		{ Nazwa: 'Trans-Pol Sp. z o.o.', Ulica: 'Portowa 1', Kod: '80-001', Miasto: 'Gdańsk', Tel: '58 111 11 11', Fax: '', Email: 'biuro@transpol.pl', Strona_www: 'www.transpol.pl' },
		{ Nazwa: 'Trans-Pol Sp. z o.o.', Ulica: 'Inna 2', Kod: '30-001', Miasto: 'Kraków', Tel: '12 222 22 22', Fax: '', Email: 'krakow@transpol.pl', Strona_www: '' },
	]

	test('dopasowanie po e-mailu (różne nazwy, ten sam mail) i uzupełnienie', () => {
		const members = [{ id: '1', memberNumber: 1, company: 'Hartrodt Polska', email: 'KONTAKT@hartrodt.com', phones: null, fax: null, website: null, address: null }]
		const { results, stats } = m.computePlan(members, spis)
		expect(results[0].method).toBe('email')
		expect(results[0].status).toBe('apply')
		expect(stats.apply).toBe(1)
	})

	test('fuzzy po nazwie z różną formą prawną + korroboracja po mieście', () => {
		const members = [{
			id: '2', memberNumber: 2,
			company: 'Adecon Spółka z ograniczoną odpowiedzialnością',
			email: 'inny.login@gmail.com', // nie pasuje po mailu
			phones: null, fax: null, website: null,
			address: 'Dębe 47a, 62-817 Żelazków',
		}]
		const { results } = m.computePlan(members, spis)
		expect(['name-exact', 'name-fuzzy']).toContain(results[0].method)
		expect(results[0].status).toBe('apply')
		expect(results[0].corroboration).toBe('match')
	})

	test('nazwa pasuje, ale miasto inne → review (różne firmy)', () => {
		const members = [{
			id: '3', memberNumber: 3, company: 'Adecon Sp. z o.o.',
			email: 'x@x.pl', phones: null, fax: null, website: null,
			address: 'Jakaś 1, 00-950 Warszawa', // inne miasto/kod niż spis
		}]
		const { results } = m.computePlan(members, spis)
		expect(results[0].status).toBe('review')
		expect(results[0].corroboration).toBe('mismatch')
	})

	test('niejednoznaczna nazwa (2 wpisy spisu) → review', () => {
		const members = [{
			id: '4', memberNumber: 4, company: 'Trans-Pol Sp. z o.o.',
			email: 'nieznany@x.pl', phones: null, fax: null, website: null, address: null,
		}]
		const { results } = m.computePlan(members, spis)
		expect(results[0].status).toBe('review')
		expect(results[0].method).toBe('name-exact')
	})

	test('brak dopasowania → unmatched, nic nie uzupełnia', () => {
		const members = [{ id: '5', memberNumber: 5, company: 'Firma Spoza Spisu XYZ', email: 'nikt@nigdzie.pl', phones: null, fax: null, website: null, address: null }]
		const { results, stats } = m.computePlan(members, spis)
		expect(results[0].status).toBe('unmatched')
		expect(stats.unmatched).toBe(1)
	})

	test('dopasowany, ale wszystkie pola wypełnione → nochange', () => {
		const members = [{
			id: '6', memberNumber: 6, company: 'Hartrodt', email: 'kontakt@hartrodt.com',
			phones: '111', fax: '222', website: 'www.h.pl', address: 'Pełny Adres 1, 70-201 Szczecin',
		}]
		const { results } = m.computePlan(members, spis)
		expect(results[0].status).toBe('nochange')
		expect(results[0].fills).toHaveLength(0)
	})
})

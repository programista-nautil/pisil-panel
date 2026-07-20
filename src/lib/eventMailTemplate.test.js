/** @jest-environment node */

const { textToHtml, defaultOrgTemplate } = require('./eventMailTemplate')

describe('textToHtml', () => {
	it('akapity i nowe linie → <p>/<br>', () => {
		expect(textToHtml('Linia 1\nLinia 2\n\nAkapit 2')).toBe('<p>Linia 1<br>Linia 2</p><p>Akapit 2</p>')
	})

	it('escapuje HTML wpisany przez człowieka (bez wstrzyknięcia)', () => {
		const out = textToHtml('<script>alert(1)</script>')
		expect(out).toContain('&lt;script&gt;')
		expect(out).not.toContain('<script>')
	})
})

describe('defaultOrgTemplate', () => {
	it('wstawia tytuł, termin i miejsce (stacjonarne)', () => {
		const { subject, body } = defaultOrgTemplate({
			title: 'Szkolenie X',
			startAt: new Date('2026-09-17T10:00:00Z'),
			tryb: 'STACJONARNE',
			address: 'ul. Długa 5, Gdańsk',
			prowadzacy: 'Jan Nowak',
		})
		expect(subject).toContain('Szkolenie X')
		expect(body).toContain('Szkolenie X')
		expect(body).toContain('ul. Długa 5, Gdańsk')
		expect(body).toContain('Jan Nowak')
	})

	it('online: NIE podaje linku, tylko zapowiada osobną wiadomość', () => {
		const { body } = defaultOrgTemplate({
			title: 'Webinar',
			startAt: new Date('2026-10-01T09:00:00Z'),
			tryb: 'ONLINE',
			onlineUrl: 'https://teams.microsoft.com/TAJNY',
		})
		expect(body).toMatch(/online/i)
		expect(body).not.toContain('teams.microsoft.com') // link idzie osobno, świadomą akcją
	})
})

// --- Nowe rodzaje wiadomości (#8 link, #11 zmiana, #5 nie udało się) ---

const { linkTemplate, changeTemplate, waitlistRejectedTemplate, TEMPLATES, isAllowedPair, getTemplate } = require('./eventMailTemplate')

describe('linkTemplate (#8)', () => {
	it('zawiera link do spotkania — to JEDYNY mail, który go niesie', () => {
		const { subject, body } = linkTemplate({ title: 'Webinar', startAt: new Date('2026-10-01T09:00:00Z'), tryb: 'ONLINE', onlineUrl: 'https://teams.example/xyz' })
		expect(subject).toContain('Webinar')
		expect(body).toContain('https://teams.example/xyz')
		expect(body).toMatch(/nie przekazywać dalej/i) // prośba o nieudostępnianie
	})
})

describe('waitlistRejectedTemplate (#5)', () => {
	it('BEZWZGLĘDNIE bez kwoty i numeru konta — te osoby za nic nie płacą', () => {
		const { body } = waitlistRejectedTemplate({ title: 'Szkolenie X', startAt: new Date('2026-09-17T10:00:00Z') })
		expect(body).toContain('Szkolenie X')
		expect(body).toMatch(/nie wiąże się[\s\S]*z żadną opłatą/i) // pozytywna para do asercji negatywnych
		expect(body).not.toMatch(/\d+[,.]\d{2}\s*zł/) // żadnej kwoty
		expect(body).not.toMatch(/\bPL\d{2}|numer konta|rachunk/i) // żadnego konta
	})
})

describe('changeTemplate (#11)', () => {
	it('sygnalizuje zmianę w temacie i zostawia miejsce na opis', () => {
		const { subject, body } = changeTemplate({ title: 'Konferencja', startAt: new Date('2026-11-05T09:00:00Z') })
		expect(subject).toContain('Konferencja')
		expect(subject).toMatch(/ważna informacja/i)
		expect(body).toMatch(/odwołanie|zmian/i)
	})
})

describe('rejestr szablonów — dozwolone pary rodzaj↔odbiorcy', () => {
	it('każdy rodzaj ma etykietę, builder i niepustą listę grup', () => {
		for (const [kind, t] of Object.entries(TEMPLATES)) {
			expect(typeof t.label).toBe('string')
			expect(typeof t.build).toBe('function')
			expect(t.allowedFilters.length).toBeGreaterThan(0)
			expect(getTemplate(kind)).toBe(t)
		}
	})

	it.each([
		['WAITLIST_REJECTED', 'WAITLIST', true],
		['WAITLIST_REJECTED', 'CONFIRMED', false], // „nie udało się" NIGDY do osób z miejscem
		['WAITLIST_REJECTED', 'CONFIRMED_AND_WAITLIST', false],
		['INFO', 'CONFIRMED', true],
		['INFO', 'WAITLIST', false],
		['LINK', 'CONFIRMED', true],
		['LINK', 'WAITLIST', false], // rezerwowi nie dostają linku do spotkania
		['CHANGE', 'CONFIRMED_AND_WAITLIST', true],
		['CHANGE', 'WAITLIST', false],
	])('%s → %s = %s', (kind, filtr, oczekiwane) => {
		expect(isAllowedPair(kind, filtr)).toBe(oczekiwane)
	})

	it('nieznany rodzaj nie jest dozwolony z żadną grupą', () => {
		expect(getTemplate('NIE_MA')).toBeNull()
		expect(isAllowedPair('NIE_MA', 'CONFIRMED')).toBe(false)
	})

	it('tylko LINK wymaga zapisanego onlineUrl', () => {
		const wymagajace = Object.entries(TEMPLATES).filter(([, t]) => t.requiresOnlineUrl).map(([k]) => k)
		expect(wymagajace).toEqual(['LINK'])
	})
})

describe('reminderTemplate (#10)', () => {
	const { reminderTemplate } = require('./eventMailTemplate')

	it('stacjonarne: podaje termin i miejsce, sygnalizuje przypomnienie', () => {
		const { subject, body } = reminderTemplate({
			title: 'Szkolenie X',
			startAt: new Date('2026-09-17T10:00:00Z'),
			tryb: 'STACJONARNE',
			address: 'ul. Długa 5, Gdańsk',
		})
		expect(subject).toMatch(/przypomnienie/i)
		expect(subject).toContain('Szkolenie X')
		expect(body).toContain('ul. Długa 5, Gdańsk')
		expect(body).toMatch(/przypominamy/i)
	})

	it('online: NIE dubluje linku, tylko odsyła do osobnej wiadomości', () => {
		const { body } = reminderTemplate({
			title: 'Webinar',
			startAt: new Date('2026-10-01T09:00:00Z'),
			tryb: 'ONLINE',
			onlineUrl: 'https://teams.example/TAJNY',
		})
		expect(body).toMatch(/online/i) // pozytyw: mówi, że online
		expect(body).toMatch(/osobnej wiadomości/i) // pozytyw: kieruje, gdzie szukać linku
		expect(body).not.toContain('teams.example') // link idzie tylko szablonem LINK
	})

	it('przypomnienie nie jest wezwaniem do zapłaty — bez kwoty i konta', () => {
		const { body } = reminderTemplate({ title: 'X', startAt: new Date('2026-10-01T09:00:00Z'), tryb: 'STACJONARNE', address: 'Gdańsk' })
		expect(body).toContain('Gdańsk') // pozytyw
		expect(body).not.toMatch(/\d+[,.]\d{2}\s*zł/)
		expect(body).not.toMatch(/do zapłaty|numer konta|przelew/i)
	})

	it.each([
		['REMINDER', 'CONFIRMED', true],
		['REMINDER', 'PAID', true],
		['REMINDER', 'WAITLIST', false], // rezerwowi nie mają na co przychodzić
		['REMINDER', 'CONFIRMED_AND_WAITLIST', false],
	])('para %s → %s = %s', (kind, filtr, oczekiwane) => {
		expect(isAllowedPair(kind, filtr)).toBe(oczekiwane)
	})
})

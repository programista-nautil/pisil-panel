/** @jest-environment node */

// Testujemy CZYSTE szablony — bez wysyłki. Każda asercja negatywna w parze z pozytywną (bez tego
// test jest zielony także wtedy, gdy html nie powstał). Negatywnie sprawdzamy WZORCE, nie wartości.
import { buildCancellationEmail, buildSpotFreedEmail } from './eventMails'

const WZORZEC_KWOTY = /\d+[.,]\d{2}\s*zł/i
const WZORZEC_KONTA = /\d{2}(\s?\d{4}){6}/
const LINK = 'https://teams.microsoft.com/l/meetup-join/TAJNY'

const event = {
	id: 'e1',
	title: 'Szkolenie testowe',
	startAt: new Date('2026-09-17T10:00:00Z'),
	bankAccount: '12 3456 7890 1234 5678 9012 3456',
	onlineUrl: LINK,
}

describe('#6 mail anulowania', () => {
	it('mówi o anulowaniu i daje kontakt (pozytyw), ale NIE zawiera kwoty, konta ani linku (negatyw)', () => {
		const { subject, html } = buildCancellationEmail(event, { email: 'jan@firma.pl', kwota: 500 })
		const t = `${subject} ${html}`

		expect(t).toContain(event.title) // pozytyw: treść powstała
		expect(t).toMatch(/anulowan/i) // pozytyw: mówi o co chodzi
		expect(t).toMatch(/kontakt|pomyłka/i) // pozytyw: ścieżka odwrotu

		expect(t).not.toMatch(WZORZEC_KWOTY) // to nie wezwanie do zapłaty
		expect(t).not.toMatch(WZORZEC_KONTA)
		expect(t).not.toContain(LINK) // żadnego linku do spotkania
		expect(t).not.toMatch(/do zapłaty|przelew/i)
	})
})

describe('#4 mail „zwolniło się miejsce"', () => {
	it('PŁATNE: zawiera kwotę, konto i deadline (pozytyw); nie zawiera linku (negatyw)', () => {
		const deadline = new Date('2026-09-10T00:00:00Z')
		const { subject, html } = buildSpotFreedEmail(event, { email: 'jan@firma.pl', kwota: 500 }, { deadline })
		const t = `${subject} ${html}`

		expect(t).toContain(event.title)
		expect(t).toMatch(/potwierdz/i) // prośba o potwierdzenie udziału
		expect(t).toMatch(WZORZEC_KWOTY) // kwota JEST (dopiero teraz człowiek ma za co płacić)
		expect(t).toContain(event.bankAccount) // konto JEST
		expect(t).toMatch(/10\.09\.2026|10 wrz/i) // deadline JEST

		expect(t).not.toContain(LINK) // link idzie osobno, świadomą akcją
	})

	it('BEZPŁATNE: mówi „udział bezpłatny", bez kwoty i konta', () => {
		const { html } = buildSpotFreedEmail(event, { email: 'x@x.pl', kwota: 0 }, {})
		expect(html).toMatch(/bezpłatn/i) // pozytyw
		expect(html).not.toMatch(WZORZEC_KWOTY) // brak „500,00 zł"
		expect(html).not.toContain(event.bankAccount)
	})
})

describe('#7 mail potwierdzenia wpłaty', () => {
	const { buildPaymentConfirmedEmail } = require('./eventMails')

	it('potwierdza wpłatę i podaje kwotę informacyjnie (pozytyw), ale NIE zawiera konta ani linku (negatyw)', () => {
		const { subject, html } = buildPaymentConfirmedEmail(event, { email: 'jan@firma.pl', kwota: 500 })
		const t = `${subject} ${html}`

		expect(t).toContain(event.title) // pozytyw: treść powstała
		expect(t).toMatch(/potwierdzamy otrzymanie wpłaty/i) // pozytyw: mówi o co chodzi
		expect(t).toMatch(WZORZEC_KWOTY) // pozytyw: kwota informacyjnie

		// Wpłata JUŻ wpłynęła — numer konta zrobiłby z tego ponowne wezwanie do zapłaty.
		expect(t).not.toMatch(WZORZEC_KONTA)
		expect(t).not.toMatch(/do zapłaty|prosimy o wpłat|przelew na konto/i)
		expect(t).not.toContain(LINK) // link idzie osobną, świadomą wysyłką
	})

	it('kwota 0 zł: potwierdza udział, ale nie pokazuje kwoty', () => {
		const { html } = buildPaymentConfirmedEmail(event, { email: 'jan@firma.pl', kwota: 0 })
		expect(html).toMatch(/potwierdzamy otrzymanie wpłaty/i) // pozytyw
		expect(html).not.toMatch(WZORZEC_KWOTY)
	})
})

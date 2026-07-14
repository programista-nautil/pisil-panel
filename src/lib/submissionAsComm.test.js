import { submissionToComm } from './submissionAsComm'

const base = overrides => ({
	id: 'sub1',
	companyName: 'Firma Testowa',
	communicationNumber: 12,
	createdAt: new Date('2026-06-10'),
	updatedAt: new Date('2026-06-10'),
	memberType: 'ZWYCZAJNY',
	...overrides,
})

describe('submissionToComm — oznaczenie w spisie', () => {
	test('zwyczajny: bez dopisku o stowarzyszeniu', () => {
		const c = submissionToComm(base({ memberType: 'ZWYCZAJNY' }))
		expect(c.subject).toBe('Deklaracja członkowska do PISiL (Firma Testowa)')
		expect(c.subject).not.toContain('stowarzyszony')
	})

	test('stowarzyszony: dopisek „(członek stowarzyszony)" w subject i title', () => {
		const c = submissionToComm(base({ memberType: 'STOWARZYSZONY' }))
		expect(c.subject).toBe('Deklaracja członkowska do PISiL (Firma Testowa) (członek stowarzyszony)')
		expect(c.title).toBe('Deklaracja członkowska do PISiL (Firma Testowa) (członek stowarzyszony)')
	})

	test('zachowuje numer okólnika', () => {
		const c = submissionToComm(base({ memberType: 'STOWARZYSZONY', communicationNumber: 59 }))
		expect(c.number).toBe(59)
	})
})

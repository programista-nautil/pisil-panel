import { STATIC_ACCEPTANCE_DOCUMENTS, STATIC_ASSOCIATE_DOCUMENTS } from './staticDocuments'

describe('staticDocuments — zestawy załączników przyjęcia', () => {
	test('członkowie stowarzyszeni dostają dokładnie 2 regulaminy', () => {
		expect(STATIC_ASSOCIATE_DOCUMENTS).toEqual(['regulam ekspert.pdf', 'SA regulamin-pol.pdf'])
	})

	test('zestaw stowarzyszonego jest podzbiorem pełnego zestawu', () => {
		for (const doc of STATIC_ASSOCIATE_DOCUMENTS) {
			expect(STATIC_ACCEPTANCE_DOCUMENTS).toContain(doc)
		}
	})

	test('zwyczajni dostają pełny (większy) zestaw', () => {
		expect(STATIC_ACCEPTANCE_DOCUMENTS.length).toBeGreaterThan(STATIC_ASSOCIATE_DOCUMENTS.length)
		// pliki, których stowarzyszeni NIE dostają
		expect(STATIC_ACCEPTANCE_DOCUMENTS).toContain('Biuletyn_2012_11-12.pdf')
		expect(STATIC_ASSOCIATE_DOCUMENTS).not.toContain('Biuletyn_2012_11-12.pdf')
		expect(STATIC_ASSOCIATE_DOCUMENTS).not.toContain('ubezp..pdf')
	})
})

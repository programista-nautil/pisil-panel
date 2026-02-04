import fs from 'fs'
import { addToPublicList, removeFromPublicList } from './publicListUtils'

// Mockujemy moduł fs
jest.mock('fs')

describe('publicListUtils', () => {
	const MOCK_FILE_PATH = expect.stringContaining('publicMembersList.json')

	beforeEach(() => {
		jest.clearAllMocks()

		// WAŻNE: Nie blokujemy console.error, żeby widzieć ewentualne błędy w logice
		// Domyślne zachowanie mocków:
		fs.existsSync.mockReturnValue(true) // Zakładamy, że pliki/katalogi istnieją
		fs.writeFileSync.mockClear()
	})

	test('addToPublicList - powinien dodać nowego członka do pustej listy', async () => {
		// ARRANGE
		fs.readFileSync.mockReturnValue('[]')

		const newMember = {
			companyName: 'Firma Testowa',
			address: 'Testowa 1, 00-001 Warszawa',
			email: 'test@firma.pl',
			phones: '123456789',
		}

		// ACT
		await addToPublicList(newMember)

		// ASSERT
		// Najpierw sprawdzamy CZY została wywołana
		expect(fs.writeFileSync).toHaveBeenCalledTimes(1)

		// Dopiero potem sprawdzamy z czym
		expect(fs.writeFileSync).toHaveBeenCalledWith(MOCK_FILE_PATH, expect.stringContaining('"Nazwa": "Firma Testowa"'))
	})

	test('addToPublicList - powinien zaktualizować istniejącego członka', async () => {
		// ARRANGE
		const existingData = [
			{
				Nazwa: 'Stara Nazwa',
				Email: 'test@firma.pl',
				Miasto: 'Kraków',
				Ulica: 'Stara 1',
				Kod: '00-000',
				Tel: '',
				Fax: '',
				Strona_www: '',
			},
		]

		// Mockujemy odczyt pliku - musi zwrócić poprawnego JSONa
		fs.readFileSync.mockReturnValue(JSON.stringify(existingData))

		const updatedMember = {
			companyName: 'Nowa Nazwa SA',
			address: 'Nowa 5, 00-002 Gdańsk',
			email: 'test@firma.pl', // Ten sam email
			phones: '987654321',
		}

		// ACT
		await addToPublicList(updatedMember)

		// ASSERT
		expect(fs.writeFileSync).toHaveBeenCalledTimes(1)

		// Bezpieczne pobranie argumentów
		const calls = fs.writeFileSync.mock.calls
		const [filePath, content] = calls[0]
		const savedData = JSON.parse(content)

		expect(savedData).toHaveLength(1) // Nie powinno dodać duplikatu
		expect(savedData[0].Nazwa).toBe('Nowa Nazwa SA') // Nazwa zaktualizowana
		expect(savedData[0].Miasto).toBe('Gdańsk') // Miasto zaktualizowane
	})

	test('removeFromPublicList - powinien usunąć członka po emailu', async () => {
		// ARRANGE
		const existingData = [
			{ Nazwa: 'Firma A', Email: 'a@a.pl' },
			{ Nazwa: 'Firma B', Email: 'b@b.pl' },
		]
		fs.readFileSync.mockReturnValue(JSON.stringify(existingData))

		// ACT
		await removeFromPublicList('b@b.pl')

		// ASSERT
		expect(fs.writeFileSync).toHaveBeenCalledTimes(1)

		const calls = fs.writeFileSync.mock.calls
		const [filePath, content] = calls[0]
		const savedData = JSON.parse(content)

		expect(savedData).toHaveLength(1)
		expect(savedData[0].Email).toBe('a@a.pl')
	})
})

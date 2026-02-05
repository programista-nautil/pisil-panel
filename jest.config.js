const nextJest = require('next/jest')

const createJestConfig = nextJest({
	// Ścieżka do Twojej aplikacji Next.js, aby ładować pliki .env i configi
	dir: './',
})

// Niestandardowa konfiguracja Jesta
const customJestConfig = {
	// SetupFilesAfterEnv pozwala uruchomić kod przed każdym testem (np. importy globalne)
	// Jeśli nie masz tego pliku (tworzymy go w kroku 3), zakomentuj tę linię:
	// setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

	// Jeśli używasz aliasów w tsconfig/jsconfig (np. @/components), to jest potrzebne:
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},

	// Ważne: testEnvironment musi być 'jsdom' dla komponentów Reacta
	testEnvironment: 'jest-environment-jsdom',
}

// createJestConfig eksportuje asynchroniczną konfigurację, co jest wymagane w Next.js
module.exports = createJestConfig(customJestConfig)

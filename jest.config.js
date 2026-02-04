const nextJest = require('next/jest')

const createJestConfig = nextJest({
	dir: './',
})

const customJestConfig = {
	testEnvironment: 'node', // Testujemy logikę backendową (fs), więc środowisko node
}

module.exports = createJestConfig(customJestConfig)

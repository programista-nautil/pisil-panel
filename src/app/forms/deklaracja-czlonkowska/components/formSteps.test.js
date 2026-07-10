/**
 * Testy komponentowe kroków deklaracji — checkbox „członek stowarzyszony"
 * chowa pkt IV a/b/c, cały pkt V (z notką) i pkt VI, oraz wyrejestrowuje
 * ukryte pola wymagane (żeby nie blokowały walidacji).
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import { Step1, Step3, Step4, Step5 } from './formSteps'

// Minimalny mock react-hook-form register (rendering-only)
const register = name => ({ name, onChange: () => {}, onBlur: () => {}, ref: () => {} })

const renderStep = (Step, { isStow = false } = {}) => {
	const unregister = jest.fn()
	const watch = jest.fn(() => isStow)
	render(<Step register={register} errors={{}} watch={watch} unregister={unregister} />)
	return { unregister, watch }
}

describe('Deklaracja — kroki formularza', () => {
	test('Step1: renderuje checkbox „członek stowarzyszony"', () => {
		render(<Step1 register={register} errors={{}} />)
		expect(screen.getByText(/Składam deklarację jako CZŁONEK STOWARZYSZONY/i)).toBeInTheDocument()
	})

	describe('Step3 — pkt IV a/b/c (licencja / ISO / OC)', () => {
		test('zwyczajny: pola licencji/ISO/OC są widoczne', () => {
			renderStep(Step3, { isStow: false })
			expect(screen.getByText(/Licencja na pośrednictwo przy przewozie rzeczy/)).toBeInTheDocument()
			expect(screen.getByText(/Certyfikat ISO 9002/)).toBeInTheDocument()
			expect(screen.getByText(/Ubezpieczenie o.c. spedytora/)).toBeInTheDocument()
			// pola wspólne zostają
			expect(screen.getByText(/Data rejestracji firmy/)).toBeInTheDocument()
		})

		test('stowarzyszony: pola licencji/ISO/OC ukryte, reszta zostaje, wyrejestrowanie wywołane', () => {
			const { unregister } = renderStep(Step3, { isStow: true })
			expect(screen.queryByText(/Licencja na pośrednictwo przy przewozie rzeczy/)).not.toBeInTheDocument()
			expect(screen.queryByText(/Certyfikat ISO 9002/)).not.toBeInTheDocument()
			expect(screen.queryByText(/Ubezpieczenie o.c. spedytora/)).not.toBeInTheDocument()
			expect(screen.getByText(/Data rejestracji firmy/)).toBeInTheDocument()
			expect(screen.getByText(/Opis prowadzonej działalności/)).toBeInTheDocument()
			expect(unregister).toHaveBeenCalledWith(['transportLicense', 'iso9002Certificate', 'insuranceOC'])
		})
	})

	describe('Step4 — pkt V (wachlarz usług)', () => {
		test('zwyczajny: pola usług widoczne, brak notki', () => {
			renderStep(Step4, { isStow: false })
			expect(screen.getByText(/Transport morski/)).toBeInTheDocument()
			expect(screen.queryByText(/nie dotyczy członków stowarzyszonych/)).not.toBeInTheDocument()
		})

		test('stowarzyszony: notka zamiast pól, wyrejestrowanie wywołane', () => {
			const { unregister } = renderStep(Step4, { isStow: true })
			expect(screen.getByText(/nie dotyczy członków stowarzyszonych/)).toBeInTheDocument()
			expect(screen.queryByText(/Transport morski/)).not.toBeInTheDocument()
			expect(unregister).toHaveBeenCalledWith(['organizacjaPrzewozow', 'krajowaSiec', 'zagranicznaSSiec', 'inneFormy'])
		})
	})

	describe('Step5 — pkt VI (organizacje + rekomendacje)', () => {
		test('zwyczajny: organizacje i rekomendacje widoczne', () => {
			renderStep(Step5, { isStow: false })
			expect(screen.getByText(/Do jakich organizacji firma należy/)).toBeInTheDocument()
			expect(screen.getByText(/rekomendujący przystąpienie do PISiL/)).toBeInTheDocument()
		})

		test('stowarzyszony: organizacje/rekomendacje ukryte, oświadczenie zostaje, wyrejestrowanie wywołane', () => {
			const { unregister } = renderStep(Step5, { isStow: true })
			expect(screen.queryByText(/Do jakich organizacji firma należy/)).not.toBeInTheDocument()
			expect(screen.queryByText(/rekomendujący przystąpienie do PISiL/)).not.toBeInTheDocument()
			// reszta Step5 zostaje
			expect(screen.getByText(/zapoznałem\/am się z treścią Statutu/)).toBeInTheDocument()
			expect(unregister).toHaveBeenCalledWith(['organizacje', 'rekomendacje'])
		})
	})
})

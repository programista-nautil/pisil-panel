import { FormType } from '@prisma/client'
import PatronatPDFGenerator from './components/PatronatPDFGenerator'
import { Step1, Step2, Step3 } from './components/formSteps'

export const patronatFormConfig = {
	formType: FormType.PATRONAT,
	sessionCookieName: 'formSession_patronat',
	defaultValues: {
		email: '',
		requestType: '',
		organizerName: '',
		contactPerson: '',
		organizerDescription: '',
		eventName: '',
		eventDescription: '',
		eventDateAndPlace: '',
		partners: '',
		eventPatrons: '',
		eventReach: '',
		expectedService: '',
		offerForPISIL: '',
		additionalInfo: '',
	},
	testData: {
		email: 'patronat@test.pl',
		requestType: 'Patronat',
		organizerName: 'Fundacja Rozwoju Logistyki',
		contactPerson: 'Jan Kowalski — koordynator, tel. +48 123 456 789, e-mail: jan.kowalski@test.pl',
		organizerDescription: 'Organizacja branżowa wspierająca rozwój sektora TSL.',
		eventName: 'Konferencja Logistyka 2025',
		eventDescription: 'Wydarzenie poświęcone nowym trendom i technologiom w logistyce i spedycji.',
		eventDateAndPlace: '12-13.10.2025, Warszawa, PGE Narodowy',
		partners: 'XYZ Logistics, ABC Transport',
		eventPatrons: 'Ministerstwo Infrastruktury, Uniwersytet Logistyczny',
		eventReach: 'powyzej_100',
		expectedService: 'Patronat honorowy PISiL, możliwość wystąpienia eksperta, promocja wydarzenia w kanałach PISiL.',
		offerForPISIL:
			'Zniżka 20% dla członków PISiL, bezpłatne stoisko informacyjne, ekspozycja logo PISiL jako Partnera.',
		additionalInfo: 'Agenda w przygotowaniu; planowana transmisja online.',
	},
	steps: [Step1, Step2, Step3],
	PDFGeneratorComponent: PatronatPDFGenerator,
}

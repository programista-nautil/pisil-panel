import { Step1 } from './components/formSteps'
import AnkietaSubmit from '@/app/forms/ankieta-spedytor-roku/components/AnkietaSubmit' // Możemy reużyć ten sam komponent

export const mlodySpedytorRokuConfig = {
	formType: 'MLODY_SPEDYTOR_ROKU',
	sessionCookieName: 'formSession_mlodySpedytor',
	steps: [Step1],
	PDFGeneratorComponent: AnkietaSubmit, // Używamy tego samego komponentu, bo nie generujemy PDF
	defaultValues: {
		fullName: '',
		birthDate: '',
		phone: '',
		email: '',
		education: '',
		workExperience: '',
		employerInfo: '',
		presentationTopic: '',
	},
}

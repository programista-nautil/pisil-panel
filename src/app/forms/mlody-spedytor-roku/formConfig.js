import { Step1 } from './components/formSteps'
import SurveySubmitButton from '@/components/SurveySubmitButton'

export const mlodySpedytorRokuConfig = {
	formType: 'MLODY_SPEDYTOR_ROKU',
	sessionCookieName: 'formSession_mlodySpedytor',
	steps: [Step1],
	PDFGeneratorComponent: SurveySubmitButton,
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
	isSurvey: true,
}

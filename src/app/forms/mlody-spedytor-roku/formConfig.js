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
	fieldLabels: {
		fullName: 'Imię i nazwisko',
		birthDate: 'Data urodzenia',
		phone: 'Nr telefonu',
		email: 'Adres e-mail',
		education: 'Wykształcenie, nazwa uczelni, szkoły',
		workExperience: 'Przebieg pracy zawodowej',
		employerInfo: 'Nazwa i referencje firmy zatrudniającej kandydata',
		presentationTopic: 'Temat, który zaprezentuje kandydat',
	},
	isSurvey: true,
}

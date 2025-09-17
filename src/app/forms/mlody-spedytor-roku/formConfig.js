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
	testData: {
		fullName: 'Jan Kowalski',
		birthDate: '1997-08-20',
		phone: '+48 123 456 789',
		email: 'jan.kowalski@test-spedytor.pl',
		education: 'Uniwersytet Logistyczny w Poznaniu, Kierunek: Logistyka, studia magisterskie',
		workExperience:
			'2021-obecnie: Specjalista ds. Spedycji Drogowej, SzybkiTrans Sp. z o.o.\n2019-2021: Młodszy spedytor, TransLogis S.A.',
		employerInfo: 'SzybkiTrans Sp. z o.o. - referencje od Prezesa Adama Nowaka, tel. 987 654 321',
		presentationTopic: 'Innowacyjne wykorzystanie AI w optymalizacji tras w transporcie drogowym.',
	},
	isSurvey: true,
}

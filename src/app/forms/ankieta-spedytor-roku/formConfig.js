import { FormType } from '@prisma/client'
import { Step1 } from './components/formSteps'
import AnkietaSubmit from './components/AnkietaSubmit'

export const ankietaSpedytorRokuConfig = {
	formType: FormType.ANKIETA_SPEDYTOR_ROKU,
	sessionCookieName: 'formSession_ankietaSpedytor',
	steps: [Step1],
	PDFGeneratorComponent: AnkietaSubmit,
	defaultValues: {
		email: '',
		companyNameAndAddress: '',
		salesStructure: '',
	},
}

import SurveySubmitButton from '@/components/SurveySubmitButton'
import {
	GeneralInfoStep,
	EmployeesStep,
	LogisticsPotentialStep,
	FinancialResultsStep,
	FinancialLiquidityStep,
	MiscellaneousStep,
} from './components/formSteps'

const years = [2024, 2023]

// Funkcja pomocnicza do generowania domyślnych wartości dla każdego roku
const generateYearlyDefaultValues = () => {
	const yearlyFields = [
		'zatrudnienieKoniecRoku',
		'pracownicyDyplomFIATA',
		'szkoleniaWewnetrzne',
		'szkoleniaZewnetrzne',
		'liczbaPojazdowWlasnych',
		'liczbaPojazdowLeasing',
		'powierzchniaMagazynowWlasnych',
		'powierzchniaMagazynowDzierżawionych',
		'przychodyNetto',
		'kosztyDzialalnosciOperacyjnej',
		'zyskStrataZeSprzedazy',
		'wynikNaPozostalejDzialalnosci',
		'zyskStrataBrutto',
		'wartoscSprzedazyNaPracownika',
		'zyskZeSprzedazyNaPracownika',
		'wartoscInwestycjiOgolem',
		'rentownoscSprzedazyNetto',
		'sredniTerminRealizacjiZobowiazan',
		'wskaznikZadluzeniaDR',
		'wskaznikZadluzeniaCR',
	]

	let defaults = {}
	years.forEach(year => {
		yearlyFields.forEach(field => {
			defaults[`${field}_${year}`] = ''
		})
	})
	return defaults
}

export const ankietaSpedytorRokuConfig = {
	formType: 'ANKIETA_SPEDYTOR_ROKU',
	sessionCookieName: 'formSession_ankietaSpedytor',
	steps: [
		GeneralInfoStep,

		props => <EmployeesStep {...props} year={2023} />,
		props => <EmployeesStep {...props} year={2024} />,

		props => <FinancialResultsStep {...props} year={2023} />,
		props => <FinancialResultsStep {...props} year={2024} />,

		props => <FinancialLiquidityStep {...props} year={2023} />,
		props => <FinancialLiquidityStep {...props} year={2024} />,

		props => <LogisticsPotentialStep {...props} year={2023} />,
		props => <LogisticsPotentialStep {...props} year={2024} />,

		MiscellaneousStep,
	],
	PDFGeneratorComponent: SurveySubmitButton,
	defaultValues: {
		email: '',
		companyNameAndAddress: '',
		salesStructure: '',
		...generateYearlyDefaultValues(),
		expandedServices: null,
		implementedIT: null,
		insuranceOCSpedytora: null,
		insuranceOCPrzewoznika: null,
		insuranceOCTransportuIntermodalnego: null,
		insuranceInne: null,
		customerSatisfactionMethods: '',
		communityActivities: '',
	},
	isSurvey: true,
}

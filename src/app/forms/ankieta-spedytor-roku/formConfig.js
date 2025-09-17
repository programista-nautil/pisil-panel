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
	fieldLabels: {
		// General Info
		email: 'Adres e-mail',
		companyNameAndAddress: 'Nazwa firmy i adres',
		salesStructure: 'Struktura sprzedaży w procentach',

		// Employees 2023
		zatrudnienieKoniecRoku_2023: 'Zatrudnienie na koniec roku - 2023 r.',
		pracownicyDyplomFIATA_2023: 'Liczba pracowników mających dyplom FIATA - 2023 r.',
		szkoleniaWewnetrzne_2023:
			'Liczba pracowników uczestniczących w szkoleniach wewnętrznych (podać tytuły szkoleń) - 2023 r.',
		szkoleniaZewnetrzne_2023:
			'Liczba pracowników uczestniczących w szkoleniach zewnętrznych (podać tytuły szkoleń) - 2023 r.',

		// Employees 2024
		zatrudnienieKoniecRoku_2024: 'Zatrudnienie na koniec roku - 2024 r.',
		pracownicyDyplomFIATA_2024: 'Liczba pracowników mających dyplom FIATA - 2024 r.',
		szkoleniaWewnetrzne_2024:
			'Liczba pracowników uczestniczących w szkoleniach wewnętrznych (podać tytuły szkoleń) - 2024 r.',
		szkoleniaZewnetrzne_2024:
			'Liczba pracowników uczestniczących w szkoleniach zewnętrznych (podać tytuły szkoleń) - 2024 r.',

		// Financial Results 2023
		przychodyNetto_2023: 'Przychody netto ze sprzedaży i zrównane z nimi - 2023 r.',
		kosztyDzialalnosciOperacyjnej_2023: 'Koszty działalności operacyjnej - 2023 r.',
		zyskStrataZeSprzedazy_2023: 'Zysk/strata ze sprzedaży - 2023 r.',
		wynikNaPozostalejDzialalnosci_2023: 'Wynik na pozostałej działalności operacyjnej - 2023 r.',
		zyskStrataBrutto_2023: 'Zysk/strata brutto - 2023 r.',
		wartoscSprzedazyNaPracownika_2023: 'Wartość sprzedaży na 1 pracownika - 2023 r.',
		zyskZeSprzedazyNaPracownika_2023: 'Zysk ze sprzedaży na 1 pracownika - 2023 r.',
		wartoscInwestycjiOgolem_2023: 'Wartość inwestycji ogółem - 2023 r.',
		rentownoscSprzedazyNetto_2023: 'Rentowność sprzedaży netto - 2023 r.',

		// Financial Results 2024
		przychodyNetto_2024: 'Przychody netto ze sprzedaży i zrównane z nimi - 2024 r.',
		kosztyDzialalnosciOperacyjnej_2024: 'Koszty działalności operacyjnej - 2024 r.',
		zyskStrataZeSprzedazy_2024: 'Zysk/strata ze sprzedaży - 2024 r.',
		wynikNaPozostalejDzialalnosci_2024: 'Wynik na pozostałej działalności operacyjnej - 2024 r.',
		zyskStrataBrutto_2024: 'Zysk/strata brutto - 2024 r.',
		wartoscSprzedazyNaPracownika_2024: 'Wartość sprzedaży na 1 pracownika - 2024 r.',
		zyskZeSprzedazyNaPracownika_2024: 'Zysk ze sprzedaży na 1 pracownika - 2024 r.',
		wartoscInwestycjiOgolem_2024: 'Wartość inwestycji ogółem - 2024 r.',
		rentownoscSprzedazyNetto_2024: 'Rentowność sprzedaży netto - 2024 r.',

		// Financial Liquidity 2023
		sredniTerminRealizacjiZobowiazan_2023: 'Średni termin realizacji zobowiązań (w dniach) - 2023 r.',
		wskaznikZadluzeniaDR_2023: 'Wskaźnik zadłużenia DR* (na 31.12) - 2023 r.',
		wskaznikZadluzeniaCR_2023: 'Wskaźnik zadłużenia CR** (na 31.12) - 2023 r.',

		// Financial Liquidity 2024
		sredniTerminRealizacjiZobowiazan_2024: 'Średni termin realizacji zobowiązań (w dniach) - 2024 r.',
		wskaznikZadluzeniaDR_2024: 'Wskaźnik zadłużenia DR* (na 31.12) - 2024 r.',
		wskaznikZadluzeniaCR_2024: 'Wskaźnik zadłużenia CR** (na 31.12) - 2024 r.',

		// Logistics Potential 2023
		liczbaPojazdowWlasnych_2023: 'Liczba pojazdów własnych - 2023 r.',
		liczbaPojazdowLeasing_2023: 'Liczba pojazdów w leasingu - 2023 r.',
		powierzchniaMagazynowWlasnych_2023: 'Liczba i powierzchnia magazynów własnych - 2023 r.',
		powierzchniaMagazynowDzierżawionych_2023: 'Liczba i powierzchnia magazynów dzierżawionych - 2023 r.',

		// Logistics Potential 2024
		liczbaPojazdowWlasnych_2024: 'Liczba pojazdów własnych - 2024 r.',
		liczbaPojazdowLeasing_2024: 'Liczba pojazdów w leasingu - 2024 r.',
		powierzchniaMagazynowWlasnych_2024: 'Liczba i powierzchnia magazynów własnych - 2024 r.',
		powierzchniaMagazynowDzierżawionych_2024: 'Liczba i powierzchnia magazynów dzierżawionych - 2024 r.',

		// Miscellaneous
		expandedServices: 'Czy firma poszerzyła zakres usług w ostatnim roku?',
		implementedIT: 'Czy firma wdrożyła w ostatnim roku nowe rozwiązania w zakresie technologii informatycznych?',
		insuranceOCSpedytora: 'Ubezpieczenie: OC spedytora',
		insuranceOCPrzewoznika: 'Ubezpieczenie: OC przewoźnika',
		insuranceOCTransportuIntermodalnego: 'Ubezpieczenie: OC transportu intermodalnego',
		insuranceInne: 'Ubezpieczenie: Inne',
		customerSatisfactionMethods:
			'Jakie metody stosuje firma, badając zadowolenie klientów ze świadczonych przez nią usług?',
		communityActivities: 'Czy firma jest aktywna w działaniach na rzecz społeczności lokalnej?',
	},
	isSurvey: true,
}

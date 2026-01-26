import SurveySubmitButton from '@/components/SurveySubmitButton'
import {
	GeneralInfoStep,
	EmployeesStep,
	LogisticsPotentialStep,
	FinancialResultsStep,
	FinancialLiquidityStep,
	MiscellaneousStep,
} from './components/formSteps'

const years = [2025, 2024]

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

		props => <EmployeesStep {...props} year={2024} />,
		props => <EmployeesStep {...props} year={2025} />,

		props => <FinancialResultsStep {...props} year={2024} />,
		props => <FinancialResultsStep {...props} year={2025} />,

		props => <FinancialLiquidityStep {...props} year={2024} />,
		props => <FinancialLiquidityStep {...props} year={2025} />,

		props => <LogisticsPotentialStep {...props} year={2024} />,
		props => <LogisticsPotentialStep {...props} year={2025} />,

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

		// Employees 2024
		zatrudnienieKoniecRoku_2024: 'Zatrudnienie na koniec roku - 2024 r.',
		pracownicyDyplomFIATA_2024: 'Liczba pracowników mających dyplom FIATA - 2024 r.',
		szkoleniaWewnetrzne_2024:
			'Liczba pracowników uczestniczących w szkoleniach wewnętrznych (podać tytuły szkoleń) - 2024 r.',
		szkoleniaZewnetrzne_2024:
			'Liczba pracowników uczestniczących w szkoleniach zewnętrznych (podać tytuły szkoleń) - 2024 r.',

		// Employees 2025
		zatrudnienieKoniecRoku_2025: 'Zatrudnienie na koniec roku - 2025 r.',
		pracownicyDyplomFIATA_2025: 'Liczba pracowników mających dyplom FIATA - 2025 r.',
		szkoleniaWewnetrzne_2025:
			'Liczba pracowników uczestniczących w szkoleniach wewnętrznych (podać tytuły szkoleń) - 2025 r.',
		szkoleniaZewnetrzne_2025:
			'Liczba pracowników uczestniczących w szkoleniach zewnętrznych (podać tytuły szkoleń) - 2025 r.',

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

		// Financial Results 2025
		przychodyNetto_2025: 'Przychody netto ze sprzedaży i zrównane z nimi - 2025 r.',
		kosztyDzialalnosciOperacyjnej_2025: 'Koszty działalności operacyjnej - 2025 r.',
		zyskStrataZeSprzedazy_2025: 'Zysk/strata ze sprzedaży - 2025 r.',
		wynikNaPozostalejDzialalnosci_2025: 'Wynik na pozostałej działalności operacyjnej - 2025 r.',
		zyskStrataBrutto_2025: 'Zysk/strata brutto - 2025 r.',
		wartoscSprzedazyNaPracownika_2025: 'Wartość sprzedaży na 1 pracownika - 2025 r.',
		zyskZeSprzedazyNaPracownika_2025: 'Zysk ze sprzedaży na 1 pracownika - 2025 r.',
		wartoscInwestycjiOgolem_2025: 'Wartość inwestycji ogółem - 2025 r.',
		rentownoscSprzedazyNetto_2025: 'Rentowność sprzedaży netto - 2025 r.',

		// Financial Liquidity 2024
		sredniTerminRealizacjiZobowiazan_2024: 'Średni termin realizacji zobowiązań (w dniach) - 2024 r.',
		wskaznikZadluzeniaDR_2024: 'Wskaźnik zadłużenia DR* (na 31.12) - 2024 r.',
		wskaznikZadluzeniaCR_2024: 'Wskaźnik zadłużenia CR** (na 31.12) - 2024 r.',

		// Financial Liquidity 2025
		sredniTerminRealizacjiZobowiazan_2025: 'Średni termin realizacji zobowiązań (w dniach) - 2025 r.',
		wskaznikZadluzeniaDR_2025: 'Wskaźnik zadłużenia DR* (na 31.12) - 2025 r.',
		wskaznikZadluzeniaCR_2025: 'Wskaźnik zadłużenia CR** (na 31.12) - 2025 r.',

		// Logistics Potential 2024
		liczbaPojazdowWlasnych_2024: 'Liczba pojazdów własnych - 2024 r.',
		liczbaPojazdowLeasing_2024: 'Liczba pojazdów w leasingu - 2024 r.',
		powierzchniaMagazynowWlasnych_2024: 'Liczba i powierzchnia magazynów własnych - 2024 r.',
		powierzchniaMagazynowDzierżawionych_2024: 'Liczba i powierzchnia magazynów dzierżawionych - 2024 r.',

		// Logistics Potential 2025
		liczbaPojazdowWlasnych_2025: 'Liczba pojazdów własnych - 2025 r.',
		liczbaPojazdowLeasing_2025: 'Liczba pojazdów w leasingu - 2025 r.',
		powierzchniaMagazynowWlasnych_2025: 'Liczba i powierzchnia magazynów własnych - 2025 r.',
		powierzchniaMagazynowDzierżawionych_2025: 'Liczba i powierzchnia magazynów dzierżawionych - 2025 r.',

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
	testData: {
		email: 'biuro@test-spedytor.pl',
		companyNameAndAddress: 'Testowy Spedytor S.A.\nul. Logistyczna 123\n00-001 Warszawa',
		salesStructure: 'Transport drogowy: 70%\nTransport morski: 20%\nLogistyka kontraktowa: 10%',
		zatrudnienieKoniecRoku_2024: '150',
		pracownicyDyplomFIATA_2024: '25',
		szkoleniaWewnetrzne_2024: '120 - "Obsługa nowego systemu TMS"',
		szkoleniaZewnetrzne_2024: '30 - "Nowelizacja przepisów ADR"',
		przychodyNetto_2024: '120 000 000 PLN',
		kosztyDzialalnosciOperacyjnej_2024: '110 000 000 PLN',
		zyskStrataZeSprzedazy_2024: '10 000 000 PLN',
		wynikNaPozostalejDzialalnosci_2024: '500 000 PLN',
		zyskStrataBrutto_2024: '10 500 000 PLN',
		wartoscSprzedazyNaPracownika_2024: '800 000 PLN',
		zyskZeSprzedazyNaPracownika_2024: '66 667 PLN',
		wartoscInwestycjiOgolem_2024: '5 000 000 PLN',
		rentownoscSprzedazyNetto_2024: '7,1%',
		sredniTerminRealizacjiZobowiazan_2024: '45',
		wskaznikZadluzeniaDR_2024: '0.55',
		wskaznikZadluzeniaCR_2024: '1.8',
		liczbaPojazdowWlasnych_2024: '50',
		liczbaPojazdowLeasing_2024: '100',
		powierzchniaMagazynowWlasnych_2024: '1 - 10 000 m2',
		powierzchniaMagazynowDzierżawionych_2024: '2 - 15 000 m2',

		zatrudnienieKoniecRoku_2025: '165',
		pracownicyDyplomFIATA_2025: '30',
		szkoleniaWewnetrzne_2025: '140 - "Zarządzanie ryzykiem w łańcuchu dostaw"',
		szkoleniaZewnetrzne_2025: '40 - "Certyfikacja TAPA"',
		przychodyNetto_2025: '135 000 000 PLN',
		kosztyDzialalnosciOperacyjnej_2025: '122 000 000 PLN',
		zyskStrataZeSprzedazy_2025: '13 000 000 PLN',
		wynikNaPozostalejDzialalnosci_2025: '600 000 PLN',
		zyskStrataBrutto_2025: '13 600 000 PLN',
		wartoscSprzedazyNaPracownika_2025: '818 181 PLN',
		zyskZeSprzedazyNaPracownika_2025: '78 787 PLN',
		wartoscInwestycjiOgolem_2025: '7 500 000 PLN',
		rentownoscSprzedazyNetto_2025: '8,2%',
		sredniTerminRealizacjiZobowiazan_2025: '42',
		wskaznikZadluzeniaDR_2025: '0.52',
		wskaznikZadluzeniaCR_2025: '2.1',
		liczbaPojazdowWlasnych_2025: '60',
		liczbaPojazdowLeasing_2025: '120',
		powierzchniaMagazynowWlasnych_2025: '2 - 15 000 m2',
		powierzchniaMagazynowDzierżawionych_2025: '2 - 15 000 m2',

		expandedServices: 'Tak',
		implementedIT: 'Tak',
		insuranceOCSpedytora: 'Tak',
		insuranceOCPrzewoznika: 'Tak',
		insuranceOCTransportuIntermodalnego: 'Nie',
		insuranceInne: 'Tak',
		customerSatisfactionMethods:
			'Regularne ankiety NPS (Net Promoter Score), kwartalne spotkania z kluczowymi klientami (QBR), dedykowany system do zgłaszania reklamacji i sugestii.',
		communityActivities:
			'Tak, sponsorujemy lokalną drużynę piłkarską juniorów "Logi мяч" oraz organizujemy program płatnych praktyk letnich dla studentów kierunków logistycznych.',
	},
	isSurvey: true,
}

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Cookies from 'js-cookie'
import PDFGenerator from '../app/forms/deklaracja-czlonkowska/components/DeklaracjaPDFGenerator'
import FileUpload from './FileUpload'

export default function FormComponent() {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isValid, touchedFields },
		reset,
		getValues,
		setValue,
		trigger,
	} = useForm({
		mode: 'onChange',
		defaultValues: {
			companyName: '',
			nip: '',
			regon: '',
			address: '',
			correspondenceAddress: '',
			phones: '',
			invoiceEmail: '',
			email: '',
			website: '',
			ceoName: '',
			authorizedPersons: '',
			registrationData: '',
			ownershipForm: '',
			employmentSize: '',
			transportLicense: '',
			iso9002Certificate: '',
			insuranceOC: '',
			businessDescription: '',
			transportMorski: false,
			transportKolejowy: false,
			transportLotniczy: false,
			logistyka: false,
			transportDrogowy: false,
			taborWlasny: false,
			taborObcy: false,
			transportInne: false,
			magazynWlasny: false,
			magazynObcy: false,
			organizacjaPrzewozow: false,
			agencjeCelne: false,
			krajowaSiec: '',
			zagranicznaSSiec: '',
			inneFormy: '',
			organizacje: '',
			rekomendacje: '',
			declarationStatute: false,
			signatoryName: '',
			signatoryPosition: '',
		},
	})

	const [currentStep, setCurrentStep] = useState(1)
	const [pdfGenerated, setPdfGenerated] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)

	// Przywracanie sesji - uruchamia się pierwszy
	// Przywracanie sesji - uruchamia się pierwszy
	useEffect(() => {
		console.log('🔄 Przywracanie sesji - useEffect uruchomiony')
		const savedSession = Cookies.get('formSession')
		console.log('💾 Zapisana sesja:', savedSession)

		if (savedSession) {
			try {
				const sessionData = JSON.parse(savedSession)
				console.log('📊 Parsed session data:', sessionData)
				console.log('🔢 Przywracany krok:', sessionData.step)

				reset(sessionData.data)
				setCurrentStep(sessionData.step)

				console.log('✅ Sesja przywrócona - krok:', sessionData.step)
			} catch (error) {
				console.error('❌ Błąd podczas parsowania danych sesji:', error)
				Cookies.remove('formSession')
			}
		} else {
			console.log('ℹ️ Brak zapisanej sesji')
		}
		setIsInitialized(true)
	}, [reset])

	// Zapisywanie sesji - uruchamia się dopiero po inicjalizacji
	useEffect(() => {
		console.log('💾 Zapisywanie sesji useEffect - isInitialized:', isInitialized, 'currentStep:', currentStep)

		if (!isInitialized) {
			console.log('⏸️ Pomijam zapisywanie - nie zainicjalizowany')
			return
		}

		const subscription = watch(values => {
			const sessionData = {
				step: currentStep,
				data: values,
			}
			console.log('💾 Zapisuję sesję:', { step: currentStep, dataKeys: Object.keys(values) })
			Cookies.set('formSession', JSON.stringify(sessionData), { expires: 1 })
		})
		return () => {
			console.log('🧹 Anulowanie subskrypcji watch')
			subscription.unsubscribe()
		}
	}, [watch, currentStep, isInitialized])

	const handleUploadSuccess = () => {
		Cookies.remove('formSession')
	}

	// Pobieramy aktualne dane formularza, aby przekazać je do komponentów potomnych
	const formData = getValues()

	const fillTestData = () => {
		reset({
			companyName: 'TestLogistics Sp. z o.o.',
			nip: '1234567890',
			regon: '123456789',
			address: 'ul. Testowa 123, 00-001 Warszawa',
			correspondenceAddress: 'ul. Testowa 123, 00-001 Warszawa',
			phones: '+48 123 456 789, +48 987 654 321',
			invoiceEmail: 'faktury@testlogistics.pl',
			email: 'kontakt@testlogistics.pl',
			website: 'https://testlogistics.pl',
			ceoName: 'Jan Kowalski',
			authorizedPersons: 'Anna Nowak - Dyrektor ds. Handlowych, Piotr Wiśniewski - Zastępca Dyrektora',
			registrationData: 'Data rejestracji: 15.03.2020, Sąd Rejonowy dla m.st. Warszawy, KRS: 0000123456',
			ownershipForm: 'Spółka z ograniczoną odpowiedzialnością',
			employmentSize: '25-50 pracowników',
			transportLicense: 'Tak, licencja nr TR/2020/001234 ważna do 31.12.2025',
			iso9002Certificate: 'Tak, certyfikat ISO 9001:2015 nr PL/ISO/2021/001',
			insuranceOC: 'Tak, PZU S.A., polisa nr 123456789, suma ubezpieczenia: 1.000.000 PLN',
			businessDescription:
				'Kompleksowe usługi logistyczne obejmujące transport krajowy i międzynarodowy, magazynowanie oraz dystrybucję towarów.',
			transportMorski: false,
			transportKolejowy: true,
			transportLotniczy: false,
			logistyka: true,
			transportDrogowy: true,
			taborWlasny: true,
			taborObcy: true,
			transportInne: false,
			magazynWlasny: true,
			magazynObcy: false,
			organizacjaPrzewozow: true,
			agencjeCelne: true,
			krajowaSiec: '3 oddziały (Warszawa, Kraków, Gdańsk)',
			zagranicznaSSiec: '2 firmy własne w Niemczech / 15 korespondentów w Europie',
			inneFormy: 'Współpraca z brokerami transportowymi, platformy cyfrowe (TimoCom, Trans.eu)',
			organizacje: 'Zrzeszenie Międzynarodowych Przewoźników Drogowych w Polsce (od 2020)',
			rekomendacje: 'LogiMax Sp. z o.o., TransEuropa S.A.',
			declarationStatute: true,
			signatoryName: 'Jan Kowalski',
			signatoryPosition: 'Prezes Zarządu',
		})
	}

	const nextStep = () => {
		const newStep = Math.min(currentStep + 1, 5)
		setCurrentStep(newStep)

		// ✅ Zapisz krok natychmiast przy zmianie
		const currentSession = Cookies.get('formSession')
		if (currentSession) {
			try {
				const sessionData = JSON.parse(currentSession)
				sessionData.step = newStep
				Cookies.set('formSession', JSON.stringify(sessionData), { expires: 1 })
				console.log('✅ Krok zapisany w nextStep:', newStep)
			} catch (error) {
				console.error('❌ Błąd podczas aktualizacji kroku w nextStep:', error)
			}
		}
	}

	const prevStep = () => {
		const newStep = Math.max(currentStep - 1, 1)
		setCurrentStep(newStep)

		// ✅ Zapisz krok natychmiast przy zmianie
		const currentSession = Cookies.get('formSession')
		if (currentSession) {
			try {
				const sessionData = JSON.parse(currentSession)
				sessionData.step = newStep
				Cookies.set('formSession', JSON.stringify(sessionData), { expires: 1 })
				console.log('✅ Krok zapisany w prevStep:', newStep)
			} catch (error) {
				console.error('❌ Błąd podczas aktualizacji kroku w prevStep:', error)
			}
		}
	}

	return (
		<div className='bg-white rounded-lg shadow-md p-6'>
			<div className='mb-8'>
				<div className='flex justify-between items-center mb-2'>
					<span className='text-sm font-medium text-gray-700'>Krok {currentStep} z 5</span>
					<span className='text-sm text-gray-500'>{Math.round((currentStep / 5) * 100)}% ukończone</span>
				</div>
				<div className='w-full bg-gray-200 rounded-full h-2'>
					<div
						className='bg-blue-600 h-2 rounded-full transition-all duration-300'
						style={{ width: `${(currentStep / 5) * 100}%` }}></div>
				</div>
			</div>

			{process.env.NODE_ENV === 'development' && (
				<div className='mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg'>
					<div className='flex items-center justify-between'>
						<div>
							<h3 className='text-sm font-medium text-yellow-800'>Tryb deweloperski</h3>
							<p className='text-sm text-yellow-700'>Wypełnij formularz testowymi danymi</p>
						</div>
						<button
							onClick={fillTestData}
							className='px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700'>
							Wypełnij testowe dane
						</button>
					</div>
				</div>
			)}

			<div className='min-h-[400px]'>
				{currentStep === 1 && renderStep1()}
				{currentStep === 2 && renderStep2()}
				{currentStep === 3 && renderStep3()}
				{currentStep === 4 && renderStep4()}
				{currentStep === 5 && renderStep5()}
			</div>

			<div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-200'>
				<button
					onClick={prevStep}
					disabled={currentStep === 1}
					className={`px-6 py-2 rounded-md font-medium text-gray-700 ${
						currentStep === 1 ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'
					}`}>
					Wstecz
				</button>

				{currentStep < 5 ? (
					<button
						onClick={nextStep}
						disabled={!isValid}
						className={`px-6 py-2 rounded-md font-medium ${
							!isValid ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
						}`}>
						Dalej
					</button>
				) : (
					<PDFGenerator formData={getValues()} onGenerated={() => setPdfGenerated(true)} disabled={!isValid} />
				)}
			</div>

			{pdfGenerated && (
				<div className='mt-8 pt-6 border-t border-gray-200'>
					<FileUpload formData={getValues()} onUploadSuccess={handleUploadSuccess} />
				</div>
			)}
		</div>
	)
}

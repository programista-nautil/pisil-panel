'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import Cookies from 'js-cookie'
import FileUpload from './FileUpload'
import AdditionalDocumentsUpload from './AdditionalDocumentsUpload'
import StepsIndicator from './StepsIndicator'

export default function MultiStepForm({ formConfig }) {
	const { formType, defaultValues, steps, PDFGeneratorComponent, sessionCookieName, testData } = formConfig
	const totalSteps = steps.length

	const {
		register,
		watch,
		formState: { errors, isValid },
		reset,
		getValues,
		setValue,
	} = useForm({
		mode: 'onChange',
		defaultValues,
	})

	const fillTestData = () => {
		if (testData) {
			reset(testData)
		}
	}

	const [currentStep, setCurrentStep] = useState(1)
	const [pdfGenerated, setPdfGenerated] = useState(false)
	const [pdfUploaded, setPdfUploaded] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)
	const [isResetting, setIsResetting] = useState(false)

	useEffect(() => {
		const savedSession = Cookies.get(sessionCookieName)
		if (savedSession) {
			try {
				const sessionData = JSON.parse(savedSession)
				reset(sessionData.data)
				setCurrentStep(sessionData.step)
			} catch (error) {
				Cookies.remove(sessionCookieName)
			}
		}
		setIsInitialized(true)
	}, [reset, sessionCookieName])

	useEffect(() => {
		if (!isInitialized || isResetting) {
			return
		}

		const subscription = watch(values => {
			const sessionData = { step: currentStep, data: values }
			Cookies.set(sessionCookieName, JSON.stringify(sessionData), { expires: 1 })
		})
		return () => subscription.unsubscribe()
	}, [watch, currentStep, isInitialized, sessionCookieName, isResetting])

	const handleUploadSuccess = () => {
		setPdfUploaded(true)
		setIsResetting(true)
		Cookies.remove(sessionCookieName)
		reset(defaultValues)
		setTimeout(() => setIsResetting(false), 100)
	}

	const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, totalSteps))
	const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

	// Renderuje komponent kroku na podstawie aktualnego numeru
	const CurrentStepComponent = steps[currentStep - 1]

	// Krok akcji (1: pobierz, 2: prześlij PDF, 3: dodatkowe dok.)
	const actionSteps = ['Pobierz PDF', 'Prześlij podpisany PDF', 'Prześlij dodatkowe dokumenty (opcjonalnie)']
	const currentActionStep = !pdfGenerated ? 1 : pdfUploaded ? 3 : 2
	const showActionStepper = currentStep === totalSteps

	// Refs do sekcji akcji dla sterowania fokusem
	const uploadPdfRef = useRef(null)
	const additionalDocsRef = useRef(null)

	useEffect(() => {
		// Po wygenerowaniu PDF skup się na kroku 2 (przesyłka PDF)
		if (currentStep === totalSteps && pdfGenerated && !pdfUploaded && uploadPdfRef.current) {
			uploadPdfRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
			uploadPdfRef.current.focus({ preventScroll: true })
		}
	}, [pdfGenerated, pdfUploaded, currentStep])

	useEffect(() => {
		// Po przesłaniu PDF przejdź do kroku dodatkowych dokumentów
		if (currentStep === totalSteps && pdfUploaded && additionalDocsRef.current) {
			additionalDocsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
			additionalDocsRef.current.focus({ preventScroll: true })
		}
	}, [pdfUploaded, currentStep])

	return (
		<div className='bg-white rounded-lg shadow-md p-6'>
			<div className='mb-8'>
				<div className='flex justify-between items-center mb-2'>
					<span className='text-sm font-medium text-gray-700'>
						Krok {currentStep} z {totalSteps}
					</span>
					<span className='text-sm text-gray-500'>{Math.round((currentStep / totalSteps) * 100)}% ukończone</span>
				</div>
				<div className='w-full bg-gray-200 rounded-full h-2'>
					<div
						className='bg-blue-600 h-2 rounded-full transition-all duration-300'
						style={{ width: `${(currentStep / totalSteps) * 100}%` }}></div>
				</div>
			</div>

			{process.env.NODE_ENV === 'development' && testData && (
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
				<CurrentStepComponent register={register} errors={errors} watch={watch} setValue={setValue} />
			</div>

			{/* Stepper akcji nad przyciskami nawigacyjnymi */}
			{showActionStepper && (
				<div className='mt-6'>
					<StepsIndicator steps={actionSteps} current={currentActionStep} />
				</div>
			)}

			<div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-200'>
				<button
					onClick={prevStep}
					disabled={currentStep === 1}
					className={`px-6 py-2 rounded-md font-medium text-gray-700 ${
						currentStep === 1 ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-200 hover:bg-gray-300'
					}`}>
					Wstecz
				</button>

				{currentStep < totalSteps ? (
					<button
						onClick={nextStep}
						disabled={!isValid}
						className={`px-6 py-2 rounded-md font-medium ${
							!isValid ? 'bg-gray-100 cursor-not-allowed text-gray-400' : 'bg-blue-600 text-white hover:bg-blue-700'
						}`}>
						Dalej
					</button>
				) : (
					<PDFGeneratorComponent formData={getValues()} onGenerated={() => setPdfGenerated(true)} disabled={!isValid} />
				)}
			</div>

			{currentStep === totalSteps && pdfGenerated && (
				<>
					<div className='mt-8 pt-6 border-t border-gray-200'>
						<FileUpload
							ref={uploadPdfRef}
							formData={{ ...getValues(), formType }}
							onUploadSuccess={handleUploadSuccess}
						/>
					</div>
					{pdfUploaded && (
						<div className='mt-8 pt-6 border-t border-gray-200'>
							<AdditionalDocumentsUpload ref={additionalDocsRef} />
						</div>
					)}
				</>
			)}
		</div>
	)
}

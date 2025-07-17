'use client'

import { useState } from 'react'
import PDFGenerator from './PDFGenerator'
import FileUpload from './FileUpload'

export default function FormComponent() {
	const [formData, setFormData] = useState({
		// Dane podstawowe firmy
		companyName: '',
		nip: '',
		regon: '',
		address: '',
		correspondenceAddress: '',
		phones: '',
		invoiceEmail: '',
		email: '',
		website: '',
		
		// Kierownictwo i reprezentacja
		ceoName: '',
		authorizedPersons: '',
		
		// Dane rejestracyjne
		registrationData: '',
		ownershipForm: '',
		employmentSize: '',
		
		// Licencje i certyfikaty
		transportLicense: '',
		iso9002Certificate: '',
		insuranceOC: '',
		
		// Działalność
		businessDescription: '',
		
		// Usługi transportowe
		transportMorski: false,
		transportKolejowy: false,
		transportLotniczy: false,
		logistyka: false,
		transportDrogowy: false,
		taborWlasny: false,
		taborObcy: false,
		transportInne: false,
		
		// Usługi magazynowe
		magazynWlasny: false,
		magazynObcy: false,
		
		// Organizacja przewozów
		organizacjaPrzewozow: false,
		agencjeCelne: false,
		
		// Sieć
		krajowaSiec: '',
		zagranicznaSSiec: '',
		inneFormy: '',
		
		// Członkostwo
		organizacje: '',
		rekomendacje: '',
		
		// Finalizacja
		declarationStatute: false,
		signatoryName: '',
		signatoryPosition: '',
	})

	const [currentStep, setCurrentStep] = useState(1)
	const [pdfGenerated, setPdfGenerated] = useState(false)

	const handleInputChange = e => {
		const { name, value, type, checked } = e.target
		setFormData(prev => ({
			...prev,
			[name]: type === 'checkbox' ? checked : value,
		}))
	}

	const nextStep = () => {
		setCurrentStep(prev => Math.min(prev + 1, 5))
	}

	const prevStep = () => {
		setCurrentStep(prev => Math.max(prev - 1, 1))
	}

	const renderStep1 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Dane podstawowe firmy</h2>

			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Pełna nazwa firmy *</label>
					<input
						type='text'
						name='companyName'
						value={formData.companyName}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						required
					/>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Numer NIP *</label>
						<input
							type='text'
							name='nip'
							value={formData.nip}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='0000000000'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Numer REGON *</label>
						<input
							type='text'
							name='regon'
							value={formData.regon}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='000000000'
							required
						/>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Dokładny adres *</label>
					<textarea
						name='address'
						value={formData.address}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Adres do korespondencji *</label>
					<textarea
						name='correspondenceAddress'
						value={formData.correspondenceAddress}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						required
					/>
				</div>
			</div>
		</div>
	)

	const renderStep2 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Kontakt i kierownictwo</h2>

			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Numery telefonów *</label>
					<input
						type='text'
						name='phones'
						value={formData.phones}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						placeholder='np. +48 123 456 789, +48 987 654 321'
						required
					/>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Adres e-mail do przesyłania faktur *</label>
						<input
							type='email'
							name='invoiceEmail'
							value={formData.invoiceEmail}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Adres e-mail *</label>
						<input
							type='email'
							name='email'
							value={formData.email}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							required
						/>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Strona internetowa</label>
					<input
						type='url'
						name='website'
						value={formData.website}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						placeholder='https://'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Imię i nazwisko kierownika firmy *</label>
					<input
						type='text'
						name='ceoName'
						value={formData.ceoName}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Osoby upoważnione do reprezentowania firmy wobec PISiL (imię, nazwisko, stanowisko) *
					</label>
					<textarea
						name='authorizedPersons'
						value={formData.authorizedPersons}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='3'
						required
					/>
				</div>
			</div>
		</div>
	)

	const renderStep3 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Dane rejestracyjne i certyfikaty</h2>

			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Data rejestracji firmy, sąd rejestrowy, nr rejestru *
					</label>
					<textarea
						name='registrationData'
						value={formData.registrationData}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						required
					/>
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Forma własności *</label>
						<input
							type='text'
							name='ownershipForm'
							value={formData.ownershipForm}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='np. Sp. z o.o., S.A., jednoosobowa działalność'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Wielkość zatrudnienia *</label>
						<input
							type='text'
							name='employmentSize'
							value={formData.employmentSize}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='np. 1-10, 11-50, 51-250, 250+'
							required
						/>
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Czy firma posiada licencję na pośrednictwo przy przewozie rzeczy wydaną do 15.08.2013 roku? 
						(Jeżeli tak proszę o podanie nr, daty ważności licencji nazwy organu wydającego) *
					</label>
					<textarea
						name='transportLicense'
						value={formData.transportLicense}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						placeholder='np. Nie posiada / Tak, nr: ..., data ważności: ..., organ: ...'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Czy firma posiada Certyfikat ISO 9002 (w jakim zakresie) *
					</label>
					<textarea
						name='iso9002Certificate'
						value={formData.iso9002Certificate}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						placeholder='np. Nie posiada / Tak, zakres: ...'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Czy firma posiada ubezpieczenie o.c. spedytora (jeżeli tak, to u jakiego ubezpieczyciela) *
					</label>
					<textarea
						name='insuranceOC'
						value={formData.insuranceOC}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='2'
						placeholder='np. Nie posiada / Tak, ubezpieczyciel: ...'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Opis prowadzonej działalności firmy *</label>
					<textarea
						name='businessDescription'
						value={formData.businessDescription}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='3'
						required
					/>
				</div>
			</div>
		</div>
	)

	const renderStep4 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Oświadczenia i finalizacja</h2>

			<div className='space-y-4'>
				<div className='flex items-start space-x-3'>
					<input
						type='checkbox'
						name='declarationTruth'
						id='declarationTruth'
						checked={formData.declarationTruth}
						onChange={handleInputChange}
						className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
						required
					/>
					<label htmlFor='declarationTruth' className='text-sm text-gray-700'>
						Oświadczam, że podane przeze mnie dane są prawdziwe i zgodne z rzeczywistością.
					</label>
				</div>

				<div className='flex items-start space-x-3'>
					<input
						type='checkbox'
						name='declarationStatute'
						id='declarationStatute'
						checked={formData.declarationStatute}
						onChange={handleInputChange}
						className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
						required
					/>
					<label htmlFor='declarationStatute' className='text-sm text-gray-700'>
						Oświadczam, że zapoznałem się ze statutem PISiL i zobowiązuję się do jego przestrzegania.
					</label>
				</div>

				<div className='flex items-start space-x-3'>
					<input
						type='checkbox'
						name='declarationPersonalData'
						id='declarationPersonalData'
						checked={formData.declarationPersonalData}
						onChange={handleInputChange}
						className='mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
						required
					/>
					<label htmlFor='declarationPersonalData' className='text-sm text-gray-700'>
						Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO.
					</label>
				</div>
			</div>

			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Data *</label>
					<input
						type='date'
						name='date'
						value={formData.date}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Miejsce *</label>
					<input
						type='text'
						name='place'
						value={formData.place}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						placeholder='np. Warszawa'
						required
					/>
				</div>
			</div>
		</div>
	)

	const isStepValid = step => {
		switch (step) {
			case 1:
				return formData.firstName && formData.lastName && formData.pesel && formData.birthDate && formData.birthPlace
			case 2:
				return (
					formData.street &&
					formData.houseNumber &&
					formData.postalCode &&
					formData.city &&
					formData.voivodeship &&
					formData.phone &&
					formData.email
				)
			case 3:
				return formData.education && formData.profession && formData.workplace
			case 4:
				return (
					formData.declarationTruth &&
					formData.declarationStatute &&
					formData.declarationPersonalData &&
					formData.date &&
					formData.place
				)
			default:
				return false
		}
	}

	return (
		<div className='bg-white rounded-lg shadow-md p-6'>
			{/* Progress bar */}
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

			{/* Form steps */}
			<div className='min-h-[400px]'>
				{currentStep === 1 && renderStep1()}
				{currentStep === 2 && renderStep2()}
				{currentStep === 3 && renderStep3()}
				{currentStep === 4 && renderStep4()}
				{currentStep === 5 && renderStep5()}
			</div>

			{/* Navigation buttons */}
			<div className='flex justify-between items-center mt-8 pt-6 border-t border-gray-200'>
				<button
					onClick={prevStep}
					disabled={currentStep === 1}
					className={`px-6 py-2 rounded-md font-medium ${
						currentStep === 1
							? 'bg-gray-100 text-gray-400 cursor-not-allowed'
							: 'bg-gray-200 text-gray-700 hover:bg-gray-300'
					}`}>
					Wstecz
				</button>

				{currentStep < 4 ? (
					<button
						onClick={nextStep}
						disabled={!isStepValid(currentStep)}
						className={`px-6 py-2 rounded-md font-medium ${
							!isStepValid(currentStep)
								? 'bg-gray-100 text-gray-400 cursor-not-allowed'
								: 'bg-blue-600 text-white hover:bg-blue-700'
						}`}>
						Dalej
					</button>
				) : (
					<PDFGenerator
						formData={formData}
						onGenerated={() => setPdfGenerated(true)}
						disabled={!isStepValid(currentStep)}
					/>
				)}
			</div>

			{/* File upload section */}
			{pdfGenerated && (
				<div className='mt-8 pt-6 border-t border-gray-200'>
					<FileUpload formData={formData} />
				</div>
			)}
		</div>
	)
}

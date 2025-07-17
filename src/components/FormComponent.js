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
			<h2 className='text-xl font-semibold text-gray-900'>Wachlarz świadczonych usług</h2>

			<div className='space-y-6'>
				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Usługi transportowe *</h3>
					<div className='grid grid-cols-2 gap-4'>
						<div className='space-y-3'>
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='transportMorski'
									checked={formData.transportMorski}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Transport morski</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='transportKolejowy'
									checked={formData.transportKolejowy}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Transport kolejowy</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='transportLotniczy'
									checked={formData.transportLotniczy}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Transport lotniczy</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='logistyka'
									checked={formData.logistyka}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Logistyka</span>
							</label>
						</div>
						
						<div className='space-y-3'>
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='transportDrogowy'
									checked={formData.transportDrogowy}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Transport drogowy</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='taborWlasny'
									checked={formData.taborWlasny}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Taborem własnym</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='taborObcy'
									checked={formData.taborObcy}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>Taborem obcym</span>
							</label>
							
							<label className='flex items-center space-x-3'>
								<input
									type='checkbox'
									name='transportInne'
									checked={formData.transportInne}
									onChange={handleInputChange}
									className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
								/>
								<span className='text-sm text-gray-700'>inne (np. NVOCC, agencje armatorów, itp.)</span>
							</label>
						</div>
					</div>
				</div>

				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Usługi magazynowo-dystrybucyjne *</h3>
					<div className='grid grid-cols-2 gap-4'>
						<label className='flex items-center space-x-3'>
							<input
								type='checkbox'
								name='magazynWlasny'
								checked={formData.magazynWlasny}
								onChange={handleInputChange}
								className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
							/>
							<span className='text-sm text-gray-700'>Magazyn własny</span>
						</label>
						
						<label className='flex items-center space-x-3'>
							<input
								type='checkbox'
								name='magazynObcy'
								checked={formData.magazynObcy}
								onChange={handleInputChange}
								className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
							/>
							<span className='text-sm text-gray-700'>Magazyn obcy</span>
						</label>
					</div>
				</div>

				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Organizacja przewozów drobnicy zbiorowe *</h3>
					<label className='flex items-center space-x-3'>
						<input
							type='checkbox'
							name='organizacjaPrzewozow'
							checked={formData.organizacjaPrzewozow}
							onChange={handleInputChange}
							className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
						/>
						<span className='text-sm text-gray-700'>Tak</span>
					</label>
				</div>

				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Agencje celne</h3>
					<label className='flex items-center space-x-3'>
						<input
							type='checkbox'
							name='agencjeCelne'
							checked={formData.agencjeCelne}
							onChange={handleInputChange}
							className='h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded'
						/>
						<span className='text-sm text-gray-700'>Tak</span>
					</label>
				</div>

				<div className='grid grid-cols-1 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>a/ krajowa (ilość oddziałów) *</label>
						<input
							type='text'
							name='krajowaSiec'
							value={formData.krajowaSiec}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='np. 5 oddziałów / Brak'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>b/ zagraniczna (ilość firm własnych / ilość korespondentów) *</label>
						<input
							type='text'
							name='zagranicznaSSiec'
							value={formData.zagranicznaSSiec}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							placeholder='np. 2 firmy własne / 15 korespondentów / Brak'
							required
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>c/ inne formy współpracy *</label>
						<textarea
							name='inneFormy'
							value={formData.inneFormy}
							onChange={handleInputChange}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
							rows='2'
							placeholder='Opisz inne formy współpracy lub napisz "Brak"'
							required
						/>
					</div>
				</div>
			</div>
		</div>
	)

	const renderStep5 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Członkostwo i finalizacja</h2>

			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Do jakich organizacji firma należy i od kiedy *
					</label>
					<textarea
						name='organizacje'
						value={formData.organizacje}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='3'
						placeholder='Wymień organizacje, do których firma należy wraz z datami przystąpienia lub napisz "Brak"'
						required
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Firmy-Członkowie Izby rekomendujący przystąpienie do PISiL (nazwa, adres, podpis kierownika firmy) *
					</label>
					<textarea
						name='rekomendacje'
						value={formData.rekomendacje}
						onChange={handleInputChange}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
						rows='4'
						placeholder='Podaj dane firm rekomendujących lub napisz "Brak"'
						required
					/>
				</div>

				<div className='border-t border-gray-200 pt-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Oświadczenie</h3>
					
					<div className='flex items-start space-x-3 mb-6'>
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
							Oświadczam, że zapoznałem/zapoznałam się z treścią Statutu PISiL i jednocześnie zobowiązuję się do przestrzegania zawartych w nim postanowień. *
						</label>
					</div>
				</div>

				<div className='border-t border-gray-200 pt-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Podpis</h3>
					
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Imię i nazwisko *</label>
							<input
								type='text'
								name='signatoryName'
								value={formData.signatoryName}
								onChange={handleInputChange}
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
								required
							/>
						</div>

						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Stanowisko *</label>
							<input
								type='text'
								name='signatoryPosition'
								value={formData.signatoryPosition}
								onChange={handleInputChange}
								className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
								placeholder='np. Prezes, Dyrektor'
								required
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	)

	const isStepValid = step => {
		switch (step) {
			case 1:
				return formData.companyName && formData.nip && formData.regon && formData.address && formData.correspondenceAddress
			case 2:
				return (
					formData.phones &&
					formData.invoiceEmail &&
					formData.email &&
					formData.ceoName &&
					formData.authorizedPersons
				)
			case 3:
				return (
					formData.registrationData && 
					formData.ownershipForm && 
					formData.employmentSize &&
					formData.transportLicense &&
					formData.iso9002Certificate &&
					formData.insuranceOC &&
					formData.businessDescription
				)
			case 4:
				return (
					formData.krajowaSiec &&
					formData.zagranicznaSSiec &&
					formData.inneFormy
				)
			case 5:
				return (
					formData.organizacje &&
					formData.rekomendacje &&
					formData.declarationStatute &&
					formData.signatoryName &&
					formData.signatoryPosition
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

				{currentStep < 5 ? (
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

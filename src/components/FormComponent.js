'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import PDFGenerator from './PDFGenerator'
import FileUpload from './FileUpload'

export default function FormComponent() {
	const {
		register,
		handleSubmit,
		watch,
		formState: { errors, isValid },
		reset,
		getValues,
		setValue,
	} = useForm({
		mode: 'onChange', // Walidacja przy każdej zmianie
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

	const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5))
	const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1))

	const renderStep1 = () => (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Dane podstawowe firmy</h2>
			<div className='space-y-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Pełna nazwa firmy *</label>
					<input
						type='text'
						{...register('companyName', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors.companyName && <p className='text-red-500 text-xs mt-1'>{errors.companyName.message}</p>}
				</div>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Numer NIP *</label>
						<input
							type='text'
							{...register('nip', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.nip && <p className='text-red-500 text-xs mt-1'>{errors.nip.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Numer REGON *</label>
						<input
							type='text'
							{...register('regon', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.regon && <p className='text-red-500 text-xs mt-1'>{errors.regon.message}</p>}
					</div>
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Dokładny adres *</label>
					<textarea
						{...register('address', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.address && <p className='text-red-500 text-xs mt-1'>{errors.address.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Adres do korespondencji *</label>
					<textarea
						{...register('correspondenceAddress', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.correspondenceAddress && (
						<p className='text-red-500 text-xs mt-1'>{errors.correspondenceAddress.message}</p>
					)}
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
						{...register('phones', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
						placeholder='np. +48 123 456 789, +48 987 654 321'
					/>
					{errors.phones && <p className='text-red-500 text-xs mt-1'>{errors.phones.message}</p>}
				</div>

				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Adres e-mail do przesyłania faktur *</label>
						<input
							type='email'
							{...register('invoiceEmail', {
								required: 'To pole jest wymagane.',
								pattern: {
									value: /^\S+@\S+$/i,
									message: 'Nieprawidłowy format e-mail.',
								},
							})}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
						/>
						{errors.invoiceEmail && <p className='text-red-500 text-xs mt-1'>{errors.invoiceEmail.message}</p>}
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Adres e-mail *</label>
						<input
							type='email'
							{...register('email', {
								required: 'To pole jest wymagane.',
								pattern: {
									value: /^\S+@\S+$/i,
									message: 'Nieprawidłowy format e-mail.',
								},
							})}
							className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
						/>
						{errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email.message}</p>}
					</div>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Strona internetowa</label>
					<input
						type='url'
						{...register('website')}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
						placeholder='https://'
					/>
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Imię i nazwisko kierownika firmy *</label>
					<input
						type='text'
						{...register('ceoName', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
					/>
					{errors.ceoName && <p className='text-red-500 text-xs mt-1'>{errors.ceoName.message}</p>}
				</div>

				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Osoby upoważnione do reprezentowania firmy wobec PISiL (imię, nazwisko, stanowisko) *
					</label>
					<textarea
						{...register('authorizedPersons', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
						rows='3'
					/>
					{errors.authorizedPersons && <p className='text-red-500 text-xs mt-1'>{errors.authorizedPersons.message}</p>}
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
						{...register('registrationData', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.registrationData && <p className='text-red-500 text-xs mt-1'>{errors.registrationData.message}</p>}
				</div>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Forma własności *</label>
						<input
							type='text'
							{...register('ownershipForm', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.ownershipForm && <p className='text-red-500 text-xs mt-1'>{errors.ownershipForm.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Wielkość zatrudnienia *</label>
						<input
							type='text'
							{...register('employmentSize', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.employmentSize && <p className='text-red-500 text-xs mt-1'>{errors.employmentSize.message}</p>}
					</div>
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Licencja na pośrednictwo przy przewozie rzeczy *
					</label>
					<textarea
						{...register('transportLicense', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.transportLicense && <p className='text-red-500 text-xs mt-1'>{errors.transportLicense.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Certyfikat ISO 9002 (w jakim zakresie) *
					</label>
					<textarea
						{...register('iso9002Certificate', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.iso9002Certificate && (
						<p className='text-red-500 text-xs mt-1'>{errors.iso9002Certificate.message}</p>
					)}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Ubezpieczenie o.c. spedytora (ubezpieczyciel) *
					</label>
					<textarea
						{...register('insuranceOC', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='2'
					/>
					{errors.insuranceOC && <p className='text-red-500 text-xs mt-1'>{errors.insuranceOC.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>Opis prowadzonej działalności firmy *</label>
					<textarea
						{...register('businessDescription', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='3'
					/>
					{errors.businessDescription && (
						<p className='text-red-500 text-xs mt-1'>{errors.businessDescription.message}</p>
					)}
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
						{[
							'transportMorski',
							'transportKolejowy',
							'transportLotniczy',
							'logistyka',
							'transportDrogowy',
							'taborWlasny',
							'taborObcy',
							'transportInne',
						].map(field => (
							<label key={field} className='flex items-center space-x-3'>
								<input type='checkbox' {...register(field)} className='h-4 w-4 text-blue-600 rounded' />
								<span className='text-sm text-gray-700'>
									{
										{
											transportMorski: 'Transport morski',
											transportKolejowy: 'Transport kolejowy',
											transportLotniczy: 'Transport lotniczy',
											logistyka: 'Logistyka',
											transportDrogowy: 'Transport drogowy',
											taborWlasny: 'Taborem własnym',
											taborObcy: 'Taborem obcym',
											transportInne: 'Inne',
										}[field]
									}
								</span>
							</label>
						))}
					</div>
				</div>
				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Usługi magazynowo-dystrybucyjne *</h3>
					<div className='grid grid-cols-2 gap-4'>
						<label className='flex items-center space-x-3'>
							<input type='checkbox' {...register('magazynWlasny')} className='h-4 w-4 text-blue-600 rounded' />
							<span className='text-sm text-gray-700'>Magazyn własny</span>
						</label>
						<label className='flex items-center space-x-3'>
							<input type='checkbox' {...register('magazynObcy')} className='h-4 w-4 text-blue-600 rounded' />
							<span className='text-sm text-gray-700'>Magazyn obcy</span>
						</label>
					</div>
				</div>
				<div>
					<h3 className='text-lg font-medium text-gray-900'>Organizacja przewozów drobnicy zbiorowe *</h3>
					<p className='text-sm text-gray-600 mb-4'>Agencje celne</p>
					<div className='flex items-center space-x-6'>
						<label className='flex items-center space-x-3 cursor-pointer'>
							<input
								type='radio'
								value='true'
								{...register('organizacjaPrzewozow', { required: true })}
								onChange={() => {
									setValue('organizacjaPrzewozow', true)
									setValue('agencjeCelne', true)
								}}
								checked={watch('organizacjaPrzewozow') === true}
								className='h-4 w-4 text-blue-600'
							/>
							<span className='text-sm text-gray-700'>Tak</span>
						</label>
						<label className='flex items-center space-x-3 cursor-pointer'>
							<input
								type='radio'
								value='false'
								{...register('organizacjaPrzewozow', { required: true })}
								onChange={() => {
									setValue('organizacjaPrzewozow', false)
									setValue('agencjeCelne', false)
								}}
								checked={watch('organizacjaPrzewozow') === false}
								className='h-4 w-4 text-blue-600'
							/>
							<span className='text-sm text-gray-700'>Nie</span>
						</label>
					</div>
				</div>
				<div className='grid grid-cols-1 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>a) krajowa (ilość oddziałów) *</label>
						<input
							type='text'
							{...register('krajowaSiec', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.krajowaSiec && <p className='text-red-500 text-xs mt-1'>{errors.krajowaSiec.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							b/ zagraniczna (ilość firm własnych / ilość korespondentów) *
						</label>
						<input
							type='text'
							{...register('zagranicznaSSiec', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.zagranicznaSSiec && <p className='text-red-500 text-xs mt-1'>{errors.zagranicznaSSiec.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>c/ inne formy współpracy *</label>
						<textarea
							{...register('inneFormy', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
							rows='2'
						/>
						{errors.inneFormy && <p className='text-red-500 text-xs mt-1'>{errors.inneFormy.message}</p>}
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
						{...register('organizacje', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='3'
					/>
					{errors.organizacje && <p className='text-red-500 text-xs mt-1'>{errors.organizacje.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Firmy-Członkowie Izby rekomendujący przystąpienie do PISiL *
					</label>
					<textarea
						{...register('rekomendacje', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows='4'
					/>
					{errors.rekomendacje && <p className='text-red-500 text-xs mt-1'>{errors.rekomendacje.message}</p>}
				</div>
				<div className='border-t border-gray-200 pt-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Oświadczenie</h3>
					<div className='flex items-start space-x-3 mb-6'>
						<input
							type='checkbox'
							id='declarationStatute'
							{...register('declarationStatute', { required: 'Musisz zaakceptować statut.' })}
							className='mt-1 h-4 w-4 text-blue-600 rounded'
						/>
						<label htmlFor='declarationStatute' className='text-sm text-gray-700'>
							Oświadczam, że zapoznałem/am się z treścią Statutu PISiL i zobowiązuję się do przestrzegania go. *
						</label>
					</div>
					{errors.declarationStatute && (
						<p className='text-red-500 text-xs mt-1'>{errors.declarationStatute.message}</p>
					)}
				</div>
				<div className='border-t border-gray-200 pt-6'>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>Podpis</h3>
					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Imię i nazwisko *</label>
							<input
								type='text'
								{...register('signatoryName', { required: 'To pole jest wymagane.' })}
								className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
							/>
							{errors.signatoryName && <p className='text-red-500 text-xs mt-1'>{errors.signatoryName.message}</p>}
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700 mb-1'>Stanowisko *</label>
							<input
								type='text'
								{...register('signatoryPosition', { required: 'To pole jest wymagane.' })}
								className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
							/>
							{errors.signatoryPosition && (
								<p className='text-red-500 text-xs mt-1'>{errors.signatoryPosition.message}</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	)

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
							!isValid ? 'bg-gray-100 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'
						}`}>
						Dalej
					</button>
				) : (
					<PDFGenerator formData={getValues()} onGenerated={() => setPdfGenerated(true)} disabled={!isValid} />
				)}
			</div>

			{pdfGenerated && (
				<div className='mt-8 pt-6 border-t border-gray-200'>
					<FileUpload formData={getValues()} />
				</div>
			)}
		</div>
	)
}

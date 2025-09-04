import { useEffect } from 'react'

export const Step1 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Dane podstawowe firmy</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Pełna nazwa firmy <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register('companyName', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.companyName && <p className='text-red-500 text-xs mt-1'>{errors.companyName.message}</p>}
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Numer NIP <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register('nip', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors.nip && <p className='text-red-500 text-xs mt-1'>{errors.nip.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Numer REGON <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register('regon', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors.regon && <p className='text-red-500 text-xs mt-1'>{errors.regon.message}</p>}
				</div>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Dokładny adres <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('address', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows='2'
				/>
				{errors.address && <p className='text-red-500 text-xs mt-1'>{errors.address.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Adres do korespondencji <span className='text-red-500'>*</span>
				</label>
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
export const Step2 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Kontakt i kierownictwo</h2>

		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Numery telefonów <span className='text-red-500'>*</span>
				</label>
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
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Adres e-mail do przesyłania faktur <span className='text-red-500'>*</span>
					</label>
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
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Adres e-mail <span className='text-red-500'>*</span>
					</label>
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
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Imię i nazwisko kierownika firmy <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register('ceoName', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700'
				/>
				{errors.ceoName && <p className='text-red-500 text-xs mt-1'>{errors.ceoName.message}</p>}
			</div>

			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Osoby upoważnione do reprezentowania firmy wobec PISiL (imię, nazwisko, stanowisko){' '}
					<span className='text-red-500'>*</span>
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

export const Step3 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Dane rejestracyjne i certyfikaty</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Data rejestracji firmy, sąd rejestrowy, nr rejestru <span className='text-red-500'>*</span>
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
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Forma własności <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register('ownershipForm', { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors.ownershipForm && <p className='text-red-500 text-xs mt-1'>{errors.ownershipForm.message}</p>}
				</div>
				<div>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						Wielkość zatrudnienia <span className='text-red-500'>*</span>
					</label>
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
					Licencja na pośrednictwo przy przewozie rzeczy <span className='text-red-500'>*</span>
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
					Certyfikat ISO 9002 (w jakim zakresie) <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('iso9002Certificate', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows='2'
				/>
				{errors.iso9002Certificate && <p className='text-red-500 text-xs mt-1'>{errors.iso9002Certificate.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Ubezpieczenie o.c. spedytora (ubezpieczyciel) <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('insuranceOC', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows='2'
				/>
				{errors.insuranceOC && <p className='text-red-500 text-xs mt-1'>{errors.insuranceOC.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Opis prowadzonej działalności firmy <span className='text-red-500'>*</span>
				</label>
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

export const Step4 = ({ register, errors, watch, setValue }) => {
	const organizacjaPrzewozowValue = watch('organizacjaPrzewozow')

	useEffect(() => {
		const isTrue = organizacjaPrzewozowValue === 'true'
		setValue('agencjeCelne', isTrue)
	}, [organizacjaPrzewozowValue, setValue])

	return (
		<div className='space-y-6'>
			<h2 className='text-xl font-semibold text-gray-900'>Wachlarz świadczonych usług</h2>
			<div className='space-y-6'>
				<div>
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						Usługi transportowe <span className='text-red-500'>*</span>
					</h3>
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
					<h3 className='text-lg font-medium text-gray-900 mb-4'>
						Usługi magazynowo-dystrybucyjne <span className='text-red-500'>*</span>
					</h3>
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
					<h3 className='text-lg font-medium text-gray-900'>
						Organizacja przewozów drobnicy zbiorowe <span className='text-red-500'>*</span>
					</h3>
					<p className='text-sm text-gray-600 mb-4'>Agencje celne</p>
					<div className='flex items-center space-x-6'>
						<label className='flex items-center space-x-3 cursor-pointer'>
							<input
								type='radio'
								value='true'
								{...register('organizacjaPrzewozow', { required: true })}
								className='h-4 w-4 text-blue-600'
							/>
							<span className='text-sm text-gray-700'>Tak</span>
						</label>
						<label className='flex items-center space-x-3 cursor-pointer'>
							<input
								type='radio'
								value='false'
								{...register('organizacjaPrzewozow', { required: true })}
								className='h-4 w-4 text-blue-600'
							/>
							<span className='text-sm text-gray-700'>Nie</span>
						</label>
					</div>
				</div>
				<div className='grid grid-cols-1 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							a) krajowa (ilość oddziałów) <span className='text-red-500'>*</span>
						</label>
						<input
							type='text'
							{...register('krajowaSiec', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.krajowaSiec && <p className='text-red-500 text-xs mt-1'>{errors.krajowaSiec.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							b) zagraniczna (ilość firm własnych / ilość korespondentów) <span className='text-red-500'>*</span>
						</label>
						<input
							type='text'
							{...register('zagranicznaSSiec', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.zagranicznaSSiec && <p className='text-red-500 text-xs mt-1'>{errors.zagranicznaSSiec.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							c) inne formy współpracy <span className='text-red-500'>*</span>
						</label>
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
}

export const Step5 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Członkostwo i finalizacja</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Do jakich organizacji firma należy i od kiedy <span className='text-red-500'>*</span>
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
					Firmy-Członkowie Izby rekomendujący przystąpienie do PISiL <span className='text-red-500'>*</span>
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
						Oświadczam, że zapoznałem/am się z treścią Statutu PISiL i zobowiązuję się do przestrzegania go.{' '}
						<span className='text-red-500'>*</span>
					</label>
				</div>
				{errors.declarationStatute && <p className='text-red-500 text-xs mt-1'>{errors.declarationStatute.message}</p>}
			</div>
			<div className='border-t border-gray-200 pt-6'>
				<h3 className='text-lg font-medium text-gray-900 mb-4'>Podpis</h3>
				<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							Imię i nazwisko <span className='text-red-500'>*</span>
						</label>
						<input
							type='text'
							{...register('signatoryName', { required: 'To pole jest wymagane.' })}
							className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						/>
						{errors.signatoryName && <p className='text-red-500 text-xs mt-1'>{errors.signatoryName.message}</p>}
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700 mb-1'>
							Stanowisko <span className='text-red-500'>*</span>
						</label>
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

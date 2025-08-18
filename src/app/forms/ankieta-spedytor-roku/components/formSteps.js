export const Step1 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700 '>Ankieta Spedytor Roku</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Adres e-mail <span className='text-red-500'>*</span>
				</label>
				<input
					type='email'
					{...register('email', {
						required: 'To pole jest wymagane.',
						pattern: { value: /^\S+@\S+$/i, message: 'Nieprawidłowy format e-mail.' },
					})}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Nazwa firmy i adres <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('companyNameAndAddress', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.companyNameAndAddress && (
					<p className='text-red-500 text-xs mt-1'>{errors.companyNameAndAddress.message}</p>
				)}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Struktura sprzedaży w procentach <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('salesStructure', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={5}
				/>
				{errors.salesStructure && <p className='text-red-500 text-xs mt-1'>{errors.salesStructure.message}</p>}
			</div>
		</div>
	</div>
)

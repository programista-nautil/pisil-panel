export const Step1 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Ankieta Młody Spedytor Roku</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Imię i nazwisko <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register('fullName', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.fullName && <p className='text-red-500 text-xs mt-1'>{errors.fullName.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Data urodzenia <span className='text-red-500'>*</span>
				</label>
				<input
					type='date'
					{...register('birthDate', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.birthDate && <p className='text-red-500 text-xs mt-1'>{errors.birthDate.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Nr telefonu <span className='text-red-500'>*</span>
				</label>
				<input
					type='tel'
					{...register('phone', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.phone && <p className='text-red-500 text-xs mt-1'>{errors.phone.message}</p>}
			</div>
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
					Wykształcenie, nazwa uczelni, szkoły <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('education', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.education && <p className='text-red-500 text-xs mt-1'>{errors.education.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Przebieg pracy zawodowej <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('workExperience', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={4}
				/>
				{errors.workExperience && <p className='text-red-500 text-xs mt-1'>{errors.workExperience.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Nazwa i referencje firmy zatrudniającej kandydata <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('employerInfo', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.employerInfo && <p className='text-red-500 text-xs mt-1'>{errors.employerInfo.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Temat, który zaprezentuje kandydat <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('presentationTopic', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.presentationTopic && <p className='text-red-500 text-xs mt-1'>{errors.presentationTopic.message}</p>}
			</div>
		</div>
	</div>
)

export const Step1 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Uzyskaj patronat</h2>
		<div className='text-sm text-gray-700'>
			<p>
				Szanowni Państwo, W przypadku ubiegania się o patronat Polskiej Izby Spedycji i Logistyki uprzejmie prosimy o
				wypełnienie poniższego formularza, który zawiera informacje niezbędne dla podjęcia decyzji o udzieleniu
				patronatu dla wnioskowanego wydarzenia. Przyjęta przez nas forma pozwoli na uporządkowanie, ujednolicenie i
				szybkie rozpatrzenie wniosku. Wypełniony formularz prosimy przesłać na adres: pisil@pisil.pl Odpowiedzi
				udzielimy natychmiast jak tylko będzie to możliwe.
			</p>
			<p className='mt-2'>Polska Izba Spedycji i Logistyki</p>
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
				Rodzaj <span className='text-red-500'>*</span>
			</label>
			<div className='mt-2 space-y-2'>
				{['Patronat', 'Udział w konferencji', 'Udział w targach', 'Wystąpienie na konferencji'].map(type => (
					<label key={type} className='flex items-center'>
						<input
							type='radio'
							{...register('requestType', { required: 'Wybór rodzaju jest wymagany' })}
							value={type}
							className='h-4 w-4 text-blue-600'
						/>
						<span className='ml-3 text-sm text-gray-700'>{type}</span>
					</label>
				))}
			</div>
			{errors.requestType && <p className='text-red-500 text-xs mt-1'>{errors.requestType.message}</p>}
		</div>
	</div>
)

export const Step2 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Informacja o organizatorze</h2>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Nazwa organizatora <span className='text-red-500'>*</span>
			</label>
			<input
				type='text'
				{...register('organizerName', { required: 'Nazwa organizatora jest wymagana' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
			/>
			{errors.organizerName && <p className='text-red-500 text-xs mt-1'>{errors.organizerName.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Osoba odpowiedzialna za kontakt <span className='text-red-500'>*</span>
			</label>
			<textarea
				{...register('contactPerson', { required: 'Podaj osobę kontaktową' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
			{errors.contactPerson && <p className='text-red-500 text-xs mt-1'>{errors.contactPerson.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Krótka charakterystyka organizatora <span className='text-red-500'>*</span>
			</label>
			<textarea
				{...register('organizerDescription', { required: 'Opis organizatora jest wymagany' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
			{errors.organizerDescription && (
				<p className='text-red-500 text-xs mt-1'>{errors.organizerDescription.message}</p>
			)}
		</div>
	</div>
)

export const Step3 = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-900'>Opis wydarzenia</h2>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Nazwa wydarzenia <span className='text-red-500'>*</span>
			</label>
			<textarea
				{...register('eventName', { required: 'Nazwa wydarzenia jest wymagana' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
			/>
			{errors.eventName && <p className='text-red-500 text-xs mt-1'>{errors.eventName.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>Opis wydarzenia (opcjonalnie)</label>
			<textarea
				{...register('eventDescription')}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Termin i miejsce <span className='text-red-500'>*</span>
			</label>
			<input
				type='text'
				{...register('eventDateAndPlace', { required: 'Termin i miejsce są wymagane' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
			/>
			{errors.eventDateAndPlace && <p className='text-red-500 text-xs mt-1'>{errors.eventDateAndPlace.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>Partnerzy / sponsorzy wydarzenia</label>
			<textarea
				{...register('partners')}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='2'
			/>
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>Patroni wydarzenia (opcjonalnie)</label>
			<textarea
				{...register('eventPatrons')}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='2'
			/>
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Zasięg wydarzenia <span className='text-red-500'>*</span>
			</label>
			<div className='mt-2 flex gap-4'>
				<label>
					<input
						className='h-4 w-4 text-blue-600'
						type='radio'
						{...register('eventReach', { required: true })}
						value='ponizej_100'
					/>
					<span className='ml-2 text-sm text-gray-700'>poniżej 100</span>
				</label>
				<label>
					<input
						className='h-4 w-4 text-blue-600'
						type='radio'
						{...register('eventReach', { required: true })}
						value='powyzej_100'
					/>
					<span className='ml-2 text-sm text-gray-700'>powyżej 100</span>
				</label>
			</div>
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Oczekiwane świadczenie od PISiL <span className='text-red-500'>*</span>
			</label>
			<textarea
				{...register('expectedService', { required: 'To pole jest wymagane' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
			{errors.expectedService && <p className='text-red-500 text-xs mt-1'>{errors.expectedService.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>
				Oferta dla PISiL i jej członków <span className='text-red-500'>*</span>
			</label>
			<textarea
				{...register('offerForPISIL', { required: 'To pole jest wymagane' })}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
			{errors.offerForPISIL && <p className='text-red-500 text-xs mt-1'>{errors.offerForPISIL.message}</p>}
		</div>
		<div>
			<label className='block text-sm font-medium text-gray-700 mb-1'>Dodatkowe informacje (opcjonalnie)</label>
			<textarea
				{...register('additionalInfo')}
				className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				rows='3'
			/>
		</div>
	</div>
)

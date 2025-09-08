export const GeneralInfoStep = ({ register, errors }) => (
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

export const EmployeesStep = ({ year, register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Pracownicy - {year} r.</h2>
		<div className='space-y-4'>
			{[
				{ name: `zatrudnienieKoniecRoku_${year}`, label: 'Zatrudnienie na koniec roku' },
				{ name: `pracownicyDyplomFIATA_${year}`, label: 'Liczba pracowników mających dyplom FIATA' },
			].map(({ name, label }) => (
				<div key={name}>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						{label} <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register(name, { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors[name] && <p className='text-red-500 text-xs mt-1'>{errors[name].message}</p>}
				</div>
			))}
			{[
				{ name: `szkoleniaWewnetrzne_${year}`, label: 'Liczba pracowników uczestniczących w szkoleniach wewnętrznych' },
				{ name: `szkoleniaZewnetrzne_${year}`, label: 'Liczba pracowników uczestniczących w szkoleniach zewnętrznych' },
			].map(({ name, label }) => (
				<div key={name}>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						{label} (podać tytuły szkoleń) <span className='text-red-500'>*</span>
					</label>
					<textarea
						{...register(name, { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
						rows={3}
					/>
					{errors[name] && <p className='text-red-500 text-xs mt-1'>{errors[name].message}</p>}
				</div>
			))}
		</div>
	</div>
)

export const FinancialResultsStep = ({ year, register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Wyniki finansowe - {year} r.</h2>
		<div className='space-y-4'>
			{[
				{ name: `przychodyNetto_${year}`, label: 'Przychody netto ze sprzedaży i zrównane z nimi' },
				{ name: `kosztyDzialalnosciOperacyjnej_${year}`, label: 'Koszty działalności operacyjnej' },
				{ name: `zyskStrataZeSprzedazy_${year}`, label: 'Zysk/strata ze sprzedaży' },
				{
					name: `wynikNaPozostalejDzialalnosci_${year}`,
					label:
						'Wynik na pozostałej działalności operacyjnej (pozostałe przychody operacyjne - pozostałe koszty operacyjne)',
				},
				{ name: `zyskStrataBrutto_${year}`, label: 'Zysk/strata brutto' },
				{ name: `wartoscSprzedazyNaPracownika_${year}`, label: 'Wartość sprzedaży na 1 pracownika' },
				{ name: `zyskZeSprzedazyNaPracownika_${year}`, label: 'Zysk ze sprzedaży na 1 pracownika' },
				{ name: `wartoscInwestycjiOgolem_${year}`, label: 'Wartość inwestycji ogółem' },
				{
					name: `rentownoscSprzedazyNetto_${year}`,
					label: 'Rentowność sprzedaży netto (zysk netto/przychody netto ze sprzedaży)',
				},
			].map(({ name, label }) => (
				<div key={name}>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						{label} <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register(name, { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors[name] && <p className='text-red-500 text-xs mt-1'>{errors[name].message}</p>}
				</div>
			))}
		</div>
	</div>
)

export const FinancialLiquidityStep = ({ year, register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Płynność finansowa - {year} r.</h2>
		<div className='space-y-4'>
			{[
				{ name: `sredniTerminRealizacjiZobowiazan_${year}`, label: 'Średni termin realizacji zobowiązań (w dniach)' },
				{ name: `wskaznikZadluzeniaDR_${year}`, label: 'Wskaźnik zadłużenia DR* (na 31.12)' },
				{ name: `wskaznikZadluzeniaCR_${year}`, label: 'Wskaźnik zadłużenia CR** (na 31.12)' },
			].map(({ name, label }) => (
				<div key={name}>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						{label} <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register(name, { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors[name] && <p className='text-red-500 text-xs mt-1'>{errors[name].message}</p>}
				</div>
			))}
		</div>
		<div className='text-xs text-gray-500 p-4 bg-gray-50 rounded-md'>
			<p>
				<strong>Legenda:</strong>
			</p>
			<p className='mt-2'>
				<strong>* debt ratio DR</strong> - wskaźnik ogólnego zadłużenia (ang. debt ratio, DR) – wskaźnik mierzący
				stosunek zobowiązań (zobowiązania ogółem i rezerwy na zobowiązania) do aktywów ogółem.Im większa jest wartość
				tego wskaźnika tym wyższe ryzyko ponosi kredytodawca .Przyjmuje się, że jego wartość powyżej 0,67 wskazuje na
				nadmierne ryzyko kredytowe. Niski poziom wskaźnika świadczy o samodzielności finansowej przedsiębiorstwa.
				Jednocześnie nie pozwala w pełni wykorzystać dźwigni finansowej.
			</p>
			<p className='mt-2'>
				<strong>** current ratio CR</strong> - wskaźnik bieżącej płynności finansowej -aktywa obrotowe/zobowiązania
				krótkoterminowe. Jeżeli wartość aktywów obrotowych jest większa od zobowiązań krótkoterminowych dwukrotnie to
				zwykle przyjmuje się, że spółka jest płynna i nie ma problemów ze spłatą bieżących zobowiązań. (wskaźnik około
				2) Niepokojącą sytuacją jest gdy wartość zobowiązań krótkoterminowych spółki przekracza jej aktywa obrotowe
				(wskaźnik poniżej 1). W takim wypadku firma może mieć problemy z regulowaniem bieżących zobowiązań, co w
				konsekwencji może doprowadzić ją nawet do bankructwa.
			</p>
		</div>
	</div>
)

export const LogisticsPotentialStep = ({ year, register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Potencjał przewozowo-magazynowy - {year} r.</h2>
		<div className='space-y-4'>
			{[
				{ name: `liczbaPojazdowWlasnych_${year}`, label: 'Liczba pojazdów własnych' },
				{ name: `liczbaPojazdowLeasing_${year}`, label: 'Liczba pojazdów w leasingu' },
				{ name: `powierzchniaMagazynowWlasnych_${year}`, label: 'Liczba i powierzchnia magazynów własnych' },
				{
					name: `powierzchniaMagazynowDzierżawionych_${year}`,
					label: 'Liczba i powierzchnia magazynów dzierżawionych',
				},
			].map(({ name, label }) => (
				<div key={name}>
					<label className='block text-sm font-medium text-gray-700 mb-1'>
						{label} <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						{...register(name, { required: 'To pole jest wymagane.' })}
						className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					/>
					{errors[name] && <p className='text-red-500 text-xs mt-1'>{errors[name].message}</p>}
				</div>
			))}
		</div>
	</div>
)

export const MiscellaneousStep = ({ register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Pozostałe</h2>
		<div className='space-y-8'>
			{/* Pytanie 1 */}
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-2'>
					Czy firma poszerzyła zakres usług w ostatnim roku (np. obsługa nowych gałęzi transportu, nowych kierunków
					geograficznych, zaoferowanie innowacyjnych produktów)? <span className='text-red-500'>*</span>
				</label>
				<div className='flex gap-x-6'>
					<label className='flex items-center'>
						<input
							type='radio'
							{...register('expandedServices', { required: true })}
							value='Tak'
							className='h-4 w-4 text-gray-700'
						/>
						<span className='ml-2 text-sm text-gray-700'>Tak</span>
					</label>
					<label className='flex items-center'>
						<input type='radio' {...register('expandedServices', { required: true })} value='Nie' className='h-4 w-4' />
						<span className='ml-2 text-sm text-gray-700'>Nie</span>
					</label>
				</div>
			</div>

			{/* Pytanie 2 */}
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-2'>
					Czy firma wdrożyła w ostatnim roku nowe rozwiązania w zakresie technologii informatycznych?{' '}
					<span className='text-red-500'>*</span>
				</label>
				<div className='flex gap-x-6'>
					<label className='flex items-center'>
						<input type='radio' {...register('implementedIT', { required: true })} value='Tak' className='h-4 w-4' />
						<span className='ml-2 text-sm text-gray-700'>Tak</span>
					</label>
					<label className='flex items-center'>
						<input type='radio' {...register('implementedIT', { required: true })} value='Nie' className='h-4 w-4' />
						<span className='ml-2 text-sm text-gray-700'>Nie</span>
					</label>
				</div>
			</div>

			{/* Pytanie 3 - Tabela Ubezpieczeń */}
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-2'>
					Jakie ubezpieczenia związane z działalnością spedycyjną/transportową posiada firma?{' '}
					<span className='text-red-500'>*</span>
				</label>
				<div className='grid grid-cols-3 gap-2 border rounded-md p-4'>
					<div className='col-span-1'></div>
					<div className='text-center font-medium text-sm text-gray-600'>Tak</div>
					<div className='text-center font-medium text-sm text-gray-600'>Nie</div>

					{[
						{ name: 'insuranceOCSpedytora', label: 'OC spedytora' },
						{ name: 'insuranceOCPrzewoznika', label: 'OC przewoźnika' },
						{ name: 'insuranceOCTransportuIntermodalnego', label: 'OC transportu intermodalnego' },
						{ name: 'insuranceInne', label: 'Inne' },
					].map(({ name, label }) => (
						<>
							<div key={name} className='col-span-1 text-sm font-medium text-gray-800 self-center'>
								{label}
							</div>
							<div className='text-center'>
								<input type='radio' {...register(name, { required: true })} value='Tak' className='h-4 w-4' />
							</div>
							<div className='text-center'>
								<input type='radio' {...register(name, { required: true })} value='Nie' className='h-4 w-4' />
							</div>
						</>
					))}
				</div>
			</div>

			{/* Pytanie 4 */}
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Jakie metody stosuje firma, badając zadowolenie klientów ze świadczonych przez nią usług?{' '}
					<span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('customerSatisfactionMethods', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.customerSatisfactionMethods && (
					<p className='text-red-500 text-xs mt-1'>{errors.customerSatisfactionMethods.message}</p>
				)}
			</div>

			{/* Pytanie 5 */}
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Czy firma jest aktywna w działaniach na rzecz społeczności lokalnej (np. sponsoring, darowizny, stypendia,
					nagrody, praktyki, działalność edukacyjna)? Jeżeli tak, krótko opisać. <span className='text-red-500'>*</span>
				</label>
				<textarea
					{...register('communityActivities', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
					rows={3}
				/>
				{errors.communityActivities && (
					<p className='text-red-500 text-xs mt-1'>{errors.communityActivities.message}</p>
				)}
			</div>
		</div>
	</div>
)

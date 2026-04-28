import { useState, useRef } from 'react'

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
				{
					name: `wynikNaDzialalnosciFinansowej_${year}`,
					label: 'Wynik na działalności finansowej (przychody finansowe - koszty finansowe)',
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
				{ name: `sredniTerminRealizacjiNaleznosci_${year}`, label: 'Średni termin realizacji należności (w dniach)' },
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

export const OrdersStep = ({ year, register, errors }) => (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Liczba zleceń spedycyjnych - {year} r.</h2>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Liczba obsłużonych zleceń spedycyjnych <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register(`liczbaObsluzzonychZlecen_${year}`, { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors[`liczbaObsluzzonychZlecen_${year}`] && (
					<p className='text-red-500 text-xs mt-1'>{errors[`liczbaObsluzzonychZlecen_${year}`].message}</p>
				)}
			</div>
		</div>
	</div>
)

export const SignatoryStep = ({ register, errors, setValue }) => {
	const [files, setFiles] = useState([])
	const inputRef = useRef(null)

	const updateForm = updated => {
		setFiles(updated)
		setValue('zalacznikiFiles', updated)
		setValue('zalaczniki', updated.map(f => f.name).join('\n'))
	}

	const handleAdd = e => {
		const picked = Array.from(e.target.files || [])
		if (picked.length === 0) return
		updateForm([...files, ...picked])
		e.target.value = ''
	}

	const handleRemove = i => updateForm(files.filter((_, idx) => idx !== i))

	return (
	<div className='space-y-6'>
		<h2 className='text-xl font-semibold text-gray-700'>Deklaracja i dane osoby składającej</h2>
		<div className='p-4 bg-blue-50 border border-blue-200 rounded-md'>
			<p className='text-sm text-gray-700'>
				<strong>Niniejszym deklaruję udział firmy w konkursie Spedytor Roku 2025.</strong>
			</p>
			<p className='text-xs text-gray-500 mt-2'>
				Po wygenerowaniu PDF prosimy o pobranie dokumentu, złożenie podpisu elektronicznego i przesłanie podpisanego pliku.
			</p>
		</div>
		<div className='space-y-4'>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-2'>
					Załączniki do ankiety <span className='text-gray-400 font-normal'>(opcjonalnie)</span>
				</label>
				<input ref={inputRef} type='file' onChange={handleAdd} className='hidden' />
				{files.length > 0 && (
					<ul className='mb-2 divide-y divide-gray-200 rounded-md border border-gray-200'>
						{files.map((file, i) => (
							<li key={i} className='flex items-center justify-between px-3 py-2 text-sm text-gray-700'>
								<span className='truncate mr-2'>{i + 1}. {file.name}</span>
								<button
									type='button'
									onClick={() => handleRemove(i)}
									className='flex-shrink-0 text-gray-400 hover:text-red-500 text-lg leading-none'>
									×
								</button>
							</li>
						))}
					</ul>
				)}
				<button
					type='button'
					onClick={() => inputRef.current?.click()}
					className='inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:bg-gray-50'>
					<svg className='h-4 w-4 text-gray-500' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
						<path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
					</svg>
					Dodaj plik
				</button>
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Miejscowość <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register('miejscowosc', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.miejscowosc && <p className='text-red-500 text-xs mt-1'>{errors.miejscowosc.message}</p>}
			</div>
			<div>
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					Imię i nazwisko osoby wypełniającej ankietę <span className='text-red-500'>*</span>
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
					Telefon / tel. komórkowy <span className='text-red-500'>*</span>
				</label>
				<input
					type='text'
					{...register('signatoryPhone', { required: 'To pole jest wymagane.' })}
					className='w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700'
				/>
				{errors.signatoryPhone && <p className='text-red-500 text-xs mt-1'>{errors.signatoryPhone.message}</p>}
			</div>
		</div>
	</div>
	)
}

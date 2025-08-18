import Link from 'next/link'

export default function HomePage() {
	return (
		<div className='min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col items-center justify-center p-6'>
			<div className='mx-auto w-full max-w-7xl'>
				<header className='mb-10 text-center'>
					<h1 className='text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900'>
						Platforma Formularzy PISiL
					</h1>
					<p className='mt-3 text-base md:text-lg text-gray-600'>
						Wybierz dokument, który chcesz wypełnić i złożyć online.
					</p>
				</header>

				<main>
					<div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6'>
						{/* Deklaracja członkowska */}
						<Link
							href='/forms/deklaracja-czlonkowska'
							className='group relative block focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 rounded-2xl'>
							<div className='h-full rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md'>
								<div className='mb-4 flex items-center gap-2'>
									<span className='inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'>
										Formularz
									</span>
								</div>
								<h2 className='text-xl font-semibold text-gray-900 truncate'>Deklaracja Członkowska</h2>
								<p className='mt-2 text-sm text-gray-600'>Dla firm ubiegających się o członkostwo w PISiL.</p>
								<div className='mt-6 inline-flex items-center text-blue-700 font-medium'>
									Przejdź do formularza
									<svg
										className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5'
										viewBox='0 0 20 20'
										fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
											clipRule='evenodd'
										/>
									</svg>
								</div>
							</div>
						</Link>

						{/* Patronat */}
						<Link
							href='/forms/patronat'
							className='group relative block focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 rounded-2xl'>
							<div className='h-full rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md'>
								<div className='mb-4 flex items-center gap-2'>
									<span className='inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700'>
										Formularz
									</span>
								</div>
								<h2 className='text-xl font-semibold text-gray-900 truncate'>Uzyskaj Patronat</h2>
								<p className='mt-2 text-sm text-gray-600'>Wniosek o patronat, udział w wydarzeniu lub wystąpienie.</p>
								<div className='mt-6 inline-flex items-center text-blue-700 font-medium'>
									Przejdź do formularza
									<svg
										className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5'
										viewBox='0 0 20 20'
										fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
											clipRule='evenodd'
										/>
									</svg>
								</div>
							</div>
						</Link>

						{/* Ankieta Spedytor Roku */}
						<Link
							href='/forms/ankieta-spedytor-roku'
							className='group relative block focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 rounded-2xl'>
							<div className='h-full rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md'>
								<div className='mb-4 flex items-center gap-2'>
									<span className='inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'>
										Ankieta
									</span>
								</div>
								<h2 className='text-xl font-semibold text-gray-900 truncate'>Ankieta Spedytor Roku</h2>
								<p className='mt-2 text-sm text-gray-600'>Weź udział i wypełnij ankietę konkursową.</p>
								<div className='mt-6 inline-flex items-center text-blue-700 font-medium'>
									Przejdź do formularza
									<svg
										className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5'
										viewBox='0 0 20 20'
										fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
											clipRule='evenodd'
										/>
									</svg>
								</div>
							</div>
						</Link>

						{/* Młody Spedytor Roku */}
						<Link
							href='/forms/mlody-spedytor-roku'
							className='group relative block focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-300 rounded-2xl'>
							<div className='h-full rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-md'>
								<div className='mb-4 flex items-center gap-2'>
									<span className='inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700'>
										Ankieta
									</span>
								</div>
								<h2 className='text-xl font-semibold text-gray-900 truncate'>Młody Spedytor Roku</h2>
								<p className='mt-2 text-sm text-gray-600'>Zgłoś kandydata do konkursu „Młody Spedytor Roku”.</p>
								<div className='mt-6 inline-flex items-center text-blue-700 font-medium'>
									Przejdź do formularza
									<svg
										className='ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5'
										viewBox='0 0 20 20'
										fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z'
											clipRule='evenodd'
										/>
									</svg>
								</div>
							</div>
						</Link>
					</div>
				</main>
			</div>
		</div>
	)
}

import Link from 'next/link'

export default function HomePage() {
	return (
		<div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4'>
			<div className='max-w-4xl w-full text-center'>
				<header className='mb-12'>
					<h1 className='text-4xl md:text-5xl font-bold text-gray-900 mb-4'>Platforma Formularzy PISiL</h1>
					<p className='text-lg text-gray-600'>Wybierz dokument, który chcesz wypełnić i złożyć online.</p>
				</header>

				<main>
					<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 justify-center'>
						{/* --- Karta Formularza --- */}
						<Link
							href='/forms/deklaracja-czlonkowska'
							className='block group text-left transform transition-transform hover:-translate-y-1'>
							<div className='bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 h-full flex flex-col'>
								<h2 className='text-2xl font-semibold text-gray-800 mb-3'>Deklaracja Członkowska</h2>
								<p className='text-gray-600 flex-grow mb-6'>
									Formularz dla firm ubiegających się o członkostwo w Polskiej Izbie Specjalistów IT i Logistyki.
								</p>
								<span className='mt-auto text-blue-600 font-semibold group-hover:underline'>
									Przejdź do formularza &rarr;
								</span>
							</div>
						</Link>

						<Link
							href='/forms/patronat'
							className='block group text-left transform transition-transform hover:-translate-y-1'>
							<div className='bg-white p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 h-full flex flex-col'>
								<h2 className='text-2xl font-semibold text-gray-800 mb-3'>Uzyskaj Patronat</h2>
								<p className='text-gray-600 flex-grow mb-6'>
									Wypełnij wniosek o patronat, udział w konferencji, targach lub wystąpienie w imieniu PISiL.
								</p>
								<span className='mt-auto text-blue-600 font-semibold group-hover:underline'>
									Wypełnij wniosek &rarr;
								</span>
							</div>
						</Link>

						{/* --- Miejsce na przyszłe karty --- */}
						<div className='bg-white bg-opacity-50 p-8 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-center'>
							<p className='text-gray-500'>Więcej formularzy wkrótce...</p>
						</div>
					</div>
				</main>
			</div>
		</div>
	)
}

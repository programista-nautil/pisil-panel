'use client' // Dodajemy, aby móc użyć hooka useSession

import { useSession, signOut } from 'next-auth/react'

export default function MemberDashboard() {
	const { data: session } = useSession()

	return (
		<div className='min-h-screen bg-gray-100'>
			<div className='max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'>
				<header className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900 tracking-tight'>Panel Członka PISiL</h1>
						<p className='text-gray-600 mt-1'>Witaj w strefie dla członków.</p>
					</div>
					<div className='flex items-center gap-4'>
						{session?.user && (
							<span className='text-sm text-gray-700 hidden sm:block'>
								Zalogowano jako: <strong>{session.user.name || session.user.email}</strong>
							</span>
						)}
						<button
							onClick={() => signOut({ callbackUrl: '/' })} // Przekierowanie na stronę główną po wylogowaniu
							className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm'>
							<svg
								xmlns='http://www.w3.org/2000/svg'
								className='h-4 w-4'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'
								strokeWidth={2}>
								<path
									strokeLinecap='round'
									strokeLinejoin='round'
									d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
								/>
							</svg>
							<span>Wyloguj się</span>
						</button>
					</div>
				</header>

				<main>
					<div className='bg-white p-6 rounded-lg shadow'>
						<h2 className='text-xl font-semibold text-gray-800'>Pulpit</h2>
						<p className='mt-2 text-gray-600'>Tu w przyszłości pojawią się ważne informacje i dostępne pliki.</p>
						{/* Tutaj dodamy później sekcje np. z plikami */}
					</div>
				</main>
			</div>
		</div>
	)
}

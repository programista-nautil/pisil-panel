import Link from 'next/link'

export const metadata = {
	title: 'Brak dostępu - PISiL Panel',
	description: 'Nie masz uprawnień do tego zasobu',
}

export default function UnauthorizedPage() {
	return (
		<div className='min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8'>
			<div className='max-w-md w-full text-center'>
				{/* Ikona */}
				<div className='mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6'>
					<svg
						className='h-10 w-10 text-red-600'
						fill='none'
						stroke='currentColor'
						viewBox='0 0 24 24'
						aria-hidden='true'>
						<path
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth={2}
							d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
						/>
					</svg>
				</div>

				{/* Nagłówek */}
				<h1 className='text-3xl font-bold text-gray-900 mb-4'>Brak dostępu</h1>

				{/* Komunikat */}
				<p className='text-lg text-gray-600 mb-6'>Nie masz uprawnień do przeglądania tego zasobu.</p>

				{/* Informacja o kontakcie */}
				<div className='bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8'>
					<p className='text-sm text-blue-800'>
						Jeśli uważasz, że to błąd, skontaktuj się z administratorem systemu w celu uzyskania odpowiednich uprawnień.
					</p>
				</div>
			</div>
		</div>
	)
}

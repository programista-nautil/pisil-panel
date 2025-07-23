'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'

// Komponent do renderowania etykiety statusu z odpowiednim kolorem
const StatusBadge = ({ status }) => {
	const statusStyles = {
		PENDING: 'bg-yellow-100 text-yellow-800',
		APPROVED: 'bg-green-100 text-green-800',
		REJECTED: 'bg-red-100 text-red-800',
	}

	const statusText = {
		PENDING: 'Oczekujący',
		APPROVED: 'Zatwierdzony',
		REJECTED: 'Odrzucony',
	}

	return (
		<span
			className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
			{statusText[status] || status}
		</span>
	)
}

export default function AdminDashboard() {
	const [submissions, setSubmissions] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const { data: session } = useSession()

	useEffect(() => {
		const fetchSubmissions = async () => {
			setIsLoading(true)
			try {
				const response = await fetch('/api/admin/submissions')
				if (!response.ok) {
					throw new Error('Nie udało się pobrać danych.')
				}
				const data = await response.json()
				setSubmissions(data)
			} catch (error) {
				console.error(error)
			} finally {
				setIsLoading(false)
			}
		}

		fetchSubmissions()
	}, [])

	return (
		<div className='min-h-screen bg-gray-100'>
			<div className='max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'>
				<header className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900 tracking-tight'>Panel Administracyjny</h1>
						<p className='text-gray-600 mt-1'>Przeglądaj i zarządzaj złożonymi deklaracjami.</p>
					</div>
					<div className='flex items-center gap-4'>
						<span className='text-sm text-gray-700 hidden sm:block'>
							Witaj, <strong>{session?.user?.name || 'Admin'}</strong>
						</span>
						<button
							onClick={() => signOut({ callbackUrl: '/login' })}
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

				{/* Karty ze statystykami */}
				<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
					<div className='bg-white p-6 rounded-lg shadow'>
						<h3 className='text-sm font-medium text-gray-500'>Wszystkie zgłoszenia</h3>
						<p className='mt-2 text-3xl font-bold text-gray-900'>{submissions.length}</p>
					</div>
					{/* Tutaj można dodać więcej kart, np. "Oczekujące", "Zatwierdzone" */}
				</div>

				<main className='bg-white rounded-lg shadow overflow-hidden'>
					<div className='overflow-x-auto'>
						<table className='w-full text-sm text-left text-gray-500'>
							<thead className='text-xs text-gray-700 uppercase bg-gray-50'>
								<tr>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Nazwa Firmy
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Email Kontaktowy
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Data Złożenia
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Status
									</th>
									<th scope='col' className='px-6 py-4 font-semibold text-right'>
										Akcje
									</th>
								</tr>
							</thead>
							<tbody>
								{isLoading ? (
									<tr>
										<td colSpan='4' className='px-6 py-8 text-center text-gray-500'>
											Ładowanie danych...
										</td>
									</tr>
								) : submissions.length === 0 ? (
									<tr className='bg-white'>
										<td colSpan='4' className='px-6 py-8 text-center text-gray-500'>
											Brak zgłoszeń do wyświetlenia.
										</td>
									</tr>
								) : (
									submissions.map(submission => (
										<tr key={submission.id} className='bg-white border-t hover:bg-gray-50'>
											<td className='px-6 py-4 font-medium text-gray-900 whitespace-nowrap'>
												{submission.companyName || 'Brak nazwy'}
											</td>
											<td className='px-6 py-4'>{submission.email || 'Brak emaila'}</td>
											<td className='px-6 py-4'>
												{new Date(submission.createdAt).toLocaleString('pl-PL', {
													dateStyle: 'short',
													timeStyle: 'short',
												})}
											</td>
											<td className='px-6 py-4'>
												<StatusBadge status={submission.status} />
											</td>
											<td className='px-6 py-4 text-right'>
												<a href='#' className='font-medium text-blue-600 hover:underline'>
													Pobierz PDF
												</a>
											</td>
										</tr>
									))
								)}
							</tbody>
						</table>
					</div>
				</main>
			</div>
		</div>
	)
}

'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { DocumentTextIcon, UserCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'

const FileList = ({ title, icon: Icon, files }) => (
	<section className='mb-8'>
		<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
			<Icon className='h-6 w-6 text-gray-500' />
			<h2 className='text-lg font-semibold text-gray-800'>{title}</h2>
		</div>
		{files.length > 0 ? (
			<ul className='divide-y divide-gray-200 rounded-md border border-gray-200 bg-white shadow-sm'>
				{files.map(file => (
					<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3'>
						<div className='flex items-center gap-3 min-w-0'>
							<DocumentTextIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
							<span className='text-sm font-medium text-gray-800 truncate'>{file.fileName}</span>
						</div>
						<a
							href={`/api/member/attachments/${file.id}/download`}
							download
							className='inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100'>
							<ArrowDownTrayIcon className='h-4 w-4' />
							Pobierz
						</a>
					</li>
				))}
			</ul>
		) : (
			<p className='text-sm text-gray-500 italic px-2'>Brak plików w tej sekcji.</p>
		)}
	</section>
)

export default function MemberDashboard() {
	const { data: session } = useSession()
	const [files, setFiles] = useState({ generalFiles: [], individualFiles: [] })
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const fetchFiles = async () => {
			setIsLoading(true)
			try {
				const response = await fetch('/api/member/files')
				if (!response.ok) {
					throw new Error('Nie udało się pobrać plików.')
				}
				const data = await response.json()
				setFiles(data)
			} catch (error) {
				console.error(error)
				// Tutaj można dodać obsługę błędów, np. wyświetlenie komunikatu
			} finally {
				setIsLoading(false)
			}
		}
		fetchFiles()
	}, [])

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
							onClick={() => signOut({ callbackUrl: '/member/login' })}
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
					{isLoading ? (
						<p className='text-center text-gray-500'>Ładowanie plików...</p>
					) : (
						<>
							<FileList title='Pliki indywidualne' icon={UserCircleIcon} files={files.individualFiles} />
							<FileList title='Pliki ogólne' icon={DocumentTextIcon} files={files.generalFiles} />
						</>
					)}
				</main>
			</div>
		</div>
	)
}

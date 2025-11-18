'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import {
	DocumentTextIcon,
	UserCircleIcon,
	ArrowDownTrayIcon,
	ChevronDownIcon,
	FolderIcon,
	KeyIcon,
} from '@heroicons/react/24/outline'
import ChangePasswordModal from './components/ChangePasswordModal'

const CollapsibleFileCategory = ({ category }) => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div className='bg-white'>
			{/* Nagłówek kategorii - wygląda teraz jak wiersz w tabeli */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left group'>
				<div className='flex items-center gap-3'>
					{/* Ikona folderu, która zmienia kolor przy hoverze */}
					<div>
						<FolderIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
					</div>
					<span className='text-sm font-medium text-gray-800'>{category.category}</span>
				</div>
				<div className='flex items-center gap-2'>
					<span className='text-xs text-gray-500'>{category.files.length} plików</span>
					<ChevronDownIcon
						className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
					/>
				</div>
			</button>

			{/* Rozwijana zawartość - lekko wcięta lub z innym tłem */}
			{isOpen && (
				<div className='bg-gray-50 border-t border-gray-100'>
					<ul className='divide-y divide-gray-100'>
						{category.files.map(file => (
							<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3 pl-12'>
								<div className='flex items-center gap-3 min-w-0'>
									<DocumentTextIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
									<span className='text-sm font-medium text-gray-700 truncate'>{file.fileName}</span>
								</div>
								<a
									href={file.downloadUrl}
									download
									className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-md transition-colors'>
									<ArrowDownTrayIcon className='h-4 w-4' />
									Pobierz
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}

export default function MemberDashboard() {
	const { data: session } = useSession()
	const [files, setFiles] = useState({
		generalFiles: [],
		adminUploadedFiles: [],
		generatedAcceptanceDocs: [],
	})
	const [isLoading, setIsLoading] = useState(true)
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

	useEffect(() => {
		const fetchFiles = async () => {
			setIsLoading(true)
			try {
				const response = await fetch('/api/member/files')
				if (!response.ok) {
					throw new Error('Nie udało się pobrać plików.')
				}
				const data = await response.json()
				setFiles({
					generalFiles: data.generalFiles || [],
					adminUploadedFiles: data.adminUploadedFiles || [],
					generatedAcceptanceDocs: data.generatedAcceptanceDocs || [],
				})
			} catch (error) {
				console.error(error)
			} finally {
				setIsLoading(false)
			}
		}
		fetchFiles()
	}, [])

	const { dynamicGeneralFiles, staticMembershipDocs } = useMemo(() => {
		const dynamicGeneralFiles = files.generalFiles.find(c => c.category === 'Pliki Ogólne')?.files || []
		const staticDocs = files.generalFiles.find(c => c.category === 'Dokumenty członkowskie (statuty, regulaminy)')
		return { dynamicGeneralFiles, staticMembershipDocs: staticDocs }
	}, [files.generalFiles])

	const generatedDocsCategory = useMemo(
		() => ({
			category: 'Dokumenty przyjęcia członka',
			files: files.generatedAcceptanceDocs,
		}),
		[files.generatedAcceptanceDocs]
	)

	return (
		<div className='min-h-screen bg-gray-100'>
			<div className='max-w-7xl mx-auto p-4 sm:p-6 lg:p-8'>
				<header className='flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4'>
					<div>
						<h1 className='text-3xl font-bold text-gray-900 tracking-tight'>Panel Członka PISiL</h1>
						<p className='text-gray-600 mt-1'>Witaj w strefie dla członków.</p>
					</div>
					<div className='flex flex-wrap items-center gap-4'>
						{session?.user && (
							<span className='text-sm text-gray-700 hidden sm:block'>
								Zalogowano jako: <strong>{session.user.name || session.user.email}</strong>
							</span>
						)}
						<button
							onClick={() => setIsPasswordModalOpen(true)}
							className='inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors shadow-sm'>
							<KeyIcon className='h-4 w-4' />
							<span>Zmień hasło</span>
						</button>
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
							<section className='mb-8'>
								<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
									<UserCircleIcon className='h-6 w-6 text-gray-500' />
									<h2 className='text-lg font-semibold text-gray-800'>Pliki Indywidualne</h2>
								</div>

								<div className='bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden'>
									<div className='divide-y divide-gray-200'>
										{/* 7. Płaska lista plików wgranych przez admina */}
										{files.adminUploadedFiles.length > 0 ? (
											<>
												{files.adminUploadedFiles.map(file => (
													<div
														key={file.id}
														className='flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors'>
														<div className='flex items-center gap-3 min-w-0'>
															<DocumentTextIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
															<span className='text-sm font-medium text-gray-800 truncate'>{file.fileName}</span>
														</div>
														<a
															href={file.downloadUrl}
															download
															className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors'>
															<ArrowDownTrayIcon className='h-4 w-4' />
															Pobierz
														</a>
													</div>
												))}
											</>
										) : (
											<div className='p-8 text-center text-gray-500 text-sm'>
												Brak plików wgranych przez administratora.
											</div>
										)}

										{/* 8. Rozwijana lista plików wygenerowanych */}
										{files.generatedAcceptanceDocs.length > 0 && (
											<CollapsibleFileCategory category={generatedDocsCategory} />
										)}
									</div>
								</div>
							</section>

							<section>
								{/* Główny nagłówek sekcji */}
								<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
									<FolderIcon className='h-6 w-6 text-gray-500' />
									<h2 className='text-lg font-semibold text-gray-800'>Pliki Ogólne</h2>
								</div>

								{/* Kontener dla zawartości sekcji */}
								<div className='bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden'>
									<div className='divide-y divide-gray-200'>
										{/* 5. Płaska lista plików dynamicznych (jeśli istnieją) */}
										{dynamicGeneralFiles.length > 0 ? (
											<>
												{dynamicGeneralFiles.map(file => (
													<div
														key={file.id}
														className='flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50 transition-colors'>
														<div className='flex items-center gap-3 min-w-0'>
															<DocumentTextIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
															<span className='text-sm font-medium text-gray-800 truncate'>{file.fileName}</span>
														</div>
														<a
															href={file.downloadUrl}
															download
															className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors'>
															<ArrowDownTrayIcon className='h-4 w-4' />
															Pobierz
														</a>
													</div>
												))}
											</>
										) : (
											<div className='p-8 text-center text-gray-500 text-sm'>Brak plików ogólnych.</div>
										)}

										{/* 6. Rozwijana lista plików statycznych */}
										{staticMembershipDocs && <CollapsibleFileCategory category={staticMembershipDocs} />}
									</div>
								</div>
							</section>
						</>
					)}
				</main>
				<ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
			</div>
		</div>
	)
}

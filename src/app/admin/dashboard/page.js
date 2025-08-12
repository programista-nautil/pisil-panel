'use client'

import { Fragment, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'

// Komponent do renderowania etykiety statusu z odpowiednim kolorem
// const StatusBadge = ({ status }) => {
// 	const statusStyles = {
// 		PENDING: 'bg-yellow-100 text-yellow-800',
// 		APPROVED: 'bg-green-100 text-green-800',
// 		REJECTED: 'bg-red-100 text-red-800',
// 	}

// 	const statusText = {
// 		PENDING: 'Oczekujący',
// 		APPROVED: 'Zatwierdzony',
// 		REJECTED: 'Odrzucony',
// 	}

// 	return (
// 		<span
// 			className={`px-3 py-1 text-xs font-medium rounded-full ${statusStyles[status] || 'bg-gray-100 text-gray-800'}`}>
// 			{statusText[status] || status}
// 		</span>
// 	)
// }

export default function AdminDashboard() {
	const [submissions, setSubmissions] = useState([])
	const [expanded, setExpanded] = useState({}) // id -> bool
	const [isLoading, setIsLoading] = useState(true)
	const [deletingAttachmentId, setDeletingAttachmentId] = useState(null)
	const [attachmentModal, setAttachmentModal] = useState({
		open: false,
		submissionId: null,
		attachmentId: null,
		fileName: '',
	})
	const { data: session } = useSession()

	const [isModalOpen, setIsModalOpen] = useState(false)
	const [submissionToDelete, setSubmissionToDelete] = useState(null)

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

	const handleVerificationChange = async (submissionId, currentStatus) => {
		const newStatus = !currentStatus

		// Optymistyczna aktualizacja UI - natychmiast pokazujemy zmianę
		setSubmissions(current => current.map(sub => (sub.id === submissionId ? { ...sub, isVerified: newStatus } : sub)))

		try {
			const response = await fetch(`/api/admin/submissions/${submissionId}/verify`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isVerified: newStatus }),
			})

			if (!response.ok) {
				throw new Error('Aktualizacja statusu nie powiodła się.')
			}
		} catch (error) {
			console.error(error)
			// Wycofaj zmianę w UI w przypadku błędu
			setSubmissions(current =>
				current.map(sub => (sub.id === submissionId ? { ...sub, isVerified: currentStatus } : sub))
			)
			alert('Nie udało się zaktualizować statusu weryfikacji.')
		}
	}

	const openDeleteModal = submission => {
		setSubmissionToDelete(submission)
		setIsModalOpen(true)
	}

	const closeDeleteModal = () => {
		setSubmissionToDelete(null)
		setIsModalOpen(false)
	}

	const handleDeleteSubmission = async () => {
		if (!submissionToDelete) return

		try {
			const response = await fetch(`/api/admin/submissions/${submissionToDelete.id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new Error('Nie udało się usunąć zgłoszenia.')
			}

			setSubmissions(currentSubmissions => currentSubmissions.filter(sub => sub.id !== submissionToDelete.id))
			closeDeleteModal()
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas usuwania.')
			// Nie zamykamy modala w przypadku błędu, żeby użytkownik mógł spróbować ponownie
		}
	}

	const toggleExpanded = id => {
		setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
	}

	const refreshSingleSubmission = async submissionId => {
		try {
			const res = await fetch('/api/admin/submissions')
			if (!res.ok) return
			const data = await res.json()
			setSubmissions(data)
		} catch (e) {
			console.error(e)
		}
	}

	const handleDownloadAttachment = (submissionId, attId) => {
		// Po prostu nawigacja do endpointu (przeglądarka pobierze plik)
		window.location.href = `/api/admin/submissions/${submissionId}/attachments/${attId}/download`
	}

	const openAttachmentDeleteModal = (submissionId, attId, fileName) => {
		setAttachmentModal({ open: true, submissionId, attachmentId: attId, fileName })
	}

	const closeAttachmentDeleteModal = () => {
		setAttachmentModal({ open: false, submissionId: null, attachmentId: null, fileName: '' })
	}

	const confirmDeleteAttachment = async () => {
		const { submissionId, attachmentId } = attachmentModal
		if (!submissionId || !attachmentId) return
		setDeletingAttachmentId(attachmentId)
		try {
			const res = await fetch(`/api/admin/submissions/${submissionId}/attachments/${attachmentId}`, {
				method: 'DELETE',
			})
			if (!res.ok) {
				console.error('Usuwanie załącznika nie powiodło się')
				return
			}
			await refreshSingleSubmission(submissionId)
			closeAttachmentDeleteModal()
		} catch (e) {
			console.error(e)
		} finally {
			setDeletingAttachmentId(null)
		}
	}

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
									<th className='w-8 px-2 py-4' aria-label='Rozwiń' />
									<th scope='col' className='px-6 py-4 font-semibold'>
										Zweryfikowany
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Typ formularza
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Nazwa Firmy
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Email Kontaktowy
									</th>
									<th scope='col' className='px-6 py-4 font-semibold'>
										Data Złożenia
									</th>
									<th scope='col' className='px-6 py-4 font-semibold text-right'>
										Akcje
									</th>
								</tr>
							</thead>
							<tbody>
								{submissions.map(submission => {
									const isOpen = expanded[submission.id]
									return (
										<Fragment key={submission.id}>
											<tr className='bg-white border-t hover:bg-gray-50'>
												<td className='px-2 py-4 text-center align-top'>
													<button
														onClick={() => toggleExpanded(submission.id)}
														className='p-1 rounded hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500'
														aria-label={isOpen ? 'Zwiń' : 'Rozwiń'}>
														<svg
															className={`h-5 w-5 transform transition-transform ${isOpen ? 'rotate-90' : ''}`}
															fill='none'
															stroke='currentColor'
															strokeWidth={2}
															viewBox='0 0 24 24'>
															<path strokeLinecap='round' strokeLinejoin='round' d='M9 5l7 7-7 7' />
														</svg>
													</button>
												</td>
												<td className='px-6 py-4 text-center'>
													<input
														type='checkbox'
														checked={submission.isVerified}
														onChange={() => handleVerificationChange(submission.id, submission.isVerified)}
														className='h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer'
													/>
												</td>
												<td className='px-6 py-4 whitespace-nowrap'>
													{submission.formType === 'DEKLARACJA_CZLONKOWSKA'
														? 'Deklaracja członkowska'
														: submission.formType === 'PATRONAT'
														? 'Patronat'
														: submission.formType || '—'}
												</td>
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
												<td className='px-6 py-4 text-right'>
													<div className='flex items-center justify-end gap-2'>
														<Link
															href={`/api/admin/submissions/${submission.id}/download`}
															className='p-2 text-blue-600 hover:bg-blue-100 rounded-md transition-colors'
															title='Pobierz PDF'>
															<svg
																xmlns='http://www.w3.org/2000/svg'
																className='h-5 w-5'
																viewBox='0 0 20 20'
																fill='currentColor'>
																<path
																	fillRule='evenodd'
																	d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
																	clipRule='evenodd'
																/>
															</svg>
														</Link>
														<button
															onClick={() => openDeleteModal(submission)}
															className='p-2 text-red-600 hover:bg-red-100 rounded-md transition-colors'
															title='Usuń zgłoszenie'>
															<svg
																xmlns='http://www.w3.org/2000/svg'
																className='h-5 w-5'
																viewBox='0 0 20 20'
																fill='currentColor'>
																<path
																	fillRule='evenodd'
																	d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
																	clipRule='evenodd'
																/>
															</svg>
														</button>
													</div>
												</td>
											</tr>
											{isOpen && (
												<tr className='bg-gray-50 border-t'>
													<td colSpan='7' className='px-10 py-5'>
														<div className='bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-inner'>
															<div className='flex items-center justify-between mb-4'>
																<h4 className='text-sm font-semibold text-gray-800 tracking-wide flex items-center gap-2'>
																	<svg
																		className='h-4 w-4 text-blue-600'
																		fill='none'
																		stroke='currentColor'
																		strokeWidth='2'
																		viewBox='0 0 24 24'>
																		<path strokeLinecap='round' strokeLinejoin='round' d='M12 16l4-5m-4 5l-4-5m4 5V4' />
																		<path
																			strokeLinecap='round'
																			strokeLinejoin='round'
																			d='M20 16v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2'
																		/>
																	</svg>
																	<span>Dodatkowe pliki</span>
																	{submission.attachments?.length ? (
																		<span className='ml-2 inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700'>
																			{submission.attachments.length}
																		</span>
																	) : null}
																</h4>
															</div>

															{submission.attachments?.length ? (
																<ul className='divide-y divide-gray-200 rounded-md border border-gray-200 bg-white shadow-sm'>
																	{submission.attachments.map(att => (
																		<li
																			key={att.id}
																			className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 group'>
																			<div className='flex items-start sm:items-center gap-3 min-w-0'>
																				<div className='mt-0.5 flex-shrink-0 rounded-md bg-blue-50 p-1.5 text-blue-600 border border-blue-100'>
																					<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
																						<path d='M4 2a2 2 0 00-2 2v1a1 1 0 001 1v8a2 2 0 002 2h2.1a1 1 0 01.948.684l.3.9a1 1 0 00.948.684h1.508a1 1 0 00.948-.684l.3-.9A1 1 0 0114.9 16H17a2 2 0 002-2V5a1 1 0 001-1V4a2 2 0 00-2-2H4z' />
																					</svg>
																				</div>
																				<div className='min-w-0'>
																					<p className='text-sm font-medium text-gray-800 truncate'>{att.fileName}</p>
																					<p className='text-xs text-gray-500'>
																						{/* Można dodać rozmiar / typ pliku później */}
																						Plik dodatkowy
																					</p>
																				</div>
																			</div>
																			<div className='flex items-center gap-2 self-end sm:self-auto'>
																				<button
																					type='button'
																					onClick={() => handleDownloadAttachment(submission.id, att.id)}
																					className='inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500'>
																					<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
																						<path
																							fillRule='evenodd'
																							d='M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z'
																							clipRule='evenodd'
																						/>
																					</svg>
																					<span>Pobierz</span>
																				</button>
																				<button
																					type='button'
																					onClick={() => openAttachmentDeleteModal(submission.id, att.id, att.fileName)}
																					disabled={deletingAttachmentId === att.id}
																					className='inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 hover:border-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-60 disabled:cursor-not-allowed'>
																					{deletingAttachmentId === att.id ? (
																						<svg className='h-4 w-4 animate-spin' viewBox='0 0 24 24' fill='none'>
																							<circle
																								className='opacity-25'
																								cx='12'
																								cy='12'
																								r='10'
																								stroke='currentColor'
																								strokeWidth='4'></circle>
																							<path
																								className='opacity-75'
																								fill='currentColor'
																								d='M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z'></path>
																						</svg>
																					) : (
																						<svg className='h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
																							<path
																								fillRule='evenodd'
																								d='M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z'
																								clipRule='evenodd'
																							/>
																						</svg>
																					)}
																					<span>{deletingAttachmentId === att.id ? 'Usuwanie...' : 'Usuń'}</span>
																				</button>
																			</div>
																		</li>
																	))}
																</ul>
															) : (
																<p className='text-sm text-gray-500 italic'>Brak dodatkowych plików.</p>
															)}
															{/* Stopka sekcji można wykorzystać później */}
														</div>
													</td>
												</tr>
											)}
										</Fragment>
									)
								})}
							</tbody>
						</table>
					</div>
				</main>
			</div>
			<DeleteConfirmationModal
				isOpen={isModalOpen}
				onClose={closeDeleteModal}
				onConfirm={handleDeleteSubmission}
				itemName={submissionToDelete?.companyName}
			/>
			<DeleteConfirmationModal
				isOpen={attachmentModal.open}
				onClose={closeAttachmentDeleteModal}
				onConfirm={confirmDeleteAttachment}
				itemName={attachmentModal.fileName}
				context='attachment'
			/>
		</div>
	)
}

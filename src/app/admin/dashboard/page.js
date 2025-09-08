'use client'

import { Fragment, useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Menu, Transition } from '@headlessui/react'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'
import ConfirmationModal from '@/components/ConfirmationModal'

const StatusDropdown = ({ submission, onStatusChange }) => {
	const statuses = {
		PENDING: { text: 'W trakcie', style: 'bg-yellow-100 text-yellow-800' },
		APPROVED: { text: 'Zweryfikowany', style: 'bg-green-100 text-green-800' },
		REJECTED: { text: 'Odrzucony', style: 'bg-red-100 text-red-800' },
	}

	const currentStatus = statuses[submission.status] || { text: 'Nieznany', style: 'bg-gray-100 text-gray-800' }

	return (
		<Menu as='div' className='relative inline-block text-left'>
			<div>
				<Menu.Button
					className={`inline-flex items-center justify-center w-full rounded-full px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 ${currentStatus.style}`}>
					{currentStatus.text}
					<svg className='-mr-1 ml-1 h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
						<path
							fillRule='evenodd'
							d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
							clipRule='evenodd'
						/>
					</svg>
				</Menu.Button>
			</div>
			<Transition
				as={Fragment}
				enter='transition ease-out duration-100'
				enterFrom='transform opacity-0 scale-95'
				enterTo='transform opacity-100 scale-100'
				leave='transition ease-in duration-75'
				leaveFrom='transform opacity-100 scale-100'
				leaveTo='transform opacity-0 scale-95'>
				<Menu.Items className='absolute right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10'>
					<div className='px-1 py-1'>
						{Object.entries(statuses).map(([statusKey, { text }]) => (
							<Menu.Item key={statusKey}>
								{({ active }) => (
									<button
										onClick={() => onStatusChange(submission, statusKey)}
										className={`${
											active ? 'bg-blue-500 text-white' : 'text-gray-900'
										} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
										{text}
									</button>
								)}
							</Menu.Item>
						))}
					</div>
				</Menu.Items>
			</Transition>
		</Menu>
	)
}

const AttachmentInput = ({ file, onFileChange }) => (
	<div className='mt-4'>
		<label htmlFor='attachment-upload' className='block text-sm font-medium text-gray-700 text-left mb-2'>
			Wymagany załącznik <span className='text-red-500'>*</span>
		</label>
		<div className='flex items-center justify-center w-full'>
			<label
				htmlFor='attachment-upload'
				className='flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100'>
				<div className='flex flex-col items-center justify-center pt-5 pb-6'>
					<svg
						className='w-8 h-8 mb-4 text-gray-500'
						aria-hidden='true'
						xmlns='http://www.w3.org/2000/svg'
						fill='none'
						viewBox='0 0 20 16'>
						<path
							stroke='currentColor'
							strokeLinecap='round'
							strokeLinejoin='round'
							strokeWidth='2'
							d='M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2'
						/>
					</svg>
					{file ? (
						<p className='text-sm text-green-600 font-semibold'>{file.name}</p>
					) : (
						<>
							<p className='mb-2 text-sm text-gray-500'>
								<span className='font-semibold'>Kliknij, aby wybrać</span> lub przeciągnij
							</p>
							<p className='text-xs text-gray-500'>PDF, DOCX, PNG, JPG etc.</p>
						</>
					)}
				</div>
				<input id='attachment-upload' type='file' className='hidden' onChange={onFileChange} />
			</label>
		</div>
	</div>
)

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

	const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
	const [submissionToVerify, setSubmissionToVerify] = useState(null)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')
	const [verificationAttachment, setVerificationAttachment] = useState(null)

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

	const handleStatusChange = async (submission, newStatus) => {
		if (submission.status === newStatus) return

		if (submission.formType === 'DEKLARACJA_CZLONKOWSKA' && newStatus === 'APPROVED') {
			setSubmissionToVerify({ ...submission, status: newStatus })
			setIsVerificationModalOpen(true)
		} else {
			updateStatus(submission.id, newStatus)
		}
	}

	const updateStatus = async (submissionId, newStatus) => {
		const originalSubmissions = submissions
		setSubmissions(current => current.map(sub => (sub.id === submissionId ? { ...sub, status: newStatus } : sub)))

		try {
			const response = await fetch(`/api/admin/submissions/${submissionId}/status`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: newStatus }),
			})
			if (!response.ok) throw new Error('Aktualizacja statusu nie powiodła się.')
		} catch (error) {
			console.error(error)
			setSubmissions(originalSubmissions)
			alert('Nie udało się zaktualizować statusu.')
		}
	}

	const confirmAndSendVerificationEmail = async () => {
		if (!submissionToVerify || !verificationAttachment) {
			alert('Proszę załączyć plik.')
			return
		}
		setIsSubmitting(true)

		const formData = new FormData()
		formData.append('attachment', verificationAttachment)

		try {
			// 1. Zaktualizuj status w bazie
			await updateStatus(submissionToVerify.id, submissionToVerify.status)

			// 2. Wyślij e-mail
			const response = await fetch(`/api/admin/submissions/${submissionToVerify.id}/send-verification-email`, {
				method: 'POST',
				body: formData,
			})
			if (!response.ok) throw new Error('Nie udało się wysłać e-maila.')

			// 3. Ustaw komunikat o sukcesie
			setSuccessMessage('Powiadomienie e-mail z załącznikiem zostało wysłane pomyślnie!')
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas wysyłania e-maila.')
			closeVerificationModal() // Zamknij modal w razie błędu
		} finally {
			setIsSubmitting(false)
		}
	}

	const closeVerificationModal = () => {
		setIsVerificationModalOpen(false)
		setSubmissionToVerify(null)
		setSuccessMessage('')
		setVerificationAttachment(null)
		setIsSubmitting(false)
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
										Status
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
												<td className='px-6 py-4'>
													<StatusDropdown submission={submission} onStatusChange={handleStatusChange} />
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
			<ConfirmationModal
				isOpen={isVerificationModalOpen}
				onClose={closeVerificationModal}
				onConfirm={confirmAndSendVerificationEmail}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź wysłanie e-maila'}
				message={`Czy na pewno chcesz oznaczyć to zgłoszenie jako zweryfikowane i wysłać powiadomienie na adres: ${submissionToVerify?.email}?`}
				confirmButtonText='Oznacz i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}>
				<AttachmentInput
					file={verificationAttachment}
					onFileChange={e => setVerificationAttachment(e.target.files[0])}
				/>
			</ConfirmationModal>
		</div>
	)
}

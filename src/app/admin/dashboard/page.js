'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession, signOut } from 'next-auth/react'
import SubmissionsTable from './components/SubmissionsTable'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'
import { useNotificationModals } from './hooks/useNotificationModals'
import AddSubmissionModal from './components/AddSubmissionModal'
import NotificationModals from './components/NotificationModals'
import { DocumentDuplicateIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline'

export default function AdminDashboard() {
	const [submissions, setSubmissions] = useState([])
	const [expanded, setExpanded] = useState({}) // id -> bool
	const [isLoading, setIsLoading] = useState(true)
	const [activeTab, setActiveTab] = useState('declarations')

	const { handleStatusChange, modalStates } = useNotificationModals(submissions, setSubmissions)

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

	const [isAddModalOpen, setIsAddModalOpen] = useState(false)

	const [uploadingMemberFile, setUploadingMemberFile] = useState(null)

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

	const { declarations, activeSurveys, archivedSurveys } = useMemo(() => {
		const declarations = submissions.filter(s => ['DEKLARACJA_CZLONKOWSKA', 'PATRONAT'].includes(s.formType))
		const surveys = submissions.filter(s => ['ANKIETA_SPEDYTOR_ROKU', 'MLODY_SPEDYTOR_ROKU'].includes(s.formType))
		const activeSurveys = surveys.filter(s => !s.isArchived)
		const archivedSurveys = surveys.filter(s => s.isArchived)
		return { declarations, activeSurveys, archivedSurveys }
	}, [submissions])

	const activeSubmissionsCount = useMemo(() => {
		return submissions.filter(submission => !submission.isArchived).length
	}, [submissions])

	const handleArchiveToggle = async (submission, isArchived) => {
		const originalSubmissions = submissions
		setSubmissions(current => current.map(sub => (sub.id === submission.id ? { ...sub, isArchived } : sub)))

		try {
			const response = await fetch(`/api/admin/submissions/${submission.id}/archive`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isArchived }),
			})
			if (!response.ok) throw new Error('Zmiana statusu archiwum nie powiodła się.')
		} catch (error) {
			console.error(error)
			setSubmissions(originalSubmissions)
			alert('Wystąpił błąd podczas archiwizacji.')
		}
	}

	const handleAddSubmission = async (data, mainPdf, additionalFiles) => {
		const formData = new FormData()
		formData.append('formType', data.formType)
		formData.append('companyName', data.companyName)
		formData.append('email', data.email)
		formData.append('mainPdf', mainPdf)
		if (data.ceoName) {
			formData.append('ceoName', data.ceoName)
		}
		if (data.address) {
			formData.append('address', data.address)
		}
		additionalFiles.forEach(file => {
			formData.append('additionalFiles[]', file)
		})

		try {
			const response = await fetch('/api/admin/submissions', {
				method: 'POST',
				body: formData,
			})

			if (!response.ok) {
				throw new Error('Nie udało się dodać zgłoszenia.')
			}

			const newSubmission = await response.json()
			setSubmissions(prev => [newSubmission, ...prev])
			setIsAddModalOpen(false)
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas dodawania zgłoszenia.')
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

	const handleMemberFileUpload = async (submissionId, files) => {
		if (!files || files.length === 0) return
		setUploadingMemberFile(submissionId)

		const formData = new FormData()
		files.forEach(file => formData.append('files[]', file))

		try {
			const response = await fetch(`/api/admin/submissions/${submissionId}/upload-member-file`, {
				method: 'POST',
				body: formData,
			})
			if (!response.ok) throw new Error('Nie udało się wgrać plików.')

			const newAttachments = await response.json()

			// Odświeżamy stan zgłoszeń, dodając nowe załączniki
			setSubmissions(currentSubmissions =>
				currentSubmissions.map(sub => {
					if (sub.id === submissionId) {
						return {
							...sub,
							attachments: [...sub.attachments, ...newAttachments],
						}
					}
					return sub
				})
			)
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas wgrywania plików.')
		} finally {
			setUploadingMemberFile(null)
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
				<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8'>
					<div className='bg-white p-6 rounded-lg shadow'>
						<h3 className='text-sm font-medium text-gray-500'>Wszystkie zgłoszenia</h3>
						<p className='mt-2 text-3xl font-bold text-gray-900'>{activeSubmissionsCount}</p>
					</div>
					<div className='flex items-center justify-center md:col-start-4'>
						<button
							onClick={() => setIsAddModalOpen(true)}
							className='w-full h-half inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition-colors'>
							<svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor'>
								<path d='M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z' />
							</svg>
							<span>Dodaj zgłoszenie</span>
						</button>
					</div>
				</div>

				<div className='mb-6 border-b border-gray-200'>
					<nav className='-mb-px flex space-x-6' aria-label='Tabs'>
						<button
							onClick={() => setActiveTab('declarations')}
							className={`${
								activeTab === 'declarations'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
							Deklaracje i Wnioski ({declarations.length})
						</button>
						<button
							onClick={() => setActiveTab('surveys')}
							className={`${
								activeTab === 'surveys'
									? 'border-blue-500 text-blue-600'
									: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
							} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
							Ankiety ({activeSurveys.length})
						</button>
					</nav>
				</div>

				<main className='bg-white rounded-lg shadow'>
					{isLoading ? (
						<p className='p-6 text-center text-gray-500'>Ładowanie zgłoszeń...</p>
					) : (
						<div>
							{activeTab === 'declarations' && (
								<SubmissionsTable
									submissions={declarations}
									expanded={expanded}
									toggleExpanded={toggleExpanded}
									handleStatusChange={handleStatusChange}
									handleDownloadAttachment={handleDownloadAttachment}
									openAttachmentDeleteModal={openAttachmentDeleteModal}
									deletingAttachmentId={deletingAttachmentId}
									openDeleteModal={openDeleteModal}
									onArchiveToggle={null}
									onMemberFileUpload={handleMemberFileUpload}
									uploadingMemberFileId={uploadingMemberFile}
								/>
							)}
							{activeTab === 'surveys' && (
								<div className='space-y-8'>
									<section>
										<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
											<DocumentDuplicateIcon className='h-6 w-6 text-gray-500' />
											<h2 className='text-lg font-semibold text-gray-800'>Aktywne ankiety</h2>
										</div>
										<div className='bg-white rounded-lg shadow'>
											<SubmissionsTable
												submissions={activeSurveys}
												onArchiveToggle={handleArchiveToggle}
												expanded={expanded}
												toggleExpanded={toggleExpanded}
												handleStatusChange={handleStatusChange}
												handleDownloadAttachment={handleDownloadAttachment}
												openAttachmentDeleteModal={openAttachmentDeleteModal}
												deletingAttachmentId={deletingAttachmentId}
												openDeleteModal={openDeleteModal}
											/>
										</div>
									</section>
									<section>
										<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
											<ArchiveBoxIcon className='h-6 w-6 text-gray-500' />
											<h2 className='text-lg font-semibold text-gray-800'>Archiwum ankiet</h2>
										</div>
										<div className='bg-white rounded-lg shadow'>
											<SubmissionsTable
												submissions={archivedSurveys}
												onArchiveToggle={handleArchiveToggle}
												expanded={expanded}
												toggleExpanded={toggleExpanded}
												handleStatusChange={handleStatusChange}
												handleDownloadAttachment={handleDownloadAttachment}
												openAttachmentDeleteModal={openAttachmentDeleteModal}
												deletingAttachmentId={deletingAttachmentId}
												openDeleteModal={openDeleteModal}
											/>
										</div>
									</section>
								</div>
							)}
						</div>
					)}
				</main>
			</div>
			<AddSubmissionModal
				isOpen={isAddModalOpen}
				onClose={() => setIsAddModalOpen(false)}
				onFormSubmit={handleAddSubmission}
			/>
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
			<NotificationModals {...modalStates} />
		</div>
	)
}

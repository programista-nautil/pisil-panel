'use client'

import { useState } from 'react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { AttachmentInput, MultiAttachmentInput } from '../components/AttachmentInputs'

export function useNotificationModals(submissions, setSubmissions) {
	const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
	const [submissionToVerify, setSubmissionToVerify] = useState(null)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')
	const [verificationAttachment, setVerificationAttachment] = useState(null)

	const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false)
	const [submissionToAccept, setSubmissionToAccept] = useState(null)
	const [acceptanceAttachments, setAcceptanceAttachments] = useState([])

	const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false)
	const [submissionToReject, setSubmissionToReject] = useState(null)

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

	const handleStatusChange = async (submission, newStatus) => {
		if (submission.status === newStatus) return

		if (submission.formType === 'DEKLARACJA_CZLONKOWSKA' && newStatus === 'APPROVED') {
			setSubmissionToVerify({ ...submission, status: newStatus })
			setIsVerificationModalOpen(true)
		} else if (newStatus === 'ACCEPTED') {
			setSubmissionToAccept({ ...submission, status: newStatus })
			setIsAcceptanceModalOpen(true)
		} else if (newStatus === 'REJECTED') {
			setSubmissionToReject({ ...submission, status: newStatus })
			setIsRejectionModalOpen(true)
		} else {
			updateStatus(submission.id, newStatus)
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

	const onAcceptanceFilesChange = e => {
		setAcceptanceAttachments(prevFiles => [...prevFiles, ...Array.from(e.target.files)])
	}

	const onAcceptanceFileRemove = index => {
		setAcceptanceAttachments(prevFiles => prevFiles.filter((_, i) => i !== index))
	}

	const confirmAndSendAcceptanceEmail = async () => {
		if (!submissionToAccept || acceptanceAttachments.length === 0) {
			alert('Proszę dodać przynajmniej jeden załącznik.')
			return
		}
		setIsSubmitting(true)

		const formData = new FormData()
		acceptanceAttachments.forEach(file => formData.append('attachments[]', file))

		try {
			const response = await fetch(`/api/admin/submissions/${submissionToAccept.id}/accept`, {
				method: 'POST',
				body: formData,
			})
			if (!response.ok) throw new Error('Nie udało się wysłać e-maila akceptacyjnego.')

			// Odświeżamy dane po stronie klienta
			setSubmissions(current =>
				current.map(sub => (sub.id === submissionToAccept.id ? { ...sub, status: 'ACCEPTED' } : sub))
			)
			setSuccessMessage('Email akceptacyjny z załącznikami został wysłany!')
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas wysyłania e-maila.')
			closeAcceptanceModal()
		} finally {
			setIsSubmitting(false)
		}
	}

	const closeAcceptanceModal = () => {
		setIsAcceptanceModalOpen(false)
		setSubmissionToAccept(null)
		setSuccessMessage('')
		setAcceptanceAttachments([])
		setIsSubmitting(false)
	}

	const confirmAndSendRejectionEmail = async () => {
		if (!submissionToReject) return
		setIsSubmitting(true)

		try {
			// Wywołujemy nowe API, które jednocześnie zmienia status i wysyła maila
			const response = await fetch(`/api/admin/submissions/${submissionToReject.id}/reject`, {
				method: 'POST',
			})
			if (!response.ok) throw new Error('Nie udało się wysłać e-maila o odrzuceniu.')

			// Aktualizujemy UI
			setSubmissions(current =>
				current.map(sub => (sub.id === submissionToReject.id ? { ...sub, status: 'REJECTED' } : sub))
			)
			setSuccessMessage('Powiadomienie o odrzuceniu zostało wysłane pomyślnie!')
		} catch (error) {
			console.error(error)
			alert('Wystąpił błąd podczas wysyłania e-maila.')
			closeRejectionModal()
		} finally {
			setIsSubmitting(false)
		}
	}

	const closeRejectionModal = () => {
		setIsRejectionModalOpen(false)
		setSubmissionToReject(null)
		setSuccessMessage('')
		setIsSubmitting(false)
	}

	const Modals = () => (
		<>
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
					label={'Wymagany załącznik <span className="text-red-500">*</span>'}
				/>
			</ConfirmationModal>

			<ConfirmationModal
				isOpen={isAcceptanceModalOpen}
				onClose={closeAcceptanceModal}
				onConfirm={confirmAndSendAcceptanceEmail}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź przyjęcie członka'}
				message={`Spowoduje to zmianę statusu na "Przyjęty" i wysłanie powiadomienia e-mail z załącznikami na adres: ${submissionToAccept?.email}.`}
				confirmButtonText='Przyjmij i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}>
				<MultiAttachmentInput
					files={acceptanceAttachments}
					onFilesChange={onAcceptanceFilesChange}
					onFileRemove={onAcceptanceFileRemove}
				/>
			</ConfirmationModal>

			<ConfirmationModal
				isOpen={isRejectionModalOpen}
				onClose={closeRejectionModal}
				onConfirm={confirmAndSendRejectionEmail}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź odrzucenie zgłoszenia'}
				message={`Spowoduje to zmianę statusu na "Odrzucony" i wysłanie powiadomienia e-mail na adres: ${submissionToReject?.email}.`}
				confirmButtonText='Odrzuć i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}
			/>
		</>
	)

	return { handleStatusChange, Modals }
}

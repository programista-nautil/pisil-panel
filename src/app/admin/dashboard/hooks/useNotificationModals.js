'use client'

import { useState } from 'react'
import toast from 'react-hot-toast'

const DEFAULT_PATRONAGE_VERIFICATION_BODY = `Szanowni Państwo,

w odpowiedzi na wniosek niniejszym informujemy, że Polska Izba Spedycji i Logistyki z przyjemnością obejmie patronatem [NAZWA WYDARZENIA] w [MIEJSCE] w dniach [DATY].

W załączniku przekazujemy logo PISiL celem wykorzystania przy organizacji w/w imprezy.
Prosimy o przesłania bannera o wymiarach 150x200 i adresu strony, do której go „podlinkujemy” po umieszczeniu na naszej stronie internetowej oraz informacji o wydarzeniu, którą przekażemy naszym członkom.
W sprawach organizacyjnych dotyczących współpracy przy w/w przedsięwzięciu proszę kontaktować się z Czesławem Ciesielskim – tel. 58 620 19 50 lub kom.: 728445248, e-mail: c.ciesielski@pisil.pl.

Z poważaniem
Marek Tarczyński
Przewodniczący Rady
Polskiej Izby Spedycji i Logistyki`

const DEFAULT_PATRONAGE_ACCEPTANCE_BODY = `...`

export function useNotificationModals(submissions, setSubmissions) {
	const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false)
	const [submissionToVerify, setSubmissionToVerify] = useState(null)

	const [isSubmitting, setIsSubmitting] = useState(false)
	const [successMessage, setSuccessMessage] = useState('')

	const [isAcceptanceModalOpen, setIsAcceptanceModalOpen] = useState(false)
	const [submissionToAccept, setSubmissionToAccept] = useState(null)

	const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false)
	const [submissionToReject, setSubmissionToReject] = useState(null)

	const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split('T')[0])

	const [patronageVerificationBody, setPatronageVerificationBody] = useState(DEFAULT_PATRONAGE_VERIFICATION_BODY)
	const [patronageAcceptanceBody, setPatronageAcceptanceBody] = useState(DEFAULT_PATRONAGE_ACCEPTANCE_BODY)

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
			toast.error('Nie udało się zaktualizować statusu.')
		}
	}

	const handleStatusChange = async (submission, newStatus) => {
		if (submission.status === newStatus) return

		if (submission.formType === 'DEKLARACJA_CZLONKOWSKA') {
			if (newStatus === 'APPROVED') {
				setSubmissionToVerify({ ...submission, status: newStatus })
				setIsVerificationModalOpen(true)
			} else if (newStatus === 'ACCEPTED') {
				setSubmissionToAccept({ ...submission, status: newStatus })
				setAcceptanceDate(new Date().toISOString().split('T')[0])
				setIsAcceptanceModalOpen(true)
			} else if (newStatus === 'REJECTED') {
				setSubmissionToReject({ ...submission, status: newStatus })
				setIsRejectionModalOpen(true)
			} else {
				updateStatus(submission.id, newStatus)
			}
			return
		}

		if (submission.formType === 'PATRONAT') {
			if (newStatus === 'APPROVED') {
				setSubmissionToVerify({ ...submission, status: newStatus })
				setPatronageVerificationBody(DEFAULT_PATRONAGE_VERIFICATION_BODY)
				setIsVerificationModalOpen(true)
			} else if (newStatus === 'ACCEPTED') {
				setSubmissionToAccept({ ...submission, status: newStatus })
				setPatronageAcceptanceBody(DEFAULT_PATRONAGE_ACCEPTANCE_BODY)
				setIsAcceptanceModalOpen(true)
			} else if (newStatus === 'REJECTED') {
				setSubmissionToReject({ ...submission, status: newStatus })
				setIsRejectionModalOpen(true)
			} else {
				updateStatus(submission.id, newStatus)
			}
			return
		}

		updateStatus(submission.id, newStatus)
	}

	const confirmAndSendVerificationEmail = async () => {
		if (!submissionToVerify) return
		setIsSubmitting(true)

		try {
			// 1. Zaktualizuj status w bazie
			await updateStatus(submissionToVerify.id, submissionToVerify.status)

			// 2. Wyślij e-mail
			const response = await fetch(`/api/admin/submissions/${submissionToVerify.id}/send-verification-email`, {
				method: 'POST',
			})
			if (!response.ok) throw new Error('Nie udało się wysłać e-maila.')

			// 3. Ustaw komunikat o sukcesie
			setSuccessMessage('Powiadomienie e-mail zostało wysłane pomyślnie!')
		} catch (error) {
			console.error(error)
			toast.error('Wystąpił błąd podczas wysyłania e-maila.')
			closeVerificationModal() // Zamknij modal w razie błędu
		} finally {
			setIsSubmitting(false)
		}
	}

	const closeVerificationModal = () => {
		setIsVerificationModalOpen(false)
		setSubmissionToVerify(null)
		setSuccessMessage('')
		setIsSubmitting(false)
	}

	const onAcceptanceFilesChange = e => {
		setAcceptanceAttachments(prevFiles => [...prevFiles, ...Array.from(e.target.files)])
	}

	const onAcceptanceFileRemove = index => {
		setAcceptanceAttachments(prevFiles => prevFiles.filter((_, i) => i !== index))
	}

	const confirmAndSendAcceptanceEmail = async () => {
		if (!submissionToAccept) return
		setIsSubmitting(true)

		try {
			const response = await fetch(`/api/admin/submissions/${submissionToAccept.id}/accept`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ acceptanceDate }),
			})
			if (!response.ok) throw new Error('Nie udało się wysłać e-maila akceptacyjnego.')

			const updatedSubmission = await response.json()

			// Odświeżamy dane po stronie klienta
			setSubmissions(current => current.map(sub => (sub.id === updatedSubmission.id ? updatedSubmission : sub)))
			setSuccessMessage('Email akceptacyjny z załącznikami został wysłany!')
		} catch (error) {
			console.error(error)
			toast.error('Wystąpił błąd podczas wysyłania e-maila.')
			closeAcceptanceModal()
		} finally {
			setIsSubmitting(false)
		}
	}

	const closeAcceptanceModal = () => {
		setIsAcceptanceModalOpen(false)
		setSubmissionToAccept(null)
		setAcceptanceDate(new Date().toISOString().split('T')[0])
		setSuccessMessage('')
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
			toast.error('Wystąpił błąd podczas wysyłania e-maila.')
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

	const confirmAndSendPatronageVerification = async () => {
		if (!submissionToVerify) return
		setIsSubmitting(true)

		try {
			// Krok 1: Zaktualizuj status zgłoszenia na 'APPROVED'
			await updateStatus(submissionToVerify.id, 'APPROVED')

			// Krok 2: Wyślij e-mail z edytowalną treścią
			const response = await fetch(`/api/admin/submissions/${submissionToVerify.id}/send-patronage-verification`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emailBody: patronageVerificationBody }),
			})
			if (!response.ok) {
				throw new Error('Nie udało się wysłać e-maila weryfikacyjnego.')
			}

			setSuccessMessage('Powiadomienie e-mail zostało wysłane pomyślnie!')
		} catch (error) {
			console.error(error)
			toast.error('Wystąpił błąd podczas wysyłania e-maila.')
			// W razie błędu zamykamy modal, żeby uniknąć blokady
			closeVerificationModal()
		} finally {
			setIsSubmitting(false)
		}
	}

	const confirmAndSendPatronageAcceptance = async () => {
		if (!submissionToAccept) return
		setIsSubmitting(true)

		try {
			// Krok 1: Zaktualizuj status zgłoszenia na 'ACCEPTED'
			await updateStatus(submissionToAccept.id, 'ACCEPTED')

			// Krok 2: Wyślij e-mail z edytowalną treścią
			const response = await fetch(`/api/admin/submissions/${submissionToAccept.id}/send-patronage-acceptance`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ emailBody: patronageAcceptanceBody }),
			})

			if (!response.ok) {
				throw new Error('Nie udało się wysłać e-maila akceptacyjnego.')
			}

			setSuccessMessage('Email akceptacyjny został pomyślnie wysłany!')
		} catch (error) {
			console.error(error)
			toast.error('Wystąpił błąd podczas wysyłania e-maila.')
			// W razie błędu zamykamy modal
			closeAcceptanceModal()
		} finally {
			setIsSubmitting(false)
		}
	}

	return {
		handleStatusChange,
		modalStates: {
			isVerificationModalOpen,
			closeVerificationModal,
			submissionToVerify,
			confirmAndSendPatronageVerification,
			confirmAndSendVerificationEmail,
			isSubmitting,
			successMessage,
			patronageVerificationBody,
			setPatronageVerificationBody,
			isAcceptanceModalOpen,
			closeAcceptanceModal,
			submissionToAccept,
			confirmAndSendPatronageAcceptance,
			confirmAndSendAcceptanceEmail,
			acceptanceDate,
			setAcceptanceDate,
			patronageAcceptanceBody,
			setPatronageAcceptanceBody,
			isRejectionModalOpen,
			closeRejectionModal,
			submissionToReject,
			confirmAndSendRejectionEmail,
		},
	}
}

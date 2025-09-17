'use client'

import { useState } from 'react'

// Prosty, samodzielny komponent modala do wyświetlania statusu
const InfoModal = ({ title, message, onClose }) => (
	<div
		className='fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center'
		onClick={onClose}
		role='dialog'
		aria-modal='true'>
		<div
			className='bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full transform transition-all animate-fade-in-scale text-center'
			onClick={e => e.stopPropagation()}>
			<div className='mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4'>
				<svg
					className='h-6 w-6 text-green-600'
					xmlns='http://www.w3.org/2000/svg'
					fill='none'
					viewBox='0 0 24 24'
					stroke='currentColor'>
					<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
				</svg>
			</div>
			<h3 className='text-lg leading-6 font-medium text-gray-900'>{title}</h3>
			<div className='mt-2'>
				<p className='text-sm text-gray-500'>{message}</p>
			</div>
			<div className='mt-6'>
				<button
					type='button'
					onClick={onClose}
					className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:text-sm'>
					Zamknij
				</button>
			</div>
		</div>
	</div>
)

export default function SurveySubmitButton({ formData, formType, fieldLabels, onUploadSuccess, disabled }) {
	const [isSubmitting, setIsSubmitting] = useState(false)
	const [modalContent, setModalContent] = useState(null) // Stan dla modala

	const handleSubmit = async () => {
		setIsSubmitting(true)
		try {
			const response = await fetch('/api/submit-survey', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...formData, formType, fieldLabels }),
			})

			if (!response.ok) {
				const errorData = await response.json()
				throw new Error(errorData.message || 'Wystąpił błąd podczas wysyłania ankiety.')
			}

			// Pokaż modal sukcesu
			setModalContent({
				title: 'Ankieta wysłana pomyślnie!',
				message: `Dziękujemy za udział w ankiecie. Potwierdzenie zostało wysłane na adres e-mail: ${formData.email}`,
			})
		} catch (error) {
			console.error('Błąd wysyłania ankiety:', error)
			// Pokaż modal błędu
			setModalContent({
				title: 'Wystąpił błąd',
				message: error.message,
			})
		} finally {
			setIsSubmitting(false)
		}
	}

	const handleCloseModal = () => {
		setModalContent(null)
		if (onUploadSuccess) {
			onUploadSuccess() // Zresetuj formularz po zamknięciu modala
		}
	}

	return (
		<>
			{modalContent && (
				<InfoModal title={modalContent.title} message={modalContent.message} onClose={handleCloseModal} />
			)}
			<button
				onClick={handleSubmit}
				disabled={disabled || isSubmitting}
				className={`px-6 py-2 rounded-md font-medium ${
					disabled || isSubmitting
						? 'bg-gray-100 text-gray-400 cursor-not-allowed'
						: 'bg-green-600 text-white hover:bg-green-700'
				}`}>
				{isSubmitting ? 'Wysyłanie...' : 'Wyślij ankietę'}
			</button>
		</>
	)
}

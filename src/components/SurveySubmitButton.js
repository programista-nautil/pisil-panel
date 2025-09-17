'use client'

import { useState } from 'react'

export default function SurveySubmitButton({ formData, formType, fieldLabels, onUploadSuccess, disabled }) {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async () => {
		setIsSubmitting(true)
		try {
			const response = await fetch('/api/submit-survey', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ ...formData, formType, fieldLabels }),
			})

			if (!response.ok) {
				throw new Error('Wystąpił błąd podczas wysyłania ankiety.')
			}

			alert('Dziękujemy! Twoja ankieta została wysłana.')
			if (onUploadSuccess) {
				onUploadSuccess()
			}
		} catch (error) {
			console.error('Błąd wysyłania ankiety:', error)
			alert(error.message)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
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
	)
}

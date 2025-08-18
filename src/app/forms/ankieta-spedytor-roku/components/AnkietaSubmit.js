'use client'

import { useState } from 'react'

const AnkietaSubmit = ({ formData, onUploadSuccess, disabled }) => {
	const [isSubmitting, setIsSubmitting] = useState(false)

	const handleSubmit = async () => {
		setIsSubmitting(true)
		try {
			alert('Dane ankiety zostały wysłane (symulacja).\n\n' + JSON.stringify(formData, null, 2))

			if (onUploadSuccess) {
				onUploadSuccess() // Wywołujemy reset formularza
			}
		} catch (error) {
			console.error('Błąd wysyłania ankiety:', error)
			alert('Wystąpił błąd.')
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

export default AnkietaSubmit

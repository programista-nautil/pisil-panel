'use client'

import { useState } from 'react'
import { MultiAttachmentInput } from './AttachmentInputs'
import toast from 'react-hot-toast'

export default function AddAttachmentsModal({ isOpen, onClose, submission, onUploadSuccess }) {
	const [files, setFiles] = useState([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!isOpen || !submission) return null

	const handleFilesChange = e => {
		if (e.target.files) {
			setFiles(prev => [...prev, ...Array.from(e.target.files)])
		}
	}

	const handleFileRemove = index => {
		setFiles(prev => prev.filter((_, i) => i !== index))
	}

	const handleSubmit = async e => {
		e.preventDefault()
		if (files.length === 0) {
			toast.error('Wybierz przynajmniej jeden plik.')
			return
		}

		setIsSubmitting(true)
		const formData = new FormData()
		files.forEach(file => {
			formData.append('files[]', file)
		})

		try {
			const response = await fetch(`/api/admin/submissions/${submission.id}/attachments`, {
				method: 'POST',
				body: formData,
			})

			if (!response.ok) {
				throw new Error('Nie udało się dodać plików.')
			}

			const data = await response.json()
			toast.success('Pliki zostały dodane.')

			onUploadSuccess(submission.id, data.attachments) // Odśwież widok w rodzicu
			setFiles([]) // Wyczyść pliki
			onClose() // Zamknij modal
		} catch (error) {
			console.error(error)
			toast.error('Wystąpił błąd.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4' onClick={onClose}>
			<div
				className='bg-white rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-scale'
				onClick={e => e.stopPropagation()}>
				<h3 className='text-lg font-bold text-[#005698] mb-2'>Dodaj dodatkowe dokumenty</h3>
				<p className='text-sm text-gray-600 mb-4'>
					Dodajesz pliki do zgłoszenia firmy: <span className='font-semibold'>{submission.companyName}</span>
				</p>

				<form onSubmit={handleSubmit}>
					<MultiAttachmentInput files={files} onFilesChange={handleFilesChange} onFileRemove={handleFileRemove} />

					<div className='mt-6 flex justify-end gap-3'>
						<button
							type='button'
							onClick={onClose}
							className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'>
							Anuluj
						</button>
						<button
							type='submit'
							disabled={isSubmitting || files.length === 0}
							className='px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:opacity-50'>
							{isSubmitting ? 'Wysyłanie...' : 'Dodaj pliki'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

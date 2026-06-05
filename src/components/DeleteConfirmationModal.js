'use client'

import { useState, useEffect } from 'react'

export default function DeleteConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	itemName,
	context = 'submission',
	title,
	message,
	confirmButtonText,
	showNote = false,
	noteLabel = 'Notatka (opcjonalnie)',
	notePlaceholder = '',
}) {
	const [isDeleting, setIsDeleting] = useState(false)
	const [note, setNote] = useState('')

	// Wyczyść notatkę przy każdym otwarciu modala
	useEffect(() => {
		if (isOpen) setNote('')
	}, [isOpen])

	if (!isOpen) return null

	const handleConfirm = async () => {
		setIsDeleting(true)
		try {
			// Istniejący callerzy ignorują argument — pełna kompatybilność wsteczna
			await onConfirm(note.trim())
		} finally {
			setIsDeleting(false)
		}
	}

	const finalTitle = title || (context === 'attachment' ? 'Usuń plik' : 'Usuń')
	const finalButtonText = confirmButtonText || 'Usuń'

	const renderMessage = () => {
		if (message) {
			return <p className='text-sm text-gray-600'>{message}</p>
		}
		if (context === 'attachment') {
			return (
				<p className='text-sm text-gray-600'>
					Czy na pewno chcesz usunąć plik{' '}
					<span className='font-medium text-gray-800 break-all'>„{itemName}"</span>?{' '}
					Operacja jest nieodwracalna.
				</p>
			)
		}
		return (
			<p className='text-sm text-gray-600'>
				Czy na pewno chcesz usunąć{' '}
				<span className='font-medium text-gray-800'>„{itemName}"</span>?{' '}
				Tej operacji nie można cofnąć.
			</p>
		)
	}

	return (
		<div
			className='fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center p-4'
			onClick={onClose}
		>
			<div
				className='bg-white rounded-lg shadow-xl w-full max-w-md p-6'
				onClick={(e) => e.stopPropagation()}
			>
				<h3 className='text-lg font-bold text-gray-800 mb-3'>{finalTitle}</h3>
				<div className='mb-4'>{renderMessage()}</div>
				{showNote && (
					<div className='mb-6'>
						<label className='block text-sm font-medium text-gray-700 mb-1'>{noteLabel}</label>
						<textarea
							value={note}
							onChange={e => setNote(e.target.value)}
							disabled={isDeleting}
							rows={3}
							placeholder={notePlaceholder}
							className='block w-full rounded-md border border-gray-300 p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-700 disabled:opacity-50'
						/>
					</div>
				)}
				<div className='flex justify-end gap-3'>
					<button
						type='button'
						onClick={onClose}
						disabled={isDeleting}
						className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50'
					>
						Anuluj
					</button>
					<button
						type='button'
						onClick={handleConfirm}
						disabled={isDeleting}
						className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50'
					>
						{isDeleting ? 'Usuwam…' : finalButtonText}
					</button>
				</div>
			</div>
		</div>
	)
}

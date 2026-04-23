'use client'

import { useState } from 'react'

export default function DeleteConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	itemName,
	context = 'submission',
	title,
	message,
	confirmButtonText,
}) {
	const [isDeleting, setIsDeleting] = useState(false)

	if (!isOpen) return null

	const handleConfirm = async () => {
		setIsDeleting(true)
		try {
			await onConfirm()
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
				<div className='mb-6'>{renderMessage()}</div>
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

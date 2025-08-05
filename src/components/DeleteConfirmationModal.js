'use client'

import { useState } from 'react'

export default function DeleteConfirmationModal({ isOpen, onClose, onConfirm, itemName }) {
	const [isDeleting, setIsDeleting] = useState(false)

	if (!isOpen) {
		return null
	}

	const handleConfirm = async () => {
		setIsDeleting(true)
		try {
			await onConfirm()
		} finally {
			setIsDeleting(false)
		}
	}

	return (
		<div
			className='fixed inset-0 bg-black/50 z-50 flex justify-center items-center'
			aria-labelledby='modal-title'
			role='dialog'
			aria-modal='true'
			onClick={onClose}>
			<div
				className='bg-white rounded-lg shadow-xl p-6 m-4 max-w-sm w-full transform transition-all'
				onClick={e => e.stopPropagation()}>
				<div className='text-center'>
					<div className='mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100'>
						<svg
							className='h-6 w-6 text-red-600'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'
							stroke='currentColor'
							aria-hidden='true'>
							<path
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
							/>
						</svg>
					</div>
					<h3 className='text-lg leading-6 font-medium text-gray-900 mt-5' id='modal-title'>
						Potwierdzenie usunięcia
					</h3>
					<div className='mt-2'>
						<p className='text-sm text-gray-500'>
							Czy na pewno chcesz usunąć zgłoszenie dla: <br />
							<strong className='font-medium text-gray-700'>{itemName}</strong>?
							<br />
							Tej operacji nie można cofnąć.
						</p>
					</div>
				</div>
				<div className='mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense'>
					<button
						type='button'
						onClick={handleConfirm}
						disabled={isDeleting}
						className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none disabled:bg-red-400 disabled:cursor-not-allowed sm:col-start-2 sm:text-sm'>
						{isDeleting ? (
							<>
								<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
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
										d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
								</svg>
								Usuwanie...
							</>
						) : (
							'Usuń'
						)}
					</button>
					<button
						type='button'
						onClick={onClose}
						disabled={isDeleting}
						className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed sm:mt-0 sm:col-start-1 sm:text-sm'>
						Anuluj
					</button>
				</div>
			</div>
		</div>
	)
}

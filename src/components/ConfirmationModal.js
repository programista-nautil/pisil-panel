'use client'

export default function ConfirmationModal({
	isOpen,
	onClose,
	onConfirm,
	title,
	message,
	confirmButtonText = 'Potwierdź',
	cancelButtonText = 'Anuluj',
	isLoading = false,
	successMessage = null,
	isConfirmDisabled = false,
	children,
	maxWidth = 'max-w-md',
}) {
	if (!isOpen) {
		return null
	}

	return (
		<div
			className='fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center '
			role='dialog'
			aria-modal='true'>
			<div
				className={`bg-white rounded-lg shadow-xl p-6 m-4 ${maxWidth} w-full transform transition-all`}
				onClick={e => e.stopPropagation()}>
				{successMessage ? (
					<div className='text-center'>
						<div className='mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100'>
							<svg
								className='h-6 w-6 text-green-600'
								xmlns='http://www.w3.org/2000/svg'
								fill='none'
								viewBox='0 0 24 24'
								stroke='currentColor'>
								<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M5 13l4 4L19 7' />
							</svg>
						</div>
						<h3 className='text-lg leading-6 font-medium text-gray-900 mt-5'>{title}</h3>
						<p className='text-sm text-gray-500 mt-2'>{successMessage}</p>
						<div className='mt-5 sm:mt-6'>
							<button
								type='button'
								onClick={onClose}
								className='w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#005698] text-base font-medium text-white hover:bg-[#005698]/80 sm:text-sm'>
								Zamknij
							</button>
						</div>
					</div>
				) : (
					<div>
						<div className='flex items-start gap-4'>
							<div className='mx-auto flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-blue-100 sm:mx-0'>
								<svg
									className='h-6 w-6 text-[#005698]'
									xmlns='http://www.w3.org/2000/svg'
									fill='none'
									viewBox='0 0 24 24'
									stroke='currentColor'>
									<path
										strokeLinecap='round'
										strokeLinejoin='round'
										strokeWidth={2}
										d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
									/>
								</svg>
							</div>
							<div className='text-left flex-1'>
								<h3 className='text-lg leading-6 font-semibold text-gray-900'>{title}</h3>
								<div className='mt-2'>
									<p className='text-sm text-gray-600 whitespace-pre-line'>{message}</p>
								</div>
							</div>
						</div>

						{children && <div className='mt-4 border-t pt-4'>{children}</div>}

						<div className='mt-6 sm:flex sm:flex-row-reverse gap-3'>
							<button
								type='button'
								onClick={onConfirm}
								disabled={isLoading || isConfirmDisabled}
								className='w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-[#005698] text-base font-medium text-white hover:bg-[#005698]/80 disabled:bg-[#005698]/80 disabled:cursor-not-allowed sm:w-auto sm:text-sm'>
								{isLoading && (
									<svg
										className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
										xmlns='http://www.w3.org/2000/svg'
										fill='none'
										viewBox='0 0 24 24'>
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
											d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
									</svg>
								)}
								{isLoading ? 'Przetwarzanie...' : confirmButtonText}
							</button>
							<button
								type='button'
								onClick={onClose}
								disabled={isLoading}
								className='mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 disabled:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm'>
								{cancelButtonText}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	)
}

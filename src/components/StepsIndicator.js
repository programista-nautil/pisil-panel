'use client'

export default function StepsIndicator({ steps, current = 1 }) {
	// steps: string[]
	// current: 1-based index of current step
	return (
		<nav className='mt-8' aria-label='Postęp'>
			<ol className='flex items-center w-full'>
				{steps.map((label, idx) => {
					const stepNumber = idx + 1
					const status = stepNumber < current ? 'complete' : stepNumber === current ? 'current' : 'upcoming'
					return (
						<li key={label} className='flex-1 flex items-center'>
							{/* Circle + label */}
							<div className='flex items-center'>
								<div
									className={
										status === 'complete'
											? 'flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white'
											: status === 'current'
											? 'flex h-8 w-8 items-center justify-center rounded-full border-2 border-blue-600 text-blue-700'
											: 'flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 text-gray-500'
									}
									aria-current={status === 'current' ? 'step' : undefined}>
									{status === 'complete' ? (
										// check icon
										<svg className='h-5 w-5' viewBox='0 0 20 20' fill='currentColor' aria-hidden='true'>
											<path
												fillRule='evenodd'
												d='M16.707 5.293a1 1 0 010 1.414l-7.25 7.25a1 1 0 01-1.414 0l-3-3a1 1 0 011.414-1.414l2.293 2.293 6.543-6.543a1 1 0 011.414 0z'
												clipRule='evenodd'
											/>
										</svg>
									) : (
										<span className='text-sm font-semibold'>{stepNumber}</span>
									)}
								</div>
								<span
									className={`ml-3 text-sm ${status === 'current' ? 'font-semibold text-blue-700' : 'text-gray-700'}`}>
									{label}
								</span>
							</div>

							{/* Separator */}
							{idx !== steps.length - 1 && (
								<div className='flex-1 mx-4'>
									<div className={status === 'complete' ? 'h-0.5 bg-blue-600' : 'h-0.5 bg-gray-200'} />
								</div>
							)}
						</li>
					)
				})}
			</ol>
		</nav>
	)
}

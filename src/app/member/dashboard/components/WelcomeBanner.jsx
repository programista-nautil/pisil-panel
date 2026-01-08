'use client'

import { useState, useEffect } from 'react'
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function WelcomeBanner({ onOpenProfile }) {
	const [isVisible, setIsVisible] = useState(true)

	useEffect(() => {
		const timer = setTimeout(() => {
			setIsVisible(false)
		}, 120000)

		return () => clearTimeout(timer)
	}, [])

	if (!isVisible) return null

	return (
		<div className='bg-blue-50 border-l-4 border-[#005698] p-4 mb-8 rounded-r-lg shadow-sm relative animate-fade-in'>
			<div className='flex items-start'>
				<div className='flex-shrink-0'>
					<InformationCircleIcon className='h-6 w-6 text-[#005698]' aria-hidden='true' />
				</div>
				<div className='ml-3 flex-1 md:flex md:justify-between'>
					<div>
						<h3 className='text-sm font-bold text-[#005698]'>Witaj w nowym panelu członka!</h3>
						<p className='mt-2 text-sm text-blue-800'>
							Prosimy o zweryfikowanie poprawności danych Twojej firmy, Możesz to zrobić w zakładce
							<strong> Moje Dane</strong>.
						</p>
					</div>
					<div className='mt-4 md:mt-0 md:ml-6 flex items-center'>
						<button
							type='button'
							onClick={onOpenProfile}
							className='whitespace-nowrap bg-[#005698] px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white hover:bg-[#004070] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors'>
							Zweryfikuj dane teraz
						</button>
					</div>
				</div>

				<div className='ml-4 flex-shrink-0 flex'>
					<button
						type='button'
						onClick={() => setIsVisible(false)}
						className='bg-transparent rounded-md inline-flex text-blue-400 hover:text-blue-500 focus:outline-none'>
						<span className='sr-only'>Zamknij</span>
						<XMarkIcon className='h-5 w-5' aria-hidden='true' />
					</button>
				</div>
			</div>
		</div>
	)
}

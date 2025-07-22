'use client'

import { useRouter } from 'next/navigation'

export default function BackButton() {
	const router = useRouter()

	return (
		<button
			onClick={() => router.back()}
			className='inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mt-4 ml-4 font-medium cursor-pointer'>
			<svg
				xmlns='http://www.w3.org/2000/svg'
				className='h-5 w-5'
				viewBox='0 0 20 20'
				fill='currentColor'
				aria-hidden='true'>
				<path
					fillRule='evenodd'
					d='M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z'
					clipRule='evenodd'
				/>
			</svg>
			<span>Powrót</span>
		</button>
	)
}

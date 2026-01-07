'use client'

import { MegaphoneIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline'
import { CollapsibleFileCategory } from './CollapsibleFileCategory'

export default function NewslettersSection() {
	const years = Array.from({ length: 2025 - 2018 + 1 }, (_, i) => 2025 - i)

	const newsletterFiles = years.map(year => ({
		id: `newsletter-${year}`,
		fileName: `spis-newsletterow-${year}.pdf`,
		downloadUrl: `/api/member/newsletter/spis-newsletterow-${year}.pdf`,
	}))

	const newsletterCategory = {
		category: 'Spis newsletterów',
		files: newsletterFiles,
	}

	return (
		<section className='mb-8'>
			{/* Nagłówek sekcji */}
			<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
				<MegaphoneIcon className='h-6 w-6 text-[#005698]' />
				<h2 className='text-lg font-semibold text-[#005698]'>Komunikaty i spis newsletterów</h2>
			</div>

			<div className='bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden divide-y divide-gray-200'>
				<a
					href='https://pisil.pl/komunikaty/'
					target='_blank'
					rel='noopener noreferrer'
					className='flex items-center justify-between px-4 py-4 hover:bg-gray-50 transition-colors group'>
					<div className='flex items-center gap-3'>
						<div className='bg-blue-50 p-1.5 rounded-md'>
							<MegaphoneIcon className='h-5 w-5 text-[#005698]' />
						</div>
						<div>
							<span className='text-sm font-medium text-gray-800 block'>Strona Komunikatów PISiL</span>
						</div>
					</div>
					<ArrowTopRightOnSquareIcon className='h-4 w-4 text-gray-400 group-hover:text-[#005698] transition-colors' />
				</a>

				<CollapsibleFileCategory category={newsletterCategory} />
			</div>
		</section>
	)
}

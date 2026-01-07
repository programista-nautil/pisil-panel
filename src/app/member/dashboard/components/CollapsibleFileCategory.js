'use client'

import { useState } from 'react'
import { DocumentTextIcon, ArrowDownTrayIcon, ChevronDownIcon, FolderIcon } from '@heroicons/react/24/outline'

export const CollapsibleFileCategory = ({ category }) => {
	const [isOpen, setIsOpen] = useState(false)

	return (
		<div className='bg-white'>
			{/* Nagłówek kategorii - wygląda teraz jak wiersz w tabeli */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 transition-colors text-left group'>
				<div className='flex items-center gap-3'>
					{/* Ikona folderu, która zmienia kolor przy hoverze */}
					<div>
						<FolderIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
					</div>
					<span className='text-sm font-medium text-gray-800'>{category.category}</span>
				</div>
				<div className='flex items-center gap-2'>
					<span className='text-xs text-gray-500'>{category.files.length} plików</span>
					<ChevronDownIcon
						className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
					/>
				</div>
			</button>

			{/* Rozwijana zawartość - lekko wcięta lub z innym tłem */}
			{isOpen && (
				<div className='bg-gray-50 border-t border-gray-100'>
					<ul className='divide-y divide-gray-100'>
						{category.files.map(file => (
							<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3 pl-12'>
								<div className='flex items-center gap-3 min-w-0'>
									<DocumentTextIcon className='h-5 w-5 text-gray-400 flex-shrink-0' />
									<span className='text-sm font-medium text-gray-700 truncate'>{file.fileName}</span>
								</div>
								<a
									href={file.downloadUrl}
									download
									className='inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 rounded-md transition-colors'>
									<ArrowDownTrayIcon className='h-4 w-4' />
									Pobierz
								</a>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}

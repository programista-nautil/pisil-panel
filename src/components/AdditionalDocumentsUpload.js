'use client'

import { useState, useRef } from 'react'

export default function AdditionalDocumentsUpload() {
	const [files, setFiles] = useState([])
	const [isDragging, setIsDragging] = useState(false)
	const inputRef = useRef(null)

	const accept = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg'

	const onSelectFiles = fileList => {
		if (!fileList || fileList.length === 0) return
		const arr = Array.from(fileList)
		setFiles(prev => [...prev, ...arr])
	}

	const onInputChange = e => {
		onSelectFiles(e.target.files)
	}

	const onDragOver = e => {
		e.preventDefault()
		setIsDragging(true)
	}

	const onDragLeave = e => {
		e.preventDefault()
		setIsDragging(false)
	}

	const onDrop = e => {
		e.preventDefault()
		setIsDragging(false)
		onSelectFiles(e.dataTransfer.files)
	}

	const removeFileAt = idx => {
		setFiles(prev => prev.filter((_, i) => i !== idx))
	}

	const clearAll = () => setFiles([])

	const totalSizeMB = (files.reduce((acc, f) => acc + (f.size || 0), 0) / (1024 * 1024)).toFixed(2)

	return (
		<div className='space-y-4'>
			<h3 className='text-lg font-medium text-gray-900'>Krok 3: Dodatkowe dokumenty (opcjonalnie)</h3>
			<p className='text-sm text-gray-600'>
				Możesz dodać załączniki wspierające wniosek (np. program, umowy, grafiki). Obsługiwane: PDF, DOC(X), XLS(X),
				PNG, JPG. Łącznie sugerujemy ≤ 25MB.
			</p>

			<div
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				onDrop={onDrop}
				className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
					isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
				}`}>
				{files.length === 0 ? (
					<div>
						<svg
							className='mx-auto h-12 w-12 text-gray-400'
							stroke='currentColor'
							fill='none'
							viewBox='0 0 48 48'
							aria-hidden='true'>
							<path
								d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
								strokeWidth={2}
								strokeLinecap='round'
								strokeLinejoin='round'
							/>
						</svg>
						<div className='mt-4'>
							<label htmlFor='additional-files' className='cursor-pointer'>
								<span className='mt-2 block text-sm font-medium text-gray-900'>
									Wybierz pliki lub przeciągnij je tutaj
								</span>
								<input
									ref={inputRef}
									id='additional-files'
									type='file'
									multiple
									accept={accept}
									onChange={onInputChange}
									className='sr-only'
								/>
								<span className='mt-1 block text-xs text-gray-500'>
									Dozwolone: {accept.replaceAll('.', '').replaceAll(',', ', ')}
								</span>
							</label>
						</div>
					</div>
				) : (
					<div className='text-left'>
						<div className='flex items-center justify-between mb-3'>
							<p className='text-sm text-gray-700'>
								Wybrane pliki: <span className='font-medium'>{files.length}</span> (łącznie ~ {totalSizeMB} MB)
							</p>
							<button onClick={clearAll} className='text-red-600 hover:text-red-800 text-sm font-medium'>
								Wyczyść wszystkie
							</button>
						</div>
						<div className='bg-gray-50 p-3 rounded-md border text-sm max-h-56 overflow-auto'>
							<ul className='divide-y divide-gray-200'>
								{files.map((f, idx) => (
									<li key={`${f.name}-${idx}`} className='flex items-center justify-between py-2'>
										<div className='min-w-0 pr-4'>
											<p className='truncate text-gray-900 font-medium'>{f.name}</p>
											<p className='text-gray-500'>{(f.size / (1024 * 1024)).toFixed(2)} MB</p>
										</div>
										<button
											onClick={() => removeFileAt(idx)}
											className='text-red-600 hover:text-red-800 font-medium'
											aria-label={`Usuń ${f.name}`}>
											Usuń
										</button>
									</li>
								))}
							</ul>
						</div>

						{/* ukryty input dostępny także gdy pliki już są wybrane, aby można było dodać kolejne */}
						<div className='mt-3'>
							<label htmlFor='additional-files' className='cursor-pointer inline-block'>
								<input
									ref={inputRef}
									id='additional-files'
									type='file'
									multiple
									accept={accept}
									onChange={onInputChange}
									className='sr-only'
								/>
								<span className='text-blue-700 hover:text-blue-800 text-sm font-medium'>Dodaj kolejne pliki</span>
							</label>
						</div>
					</div>
				)}
			</div>

			<div className='flex justify-center'>
				<button
					disabled
					className='px-6 py-2 rounded-md font-medium bg-gray-100 text-gray-400 cursor-not-allowed'
					title='Logika wysyłki zostanie dodana wkrótce'>
					Prześlij dodatkowe dokumenty (wkrótce)
				</button>
			</div>
		</div>
	)
}

'use client'

import { useState, useRef, forwardRef } from 'react'

const AdditionalDocumentsUpload = forwardRef(function AdditionalDocumentsUpload({ submissionId, onAllUploaded }, ref) {
	const [files, setFiles] = useState([])
	const [isDragging, setIsDragging] = useState(false)
	const [isUploading, setIsUploading] = useState(false)
	const [status, setStatus] = useState(null) // { type: 'success'|'error', message: string }
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

	const handleUpload = async () => {
		if (files.length === 0) {
			alert('Nie wybrano żadnych plików.')
			return
		}
		setIsUploading(true)
		setStatus(null)

		const formData = new FormData()
		files.forEach(file => formData.append('additionalFiles[]', file))

		try {
			const response = await fetch(`/api/submissions/${submissionId}/attachments`, {
				method: 'POST',
				body: formData,
			})

			if (!response.ok) {
				throw new Error('Wystąpił błąd podczas przesyłania załączników.')
			}

			setStatus({ type: 'success', message: 'Załączniki zostały pomyślnie wysłane!' })
			if (onAllUploaded) onAllUploaded()
			clearAll()
		} catch (error) {
			console.error(error)
			setStatus({ type: 'error', message: error.message })
		} finally {
			setIsUploading(false)
		}
	}

	return (
		<section ref={ref} tabIndex={-1} aria-label='Krok 3: Dodatkowe dokumenty' className='space-y-4 outline-none'>
			<h3 className='text-lg font-medium text-gray-900'>Krok 3: Dodatkowe dokumenty (opcjonalnie)</h3>
			<p className='text-sm text-gray-600'>
				Możesz dodać załączniki wspierające wniosek (np. program, umowy, grafiki). Obsługiwane: PDF, DOC(X), XLS(X),
				PNG, JPG. Łącznie sugerujemy ≤ 25MB.
			</p>

			<div
				onDragOver={!isUploading ? onDragOver : undefined}
				onDragLeave={!isUploading ? onDragLeave : undefined}
				onDrop={!isUploading ? onDrop : undefined}
				className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
					isDragging && !isUploading ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
				}`}>
				{isUploading ? (
					<div className='flex flex-col items-center justify-center space-y-4'>
						<svg
							className='animate-spin h-10 w-10 text-blue-600'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'>
							<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
							<path
								className='opacity-75'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
						</svg>
						<p className='text-sm font-medium text-gray-700'>Przesyłanie plików...</p>
					</div>
				) : files.length === 0 ? (
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

			{status && (
				<div className={`p-4 rounded-md ${status.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
					<p className={`text-sm ${status.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{status.message}</p>
				</div>
			)}

			<div className='flex justify-center'>
				<button
					onClick={handleUpload}
					disabled={isUploading || files.length === 0}
					className={`px-6 py-2 rounded-md font-medium transition-colors ${
						isUploading || files.length === 0
							? 'bg-gray-100 text-gray-400 cursor-not-allowed'
							: 'bg-blue-600 text-white hover:bg-blue-700'
					}`}>
					{isUploading ? 'Przesyłanie...' : 'Prześlij dodatkowe dokumenty'}
				</button>
			</div>
		</section>
	)
})

export default AdditionalDocumentsUpload

import { useState } from 'react'

export const MultiAttachmentInput = ({ files, onFilesChange, onFileRemove }) => {
	const [isDragging, setIsDragging] = useState(false)

	const handleDragOver = e => {
		e.preventDefault()
		setIsDragging(true)
	}
	const handleDragLeave = e => {
		e.preventDefault()
		setIsDragging(false)
	}
	const handleDrop = e => {
		e.preventDefault()
		setIsDragging(false)
		if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
			const mockEvent = { target: { files: e.dataTransfer.files } }
			onFilesChange(mockEvent)
		}
	}
	return (
		<div className='mt-4'>
			<label className='block text-sm font-medium text-gray-700 text-left mb-2'>Załączniki (można wybrać wiele)</label>
			{files.length === 0 ? (
				<label
					htmlFor='multi-attachment-upload'
					className={`flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer transition-colors ${
						isDragging ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<div className='flex flex-col items-center justify-center pt-5 pb-6'>
						<svg
							className='w-8 h-8 mb-4 text-gray-500'
							aria-hidden='true'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 20 16'>
							<path
								stroke='currentColor'
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2'
							/>
						</svg>
						<p className='mb-2 text-sm text-gray-500'>
							<span className='font-semibold'>Kliknij, aby wybrać</span> lub przeciągnij pliki
						</p>
					</div>
					<input id='multi-attachment-upload' type='file' multiple className='hidden' onChange={onFilesChange} />
				</label>
			) : (
				<div className='mt-2 space-y-2'>
					<ul className='border border-gray-200 rounded-md divide-y divide-gray-200'>
						{files.map((file, index) => (
							<li key={index} className='pl-3 pr-4 py-3 flex items-center justify-between text-sm'>
								<div className='w-0 flex-1 flex items-center'>
									<svg className='flex-shrink-0 h-5 w-5 text-gray-400' viewBox='0 0 20 20' fill='currentColor'>
										<path
											fillRule='evenodd'
											d='M8 4a3 3 0 00-3 3v4a3 3 0 006 0V7a1 1 0 112 0v4a5 5 0 01-10 0V7a5 5 0 0110 0v4a3 3 0 11-6 0V7a1 1 0 012 0v4a1 1 0 102 0V7a3 3 0 00-3-3z'
											clipRule='evenodd'
										/>
									</svg>
									<span className='ml-2 flex-1 w-0 truncate text-gray-400'>{file.name}</span>
								</div>
								<div className='ml-4 flex-shrink-0'>
									<button onClick={() => onFileRemove(index)} className='font-medium text-red-600 hover:text-red-500'>
										Usuń
									</button>
								</div>
							</li>
						))}
					</ul>
					<label
						htmlFor='multi-attachment-upload-add'
						className='text-blue-600 hover:text-blue-800 text-sm font-medium cursor-pointer'>
						+ Dodaj kolejny plik
						<input id='multi-attachment-upload-add' type='file' multiple className='hidden' onChange={onFilesChange} />
					</label>
				</div>
			)}
		</div>
	)
}

export const AttachmentInput = ({ file, onFileChange }) => {
	const [isDragging, setIsDragging] = useState(false)

	const handleDragOver = e => {
		e.preventDefault()
		setIsDragging(true)
	}
	const handleDragLeave = e => {
		e.preventDefault()
		setIsDragging(false)
	}
	const handleDrop = e => {
		e.preventDefault()
		setIsDragging(false)
		if (e.dataTransfer.files && e.dataTransfer.files[0]) {
			// Tworzymy nowy event, aby onFileChange zadziałał
			const mockEvent = { target: { files: e.dataTransfer.files } }
			onFileChange(mockEvent)
		}
	}
	return (
		<div className='mt-4'>
			<label htmlFor='attachment-upload' className='block text-sm font-medium text-gray-700 text-left mb-2'>
				Wymagany załącznik <span className='text-red-500'>*</span>
			</label>
			<div className='flex items-center justify-center w-full'>
				<label
					htmlFor='attachment-upload'
					className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
						isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
					}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<div className='flex flex-col items-center justify-center pt-5 pb-6'>
						<svg
							className='w-8 h-8 mb-4 text-gray-500'
							aria-hidden='true'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 20 16'>
							<path
								stroke='currentColor'
								strokeLinecap='round'
								strokeLinejoin='round'
								strokeWidth='2'
								d='M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2'
							/>
						</svg>
						{file ? (
							<p className='text-sm text-green-600 font-semibold'>{file.name}</p>
						) : (
							<>
								<p className='mb-2 text-sm text-gray-500'>
									<span className='font-semibold'>Kliknij, aby wybrać</span> lub przeciągnij
								</p>
								<p className='text-xs text-gray-500'>PDF, DOCX, PNG, JPG etc.</p>
							</>
						)}
					</div>
					<input id='attachment-upload' type='file' className='hidden' onChange={onFileChange} />
				</label>
			</div>
		</div>
	)
}

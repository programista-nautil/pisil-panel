'use client'

import { useState, useRef } from 'react'

export default function FileUpload({ formData }) {
	const [file, setFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [uploadStatus, setUploadStatus] = useState(null)
	const [isDragging, setIsDragging] = useState(false)
	const fileInputRef = useRef(null)

	const handleFileValidation = selectedFile => {
		if (!selectedFile) return false

		if (selectedFile.type !== 'application/pdf') {
			alert('Proszę wybrać plik PDF.')
			return false
		}

		if (selectedFile.size > 10 * 1024 * 1024) {
			alert('Plik jest za duży. Maksymalny rozmiar to 10MB.')
			return false
		}

		return true
	}

	const handleFileChange = e => {
		const selectedFile = e.target.files[0]
		if (handleFileValidation(selectedFile)) {
			setFile(selectedFile)
			setUploadStatus(null)
		}
	}

	const handleRemoveFile = () => {
		setFile(null)
		if (fileInputRef.current) {
			fileInputRef.current.value = ''
		}
	}

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
		const droppedFile = e.dataTransfer.files[0]
		if (handleFileValidation(droppedFile)) {
			setFile(droppedFile)
			setUploadStatus(null)
			if (fileInputRef.current) {
				fileInputRef.current.files = e.dataTransfer.files
			}
		}
	}

	const handleUpload = async () => {
		if (!file) {
			alert('Proszę wybrać plik PDF.')
			return
		}

		setIsUploading(true)
		setUploadStatus(null)

		try {
			const formDataToSend = new FormData()
			formDataToSend.append('pdf', file)
			formDataToSend.append('formData', JSON.stringify(formData))

			const response = await fetch('/api/upload', {
				method: 'POST',
				body: formDataToSend,
			})

			if (response.ok) {
				setUploadStatus({
					type: 'success',
					message: 'Plik został przesłany pomyślnie! Sprawdzamy podpis i wysyłamy powiadomienia email.',
				})
				handleRemoveFile()
			} else {
				const error = await response.json()
				setUploadStatus({
					type: 'error',
					message: error.message || 'Wystąpił błąd podczas przesyłania pliku.',
				})
			}
		} catch (error) {
			console.error('Błąd podczas przesyłania:', error)
			setUploadStatus({
				type: 'error',
				message: 'Wystąpił błąd podczas przesyłania pliku. Spróbuj ponownie.',
			})
		} finally {
			setIsUploading(false)
		}
	}

	return (
		<div className='space-y-4'>
			<h3 className='text-lg font-medium text-gray-900'>Krok 2: Prześlij podpisany PDF</h3>

			<div
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ${
					isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
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
						<p className='text-sm font-medium text-gray-700'>Przesyłanie pliku...</p>
					</div>
				) : (
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
							<label htmlFor='pdf-upload' className='cursor-pointer'>
								<span className='mt-2 block text-sm font-medium text-gray-900'>
									Wybierz plik lub przeciągnij go tutaj
								</span>
								<input
									ref={fileInputRef}
									id='pdf-upload'
									type='file'
									accept='.pdf'
									onChange={handleFileChange}
									className='sr-only'
								/>
								<span className='mt-1 block text-xs text-gray-500'>Maksymalny rozmiar: 10MB</span>
							</label>
						</div>

						{file && (
							<div className='mt-4 text-sm text-gray-600 bg-gray-50 p-3 rounded-md border flex items-center justify-between'>
								<div>
									<p>
										Wybrany plik: <span className='font-medium'>{file.name}</span>
									</p>
									<p>Rozmiar: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
								</div>
								<button
									onClick={handleRemoveFile}
									className='text-red-600 hover:text-red-800 font-medium'
									aria-label='Usuń wybrany plik'>
									Usuń
								</button>
							</div>
						)}
					</div>
				)}
			</div>

			{uploadStatus && (
				<div className={`p-4 rounded-md ${uploadStatus.type === 'success' ? 'bg-green-50' : 'bg-red-50'}`}>
					<p className={`text-sm ${uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
						{uploadStatus.message}
					</p>
				</div>
			)}

			<div className='flex justify-center'>
				<button
					onClick={handleUpload}
					disabled={!file || isUploading}
					className={`px-6 py-2 rounded-md font-medium transition-colors ${
						!file || isUploading
							? 'bg-gray-100 text-gray-400 cursor-not-allowed'
							: 'bg-blue-600 text-white hover:bg-blue-700'
					}`}>
					{isUploading ? 'Przesyłanie...' : 'Prześlij PDF'}
				</button>
			</div>
		</div>
	)
}

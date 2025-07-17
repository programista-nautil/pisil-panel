'use client'

import { useState } from 'react'

export default function FileUpload({ formData }) {
	const [file, setFile] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [uploadStatus, setUploadStatus] = useState(null)

	const handleFileChange = e => {
		const selectedFile = e.target.files[0]

		if (selectedFile) {
			// Sprawdź czy to PDF
			if (selectedFile.type !== 'application/pdf') {
				alert('Proszę wybrać plik PDF.')
				return
			}

			// Sprawdź rozmiar pliku (max 10MB)
			if (selectedFile.size > 10 * 1024 * 1024) {
				alert('Plik jest za duży. Maksymalny rozmiar to 10MB.')
				return
			}

			setFile(selectedFile)
			setUploadStatus(null)
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
				const result = await response.json()
				setUploadStatus({
					type: 'success',
					message: 'Plik został przesłany pomyślnie! Sprawdzamy podpis i wysyłamy powiadomienia email.',
				})
				setFile(null)

				// Reset file input
				const fileInput = document.getElementById('pdf-upload')
				if (fileInput) fileInput.value = ''
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
			<h3 className='text-lg font-medium text-gray-900'>Prześlij podpisany PDF</h3>

			<div className='border-2 border-dashed border-gray-300 rounded-lg p-6'>
				<div className='text-center'>
					<svg className='mx-auto h-12 w-12 text-gray-400' stroke='currentColor' fill='none' viewBox='0 0 48 48'>
						<path
							d='M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02'
							strokeWidth={2}
							strokeLinecap='round'
							strokeLinejoin='round'
						/>
					</svg>

					<div className='mt-4'>
						<label htmlFor='pdf-upload' className='cursor-pointer'>
							<span className='mt-2 block text-sm font-medium text-gray-900'>Wybierz podpisany plik PDF</span>
							<input id='pdf-upload' type='file' accept='.pdf' onChange={handleFileChange} className='sr-only' />
							<span className='mt-1 block text-xs text-gray-500'>Maksymalny rozmiar: 10MB</span>
						</label>
					</div>

					{file && (
						<div className='mt-4 text-sm text-gray-600'>
							<p>
								Wybrany plik: <span className='font-medium'>{file.name}</span>
							</p>
							<p>Rozmiar: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
						</div>
					)}
				</div>
			</div>

			{uploadStatus && (
				<div
					className={`p-4 rounded-md ${
						uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
					}`}>
					<p className={`text-sm ${uploadStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>
						{uploadStatus.message}
					</p>
				</div>
			)}

			<div className='flex justify-center'>
				<button
					onClick={handleUpload}
					disabled={!file || isUploading}
					className={`px-6 py-2 rounded-md font-medium ${
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

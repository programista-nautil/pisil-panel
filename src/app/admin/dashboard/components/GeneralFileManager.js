'use client'
import { useState, useEffect, useRef } from 'react'
import { DocumentDuplicateIcon, ArrowUpOnSquareIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'

export default function GeneralFileManager() {
	const [generalFiles, setGeneralFiles] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [fileToUpload, setFileToUpload] = useState(null)
	const [isUploading, setIsUploading] = useState(false)
	const [deletingFileId, setDeletingFileId] = useState(null)
	const fileInputRef = useRef(null)

	useEffect(() => {
		const fetchFiles = async () => {
			setIsLoading(true)
			try {
				const response = await fetch('/api/admin/general-files')
				if (!response.ok) throw new Error('Nie udało się pobrać plików.')
				const data = await response.json()
				setGeneralFiles(data)
			} catch (error) {
				console.error(error)
				alert(error.message)
			} finally {
				setIsLoading(false)
			}
		}
		fetchFiles()
	}, [])

	const handleFileChange = e => {
		if (e.target.files && e.target.files[0]) {
			setFileToUpload(e.target.files[0])
		}
	}

	const handleUpload = async () => {
		if (!fileToUpload) return
		setIsUploading(true)

		const formData = new FormData()
		formData.append('file', fileToUpload)

		try {
			const response = await fetch('/api/admin/general-files', {
				method: 'POST',
				body: formData,
			})
			if (!response.ok) throw new Error('Błąd podczas wysyłania pliku.')

			const newFile = await response.json()
			setGeneralFiles(prev => [newFile, ...prev]) // Dodaj nowy plik na początek listy

			setFileToUpload(null)
			if (fileInputRef.current) fileInputRef.current.value = null
		} catch (error) {
			console.error(error)
			alert(error.message)
		} finally {
			setIsUploading(false)
		}
	}

	const handleDeleteFile = async fileId => {
		if (confirm('Czy na pewno chcesz usunąć ten plik? Ta akcja jest nieodwracalna.')) {
			setDeletingFileId(fileId)
			try {
				const response = await fetch(`/api/admin/general-files/${fileId}`, {
					method: 'DELETE',
				})
				if (!response.ok) throw new Error('Błąd podczas usuwania pliku.')

				setGeneralFiles(prev => prev.filter(f => f.id !== fileId))
			} catch (error) {
				console.error(error)
				alert(error.message)
			} finally {
				setDeletingFileId(null)
			}
		}
	}

	return (
		<div className='p-2'>
			<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
				<DocumentDuplicateIcon className='h-6 w-6 text-gray-500' />
				<h2 className='text-lg font-semibold text-gray-800'>Pliki Ogólne dla Członków</h2>
			</div>
			<div className='bg-white rounded-lg shadow'>
				{/* Formularz dodawania */}
				<div className='p-4 border-b border-gray-200'>
					<h3 className='text-base font-medium text-gray-700 mb-2'>Dodaj nowy plik</h3>
					<div className='flex flex-col sm:flex-row gap-2'>
						<input
							ref={fileInputRef}
							type='file'
							onChange={handleFileChange}
							className='block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100'
						/>
						<button
							onClick={handleUpload}
							disabled={isUploading || !fileToUpload}
							className='inline-flex justify-center items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md shadow-sm hover:bg-blue-700 disabled:bg-gray-300'>
							<ArrowUpOnSquareIcon className='h-4 w-4' />
							<span>{isUploading ? 'Wgrywanie...' : 'Wgraj'}</span>
						</button>
					</div>
				</div>
				{/* Lista plików */}
				{isLoading ? (
					<p className='p-4 text-center text-gray-500'>Ładowanie plików...</p>
				) : (
					<ul className='divide-y divide-gray-200'>
						{generalFiles.map(file => (
							<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3'>
								<div>
									<p className='text-sm font-medium text-gray-900'>{file.fileName}</p>
									<p className='text-xs text-gray-500'>
										Dodano: {new Date(file.createdAt).toLocaleDateString('pl-PL')}
									</p>
								</div>
								<div className='flex items-center gap-2'>
									<Link
										href={`/api/admin/general-files/${file.id}/download`}
										download
										className='p-2 text-blue-600 hover:bg-blue-100 rounded-md'
										title='Pobierz plik'>
										<ArrowDownTrayIcon className='h-5 w-5' />
									</Link>
									<button
										onClick={() => handleDeleteFile(file.id)}
										disabled={deletingFileId === file.id}
										className='p-2 text-red-500 hover:bg-red-100 rounded-md disabled:opacity-50'
										title='Usuń plik'>
										{deletingFileId === file.id ? (
											<svg className='animate-spin h-5 w-5' fill='none' viewBox='0 0 24 24'>
												{/* ... (spinner) ... */}
											</svg>
										) : (
											<TrashIcon className='h-5 w-5' />
										)}
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</div>
	)
}

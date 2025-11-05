'use client'

import { useState } from 'react'
import { DocumentDuplicateIcon, ArrowUpOnSquareIcon, TrashIcon } from '@heroicons/react/24/outline'

// Przykładowe dane (do zastąpienia danymi z API)
const MOCK_FILES = [
	{ id: 'f1', fileName: 'Regulamin_serwisu_2025.pdf', createdAt: new Date().toISOString() },
	{ id: 'f2', fileName: 'Newsletter_Wrzesien.pdf', createdAt: new Date().toISOString() },
]

export default function GeneralFileManager() {
	const [generalFiles, setGeneralFiles] = useState(MOCK_FILES)
	const [fileToUpload, setFileToUpload] = useState(null)
	const [isUploading, setIsUploading] = useState(false)

	const handleFileChange = e => {
		if (e.target.files && e.target.files[0]) {
			setFileToUpload(e.target.files[0])
		}
	}

	const handleUpload = async () => {
		if (!fileToUpload) return
		setIsUploading(true)
		// Logika API (na razie symulacja)
		console.log('Rozpoczynam przesyłanie:', fileToUpload.name)
		await new Promise(resolve => setTimeout(resolve, 1500))
		// W przyszłości tutaj będzie fetch do API
		setIsUploading(false)
		setFileToUpload(null)
		alert('Plik wgrany (symulacja)')
	}

	const handleDeleteFile = fileId => {
		// Logika API (na razie symulacja)
		if (confirm('Czy na pewno chcesz usunąć ten plik?')) {
			setGeneralFiles(prev => prev.filter(f => f.id !== fileId))
			alert('Plik usunięty (symulacja)')
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
				<ul className='divide-y divide-gray-200'>
					{generalFiles.map(file => (
						<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3'>
							<div>
								<p className='text-sm font-medium text-gray-900'>{file.fileName}</p>
								<p className='text-xs text-gray-500'>Dodano: {new Date(file.createdAt).toLocaleDateString('pl-PL')}</p>
							</div>
							<button
								onClick={() => handleDeleteFile(file.id)}
								className='p-2 text-red-500 hover:bg-red-100 rounded-md'
								title='Usuń plik'>
								<TrashIcon className='h-5 w-5' />
							</button>
						</li>
					))}
				</ul>
			</div>
		</div>
	)
}

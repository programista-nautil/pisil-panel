'use client'

import { useState, useEffect, useRef } from 'react'
import { TrashIcon, ArrowDownTrayIcon, CloudArrowUpIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function MemberFileEditor({ memberId }) {
	const [files, setFiles] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [isUploading, setIsUploading] = useState(false)
	const [deletingId, setDeletingId] = useState(null)
	const fileInputRef = useRef(null)

	useEffect(() => {
		const fetchFiles = async () => {
			try {
				const response = await fetch(`/api/admin/members/${memberId}/files`)
				if (!response.ok) throw new Error('Nie udało się pobrać plików.')
				const data = await response.json()
				setFiles(data)
			} catch (error) {
				console.error(error)
			} finally {
				setIsLoading(false)
			}
		}
		fetchFiles()
	}, [memberId])

	const handleUpload = async e => {
		const selectedFiles = e.target.files
		if (!selectedFiles || selectedFiles.length === 0) return

		setIsUploading(true)
		const formData = new FormData()
		for (const file of selectedFiles) {
			formData.append('files[]', file)
		}

		try {
			const response = await fetch(`/api/admin/members/${memberId}/files`, {
				method: 'POST',
				body: formData,
			})
			if (!response.ok) throw new Error('Błąd wysyłania pliku.')
			const newFiles = await response.json()
			setFiles(prev => [...newFiles, ...prev])
			if (fileInputRef.current) fileInputRef.current.value = null
			toast.success('Pliki zostały wgrane pomyślnie.')
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setIsUploading(false)
		}
	}

	const handleDelete = async fileId => {
		if (confirm('Czy na pewno chcesz usunąć ten plik?')) {
			setDeletingId(fileId)
			try {
				const response = await fetch(`/api/admin/member-files/${fileId}`, {
					method: 'DELETE',
				})
				if (!response.ok) throw new Error('Błąd usuwania pliku.')
				setFiles(prev => prev.filter(f => f.id !== fileId))
				toast.success('Plik został usunięty.')
			} catch (error) {
				console.error(error)
				toast.error(error.message)
			} finally {
				setDeletingId(null)
			}
		}
	}

	return (
		<div className='bg-white/60 backdrop-blur-sm border border-gray-200 rounded-lg p-5 shadow-inner space-y-6'>
			<h4 className='text-sm font-semibold text-gray-800 tracking-wide flex items-center gap-2'>
				<DocumentArrowUpIcon className='h-5 w-5 text-gray-500' />
				Pliki dla członka (widoczne w jego panelu)
			</h4>

			{/* Uploader */}
			<div className='flex flex-col sm:flex-row gap-2'>
				<label className='w-full relative cursor-pointer'>
					<input
						ref={fileInputRef}
						type='file'
						multiple
						className='absolute inset-0 w-full h-full opacity-0 cursor-pointer'
						onChange={handleUpload}
						disabled={isUploading}
					/>
					<div className='flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 text-sm font-medium rounded-md border border-blue-200 hover:bg-blue-100'>
						{isUploading ? (
							<svg className='animate-spin h-4 w-4 text-blue-700' fill='none' viewBox='0 0 24 24'>
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path
									className='opacity-75'
									fill='currentColor'
									d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
							</svg>
						) : (
							<CloudArrowUpIcon className='h-4 w-4 text-[#005698]' />
						)}
						<span className='text-[#005698]'>{isUploading ? 'Przesyłanie...' : 'Wgraj nowe pliki'}</span>
					</div>
				</label>
			</div>

			{/* Lista plików */}
			{isLoading && <p className='text-sm text-gray-500'>Ładowanie plików...</p>}
			{!isLoading && files.length === 0 && (
				<p className='text-sm text-gray-500 italic'>Brak wgranych plików dla tego członka.</p>
			)}

			{files.length > 0 && (
				<ul className='divide-y divide-gray-200 rounded-md border border-gray-200 bg-white shadow-sm'>
					{files.map(file => (
						<li key={file.id} className='flex items-center justify-between gap-3 px-4 py-3'>
							<div>
								<p className='text-sm font-medium text-gray-900'>{file.fileName}</p>
								<p className='text-xs text-gray-500'>Dodano: {new Date(file.createdAt).toLocaleDateString('pl-PL')}</p>
							</div>
							<div className='flex items-center gap-2'>
								<Link
									href={`/api/admin/member-files/${file.id}/download`}
									download
									className='p-2 text-blue-600 hover:bg-blue-100 rounded-md'
									title='Pobierz plik'>
									<ArrowDownTrayIcon className='h-5 w-5 text-[#005698]' />
								</Link>
								<button
									onClick={() => handleDelete(file.id)}
									disabled={deletingId === file.id}
									className='p-2 text-red-500 hover:bg-red-100 rounded-md'
									title='Usuń plik'>
									{deletingId === file.id ? (
										<svg className='animate-spin h-5 w-5 text-red-500' fill='none' viewBox='0 0 24 24'>
											<circle
												className='opacity-25'
												cx='12'
												cy='12'
												r='10'
												stroke='currentColor'
												strokeWidth='4'></circle>
											<path
												className='opacity-75'
												fill='currentColor'
												d='m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
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
	)
}

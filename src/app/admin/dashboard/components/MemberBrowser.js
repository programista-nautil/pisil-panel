'use client'

import { useState, useEffect, useRef, Fragment } from 'react'
import {
	UserGroupIcon,
	TrashIcon,
	MagnifyingGlassIcon,
	ChevronRightIcon,
	PencilSquareIcon,
	PrinterIcon,
	ArrowUturnLeftIcon,
	ArchiveBoxXMarkIcon,
} from '@heroicons/react/24/outline'
import MemberFileEditor from './MemberFileEditor'
import EditMemberModal from './EditMemberModal'
import DeleteConfirmationModal from '@/components/DeleteConfirmationModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import toast from 'react-hot-toast'

function useDebounce(value, delay) {
	const [debouncedValue, setDebouncedValue] = useState(value)

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)
		return () => {
			clearTimeout(handler)
		}
	}, [value, delay])
	return debouncedValue
}

export default function MemberBrowser() {
	const [members, setMembers] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [deletingId, setDeletingId] = useState(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalMembers, setTotalMembers] = useState(0)
	const [expanded, setExpanded] = useState({})
	const [editingMember, setEditingMember] = useState(null)

	const [searchQuery, setSearchQuery] = useState('')
	const debouncedSearchQuery = useDebounce(searchQuery, 300)

	const [isPrinting, setIsPrinting] = useState(false)

	// Usuwanie z modalem + notatką
	const [memberToDelete, setMemberToDelete] = useState(null)

	// Sekcja "Byli członkowie" (lazy)
	const [showFormer, setShowFormer] = useState(false)
	const [formerMembers, setFormerMembers] = useState([])
	const [formerLoaded, setFormerLoaded] = useState(false)
	const [formerLoading, setFormerLoading] = useState(false)
	const [restoringId, setRestoringId] = useState(null)
	const [memberToRestore, setMemberToRestore] = useState(null)

	const isInitialLoad = useRef(true)

	const fetchMembers = async (page = 1, query = '') => {
		setIsLoading(true)
		try {
			const response = await fetch(`/api/admin/members?page=${page}&limit=50&search=${encodeURIComponent(query)}`)
			if (!response.ok) throw new Error('Nie udało się pobrać listy członków.')
			const data = await response.json()
			setMembers(data.members)
			setTotalPages(data.totalPages)
			setCurrentPage(data.currentPage)
			setTotalMembers(data.totalMembers)
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchMembers(1)
	}, [])

	useEffect(() => {
		if (isInitialLoad.current) {
			isInitialLoad.current = false
			return // Nie uruchamiaj wyszukiwania przy pierwszym ładowaniu
		}
		fetchMembers(1, debouncedSearchQuery)
	}, [debouncedSearchQuery])

	const toggleExpanded = id => {
		setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
	}

	const confirmDeleteMember = async note => {
		if (!memberToDelete) return
		const memberId = memberToDelete.id
		setDeletingId(memberId)
		try {
			const response = await fetch(`/api/admin/members/${memberId}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note }),
			})
			if (!response.ok) throw new Error('Błąd podczas usuwania członka.')

			setMemberToDelete(null)
			await fetchMembers(currentPage, debouncedSearchQuery)
			if (formerLoaded) await fetchFormerMembers()
			toast.success('Członek przeniesiony do byłych członków.')
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setDeletingId(null)
		}
	}

	const fetchFormerMembers = async () => {
		setFormerLoading(true)
		try {
			const response = await fetch('/api/admin/members/former')
			if (!response.ok) throw new Error('Nie udało się pobrać byłych członków.')
			const data = await response.json()
			setFormerMembers(data.formerMembers)
			setFormerLoaded(true)
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setFormerLoading(false)
		}
	}

	const toggleFormer = () => {
		const next = !showFormer
		setShowFormer(next)
		if (next && !formerLoaded) fetchFormerMembers()
	}

	const confirmRestore = async () => {
		if (!memberToRestore) return
		setRestoringId(memberToRestore.id)
		try {
			const response = await fetch(`/api/admin/members/${memberToRestore.id}/restore`, { method: 'POST' })
			if (!response.ok) throw new Error('Nie udało się przywrócić członka.')

			setMemberToRestore(null)
			await fetchFormerMembers()
			await fetchMembers(currentPage, debouncedSearchQuery)
			toast.success('Członek został przywrócony.')
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setRestoringId(null)
		}
	}

	const handleEditSuccess = () => {
		fetchMembers(currentPage, debouncedSearchQuery)
	}

	const handlePrintList = async () => {
		setIsPrinting(true)
		try {
			const response = await fetch('/api/admin/members/print/pdf')
			if (!response.ok) throw new Error('Nie udało się wygenerować listy do druku.')

			const blob = await response.blob()
			const isPdf = blob.type === 'application/pdf'
			const d = new Date()
			const stamp = `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`
			const url = window.URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = isPdf ? `lista-czlonkow-${stamp}.pdf` : `lista-czlonkow-${stamp}.docx`
			document.body.appendChild(a)
			a.click()
			a.remove()
			window.URL.revokeObjectURL(url)
		} catch (error) {
			console.error(error)
			toast.error(error.message)
		} finally {
			setIsPrinting(false)
		}
	}

	return (
		<div className='p-2'>
			<div className='flex flex-col sm:flex-row items-center justify-between gap-4 mb-4 p-4 bg-gray-50 border rounded-lg'>
				<div className='flex items-center gap-3'>
					<UserGroupIcon className='h-6 w-6 text-[#005698]' />
					<h2 className='text-lg font-semibold text-[#005698]'>Lista Członków ({totalMembers})</h2>
					{isLoading && (
						<svg
							className='animate-spin h-5 w-5 text-[#005698]'
							xmlns='http://www.w3.org/2000/svg'
							fill='none'
							viewBox='0 0 24 24'>
							<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
							<path
								className='opacity-75'
								fill='currentColor'
								d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
						</svg>
					)}
					<button
						type='button'
						onClick={handlePrintList}
						disabled={isPrinting}
						title='Generuj listę członków do druku (PDF)'
						className='inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[#005698] bg-white border border-[#005698]/30 rounded-md hover:bg-[#005698]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed'>
						{isPrinting ? (
							<svg className='animate-spin h-4 w-4' xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24'>
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path
									className='opacity-75'
									fill='currentColor'
									d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
							</svg>
						) : (
							<PrinterIcon className='h-5 w-5' />
						)}
						{isPrinting ? 'Generowanie...' : 'Drukuj listę'}
					</button>
				</div>

				<div className='w-full sm:max-w-xs'>
					<label htmlFor='member-search' className='sr-only'>
						Szukaj członka
					</label>
					<div className='relative'>
						<div className='pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3'>
							<MagnifyingGlassIcon className='h-5 w-5 text-gray-400' aria-hidden='true' />
						</div>
						<input
							id='member-search'
							name='member-search'
							type='search'
							placeholder='Szukaj po nazwie, email, tel...'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							className='block rounded-md border-0 py-2 pl-10 pr-3 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm w-full'
						/>
					</div>
				</div>
			</div>
			<div className='bg-white rounded-lg shadow'>
				<ul className='divide-y divide-gray-200'>
					{!isLoading && members.length === 0 && (
						<li className='px-4 py-4 text-center text-sm text-gray-500'>
							{searchQuery ? 'Nie znaleziono członków pasujących do wyszukiwania.' : 'Brak członków w bazie danych.'}
						</li>
					)}
					{members.map(member => (
						<Fragment key={member.id}>
							<li className='flex items-center justify-between gap-3 px-4 py-3'>
								<div className='flex items-center gap-3'>
									{/* Przycisk rozwijania */}
									<button onClick={() => toggleExpanded(member.id)} className='p-1 rounded hover:bg-gray-200'>
										<ChevronRightIcon
											className={`h-5 w-5 transform transition-transform ${
												expanded[member.id] ? 'rotate-90' : ''
											} text-gray-500`}
										/>
									</button>
									<span className='text-sm font-semibold text-gray-500 w-10 text-center'>#{member.memberNumber}</span>
									<div className='h-10 border-l border-gray-200'></div>
									<div>
										<p className='text-sm font-semibold text-gray-700'>{member.company || 'Brak nazwy firmy'}</p>
										<p className='text-sm text-gray-700'>{member.name || 'Brak imienia i nazwiska'}</p>
										<p className='text-sm text-gray-500'>{member.email}</p>
										<p className='text-sm text-gray-500'>{member.phones || 'Brak telefonu'}</p>
									</div>
								</div>
								<div className='flex items-center gap-2'>
									{/* DODANE POLE: Data dodania */}
									<div className='text-right hidden sm:block mr-2'>
										<p className='text-xs text-gray-500'>Dodano:</p>
										<p className='text-sm font-medium text-gray-700'>
											{new Date(member.createdAt).toLocaleDateString('pl-PL')}
										</p>
									</div>
									<button
										onClick={() => setEditingMember(member)}
										className='p-2 text-blue-600 hover:bg-blue-100 rounded-md'
										title='Edytuj dane kontaktowe'>
										<PencilSquareIcon className='h-5 w-5 text-[#005698]' />
									</button>
									<button
										onClick={() => setMemberToDelete(member)}
										disabled={deletingId === member.id || isLoading}
										className='p-2 text-red-500 hover:bg-red-100 rounded-md disabled:opacity-50'
										title='Usuń członka'>
										{deletingId === member.id ? (
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
													d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
											</svg>
										) : (
											<TrashIcon className='h-5 w-5' />
										)}
									</button>
								</div>
							</li>
							{expanded[member.id] && (
								<li className='bg-gray-50 p-4'>
									<MemberFileEditor memberId={member.id} />
								</li>
							)}
						</Fragment>
					))}
				</ul>
				{/* Paginacja */}
				<div className='flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6'>
					<button
						onClick={() => fetchMembers(currentPage - 1)}
						disabled={currentPage <= 1 || isLoading}
						className='relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'>
						Poprzednia
					</button>
					<div className='text-sm text-gray-700'>
						Strona <span className='font-medium'>{currentPage}</span> z{' '}
						<span className='font-medium'>{totalPages}</span>
					</div>
					<button
						onClick={() => fetchMembers(currentPage + 1)}
						disabled={currentPage >= totalPages || isLoading}
						className='relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'>
						Następna
					</button>
				</div>
			</div>

			{/* Sekcja: Byli członkowie (rozwijana, renderowana dopiero po rozwinięciu) */}
			<div className='mt-8 bg-white rounded-lg shadow'>
				<button
					type='button'
					onClick={toggleFormer}
					className='w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-gray-50 rounded-lg transition-colors'>
					<div className='flex items-center gap-3'>
						<ArchiveBoxXMarkIcon className='h-6 w-6 text-gray-500' />
						<h3 className='text-lg font-semibold text-gray-700'>
							Byli członkowie{formerLoaded ? ` (${formerMembers.length})` : ''}
						</h3>
						{formerLoading && (
							<svg className='animate-spin h-5 w-5 text-gray-400' fill='none' viewBox='0 0 24 24'>
								<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
								<path
									className='opacity-75'
									fill='currentColor'
									d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
							</svg>
						)}
					</div>
					<ChevronRightIcon
						className={`h-5 w-5 transform transition-transform text-gray-500 ${showFormer ? 'rotate-90' : ''}`}
					/>
				</button>

				{showFormer && (
					<ul className='divide-y divide-gray-200 border-t border-gray-200'>
						{!formerLoading && formerMembers.length === 0 && (
							<li className='px-4 py-4 text-center text-sm text-gray-500'>Brak byłych członków.</li>
						)}
						{formerMembers.map(member => (
							<li key={member.id} className='flex items-start justify-between gap-3 px-4 py-3'>
								<div className='flex items-start gap-3 min-w-0'>
									<span className='text-sm font-semibold text-gray-400 w-10 text-center mt-0.5'>
										#{member.memberNumber ?? '—'}
									</span>
									<div className='h-10 border-l border-gray-200'></div>
									<div className='min-w-0'>
										<p className='text-sm font-semibold text-gray-600'>{member.company || 'Brak nazwy firmy'}</p>
										<p className='text-sm text-gray-500'>{member.email}</p>
										<p className='text-sm text-gray-500'>{member.phones || 'Brak telefonu'}</p>
										{member.removalNote && (
											<p className='mt-1 text-sm text-gray-600 italic bg-gray-50 border border-gray-200 rounded px-2 py-1'>
												Powód: {member.removalNote}
											</p>
										)}
									</div>
								</div>
								<div className='flex items-center gap-3 flex-shrink-0'>
									<div className='text-right hidden sm:block'>
										<p className='text-xs text-gray-400'>Usunięto:</p>
										<p className='text-sm font-medium text-gray-600'>
											{member.deletedAt ? new Date(member.deletedAt).toLocaleDateString('pl-PL') : '—'}
										</p>
									</div>
									<button
										onClick={() => setMemberToRestore(member)}
										disabled={restoringId === member.id}
										className='inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-[#005698] bg-white border border-[#005698]/30 rounded-md hover:bg-[#005698]/10 transition-colors disabled:opacity-50'
										title='Przywróć członka'>
										{restoringId === member.id ? (
											<svg className='animate-spin h-4 w-4' fill='none' viewBox='0 0 24 24'>
												<circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4'></circle>
												<path
													className='opacity-75'
													fill='currentColor'
													d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'></path>
											</svg>
										) : (
											<ArrowUturnLeftIcon className='h-4 w-4' />
										)}
										Przywróć
									</button>
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<EditMemberModal
				isOpen={!!editingMember}
				onClose={() => setEditingMember(null)}
				member={editingMember}
				onSuccess={handleEditSuccess}
			/>

			<DeleteConfirmationModal
				isOpen={!!memberToDelete}
				onClose={() => setMemberToDelete(null)}
				onConfirm={confirmDeleteMember}
				title='Usuń członka'
				message={`Czy na pewno chcesz usunąć członka „${memberToDelete?.company || memberToDelete?.email || ''}"? Trafi do listy byłych członków — możesz go później przywrócić.`}
				confirmButtonText='Usuń członka'
				showNote
				noteLabel='Powód usunięcia (opcjonalnie)'
				notePlaceholder='np. rezygnacja z członkostwa, zaległości składkowe...'
			/>

			<ConfirmationModal
				isOpen={!!memberToRestore}
				onClose={() => setMemberToRestore(null)}
				onConfirm={confirmRestore}
				title='Przywróć członka'
				message={`Przywrócić członka „${memberToRestore?.company || memberToRestore?.email || ''}"? Wróci do aktywnej listy, spisu publicznego i listy mailingowej.`}
				confirmButtonText='Przywróć'
				isLoading={!!restoringId}
			/>
		</div>
	)
}

'use client'

import { useState, useEffect, useRef } from 'react'
import { UserGroupIcon, TrashIcon } from '@heroicons/react/24/outline'

export default function MemberBrowser() {
	const [members, setMembers] = useState([])
	const [isLoading, setIsLoading] = useState(true)
	const [deletingId, setDeletingId] = useState(null)
	const [currentPage, setCurrentPage] = useState(1)
	const [totalPages, setTotalPages] = useState(1)
	const [totalMembers, setTotalMembers] = useState(0)

	const topOfListComponent = useRef(null)
	const isInitialLoad = useRef(true)

	const fetchMembers = async (page = 1) => {
		setIsLoading(true)
		try {
			const response = await fetch(`/api/admin/members?page=${page}&limit=15`)
			if (!response.ok) throw new Error('Nie udało się pobrać listy członków.')
			const data = await response.json()
			setMembers(data.members)
			setTotalPages(data.totalPages)
			setCurrentPage(data.currentPage)
			setTotalMembers(data.totalMembers)
		} catch (error) {
			console.error(error)
			alert(error.message)
		} finally {
			setIsLoading(false)
		}
	}

	useEffect(() => {
		fetchMembers(1)
	}, [])

	useEffect(() => {
		if (!isInitialLoad.current && !isLoading) {
			topOfListComponent.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'nearest',
			})
		}

		if (isInitialLoad.current && !isLoading) {
			isInitialLoad.current = false
		}
	}, [isLoading])

	const handleDeleteMember = async memberId => {
		if (
			confirm(
				'Czy na pewno chcesz usunąć to konto członkowskie? Zgłoszenia historyczne zostaną zachowane, ale stracą powiązanie z tym kontem.'
			)
		) {
			setDeletingId(memberId)
			try {
				const response = await fetch(`/api/admin/members/${memberId}`, {
					method: 'DELETE',
				})
				if (!response.ok) throw new Error('Błąd podczas usuwania członka.')

				await fetchMembers(currentPage)
			} catch (error) {
				console.error(error)
				alert(error.message)
			} finally {
				setDeletingId(null)
			}
		}
	}

	return (
		<div className='p-2' ref={topOfListComponent}>
			<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
				<UserGroupIcon className='h-6 w-6 text-gray-500' />
				<h2 className='text-lg font-semibold text-gray-800'>Lista Członków ({totalMembers})</h2>
			</div>
			<div className='bg-white rounded-lg shadow'>
				{isLoading && <p className='p-4 text-center text-gray-500'>Ładowanie listy członków...</p>}
				{!isLoading && (
					<>
						<ul className='divide-y divide-gray-200'>
							{members.map(member => (
								<li key={member.id} className='flex items-center justify-between gap-3 px-4 py-3'>
									<div>
										<p className='text-sm font-medium text-gray-900'>{member.company || 'Brak nazwy'}</p>
										<p className='text-sm text-gray-500'>{member.email}</p>
									</div>
									<button
										onClick={() => handleDeleteMember(member.id)}
										disabled={deletingId === member.id}
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
								</li>
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
					</>
				)}
			</div>
		</div>
	)
}

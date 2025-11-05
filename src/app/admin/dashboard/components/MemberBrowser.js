'use client'

import { useState } from 'react'
import { UserGroupIcon } from '@heroicons/react/24/outline'

// Przykładowe dane (do zastąpienia danymi z API)
const MOCK_MEMBERS = [
	{ id: '1', email: 'firma_a@example.com', company: 'Firma A Sp. z o.o.' },
	{ id: '2', email: 'logistics_plus@example.com', company: 'Logistics Plus' },
	{ id: '3', email: 'test@example.com', company: 'Test Spedycja' },
]

export default function MemberBrowser() {
	const [members, setMembers] = useState(MOCK_MEMBERS)
	// W przyszłości tutaj trafi logika paginacji, wyszukiwania itp.

	return (
		<div className='p-2'>
			<div className='flex items-center gap-3 mb-4 p-4 bg-gray-50 border rounded-lg'>
				<UserGroupIcon className='h-6 w-6 text-gray-500' />
				<h2 className='text-lg font-semibold text-gray-800'>Lista Członków ({members.length})</h2>
			</div>
			<div className='bg-white rounded-lg shadow'>
				{/* Tutaj w przyszłości pojawi się pasek wyszukiwania */}
				<ul className='divide-y divide-gray-200'>
					{members.map(member => (
						<li key={member.id} className='px-4 py-3'>
							<p className='text-sm font-medium text-gray-900'>{member.company || 'Brak nazwy'}</p>
							<p className='text-sm text-gray-500'>{member.email}</p>
						</li>
					))}
				</ul>
				{/* Tutaj w przyszłości pojawi się paginacja */}
			</div>
		</div>
	)
}

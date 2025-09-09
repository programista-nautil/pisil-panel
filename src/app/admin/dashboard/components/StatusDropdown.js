import { Fragment } from 'react'
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react'

export default function StatusDropdown({ submission, onStatusChange }) {
	const statuses = {
		PENDING: { text: 'W trakcie', style: 'bg-yellow-100 text-yellow-800' },
		APPROVED: { text: 'Zweryfikowany', style: 'bg-blue-100 text-blue-800' },
		REJECTED: { text: 'Odrzucony', style: 'bg-red-100 text-red-800' },
		ACCEPTED: { text: 'Przyjęty', style: 'bg-green-100 text-green-800' },
	}
	// Wyznacz najdłuższą etykietę, aby wszystkie przyciski miały tę samą szerokość
	const longestLabel = Object.values(statuses).reduce((acc, s) => (s.text.length > acc.length ? s.text : acc), '')

	const currentStatus = statuses[submission.status] || { text: 'Nieznany', style: 'bg-gray-100 text-gray-800' }

	const availableOptions = Object.entries(statuses).filter(([statusKey]) => {
		// Pokaż "Przyjęty" tylko jeśli status to "Zweryfikowany"
		if (statusKey === 'ACCEPTED') {
			return submission.status === 'APPROVED'
		}
		// Nie pokazuj "Zweryfikowany", jeśli już jest "Przyjęty"
		if (statusKey === 'APPROVED' && submission.status === 'ACCEPTED') {
			return false
		}
		return true
	})

	return (
		<Menu as='div' className='relative inline-block text-left'>
			<div>
				<MenuButton
					className={`inline-flex items-center justify-center w-full rounded-full px-3 py-1 text-xs font-medium transition-colors hover:opacity-80 ${currentStatus.style}`}>
					{/* Opakowanie z siatką nakładającą elementy, aby placeholder wyznaczył szerokość */}
					<span className='inline-grid'>
						<span className='col-start-1 row-start-1'>{currentStatus.text}</span>
						<span aria-hidden='true' className='col-start-1 row-start-1 invisible whitespace-nowrap'>
							{longestLabel}
						</span>
					</span>
					<svg className='-mr-1 ml-1 h-4 w-4' viewBox='0 0 20 20' fill='currentColor'>
						<path
							fillRule='evenodd'
							d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z'
							clipRule='evenodd'
						/>
					</svg>
				</MenuButton>
			</div>

			<Transition
				as={Fragment}
				enter='transition ease-out duration-100'
				enterFrom='transform opacity-0 scale-95'
				enterTo='transform opacity-100 scale-100'
				leave='transition ease-in duration-75'
				leaveFrom='transform opacity-100 scale-100'
				leaveTo='transform opacity-0 scale-95'>
				<MenuItems className='absolute right-0 mt-2 w-40 origin-top-right divide-y divide-gray-100 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10'>
					<div className='px-1 py-1'>
						{availableOptions.map(([statusKey, { text }]) => (
							<MenuItem key={statusKey}>
								{({ active }) => (
									<button
										onClick={() => onStatusChange(submission, statusKey)}
										className={`${
											active ? 'bg-blue-500 text-white' : 'text-gray-900'
										} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
										{text}
									</button>
								)}
							</MenuItem>
						))}
					</div>
				</MenuItems>
			</Transition>
		</Menu>
	)
}

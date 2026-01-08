'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function EditMemberModal({ isOpen, onClose, member, onSuccess }) {
	const [email, setEmail] = useState('')
	const [phones, setPhones] = useState('')
	const [company, setCompany] = useState('')
	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (member) {
			setEmail(member.email || '')
			setPhones(member.phones || '')
			setCompany(member.company || '')
			setName(member.name || '')
			setAddress(member.address || '')
		}
	}, [member])

	if (!isOpen || !member) return null

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSubmitting(true)
		const loadingToast = toast.loading('Zapisywanie zmian...')

		try {
			const response = await fetch(`/api/admin/members/${member.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					email,
					phones,
					company,
					name,
					address,
				}),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się zaktualizować danych.')
			}

			toast.success('Dane członka zaktualizowane!', { id: loadingToast })
			onSuccess()
			onClose()
		} catch (error) {
			toast.error(error.message, { id: loadingToast })
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4'>
			<div className='bg-white rounded-lg shadow-xl p-6 w-full max-w-md' onClick={e => e.stopPropagation()}>
				<h3 className='text-lg font-bold text-[#005698] mb-4'>Edytuj dane kontaktowe</h3>
				<p className='text-sm text-gray-500 mb-4'>
					Edytujesz dane dla: <span className='font-medium text-gray-700'>{member.company}</span>
				</p>

				<form onSubmit={handleSubmit} className='space-y-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Nazwa firmy</label>
						<input
							type='text'
							value={company}
							onChange={e => setCompany(e.target.value)}
							required
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Reprezentant (Prezes/CEO)</label>
						<input
							type='text'
							value={name}
							onChange={e => setName(e.target.value)}
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Email</label>
						<input
							type='email'
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Adres firmy</label>
						<textarea
							value={address}
							onChange={e => setAddress(e.target.value)}
							rows={2}
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
							placeholder='Ulica, Kod Miasto'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Telefony</label>
						<input
							type='text'
							value={phones}
							onChange={e => setPhones(e.target.value)}
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
							placeholder='+48 123 456 789, +48 987...'
						/>
						<p className='text-xs text-gray-500 mt-1'>Możesz podać kilka numerów oddzielonych przecinkami.</p>
					</div>

					<div className='mt-6 flex justify-end gap-3'>
						<button
							type='button'
							onClick={onClose}
							disabled={isSubmitting}
							className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'>
							Anuluj
						</button>
						<button
							type='submit'
							disabled={isSubmitting}
							className='px-4 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/80 disabled:bg-[#005698]/80'>
							{isSubmitting ? 'Zapisywanie...' : 'Zapisz zmiany'}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

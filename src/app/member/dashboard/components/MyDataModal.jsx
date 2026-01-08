'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'
import {
	UserIcon,
	BuildingOfficeIcon,
	MapPinIcon,
	EnvelopeIcon,
	PhoneIcon,
	KeyIcon,
	XMarkIcon,
} from '@heroicons/react/24/outline'
import ChangePasswordModal from './ChangePasswordModal'

export default function MyDataModal({ isOpen, onClose }) {
	const { data: session, update } = useSession()
	const [formData, setFormData] = useState({
		company: '',
		name: '',
		address: '',
		email: '',
		phones: '',
		invoiceEmail: '',
		notificationEmails: '',
	})
	const [isLoading, setIsLoading] = useState(true)
	const [isSaving, setIsSaving] = useState(false)
	const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

	useEffect(() => {
		if (isOpen) {
			fetchProfileData()
		}
	}, [isOpen])

	const fetchProfileData = async () => {
		setIsLoading(true)
		try {
			const res = await fetch('/api/member/profile')
			if (!res.ok) throw new Error('Błąd pobierania danych')
			const data = await res.json()
			setFormData({
				company: data.company || '',
				name: data.name || '',
				address: data.address || '',
				email: data.email || '',
				phones: data.phones || '',
				invoiceEmail: data.invoiceEmail || '',
				notificationEmails: data.notificationEmails || '',
			})
		} catch (error) {
			toast.error('Nie udało się załadować danych profilu.')
			onClose()
		} finally {
			setIsLoading(false)
		}
	}

	const handleChange = e => {
		const { name, value } = e.target
		setFormData(prev => ({ ...prev, [name]: value }))
	}

	const handleSubmit = async e => {
		e.preventDefault()
		setIsSaving(true)
		const loadingToast = toast.loading('Zapisywanie zmian...')

		try {
			const res = await fetch('/api/member/profile', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData),
			})

			const data = await res.json()

			if (!res.ok) {
				throw new Error(data.message || 'Błąd zapisu')
			}

			await update({
				...session,
				user: {
					...session?.user,
					name: formData.name,
					email: formData.email,
				},
			})

			toast.success('Dane zostały zaktualizowane!', { id: loadingToast })
			onClose()
		} catch (error) {
			toast.error(error.message, { id: loadingToast })
		} finally {
			setIsSaving(false)
		}
	}

	if (!isOpen) return null

	return (
		<div className='fixed inset-0 bg-black/60 z-40 flex justify-center items-center p-4 backdrop-blur-sm'>
			<div className='bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col'>
				{/* Header */}
				<div className='flex justify-between items-center p-6 border-b sticky top-0 bg-white z-10'>
					<div>
						<h2 className='text-2xl font-bold text-[#005698]'>Moje Dane</h2>
						<p className='text-sm text-gray-500'>Zarządzaj informacjami o firmie i koncie.</p>
					</div>
					<button onClick={onClose} className='p-2 hover:bg-gray-100 rounded-full transition-colors'>
						<XMarkIcon className='h-6 w-6 text-gray-500' />
					</button>
				</div>

				{/* Content */}
				<div className='p-6 space-y-8'>
					{isLoading ? (
						<div className='flex justify-center py-12'>
							<div className='animate-spin rounded-full h-8 w-8 border-b-2 border-[#005698]'></div>
						</div>
					) : (
						<form id='profile-form' onSubmit={handleSubmit} className='space-y-6'>
							{/* Sekcja Firmy */}
							<div className='space-y-4'>
								<h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-1'>
									Dane Firmy
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Nazwa Firmy</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<BuildingOfficeIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												type='text'
												name='company'
												value={formData.company}
												onChange={handleChange}
												required
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600 '
											/>
										</div>
									</div>

									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Adres siedziby</label>
										<div className='relative'>
											<div className='absolute top-3 left-3 pointer-events-none'>
												<MapPinIcon className='h-5 w-5 text-gray-400' />
											</div>
											<textarea
												name='address'
												value={formData.address}
												onChange={handleChange}
												rows={2}
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600 '
												placeholder='Ulica, Kod Miasto'
											/>
										</div>
									</div>

									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Reprezentant (Prezes/CEO)</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<UserIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												type='text'
												name='name'
												value={formData.name}
												onChange={handleChange}
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600 '
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Sekcja Kontakt */}
							<div className='space-y-4 pt-4'>
								<h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-1'>
									Dane Kontaktowe
								</h3>

								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>
											Adres Email (Login i kontakt)
										</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<EnvelopeIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												type='email'
												name='email'
												value={formData.email}
												onChange={handleChange}
												required
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600 '
											/>
										</div>
									</div>

									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Email do faktur</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<EnvelopeIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												type='email'
												name='invoiceEmail'
												value={formData.invoiceEmail}
												onChange={handleChange}
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600'
											/>
										</div>
									</div>

									<div className='md:col-span-2'>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Adresy do komunikatów</label>
										<textarea
											name='notificationEmails'
											value={formData.notificationEmails}
											onChange={handleChange}
											rows={2}
											className='block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600'
											placeholder='jan@firma.pl, anna@firma.pl'
										/>
										<p className='text-xs text-gray-500 mt-1'>
											Na te adresy będą wysyłane komunikaty PISiL. Oddziel je przecinkami.
										</p>
									</div>

									<div>
										<label className='block text-sm font-medium text-gray-700 mb-1'>Telefony</label>
										<div className='relative'>
											<div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
												<PhoneIcon className='h-5 w-5 text-gray-400' />
											</div>
											<input
												type='text'
												name='phones'
												value={formData.phones}
												onChange={handleChange}
												className='pl-10 block w-full rounded-md border-gray-300 shadow-sm focus:border-[#005698] focus:ring-[#005698] sm:text-sm p-2.5 border text-gray-600 '
												placeholder='+48 123 456 789'
											/>
										</div>
									</div>
								</div>
							</div>

							{/* Sekcja Bezpieczeństwo */}
							<div className='space-y-4 pt-4'>
								<h3 className='text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-1'>
									Bezpieczeństwo
								</h3>
								<div className='flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200'>
									<div className='flex items-center gap-3'>
										<div className='bg-white p-2 rounded-full border'>
											<KeyIcon className='h-5 w-5 text-[#005698]' />
										</div>
										<div>
											<p className='font-medium text-gray-900'>Hasło do konta</p>
											<p className='text-xs text-gray-500'>Zalecamy okresową zmianę hasła.</p>
										</div>
									</div>
									<button
										type='button'
										onClick={() => setIsPasswordModalOpen(true)}
										className='text-sm font-medium text-[#005698] hover:text-[#004070] underline decoration-dotted'>
										Zmień hasło
									</button>
								</div>
							</div>
						</form>
					)}
				</div>

				{/* Footer */}
				<div className='p-6 border-t bg-gray-50 flex justify-end gap-3 rounded-b-xl'>
					<button
						type='button'
						onClick={onClose}
						className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors'>
						Anuluj
					</button>
					<button
						type='submit'
						form='profile-form'
						disabled={isSaving || isLoading}
						className='px-6 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:bg-[#005698]/70 shadow-sm transition-all'>
						{isSaving ? 'Zapisywanie...' : 'Zapisz zmiany'}
					</button>
				</div>
			</div>

			<ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
		</div>
	)
}

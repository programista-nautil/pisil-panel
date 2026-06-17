'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

export default function EditMemberModal({ isOpen, onClose, member, onSuccess }) {
	const [email, setEmail] = useState('')
	const [phones, setPhones] = useState('')
	const [fax, setFax] = useState('') // Nowe pole
	const [website, setWebsite] = useState('')
	const [company, setCompany] = useState('')
	const [name, setName] = useState('')
	const [address, setAddress] = useState('')
	const [invoiceEmail, setInvoiceEmail] = useState('')
	const [notificationEmails, setNotificationEmails] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	// Dane wewnętrzne (faktury / korespondencja / e-doręczenia)
	const [nip, setNip] = useState('')
	const [corrDifferent, setCorrDifferent] = useState(false)
	const [correspondenceAddress, setCorrespondenceAddress] = useState('')
	const [eDeliveryConsent, setEDeliveryConsent] = useState(false)
	const [eDeliveryEmailDifferent, setEDeliveryEmailDifferent] = useState(false)
	const [eDeliveryEmail, setEDeliveryEmail] = useState('')
	const [eDeliveryAddress, setEDeliveryAddress] = useState('')

	useEffect(() => {
		if (member) {
			setEmail(member.email || '')
			setPhones(member.phones || '')
			setFax(member.fax || '')
			setWebsite(member.website || '')
			setCompany(member.company || '')
			setName(member.name || '')
			setAddress(member.address || '')
			setInvoiceEmail(member.invoiceEmail || '')
			setNotificationEmails(member.notificationEmails || '')

			setNip(member.nip || '')
			setCorrespondenceAddress(member.correspondenceAddress || '')
			setCorrDifferent(!!member.correspondenceAddress)
			setEDeliveryConsent(!!member.eDeliveryConsent)
			setEDeliveryEmail(member.eDeliveryEmail || '')
			setEDeliveryEmailDifferent(!!member.eDeliveryEmail)
			setEDeliveryAddress(member.eDeliveryAddress || '')
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
					fax, // Wysłanie do API
					website, // Wysłanie do API
					company,
					name,
					address,
					notificationEmails,
					nip,
					invoiceEmail,
					// "puste = jak główne": odznaczony checkbox => '' (backend/eksport użyje wartości głównej)
					correspondenceAddress: corrDifferent ? correspondenceAddress : '',
					eDeliveryConsent,
					eDeliveryEmail: eDeliveryConsent && eDeliveryEmailDifferent ? eDeliveryEmail : '',
					eDeliveryAddress: eDeliveryConsent ? eDeliveryAddress : '',
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
			{/* Lekko poszerzony modal (max-w-lg), żeby siatka dobrze wyglądała */}
			<div
				className='bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto'
				onClick={e => e.stopPropagation()}>
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

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
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
							<label className='block text-sm font-medium text-gray-700'>Email główny</label>
							<input
								type='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
								required
								className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
							/>
						</div>
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

					<div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700'>Telefony</label>
							<input
								type='text'
								value={phones}
								onChange={e => setPhones(e.target.value)}
								className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
								placeholder='+48 123 456 789'
							/>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700'>Fax</label>
							<input
								type='text'
								value={fax}
								onChange={e => setFax(e.target.value)}
								className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
								placeholder='+48 123 456 789'
							/>
						</div>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Strona WWW</label>
						<input
							type='text'
							value={website}
							onChange={e => setWebsite(e.target.value)}
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
							placeholder='np. www.firma.pl'
						/>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Adresy do komunikatów</label>
						<textarea
							value={notificationEmails}
							onChange={e => setNotificationEmails(e.target.value)}
							rows={1}
							className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm text-gray-600'
							placeholder='jan@firma.pl'
						/>
					</div>

					{/* Dane wewnętrzne — nie trafiają na publiczną listę */}
					<div className='pt-4 mt-2 border-t border-gray-200 space-y-4'>
						<h4 className='text-sm font-semibold text-[#005698]'>Dane wewnętrzne (faktury / korespondencja)</h4>

						<div>
							<label className='block text-sm font-medium text-gray-700'>NIP</label>
							<input
								type='text'
								value={nip}
								onChange={e => setNip(e.target.value)}
								className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
								placeholder='np. 123-456-78-90'
							/>
						</div>

						{/* Adres korespondencyjny */}
						<div>
							<label className='flex items-center gap-2 text-sm font-medium text-gray-700'>
								<input
									type='checkbox'
									checked={corrDifferent}
									onChange={e => setCorrDifferent(e.target.checked)}
									className='h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]'
								/>
								Adres do korespondencji inny niż rejestrowy
							</label>
							{corrDifferent && (
								<textarea
									value={correspondenceAddress}
									onChange={e => setCorrespondenceAddress(e.target.value)}
									rows={2}
									className='mt-2 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
									placeholder='Ulica, Kod Miasto'
								/>
							)}
						</div>

						{/* E-mail do faktur */}
						<div>
							<label className='block text-sm font-medium text-gray-700'>E-mail do faktur</label>
							<input
								type='email'
								value={invoiceEmail}
								onChange={e => setInvoiceEmail(e.target.value)}
								className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
								placeholder='faktury@firma.pl'
							/>
						</div>

						{/* Zgoda na wysyłkę elektroniczną */}
						<div>
							<label className='flex items-center gap-2 text-sm font-medium text-gray-700'>
								<input
									type='checkbox'
									checked={eDeliveryConsent}
									onChange={e => setEDeliveryConsent(e.target.checked)}
									className='h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]'
								/>
								Zgoda na wysyłkę drogą elektroniczną
							</label>
							{eDeliveryConsent && (
								<div className='mt-2 pl-6 space-y-3'>
									<div>
										<label className='flex items-center gap-2 text-sm text-gray-700'>
											<input
												type='checkbox'
												checked={eDeliveryEmailDifferent}
												onChange={e => setEDeliveryEmailDifferent(e.target.checked)}
												className='h-4 w-4 rounded border-gray-300 text-[#005698] focus:ring-[#005698]'
											/>
											Inny e-mail do e-wysyłki niż główny
										</label>
										{eDeliveryEmailDifferent && (
											<input
												type='email'
												value={eDeliveryEmail}
												onChange={e => setEDeliveryEmail(e.target.value)}
												className='mt-2 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
												placeholder='e-wysylka@firma.pl'
											/>
										)}
									</div>
									<div>
										<label className='block text-sm font-medium text-gray-700'>Adres e-doręczeń (ADE)</label>
										<input
											type='text'
											value={eDeliveryAddress}
											onChange={e => setEDeliveryAddress(e.target.value)}
											className='mt-1 block w-full rounded-md border-gray-300 border p-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-600'
											placeholder='AE:PL-XXXXX-XXXXX-XXXXX-XX'
										/>
									</div>
								</div>
							)}
						</div>
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

'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { MultiAttachmentInput, AttachmentInput } from './AttachmentInputs'
import toast from 'react-hot-toast'
import { CheckCircleIcon, UserPlusIcon, DocumentCheckIcon } from '@heroicons/react/24/outline'

export default function AddSubmissionModal({ isOpen, onClose, onFormSubmit }) {
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors },
	} = useForm()
	const formType = watch('formType', 'DEKLARACJA_CZLONKOWSKA')

	const [initialStatus, setInitialStatus] = useState('PENDING')
	const [shouldSendEmails, setShouldSendEmails] = useState(true)

	const [mainPdf, setMainPdf] = useState(null)
	const [additionalFiles, setAdditionalFiles] = useState([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	const [acceptanceDate, setAcceptanceDate] = useState(new Date().toISOString().split('T')[0])

	useEffect(() => {
		if (isOpen) {
			reset({
				formType: 'DEKLARACJA_CZLONKOWSKA',
				companyName: '',
				email: '',
				ceoName: '',
				address: '',
				phones: '',
				invoiceEmail: '',
				notificationEmails: '',
			})

			setMainPdf(null)
			setAdditionalFiles([])
			setInitialStatus('PENDING')
			setShouldSendEmails(true)
			setAcceptanceDate(new Date().toISOString().split('T')[0])
		}
	}, [isOpen, reset])

	if (!isOpen) {
		return null
	}

	const handleFileChange = e => {
		if (e.target.files && e.target.files[0]) {
			setMainPdf(e.target.files[0])
		}
	}

	const handleFinalSubmit = async data => {
		if (!mainPdf) {
			toast.error('Proszę dodać główny plik PDF.')
			return
		}
		setIsSubmitting(true)
		try {
			await onFormSubmit(data, mainPdf, additionalFiles, initialStatus, shouldSendEmails, acceptanceDate)
		} catch (error) {
			console.error('Błąd podczas dodawania zgłoszenia:', error)
			toast.error('Wystąpił błąd podczas dodawania zgłoszenia.')
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='fixed inset-0 bg-gray-900/50 z-40 flex justify-center items-center' role='dialog' aria-modal='true'>
			<div
				className='bg-white rounded-lg shadow-xl m-4 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all animate-fade-in-scale'
				onClick={e => e.stopPropagation()}>
				<form className='p-6 space-y-4 overflow-y-auto flex-grow' onSubmit={handleSubmit(handleFinalSubmit)}>
					<h2 className='text-2xl font-bold text-gray-800'>Dodaj nowe zgłoszenie</h2>

					<div className='space-y-4'>
						{/* Typ Formularza */}
						<div>
							<label htmlFor='formType' className='block text-sm font-medium text-gray-700'>
								Typ formularza <span className='text-red-500'>*</span>
							</label>
							<select
								id='formType'
								{...register('formType', { required: 'To pole jest wymagane.' })}
								className='mt-1 block w-full pl-3 pr-10 py-2 text-base border-1 border-solid border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md text-gray-500'>
								<option value='DEKLARACJA_CZLONKOWSKA'>Deklaracja Członkowska</option>
								<option value='PATRONAT'>Patronat</option>
								<option value='ANKIETA_SPEDYTOR_ROKU'>Ankieta Spedytor Roku</option>
								<option value='MLODY_SPEDYTOR_ROKU'>Młody Spedytor Roku</option>
							</select>
							{errors.formType && <p className='text-red-500 text-xs mt-1'>{errors.formType.message}</p>}
						</div>

						{/* Nazwa Firmy */}
						<div>
							<label htmlFor='companyName' className='block text-sm font-medium text-gray-700'>
								{formType === 'DEKLARACJA_CZLONKOWSKA' ? 'Nazwa firmy' : 'Nazwa organizatora'}{' '}
								<span className='text-red-500'>*</span>
							</label>
							<input
								type='text'
								id='companyName'
								{...register('companyName', { required: 'To pole jest wymagane.' })}
								className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
							/>
							{errors.companyName && <p className='text-red-500 text-xs mt-1'>{errors.companyName.message}</p>}
						</div>

						{/* Email */}
						<div>
							<label htmlFor='email' className='block text-sm font-medium text-gray-700'>
								Email kontaktowy <span className='text-red-500'>*</span>
							</label>
							<input
								type='email'
								id='email'
								{...register('email', { required: 'To pole jest wymagane.' })}
								className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
							/>
							{errors.email && <p className='text-red-500 text-xs mt-1'>{errors.email.message}</p>}
						</div>

						<div>
							<label htmlFor='phones' className='block text-sm font-medium text-gray-700'>
								Numery telefonu
							</label>
							<input
								type='text'
								id='phones'
								{...register('phones')}
								className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
							/>
							<p className='text-xs text-gray-500 mt-1'>Możesz podać kilka numerów oddzielonych przecinkami.</p>
						</div>

						{formType === 'DEKLARACJA_CZLONKOWSKA' && (
							<>
								<div>
									<label htmlFor='ceoName' className='block text-sm font-medium text-gray-700'>
										Imię i nazwisko prezesa/CEO <span className='text-red-500'>*</span>
									</label>
									<input
										type='text'
										id='ceoName'
										{...register('ceoName', { required: 'To pole jest wymagane.' })}
										className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
									/>
									{errors.ceoName && <p className='text-red-500 text-xs mt-1'>{errors.ceoName.message}</p>}
								</div>

								<div>
									<label htmlFor='address' className='block text-sm font-medium text-gray-700'>
										Dokładny adres <span className='text-red-500'>*</span>
									</label>
									<input
										type='text'
										id='address'
										{...register('address', { required: 'To pole jest wymagane.' })}
										className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
									/>
									{errors.address && <p className='text-red-500 text-xs mt-1'>{errors.address.message}</p>}
								</div>
								<div>
									<label htmlFor='invoiceEmail' className='block text-sm font-medium text-gray-700'>
										Email do faktur
									</label>
									<input
										type='email'
										id='invoiceEmail'
										{...register('invoiceEmail')}
										className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
										placeholder='faktury@firma.pl'
									/>
								</div>

								<div>
									<label htmlFor='notificationEmails' className='block text-sm font-medium text-gray-700'>
										Adresy do komunikatów
									</label>
									<textarea
										id='notificationEmails'
										{...register('notificationEmails')}
										rows={2}
										className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
										placeholder='jan@firma.pl, anna@firma.pl'
									/>
									<p className='text-xs text-gray-500'>Możesz podać kilka adresów oddzielonych przecinkami.</p>
								</div>
							</>
						)}

						{/* Główny plik PDF */}
						<AttachmentInput
							file={mainPdf}
							onFileChange={handleFileChange}
							label={
								<>
									Główny plik PDF <span className='text-red-500'>*</span>
								</>
							}
							accept='.pdf'
						/>
						{(formType === 'DEKLARACJA_CZLONKOWSKA' || formType === 'PATRONAT') && (
							<MultiAttachmentInput
								files={additionalFiles}
								onFilesChange={e => setAdditionalFiles(prev => [...prev, ...Array.from(e.target.files)])}
								onFileRemove={index => setAdditionalFiles(prev => prev.filter((_, i) => i !== index))}
							/>
						)}

						{formType === 'DEKLARACJA_CZLONKOWSKA' && (
							<div className='mt-6 pt-6 border-t border-gray-200'>
								<h3 className='text-sm font-medium text-gray-900 mb-3'>Status początkowy zgłoszenia</h3>
								<div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
									<div
										onClick={() => setInitialStatus('PENDING')}
										className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
											initialStatus === 'PENDING'
												? 'border-[#005698] ring-1 ring-[#005698] bg-blue-50'
												: 'border-gray-300 bg-white hover:bg-gray-50'
										}`}>
										<div className='flex w-full items-center justify-between'>
											<div className='flex items-center'>
												<div className='text-sm'>
													<p
														className={`font-medium ${
															initialStatus === 'PENDING' ? 'text-[#005698]' : 'text-gray-900'
														}`}>
														W trakcie
													</p>
													<p className='text-xs text-gray-500'>Tylko zapisz zgłoszenie</p>
												</div>
											</div>
											{initialStatus === 'PENDING' && <CheckCircleIcon className='h-5 w-5 text-[#005698]' />}
										</div>
									</div>

									<div
										onClick={() => setInitialStatus('APPROVED')}
										className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
											initialStatus === 'APPROVED'
												? 'border-[#005698] ring-1 ring-[#005698] bg-blue-50'
												: 'border-gray-300 bg-white hover:bg-gray-50'
										}`}>
										<div className='flex w-full items-center justify-between'>
											<div className='flex items-center'>
												<div className='text-sm'>
													<p
														className={`font-medium ${
															initialStatus === 'APPROVED' ? 'text-[#005698]' : 'text-gray-900'
														}`}>
														Zweryfikowany
													</p>
													<p className='text-xs text-gray-500'>Generuj komunikat</p>
												</div>
											</div>
											{initialStatus === 'APPROVED' && <DocumentCheckIcon className='h-5 w-5 text-[#005698]' />}
										</div>
									</div>

									<div
										onClick={() => setInitialStatus('ACCEPTED')}
										className={`relative flex cursor-pointer rounded-lg border p-4 shadow-sm focus:outline-none ${
											initialStatus === 'ACCEPTED'
												? 'border-[#005698] ring-1 ring-[#005698] bg-blue-50'
												: 'border-gray-300 bg-white hover:bg-gray-50'
										}`}>
										<div className='flex w-full items-center justify-between'>
											<div className='flex items-center'>
												<div className='text-sm'>
													<p
														className={`font-medium ${
															initialStatus === 'ACCEPTED' ? 'text-[#005698]' : 'text-gray-900'
														}`}>
														Przyjęty
													</p>
													<p className='text-xs text-gray-500'>Stwórz konto członka</p>
												</div>
											</div>
											{initialStatus === 'ACCEPTED' && <UserPlusIcon className='h-5 w-5 text-[#005698]' />}
										</div>
									</div>
								</div>

								{initialStatus === 'APPROVED' && (
									<div className='mt-4 p-3 bg-gray-50 rounded-md border border-gray-200 animate-fade-in'>
										<div className='flex items-start'>
											<div className='flex items-center h-5'>
												<input
													id='shouldSendEmails'
													type='checkbox'
													checked={shouldSendEmails}
													onChange={e => setShouldSendEmails(e.target.checked)}
													className='focus:ring-[#005698] h-4 w-4 text-[#005698] border-gray-300 rounded'
												/>
											</div>
											<div className='ml-3 text-sm'>
												<label htmlFor='shouldSendEmails' className='font-medium text-gray-700'>
													Wyślij powiadomienia e-mail
												</label>
												<p className='text-gray-500 text-xs'>Do kandydata i członków (masowo).</p>
											</div>
										</div>
									</div>
								)}

								{initialStatus === 'ACCEPTED' && (
									<div className='mt-4 p-4 bg-blue-50 rounded-md border border-blue-100 animate-fade-in space-y-3'>
										<div>
											<label htmlFor='acceptanceDate' className='block text-sm font-medium text-blue-900 mb-1'>
												Data uchwały (Do dokumentów)
											</label>
											<input
												type='date'
												id='acceptanceDate'
												value={acceptanceDate}
												onChange={e => setAcceptanceDate(e.target.value)}
												className='block w-full rounded-md border-blue-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-700'
											/>
										</div>
										<p className='text-xs text-blue-500'>
											<strong>Uwaga:</strong> Zostanie utworzone konto członka (hasło: 2015pisil, wymuszona zmiana).
											Zostaną wygenerowane dokumenty przyjęcia. Maile powitalne zostaną wysłane do Admina i nowego
											Członka.
										</p>
									</div>
								)}
							</div>
						)}
					</div>

					<div className='mt-8 flex justify-end gap-3'>
						<button
							type='button'
							onClick={onClose}
							className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'>
							Anuluj
						</button>
						<button
							type='submit'
							disabled={isSubmitting}
							className='px-4 py-2 text-sm font-medium text-white bg-[#005698] border border-transparent rounded-md hover:bg-[#005698]/80 disabled:bg-[#005698]/80'>
							{isSubmitting ? (
								<>
									<svg className='animate-spin -ml-1 mr-2 h-4 w-4 text-white' fill='none' viewBox='0 0 24 24'>
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
									Dodawanie ...
								</>
							) : (
								'Dodaj zgłoszenie'
							)}
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

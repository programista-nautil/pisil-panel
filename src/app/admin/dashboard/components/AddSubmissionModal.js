'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { MultiAttachmentInput, AttachmentInput } from './AttachmentInputs'

export default function AddSubmissionModal({ isOpen, onClose, onFormSubmit }) {
	const {
		register,
		handleSubmit,
		reset,
		watch,
		formState: { errors },
	} = useForm()
	const formType = watch('formType', 'DEKLARACJA_CZLONKOWSKA')

	const [mainPdf, setMainPdf] = useState(null)
	const [additionalFiles, setAdditionalFiles] = useState([])
	const [isSubmitting, setIsSubmitting] = useState(false)

	useEffect(() => {
		if (isOpen) {
			reset({
				formType: 'DEKLARACJA_CZLONKOWSKA',
				companyName: '',
				email: '',
				ceoName: '',
				address: '',
				phones: '',
			})

			setMainPdf(null)
			setAdditionalFiles([])
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
			alert('Proszę dodać główny plik PDF.')
			return
		}
		setIsSubmitting(true)
		try {
			await onFormSubmit(data, mainPdf, additionalFiles)
		} catch (error) {
			console.error('Błąd podczas dodawania zgłoszenia:', error)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div
			className='fixed inset-0 bg-gray-900/50 z-40 flex justify-center items-center'
			onClick={onClose}
			role='dialog'
			aria-modal='true'>
			<div
				className='bg-white rounded-lg shadow-xl p-6 m-4 max-w-2xl w-full transform transition-all animate-fade-in-scale'
				onClick={e => e.stopPropagation()}>
				<form onSubmit={handleSubmit(handleFinalSubmit)}>
					<h2 className='text-2xl font-bold text-gray-800 mb-6'>Dodaj nowe zgłoszenie</h2>

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
								Nazwa firmy / Organizatora <span className='text-red-500'>*</span>
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
								Numer telefonu
							</label>
							<input
								type='text'
								id='phones'
								{...register('phones')}
								className='mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-gray-500'
							/>
						</div>

						{formType === 'DEKLARACJA_CZLONKOWSKA' && (
							<>
								<div>
									<label htmlFor='ceoName' className='block text-sm font-medium text-gray-700'>
										Imię i nazwisko kierownika <span className='text-red-500'>*</span>
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
							className='px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:bg-blue-300'>
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

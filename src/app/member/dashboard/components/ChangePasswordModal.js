'use client'

import { useState } from 'react'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function ChangePasswordModal({ isOpen, onClose }) {
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [successMessage, setSuccessMessage] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const [showCurrent, setShowCurrent] = useState(false)
	const [showNew, setShowNew] = useState(false)
	const [showConfirm, setShowConfirm] = useState(false)

	if (!isOpen) return null

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')
		setSuccessMessage('')

		if (newPassword !== confirmPassword) {
			setError('Nowe hasła nie są identyczne.')
			return
		}

		setIsSubmitting(true)

		try {
			const response = await fetch('/api/member/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword }),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Wystąpił błąd.')
			}

			setSuccessMessage('Hasło zostało zmienione!')
			// Wyczyść formularz po sukcesie
			setCurrentPassword('')
			setNewPassword('')
			setConfirmPassword('')

			// Zamknij modal po 2 sekundach
			setTimeout(() => {
				onClose()
				setSuccessMessage('')
			}, 2000)
		} catch (err) {
			setError(err.message)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='fixed inset-0 bg-gray-900/50 z-50 flex justify-center items-center' onClick={onClose}>
			<div className='bg-white rounded-lg shadow-xl p-6 m-4 max-w-md w-full' onClick={e => e.stopPropagation()}>
				<h2 className='text-xl font-bold text-gray-900 mb-4'>Zmień hasło</h2>

				{successMessage ? (
					<div className='text-center py-4'>
						<p className='text-green-600 font-medium'>{successMessage}</p>
					</div>
				) : (
					<form onSubmit={handleSubmit} className='space-y-4'>
						<div>
							<label className='block text-sm font-medium text-gray-700'>Obecne hasło</label>
							<div className='relative mt-1'>
								<input
									type={showCurrent ? 'text' : 'password'}
									value={currentPassword}
									onChange={e => setCurrentPassword(e.target.value)}
									required
									className='mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-600 pr-10'
								/>
								<button
									type='button'
									onClick={() => setShowCurrent(!showCurrent)}
									className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
									{showCurrent ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
								</button>
							</div>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700'>Nowe hasło</label>
							<div className='relative mt-1'>
								<input
									type={showNew ? 'text' : 'password'}
									value={newPassword}
									onChange={e => setNewPassword(e.target.value)}
									required
									className='mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-600 pr-10'
								/>
								<button
									type='button'
									onClick={() => setShowNew(!showNew)}
									className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
									{showNew ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
								</button>
							</div>
						</div>
						<div>
							<label className='block text-sm font-medium text-gray-700'>Powtórz nowe hasło</label>
							<div className='relative mt-1'>
								<input
									type={showConfirm ? 'text' : 'password'}
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									required
									className='mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border text-gray-600 pr-10'
								/>
								<button
									type='button'
									onClick={() => setShowConfirm(!showConfirm)}
									className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
									{showConfirm ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
								</button>
							</div>
						</div>

						{/* Lista wymagań (dla przypomnienia) */}
						<div className='text-xs text-gray-500 space-y-1'>
							<p>Wymagania:</p>
							<ul className='list-disc list-inside pl-1'>
								<li>Min. 8 znaków, duża i mała litera, cyfra, znak specjalny.</li>
							</ul>
						</div>

						{error && <p className='text-red-600 text-sm'>{error}</p>}

						<div className='flex justify-end gap-3 pt-2'>
							<button
								type='button'
								onClick={() => {
									setCurrentPassword('')
									setNewPassword('')
									setConfirmPassword('')
									setShowCurrent(false)
									setShowNew(false)
									setShowConfirm(false)
									onClose()
								}}
								className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50'>
								Anuluj
							</button>
							<button
								type='submit'
								disabled={isSubmitting}
								className='px-6 py-2 text-sm font-medium text-white bg-[#005698] rounded-md hover:bg-[#005698]/90 disabled:bg-[#005698]/70 shadow-sm transition-all'>
								{isSubmitting ? 'Zapisywanie...' : 'Zmień hasło'}
							</button>
						</div>
					</form>
				)}
			</div>
		</div>
	)
}

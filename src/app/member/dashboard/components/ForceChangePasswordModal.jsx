'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { LockClosedIcon, EyeIcon, EyeSlashIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'

export default function ForceChangePasswordModal() {
	const { data: session, update } = useSession()

	const [passwords, setPasswords] = useState({
		newPassword: '',
		confirmPassword: '',
	})

	const [showNewPassword, setShowNewPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const [error, setError] = useState('')

	const [isSubmitting, setIsSubmitting] = useState(false)

	if (!session?.user?.mustChangePassword) return null

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')

		if (passwords.newPassword !== passwords.confirmPassword) {
			setError('Nowe hasła nie są identyczne')
			return
		}

		if (passwords.newPassword.length < 8) {
			setError('Hasło musi mieć min. 8 znaków')
			return
		}

		setIsSubmitting(true)

		try {
			const res = await fetch('/api/member/change-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					newPassword: passwords.newPassword,
				}),
			})

			const data = await res.json()

			if (!res.ok) throw new Error(data.message || 'Błąd zmiany hasła')

			await update({
				...session,
				user: {
					...session?.user,
					mustChangePassword: false,
				},
			})
		} catch (error) {
			setError(error.message)
		} finally {
			setIsSubmitting(false)
		}
	}

	return (
		<div className='fixed inset-0 bg-gray-900/90 backdrop-blur-sm z-[9999] flex justify-center items-center p-4'>
			<div className='bg-white rounded-xl shadow-2xl w-full max-w-md p-8 border-t-4 border-[#005698]'>
				<div className='text-center mb-6'>
					<div className='mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-[#005698] mb-4'>
						<LockClosedIcon className='h-6 w-6 text-white' />
					</div>
					<h2 className='text-2xl font-bold text-gray-900'>Wymagana zmiana hasła</h2>
					<p className='mt-2 text-sm text-gray-600'>
						Ze względów bezpieczeństwa prosimy o ustawienie nowego, unikalnego hasła przed rozpoczęciem korzystania z
						panelu.
					</p>
				</div>

				{error && (
					<div className='mb-4 bg-red-50 border-l-4 border-red-500 p-4'>
						<div className='flex'>
							<div className='flex-shrink-0'>
								<ExclamationCircleIcon className='h-5 w-5 text-red-400' aria-hidden='true' />
							</div>
							<div className='ml-3'>
								<p className='text-sm text-red-700'>{error}</p>
							</div>
						</div>
					</div>
				)}

				<form onSubmit={handleSubmit} className='space-y-4'>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Nowe hasło</label>
						<div className='relative mt-1'>
							<input
								type={showNewPassword ? 'text' : 'password'}
								required
								minLength={8}
								className='block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 border p-2 pr-10 text-gray-600'
								value={passwords.newPassword}
								onChange={e => setPasswords({ ...passwords, newPassword: e.target.value })}
							/>
							<button
								type='button'
								onClick={() => setShowNewPassword(!showNewPassword)}
								className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
								{showNewPassword ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
							</button>
						</div>
					</div>

					<div>
						<label className='block text-sm font-medium text-gray-700'>Powtórz nowe hasło</label>
						<div className='relative mt-1'>
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								required
								minLength={8}
								className='block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 border p-2 pr-10 text-gray-600'
								value={passwords.confirmPassword}
								onChange={e => setPasswords({ ...passwords, confirmPassword: e.target.value })}
							/>
							<button
								type='button'
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
								{showConfirmPassword ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
							</button>
						</div>
					</div>

					<button
						type='submit'
						disabled={isSubmitting}
						className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#005698] hover:bg-[#005698]/90 disabled:bg-[#005698]/70 disabled:opacity-50 mt-6'>
						{isSubmitting ? 'Zapisywanie...' : 'Zmień hasło i przejdź do panelu'}
					</button>
				</form>
			</div>
		</div>
	)
}

'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/
const PASSWORD_ERROR_MESSAGE =
	'Hasło musi mieć minimum 8 znaków, 1 dużą literę, 1 małą literę, 1 cyfrę i 1 znak specjalny.'

function ResetPasswordForm() {
	const router = useRouter()
	const searchParams = useSearchParams() // To powodowało błąd, teraz jest bezpieczne wewnątrz Suspense
	const token = searchParams.get('token')

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')
		setMessage('')

		if (!token) {
			setError('Brak tokenu. Wygeneruj nowy link do resetu.')
			return
		}
		if (password !== confirmPassword) {
			setError('Hasła nie są identyczne.')
			return
		}

		if (!PASSWORD_REGEX.test(password)) {
			setError(PASSWORD_ERROR_MESSAGE)
			return
		}

		try {
			const response = await fetch('/api/member/reset-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password }),
			})

			const data = await response.json()
			if (!response.ok) {
				throw new Error(data.message || 'Wystąpił błąd.')
			}

			setMessage('Hasło zostało pomyślnie zmienione. Możesz się teraz zalogować.')
			setTimeout(() => router.push('/logowanie-czlonka'), 3000)
		} catch (error) {
			setError(error.message)
		}
	}

	return (
		<>
			<h2 className='text-2xl font-bold text-center text-gray-900 mb-6'>Ustaw nowe hasło</h2>
			{message ? (
				<p className='text-green-600 text-sm text-center'>{message}</p>
			) : (
				<form onSubmit={handleSubmit} className='space-y-6'>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Nowe hasło</label>
						<div className='relative mt-1'>
							<input
								type={showPassword ? 'text' : 'password'}
								value={password}
								onChange={e => setPassword(e.target.value)}
								required
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-600 pr-10'
							/>
							<button
								type='button'
								onClick={() => setShowPassword(!showPassword)}
								className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
								{showPassword ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
							</button>
						</div>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Potwierdź hasło</label>
						<div className='relative mt-1'>
							<input
								type={showConfirmPassword ? 'text' : 'password'}
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								required
								className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-600 pr-10'
							/>
							<button
								type='button'
								onClick={() => setShowConfirmPassword(!showConfirmPassword)}
								className='absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600'>
								{showConfirmPassword ? <EyeSlashIcon className='h-5 w-5' /> : <EyeIcon className='h-5 w-5' />}
							</button>
						</div>
					</div>
					<div className='text-xs text-gray-500 space-y-1'>
						<p>Hasło musi zawierać:</p>
						<ul className='list-disc list-inside pl-2'>
							<li>Minimum 8 znaków</li>
							<li>Co najmniej jedną dużą literę (A-Z)</li>
							<li>Co najmniej jedną małą literę (a-z)</li>
							<li>Co najmniej jedną cyfrę (0-9)</li>
							<li>Co najmniej jeden znak specjalny (np. @$!%*?&)</li>
						</ul>
					</div>
					{error && <p className='text-red-500 text-sm text-center'>{error}</p>}
					<div>
						<button
							type='submit'
							className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700'>
							Zapisz nowe hasło
						</button>
					</div>
				</form>
			)}
		</>
	)
}

export default function ResetPasswordPage() {
	return (
		<div className='h-full bg-gray-50 flex items-center justify-center'>
			<div className='max-w-md w-full bg-white p-8 rounded-lg shadow-md'>
				<Suspense fallback={<div className='text-center p-4'>Ładowanie formularza...</div>}>
					<ResetPasswordForm />
				</Suspense>
			</div>
		</div>
	)
}

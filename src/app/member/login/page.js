'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline'

export default function MemberLoginPage() {
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [showPassword, setShowPassword] = useState(false)
	const router = useRouter()

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')

		const result = await signIn('member-credentials', {
			redirect: false,
			email, // Używamy email jako loginu
			password,
		})

		if (result.error) {
			setError('Nieprawidłowy adres e-mail lub hasło. Spróbuj ponownie.')
		} else {
			router.push('/panel-czlonka')
		}
	}

	const handleForgotPassword = async () => {
		setError('')
		setMessage('')
		if (!email) {
			setError('Wpisz adres e-mail, aby zresetować hasło.')
			return
		}
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
		if (!emailRegex.test(email)) {
			setError('Wpisz poprawny format adresu e-mail.')
			return
		}
		setMessage('Przetwarzanie...')

		try {
			const response = await fetch('/api/member/forgot-password', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email }),
			})

			const data = await response.json()
			if (!response.ok) {
				throw new Error(data.message || 'Wystąpił błąd.')
			}
			setMessage('Jeśli konto istnieje, wysłano link do resetu hasła.')
		} catch (error) {
			setError(error.message)
			setMessage('')
		}
	}

	return (
		<div className='h-full bg-gray-50 flex items-center justify-center'>
			<div className='max-w-md w-full bg-white p-8 rounded-lg shadow-md'>
				<h2 className='text-2xl font-bold text-center text-[#005698] mb-6'>Logowanie do Panelu Członka</h2>
				<form onSubmit={handleSubmit} className='space-y-6'>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Adres e-mail</label>
						<input
							type='email'
							value={email}
							onChange={e => setEmail(e.target.value)}
							required
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-600'
						/>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Hasło</label>
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
					{error && <p className='text-red-500 text-sm text-center'>{error}</p>}
					{message && <p className='text-green-600 text-sm text-center'>{message}</p>}
					<div>
						<button
							type='submit'
							className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#005698] hover:bg-[#00447a]'>
							Zaloguj się
						</button>
					</div>
				</form>
				<div className='text-center mt-4'>
					<button
						type='button'
						onClick={handleForgotPassword}
						className='text-sm font-medium text-[#005698] hover:text-[#00447a]'>
						Nie pamiętasz hasła?
					</button>
				</div>
			</div>
		</div>
	)
}

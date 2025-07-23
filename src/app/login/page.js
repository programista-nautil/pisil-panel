'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
	const [username, setUsername] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const router = useRouter()

	const handleSubmit = async e => {
		e.preventDefault()
		setError('')

		const result = await signIn('credentials', {
			redirect: false,
			username,
			password,
		})

		if (result.error) {
			setError('Nieprawidłowe dane logowania. Spróbuj ponownie.')
		} else {
			router.push('/admin/dashboard')
		}
	}

	return (
		<div className='min-h-screen bg-gray-50 flex items-center justify-center'>
			<div className='max-w-md w-full bg-white p-8 rounded-lg shadow-md'>
				<h2 className='text-2xl font-bold text-center text-gray-900 mb-6'>Logowanie do Panelu</h2>
				<form onSubmit={handleSubmit} className='space-y-6'>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Nazwa użytkownika</label>
						<input
							type='text'
							value={username}
							onChange={e => setUsername(e.target.value)}
							required
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-600'
						/>
					</div>
					<div>
						<label className='block text-sm font-medium text-gray-700'>Hasło</label>
						<input
							type='password'
							value={password}
							onChange={e => setPassword(e.target.value)}
							required
							className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-gray-600'
						/>
					</div>
					{error && <p className='text-red-500 text-sm text-center'>{error}</p>}
					<div>
						<button
							type='submit'
							className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700'>
							Zaloguj się
						</button>
					</div>
				</form>
			</div>
		</div>
	)
}

'use client'

import MultiStepForm from '@/components/MultiStepForm'
import { patronatFormConfig } from './formConfig'
import BackButton from '@/components/BackButton'

export default function PatronatFormPage() {
	return (
		<div className='min-h-screen bg-gray-50'>
			<div className='max-w-4xl mx-auto py-8 px-4'>
				<BackButton />
				<header className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-gray-900 mb-2'>Wniosek o Patronat</h1>
					<p className='text-gray-600'>Wypełnij formularz, aby ubiegać się o patronat PISiL.</p>
				</header>
				<MultiStepForm formConfig={patronatFormConfig} />
			</div>
		</div>
	)
}

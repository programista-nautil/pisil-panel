'use client'

import MultiStepForm from '@/components/MultiStepForm'
import { ankietaSpedytorRokuConfig } from './formConfig'
import BackButton from '@/components/BackButton'

export default function AnkietaSpedytorRokuPage() {
	return (
		<div className='min-h-screen bg-gray-50'>
			<BackButton />
			<div className='max-w-4xl mx-auto py-8 px-4'>
				<header className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-[#005698] mb-2'>Ankieta Spedytor Roku</h1>
					<p className='text-gray-600'>Wypełnij ankietę konkursową.</p>
				</header>
				<MultiStepForm formConfig={ankietaSpedytorRokuConfig} />
			</div>
		</div>
	)
}

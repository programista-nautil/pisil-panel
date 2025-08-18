'use client'

import MultiStepForm from '@/components/MultiStepForm'
import { mlodySpedytorRokuConfig } from './formConfig'
import BackButton from '@/components/BackButton'

export default function MlodySpedytorRokuPage() {
	return (
		<div className='min-h-screen bg-gray-50'>
			<BackButton />
			<div className='max-w-4xl mx-auto py-8 px-4'>
				<header className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-gray-900 mb-2'>Konkurs &quot;Młody Spedytor Roku&quot;</h1>
					<p className='text-gray-600'>Formularz zgłoszenia kandydata do udziału w konkursie.</p>
				</header>
				<MultiStepForm formConfig={mlodySpedytorRokuConfig} />
			</div>
		</div>
	)
}

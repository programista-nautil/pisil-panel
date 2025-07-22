import FormComponent from '@/components/FormComponent'
import BackButton from '@/components/BackButton'

export default function DeclarationFormPage() {
	return (
		<div className='min-h-screen bg-gray-50'>
			<BackButton />
			<div className='max-w-4xl mx-auto py-8 px-4'>
				<header className='text-center mb-8'>
					<h1 className='text-3xl font-bold text-gray-900 mb-2'>Deklaracja Członkowska PISiL</h1>
					<p className='text-gray-600'>Formularz członkowski dla firm - Polska Izba Specjalistów IT i Logistyki</p>
					<p className='text-sm text-gray-500 mt-2'>
						Wypełnij formularz, pobierz jako PDF, podpisz elektronicznie i prześlij
					</p>
				</header>{' '}
				<FormComponent />
			</div>
		</div>
	)
}

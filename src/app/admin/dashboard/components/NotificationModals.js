import ConfirmationModal from '@/components/ConfirmationModal'
import { MultiAttachmentInput } from '../components/AttachmentInputs'

export default function NotificationModals({
	isVerificationModalOpen,
	closeVerificationModal,
	submissionToVerify,
	confirmAndSendPatronageVerification,
	confirmAndSendVerificationEmail,
	isSubmitting,
	successMessage,
	shouldSendEmails,
	setShouldSendEmails,
	patronageVerificationBody,
	setPatronageVerificationBody,
	isAcceptanceModalOpen,
	closeAcceptanceModal,
	submissionToAccept,
	confirmAndSendPatronageAcceptance,
	confirmAndSendAcceptanceEmail,
	acceptanceDate,
	setAcceptanceDate,
	patronageAcceptanceBody,
	setPatronageAcceptanceBody,
	isRejectionModalOpen,
	closeRejectionModal,
	submissionToReject,
	confirmAndSendRejectionEmail,
}) {
	return (
		<>
			<ConfirmationModal
				isOpen={isVerificationModalOpen}
				onClose={closeVerificationModal}
				onConfirm={
					submissionToVerify?.formType === 'PATRONAT'
						? confirmAndSendPatronageVerification
						: confirmAndSendVerificationEmail
				}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź weryfikację'}
				message={
					submissionToVerify?.formType === 'PATRONAT'
						? `Czy na pewno chcesz zatwierdzić wniosek o patronat dla: ${submissionToVerify?.companyName}?`
						: successMessage
						? successMessage
						: shouldSendEmails
						? `Potwierdzenie weryfikacji dla firmy "${submissionToVerify?.companyName}" spowoduje:\n\n1. Wygenerowanie oficjalnego Komunikatu.\n2. Wysłanie powiadomienia do kandydata.\n3. Rozpoczęcie masowej wysyłki maili do wszystkich członków Izby (proces w tle).\n\nCzy chcesz kontynuować?`
						: `Potwierdzenie weryfikacji dla firmy "${submissionToVerify?.companyName}" spowoduje:\n\n1. Wygenerowanie oficjalnego Komunikatu (Tylko zapis w systemie).\n2. Zmianę statusu na Zweryfikowany.\n\nNIE zostaną wysłane żadne powiadomienia mailowe.`
				}
				confirmButtonText='Potwierdź i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}
				maxWidth={submissionToVerify?.formType === 'PATRONAT' ? 'max-w-3xl' : 'max-w-md'}>
				{submissionToVerify?.formType === 'DEKLARACJA_CZLONKOWSKA' && !successMessage && (
					<div className='mt-4 p-4 bg-gray-50 rounded-md border border-gray-200'>
						<div className='flex items-start'>
							<div className='flex items-center h-5'>
								<input
									id='shouldSendEmails'
									name='shouldSendEmails'
									type='checkbox'
									checked={shouldSendEmails}
									onChange={e => setShouldSendEmails(e.target.checked)}
									className='focus:ring-[#005698] h-4 w-4 text-[#005698] border-gray-300 rounded cursor-pointer'
								/>
							</div>
							<div className='ml-3 text-sm'>
								<label htmlFor='shouldSendEmails' className='font-medium text-gray-700 cursor-pointer'>
									Wyślij powiadomienia e-mail
								</label>
								<p className='text-gray-500 text-xs mt-1'>
									Jeśli odznaczone: tylko generuje dokument i zmienia status (bez wysyłki do kandydata i członków).
								</p>
							</div>
						</div>
					</div>
				)}

				{/* Warunkowo renderujemy zawartość wewnątrz modala */}
				{submissionToVerify?.formType === 'PATRONAT' && (
					<div className='text-left'>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Treść e-maila:</label>
						<textarea
							value={patronageVerificationBody}
							onChange={e => setPatronageVerificationBody(e.target.value)}
							rows={8}
							className='text-gray-500 w-full h-48 p-2 border rounded-md'
						/>
					</div>
				)}
			</ConfirmationModal>

			<ConfirmationModal
				isOpen={isAcceptanceModalOpen}
				onClose={closeAcceptanceModal}
				onConfirm={
					submissionToAccept?.formType === 'PATRONAT'
						? confirmAndSendPatronageAcceptance
						: confirmAndSendAcceptanceEmail
				}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź przyjęcie'}
				message={`Czy na pewno chcesz kontynuować dla zgłoszenia od: ${submissionToAccept?.companyName}?`}
				confirmButtonText='Przyjmij i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}>
				{/* Warunkowo renderujemy zawartość wewnątrz modala */}
				{submissionToAccept?.formType === 'DEKLARACJA_CZLONKOWSKA' && (
					<div className='text-left'>
						<label htmlFor='acceptance-date' className='block text-sm font-medium text-gray-700'>
							Data uchwały (do dokumentów)
						</label>
						<input
							type='date'
							id='acceptance-date'
							value={acceptanceDate}
							onChange={e => setAcceptanceDate(e.target.value)}
							className='mt-1 p-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm text-gray-500'
						/>
					</div>
				)}
				{submissionToAccept?.formType === 'PATRONAT' && (
					<div className='text-left'>
						<label className='block text-sm font-medium text-gray-700 mb-1'>Treść e-maila:</label>
						<textarea
							value={patronageAcceptanceBody}
							onChange={e => setPatronageAcceptanceBody(e.target.value)}
							rows={8}
							className='text-gray-500 w-full h-48 p-2 border rounded-md'
						/>
					</div>
				)}
			</ConfirmationModal>

			<ConfirmationModal
				isOpen={isRejectionModalOpen}
				onClose={closeRejectionModal}
				onConfirm={confirmAndSendRejectionEmail}
				title={successMessage ? 'Operacja zakończona' : 'Potwierdź odrzucenie zgłoszenia'}
				message={`Spowoduje to zmianę statusu na "Odrzucony" i wysłanie powiadomienia e-mail na adres: ${submissionToReject?.email}.`}
				confirmButtonText='Odrzuć i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}
			/>
		</>
	)
}

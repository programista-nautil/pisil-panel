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
				message={`Czy na pewno chcesz kontynuować dla zgłoszenia od: ${submissionToVerify?.companyName}?`}
				confirmButtonText='Potwierdź i wyślij'
				isLoading={isSubmitting}
				successMessage={successMessage}
				maxWidth={submissionToVerify?.formType === 'PATRONAT' ? 'max-w-3xl' : 'max-w-md'}>
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

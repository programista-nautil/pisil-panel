/**
 * Test komponentowy modala weryfikacji — treść i notka checkboxa
 * dostosowane do typu członka (stowarzyszony vs zwyczajny).
 */
import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import NotificationModals from './NotificationModals'

// Odcinamy zależność od inputów załączników (nie renderowana dla deklaracji)
jest.mock('../components/AttachmentInputs', () => ({ MultiAttachmentInput: () => null }))

const baseProps = overrides => ({
	isVerificationModalOpen: true,
	closeVerificationModal: jest.fn(),
	submissionToVerify: { formType: 'DEKLARACJA_CZLONKOWSKA', companyName: 'Firma X', memberType: 'ZWYCZAJNY' },
	confirmAndSendPatronageVerification: jest.fn(),
	confirmAndSendVerificationEmail: jest.fn(),
	isSubmitting: false,
	successMessage: '',
	shouldSendEmails: true,
	setShouldSendEmails: jest.fn(),
	patronageVerificationBody: '',
	setPatronageVerificationBody: jest.fn(),
	isAcceptanceModalOpen: false,
	closeAcceptanceModal: jest.fn(),
	submissionToAccept: null,
	confirmAndSendPatronageAcceptance: jest.fn(),
	confirmAndSendAcceptanceEmail: jest.fn(),
	acceptanceDate: '2026-06-15',
	setAcceptanceDate: jest.fn(),
	patronageAcceptanceBody: '',
	setPatronageAcceptanceBody: jest.fn(),
	isRejectionModalOpen: false,
	closeRejectionModal: jest.fn(),
	submissionToReject: null,
	confirmAndSendRejectionEmail: jest.fn(),
	...overrides,
})

describe('NotificationModals — modal weryfikacji wg typu członka', () => {
	test('ZWYCZAJNY: obiecuje komunikat i masową wysyłkę', () => {
		render(<NotificationModals {...baseProps({})} />)
		expect(screen.getByText(/Wygenerowanie oficjalnego Komunikatu/)).toBeInTheDocument()
		expect(screen.getByText(/Rozpoczęcie masowej wysyłki maili do wszystkich/)).toBeInTheDocument()
		expect(screen.queryByText(/członek stowarzyszony/)).not.toBeInTheDocument()
	})

	test('STOWARZYSZONY: bez komunikatu i masowej wysyłki, z oznaczeniem typu', () => {
		render(
			<NotificationModals
				{...baseProps({
					submissionToVerify: { formType: 'DEKLARACJA_CZLONKOWSKA', companyName: 'Firma X', memberType: 'STOWARZYSZONY' },
				})}
			/>,
		)
		expect(screen.getByText(/członek stowarzyszony/)).toBeInTheDocument()
		expect(screen.getByText(/NIE generujemy komunikatu/)).toBeInTheDocument()
		expect(screen.queryByText(/Rozpoczęcie masowej wysyłki maili do wszystkich/)).not.toBeInTheDocument()
	})

	test('notka checkboxa: inna dla stowarzyszonego (bez wzmianki o członkach)', () => {
		const { rerender } = render(<NotificationModals {...baseProps({})} />)
		expect(screen.getByText(/bez wysyłki do kandydata i członków/)).toBeInTheDocument()

		rerender(
			<NotificationModals
				{...baseProps({
					submissionToVerify: { formType: 'DEKLARACJA_CZLONKOWSKA', companyName: 'Firma X', memberType: 'STOWARZYSZONY' },
				})}
			/>,
		)
		expect(screen.getByText(/bez powiadomienia do kandydata/)).toBeInTheDocument()
	})
})

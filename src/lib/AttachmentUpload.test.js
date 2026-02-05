import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event'
// POPRAWIONE IMPORTY (używamy @ zamiast ../src)
import SubmissionsTable from '@/app/admin/dashboard/components/SubmissionsTable'
import AddAttachmentsModal from '@/app/admin/dashboard/components/AddAttachmentsModal'

// 1. Mockujemy komponenty UI
jest.mock('@heroicons/react/24/outline', () => ({
	PaperClipIcon: () => <div data-testid='paper-clip-icon' />,
	ArchiveBoxArrowDownIcon: () => <div />,
	ArrowUpOnSquareIcon: () => <div />,
	UserIcon: () => <div />,
	Cog8ToothIcon: () => <div />,
	TrashIcon: () => <div />,
}))

// POPRAWIONA ŚCIEŻKA W MOCKU (używamy @)
jest.mock('@/app/admin/dashboard/components/AttachmentInputs', () => ({
	MultiAttachmentInput: ({ onFilesChange }) => (
		<input data-testid='file-input' type='file' multiple onChange={onFilesChange} />
	),
}))

jest.mock('react-hot-toast', () => ({
	success: jest.fn(),
	error: jest.fn(),
}))

global.fetch = jest.fn()

describe('Funkcjonalność dodawania załączników', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('Tabela powinna zawierać przycisk spinacza i wywoływać openAttachModal', () => {
		const mockOpenAttachModal = jest.fn()
		const submissions = [
			{
				id: '123',
				companyName: 'Testowa Firma',
				formType: 'DEKLARACJA_CZLONKOWSKA',
				attachments: [],
			},
		]

		render(<SubmissionsTable submissions={submissions} expanded={{}} openAttachModal={mockOpenAttachModal} />)

		const attachBtn = screen.getByTitle('Dodaj dodatkowe dokumenty')
		expect(attachBtn).toBeInTheDocument()
		expect(screen.getByTestId('paper-clip-icon')).toBeInTheDocument()

		fireEvent.click(attachBtn)

		expect(mockOpenAttachModal).toHaveBeenCalledTimes(1)
		expect(mockOpenAttachModal).toHaveBeenCalledWith(submissions[0])
	})

	test('AddAttachmentsModal powinien wysłać pliki do API', async () => {
		const mockOnClose = jest.fn()
		const mockOnUploadSuccess = jest.fn()
		const submission = { id: '123', companyName: 'Firma Test' }

		global.fetch.mockResolvedValueOnce({
			ok: true,
			json: async () => ({ attachments: [{ id: 'att1', fileName: 'test.pdf' }] }),
		})

		render(
			<AddAttachmentsModal
				isOpen={true}
				onClose={mockOnClose}
				submission={submission}
				onUploadSuccess={mockOnUploadSuccess}
			/>,
		)

		expect(screen.getByText('Firma Test')).toBeInTheDocument()

		const file = new File(['dummy content'], 'dokument.pdf', { type: 'application/pdf' })
		const input = screen.getByTestId('file-input')

		await userEvent.upload(input, file)

		const submitBtn = screen.getByText('Dodaj pliki')
		expect(submitBtn).not.toBeDisabled()

		fireEvent.click(submitBtn)

		expect(screen.getByText('Wysyłanie...')).toBeInTheDocument()

		await waitFor(() => {
			expect(global.fetch).toHaveBeenCalledWith(
				`/api/admin/submissions/123/attachments`,
				expect.objectContaining({
					method: 'POST',
					body: expect.any(FormData),
				}),
			)
		})

		await waitFor(() => {
			expect(mockOnUploadSuccess).toHaveBeenCalledWith('123', expect.any(Array))
			expect(mockOnClose).toHaveBeenCalled()
		})
	})

	test('AddAttachmentsModal powinien obsłużyć błąd API', async () => {
		global.fetch.mockResolvedValueOnce({
			ok: false,
		})

		render(
			<AddAttachmentsModal
				isOpen={true}
				onClose={jest.fn()}
				submission={{ id: '123', companyName: 'Firma Fail' }}
				onUploadSuccess={jest.fn()}
			/>,
		)

		const file = new File(['dummy'], 'test.pdf', { type: 'application/pdf' })
		await userEvent.upload(screen.getByTestId('file-input'), file)

		fireEvent.click(screen.getByText('Dodaj pliki'))

		await waitFor(() => {
			const toast = require('react-hot-toast')
			expect(toast.error).toHaveBeenCalled()
		})
	})
})

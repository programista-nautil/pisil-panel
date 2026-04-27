import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import ForceChangePasswordModal from './ForceChangePasswordModal'

jest.mock('@heroicons/react/24/outline', () => ({
  LockClosedIcon: () => <svg data-testid="lock-icon" />,
  EyeIcon: () => <svg />,
  EyeSlashIcon: () => <svg />,
  ExclamationCircleIcon: () => <svg />,
}))

const mockUpdate = jest.fn()
jest.mock('next-auth/react', () => ({ useSession: jest.fn() }))
const { useSession } = require('next-auth/react')

global.fetch = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
})

// Pomocnik: zwraca oba inputy hasła z formularza w kolejności DOM
function getPasswordInputs(container) {
  return container.querySelectorAll('input[type="password"], input[type="text"]')
}

describe('ForceChangePasswordModal', () => {
  test('nie renderuje się gdy mustChangePassword = false', () => {
    useSession.mockReturnValue({ data: { user: { mustChangePassword: false } }, update: mockUpdate })

    const { container } = render(<ForceChangePasswordModal />)
    expect(container.firstChild).toBeNull()
  })

  test('renderuje modal gdy mustChangePassword = true', () => {
    useSession.mockReturnValue({ data: { user: { mustChangePassword: true } }, update: mockUpdate })

    render(<ForceChangePasswordModal />)
    expect(screen.getByText('Wymagana zmiana hasła')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /zmień hasło/i })).toBeInTheDocument()
  })

  // Kluczowy test regresji: stary kod robił window.location.reload() — JWT nie był aktualizowany
  // i modal nie znikał. Poprawka: wywołanie update({ user: { mustChangePassword: false } }).
  test('po pomyślnej zmianie hasła wywołuje update() z mustChangePassword: false', async () => {
    useSession.mockReturnValue({ data: { user: { mustChangePassword: true } }, update: mockUpdate })
    mockUpdate.mockResolvedValue(undefined)
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ message: 'Hasło zostało pomyślnie zmienione.' }),
    })

    const { container } = render(<ForceChangePasswordModal />)
    const [newInput, confirmInput] = getPasswordInputs(container)

    fireEvent.change(newInput, { target: { value: 'NoweHaslo1!' } })
    fireEvent.change(confirmInput, { target: { value: 'NoweHaslo1!' } })
    fireEvent.click(screen.getByRole('button', { name: /zmień hasło/i }))

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ user: { mustChangePassword: false } })
    })
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  test('wyświetla błąd gdy hasła się nie zgadzają', async () => {
    useSession.mockReturnValue({ data: { user: { mustChangePassword: true } }, update: mockUpdate })

    const { container } = render(<ForceChangePasswordModal />)
    const [newInput, confirmInput] = getPasswordInputs(container)

    fireEvent.change(newInput, { target: { value: 'NoweHaslo1!' } })
    fireEvent.change(confirmInput, { target: { value: 'InneHaslo2!' } })
    fireEvent.click(screen.getByRole('button', { name: /zmień hasło/i }))

    await waitFor(() => {
      expect(screen.getByText('Nowe hasła nie są identyczne')).toBeInTheDocument()
    })
    expect(global.fetch).not.toHaveBeenCalled()
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  test('wyświetla błąd z API gdy zmiana się nie powiedzie i nie wywołuje update()', async () => {
    useSession.mockReturnValue({ data: { user: { mustChangePassword: true } }, update: mockUpdate })
    global.fetch.mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Błąd serwera testowy' }),
    })

    const { container } = render(<ForceChangePasswordModal />)
    const [newInput, confirmInput] = getPasswordInputs(container)

    fireEvent.change(newInput, { target: { value: 'NoweHaslo1!' } })
    fireEvent.change(confirmInput, { target: { value: 'NoweHaslo1!' } })
    fireEvent.click(screen.getByRole('button', { name: /zmień hasło/i }))

    await waitFor(() => {
      expect(screen.getByText('Błąd serwera testowy')).toBeInTheDocument()
    })
    expect(mockUpdate).not.toHaveBeenCalled()
  })
})

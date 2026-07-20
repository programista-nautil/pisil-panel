/** @jest-environment node */

jest.mock('@/auth', () => ({ auth: jest.fn().mockResolvedValue({ user: { role: 'admin' } }) }))
jest.mock('@/lib/mailer', () => ({ sendToOne: jest.fn().mockResolvedValue({}) }))

import { sendToOne } from '@/lib/mailer'
import { POST } from './route'

const req = body => ({ json: jest.fn().mockResolvedValue(body) })
const ctx = { params: Promise.resolve({ id: 'ev1' }) }

beforeEach(() => jest.clearAllMocks())

test('poprawny test: 200, jeden adres w DO, temat z prefiksem [TEST], HTML w treści', async () => {
	const res = await POST(req({ subject: 'Info organizacyjne', body: 'Linia 1\n\nLinia 2', to: 'ja@firma.pl' }), ctx)
	expect(res.status).toBe(200)
	expect(sendToOne).toHaveBeenCalledTimes(1)
	const msg = sendToOne.mock.calls[0][0]
	expect(typeof msg.to).toBe('string') // pojedynczy adres, nie tablica (RODO)
	expect(msg.to).toBe('ja@firma.pl')
	expect(msg.subject).toMatch(/^\[TEST\] /)
	expect(msg.subject).toContain('Info organizacyjne')
	expect(msg.html).toContain('<p>') // treść zamieniona na HTML
})

test.each([
	['brak @', 'niepoprawny'],
	['sama domena', '@firma.pl'],
	['spacja w środku', 'jan kowalski@firma.pl'],
	['pusty', ''],
])('niepoprawny adres (%s) → 400 i NIE wysyła', async (_opis, adres) => {
	const res = await POST(req({ subject: 'Info', body: 'Treść', to: adres }), ctx)
	expect(res.status).toBe(400)
	expect(sendToOne).not.toHaveBeenCalled()
})

test('pusty temat → 400 i NIE wysyła', async () => {
	const res = await POST(req({ subject: '   ', body: 'Treść', to: 'ja@firma.pl' }), ctx)
	expect(res.status).toBe(400)
	expect(sendToOne).not.toHaveBeenCalled()
})

test('pusta treść → 400 i NIE wysyła', async () => {
	const res = await POST(req({ subject: 'Info', body: '', to: 'ja@firma.pl' }), ctx)
	expect(res.status).toBe(400)
	expect(sendToOne).not.toHaveBeenCalled()
})

test('brak sesji → 401 i NIE wysyła', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce(null)
	const res = await POST(req({ subject: 'Info', body: 'Treść', to: 'ja@firma.pl' }), ctx)
	expect(res.status).toBe(401)
	expect(sendToOne).not.toHaveBeenCalled()
})

test('zalogowany CZŁONEK (nie admin) → 401 i NIE wysyła (blokada wektora phishingu)', async () => {
	const { auth } = require('@/auth')
	auth.mockResolvedValueOnce({ user: { role: 'member' } })
	const res = await POST(req({ subject: 'Info', body: 'Treść', to: 'ofiara@obcy.pl' }), ctx)
	expect(res.status).toBe(401)
	expect(sendToOne).not.toHaveBeenCalled()
})

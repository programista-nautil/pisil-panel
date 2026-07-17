/** @jest-environment node */

const { wyslijMasowoIdempotentnie } = require('./mailBatch')

// Mock Prismy: baza znaczników jako Set kluczy „scope|refId|email". `create` rzuca P2002,
// gdy klucz już istnieje — dokładnie tak, jak realna baza z @@unique([scope, refId, email]).
function fakePrisma(preexisting = []) {
	const wyslane = new Set(preexisting)
	const key = d => `${d.scope}|${d.refId}|${d.email}`
	return {
		_wyslane: wyslane,
		mailSendLog: {
			create: jest.fn(async ({ data }) => {
				if (wyslane.has(key(data))) {
					const e = new Error('Unique constraint failed')
					e.code = 'P2002'
					throw e
				}
				wyslane.add(key(data))
				return { id: 'x', ...data }
			}),
			update: jest.fn(async () => ({})),
		},
	}
}

const deps = (prisma, sendToOne) => ({
	prisma,
	sendToOne,
	sleep: jest.fn().mockResolvedValue(),
	logger: { error: jest.fn(), log: jest.fn() },
})

const budujWiadomosc = email => ({ to: email, subject: 't', html: 'h' })
const adresy = n => Array.from({ length: n }, (_, i) => `u${i}@firma.pl`)

test('dwa przebiegi tego samego zadania = jedna wysyłka na osobę', async () => {
	const prisma = fakePrisma()
	const sendToOne = jest.fn().mockResolvedValue({})
	const opcje = { scope: 'notify-members', refId: 'sub1', odbiorcy: adresy(20), budujWiadomosc, batchSize: 20 }

	const r1 = await wyslijMasowoIdempotentnie(opcje, deps(prisma, sendToOne))
	expect(r1.wyslano).toBe(20)

	// Ponowienie (BullMQ „co najmniej raz") — wszystkie mają już znacznik.
	const r2 = await wyslijMasowoIdempotentnie(opcje, deps(prisma, sendToOne))
	expect(r2.wyslano).toBe(0)
	expect(r2.pominieto).toBe(20)

	// Łącznie 20 wysyłek, nie 40.
	expect(sendToOne).toHaveBeenCalledTimes(20)
})

test('awaria po 15 z 20: ponowienie dosyła TYLKO brakujące 5', async () => {
	// Symulacja padu procesu: pierwsze 15 zdążyło dostać znacznik i wyjść, kolejne 5 nigdy nie ruszyło.
	const odbiorcy = adresy(20)
	const juzWyslane = odbiorcy.slice(0, 15).map(email => `notify-members|sub1|${email}`)
	const prisma = fakePrisma(juzWyslane)
	const sendToOne = jest.fn().mockResolvedValue({})

	const r = await wyslijMasowoIdempotentnie(
		{ scope: 'notify-members', refId: 'sub1', odbiorcy, budujWiadomosc, batchSize: 20 },
		deps(prisma, sendToOne)
	)

	expect(r.wyslano).toBe(5)
	expect(r.pominieto).toBe(15)
	// Dosłane to dokładnie brakujące 5 (indeksy 15..19) — żaden z pierwszych 15.
	const dosłane = sendToOne.mock.calls.map(([m]) => m.to).sort()
	expect(dosłane).toEqual(odbiorcy.slice(15).sort())
})

test('błąd wysyłki jednego adresu nie zabija partii; oznacza go jako BLAD', async () => {
	const odbiorcy = adresy(5)
	const prisma = fakePrisma()
	const sendToOne = jest.fn().mockImplementation(async ({ to }) => {
		if (to === odbiorcy[2]) throw new Error('550 zły adres')
	})

	const r = await wyslijMasowoIdempotentnie(
		{ scope: 'notify-members', refId: 'sub1', odbiorcy, budujWiadomosc, batchSize: 5 },
		deps(prisma, sendToOne)
	)

	expect(r.wyslano).toBe(4) // pozostałe cztery poszły
	expect(r.bledy).toEqual([{ email: odbiorcy[2], error: '550 zły adres' }])
	// Znacznik złego adresu został przestawiony na BLAD (nie skasowany).
	expect(prisma.mailSendLog.update).toHaveBeenCalledWith(
		expect.objectContaining({ data: expect.objectContaining({ status: 'BLAD' }) })
	)
})

test('pacing: przerwa MIĘDZY partiami, nie po ostatniej', async () => {
	const prisma = fakePrisma()
	const sendToOne = jest.fn().mockResolvedValue({})
	const d = deps(prisma, sendToOne)

	// 5 odbiorców, partie po 2 → partie [2][2][1] → 2 przerwy (po 1. i 2. partii, nie po 3.)
	await wyslijMasowoIdempotentnie(
		{ scope: 's', refId: 'r', odbiorcy: adresy(5), budujWiadomosc, batchSize: 2, delayMs: 60000 },
		d
	)
	expect(d.sleep).toHaveBeenCalledTimes(2)
	expect(d.sleep).toHaveBeenCalledWith(60000)
})

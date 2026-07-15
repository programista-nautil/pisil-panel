// Testowe wydarzenia — pokrycie WSZYSTKICH przypadków (do wglądu Bartka + testów WordPressa).
// Idempotentny: upsert po slugu, można puszczać wielokrotnie.
// Sprzątanie: node _seed_test_events_prod.cjs --usun   (kasuje TYLKO wydarzenia ze slugiem zaczynającym się od "test-")
const fs = require('fs')
if (!process.env.DATABASE_URL) {
	try {
		const env = fs.readFileSync('.env', 'utf8')
		for (const line of env.split('\n')) {
			const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/)
			if (m) { process.env.DATABASE_URL = m[1].trim().replace(/^["']|["']$/g, ''); break }
		}
	} catch (e) {}
}
const { PrismaClient } = require('@prisma/client')
const p = new PrismaClient()

const KONTO = '12 3456 7890 1234 5678 9012 3456'

const WYDARZENIA = [
	// --- KONFERENCJE ---
	{
		slug: 'test-konferencja-pelne-pola',
		typ: 'KONFERENCJA', tryb: 'STACJONARNE', status: 'PUBLISHED',
		title: '[TEST] Konferencja — wszystkie pola wypełnione',
		description: 'Przypadek: konferencja stacjonarna z kompletem danych. Członek gratis do 2 osób z firmy, powyżej puli i nie-członkowie płatnie. Sprawdza: mapkę, prowadzącego, limit, deadline, nr konta.',
		startAt: new Date('2026-09-17T10:00:00'), endAt: new Date('2026-09-17T16:30:00'),
		prowadzacy: 'dr Anna Kowalska, PISiL', address: 'ul. Świętokrzyska 20, 00-002 Warszawa',
		limitMiejsc: 100, registrationDeadline: new Date('2026-09-10T23:59:00'),
		bankAccount: KONTO, cenaCzlonek: '350.00', cenaNieczlonek: '700.00',
		pulaGratisNaFirme: 2, seriesName: 'Konferencje Noworoczne',
	},
	{
		slug: 'test-konferencja-online',
		typ: 'KONFERENCJA', tryb: 'ONLINE', status: 'PUBLISHED',
		title: '[TEST] Konferencja online',
		description: 'Przypadek: konferencja online (brak adresu i mapki, jest link do spotkania). Członek gratis do 2 osób.',
		startAt: new Date('2026-10-08T09:00:00'), endAt: new Date('2026-10-08T13:00:00'),
		prowadzacy: 'Zespół PISiL', onlineUrl: 'https://teams.microsoft.com/l/meetup-join/TEST-LINK',
		limitMiejsc: 250, bankAccount: KONTO,
		cenaCzlonek: '200.00', cenaNieczlonek: '400.00', pulaGratisNaFirme: 2,
	},

	// --- SZKOLENIA ---
	{
		slug: 'test-szkolenie-stacjonarne-platne',
		typ: 'SZKOLENIE', tryb: 'STACJONARNE', status: 'PUBLISHED',
		title: '[TEST] Szkolenie stacjonarne — płatne (członek taniej)',
		description: 'Przypadek: szkolenie zawsze płatne, członek taniej niż nie-członek. Brak puli gratis.',
		startAt: new Date('2026-09-24T09:00:00'), endAt: new Date('2026-09-24T15:00:00'),
		prowadzacy: 'mec. Jan Nowak', address: 'ul. Długa 5, 80-827 Gdańsk',
		limitMiejsc: 20, registrationDeadline: new Date('2026-09-20T23:59:00'),
		bankAccount: KONTO, cenaCzlonek: '450.00', cenaNieczlonek: '800.00', pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-szkolenie-online-platne',
		typ: 'SZKOLENIE', tryb: 'ONLINE', status: 'PUBLISHED',
		title: '[TEST] Szkolenie online — płatne',
		description: 'Przypadek: szkolenie online płatne. Docelowo z tego idzie certyfikat automatycznie mailem.',
		startAt: new Date('2026-10-15T10:00:00'), endAt: new Date('2026-10-15T14:00:00'),
		prowadzacy: 'Katarzyna Wiśniewska', onlineUrl: 'https://teams.microsoft.com/l/meetup-join/TEST-SZKOLENIE',
		limitMiejsc: 50, bankAccount: KONTO,
		cenaCzlonek: '300.00', cenaNieczlonek: '550.00', pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-szkolenie-limit-2',
		typ: 'SZKOLENIE', tryb: 'ONLINE', status: 'PUBLISHED',
		title: '[TEST] Szkolenie — limit 2 miejsca (test listy rezerwowej)',
		description: 'Przypadek brzegowy: limit 2 miejsca. Trzecie zgłoszenie ma trafić na LISTĘ REZERWOWĄ.',
		startAt: new Date('2026-11-05T10:00:00'),
		prowadzacy: 'Zespół PISiL', limitMiejsc: 2, bankAccount: KONTO,
		cenaCzlonek: '150.00', cenaNieczlonek: '300.00', pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-szkolenie-minimalne-pola',
		typ: 'SZKOLENIE', tryb: 'ONLINE', status: 'PUBLISHED',
		title: '[TEST] Szkolenie — tylko pola wymagane',
		// celowo BRAK: description, prowadzacy, ceny, limit, deadline, konto — sprawdzamy jak wygląda "goły" przypadek
		startAt: new Date('2026-11-19T10:00:00'),
		pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-szkolenie-deadline-minal',
		typ: 'SZKOLENIE', tryb: 'ONLINE', status: 'PUBLISHED',
		title: '[TEST] Szkolenie — termin zapisów minął',
		description: 'Przypadek: wydarzenie widoczne, ale rejestracja zamknięta przez miniony termin zapisów. Na stronie ma być „Rejestracja zakończona”.',
		startAt: new Date('2026-12-03T10:00:00'),
		registrationDeadline: new Date('2026-07-01T23:59:00'), // przeszłość
		prowadzacy: 'Zespół PISiL', bankAccount: KONTO,
		cenaCzlonek: '200.00', cenaNieczlonek: '400.00', pulaGratisNaFirme: 0,
	},

	// --- STATUSY (niewidoczne publicznie / brzegowe) ---
	{
		slug: 'test-szkolenie-closed',
		typ: 'SZKOLENIE', tryb: 'ONLINE', status: 'CLOSED',
		title: '[TEST] Szkolenie — status ZAMKNIĘTE',
		description: 'Przypadek do rozstrzygnięcia z Panią Teresą: dziś status CLOSED sprawia, że wydarzenie ZNIKA ze strony (publiczne API przepuszcza tylko PUBLISHED), choć komentarz w kodzie sugeruje, że miało zostać widoczne z napisem „Rejestracja zakończona”.',
		startAt: new Date('2026-12-10T10:00:00'),
		prowadzacy: 'Zespół PISiL', cenaCzlonek: '200.00', cenaNieczlonek: '400.00', pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-szkolenie-szkic',
		typ: 'SZKOLENIE', tryb: 'STACJONARNE', status: 'DRAFT',
		title: '[TEST] Szkolenie — SZKIC (ma być niewidoczne)',
		description: 'Przypadek: szkic. NIE może pojawić się na pisil.pl.',
		startAt: new Date('2026-12-17T10:00:00'),
		address: 'ul. Testowa 1, 00-001 Warszawa', prowadzacy: 'Zespół PISiL',
		cenaCzlonek: '100.00', cenaNieczlonek: '200.00', pulaGratisNaFirme: 0,
	},
	{
		slug: 'test-konferencja-archiwalna',
		typ: 'KONFERENCJA', tryb: 'STACJONARNE', status: 'ARCHIVED',
		title: '[TEST] Konferencja — ZARCHIWIZOWANA (ma być niewidoczna)',
		description: 'Przypadek: archiwum. NIE może pojawić się na pisil.pl.',
		startAt: new Date('2026-05-20T10:00:00'), endAt: new Date('2026-05-20T16:00:00'),
		address: 'hotel Bulwar, Toruń', prowadzacy: 'Zespół PISiL',
		cenaCzlonek: '300.00', cenaNieczlonek: '600.00', pulaGratisNaFirme: 2,
	},
]

async function usun() {
	const doKasacji = await p.event.findMany({ where: { slug: { startsWith: 'test-' } }, select: { slug: true } })
	const r = await p.event.deleteMany({ where: { slug: { startsWith: 'test-' } } })
	console.log('USUNIETO wydarzen testowych: ' + r.count)
	doKasacji.forEach(e => console.log('  - ' + e.slug))
}

async function zaloz() {
	for (const w of WYDARZENIA) {
		const { slug, ...dane } = w
		await p.event.upsert({ where: { slug }, update: dane, create: { slug, ...dane } })
		console.log('OK  ' + String(w.status).padEnd(9) + ' ' + String(w.typ).padEnd(11) + ' ' + slug)
	}
	const widoczne = await p.event.count({ where: { status: 'PUBLISHED', slug: { startsWith: 'test-' } } })
	console.log('\nRAZEM testowych: ' + WYDARZENIA.length + ', w tym widocznych publicznie (PUBLISHED): ' + widoczne)
}

const tryb = process.argv.includes('--usun') ? usun : zaloz
tryb().then(() => p.$disconnect()).catch(e => { console.error('BLAD:', e.message); p.$disconnect(); process.exit(1) })

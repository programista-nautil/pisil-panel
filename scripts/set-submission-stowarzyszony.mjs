// scripts/set-submission-stowarzyszony.mjs
// ---------------------------------------------------------------------------
// Jednorazowy skrypt: przełącza zgłoszenie(a) deklaracji na członka STOWARZYSZONEGO.
//
// Sens: firma złożyła deklarację jako zwyczajna (bo formularz wpłynął zanim/bez
// zaznaczenia opcji "stowarzyszony"), a ma być stowarzyszona. Po przełączeniu
// PRZED przyjęciem, acceptanceService przy akceptacji zaciągnie właściwe szablony
// STOW + 2 statyczne PDF-y, a utworzony Member dostanie memberType=STOWARZYSZONY
// (oznaczenie w panelu / spisie członków).
//
// BEZPIECZEŃSTWO:
//   - DRY-RUN domyślnie; zapis tylko z flagą --apply.
//   - Dotyczy wyłącznie DEKLARACJA_CZLONKOWSKA.
//   - Pomija już-stowarzyszonych.
//   - NIE zmienia zgłoszeń już PRZYJĘTYCH (acceptanceNumber != null) — tam trzeba
//     poprawić także Membera i wygenerowane dokumenty ręcznie; skrypt tylko ostrzega.
//
// Uruchomienie (na VPS, produkcyjna baza — DATABASE_URL z .env):
//   node --env-file=.env scripts/set-submission-stowarzyszony.mjs "Freight Tech"          # DRY-RUN
//   node --env-file=.env scripts/set-submission-stowarzyszony.mjs "Freight Tech" --apply   # zapis
//   node --env-file=.env scripts/set-submission-stowarzyszony.mjs --id=<cuid> --apply       # po dokładnym id
// ---------------------------------------------------------------------------

import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

function parseArgs(argv) {
	const apply = argv.includes('--apply')
	const idArg = argv.find(a => a.startsWith('--id='))
	const id = idArg ? idArg.slice('--id='.length) : null
	const term = argv.filter(a => !a.startsWith('--'))[0] || 'Freight Tech'
	return { apply, id, term }
}

async function main() {
	const { apply, id, term } = parseArgs(process.argv.slice(2))
	console.log(`\nTryb: ${apply ? 'APPLY (zapis do bazy)' : 'DRY-RUN (podgląd — nic nie zmienia)'}`)

	const where = id
		? { id }
		: { formType: 'DEKLARACJA_CZLONKOWSKA', companyName: { contains: term, mode: 'insensitive' } }
	console.log(id ? `Cel: zgłoszenie id=${id}` : `Szukam DEKLARACJI z nazwą firmy zawierającą: "${term}"`)

	const subs = await prisma.submission.findMany({
		where,
		select: {
			id: true, companyName: true, formType: true, status: true,
			memberType: true, acceptanceNumber: true, createdAt: true, email: true,
		},
		orderBy: { createdAt: 'desc' },
	})

	if (subs.length === 0) {
		console.log('\nBrak pasujących zgłoszeń.')
		return
	}

	console.log(`\nZnaleziono ${subs.length} zgłoszeń:`)
	const eligible = []
	for (const s of subs) {
		let mark
		if (s.formType !== 'DEKLARACJA_CZLONKOWSKA') mark = 'POMIŃ (nie deklaracja)'
		else if (s.memberType === 'STOWARZYSZONY') mark = 'JUŻ stowarzyszony (pomijam)'
		else if (s.acceptanceNumber != null)
			mark = 'UWAGA: JUŻ PRZYJĘTE — wymaga ręcznej korekty Membera i dokumentów; NIE zmieniam'
		else {
			mark = '→ DO ZMIANY na STOWARZYSZONY'
			eligible.push(s)
		}
		console.log(
			`  [${s.id}] ${s.companyName} | ${s.email} | status=${s.status} | typ=${s.memberType} | nrPrzyjęcia=${s.acceptanceNumber ?? '—'}\n        ${mark}`
		)
	}

	if (eligible.length === 0) {
		console.log('\nNic do zmiany.')
		return
	}

	if (!apply) {
		console.log(`\nDRY-RUN: ${eligible.length} zgłoszeń do zmiany. Sprawdź listę, potem uruchom z --apply.`)
		return
	}

	console.log(`\nZapisuję ${eligible.length}...`)
	for (const s of eligible) {
		await prisma.submission.update({ where: { id: s.id }, data: { memberType: 'STOWARZYSZONY' } })
		console.log(`  ✓ ${s.companyName} → STOWARZYSZONY`)
	}
	console.log('\nGotowe. Teraz przyjmij zgłoszenie w panelu — dokumenty zaciągną się właściwe (STOW + 2 PDF-y).')
}

main()
	.then(() => prisma.$disconnect())
	.catch(e => {
		console.error(e)
		prisma.$disconnect()
		process.exit(1)
	})

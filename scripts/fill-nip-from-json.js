/**
 * fill-nip-from-json.js
 * ---------------------------------------------------------------------------
 * Uzupełnia BRAKUJĄCE numery NIP członków (tabela Member) na podstawie pliku
 * JSON z parami { "nazwa": ..., "nip": ... }.
 *
 * Dopasowanie po nazwie firmy reużywa sprawdzonej logiki z
 * fill-members-from-spis.js (kanonizacja form prawnych: "Sp. z o.o." ==
 * "Spółka z ograniczoną odpowiedzialnością", "S.A." == "Spółka Akcyjna",
 * polskie znaki, wielkość liter) + fuzzy (Levenshtein).
 *
 * BEZPIECZEŃSTWO:
 *  - DRY-RUN domyślnie. Zapis tylko z flagą --apply.
 *  - NIGDY nie nadpisuje istniejącego NIP — uzupełnia wyłącznie puste.
 *  - Tylko pewne dopasowania (dokładne + fuzzy >= progu) są stosowane;
 *    niejednoznaczne/słabe trafiają do "DO RĘCZNEGO SPRAWDZENIA" i NIE są zapisywane.
 *  - Przed zapisem backup tabeli Member (scripts/backups/...).
 *  - Zawsze zapisuje czytelny raport (scripts/reports/...).
 *
 * Uruchomienie:
 *   node scripts/fill-nip-from-json.js [ścieżka.json]            # DRY-RUN
 *   node scripts/fill-nip-from-json.js [ścieżka.json] --apply    # backup + zapis
 * Domyślna ścieżka JSON: scripts/nip.json
 * ---------------------------------------------------------------------------
 */

try { require('dotenv').config() } catch { /* opcjonalne */ }

const fs = require('fs')
const path = require('path')
const { canonicalizeCompany, similarity, isBlank } = require('./fill-members-from-spis')

const FUZZY_MIN = 0.9 // minimalne podobieństwo, by w ogóle rozważyć fuzzy
const FUZZY_AUTO = 0.93 // od tego progu fuzzy jest stosowane automatycznie; niżej -> review

const REPORT_DIR = path.join(__dirname, 'reports')
const BACKUP_DIR = path.join(__dirname, 'backups')

function ts() {
	return new Date().toISOString().replace(/[:.]/g, '-')
}

function computePlan(members, nipList) {
	const byCanon = new Map()
	const canonList = []
	for (const e of nipList) {
		const c = canonicalizeCompany(e.nazwa)
		if (!c) continue
		canonList.push({ entry: e, canon: c })
		if (!byCanon.has(c)) byCanon.set(c, [])
		byCanon.get(c).push(e)
	}

	const results = []
	const usedEntries = new Set()

	for (const m of members) {
		const res = {
			id: m.id,
			memberNumber: m.memberNumber ?? null,
			company: m.company || '',
			method: null,
			matchedName: null,
			score: null,
			nip: null,
			status: 'unmatched', // unmatched | nochange | apply | review
			reason: '',
		}

		if (!isBlank(m.nip)) {
			res.status = 'nochange'
			res.reason = `NIP już ustawiony (${m.nip})`
			results.push(res)
			continue
		}

		const canon = canonicalizeCompany(m.company)
		if (!canon) {
			res.reason = 'Brak nazwy firmy'
			results.push(res)
			continue
		}

		// 1) Dokładne dopasowanie kanoniczne
		const exact = byCanon.get(canon)
		if (exact && exact.length === 1) {
			res.method = 'exact'
			res.matchedName = exact[0].nazwa
			res.score = 1
			res.nip = exact[0].nip
			res.status = 'apply'
			usedEntries.add(exact[0])
			results.push(res)
			continue
		}
		if (exact && exact.length > 1) {
			res.status = 'review'
			res.method = 'exact'
			res.reason = `Wiele wpisów JSON o tej samej nazwie (${exact.length})`
			res.matchedName = exact.map(e => e.nazwa).join(' | ')
			results.push(res)
			continue
		}

		// 2) Fuzzy
		let best = null
		let second = null
		for (const s of canonList) {
			const sc = similarity(canon, s.canon)
			if (!best || sc > best.score) {
				second = best
				best = { entry: s.entry, score: sc }
			} else if (!second || sc > second.score) {
				second = { entry: s.entry, score: sc }
			}
		}
		if (best && best.score >= FUZZY_MIN) {
			const ambiguous = second && best.score - second.score < 0.02 && second.score >= FUZZY_MIN
			res.method = 'fuzzy'
			res.matchedName = best.entry.nazwa
			res.score = Number(best.score.toFixed(3))
			res.nip = best.entry.nip
			if (ambiguous) {
				res.status = 'review'
				res.reason = `Dwa zbliżone: ${best.entry.nazwa} ~ ${second.entry.nazwa}`
			} else if (best.score >= FUZZY_AUTO) {
				res.status = 'apply'
				usedEntries.add(best.entry)
			} else {
				res.status = 'review'
				res.reason = `Fuzzy ${res.score} poniżej progu auto (${FUZZY_AUTO})`
			}
			results.push(res)
			continue
		}

		res.reason = 'Brak dopasowania w pliku JSON'
		results.push(res)
	}

	const unusedEntries = nipList.filter(e => !usedEntries.has(e))
	const stats = {
		members: members.length,
		nipEntries: nipList.length,
		apply: results.filter(r => r.status === 'apply').length,
		review: results.filter(r => r.status === 'review').length,
		nochange: results.filter(r => r.status === 'nochange').length,
		unmatched: results.filter(r => r.status === 'unmatched').length,
		exact: results.filter(r => r.status === 'apply' && r.method === 'exact').length,
		fuzzy: results.filter(r => r.status === 'apply' && r.method === 'fuzzy').length,
		entriesUnused: unusedEntries.length,
	}
	return { results, stats, unusedEntries }
}

function buildReport(plan, mode) {
	const { results, stats, unusedEntries } = plan
	const L = []
	L.push('RAPORT: Uzupełnianie NIP z pliku JSON')
	L.push(`Tryb: ${mode === 'apply' ? 'APPLY (zapis do bazy)' : 'DRY-RUN (podgląd)'}`)
	L.push(`Data: ${new Date().toISOString()}`)
	L.push('')
	L.push(`Członków (aktywnych):      ${stats.members}`)
	L.push(`Wpisów NIP w pliku:        ${stats.nipEntries}`)
	L.push(`Do uzupełnienia:           ${stats.apply}  (dokładne: ${stats.exact}, fuzzy: ${stats.fuzzy})`)
	L.push(`Mają już NIP (pominięte):  ${stats.nochange}`)
	L.push(`Do ręcznego sprawdzenia:   ${stats.review}`)
	L.push(`Bez dopasowania:           ${stats.unmatched}`)
	L.push(`Wpisy NIP bez dopasowania: ${stats.entriesUnused}`)
	L.push('')

	const applies = results.filter(r => r.status === 'apply')
	if (applies.length) {
		L.push('── DO UZUPEŁNIENIA ─────────────────────────────────────')
		for (const r of applies) {
			L.push(`#${r.memberNumber ?? '—'} ${r.company}  ->  NIP ${r.nip}  [${r.method}${r.score != null ? ' ' + r.score : ''}]`)
			if (r.method === 'fuzzy') L.push(`      dopasowano do: ${r.matchedName}`)
		}
		L.push('')
	}
	const reviews = results.filter(r => r.status === 'review')
	if (reviews.length) {
		L.push('── DO RĘCZNEGO SPRAWDZENIA (NIE zastosowano) ───────────')
		for (const r of reviews) {
			L.push(`#${r.memberNumber ?? '—'} ${r.company}  ?->  ${r.matchedName || '—'} (NIP ${r.nip || '—'}) [${r.method || '—'} ${r.score || ''}] ${r.reason}`)
		}
		L.push('')
	}
	if (unusedEntries.length) {
		L.push('── WPISY NIP BEZ DOPASOWANIA W BAZIE (informacyjnie) ───')
		for (const e of unusedEntries) L.push(`      ${e.nazwa}  (NIP ${e.nip})`)
		L.push('')
	}
	return L.join('\n')
}

function parseArgs(argv) {
	const positional = argv.filter(a => !a.startsWith('--'))
	return {
		apply: argv.includes('--apply'),
		help: argv.includes('--help') || argv.includes('-h'),
		file: positional[0] || path.join(__dirname, 'nip.json'),
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		console.log('Użycie:\n  node scripts/fill-nip-from-json.js [plik.json]          # DRY-RUN\n  node scripts/fill-nip-from-json.js [plik.json] --apply  # backup + zapis')
		return
	}

	const mode = args.apply ? 'apply' : 'dry-run'
	console.log(`\n🔎 Tryb: ${mode === 'apply' ? 'APPLY (zapis do bazy)' : 'DRY-RUN (podgląd — nic nie zmienia)'}`)
	console.log(`📄 Plik JSON: ${args.file}\n`)

	if (!fs.existsSync(args.file)) {
		console.error(`❌ Nie znaleziono pliku: ${args.file}`)
		process.exit(1)
	}
	const nipList = JSON.parse(fs.readFileSync(args.file, 'utf8'))
	if (!Array.isArray(nipList)) {
		console.error('❌ Plik JSON nie jest tablicą.')
		process.exit(1)
	}

	const { PrismaClient } = require('@prisma/client')
	const prisma = new PrismaClient()

	try {
		const members = await prisma.member.findMany({
			where: { deletedAt: null },
			orderBy: { company: 'asc' },
			select: { id: true, memberNumber: true, company: true, nip: true },
		})

		const plan = computePlan(members, nipList)

		fs.mkdirSync(REPORT_DIR, { recursive: true })
		const stamp = ts()
		const reportText = buildReport(plan, mode)
		const reportTxt = path.join(REPORT_DIR, `fill-nip-${mode}-${stamp}.txt`)
		const reportJson = path.join(REPORT_DIR, `fill-nip-${mode}-${stamp}.json`)
		fs.writeFileSync(reportTxt, reportText, 'utf8')
		fs.writeFileSync(reportJson, JSON.stringify(plan, null, 2), 'utf8')

		const s = plan.stats
		console.log('── PODSUMOWANIE ─────────────────────────────')
		console.log(`Członków (aktywnych):      ${s.members}`)
		console.log(`Wpisów NIP w pliku:        ${s.nipEntries}`)
		console.log(`Do uzupełnienia:           ${s.apply}  (dokładne: ${s.exact}, fuzzy: ${s.fuzzy})`)
		console.log(`Mają już NIP (pominięte):  ${s.nochange}`)
		console.log(`Do ręcznego sprawdzenia:   ${s.review}`)
		console.log(`Bez dopasowania:           ${s.unmatched}`)
		console.log(`Wpisy NIP bez dopasowania: ${s.entriesUnused}`)
		console.log(`\n📄 Raport: ${reportTxt}`)

		if (mode !== 'apply') {
			console.log('\nℹ️  DRY-RUN. Sprawdź raport, potem uruchom z --apply.\n')
			return
		}

		console.log('\n💾 Backup tabeli Member przed zapisem...')
		fs.mkdirSync(BACKUP_DIR, { recursive: true })
		const allMembers = await prisma.member.findMany()
		const backupPath = path.join(BACKUP_DIR, `members-backup-${stamp}.json`)
		fs.writeFileSync(backupPath, JSON.stringify(allMembers, null, 2), 'utf8')
		console.log(`   Backup: ${backupPath} (${allMembers.length} rekordów)`)

		const toApply = plan.results.filter(r => r.status === 'apply')
		console.log(`\n✍️  Zapisuję ${toApply.length} numerów NIP...`)
		let ok = 0
		let fail = 0
		for (const r of toApply) {
			try {
				await prisma.member.update({ where: { id: r.id }, data: { nip: r.nip } })
				ok++
				process.stdout.write('.')
			} catch (e) {
				fail++
				console.error(`\n   ❌ #${r.memberNumber} ${r.company}: ${e.message}`)
			}
		}
		console.log(`\n\n✅ Zapisano: ${ok}   ❌ Błędy: ${fail}`)
		console.log(`↩️  Backup: ${backupPath}\n`)
	} finally {
		await prisma.$disconnect()
	}
}

main().catch(e => {
	console.error(e)
	process.exit(1)
})

/**
 * fill-members-from-spis.js
 * ---------------------------------------------------------------------------
 * Uzupełnia BRAKUJĄCE pola członków w panelu (tabela Member) danymi z
 * publicznego spisu (src/config/publicMembersList.json — to, co widać na
 * pisil.pl/spis-czlonkow).
 *
 * ZASADY BEZPIECZEŃSTWA:
 *  - DRY-RUN domyślnie. Zapis do bazy tylko z flagą --apply.
 *  - NIGDY nie nadpisuje istniejącej wartości — uzupełnia wyłącznie pola puste
 *    (lub z placeholderem typu "Brak numerów telefonu").
 *  - NIGDY nie zmienia nazwy firmy (company) ani e-maila (email/login).
 *  - Dopasowanie: najpierw po e-mailu (pewne), potem fuzzy po nazwie firmy
 *    (odporne na "Sp. z o.o." vs "Spółka z ograniczoną odpowiedzialnością",
 *    wielkość liter, polskie znaki) — z KORROBORACJĄ (kod pocztowy / miasto /
 *    telefon), żeby nie pomylić różnych firm o podobnej nazwie.
 *  - Niepewne dopasowania trafiają do sekcji "DO RĘCZNEGO SPRAWDZENIA" i NIE są
 *    stosowane automatycznie.
 *  - Przed zapisem tworzy pełny backup tabeli Member (scripts/backups/...).
 *  - Zawsze zapisuje czytelny raport (scripts/reports/...).
 *
 * Uruchomienie (na VPS, w katalogu projektu):
 *   node scripts/fill-members-from-spis.js            # podgląd (nic nie zmienia)
 *   node scripts/fill-members-from-spis.js --apply    # backup + uzupełnienie
 *
 * Pola uzupełniane (spis -> Member, tylko gdy puste):
 *   Tel        -> phones
 *   Fax        -> fax
 *   Strona_www -> website
 *   Ulica/Kod/Miasto -> address (sklejone), tylko gdy address pusty
 * ---------------------------------------------------------------------------
 */

try { require('dotenv').config() } catch { /* dotenv opcjonalny */ }

const fs = require('fs')
const path = require('path')

// ── Konfiguracja ───────────────────────────────────────────────────────────
const SPIS_PATH = path.join(__dirname, '..', 'src', 'config', 'publicMembersList.json')
const BACKUP_DIR = path.join(__dirname, 'backups')
const REPORT_DIR = path.join(__dirname, 'reports')

// Progi podobieństwa nazw (0..1)
const NAME_FUZZY_MIN = 0.88          // akceptacja przy korroboracji (kod/miasto/tel)
const NAME_FUZZY_MIN_NOCORROB = 0.96 // akceptacja gdy brak danych do korroboracji

// Wartości traktowane jak "puste" (placeholdery z historycznych importów)
const PLACEHOLDERS = new Set([
	'brak', 'brak danych', 'brak danych.', 'brak numeru', 'brak numerów telefonu',
	'brak numerow telefonu', 'brak nazwy firmy', 'brak nazwy', 'brak maila',
	'b/d', 'bd', '-', '--', 'n/a', 'na', 'null', 'nie podano',
])

// ── Funkcje pomocnicze (czyste, testowalne) ────────────────────────────────

function isBlank(v) {
	if (v == null) return true
	const s = String(v).trim().toLowerCase()
	if (s === '') return true
	if (PLACEHOLDERS.has(s)) return true
	if (s.startsWith('brak_maila_')) return true // placeholderowe maile z importu
	return false
}

/** Wartość ze spisu jest "obecna" (niepusta). */
function present(v) {
	return !(v == null || String(v).trim() === '')
}

function clean(v) {
	return v == null ? '' : String(v).trim()
}

function stripDiacritics(s) {
	return String(s)
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ł/g, 'l')
		.replace(/Ł/g, 'L')
}

function normalizeEmail(v) {
	return isBlank(v) ? '' : String(v).trim().toLowerCase()
}

/**
 * Kanoniczna postać nazwy firmy do porównań.
 * Ujednolica formy prawne (sp. z o.o. == spółka z ograniczoną odpowiedzialnością),
 * usuwa interpunkcję, polskie znaki, wielkość liter, nadmiarowe spacje.
 */
function canonicalizeCompany(raw) {
	if (!raw) return ''
	let s = stripDiacritics(String(raw).toLowerCase())

	// Pełne formy prawne -> token (najdłuższe najpierw)
	s = s.replace(/spolka z ograniczona odpowiedzialnoscia/g, ' spzoo ')
	s = s.replace(/spolka komandytowo[\s-]*akcyjna/g, ' ska ')
	s = s.replace(/spolka komandytowa/g, ' spk ')
	s = s.replace(/spolka akcyjna/g, ' sa ')
	s = s.replace(/spolka jawna/g, ' spj ')
	s = s.replace(/spolka cywilna/g, ' sc ')
	s = s.replace(/spolka partnerska/g, ' spp ')

	// Usuń interpunkcję -> spacje
	s = s.replace(/[^a-z0-9]+/g, ' ')

	// Skrócone formy prawne (po rozbiciu kropek na spacje)
	s = ' ' + s + ' '
	s = s.replace(/ sp z o o /g, ' spzoo ')
	s = s.replace(/ sp z oo /g, ' spzoo ')
	s = s.replace(/ z o o /g, ' spzoo ')
	s = s.replace(/ sp k a /g, ' ska ')
	s = s.replace(/ s a /g, ' sa ')
	s = s.replace(/ sp j /g, ' spj ')
	s = s.replace(/ sp k /g, ' spk ')
	s = s.replace(/ sp p /g, ' spp ')

	return s.replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
	if (a === b) return 0
	const m = a.length
	const n = b.length
	if (m === 0) return n
	if (n === 0) return m
	let prev = new Array(n + 1)
	let curr = new Array(n + 1)
	for (let j = 0; j <= n; j++) prev[j] = j
	for (let i = 1; i <= m; i++) {
		curr[0] = i
		const ca = a.charCodeAt(i - 1)
		for (let j = 1; j <= n; j++) {
			const cost = ca === b.charCodeAt(j - 1) ? 0 : 1
			curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
		}
		;[prev, curr] = [curr, prev]
	}
	return prev[n]
}

function similarity(a, b) {
	if (!a && !b) return 1
	if (!a || !b) return 0
	const maxLen = Math.max(a.length, b.length)
	return 1 - levenshtein(a, b) / maxLen
}

/** Minimalny parser adresu (zgodny z src/lib/publicListUtils.js#parseAddressToParts). */
function parseAddr(fullAddress) {
	let ulica = fullAddress || ''
	let kod = ''
	let miasto = ''
	const zipMatch = fullAddress ? fullAddress.match(/(\d{2}[-\s]?\d{3})/) : null
	if (zipMatch) {
		kod = zipMatch[0].replace(/\s/g, '').replace(/(\d{2})(\d{3})/, '$1-$2')
		const i = zipMatch.index
		ulica = fullAddress.substring(0, i).trim().replace(/,$/, '')
		let rest = fullAddress.substring(i + zipMatch[0].length).trim().replace(/^,/, '').trim()
		miasto = rest.split(',')[0].trim()
	}
	return { ulica, kod, miasto }
}

function canonCity(v) {
	return stripDiacritics(String(v || '').toLowerCase()).replace(/[^a-z0-9]+/g, '').trim()
}

function digitsOnly(v) {
	return String(v || '').replace(/\D/g, '')
}

function corroborationAvailable(member) {
	const a = parseAddr(member.address)
	return !!(a.kod || a.miasto) || !isBlank(member.phones)
}

/** Czy member i wpis spisu wskazują na tę samą firmę (kod/miasto/telefon). */
function corroborationVerdict(member, entry) {
	const a = parseAddr(member.address)
	const mKod = a.kod.replace(/\s/g, '')
	const eKod = clean(entry.Kod).replace(/\s/g, '')
	if (mKod && eKod) return mKod === eKod ? 'match' : 'mismatch'

	const mCity = canonCity(a.miasto)
	const eCity = canonCity(entry.Miasto)
	if (mCity && eCity) return mCity === eCity ? 'match' : 'mismatch'

	const mPhone = digitsOnly(member.phones)
	const ePhone = digitsOnly(entry.Tel)
	if (mPhone && ePhone && mPhone.length >= 7 && ePhone.length >= 7) {
		return mPhone.includes(ePhone) || ePhone.includes(mPhone) ? 'match' : 'mismatch'
	}
	return 'unknown'
}

/** Sklej adres ze spisu (Ulica, Kod Miasto). */
function composeAddress(entry) {
	const ulica = clean(entry.Ulica)
	const kodMiasto = `${clean(entry.Kod)} ${clean(entry.Miasto)}`.trim()
	const parts = [ulica, kodMiasto].filter(Boolean)
	return parts.join(', ').replace(/\s+/g, ' ').trim()
}

// Mapowanie pól: spis -> Member. fromAddress=true => składane z Ulica/Kod/Miasto.
const FIELD_MAP = [
	{ member: 'phones', spis: 'Tel' },
	{ member: 'fax', spis: 'Fax' },
	{ member: 'website', spis: 'Strona_www' },
	{ member: 'address', fromAddress: true },
]

function computeFills(member, entry) {
	const fills = []
	for (const f of FIELD_MAP) {
		if (!isBlank(member[f.member])) continue // nie nadpisujemy
		const newValue = f.fromAddress ? composeAddress(entry) : clean(entry[f.spis])
		if (f.fromAddress ? newValue !== '' : present(entry[f.spis])) {
			fills.push({ field: f.member, newValue, from: f.fromAddress ? 'Ulica/Kod/Miasto' : f.spis })
		}
	}
	return fills
}

/**
 * Czysta funkcja planująca — bez DB. Zwraca plan zmian + statystyki.
 * @param {Array} members  obiekty Member (id, company, email, phones, fax, website, address, ...)
 * @param {Array} spis     wpisy publicMembersList.json
 */
function computePlan(members, spis) {
	// Indeks spisu po e-mailu
	const spisByEmail = new Map()
	for (const e of spis) {
		const key = normalizeEmail(e.Email)
		if (key && !spisByEmail.has(key)) spisByEmail.set(key, e)
	}
	// Kanoniczne nazwy wpisów spisu
	const spisCanon = spis.map(e => ({ entry: e, canon: canonicalizeCompany(e.Nazwa) }))

	const results = []
	const usedSpis = new Set()

	for (const member of members) {
		const memberCanon = canonicalizeCompany(member.company)
		const res = {
			memberId: member.id,
			memberNumber: member.memberNumber ?? null,
			company: member.company || '',
			email: member.email || '',
			method: null,
			matchedName: null,
			score: null,
			corroboration: null,
			status: 'unmatched', // unmatched | nochange | apply | review
			reason: '',
			fills: [],
		}

		// 1) Dopasowanie po e-mailu (pewne)
		const byEmail = spisByEmail.get(normalizeEmail(member.email))
		let matched = null

		if (byEmail) {
			matched = byEmail
			res.method = 'email'
			res.matchedName = byEmail.Nazwa
			res.score = 1
			res.corroboration = corroborationVerdict(member, byEmail)
		} else if (memberCanon) {
			// 2) Dokładne dopasowanie nazwy (po kanonizacji)
			const exact = spisCanon.filter(s => s.canon && s.canon === memberCanon)
			if (exact.length === 1) {
				const cand = exact[0].entry
				const verdict = corroborationVerdict(member, cand)
				if (verdict === 'mismatch') {
					res.status = 'review'
					res.method = 'name-exact'
					res.matchedName = cand.Nazwa
					res.score = 1
					res.corroboration = verdict
					res.reason = 'Nazwa zgodna, ale kod/miasto/telefon się różni — możliwe inne firmy.'
					results.push(res)
					continue
				}
				matched = cand
				res.method = 'name-exact'
				res.matchedName = cand.Nazwa
				res.score = 1
				res.corroboration = verdict
			} else if (exact.length > 1) {
				res.status = 'review'
				res.method = 'name-exact'
				res.score = 1
				res.reason = `Nazwa pasuje do ${exact.length} wpisów spisu — niejednoznaczne.`
				res.matchedName = exact.map(e => e.entry.Nazwa).join(' | ')
				results.push(res)
				continue
			} else {
				// 3) Fuzzy po nazwie
				let best = null
				let second = null
				for (const s of spisCanon) {
					if (!s.canon) continue
					const score = similarity(memberCanon, s.canon)
					if (!best || score > best.score) {
						second = best
						best = { entry: s.entry, score }
					} else if (!second || score > second.score) {
						second = { entry: s.entry, score }
					}
				}
				if (best && best.score >= NAME_FUZZY_MIN) {
					const verdict = corroborationVerdict(member, best.entry)
					const ambiguous = second && best.score - second.score < 0.03 && second.score >= NAME_FUZZY_MIN
					res.method = 'name-fuzzy'
					res.matchedName = best.entry.Nazwa
					res.score = Number(best.score.toFixed(3))
					res.corroboration = verdict

					if (ambiguous) {
						res.status = 'review'
						res.reason = `Dwa zbliżone dopasowania (${best.entry.Nazwa} ~ ${second.entry.Nazwa}).`
						results.push(res)
						continue
					}
					if (verdict === 'match') {
						matched = best.entry
					} else if (verdict === 'mismatch') {
						res.status = 'review'
						res.reason = 'Fuzzy dopasowanie, ale kod/miasto/telefon się różni.'
						results.push(res)
						continue
					} else {
						// brak danych do korroboracji — wymagaj wyższego progu
						if (best.score >= NAME_FUZZY_MIN_NOCORROB) {
							matched = best.entry
						} else {
							res.status = 'review'
							res.reason = `Fuzzy ${res.score} bez danych do potwierdzenia (kod/miasto/tel.). Wymaga oka.`
							results.push(res)
							continue
						}
					}
				}
			}
		}

		if (!matched) {
			res.status = 'unmatched'
			if (!res.reason) res.reason = 'Brak dopasowania w spisie.'
			results.push(res)
			continue
		}

		usedSpis.add(matched)
		res.fills = computeFills(member, matched)
		res.status = res.fills.length > 0 ? 'apply' : 'nochange'
		if (res.status === 'nochange') res.reason = 'Dopasowano, ale wszystkie pola już uzupełnione.'
		results.push(res)
	}

	const unusedSpis = spis.filter(e => !usedSpis.has(e))

	const stats = {
		members: members.length,
		spis: spis.length,
		apply: results.filter(r => r.status === 'apply').length,
		review: results.filter(r => r.status === 'review').length,
		nochange: results.filter(r => r.status === 'nochange').length,
		unmatched: results.filter(r => r.status === 'unmatched').length,
		fieldsToFill: results.reduce((n, r) => n + r.fills.length, 0),
		byMethod: {
			email: results.filter(r => r.method === 'email' && (r.status === 'apply' || r.status === 'nochange')).length,
			nameExact: results.filter(r => r.method === 'name-exact' && (r.status === 'apply' || r.status === 'nochange')).length,
			nameFuzzy: results.filter(r => r.method === 'name-fuzzy' && (r.status === 'apply' || r.status === 'nochange')).length,
		},
		spisUnused: unusedSpis.length,
	}

	return { results, stats, unusedSpis }
}

// ── Warstwa CLI / DB ────────────────────────────────────────────────────────

function ts() {
	return new Date().toISOString().replace(/[:.]/g, '-')
}

function buildReportText(plan, mode) {
	const { results, stats, unusedSpis } = plan
	const L = []
	L.push('RAPORT: Uzupełnianie pól członków ze spisu publicznego')
	L.push(`Tryb: ${mode === 'apply' ? 'APPLY (zapis do bazy)' : 'DRY-RUN (podgląd)'}`)
	L.push(`Data: ${new Date().toISOString()}`)
	L.push('')
	L.push('── PODSUMOWANIE ─────────────────────────────────────────')
	L.push(`Członków w panelu:            ${stats.members}`)
	L.push(`Wpisów w spisie:              ${stats.spis}`)
	L.push(`Do uzupełnienia (apply):      ${stats.apply}  (pól: ${stats.fieldsToFill})`)
	L.push(`  - po e-mailu:               ${stats.byMethod.email}`)
	L.push(`  - po nazwie (dokładnie):    ${stats.byMethod.nameExact}`)
	L.push(`  - po nazwie (fuzzy):        ${stats.byMethod.nameFuzzy}`)
	L.push(`Dopasowano, nic do zmiany:    ${stats.nochange}`)
	L.push(`Do ręcznego sprawdzenia:      ${stats.review}`)
	L.push(`Bez dopasowania (panel):      ${stats.unmatched}`)
	L.push(`Wpisy spisu bez dopasowania:  ${stats.spisUnused}`)
	L.push('')

	const applies = results.filter(r => r.status === 'apply')
	if (applies.length) {
		L.push('── DO UZUPEŁNIENIA ──────────────────────────────────────')
		for (const r of applies) {
			L.push(`#${r.memberNumber ?? '—'} ${r.company}  [${r.method}${r.score != null ? ' ' + r.score : ''}; korrob: ${r.corroboration}]`)
			L.push(`    spis: ${r.matchedName}`)
			for (const f of r.fills) {
				L.push(`    + ${f.field} (z ${f.from}): "${f.newValue}"`)
			}
		}
		L.push('')
	}

	const reviews = results.filter(r => r.status === 'review')
	if (reviews.length) {
		L.push('── DO RĘCZNEGO SPRAWDZENIA (NIE zastosowano) ────────────')
		for (const r of reviews) {
			L.push(`#${r.memberNumber ?? '—'} ${r.company}  [${r.method || '—'}${r.score != null ? ' ' + r.score : ''}]`)
			L.push(`    kandydat: ${r.matchedName || '—'}`)
			L.push(`    powód: ${r.reason}`)
		}
		L.push('')
	}

	if (unusedSpis.length) {
		L.push('── WPISY SPISU BEZ DOPASOWANIA W PANELU (informacyjnie) ──')
		for (const e of unusedSpis) {
			L.push(`    ${e.Nazwa}  <${clean(e.Email)}>  ${clean(e.Miasto)}`)
		}
		L.push('')
	}

	return L.join('\n')
}

function parseArgs(argv) {
	return {
		apply: argv.includes('--apply'),
		help: argv.includes('--help') || argv.includes('-h'),
	}
}

async function main() {
	const args = parseArgs(process.argv.slice(2))
	if (args.help) {
		console.log('Użycie:\n  node scripts/fill-members-from-spis.js           # DRY-RUN (podgląd)\n  node scripts/fill-members-from-spis.js --apply   # backup + zapis do bazy')
		return
	}

	const mode = args.apply ? 'apply' : 'dry-run'
	console.log(`\n🔎 Tryb: ${mode === 'apply' ? 'APPLY (zapis do bazy)' : 'DRY-RUN (podgląd — nic nie zmienia)'}\n`)

	// Wczytaj spis
	if (!fs.existsSync(SPIS_PATH)) {
		console.error(`❌ Brak pliku spisu: ${SPIS_PATH}`)
		process.exit(1)
	}
	const spis = JSON.parse(fs.readFileSync(SPIS_PATH, 'utf8'))
	if (!Array.isArray(spis)) {
		console.error('❌ Spis nie jest tablicą JSON.')
		process.exit(1)
	}

	// Prisma dopiero tutaj (żeby import modułu w testach nie łączył się z bazą)
	const { PrismaClient } = require('@prisma/client')
	const prisma = new PrismaClient()

	try {
		const members = await prisma.member.findMany({
			select: {
				id: true, memberNumber: true, company: true, email: true,
				phones: true, fax: true, website: true, address: true,
			},
			orderBy: { company: 'asc' },
		})

		const plan = computePlan(members, spis)

		// Raport
		fs.mkdirSync(REPORT_DIR, { recursive: true })
		const stamp = ts()
		const reportText = buildReportText(plan, mode)
		const reportTxtPath = path.join(REPORT_DIR, `fill-members-${mode}-${stamp}.txt`)
		const reportJsonPath = path.join(REPORT_DIR, `fill-members-${mode}-${stamp}.json`)
		fs.writeFileSync(reportTxtPath, reportText, 'utf8')
		fs.writeFileSync(reportJsonPath, JSON.stringify(plan, null, 2), 'utf8')

		// Skrót na konsolę
		const s = plan.stats
		console.log('── PODSUMOWANIE ─────────────────────────────')
		console.log(`Członków w panelu:           ${s.members}`)
		console.log(`Wpisów w spisie:             ${s.spis}`)
		console.log(`Do uzupełnienia:             ${s.apply}  (pól: ${s.fieldsToFill})`)
		console.log(`  e-mail / nazwa / fuzzy:    ${s.byMethod.email} / ${s.byMethod.nameExact} / ${s.byMethod.nameFuzzy}`)
		console.log(`Nic do zmiany:               ${s.nochange}`)
		console.log(`Do ręcznego sprawdzenia:     ${s.review}`)
		console.log(`Bez dopasowania (panel):     ${s.unmatched}`)
		console.log(`Spis bez dopasowania:        ${s.spisUnused}`)
		console.log('')
		console.log(`📄 Raport: ${reportTxtPath}`)
		console.log(`📄 Raport (JSON): ${reportJsonPath}`)

		if (mode !== 'apply') {
			console.log('\nℹ️  To był DRY-RUN. Sprawdź raport, a następnie uruchom z --apply, aby zapisać zmiany.\n')
			return
		}

		// APPLY: backup + zapis
		console.log('\n💾 Tworzę backup tabeli Member przed zapisem...')
		fs.mkdirSync(BACKUP_DIR, { recursive: true })
		const allMembers = await prisma.member.findMany()
		const backupPath = path.join(BACKUP_DIR, `members-backup-${stamp}.json`)
		fs.writeFileSync(backupPath, JSON.stringify(allMembers, null, 2), 'utf8')
		console.log(`   Backup: ${backupPath} (${allMembers.length} rekordów)`)

		const toApply = plan.results.filter(r => r.status === 'apply')
		console.log(`\n✍️  Zapisuję ${toApply.length} aktualizacji...`)
		let ok = 0
		let fail = 0
		for (const r of toApply) {
			const data = {}
			for (const f of r.fills) data[f.field] = f.newValue
			try {
				await prisma.member.update({ where: { id: r.memberId }, data })
				ok++
				process.stdout.write('.')
			} catch (e) {
				fail++
				console.error(`\n   ❌ Błąd przy #${r.memberNumber} ${r.company}: ${e.message}`)
			}
		}
		console.log(`\n\n✅ Zapisano: ${ok}   ❌ Błędy: ${fail}`)
		console.log(`↩️  W razie potrzeby przywróć z backupu: ${backupPath}\n`)
	} finally {
		await prisma.$disconnect()
	}
}

// Eksport czystych funkcji do testów
module.exports = {
	isBlank, present, normalizeEmail, canonicalizeCompany, levenshtein, similarity,
	parseAddr, canonCity, corroborationVerdict, corroborationAvailable, composeAddress,
	computeFills, computePlan, NAME_FUZZY_MIN, NAME_FUZZY_MIN_NOCORROB,
}

if (require.main === module) {
	main().catch(e => {
		console.error(e)
		process.exit(1)
	})
}

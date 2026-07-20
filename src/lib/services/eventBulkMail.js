/**
 * Wspólna logika odbiorców masowej wysyłki do zapisanych na wydarzenie.
 *
 * CommonJS — używany i przez worker BullMQ (`require`), i przez trasy Next.js (`import`). Jedno źródło
 * prawdy o tym, „kto jest odbiorcą" i „komu jeszcze nie dotarło", żeby licznik w panelu, wysyłka i
 * „ponów brakującym" liczyły dokładnie to samo. Prisma jest wstrzykiwana (testowalność bez bazy).
 */

// Scope w MailSendLog dla kampanii wydarzeniowych. refId = id kampanii (EventMailing.id).
const SCOPE = 'event-bulk'

// Grupy odbiorców. Anulowani NIGDY nie dostają nic — nie ma tu na nich wariantu i nie wolno go dodać
// bez świadomej decyzji (osoba, która się wypisała, nie powinna dostawać maili o wydarzeniu).
const RECIPIENT_FILTERS = {
	CONFIRMED: { statusRejestracji: 'POTWIERDZONA' },
	PAID: { statusRejestracji: 'POTWIERDZONA', statusPlatnosci: 'OPLACONE' },
	WAITLIST: { statusRejestracji: 'LISTA_REZERWOWA' },
	CONFIRMED_AND_WAITLIST: { statusRejestracji: { in: ['POTWIERDZONA', 'LISTA_REZERWOWA'] } },
}

function isValidFilter(recipientFilter) {
	return Object.prototype.hasOwnProperty.call(RECIPIENT_FILTERS, recipientFilter)
}

// Filtr odbiorców. NIE ma cichego domyślnego wariantu: nieznana wartość rzuca wyjątkiem. Przy kilku
// grupach odbiorców ciche „w razie czego wyślij potwierdzonym" mogłoby wysłać wiadomość NIE TEJ grupie
// (np. „niestety nie udało się" do osób, które mają miejsce) — lepiej odmówić niż trafić w złych ludzi.
function whereForFilter(eventId, recipientFilter) {
	if (!isValidFilter(recipientFilter)) {
		throw new Error(`eventBulkMail: nieznana grupa odbiorców "${recipientFilter}".`)
	}
	return { eventId, ...RECIPIENT_FILTERS[recipientFilter] }
}

// Zbiór adresów odbiorców kampanii — zdeduplikowany, tylko poprawne adresy, znormalizowany (trim+lower),
// żeby ten sam mailbox w dwóch wariantach wielkości liter nie dostał maila dwa razy i pasował do logu.
function normalizeEmail(e) {
	return (e || '').trim().toLowerCase()
}

async function targetEmails(prisma, eventId, recipientFilter) {
	const regs = await prisma.eventRegistration.findMany({
		where: whereForFilter(eventId, recipientFilter),
		select: { email: true },
	})
	return [...new Set(regs.map(r => normalizeEmail(r.email)).filter(e => e.includes('@')))]
}

// Adresy, do których kampania jeszcze nie dotarła: brak wiersza WYSLANY w MailSendLog.
// (Wiersze BLAD nie liczą się jako „dostarczone" — trafiają do brakujących i zostaną dosłane.)
async function missingEmails(prisma, mailing) {
	const targets = await targetEmails(prisma, mailing.eventId, mailing.recipientFilter)
	const delivered = await prisma.mailSendLog.findMany({
		where: { scope: SCOPE, refId: mailing.id, status: 'WYSLANY' },
		select: { email: true },
	})
	const sent = new Set(delivered.map(r => r.email))
	return targets.filter(e => !sent.has(e))
}

module.exports = { SCOPE, RECIPIENT_FILTERS, isValidFilter, whereForFilter, normalizeEmail, targetEmails, missingEmails }

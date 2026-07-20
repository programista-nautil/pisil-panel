// Szablony maili masowych do zapisanych na wydarzenie. CommonJS — używane i przez trasy Next.js
// (import), i przez worker BullMQ (require), i przez komponent panelu. Bez placeholderów per-osoba:
// jedna treść idzie do wszystkich (WYSIWYG — dokładnie to, co admin widzi w oknie, trafia do odbiorców).

// Zamienia zwykły tekst z pola (textarea) na bezpieczny HTML: escapuje znaki, akapity po pustej linii,
// pojedyncze nowe linie na <br>. Escape, bo treść wpisuje człowiek — nie chcemy wstrzyknięcia HTML.
function textToHtml(text) {
	const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
	return String(text || '')
		.split(/\n\n+/)
		.map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`)
		.join('')
}

function formatDate(event) {
	return event && event.startAt
		? new Date(event.startAt).toLocaleString('pl-PL', { dateStyle: 'long', timeStyle: 'short' })
		: '[termin]'
}

function formatPlace(event) {
	if (event && event.tryb === 'ONLINE') return 'Online (link do spotkania prześlemy w osobnej wiadomości)'
	return (event && event.address) || '[miejsce do potwierdzenia]'
}

const SIGNATURE = ['Pozdrawiamy,', 'Polska Izba Spedycji i Logistyki']

function joinLines(lines) {
	return lines.filter(l => l !== null).join('\n')
}

// #9 — informacje organizacyjne („know before you go"). Dane wydarzenia wpisane wprost w treść
// (nie placeholdery), żeby admin od razu widział finalny tekst i mógł go dowolnie zmienić.
function defaultOrgTemplate(event) {
	const title = (event && event.title) || ''
	return {
		subject: `Informacje organizacyjne — ${title}`,
		body: joinLines([
			'Szanowni Państwo,',
			'',
			`przypominamy o zbliżającym się wydarzeniu „${title}".`,
			'',
			`Termin: ${formatDate(event)}`,
			`Miejsce: ${formatPlace(event)}`,
			event && event.prowadzacy ? `Prowadzący: ${event.prowadzacy}` : null,
			'',
			'[Tu można dopisać program, informacje o dojeździe i parkingu, materiały dla uczestników.]',
			'',
			'W razie pytań prosimy o kontakt.',
			'',
			...SIGNATURE,
		]),
	}
}

// #8 — link do spotkania online. JEDYNY mail, który zawiera `onlineUrl` (publiczne API go nie ujawnia).
// Wysyłka jest twardo blokowana, gdy link jest pusty — patrz `requiresOnlineUrl` w rejestrze niżej.
function linkTemplate(event) {
	const title = (event && event.title) || ''
	return {
		subject: `Link do spotkania — ${title}`,
		body: joinLines([
			'Szanowni Państwo,',
			'',
			`poniżej przesyłamy link do spotkania online „${title}".`,
			'',
			`Termin: ${formatDate(event)}`,
			`Link do spotkania: ${(event && event.onlineUrl) || '[BRAK LINKU]'}`,
			'',
			'Prosimy o dołączenie kilka minut przed rozpoczęciem. Link jest przeznaczony wyłącznie',
			'dla osób zapisanych — prosimy go nie przekazywać dalej.',
			'',
			...SIGNATURE,
		]),
	}
}

// #10 — przypomnienie tuż przed wydarzeniem. Krótkie, bez powtarzania całej organizacji. Dla wydarzeń
// online NIE dubluje linku (ten poszedł osobno) — tylko odsyła do tamtej wiadomości, żeby uczestnik
// wiedział, gdzie go szukać.
function reminderTemplate(event) {
	const title = (event && event.title) || ''
	const miejsce =
		event && event.tryb === 'ONLINE'
			? 'Online — link do spotkania przesłaliśmy w osobnej wiadomości'
			: (event && event.address) || '[miejsce do potwierdzenia]'
	return {
		subject: `Przypomnienie — ${title}`,
		body: joinLines([
			'Szanowni Państwo,',
			'',
			`przypominamy, że już wkrótce odbędzie się wydarzenie „${title}", na które są Państwo zapisani.`,
			'',
			`Termin: ${formatDate(event)}`,
			`Miejsce: ${miejsce}`,
			event && event.prowadzacy ? `Prowadzący: ${event.prowadzacy}` : null,
			'',
			'Do zobaczenia!',
			'',
			...SIGNATURE,
		]),
	}
}

// #11 — zmiana albo odwołanie wydarzenia. Idzie także do listy rezerwowej: te osoby też czekają
// i muszą wiedzieć, że nie ma na co czekać.
function changeTemplate(event) {
	const title = (event && event.title) || ''
	return {
		subject: `Ważna informacja o wydarzeniu — ${title}`,
		body: joinLines([
			'Szanowni Państwo,',
			'',
			`informujemy o zmianie dotyczącej wydarzenia „${title}" (planowany termin: ${formatDate(event)}).`,
			'',
			'[Tu proszę opisać zmianę: nowy termin, zmiana miejsca albo odwołanie wydarzenia',
			'wraz z informacją o zwrocie wpłat.]',
			'',
			'Przepraszamy za niedogodności. W razie pytań prosimy o kontakt.',
			'',
			...SIGNATURE,
		]),
	}
}

// #5 — „niestety nie udało się". Tylko do listy rezerwowej, po zamknięciu zapisów.
// BEZWZGLĘDNIE bez kwoty i numeru konta — te osoby za nic nie płacą.
function waitlistRejectedTemplate(event) {
	const title = (event && event.title) || ''
	return {
		subject: `Lista rezerwowa — ${title}`,
		body: joinLines([
			'Szanowni Państwo,',
			'',
			`dziękujemy za zainteresowanie wydarzeniem „${title}" (${formatDate(event)}).`,
			'',
			'Niestety liczba miejsc okazała się niewystarczająca i nie udało się zwolnić miejsca',
			'z listy rezerwowej. Państwa zgłoszenie nie zostało potwierdzone i nie wiąże się',
			'z żadną opłatą.',
			'',
			'O kolejnych terminach będziemy informować — zapraszamy do udziału.',
			'',
			...SIGNATURE,
		]),
	}
}

// Rejestr rodzajów wiadomości. Wiąże szablon z DOZWOLONYMI grupami odbiorców — zabezpieczenie przed
// pomyłką, która byłaby kompromitująca (np. „niestety nie udało się" do osób, które mają miejsce).
// `requiresOnlineUrl` włącza twardą walidację: bez linku nie da się wysłać (i w panelu, i na serwerze).
const TEMPLATES = {
	INFO: {
		label: 'Informacje organizacyjne',
		build: defaultOrgTemplate,
		allowedFilters: ['CONFIRMED', 'PAID'],
	},
	LINK: {
		label: 'Link do spotkania online',
		build: linkTemplate,
		allowedFilters: ['CONFIRMED', 'PAID'],
		requiresOnlineUrl: true,
	},
	REMINDER: {
		label: 'Przypomnienie o wydarzeniu',
		build: reminderTemplate,
		allowedFilters: ['CONFIRMED', 'PAID'],
	},
	CHANGE: {
		label: 'Zmiana / odwołanie wydarzenia',
		build: changeTemplate,
		allowedFilters: ['CONFIRMED_AND_WAITLIST', 'CONFIRMED'],
	},
	WAITLIST_REJECTED: {
		label: 'Niestety nie udało się (lista rezerwowa)',
		build: waitlistRejectedTemplate,
		allowedFilters: ['WAITLIST'],
	},
}

function getTemplate(kind) {
	return Object.prototype.hasOwnProperty.call(TEMPLATES, kind) ? TEMPLATES[kind] : null
}

// Czy para (rodzaj wiadomości, grupa odbiorców) jest dozwolona. Używane po stronie panelu (co pokazać)
// i serwera (czego nie wypuścić) — jedno źródło prawdy, żeby się nie rozjechały.
function isAllowedPair(kind, recipientFilter) {
	const t = getTemplate(kind)
	return !!t && t.allowedFilters.includes(recipientFilter)
}

module.exports = {
	textToHtml,
	defaultOrgTemplate,
	linkTemplate,
	reminderTemplate,
	changeTemplate,
	waitlistRejectedTemplate,
	TEMPLATES,
	getTemplate,
	isAllowedPair,
}

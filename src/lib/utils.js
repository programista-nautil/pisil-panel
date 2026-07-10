export const sanitizeFilename = name => {
	return name
		.replace(/[/\\?%*:|"<>]/g, '_')
		.trim()
		.replace(/\s+/g, ' ')
}

// Transliteracja polskich znaków → ASCII (do slugów URL)
const PL_MAP = {
	ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
	Ą: 'a', Ć: 'c', Ę: 'e', Ł: 'l', Ń: 'n', Ó: 'o', Ś: 's', Ź: 'z', Ż: 'z',
}

/**
 * Tworzy slug URL-friendly z tekstu (np. tytułu wydarzenia).
 * "Konferencja Spedycyjna 2026" → "konferencja-spedycyjna-2026"
 */
export const slugify = text => {
	if (!text) return ''
	return String(text)
		.replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, ch => PL_MAP[ch] || ch)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
}

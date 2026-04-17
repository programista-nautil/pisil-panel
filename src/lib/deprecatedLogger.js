export function logDeprecated(request) {
	try {
		const { pathname } = new URL(request.url)
		console.warn('[DEPRECATED API]', request.method, pathname)
	} catch {
		console.warn('[DEPRECATED API]')
	}
}

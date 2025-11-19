export const sanitizeFilename = name => {
	return name
		.replace(/[/\\?%*:|"<>]/g, '_')
		.trim()
		.replace(/\s+/g, ' ')
}

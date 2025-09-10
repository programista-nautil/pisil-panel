export const sanitizeFilename = name => name.replace(/[^a-zA-Z0-9.\-_]/g, '_')

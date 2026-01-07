import { NextResponse } from 'next/server'
import { auth } from '@/auth' // lub twoja ścieżka do konfiguracji auth
import fs from 'fs'
import path from 'path'
import mime from 'mime'

export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
	}

	const { filename } = params

	// Zabezpieczenie przed Directory Traversal (np. ../../)
	const safeFilename = path.basename(filename)

	// Ścieżka do folderu private/newsletter-list
	const filePath = path.join(process.cwd(), 'private', 'newsletter-list', safeFilename)

	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ message: 'File not found' }, { status: 404 })
	}

	const fileBuffer = fs.readFileSync(filePath)
	const mimeType = mime.getType(filePath) || 'application/pdf'

	return new NextResponse(fileBuffer, {
		headers: {
			'Content-Type': mimeType,
			'Content-Disposition': `attachment; filename="${safeFilename}"`,
		},
	})
}

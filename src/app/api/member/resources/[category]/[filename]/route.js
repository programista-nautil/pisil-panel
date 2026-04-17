import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { STATIC_ACCEPTANCE_DOCUMENTS } from '@/lib/staticDocuments'

const CATEGORIES = {
	newsletter: { dir: 'newsletter-list' },
	reports: { dir: 'reports-list', fallbackDispositionName: 'sprawozdanie.pdf' },
	acceptance: { dir: 'acceptance-documents', whitelist: STATIC_ACCEPTANCE_DOCUMENTS, requireRole: 'member' },
}

export async function GET(request, { params }) {
	const session = await auth()
	if (!session) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const { category, filename } = await params
	const config = CATEGORIES[category]
	if (!config) {
		return NextResponse.json({ message: 'Nieznana kategoria zasobu' }, { status: 404 })
	}

	if (config.requireRole && session.user?.role !== config.requireRole) {
		return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
	}

	const decoded = decodeURIComponent(filename)
	const safeFilename = path.basename(decoded)

	if (config.whitelist && !config.whitelist.includes(safeFilename)) {
		return NextResponse.json({ message: 'Brak dostępu do tego pliku' }, { status: 403 })
	}

	const filePath = path.join(process.cwd(), 'private', config.dir, safeFilename)

	if (!fs.existsSync(filePath)) {
		return NextResponse.json({ message: 'Nie znaleziono pliku' }, { status: 404 })
	}

	const fileBuffer = fs.readFileSync(filePath)
	const mimeType = mime.getType(filePath) || 'application/octet-stream'
	const headerEncodedFilename = encodeURIComponent(safeFilename)
	const fallbackName = config.fallbackDispositionName || safeFilename

	return new NextResponse(fileBuffer, {
		headers: {
			'Content-Type': mimeType,
			'Content-Disposition': `attachment; filename="${fallbackName}"; filename*=UTF-8''${headerEncodedFilename}`,
		},
	})
}

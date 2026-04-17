import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import fs from 'fs'
import path from 'path'
import mime from 'mime'
import { logDeprecated } from '@/lib/deprecatedLogger'

export async function GET(request, { params }) {
    logDeprecated(request)
    const session = await auth()
    if (!session) {
        return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })
    }

    const { filename } = await params

   const decodedFilename = decodeURIComponent(filename)
    const safeFilename = path.basename(decodedFilename)

    // Ścieżka do folderu private/reports-list
    const filePath = path.join(process.cwd(), 'private', 'reports-list', safeFilename)

    if (!fs.existsSync(filePath)) {
        return NextResponse.json({ message: 'Nie znaleziono pliku' }, { status: 404 })
    }

    const fileBuffer = fs.readFileSync(filePath)
    const mimeType = mime.getType(filePath) || 'application/octet-stream'

    const headerEncodedFilename = encodeURIComponent(safeFilename)

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': mimeType,
           
            'Content-Disposition': `attachment; filename="sprawozdanie.pdf"; filename*=UTF-8''${headerEncodedFilename}`,
        },
    })
}
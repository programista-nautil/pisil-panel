import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendToOne } from '@/lib/mailer'
import { textToHtml } from '@/lib/eventMailTemplate'
import { downloadFileFromGCS } from '@/lib/gcs'
import { isOwnAttachmentPath } from '@/lib/services/eventBulkMail'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mail testowy do siebie przed wysyłką zbiorczą — jedyny sposób zobaczyć RZECZYWISTY render w skrzynce
// (podgląd HTML w panelu to nie to samo). Synchronicznie (nie przez kolejkę), żeby admin od razu wiedział,
// czy poszło. Temat prefiksowany [TEST].
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		const { id } = await params
		const body = await request.json().catch(() => ({}))
		const subject = (body.subject || '').trim()
		const tresc = (body.body || '').trim()
		const to = (body.to || '').trim()

		if (!subject || !tresc) {
			return NextResponse.json({ message: 'Temat i treść są wymagane.' }, { status: 400 })
		}
		if (!EMAIL_RE.test(to)) {
			return NextResponse.json({ message: 'Podaj poprawny adres do wysyłki testowej.' }, { status: 400 })
		}

		// Test MUSI nieść te same załączniki co właściwa wysyłka — inaczej „obowiązkowy test" pokazywałby
		// coś innego, niż dostaną uczestnicy. Ścieżki sprawdzamy tak samo jak przy wysyłce.
		const zadane = Array.isArray(body.attachments) ? body.attachments : []
		for (const a of zadane) {
			if (!a || !isOwnAttachmentPath(id, a.path) || !a.filename) {
				return NextResponse.json({ message: 'Nieprawidłowy załącznik.' }, { status: 400 })
			}
		}
		const attachments = await Promise.all(
			zadane.map(async a => ({
				filename: a.filename,
				content: await downloadFileFromGCS(a.path),
				contentType: a.mimeType || 'application/octet-stream',
			}))
		)

		await sendToOne({ to, subject: `[TEST] ${subject}`, html: textToHtml(tresc), attachments })
		return NextResponse.json({ sent: true }, { status: 200 })
	} catch (error) {
		console.error('Błąd wysyłki testowej:', error)
		return NextResponse.json({ message: error.message || 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

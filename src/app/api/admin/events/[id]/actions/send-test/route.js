import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { sendToOne } from '@/lib/mailer'
import { textToHtml } from '@/lib/eventMailTemplate'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mail testowy do siebie przed wysyłką zbiorczą — jedyny sposób zobaczyć RZECZYWISTY render w skrzynce
// (podgląd HTML w panelu to nie to samo). Synchronicznie (nie przez kolejkę), żeby admin od razu wiedział,
// czy poszło. Temat prefiksowany [TEST].
export async function POST(request, { params }) {
	const session = await auth()
	if (!session || session.user?.role !== 'admin') return NextResponse.json({ message: 'Brak autoryzacji' }, { status: 401 })

	try {
		await params // spójność sygnatury; sama trasa nie potrzebuje id wydarzenia
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

		await sendToOne({ to, subject: `[TEST] ${subject}`, html: textToHtml(tresc) })
		return NextResponse.json({ sent: true }, { status: 200 })
	} catch (error) {
		console.error('Błąd wysyłki testowej:', error)
		return NextResponse.json({ message: error.message || 'Wystąpił błąd serwera' }, { status: 500 })
	}
}

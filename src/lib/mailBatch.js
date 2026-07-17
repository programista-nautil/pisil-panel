/**
 * Wysyłka masowa z gwarancją „dokładnie raz" (idempotencja) + pacingiem pod limit Exchange Online.
 *
 * CommonJS — używany przez worker BullMQ (`require`). Zależności (prisma, sendToOne, sleep) są
 * WSTRZYKIWANE, żeby dało się to przetestować bez Redisa i bez SMTP.
 *
 * Idempotencja: dla każdego odbiorcy zakładamy znacznik w bazie PRZED wysyłką. Naruszenie unikalności
 * (P2002) znaczy „do tej osoby już poszło" → pomijamy. Kolejność „zapis → wysyłka" jest celowa: SMTP
 * nie jest transakcyjny, więc któraś kolejność musi być ryzykowna. Wolimy mail NIEWYSŁANY (widać go
 * w logu jako brak/BLAD, można ponowić) niż wysłany DWA razy. Baza przeżywa restart procesu — pamięć nie.
 */

/**
 * @param {object} opcje
 * @param {string} opcje.scope   rodzaj wysyłki, np. "notify-members"
 * @param {string} opcje.refId   czego dotyczy (submissionId / eventId / communicationId)
 * @param {string[]} opcje.odbiorcy  adresy e-mail
 * @param {(email:string)=>object} opcje.budujWiadomosc  buduje wiadomość dla `sendToOne`
 * @param {number} [opcje.batchSize=25]  ile maili na partię
 * @param {number} [opcje.delayMs=60000] przerwa między partiami (limit Exchange: 30 wiadomości/min)
 * @param {object} deps { prisma, sendToOne, sleep, logger }
 * @returns {Promise<{wyslano:number, pominieto:number, bledy:Array<{email:string,error:string}>}>}
 */
async function wyslijMasowoIdempotentnie(opcje, deps) {
	const { scope, refId, odbiorcy, budujWiadomosc, batchSize = 25, delayMs = 60000 } = opcje
	const { prisma, sendToOne, sleep, logger = console } = deps

	let wyslano = 0
	let pominieto = 0
	const bledy = []

	for (let i = 0; i < odbiorcy.length; i += batchSize) {
		const batch = odbiorcy.slice(i, i + batchSize)

		await Promise.all(
			batch.map(async email => {
				// 1) Znacznik PRZED wysyłką. Jeśli już istnieje — do tej osoby poszło, nie wysyłamy drugi raz.
				try {
					await prisma.mailSendLog.create({ data: { scope, refId, email } })
				} catch (e) {
					if (e.code === 'P2002') {
						pominieto++
						return
					}
					throw e
				}

				// 2) Wysyłka. Błąd jednego adresu NIE zabija partii — oznaczamy go i lecimy dalej.
				try {
					await sendToOne(budujWiadomosc(email))
					wyslano++
				} catch (sendErr) {
					const msg = String(sendErr && sendErr.message ? sendErr.message : sendErr)
					bledy.push({ email, error: msg })
					logger.error(`❌ Błąd wysyłki do ${email}: ${msg}`)
					// Znacznik zostaje (nie kasujemy) — status BLAD zasila listę „kto nie dostał".
					// Ponowne uruchomienie zadania NIE wyśle tu drugi raz; nieudane dosyła się świadomie.
					await prisma.mailSendLog
						.update({
							where: { scope_refId_email: { scope, refId, email } },
							data: { status: 'BLAD', error: msg.slice(0, 500) },
						})
						.catch(() => {})
				}
			})
		)

		// Pacing pod limit Exchange Online (30 wiadomości/min): odczekujemy między partiami.
		if (i + batchSize < odbiorcy.length) await sleep(delayMs)
	}

	return { wyslano, pominieto, bledy }
}

module.exports = { wyslijMasowoIdempotentnie }

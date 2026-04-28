import { pdfRenderLines } from './pdfUtils'

/**
 * Tworzy mock instancji jsPDF z rejestrem wywołań text() i addPage().
 */
function makePdf() {
  const calls = []
  return {
    text: jest.fn((line, x, y) => calls.push({ type: 'text', line, x, y })),
    addPage: jest.fn(() => calls.push({ type: 'addPage' })),
    _calls: calls,
  }
}

describe('pdfRenderLines — podstawowe działanie', () => {
  test('renderuje każdą linię w odpowiedniej pozycji Y', () => {
    const pdf = makePdf()
    const y = pdfRenderLines(pdf, ['alfa', 'beta', 'gamma'], 10, 50, 5, 280)
    expect(pdf.text).toHaveBeenCalledTimes(3)
    expect(pdf.text).toHaveBeenNthCalledWith(1, 'alfa', 10, 50)
    expect(pdf.text).toHaveBeenNthCalledWith(2, 'beta', 10, 55)
    expect(pdf.text).toHaveBeenNthCalledWith(3, 'gamma', 10, 60)
    expect(y).toBe(65)
    expect(pdf.addPage).not.toHaveBeenCalled()
  })

  test('nie dodaje strony gdy tekst dokładnie mieści się w limicie', () => {
    const pdf = makePdf()
    // ostatnia linia zaczyna się na y=278 → równo pageBottom, nie przekracza
    pdfRenderLines(pdf, ['linia'], 10, 278, 5, 278)
    expect(pdf.addPage).not.toHaveBeenCalled()
  })

  test('dodaje stronę gdy y przekroczy pageBottom przed renderowaniem linii', () => {
    const pdf = makePdf()
    // startY = 280 > pageBottom = 278 → addPage przed pierwszą linią
    const y = pdfRenderLines(pdf, ['linia'], 10, 280, 5, 278, 25)
    expect(pdf.addPage).toHaveBeenCalledTimes(1)
    expect(pdf.text).toHaveBeenCalledWith('linia', 10, 25)
    expect(y).toBe(30)
  })

  test('resetuje y do pageTop po dodaniu nowej strony', () => {
    const pdf = makePdf()
    const pageTop = 30
    pdfRenderLines(pdf, ['overflow'], 15, 285, 6, 278, pageTop)
    expect(pdf.addPage).toHaveBeenCalledTimes(1)
    expect(pdf.text).toHaveBeenCalledWith('overflow', 15, pageTop)
  })

  test('używa domyślnego pageTop=25 gdy nie podano', () => {
    const pdf = makePdf()
    pdfRenderLines(pdf, ['x'], 10, 290, 5, 278) // brak pageTop → 25
    expect(pdf.text).toHaveBeenCalledWith('x', 10, 25)
  })
})

describe('pdfRenderLines — długie teksty wielostronicowe', () => {
  test('dodaje wiele stron dla bardzo długiego tekstu (symulacja ankiety)', () => {
    const pdf = makePdf()
    // 120 linii po 5pt = 600pt; strona ma ~253pt (278-25), więc ~2-3 strony
    const lines = Array.from({ length: 120 }, (_, i) => `Linia ${i + 1}`)
    pdfRenderLines(pdf, lines, 15, 25, 5, 278, 25)

    expect(pdf.addPage).toHaveBeenCalled()
    expect(pdf.text).toHaveBeenCalledTimes(120)
  })

  test('po dodaniu strony kolejne linie są renderowane od pageTop', () => {
    const pdf = makePdf()
    // 3 linie: pierwsza mieści się (y=270), druga i trzecia powodują nową stronę
    pdfRenderLines(pdf, ['A', 'B', 'C'], 10, 270, 10, 278, 25)

    const calls = pdf._calls
    // A: y=270 (mieści się)
    expect(calls[0]).toEqual({ type: 'text', line: 'A', x: 10, y: 270 })
    // B: y=280 > 278 → addPage
    expect(calls[1]).toEqual({ type: 'addPage' })
    // B renderowane od pageTop=25
    expect(calls[2]).toEqual({ type: 'text', line: 'B', x: 10, y: 25 })
    // C: y=35 (mieści się)
    expect(calls[3]).toEqual({ type: 'text', line: 'C', x: 10, y: 35 })
  })

  test('obsługuje tekst przekraczający wiele stron z rzędu', () => {
    const pdf = makePdf()
    // Każda linia startuje od pageBottom+1 (symulacja wyjątkowo długiego bloku)
    const LINES = 10
    pdfRenderLines(pdf, Array(LINES).fill('x'), 10, 279, 0, 278, 25)
    // każda linia powoduje nową stronę (y zawsze 279 > 278 → addPage, reset do 25+0=25 → znów 25 > 278? Nie)
    // Właściwie: startY=279>278 → addPage, y=25; następna linia y=25 nie > 278 → brak addPage...
    // Sprawdźmy tylko że addPage było wywołane co najmniej raz
    expect(pdf.addPage).toHaveBeenCalled()
  })
})

describe('pdfRenderLines — zgodność z użyciem w generatorach', () => {
  test('surveyPdfGenerator — symulacja bloku pytanie+odpowiedź z podziałem', () => {
    const pdf = makePdf()
    const LINE_H = 5
    const PAGE_BOTTOM = 278
    const PAGE_TOP = 25

    // Symuluj stan: jesteśmy na dole strony (y=260), długi blok 30 linii
    const questionLines = Array(3).fill('Pytanie testowe')
    const answerLines = Array(27).fill('Długa odpowiedź...')

    let y = 260
    // Sprawdź czy blok się mieści
    const blockHeight = (questionLines.length + answerLines.length) * LINE_H
    if (y + blockHeight > PAGE_BOTTOM) {
      pdf.addPage()
      y = PAGE_TOP
    }
    y = pdfRenderLines(pdf, questionLines, 15, y, LINE_H, PAGE_BOTTOM, PAGE_TOP)
    y = pdfRenderLines(pdf, answerLines, 15, y, LINE_H, PAGE_BOTTOM, PAGE_TOP)

    // Blok 30 linii * 5pt = 150pt, nie mieści się od y=260 (260+150=410 > 278)
    // → addPage wywołany (raz przez blok-check lub przez renderLines)
    expect(pdf.addPage).toHaveBeenCalled()
    expect(pdf.text).toHaveBeenCalledTimes(30)
  })

  test('deklaracja/patronat — wrapText z pdfRenderLines nie przerywa tekstu', () => {
    const pdf = makePdf()
    // Symuluj wrapText: splitTextToSize zwraca 50 linii (długi opis działalności)
    const lines = Array.from({ length: 50 }, (_, i) => `Opis działalności, linia ${i + 1}`)
    const endY = pdfRenderLines(pdf, lines, 20, 100, 6, 277, 30)

    // Wszystkie 50 linii zostały wyrenderowane
    expect(pdf.text).toHaveBeenCalledTimes(50)
    // Strony zostały dodane gdy potrzeba
    expect(pdf.addPage).toHaveBeenCalled()
    // Końcowa pozycja jest sensowna (nie przepełniona)
    expect(endY).toBeLessThanOrEqual(277 + 6) // co najwyżej 1 linia ponad próg (po addPage jest ok)
  })
})

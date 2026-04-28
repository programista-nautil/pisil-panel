/**
 * Renderuje tablicę linii tekstu do dokumentu PDF linia po linii,
 * automatycznie dodając nową stronę gdy pozycja Y przekroczy dolny margines.
 *
 * @param {object} pdf        - instancja jsPDF
 * @param {string[]} lines    - linie do wyrenderowania (wynik splitTextToSize)
 * @param {number} x          - pozycja x
 * @param {number} y          - aktualna pozycja y (startowa)
 * @param {number} lineHeight - wysokość jednej linii (mm lub pt)
 * @param {number} pageBottom - próg dolny; gdy y > pageBottom → nowa strona
 * @param {number} pageTop    - pozycja y po dodaniu nowej strony
 * @returns {number} nowa pozycja y po wyrenderowaniu wszystkich linii
 */
export function pdfRenderLines(pdf, lines, x, y, lineHeight, pageBottom, pageTop = 25) {
  for (const line of lines) {
    if (y > pageBottom) {
      pdf.addPage()
      y = pageTop
    }
    pdf.text(line, x, y)
    y += lineHeight
  }
  return y
}

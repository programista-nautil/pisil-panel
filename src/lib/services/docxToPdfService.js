import { exec } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function convertDocxToPdf(docxBuffer, originalFilename) {
	// Tworzymy unikalny katalog tymczasowy dla tej operacji
	const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-convert-'))

	const docxPath = path.join(tempDir, originalFilename)
	// Nazwa pliku wyjściowego będzie taka sama jak wejściowego, ale z rozszerzeniem .pdf
	// LibreOffice automatycznie zmienia rozszerzenie
	const pdfFilename = originalFilename.replace(/\.docx$/i, '.pdf')
	const pdfPath = path.join(tempDir, pdfFilename)

	try {
		// 1. Zapisz buffer docx do pliku tymczasowego
		await fs.writeFile(docxPath, docxBuffer)

		// 2. Uruchom LibreOffice (headless)
		// --outdir określa gdzie zapisać wynik
		const command = `libreoffice --headless --convert-to pdf --outdir "${tempDir}" "${docxPath}"`

		await execAsync(command)

		// 3. Sprawdź czy plik PDF powstał
		try {
			await fs.access(pdfPath)
		} catch (e) {
			throw new Error(`LibreOffice failed to generate PDF. Command: ${command}`)
		}

		// 4. Odczytaj wygenerowany PDF do buffera
		const pdfBuffer = await fs.readFile(pdfPath)

		return {
			buffer: pdfBuffer,
			filename: pdfFilename,
		}
	} catch (error) {
		console.error('Błąd konwersji DOCX do PDF:', error)
		// W razie błędu zwracamy null lub rzucamy błąd, zależnie od strategii
		throw error
	} finally {
		// 5. Sprzątanie: usuń katalog tymczasowy wraz z zawartością
		try {
			await fs.rm(tempDir, { recursive: true, force: true })
		} catch (cleanupError) {
			console.error('Błąd usuwania plików tymczasowych:', cleanupError)
		}
	}
}

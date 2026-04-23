import { exec } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Konwertuje string HTML do PDF przez LibreOffice headless.
 * Działa tylko gdy NODE_ENV=production lub ENABLE_PDF_CONVERSION=true.
 * @returns {Buffer|null} PDF buffer lub null gdy konwersja niedostępna
 */
export async function convertHtmlToPdf(htmlString, filenameBase = "dokument") {
  if (
    process.env.NODE_ENV !== "production" &&
    !process.env.ENABLE_PDF_CONVERSION
  ) {
    return null;
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "html-pdf-"));
  const htmlPath = path.join(tempDir, `${filenameBase}.html`);
  const pdfPath = path.join(tempDir, `${filenameBase}.pdf`);

  try {
    await fs.writeFile(htmlPath, htmlString, "utf-8");

    const command = `libreoffice --headless --convert-to pdf --outdir "${tempDir}" "${htmlPath}"`;
    await execAsync(command);

    try {
      await fs.access(pdfPath);
    } catch {
      throw new Error("LibreOffice nie wygenerował pliku PDF.");
    }

    return await fs.readFile(pdfPath);
  } catch (error) {
    console.error("Błąd konwersji HTML do PDF:", error);
    throw error;
  } finally {
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {}
  }
}

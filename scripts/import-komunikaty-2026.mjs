// Jednorazowy skrypt importujący 59 komunikatów Pani Teresy (rok 2026) do panelu PISiL.
//
// Uruchom: node scripts/import-komunikaty-2026.mjs
//
// Wymaga: DATABASE_URL i GCS_CREDENTIALS / GCS_BUCKET_NAME w środowisku (lub .env).
// Pliki lokalne:
//   - C:/Users/Bartek/Downloads/Komunikaty - 2026/komunikaty.json
//   - C:/Users/Bartek/Downloads/Komunikaty - 2026/Komunikaty 01-59/
//   - C:/Users/Bartek/Downloads/Komunikaty - 2026/Załączniki do komunikatów/

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { uploadFileToGCS } from "../src/lib/gcs.js";
import fs from "fs/promises";
import path from "path";
import { createWriteStream } from "fs";

const prisma = new PrismaClient();

const JSON_PATH = "C:/Users/Bartek/Downloads/Komunikaty - 2026/komunikaty.json";
const MAIN_DIR  = "C:/Users/Bartek/Downloads/Komunikaty - 2026/Komunikaty 01-59";
const ATT_DIR   = "C:/Users/Bartek/Downloads/Komunikaty - 2026/Załączniki do komunikatów";
const SQL_OUT   = path.join(process.cwd(), "scripts", "import-komunikaty-2026.sql");

// Nazwy polskich miesięcy → indeks (0-based)
const MONTHS = {
  "stycznia": 0, "lutego": 1, "marca": 2, "kwietnia": 3,
  "maja": 4, "czerwca": 5, "lipca": 6, "sierpnia": 7,
  "września": 8, "października": 9, "listopada": 10, "grudnia": 11,
};

function parsePlDate(str) {
  const parts = str.trim().split(/\s+/);
  if (parts.length !== 3) throw new Error(`Nieprawidłowy format daty: "${str}"`);
  const [dayStr, monthStr, yearStr] = parts;
  const month = MONTHS[monthStr];
  if (month === undefined) throw new Error(`Nieznany miesiąc: "${monthStr}"`);
  return new Date(parseInt(yearStr), month, parseInt(dayStr), 12, 0, 0);
}

function parseNumer(numer) {
  const parts = numer.split("/");
  if (parts.length !== 3) throw new Error(`Nieprawidłowy format numeru: "${numer}"`);
  return {
    number: parseInt(parts[0], 10),
    month:  parseInt(parts[1], 10),
    year:   parseInt(parts[2], 10),
  };
}

function padMonth(m) {
  return String(m).padStart(2, "0");
}

// Escape SQL string value
function sqlStr(val) {
  if (val === null || val === undefined) return "NULL";
  return `'${String(val).replace(/'/g, "''")}'`;
}

function sqlDate(date) {
  if (!date) return "NULL";
  return `'${date.toISOString()}'`;
}

async function main() {
  const raw = await fs.readFile(JSON_PATH, "utf-8");
  const entries = JSON.parse(raw);
  console.log(`Wczytano ${entries.length} wpisów z JSON.\n`);

  // SQL output
  const sqlLines = [
    "-- Import komunikatów Pani Teresy 2026",
    "-- Wygenerowano: " + new Date().toISOString(),
    "-- GCS jest wspólny — wgrywanie plików tylko na devie, SQL stosujemy na produkcji.",
    "",
    "BEGIN;",
    "",
  ];

  let ok = 0, skipped = 0, errors = 0;

  for (const entry of entries) {
    const { numer, plik, date, sprawa, inicjaly, zalaczniki } = entry;

    let number, month, year;
    try {
      ({ number, month, year } = parseNumer(numer));
    } catch (e) {
      console.error(`✗ [${numer}] Błąd parsowania numeru: ${e.message}`);
      errors++;
      continue;
    }

    // Idempotentność — sprawdź czy Communication z tym numerem już istnieje
    const existing = await prisma.communication.findFirst({
      where: { number, year, isSpis: false },
    });
    if (existing) {
      console.log(`⏭  [${numer}] Już istnieje (id: ${existing.id}) — pomijam`);
      skipped++;
      continue;
    }

    // Wczytaj główny PDF
    const mainFilePath = path.join(MAIN_DIR, plik);
    let mainBuffer;
    try {
      mainBuffer = await fs.readFile(mainFilePath);
    } catch (e) {
      console.error(`✗ [${numer}] Brak pliku głównego: ${plik}`);
      errors++;
      continue;
    }

    // Parse daty
    let sentAt;
    try {
      sentAt = parsePlDate(date);
    } catch (e) {
      console.error(`✗ [${numer}] Błąd daty "${date}": ${e.message}`);
      errors++;
      continue;
    }

    const title = `Komunikat ${number}/${padMonth(month)}/${year}`;

    try {
      // Upload głównego PDF do GCS
      const gcsMain = `komunikaty/${year}/${Date.now()}_${plik}`;
      await uploadFileToGCS(mainBuffer, gcsMain);

      // Utwórz rekord Communication
      const comm = await prisma.communication.create({
        data: {
          title,
          year,
          number,
          month,
          sentAt,
          subject: sprawa,
          authorInitials: inicjaly,
          fileName: plik,
          filePath: gcsMain,
          status: "SENT",
          isSpis: false,
        },
      });

      // SQL dla Communication
      const now = new Date().toISOString();
      sqlLines.push(
        `INSERT INTO "Communication" (id, title, year, number, month, "sentAt", subject, "authorInitials", "fileName", "filePath", status, "isSpis", "createdAt", "updatedAt")` +
        ` VALUES (${sqlStr(comm.id)}, ${sqlStr(comm.title)}, ${comm.year}, ${comm.number}, ${comm.month}, ${sqlDate(comm.sentAt)}, ${sqlStr(comm.subject)}, ${sqlStr(comm.authorInitials)}, ${sqlStr(comm.fileName)}, ${sqlStr(comm.filePath)}, 'SENT'::"CommunicationStatus", false, ${sqlStr(comm.createdAt.toISOString())}, ${sqlStr(comm.updatedAt.toISOString())});`
      );

      // Załączniki
      let attCount = 0;
      for (const attName of (zalaczniki || [])) {
        const attFilePath = path.join(ATT_DIR, attName);
        let attBuffer;
        try {
          attBuffer = await fs.readFile(attFilePath);
        } catch (e) {
          console.warn(`  ⚠ Brak załącznika: ${attName} — pomijam`);
          continue;
        }

        const gcsAtt = `komunikaty/${year}/${comm.id}/zalaczniki/${attName}`;
        await uploadFileToGCS(attBuffer, gcsAtt);

        const att = await prisma.communicationAttachment.create({
          data: {
            communicationId: comm.id,
            fileName: attName,
            filePath: gcsAtt,
          },
        });

        sqlLines.push(
          `INSERT INTO "CommunicationAttachment" (id, "communicationId", "fileName", "filePath", "createdAt")` +
          ` VALUES (${sqlStr(att.id)}, ${sqlStr(att.communicationId)}, ${sqlStr(att.fileName)}, ${sqlStr(att.filePath)}, ${sqlStr(att.createdAt.toISOString())});`
        );

        attCount++;
      }

      const attInfo = attCount > 0 ? ` (${attCount} zał.)` : "";
      console.log(`✓ [${numer}] ${sprawa}${attInfo}`);
      ok++;
    } catch (err) {
      console.error(`✗ [${numer}] ${err.message}`);
      errors++;
    }
  }

  sqlLines.push("");
  sqlLines.push("COMMIT;");
  sqlLines.push("");
  sqlLines.push(`-- Zaimportowano: ${ok}, pominięto: ${skipped}, błędy: ${errors}`);

  await fs.writeFile(SQL_OUT, sqlLines.join("\n"), "utf-8");

  console.log(`\n${"─".repeat(60)}`);
  console.log(`Gotowe.  ✓ ${ok}   ⏭ ${skipped}   ✗ ${errors}`);
  console.log(`SQL zapisano do: ${SQL_OUT}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

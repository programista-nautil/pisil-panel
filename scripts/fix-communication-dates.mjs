// Jednorazowy skrypt naprawczy — przepisuje communicationFileName/communicationFilePath
// dla zgłoszeń, które mają communicationNumber, używając daty z createdAt (nie today).
//
// Uruchom: node scripts/fix-communication-dates.mjs
// Wymaga: DATABASE_URL w .env, klucza GCS, pliku private/document-templates/komunikat.docx

import { PrismaClient } from "@prisma/client";
import { generateCommunicationDoc } from "../src/lib/services/communicationService.js";
import { uploadFileToGCS } from "../src/lib/gcs.js";

const prisma = new PrismaClient();

async function main() {
  const submissions = await prisma.submission.findMany({
    where: { communicationNumber: { not: null } },
    orderBy: { communicationNumber: "asc" },
  });

  console.log(`Znaleziono ${submissions.length} zgłoszeń z communicationNumber.`);

  let ok = 0, errors = 0;
  for (const sub of submissions) {
    try {
      const { buffer, fileName } = await generateCommunicationDoc(
        sub,
        sub.communicationNumber,
        sub.createdAt,   // <-- prawidłowa data
      );
      const gcsPath = await uploadFileToGCS(buffer, `communications/${fileName}`);
      await prisma.submission.update({
        where: { id: sub.id },
        data: { communicationFilePath: gcsPath, communicationFileName: fileName },
      });
      console.log(`  ✓ [${sub.communicationNumber}] ${fileName}`);
      ok++;
    } catch (err) {
      console.error(`  ✗ [${sub.communicationNumber}] ${sub.companyName}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nGotowe. OK: ${ok}, błędy: ${errors}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });

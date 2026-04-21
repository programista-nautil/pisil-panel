/**
 * Skrypt czyszczący komunikaty z plikami .js i .php.
 *
 * Domyślnie działa w trybie podglądu (dry-run) — nic nie usuwa.
 * Aby faktycznie usunąć, uruchom z flagą --execute:
 *
 *   node scripts/cleanup-invalid-communications.js            # podgląd
 *   node scripts/cleanup-invalid-communications.js --execute  # usuwa z GCS i bazy
 */

const { PrismaClient } = require("@prisma/client");
const { Storage } = require("@google-cloud/storage");
require("dotenv").config();

const DRY_RUN = !process.argv.includes("--execute");

const INVALID_EXTENSIONS = [".js", ".php"];

const prisma = new PrismaClient();

const storage = new Storage({
  credentials: JSON.parse(process.env.GCS_CREDENTIALS),
});
const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

const getExtension = (fileName) => {
  const dot = fileName.lastIndexOf(".");
  return dot !== -1 ? fileName.slice(dot).toLowerCase() : "";
};

const deleteFromGCS = async (filePath) => {
  // Obsługa starszego formatu z pełnym URL-em (tak jak w src/lib/gcs.js)
  const gcsPath = filePath.replace(
    `https://storage.googleapis.com/${bucketName}/`,
    "",
  );
  try {
    await bucket.file(gcsPath).delete();
  } catch (err) {
    if (err.code === 404) {
      console.warn(`    ⚠️  Plik nie istnieje w GCS (pomijam): ${gcsPath}`);
      return;
    }
    throw err;
  }
};

const run = async () => {
  console.log(
    DRY_RUN
      ? "🔍 Tryb podglądu (dry-run) — nic nie zostanie usunięte.\n   Dodaj flagę --execute, aby faktycznie usunąć.\n"
      : "🗑️  Tryb wykonania — usuwanie z GCS i bazy danych!\n",
  );

  // Pobierz wszystkie komunikaty — filtrujemy po stronie JS,
  // bo Prisma nie obsługuje filtrowania po rozszerzeniu.
  const all = await prisma.communication.findMany({
    orderBy: [{ year: "desc" }, { createdAt: "desc" }],
  });

  const toDelete = all.filter((c) =>
    INVALID_EXTENSIONS.includes(getExtension(c.fileName)),
  );

  if (toDelete.length === 0) {
    console.log("✅ Brak komunikatów z rozszerzeniami .js/.php. Nic do zrobienia.");
    return;
  }

  console.log(
    `Znaleziono ${toDelete.length} komunikat${toDelete.length === 1 ? "" : toDelete.length < 5 ? "y" : "ów"} do usunięcia:\n`,
  );

  // Grupuj po roku dla czytelności raportu
  const byYear = {};
  for (const c of toDelete) {
    if (!byYear[c.year]) byYear[c.year] = [];
    byYear[c.year].push(c);
  }
  const sortedYears = Object.keys(byYear).sort((a, b) => b - a);

  for (const year of sortedYears) {
    console.log(`  Rok ${year}:`);
    for (const c of byYear[year]) {
      console.log(`    • [${c.id}] "${c.title}" (${c.fileName})`);
    }
  }

  if (DRY_RUN) {
    console.log(
      "\n🔍 Dry-run zakończony. Uruchom z --execute, aby usunąć powyższe rekordy.",
    );
    return;
  }

  console.log("\nRozpoczynamusuwanie...\n");

  let deleted = 0;
  let errors = 0;

  for (const c of toDelete) {
    process.stdout.write(`  ⏳ "${c.title}" (${c.fileName})... `);
    try {
      // 1. Usuń z GCS
      await deleteFromGCS(c.filePath);
      // 2. Usuń z bazy
      await prisma.communication.delete({ where: { id: c.id } });
      console.log("✅");
      deleted++;
    } catch (err) {
      console.log("❌");
      console.error(`     Błąd: ${err.message}`);
      errors++;
    }
  }

  console.log(
    `\n🎉 Gotowe! Usunięto: ${deleted}, błędy: ${errors} (z ${toDelete.length} łącznie).`,
  );
};

run()
  .catch((err) => {
    console.error("\n❌ Krytyczny błąd:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");
const { Storage } = require("@google-cloud/storage");
require("dotenv").config();

const prisma = new PrismaClient();

const storage = new Storage({
  credentials: JSON.parse(process.env.GCS_CREDENTIALS),
});
const bucketName = process.env.GCS_BUCKET_NAME;
const bucket = storage.bucket(bucketName);

const BACKUP_DIR = path.join(__dirname, "../komunikaty_backup");

const uploadToGCS = (filePath, destination) => {
  return new Promise((resolve, reject) => {
    bucket.upload(
      filePath,
      {
        destination: destination,
        resumable: false,
      },
      (err, file) => {
        if (err) reject(err);
        else resolve(destination);
      },
    );
  });
};

const getTitleFromFile = (filename) => {
  return path.parse(filename).name;
};

const runMigration = async () => {
  console.log("🚀 Rozpoczynam migrację komunikatów z FTP...\n");

  if (!fs.existsSync(BACKUP_DIR)) {
    console.error(`❌ Nie znaleziono folderu: ${BACKUP_DIR}`);
    process.exit(1);
  }

  const yearFolders = fs.readdirSync(BACKUP_DIR).filter((item) => {
    return (
      fs.statSync(path.join(BACKUP_DIR, item)).isDirectory() &&
      item.startsWith("Komunikaty ")
    );
  });

  let totalUploaded = 0;

  for (const yearFolder of yearFolders) {
    const year = parseInt(yearFolder.replace("Komunikaty ", ""), 10);
    if (isNaN(year)) continue;

    console.log(`\n📂 Przetwarzam rocznik: ${year}...`);
    const currentYearPath = path.join(BACKUP_DIR, yearFolder);
    const items = fs.readdirSync(currentYearPath);

    for (const item of items) {
      if (item.startsWith(".") || item.toLowerCase().includes("spis")) continue;

      const itemPath = path.join(currentYearPath, item);
      const isDirectory = fs.statSync(itemPath).isDirectory();

      // Zbieramy pliki do przetworzenia w tablicę, żeby obsłużyć stare foldery z wieloma plikami
      let filesToProcess = [];

      if (isDirectory) {
        // STARY SYSTEM: folder z numerem komunikatu (np. "78")
        const folderName = item;
        const filesInside = fs
          .readdirSync(itemPath)
          .filter((f) => !f.startsWith("."));

        if (filesInside.length === 0) {
          console.log(`  ⚠️ Pusty folder: ${folderName} - pomijam.`);
          continue;
        }

        // Przetwarzamy każdy plik wewnątrz starego folderu
        for (const file of filesInside) {
          const parsedFile = path.parse(file);

          // Jeśli plik nazywa się tak samo jak folder (np. "78.pdf" w folderze "78")
          const isMainFile = parsedFile.name === folderName;

          let title = isMainFile
            ? `Komunikat nr ${folderName}`
            : `Komunikat nr ${folderName} - ${parsedFile.name}`;

          filesToProcess.push({
            absoluteFilePath: path.join(itemPath, file),
            originalFileName: file,
            title: title,
          });
        }
      } else {
        // NOWY SYSTEM: po prostu luźny plik
        filesToProcess.push({
          absoluteFilePath: itemPath,
          originalFileName: item,
          title: getTitleFromFile(item),
        });
      }

      // Teraz wysyłamy wszystkie zebrane pliki do GCS i bazy
      for (const fileObj of filesToProcess) {
        try {
          const cleanFileName = fileObj.originalFileName.replace(
            /[^a-zA-Z0-9.\-_]/g,
            "_",
          );
          // Date.now() + Math.random() zabezpiecza przed nadpisaniem, gdy pliki przetwarzają się w tej samej milisekundzie
          const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          const gcsFilename = `komunikaty/${year}/${uniqueSuffix}_${cleanFileName}`;

          console.log(
            `  ⏳ Wgrywam: "${fileObj.title}" (${fileObj.originalFileName})...`,
          );

          const gcsPath = await uploadToGCS(
            fileObj.absoluteFilePath,
            gcsFilename,
          );

          await prisma.communication.create({
            data: {
              title: fileObj.title,
              year: year,
              fileName: fileObj.originalFileName,
              filePath: gcsPath,
            },
          });

          totalUploaded++;
          console.log(`  ✅ Sukces: ${fileObj.title}`);
        } catch (err) {
          console.error(
            `  ❌ Błąd przy wgrywaniu "${fileObj.title}":`,
            err.message,
          );
        }
      }
    }
  }

  console.log(
    `\n🎉 Migracja zakończona! Pomyślnie przeniesiono ${totalUploaded} komunikatów.`,
  );
};

runMigration()
  .catch((e) => {
    console.error("Krytyczny błąd migracji:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

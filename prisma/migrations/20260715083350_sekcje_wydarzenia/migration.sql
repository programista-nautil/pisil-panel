-- CreateEnum
CREATE TYPE "EventSectionKey" AS ENUM ('INFORMACJE', 'PROGRAM', 'GALERIA', 'RELACJA');

-- CreateTable
CREATE TABLE "EventSection" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "klucz" "EventSectionKey" NOT NULL,
    "tekst" TEXT,
    "link" TEXT,
    "plikPath" TEXT,
    "plikNazwa" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventSection_eventId_idx" ON "EventSection"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventSection_eventId_klucz_key" ON "EventSection"("eventId", "klucz");

-- AddForeignKey
ALTER TABLE "EventSection" ADD CONSTRAINT "EventSection_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

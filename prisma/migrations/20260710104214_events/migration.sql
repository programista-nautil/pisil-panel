-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('SZKOLENIE', 'KONFERENCJA');

-- CreateEnum
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'STACJONARNE');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "RegistrationTier" AS ENUM ('CZLONEK_GRATIS', 'CZLONEK_PLATNY', 'NIECZLONEK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('ZWOLNIONY', 'OCZEKUJE', 'OPLACONE');

-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('POTWIERDZONA', 'LISTA_REZERWOWA', 'ANULOWANA');

-- CreateEnum
CREATE TYPE "RegSource" AS ENUM ('SELF', 'ADMIN');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "slug" TEXT NOT NULL,
    "typ" "EventType" NOT NULL,
    "tryb" "EventMode" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "prowadzacy" TEXT,
    "address" TEXT,
    "onlineUrl" TEXT,
    "limitMiejsc" INTEGER,
    "registrationDeadline" TIMESTAMP(3),
    "bankAccount" TEXT,
    "cenaCzlonek" DECIMAL(10,2),
    "cenaNieczlonek" DECIMAL(10,2),
    "pulaGratisNaFirme" INTEGER NOT NULL DEFAULT 0,
    "seriesName" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firmaNazwa" TEXT NOT NULL,
    "firmaNip" TEXT NOT NULL,
    "firmaAdres" TEXT,
    "tier" "RegistrationTier" NOT NULL,
    "kwota" DECIMAL(10,2) NOT NULL,
    "statusPlatnosci" "PaymentStatus" NOT NULL,
    "statusRejestracji" "RegistrationStatus" NOT NULL DEFAULT 'POTWIERDZONA',
    "zgodaRodo" BOOLEAN NOT NULL,
    "zgodaRodoAt" TIMESTAMP(3),
    "zrodlo" "RegSource" NOT NULL DEFAULT 'SELF',
    "matchedMemberId" TEXT,
    "notatka" TEXT,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Event_slug_key" ON "Event"("slug");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_idx" ON "EventRegistration"("eventId");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_firmaNip_idx" ON "EventRegistration"("eventId", "firmaNip");

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "address" TEXT,
ADD COLUMN     "ceoName" TEXT;

-- CreateTable
CREATE TABLE "DocumentCounter" (
    "id" TEXT NOT NULL DEFAULT 'acceptance_letter',
    "lastNumber" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("id")
);

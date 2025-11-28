/*
  Warnings:

  - A unique constraint covering the columns `[communicationNumber]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "communicationNumber" INTEGER,
ADD COLUMN     "recommendations" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Submission_communicationNumber_key" ON "Submission"("communicationNumber");

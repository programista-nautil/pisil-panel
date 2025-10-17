/*
  Warnings:

  - You are about to drop the `DocumentCounter` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[acceptanceNumber]` on the table `Submission` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "acceptanceNumber" INTEGER;

-- DropTable
DROP TABLE "DocumentCounter";

-- CreateIndex
CREATE UNIQUE INDEX "Submission_acceptanceNumber_key" ON "Submission"("acceptanceNumber");

/*
  Warnings:

  - A unique constraint covering the columns `[passwordResetToken]` on the table `Member` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "passwordResetExpires" TIMESTAMP(3),
ADD COLUMN     "passwordResetToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Member_passwordResetToken_key" ON "Member"("passwordResetToken");

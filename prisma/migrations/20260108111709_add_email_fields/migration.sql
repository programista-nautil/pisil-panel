-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "invoiceEmail" TEXT,
ADD COLUMN     "notificationEmails" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "invoiceEmail" TEXT DEFAULT '',
ADD COLUMN     "notificationEmails" TEXT DEFAULT '';

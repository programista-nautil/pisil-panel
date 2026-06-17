-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "correspondenceAddress" TEXT,
ADD COLUMN     "eDeliveryAddress" TEXT,
ADD COLUMN     "eDeliveryConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "eDeliveryEmail" TEXT,
ADD COLUMN     "nip" TEXT;

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "nip" TEXT;

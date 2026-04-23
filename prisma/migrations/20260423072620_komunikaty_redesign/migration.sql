-- CreateEnum
CREATE TYPE "CommunicationStatus" AS ENUM ('DRAFT', 'SENT');

-- AlterTable
ALTER TABLE "Communication" ADD COLUMN     "attachmentNames" TEXT,
ADD COLUMN     "authorInitials" TEXT,
ADD COLUMN     "body" TEXT,
ADD COLUMN     "isSpis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "month" INTEGER,
ADD COLUMN     "number" INTEGER,
ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "status" "CommunicationStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "subject" TEXT,
ALTER COLUMN "fileName" DROP NOT NULL,
ALTER COLUMN "filePath" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CommunicationAttachment" (
    "id" TEXT NOT NULL,
    "communicationId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "CommunicationAttachment" ADD CONSTRAINT "CommunicationAttachment_communicationId_fkey" FOREIGN KEY ("communicationId") REFERENCES "Communication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

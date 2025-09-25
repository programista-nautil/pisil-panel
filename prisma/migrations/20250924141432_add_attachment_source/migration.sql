-- CreateEnum
CREATE TYPE "AttachmentSource" AS ENUM ('CLIENT_UPLOAD', 'GENERATED');

-- AlterTable
ALTER TABLE "Attachment" ADD COLUMN     "source" "AttachmentSource" NOT NULL DEFAULT 'CLIENT_UPLOAD';

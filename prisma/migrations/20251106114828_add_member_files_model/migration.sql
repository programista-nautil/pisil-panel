/*
  Warnings:

  - The values [ADMIN_UPLOAD] on the enum `AttachmentSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "AttachmentSource_new" AS ENUM ('CLIENT_UPLOAD', 'GENERATED');
ALTER TABLE "Attachment" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "Attachment" ALTER COLUMN "source" TYPE "AttachmentSource_new" USING ("source"::text::"AttachmentSource_new");
ALTER TYPE "AttachmentSource" RENAME TO "AttachmentSource_old";
ALTER TYPE "AttachmentSource_new" RENAME TO "AttachmentSource";
DROP TYPE "AttachmentSource_old";
ALTER TABLE "Attachment" ALTER COLUMN "source" SET DEFAULT 'CLIENT_UPLOAD';
COMMIT;

-- CreateTable
CREATE TABLE "MemberFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,

    CONSTRAINT "MemberFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MemberFile" ADD CONSTRAINT "MemberFile_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

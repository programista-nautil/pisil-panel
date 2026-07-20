-- CreateTable
CREATE TABLE "EventMailingAttachment" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mailingId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "mimeType" TEXT,

    CONSTRAINT "EventMailingAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMailingAttachment_mailingId_idx" ON "EventMailingAttachment"("mailingId");

-- AddForeignKey
ALTER TABLE "EventMailingAttachment" ADD CONSTRAINT "EventMailingAttachment_mailingId_fkey" FOREIGN KEY ("mailingId") REFERENCES "EventMailing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

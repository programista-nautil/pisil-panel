-- CreateTable
CREATE TABLE "EventMailing" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "eventId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "recipientFilter" TEXT NOT NULL,

    CONSTRAINT "EventMailing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventMailing_eventId_idx" ON "EventMailing"("eventId");

-- AddForeignKey
ALTER TABLE "EventMailing" ADD CONSTRAINT "EventMailing_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

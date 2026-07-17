-- CreateTable
CREATE TABLE "MailSendLog" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'WYSLANY',
    "error" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailSendLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MailSendLog_scope_refId_idx" ON "MailSendLog"("scope", "refId");

-- CreateIndex
CREATE UNIQUE INDEX "MailSendLog_scope_refId_email_key" ON "MailSendLog"("scope", "refId", "email");

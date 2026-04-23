-- CreateTable
CREATE TABLE "CommunicationAuthor" (
    "initials" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommunicationAuthor_pkey" PRIMARY KEY ("initials")
);

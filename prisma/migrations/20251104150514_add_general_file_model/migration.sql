-- CreateTable
CREATE TABLE "GeneralFile" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "category" TEXT,

    CONSTRAINT "GeneralFile_pkey" PRIMARY KEY ("id")
);

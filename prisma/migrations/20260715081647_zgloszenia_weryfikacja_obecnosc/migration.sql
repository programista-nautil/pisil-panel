-- AlterTable
ALTER TABLE "EventRegistration" ADD COLUMN     "obecny" BOOLEAN,
ADD COLUMN     "oplaconeAt" TIMESTAMP(3),
ADD COLUMN     "zweryfikowane" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "zweryfikowaneAt" TIMESTAMP(3);

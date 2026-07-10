-- CreateEnum
CREATE TYPE "MemberType" AS ENUM ('ZWYCZAJNY', 'STOWARZYSZONY');

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "memberType" "MemberType" NOT NULL DEFAULT 'ZWYCZAJNY';

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN     "memberType" "MemberType" NOT NULL DEFAULT 'ZWYCZAJNY';

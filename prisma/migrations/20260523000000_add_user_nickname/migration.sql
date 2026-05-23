-- AlterTable: add nickname to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "nickname" TEXT;

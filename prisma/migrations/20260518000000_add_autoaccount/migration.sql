-- AlterTable
ALTER TABLE "Expedition" ADD COLUMN "autoAccept" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Expedition" ALTER COLUMN "maxMembers" SET DEFAULT 100;

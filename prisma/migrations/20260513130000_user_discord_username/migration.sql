-- NextAuth signIn 콜백·Prisma User 모델과 동기화
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "discordUsername" TEXT;

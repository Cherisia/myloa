-- Expedition.inviteExpiresAt: 스키마에 없는 NOT NULL 컬럼 제거
ALTER TABLE "Expedition" DROP COLUMN IF EXISTS "inviteExpiresAt";

-- Expedition: 누락 컬럼 추가
ALTER TABLE "Expedition"
    ADD COLUMN IF NOT EXISTS "description" TEXT,
    ADD COLUMN IF NOT EXISTS "notice"      TEXT;

-- ExpeditionMember: 누락 컬럼 추가
ALTER TABLE "ExpeditionMember"
    ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'member';

-- ExpeditionMemberFavorite: 테이블 신규 생성
CREATE TABLE IF NOT EXISTS "ExpeditionMemberFavorite" (
    "id"           TEXT NOT NULL,
    "expeditionId" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    CONSTRAINT "ExpeditionMemberFavorite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ExpeditionMemberFavorite_expeditionId_viewerUserId_targetUserId_key"
    ON "ExpeditionMemberFavorite"("expeditionId", "viewerUserId", "targetUserId");

ALTER TABLE "ExpeditionMemberFavorite"
    DROP CONSTRAINT IF EXISTS "ExpeditionMemberFavorite_expeditionId_fkey",
    ADD CONSTRAINT  "ExpeditionMemberFavorite_expeditionId_fkey"
        FOREIGN KEY ("expeditionId") REFERENCES "Expedition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpeditionMemberFavorite"
    DROP CONSTRAINT IF EXISTS "ExpeditionMemberFavorite_viewerUserId_fkey",
    ADD CONSTRAINT  "ExpeditionMemberFavorite_viewerUserId_fkey"
        FOREIGN KEY ("viewerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

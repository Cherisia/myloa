-- Character.expeditionId 인덱스 (원정대별 캐릭터 조회 성능)
CREATE INDEX IF NOT EXISTS "Character_expeditionId_idx" ON "Character"("expeditionId");

-- CharacterRaid.resetAt 인덱스 (주간/일일 초기화 쿼리 성능)
CREATE INDEX IF NOT EXISTS "CharacterRaid_resetAt_idx" ON "CharacterRaid"("resetAt");

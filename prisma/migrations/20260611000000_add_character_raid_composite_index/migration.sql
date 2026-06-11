-- CharacterRaid: characterId + resetAt 복합 인덱스 추가
-- 캐릭터별 레이드 조회 성능 개선
CREATE INDEX IF NOT EXISTS "CharacterRaid_characterId_resetAt_idx" ON "CharacterRaid"("characterId", "resetAt");

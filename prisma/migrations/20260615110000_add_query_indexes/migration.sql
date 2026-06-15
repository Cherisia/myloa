-- 핫 쿼리 대비 인덱스 추가 (모두 비파괴적, IF NOT EXISTS)
-- 멤버십·활성멤버 조회 (모든 expedition 쓰기 API, 길드 상세)
CREATE INDEX IF NOT EXISTS "ExpeditionMember_userId_idx" ON "ExpeditionMember"("userId");
CREATE INDEX IF NOT EXISTS "ExpeditionMember_expeditionId_status_idx" ON "ExpeditionMember"("expeditionId", "status");

-- 대시보드 핵심 조회 (userId 기준 원정대 목록)
CREATE INDEX IF NOT EXISTS "LoaExpedition_userId_idx" ON "LoaExpedition"("userId");

-- 친구 요청 pending-count 조회
CREATE INDEX IF NOT EXISTS "FriendRequest_receiverId_status_idx" ON "FriendRequest"("receiverId", "status");

-- 일일/주간 cron 리셋 (type + resetAt 필터)
CREATE INDEX IF NOT EXISTS "CharacterCustomItem_type_resetAt_idx" ON "CharacterCustomItem"("type", "resetAt");

-- NextAuth 세션 조회
CREATE INDEX IF NOT EXISTS "Session_userId_idx" ON "Session"("userId");

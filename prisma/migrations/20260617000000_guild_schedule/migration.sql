CREATE TABLE IF NOT EXISTS "GuildSchedulePost" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "expeditionId"    TEXT NOT NULL,
  "creatorId"       TEXT NOT NULL,
  "raidId"          TEXT NOT NULL,
  "difficulty"      TEXT NOT NULL,
  "scheduledAt"     TIMESTAMP(3) NOT NULL,
  "durationMinutes" INTEGER NOT NULL DEFAULT 120,
  "totalSlots"      INTEGER NOT NULL,
  "minItemLevel"    DOUBLE PRECISION,
  "allowedClasses"  TEXT[] NOT NULL DEFAULT '{}',
  "memo"            VARCHAR(140),
  "closedAt"        TIMESTAMP(3) NOT NULL,
  "status"          TEXT NOT NULL DEFAULT 'recruiting',
  "completedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GuildScheduleParticipant" (
  "id"               TEXT NOT NULL PRIMARY KEY,
  "postId"           TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "characterId"      TEXT NOT NULL,
  "role"             TEXT NOT NULL DEFAULT 'dealer',
  "status"           TEXT NOT NULL DEFAULT 'pending',
  "excludedFromDone" BOOLEAN NOT NULL DEFAULT false,
  "appliedAt"        TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "GuildSchedulePartySlot" (
  "id"          TEXT NOT NULL PRIMARY KEY,
  "postId"      TEXT NOT NULL,
  "partyNumber" INTEGER NOT NULL,
  "slotNumber"  INTEGER NOT NULL,
  "userId"      TEXT,
  "characterId" TEXT,
  UNIQUE("postId", "partyNumber", "slotNumber")
);

CREATE TABLE IF NOT EXISTS "MemberAvailability" (
  "id"           TEXT NOT NULL PRIMARY KEY,
  "userId"       TEXT NOT NULL,
  "expeditionId" TEXT NOT NULL,
  "slots"        TEXT NOT NULL DEFAULT '[]',
  "displayUnit"  INTEGER NOT NULL DEFAULT 30,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  UNIQUE("userId", "expeditionId")
);

CREATE INDEX IF NOT EXISTS "GuildSchedulePost_expeditionId_idx" ON "GuildSchedulePost"("expeditionId");
CREATE INDEX IF NOT EXISTS "GuildSchedulePost_scheduledAt_idx" ON "GuildSchedulePost"("scheduledAt");
CREATE INDEX IF NOT EXISTS "GuildScheduleParticipant_postId_idx" ON "GuildScheduleParticipant"("postId");
CREATE INDEX IF NOT EXISTS "GuildScheduleParticipant_userId_idx" ON "GuildScheduleParticipant"("userId");
CREATE INDEX IF NOT EXISTS "GuildSchedulePartySlot_postId_idx" ON "GuildSchedulePartySlot"("postId");
CREATE INDEX IF NOT EXISTS "MemberAvailability_expeditionId_idx" ON "MemberAvailability"("expeditionId");

-- CreateTable
CREATE TABLE "WeeklyRaidHistory" (
    "id"         TEXT NOT NULL,
    "userId"     TEXT NOT NULL,
    "weekStart"  TIMESTAMP(3) NOT NULL,
    "totalRaids" INTEGER NOT NULL,
    "goldRaids"  INTEGER NOT NULL,
    "totalGold"  INTEGER NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyRaidHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyRaidHistory_userId_weekStart_key" ON "WeeklyRaidHistory"("userId", "weekStart");
CREATE INDEX "WeeklyRaidHistory_userId_idx" ON "WeeklyRaidHistory"("userId");

-- AddForeignKey
ALTER TABLE "WeeklyRaidHistory" ADD CONSTRAINT "WeeklyRaidHistory_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

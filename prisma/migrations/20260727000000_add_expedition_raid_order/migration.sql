CREATE TABLE "ExpeditionRaidOrder" (
  "id"           TEXT    NOT NULL,
  "expeditionId" TEXT    NOT NULL,
  "raidId"       TEXT    NOT NULL,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ExpeditionRaidOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExpeditionRaidOrder_expeditionId_raidId_key"
  ON "ExpeditionRaidOrder"("expeditionId", "raidId");

CREATE INDEX "ExpeditionRaidOrder_expeditionId_idx"
  ON "ExpeditionRaidOrder"("expeditionId");

ALTER TABLE "ExpeditionRaidOrder"
  ADD CONSTRAINT "ExpeditionRaidOrder_expeditionId_fkey"
  FOREIGN KEY ("expeditionId") REFERENCES "LoaExpedition"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

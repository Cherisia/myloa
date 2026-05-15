-- CreateTable
CREATE TABLE "CharacterCustomItem" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "image" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "restGauge" INTEGER NOT NULL DEFAULT 0,
    "deducted" BOOLEAN NOT NULL DEFAULT false,
    "resetAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterCustomItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCustomItem_characterId_name_key" ON "CharacterCustomItem"("characterId", "name");

-- AddForeignKey
ALTER TABLE "CharacterCustomItem" ADD CONSTRAINT "CharacterCustomItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

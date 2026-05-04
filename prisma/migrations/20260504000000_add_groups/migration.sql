-- CreateTable: Group
CREATE TABLE "Group" (
    "id"          TEXT         NOT NULL,
    "name"        TEXT         NOT NULL,
    "description" TEXT,
    "notice"      TEXT,
    "isPublic"    BOOLEAN      NOT NULL DEFAULT true,
    "inviteCode"  TEXT         NOT NULL,
    "leaderId"    TEXT         NOT NULL,
    "maxMembers"  INTEGER      NOT NULL DEFAULT 30,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Group_inviteCode_key" ON "Group"("inviteCode");

-- CreateTable: GroupMember
CREATE TABLE "GroupMember" (
    "id"         TEXT         NOT NULL,
    "groupId"    TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "role"       TEXT         NOT NULL DEFAULT 'member',
    "visibility" TEXT         NOT NULL DEFAULT 'all',
    "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroupMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GroupMember_groupId_userId_key" ON "GroupMember"("groupId", "userId");

-- CreateTable: JoinRequest
CREATE TABLE "JoinRequest" (
    "id"        TEXT         NOT NULL,
    "groupId"   TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "message"   TEXT,
    "status"    TEXT         NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JoinRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "JoinRequest_groupId_userId_key" ON "JoinRequest"("groupId", "userId");

-- AddForeignKey
ALTER TABLE "Group"       ADD CONSTRAINT "Group_leaderId_fkey"       FOREIGN KEY ("leaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_groupId_fkey"  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupMember" ADD CONSTRAINT "GroupMember_userId_fkey"   FOREIGN KEY ("userId")  REFERENCES "User"("id")  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_groupId_fkey"  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "JoinRequest" ADD CONSTRAINT "JoinRequest_userId_fkey"   FOREIGN KEY ("userId")  REFERENCES "User"("id")  ON DELETE CASCADE ON UPDATE CASCADE;

-- Remove group feature tables (order: dependents first)
DROP TABLE IF EXISTS "GroupMemberFavorite" CASCADE;
DROP TABLE IF EXISTS "JoinRequest" CASCADE;
DROP TABLE IF EXISTS "GroupMember" CASCADE;
DROP TABLE IF EXISTS "Group" CASCADE;

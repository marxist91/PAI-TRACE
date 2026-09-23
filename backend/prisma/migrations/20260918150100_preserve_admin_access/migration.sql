-- Existing logisticians already had administrative rights. Preserve those rights.
-- Separate migration: PostgreSQL must commit the new enum value before using it.
UPDATE "User" SET "role" = 'ADMIN', "tokenVersion" = "tokenVersion" + 1,
"updatedAt" = CURRENT_TIMESTAMP WHERE "role" = 'LOGISTICIEN';
DELETE FROM "RefreshToken" WHERE "userId" IN (SELECT "id" FROM "User" WHERE "role" = 'ADMIN');

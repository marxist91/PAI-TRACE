ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "tokenVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "OperationalSettings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "rules" JSONB NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "updatedBy" INTEGER NOT NULL,
  CONSTRAINT "OperationalSettings_pkey" PRIMARY KEY ("id")
);

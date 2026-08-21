ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONSIGNATAIRE';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTROLEUR_LCT';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'CONTROLEUR_TOGO';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'AGENT_PIA';

CREATE TYPE "TerminalAffecte" AS ENUM ('LCT', 'TOGO');

ALTER TABLE "User" ADD COLUMN "consignataireId" INTEGER;
ALTER TABLE "Conteneur" ADD COLUMN "terminalAffecte" "TerminalAffecte";

ALTER TABLE "User"
  ADD CONSTRAINT "User_consignataireId_fkey"
  FOREIGN KEY ("consignataireId") REFERENCES "Consignataire"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "User_consignataireId_idx" ON "User"("consignataireId");
CREATE INDEX "Conteneur_terminalAffecte_idx" ON "Conteneur"("terminalAffecte");

UPDATE "Conteneur"
SET "terminalAffecte" = CASE WHEN MOD("id", 2) = 0 THEN 'LCT'::"TerminalAffecte" ELSE 'TOGO'::"TerminalAffecte" END
WHERE "terminalAffecte" IS NULL;

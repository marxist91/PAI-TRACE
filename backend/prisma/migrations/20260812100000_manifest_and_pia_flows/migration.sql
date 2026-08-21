ALTER TYPE "StatutConteneur" ADD VALUE IF NOT EXISTS 'ATTENDU_PIA';
ALTER TYPE "StatutConteneur" ADD VALUE IF NOT EXISTS 'VU_A_QUAI';
ALTER TYPE "StatutConteneur" ADD VALUE IF NOT EXISTS 'SORTI_TERMINAL';
ALTER TYPE "StatutConteneur" ADD VALUE IF NOT EXISTS 'ENTRE_PIA';
ALTER TYPE "StatutConteneur" ADD VALUE IF NOT EXISTS 'SORTI_PIA';

CREATE TABLE "ManifesteImport" (
  "id" SERIAL NOT NULL,
  "nomFichier" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'EXCEL',
  "lignesTotal" INTEGER NOT NULL,
  "lignesImportees" INTEGER NOT NULL,
  "lignesIgnorees" INTEGER NOT NULL DEFAULT 0,
  "importeParId" INTEGER NOT NULL,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ManifesteImport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Conteneur" DROP CONSTRAINT IF EXISTS "Conteneur_numeroBL_key";
ALTER TABLE "Conteneur"
  ADD COLUMN "numeroConteneur" TEXT,
  ADD COLUMN "atp" TEXT,
  ADD COLUMN "datePrevuePia" TIMESTAMP(3),
  ADD COLUMN "dateDebarquement" TIMESTAMP(3),
  ADD COLUMN "vueAQuaiAt" TIMESTAMP(3),
  ADD COLUMN "dateSortieTerminal" TIMESTAMP(3),
  ADD COLUMN "dateEntreePia" TIMESTAMP(3),
  ADD COLUMN "dateSortiePia" TIMESTAMP(3),
  ADD COLUMN "paysDestination" TEXT,
  ADD COLUMN "manifesteId" INTEGER;

UPDATE "Conteneur" SET "numeroConteneur" = "numeroBL" WHERE "numeroConteneur" IS NULL;

CREATE UNIQUE INDEX "Conteneur_numeroConteneur_key" ON "Conteneur"("numeroConteneur");
CREATE INDEX "Conteneur_numeroBL_idx" ON "Conteneur"("numeroBL");
CREATE INDEX "Conteneur_atp_idx" ON "Conteneur"("atp");
CREATE INDEX "Conteneur_datePrevuePia_idx" ON "Conteneur"("datePrevuePia");
CREATE INDEX "Conteneur_dateDebarquement_idx" ON "Conteneur"("dateDebarquement");
CREATE INDEX "Conteneur_dateSortieTerminal_idx" ON "Conteneur"("dateSortieTerminal");
CREATE INDEX "Conteneur_dateEntreePia_idx" ON "Conteneur"("dateEntreePia");
CREATE INDEX "Conteneur_dateSortiePia_idx" ON "Conteneur"("dateSortiePia");
CREATE INDEX "Conteneur_manifesteId_idx" ON "Conteneur"("manifesteId");
CREATE INDEX "ManifesteImport_importedAt_idx" ON "ManifesteImport"("importedAt");
CREATE INDEX "ManifesteImport_importeParId_idx" ON "ManifesteImport"("importeParId");

ALTER TABLE "ManifesteImport"
  ADD CONSTRAINT "ManifesteImport_importeParId_fkey"
  FOREIGN KEY ("importeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Conteneur"
  ADD CONSTRAINT "Conteneur_manifesteId_fkey"
  FOREIGN KEY ("manifesteId") REFERENCES "ManifesteImport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

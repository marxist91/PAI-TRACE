-- CreateEnum
CREATE TYPE "Role" AS ENUM ('LOGISTICIEN', 'CLIENT');

-- CreateEnum
CREATE TYPE "StatutConteneur" AS ENUM ('EN_ATTENTE', 'CHEZ_CONSIGNATAIRE', 'EN_TRANSIT_VERS_TERMINAL', 'AU_TERMINAL', 'DECHARGE_SOUS_PALAN', 'EN_TRANSIT_VERS_PIA', 'ARRIVE_PIA', 'STOCKE_PIA', 'DOUANE', 'LIVRE');

-- CreateEnum
CREATE TYPE "TypeCheckpoint" AS ENUM ('CONSIGNATAIRE', 'TERMINAL_LCT', 'TERMINAL_TOGO', 'PIA');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "telephone" TEXT,
    "role" "Role" NOT NULL DEFAULT 'CLIENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consignataire" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "code" TEXT NOT NULL,

    CONSTRAINT "Consignataire_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conteneur" (
    "id" SERIAL NOT NULL,
    "numeroBL" TEXT NOT NULL,
    "consignataireId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "destination" TEXT NOT NULL,
    "typeMarchandise" TEXT NOT NULL,
    "dateArrivee" TIMESTAMP(3) NOT NULL,
    "statut" "StatutConteneur" NOT NULL DEFAULT 'EN_ATTENTE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conteneur_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Checkpoint" (
    "id" SERIAL NOT NULL,
    "conteneurId" INTEGER NOT NULL,
    "type" "TypeCheckpoint" NOT NULL,
    "statut" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lieu" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Checkpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mouvement" (
    "id" SERIAL NOT NULL,
    "conteneurId" INTEGER NOT NULL,
    "checkpointId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "Mouvement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "conteneurId" INTEGER,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rapport" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "dateDebut" TIMESTAMP(3) NOT NULL,
    "dateFin" TIMESTAMP(3) NOT NULL,
    "donnees" JSONB NOT NULL,
    "generePar" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rapport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Consignataire_nom_key" ON "Consignataire"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Consignataire_code_key" ON "Consignataire"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Conteneur_numeroBL_key" ON "Conteneur"("numeroBL");

-- CreateIndex
CREATE UNIQUE INDEX "Mouvement_checkpointId_key" ON "Mouvement"("checkpointId");

-- AddForeignKey
ALTER TABLE "Conteneur" ADD CONSTRAINT "Conteneur_consignataireId_fkey" FOREIGN KEY ("consignataireId") REFERENCES "Consignataire"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conteneur" ADD CONSTRAINT "Conteneur_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Checkpoint" ADD CONSTRAINT "Checkpoint_conteneurId_fkey" FOREIGN KEY ("conteneurId") REFERENCES "Conteneur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_conteneurId_fkey" FOREIGN KEY ("conteneurId") REFERENCES "Conteneur"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "Checkpoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mouvement" ADD CONSTRAINT "Mouvement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

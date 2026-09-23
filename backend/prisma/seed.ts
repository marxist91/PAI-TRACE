import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Seeding database...");

  // ── Nettoyage optionnel des données de test existantes ──
  await prisma.mouvement.deleteMany({});
  await prisma.checkpoint.deleteMany({});
  await prisma.conteneur.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  console.log("  🧹 Anciennes données de test nettoyées");

  // ── Consignataires ──
  const consignataires = await Promise.all([
    prisma.consignataire.upsert({
      where: { nom: "Maersk" },
      update: { code: "MSK" },
      create: { nom: "Maersk", code: "MSK" },
    }),
    prisma.consignataire.upsert({
      where: { nom: "MSC" },
      update: { code: "MSC" },
      create: { nom: "MSC", code: "MSC" },
    }),
    prisma.consignataire.upsert({
      where: { nom: "CMA CGM" },
      update: { code: "CMA" },
      create: { nom: "CMA CGM", code: "CMA" },
    }),
  ]);
  console.log(`  ✅ ${consignataires.length} consignataires créés/mis à jour`);

  // ── Utilisateurs ──
  const hash = await bcrypt.hash("password123", 10);
  const logisticien = await prisma.user.upsert({
    where: { email: "logisticien@pia.tg" },
    update: { password: hash },
    create: {
      email: "logisticien@pia.tg",
      password: hash,
      nom: "Logisticien",
      prenom: "Admin",
      role: "ADMIN",
    },
  });
  const client = await prisma.user.upsert({
    where: { email: "client@example.tg" },
    update: { password: hash },
    create: {
      email: "client@example.tg",
      password: hash,
      nom: "Client",
      prenom: "Test",
      role: "CLIENT",
    },
  });
  console.log(`  ✅ 2 utilisateurs créés/mis à jour (logisticien + client)`);

  // ── Conteneurs ──
  const conteneurs = await Promise.all([
    prisma.conteneur.create({
      data: {
        numeroBL: "BL-2024-001",
        consignataireId: consignataires[0].id,
        clientId: client.id,
        destination: "PIA - Adétikopé",
        typeMarchandise: "Électronique",
        dateArrivee: new Date(Date.now() - 30 * 3_600_000),
        statut: "EN_ATTENTE",
        isDemo: true,
      },
    }),
    prisma.conteneur.create({
      data: {
        numeroBL: "MSCU-4829173",
        consignataireId: consignataires[1].id,
        clientId: client.id,
        destination: "Ouagadougou",
        typeMarchandise: "Marchandises diverses",
        dateArrivee: new Date(Date.now() - 8 * 3_600_000),
        statut: "CHEZ_CONSIGNATAIRE",
        isDemo: true,
      },
    }),
    prisma.conteneur.create({
      data: {
        numeroBL: "MAEU-7182345",
        consignataireId: consignataires[0].id,
        clientId: client.id,
        destination: "Bamako",
        typeMarchandise: "Textile",
        dateArrivee: new Date(Date.now() - 6 * 3_600_000),
        statut: "ARRIVE_PIA",
        isDemo: true,
      },
    }),
  ]);
  console.log(`  ✅ ${conteneurs.length} conteneurs créés`);

  // ── Checkpoints et mouvements ──
  await prisma.checkpoint.create({
    data: {
      conteneurId: conteneurs[1].id,
      type: "CONSIGNATAIRE",
      statut: "Départ",
      date: new Date("2024-01-15T08:00:00Z"),
      lieu: "Port de Lomé",
      notes: "Chargement complet",
      mouvement: {
        create: {
          conteneurId: conteneurs[1].id,
          userId: logisticien.id,
          action: "DEPART",
          details: "Départ du consignataire",
        },
      },
    },
  });

  await prisma.checkpoint.create({
    data: {
      conteneurId: conteneurs[2].id,
      type: "PIA",
      statut: "Arrivée",
      date: new Date("2024-01-14T16:30:00Z"),
      lieu: "Port Sec de la PIA",
      notes: "Arrivée confirmée",
      mouvement: {
        create: {
          conteneurId: conteneurs[2].id,
          userId: logisticien.id,
          action: "ARRIVEE",
          details: "Arrivée à la PIA",
        },
      },
    },
  });
  console.log(`  ✅ 2 checkpoints créés`);

  await prisma.$disconnect();
  console.log("\n✅ Seed terminé avec succès !");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

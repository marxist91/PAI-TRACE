import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required");

  const pool = new pg.Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🔍 Vérification de la connexion Prisma Postgres...\n");

  // Test 1: compter les consignataires
  const consignataires = await prisma.consignataire.count();
  console.log(`  ✅ ${consignataires} consignataires`);

  // Test 2: compter les utilisateurs
  const users = await prisma.user.count();
  console.log(`  ✅ ${users} utilisateurs`);

  // Test 3: compter les conteneurs
  const conteneurs = await prisma.conteneur.count();
  console.log(`  ✅ ${conteneurs} conteneurs`);

  // Test 4: lecture d'un conteneur avec ses relations
  const conteneur = await prisma.conteneur.findFirst({
    include: { consignataire: true, client: true },
  });
  if (conteneur) {
    console.log(`\n  📦 Exemple: ${conteneur.numeroBL} → ${conteneur.statut} (${conteneur.consignataire.nom})`);
  }

  await prisma.$disconnect();
  console.log("\n✅ Connected — Prisma Postgres fonctionne correctement !");
}

main().catch((e) => {
  console.error("❌ Échec de la vérification :", e.message);
  process.exit(1);
});

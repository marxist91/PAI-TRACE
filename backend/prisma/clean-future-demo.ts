import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');

  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const tomorrow = new Date();
  tomorrow.setHours(24, 0, 0, 0);

  const futureDemoWhere = {
    isDemo: true,
    OR: [
      { dateDebarquement: { gte: tomorrow } },
      { vueAQuaiAt: { gte: tomorrow } },
      { dateSortieTerminal: { gte: tomorrow } },
      { dateEntreePia: { gte: tomorrow } },
      { dateSortiePia: { gte: tomorrow } },
    ],
  } as const;

  const targets = await prisma.conteneur.findMany({
    where: futureDemoWhere,
    orderBy: { id: 'asc' },
    select: {
      id: true,
      numeroConteneur: true,
      dateDebarquement: true,
      dateSortieTerminal: true,
      dateEntreePia: true,
      dateSortiePia: true,
    },
  });
  const ids = targets.map((item) => item.id);

  if (process.argv.includes('--dry-run')) {
    const first = targets[0];
    const last = targets.at(-1);
    console.log(JSON.stringify({
      cutoff: tomorrow.toISOString(),
      conteneurs: targets.length,
      premier: first ?? null,
      dernier: last ?? null,
    }, null, 2));
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    if (ids.length === 0) return { notifications: 0, mouvements: 0, checkpoints: 0, conteneurs: 0 };
    const notifications = await tx.notification.deleteMany({ where: { conteneurId: { in: ids } } });
    const mouvements = await tx.mouvement.deleteMany({ where: { conteneurId: { in: ids } } });
    const checkpoints = await tx.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } });
    const conteneurs = await tx.conteneur.deleteMany({ where: { id: { in: ids } } });
    return {
      notifications: notifications.count,
      mouvements: mouvements.count,
      checkpoints: checkpoints.count,
      conteneurs: conteneurs.count,
    };
  });

  console.log(JSON.stringify({ cutoff: tomorrow.toISOString(), deleted }, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch((error) => {
  console.error('Échec du nettoyage des données de démonstration futures :', error);
  process.exit(1);
});

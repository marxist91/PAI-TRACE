import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { PrismaClient } from '../src/generated/prisma/client';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  const pool = new pg.Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const demoContainers = await prisma.conteneur.findMany({
    where: { OR: [{ isDemo: true }, { numeroBL: { startsWith: 'DEMO-PIA-' } }] },
    select: { id: true },
  });
  const ids = demoContainers.map((item) => item.id);
  if (ids.length > 0) {
    await prisma.mouvement.deleteMany({ where: { conteneurId: { in: ids } } });
    await prisma.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } });
  }
  const result = await prisma.conteneur.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  await pool.end();
  console.log(`🧹 ${result.count} conteneurs de démonstration supprimés.`);
}

main().catch((error) => {
  console.error('❌ Échec du nettoyage démo :', error);
  process.exit(1);
});

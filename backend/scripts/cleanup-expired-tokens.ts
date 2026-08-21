import { prisma } from '../src/lib/prisma';

async function cleanupExpiredTokens() {
  const result = await prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  console.log(`${result.count} refresh token(s) expiré(s) supprimé(s)`);
}

cleanupExpiredTokens()
  .catch((error) => {
    console.error('Erreur nettoyage tokens:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

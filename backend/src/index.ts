import 'dotenv/config';
import { createServer } from 'http';
import { prisma } from './lib/prisma';
import { initializeRealtime } from './realtime';
import { createApp } from './app';

const app = createApp();
const server = createServer(app);
const PORT = Number(process.env.PORT || 3000);

// Gestion gracieuse de l'arrêt
process.on('SIGTERM', async () => {
  console.log('SIGTERM reçu, fermeture de Prisma...');
  await prisma.$disconnect();
  process.exit(0);
});

// Démarrage du serveur
initializeRealtime(server);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/api/health`);
});

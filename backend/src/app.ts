import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import authRoutes from './routes/auth';
import consignatairesRoutes from './routes/consignataires';
import conteneursRoutes from './routes/conteneurs';
import checkpointsRoutes from './routes/checkpoints';
import mouvementsRoutes from './routes/mouvements';
import anomaliesRoutes from './routes/anomalies';
import usersRoutes from './routes/users';
import notificationsRoutes from './routes/notifications';
import manifestesRoutes from './routes/manifestes';
import operationsRoutes from './routes/operations';
import settingsRoutes from './routes/settings';
import { frontendOrigin } from './services/deployment-config';
import { mountWeb } from './services/web-hosting';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  const corsOptions = {
    origin: frontendOrigin(process.env),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };

  app.use(cors(corsOptions));
  app.use(express.json());

  app.use('/api/auth', authRoutes);
  app.use('/api/consignataires', consignatairesRoutes);
  app.use('/api/conteneurs', conteneursRoutes);
  app.use('/api/checkpoints', checkpointsRoutes);
  app.use('/api/mouvements', mouvementsRoutes);
  app.use('/api/anomalies', anomaliesRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/manifestes', manifestesRoutes);
  app.use('/api/operations', operationsRoutes);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  if (process.env.WEB_DIST_DIR) mountWeb(app, process.env.WEB_DIST_DIR);

  return app;
}

import type { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { verifyAccessToken } from './middleware/auth';
import { prisma } from './lib/prisma';
import { frontendOrigin } from './services/deployment-config';

export interface RealtimeNotification {
  id: number;
  userId: number;
  conteneurId: number | null;
  message: string;
  type: string;
  lu: boolean;
  createdAt: Date;
}

let io: SocketServer | null = null;

export function initializeRealtime(server: HttpServer) {
  io = new SocketServer(server, {
    cors: {
      origin: frontendOrigin(process.env),
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token || typeof token !== 'string') throw new Error('Token manquant');
      const decoded = verifyAccessToken(token);
      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user?.isActive || user.tokenVersion !== (decoded.tokenVersion ?? 0)) throw new Error('Session révoquée');
      socket.data.user = { id: user.id, role: user.role };
      next();
    } catch {
      next(new Error('Authentification temps réel refusée'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as { id: number; role: string };
    socket.join('authenticated');
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
  });

  return io;
}

export function publishNotifications(notifications: RealtimeNotification[]) {
  if (!io) return;
  for (const notification of notifications) {
    io.to(`user:${notification.userId}`).emit('notification:new', notification);
  }
}

export function disconnectUser(id: number) {
  io?.in(`user:${id}`).disconnectSockets(true);
}

export function publishOperationChange(clientId: number, payload: Record<string, unknown>) {
  if (!io) return;
  io.to('authenticated').to(`user:${clientId}`).emit('operations:changed', payload);
}

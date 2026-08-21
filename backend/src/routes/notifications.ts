import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requestedLimit = Number(req.query.limit ?? 20);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 50) : 20;
    const unreadOnly = String(req.query.unread ?? '') === 'true';

    const [notifications, unreadCount] = await prisma.$transaction([
      prisma.notification.findMany({
        where: { userId: req.user!.id, ...(unreadOnly ? { lu: false } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          conteneurId: true,
          message: true,
          type: true,
          lu: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where: { userId: req.user!.id, lu: false } }),
    ]);

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Erreur liste notifications:', error);
    res.status(500).json({ error: 'Impossible de charger les notifications' });
  }
});

router.patch('/read-all', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user!.id, lu: false },
      data: { lu: true },
    });
    res.json({ updated: result.count });
  } catch (error) {
    console.error('Erreur lecture notifications:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour les notifications' });
  }
});

router.patch('/:id/read', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user!.id },
      data: { lu: true },
    });
    if (result.count === 0) {
      res.status(404).json({ error: 'Notification non trouvée' });
      return;
    }
    res.json({ updated: 1 });
  } catch (error) {
    console.error('Erreur lecture notification:', error);
    res.status(500).json({ error: 'Impossible de mettre à jour la notification' });
  }
});

export default router;

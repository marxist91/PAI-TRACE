import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { containerScopeFor } from '../services/access-control';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const action = String(req.query.action ?? '').trim();
    const requestedLimit = Number(req.query.limit ?? 50);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 50;

    const where: any = { conteneur: containerScopeFor(req.user!) };

    if (action) where.action = action;

    if (search) {
      where.OR = [
        { action: { contains: search, mode: 'insensitive' } },
        { details: { contains: search, mode: 'insensitive' } },
        { conteneur: { numeroConteneur: { contains: search, mode: 'insensitive' } } },
        { conteneur: { numeroBL: { contains: search, mode: 'insensitive' } } },
        { conteneur: { atp: { contains: search, mode: 'insensitive' } } },
        { conteneur: { destination: { contains: search, mode: 'insensitive' } } },
        { conteneur: { paysDestination: { contains: search, mode: 'insensitive' } } },
        { checkpoint: { lieu: { contains: search, mode: 'insensitive' } } },
        { user: { nom: { contains: search, mode: 'insensitive' } } },
        { user: { prenom: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [mouvements, total, grouped] = await Promise.all([
      prisma.mouvement.findMany({
        where,
        orderBy: { date: 'desc' },
        take: limit,
        select: {
          id: true,
          action: true,
          date: true,
          details: true,
          conteneur: {
            select: {
              id: true,
              numeroConteneur: true,
              numeroBL: true,
              atp: true,
              destination: true,
              paysDestination: true,
              statut: true,
            },
          },
          checkpoint: {
            select: { id: true, type: true, statut: true, lieu: true, date: true },
          },
          user: {
            select: { id: true, nom: true, prenom: true, email: true, role: true },
          },
        },
      }),
      prisma.mouvement.count({ where }),
      prisma.mouvement.groupBy({ by: ['action'], where, _count: { action: true } }),
    ]);

    res.json({
      mouvements,
      total,
      stats: grouped.map((item) => ({ action: item.action, count: item._count.action })),
    });
  } catch (error) {
    console.error('Erreur liste mouvements:', error);
    res.status(500).json({ error: 'Impossible de charger les mouvements' });
  }
});

export default router;

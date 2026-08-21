import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

router.get('/', authenticate, requireRole('LOGISTICIEN'), async (_req: AuthRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'] } },
      orderBy: [{ role: 'asc' }, { nom: 'asc' }, { prenom: 'asc' }],
      select: {
        id: true,
        email: true,
        nom: true,
        prenom: true,
        telephone: true,
        role: true,
        createdAt: true,
        _count: { select: { conteneurs: true, mouvements: true } },
      },
    });

    res.json({ users });
  } catch (error) {
    console.error('Erreur liste utilisateurs:', error);
    res.status(500).json({ error: 'Impossible de charger les utilisateurs' });
  }
});

export default router;

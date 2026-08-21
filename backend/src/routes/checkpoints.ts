import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { containerScopeFor } from '../services/access-control';

const router = Router();

// GET /api/checkpoints - Liste des checkpoints récents
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;

    const checkpoints = await prisma.checkpoint.findMany({
      where: { conteneur: containerScopeFor(req.user!) },
      take: limit,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        type: true,
        statut: true,
        date: true,
        lieu: true,
        notes: true,
        conteneur: {
          select: {
            id: true,
            numeroBL: true,
            statut: true,
          },
        },
      },
    });

    res.json({ checkpoints });
  } catch (error) {
    console.error('Erreur liste checkpoints:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/checkpoints/:id - Supprimer un checkpoint (logisticiens)
router.delete('/:id', authenticate, requireRole('LOGISTICIEN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: 'ID invalide' });
      return;
    }

    await prisma.checkpoint.delete({ where: { id } });
    res.json({ message: 'Checkpoint supprimé' });
  } catch (error) {
    console.error('Erreur suppression checkpoint:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

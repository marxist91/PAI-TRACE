import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

const consignataireSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  code: z.string().min(1, 'Code requis'),
});

// GET /api/consignataires - Liste tous les consignataires
router.get('/', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const consignataires = await prisma.consignataire.findMany({
      orderBy: { nom: 'asc' },
    });
    res.json({ consignataires });
  } catch (error) {
    console.error('Erreur consignataires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/consignataires - Créer un consignataire (logisticiens)
router.post('/', authenticate, requireRole('LOGISTICIEN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const data = consignataireSchema.parse(req.body);

    const existing = await prisma.consignataire.findFirst({
      where: { OR: [{ nom: data.nom }, { code: data.code }] },
    });

    if (existing) {
      res.status(400).json({ error: 'Nom ou code déjà utilisé' });
      return;
    }

    const consignataire = await prisma.consignataire.create({ data });
    res.status(201).json({ consignataire });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Données invalides', details: error.issues });
      return;
    }
    console.error('Erreur création consignataire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

export default router;

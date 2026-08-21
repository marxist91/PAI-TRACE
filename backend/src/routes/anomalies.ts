import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { ANOMALY_STATUSES, evaluateAnomaly, Severity } from '../services/anomaly-rules';
import { syncAnomalyNotifications } from '../services/anomaly-notifications';
import { containerScopeFor } from '../services/access-control';

const router = Router();

router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const search = String(req.query.search ?? '').trim();
    const severity = String(req.query.severity ?? '').trim();
    const requestedLimit = Number(req.query.limit ?? 60);
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 100) : 60;

    const where: any = { statut: { in: [...ANOMALY_STATUSES] }, AND: [containerScopeFor(req.user!)] };

    if (search) {
      where.OR = [
        { numeroConteneur: { contains: search, mode: 'insensitive' } },
        { numeroBL: { contains: search, mode: 'insensitive' } },
        { atp: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { paysDestination: { contains: search, mode: 'insensitive' } },
      ];
    }

    const conteneurs = await prisma.conteneur.findMany({
      where,
      orderBy: { dateArrivee: 'asc' },
      select: {
        id: true,
        numeroConteneur: true,
        numeroBL: true,
        atp: true,
        destination: true,
        paysDestination: true,
        dateArrivee: true,
        dateDebarquement: true,
        dateSortieTerminal: true,
        dateEntreePia: true,
        updatedAt: true,
        statut: true,
        isDemo: true,
        isDemoAnomaly: true,
        checkpoints: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { id: true, type: true, statut: true, lieu: true, date: true },
        },
      },
    });

    const now = Date.now();
    const allAnomalies = conteneurs.flatMap((conteneur) => {
      // Le volume de démonstration reste stable : seuls les cas explicitement
      // marqués simulent une anomalie. Les vraies unités restent calculées par délai.
      if (conteneur.isDemo && !conteneur.isDemoAnomaly) return [];
      const operationalDate = conteneur.statut === 'VU_A_QUAI' ? conteneur.dateDebarquement
        : conteneur.statut === 'SORTI_TERMINAL' ? conteneur.dateSortieTerminal
          : conteneur.statut === 'ENTRE_PIA' ? conteneur.dateEntreePia
            : conteneur.dateArrivee;
      const referenceDate = conteneur.isDemoAnomaly ? conteneur.dateArrivee : operationalDate ?? conteneur.checkpoints[0]?.date ?? conteneur.dateArrivee;
      const hoursOpen = Math.max(0, Math.floor((now - referenceDate.getTime()) / 3_600_000));
      const info = evaluateAnomaly(conteneur.statut, hoursOpen);
      if (!info) return [];

      return [{
        id: conteneur.id,
        severity: info.severity,
        title: info.title,
        description: info.description,
        hoursOpen,
        thresholdHours: info.thresholdHours,
        criticalAfterHours: info.criticalAfterHours,
        conteneur: {
          id: conteneur.id,
          numeroConteneur: conteneur.numeroConteneur,
          numeroBL: conteneur.numeroBL,
          atp: conteneur.atp,
          destination: conteneur.destination,
          paysDestination: conteneur.paysDestination,
          statut: conteneur.statut,
        },
        lastCheckpoint: conteneur.checkpoints[0] ?? null,
        detectedAt: new Date(referenceDate.getTime() + info.thresholdHours * 3_600_000),
      }];
    });

    const stats = {
      total: allAnomalies.length,
      critical: allAnomalies.filter((item) => item.severity === 'critical').length,
      warning: allAnomalies.filter((item) => item.severity === 'warning').length,
      info: allAnomalies.filter((item) => item.severity === 'info').length,
    };

    const severityOrder: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };
    const anomalies = allAnomalies
      .filter((item) => !severity || item.severity === severity)
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity] || b.hoursOpen - a.hoursOpen)
      .slice(0, limit);

    if (req.user?.role === 'LOGISTICIEN') {
      await syncAnomalyNotifications(allAnomalies);
    }

    res.json({ anomalies, stats });
  } catch (error) {
    console.error('Erreur liste anomalies:', error);
    res.status(500).json({ error: 'Impossible de charger les anomalies' });
  }
});

export default router;

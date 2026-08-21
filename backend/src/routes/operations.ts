import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { containerScopeFor } from '../services/access-control';

const router = Router();

type Periode = 'jour' | 'semaine' | 'mois';

function periodRange(value: unknown) {
  const periode: Periode = value === 'semaine' || value === 'mois' ? value : 'jour';
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  if (periode === 'semaine') {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
  }
  if (periode === 'mois') start.setDate(1);
  const end = new Date(start);
  if (periode === 'jour') end.setDate(end.getDate() + 1);
  if (periode === 'semaine') end.setDate(end.getDate() + 7);
  if (periode === 'mois') end.setMonth(end.getMonth() + 1);
  return { periode, start, end };
}

const listSelect = {
  id: true,
  numeroConteneur: true,
  numeroBL: true,
  atp: true,
  statut: true,
  terminalAffecte: true,
  datePrevuePia: true,
  dateDebarquement: true,
  dateSortieTerminal: true,
  dateEntreePia: true,
  dateSortiePia: true,
  paysDestination: true,
  destination: true,
  updatedAt: true,
  consignataire: { select: { id: true, nom: true, code: true } },
};

function withStay<T extends { dateEntreePia: Date | null; dateSortiePia: Date | null }>(item: T) {
  const end = item.dateSortiePia ?? new Date();
  const sejourHeures = item.dateEntreePia ? Math.max(0, Math.floor((end.getTime() - item.dateEntreePia.getTime()) / 3_600_000)) : null;
  return { ...item, sejourHeures, sejourJours: sejourHeures === null ? null : Math.ceil(sejourHeures / 24) };
}

router.get('/attendus', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode);
  const conteneurs = await prisma.conteneur.findMany({
    where: { AND: [containerScopeFor(req.user!), { datePrevuePia: { gte: start, lt: end } }] },
    orderBy: { datePrevuePia: 'asc' },
    select: listSelect,
  });
  res.json({ periode, dateDebut: start, dateFin: end, conteneurs: conteneurs.map(withStay) });
});

router.get('/quai', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode);
  const conteneurs = await prisma.conteneur.findMany({
    where: { AND: [containerScopeFor(req.user!), { dateDebarquement: { gte: start, lt: end } }] },
    orderBy: { dateDebarquement: 'desc' },
    select: listSelect,
  });
  res.json({ periode, dateDebut: start, dateFin: end, conteneurs: conteneurs.map(withStay) });
});

router.get('/pia', authenticate, async (req: AuthRequest, res: Response) => {
  const scope = containerScopeFor(req.user!);
  const [conteneursEnRoute, conteneursEnSejour, conteneursSortis, attendus, attendusLct, attendusTogo, enSejour, sortis, sortiesAvecSejour] = await Promise.all([
    prisma.conteneur.findMany({
      where: { AND: [scope, { dateEntreePia: null }, { statut: 'SORTI_TERMINAL' }] },
      orderBy: { updatedAt: 'desc' },
      take: 1000,
      select: listSelect,
    }),
    prisma.conteneur.findMany({
      where: { AND: [scope, { dateEntreePia: { not: null } }, { dateSortiePia: null }] },
      orderBy: { dateEntreePia: 'desc' },
      take: 1000,
      select: listSelect,
    }),
    prisma.conteneur.findMany({
      where: { AND: [scope, { dateSortiePia: { not: null } }] },
      orderBy: { dateSortiePia: 'desc' },
      take: 1000,
      select: listSelect,
    }),
    prisma.conteneur.count({ where: { AND: [scope, { dateEntreePia: null }, { statut: 'SORTI_TERMINAL' }] } }),
    prisma.conteneur.count({ where: { AND: [scope, { terminalAffecte: 'LCT' }, { dateEntreePia: null }, { statut: 'SORTI_TERMINAL' }] } }),
    prisma.conteneur.count({ where: { AND: [scope, { terminalAffecte: 'TOGO' }, { dateEntreePia: null }, { statut: 'SORTI_TERMINAL' }] } }),
    prisma.conteneur.count({ where: { AND: [scope, { dateEntreePia: { not: null } }, { dateSortiePia: null }] } }),
    prisma.conteneur.count({ where: { AND: [scope, { dateSortiePia: { not: null } }] } }),
    prisma.conteneur.findMany({ where: { AND: [scope, { dateEntreePia: { not: null } }, { dateSortiePia: { not: null } }] }, select: { dateEntreePia: true, dateSortiePia: true } }),
  ]);
  const durations = sortiesAvecSejour.map((item) => (item.dateSortiePia!.getTime() - item.dateEntreePia!.getTime()) / 3_600_000);
  const sejourMoyenHeures = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
  const orderedContainers = [...conteneursEnRoute, ...conteneursEnSejour, ...conteneursSortis].map(withStay);
  res.json({ conteneurs: orderedContainers, stats: { attendus, attendusLct, attendusTogo, enSejour, sortis, sejourMoyenHeures } });
});

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode);
  const scope = containerScopeFor(req.user!);
  const dateWhere = (field: string) => ({ AND: [scope, { [field]: { gte: start, lt: end } }] });
  const [attendus, attendusLct, attendusTogo, vusAQuai, sortiesLct, sortiesTogo, entreesPia, sortiesPia, enSejour, sortiesAvecSejour] = await Promise.all([
    prisma.conteneur.count({ where: dateWhere('datePrevuePia') }),
    prisma.conteneur.count({ where: { ...dateWhere('datePrevuePia'), terminalAffecte: 'LCT' } }),
    prisma.conteneur.count({ where: { ...dateWhere('datePrevuePia'), terminalAffecte: 'TOGO' } }),
    prisma.conteneur.count({ where: dateWhere('dateDebarquement') }),
    prisma.conteneur.count({ where: { ...dateWhere('dateSortieTerminal'), terminalAffecte: 'LCT' } }),
    prisma.conteneur.count({ where: { ...dateWhere('dateSortieTerminal'), terminalAffecte: 'TOGO' } }),
    prisma.conteneur.count({ where: dateWhere('dateEntreePia') }),
    prisma.conteneur.count({ where: dateWhere('dateSortiePia') }),
    prisma.conteneur.count({ where: { AND: [scope, { dateEntreePia: { not: null } }, { dateSortiePia: null }] } }),
    prisma.conteneur.findMany({ where: dateWhere('dateSortiePia'), select: { dateEntreePia: true, dateSortiePia: true } }),
  ]);
  const durations = sortiesAvecSejour.flatMap((item) => item.dateEntreePia && item.dateSortiePia ? [(item.dateSortiePia.getTime() - item.dateEntreePia.getTime()) / 3_600_000] : []);
  const sejourMoyenHeures = durations.length ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length) : 0;
  res.json({
    periode, dateDebut: start, dateFin: end,
    stats: { attendus, attendusLct, attendusTogo, vusAQuai, sortiesTerminal: sortiesLct + sortiesTogo, sortiesLct, sortiesTogo, entreesPia, sortiesPia, enSejour, sejourMoyenHeures },
  });
});

export default router;

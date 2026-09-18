import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { containerScopeFor } from '../services/access-control';
import { buildOperationsWorkbook, exportDateFilter, type OperationExportKind } from '../services/operations-export';

import { periodRange } from '../services/operation-period';

const router = Router();
router.use((req, res, next) => {
  try { periodRange(req.query.periode, req.query.date); next(); }
  catch { res.status(400).json({ error: 'Date invalide : utilisez une date réelle au format AAAA-MM-JJ.' }); }
});

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
  typeMarchandise: true,
  updatedAt: true,
  consignataire: { select: { id: true, nom: true, code: true } },
};

const exportKinds = new Set<OperationExportKind>(['activite', 'attendus', 'quai', 'sorties-terminal', 'entrees-pia', 'sorties-pia', 'registre-pia', 'flux-pia', 'sejours-pia']);

router.get('/export.xlsx', authenticate, async (req: AuthRequest, res: Response) => {
  const rawKind = String(req.query.liste ?? 'activite') as OperationExportKind;
  if (!exportKinds.has(rawKind)) return res.status(400).json({ error: 'Type de liste invalide' });
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
  const rows = await prisma.conteneur.findMany({
    where: { AND: [containerScopeFor(req.user!), exportDateFilter(rawKind, start, end)] },
    orderBy: { updatedAt: 'desc' },
    select: listSelect,
  });
  const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  const periodLabel = `${formatDate(start)} au ${formatDate(new Date(end.getTime() - 1))} (Lomé)`;
  const scopeLabel = req.user!.role === 'CONTROLEUR_LCT' ? 'LCT'
    : req.user!.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal'
      : req.user!.role === 'AGENT_PIA' ? 'PIA' : 'Port autonome de Lomé';
  const workbook = await buildOperationsWorkbook({ kind: rawKind, periodLabel, scopeLabel, start, end, rows });
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = start.toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pia-trace-${rawKind}-${periode}-${stamp}.xlsx"`);
  return res.send(buffer);
});

function withStay<T extends { dateEntreePia: Date | null; dateSortiePia: Date | null }>(item: T) {
  const end = item.dateSortiePia ?? new Date();
  const sejourHeures = item.dateEntreePia ? Math.max(0, Math.floor((end.getTime() - item.dateEntreePia.getTime()) / 3_600_000)) : null;
  return { ...item, sejourHeures, sejourJours: sejourHeures === null ? null : Math.ceil(sejourHeures / 24) };
}

router.get('/attendus', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
  const conteneurs = await prisma.conteneur.findMany({
    where: { AND: [containerScopeFor(req.user!), { datePrevuePia: { gte: start, lt: end } }] },
    orderBy: { datePrevuePia: 'asc' },
    select: listSelect,
  });
  res.json({ periode, dateDebut: start, dateFin: end, conteneurs: conteneurs.map(withStay) });
});

router.get('/quai', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
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
  const sejourMoyenHeures = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  const orderedContainers = [...conteneursEnRoute, ...conteneursEnSejour, ...conteneursSortis].map(withStay);
  res.json({ conteneurs: orderedContainers, stats: { attendus, attendusLct, attendusTogo, enSejour, sortis, sejourMoyenHeures } });
});

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
  const scope = containerScopeFor(req.user!);
  const dateWhere = (field: string) => ({ AND: [scope, { [field]: { gte: start, lt: end } }] });
  const destinesPia = await prisma.conteneur.count({ where: scope });
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
  const sejourMoyenHeures = durations.length ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0;
  res.json({
    periode, dateDebut: start, dateFin: end,
    stats: { destinesPia, attendus, attendusLct, attendusTogo, vusAQuai, sortiesTerminal: sortiesLct + sortiesTogo, sortiesLct, sortiesTogo, entreesPia, sortiesPia, enSejour, sejourMoyenHeures },
  });
});

export default router;

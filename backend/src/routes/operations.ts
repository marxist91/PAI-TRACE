import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { containerScopeFor } from '../services/access-control';
import { buildOperationsWorkbook, exportDateFilter, type OperationExportKind } from '../services/operations-export';

import { periodRange } from '../services/operation-period';
import { operationStatistics } from '../services/operation-statistics';
import { buildStatisticsWorkbook } from '../services/statistics-export';
import { readSettings } from '../services/operational-settings';
import { currentPiaStock, buildCurrentStockWorkbook, type StockFilter } from '../services/current-pia-stock';
import { operationScopeFor, parseOperationTerminal } from '../services/operation-terminal';

const statisticsSelect = {
  paysDestination: true,
  terminalAffecte: true, datePrevuePia: true, dateDebarquement: true,
  dateSortieTerminal: true, dateEntreePia: true, dateSortiePia: true,
} as const;

const router = Router();
router.use((req, res, next) => {
  try { periodRange(req.query.periode, req.query.date); next(); }
  catch { res.status(400).json({ error: 'Date invalide : utilisez une date réelle au format AAAA-MM-JJ.' }); }
});
router.use((req, res, next) => {
  try { parseOperationTerminal(req.query.terminal); next(); }
  catch { res.status(400).json({ error: 'Terminal invalide : utilisez TOUS, LCT ou TOGO.' }); }
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
  const selection = operationScopeFor(req.user!, req.query.terminal);
  const rows = await prisma.conteneur.findMany({
    where: { AND: [selection.where, exportDateFilter(rawKind, start, end)] },
    orderBy: { updatedAt: 'desc' },
    select: listSelect,
  });
  const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  const periodLabel = `${formatDate(start)} au ${formatDate(new Date(end.getTime() - 1))} (Lomé)`;
  const scopeLabel = selection.label;
  const workbook = await buildOperationsWorkbook({ kind: rawKind, periodLabel, scopeLabel, start, end, rows });
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const stamp = start.toISOString().slice(0, 10);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pia-trace-${rawKind}-${periode}-${stamp}${selection.suffix}.xlsx"`);
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

router.get(['/stock-actuel', '/stock-actuel.xlsx'], authenticate, async (req: AuthRequest, res: Response) => {
  const selection = operationScopeFor(req.user!, req.query.terminal);
  const filter = req.query.filtre ?? 'tous';
  if (typeof filter !== 'string' || !['tous', 'alertes', 'critiques'].includes(filter)) return res.status(400).json({ error: 'Filtre de stock invalide.' });
  const now = new Date();
  const [rows, settings] = await Promise.all([
    prisma.conteneur.findMany({
      where: { AND: [selection.where, { dateEntreePia: { lt: now }, OR: [{ dateSortiePia: null }, { dateSortiePia: { gte: now } }] }] },
      select: { id: true, numeroConteneur: true, numeroBL: true, terminalAffecte: true, paysDestination: true, dateEntreePia: true, dateSortiePia: true },
    }),
    readSettings(),
  ]);
  const stock = currentPiaStock(rows, settings.rules.ENTRE_PIA, now);
  if (!req.path.endsWith('.xlsx')) return res.json({ stock });
  const workbook = buildCurrentStockWorkbook(stock, filter as StockFilter);
  const stockSheet = workbook.worksheets[0]!;
  stockSheet.getCell('A2').value = `${stockSheet.getCell('A2').value} — ${selection.label}`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pia-trace-stock-actuel-${filter}-${now.toISOString().slice(0, 10)}${selection.suffix}.xlsx"`);
  return res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
});

router.get('/stats', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
  const selection = operationScopeFor(req.user!, req.query.terminal);
  // One scoped snapshot keeps stock, daily totals and terminal totals consistent.
  const rows = await prisma.conteneur.findMany({ where: selection.where, select: statisticsSelect });
  const stats = operationStatistics(rows, start, end);
  if (selection.terminal !== 'TOUS') stats.byTerminal = stats.byTerminal.filter(item => item.terminal === selection.terminal);
  res.json({
    periode, dateDebut: start, dateFin: end,
    stats,
  });
});

router.get('/stats-export.xlsx', authenticate, async (req: AuthRequest, res: Response) => {
  const { periode, start, end } = periodRange(req.query.periode, req.query.date);
  const selection = operationScopeFor(req.user!, req.query.terminal);
  const rows = await prisma.conteneur.findMany({ where: selection.where, select: statisticsSelect });
  const generatedAt = new Date();
  const stats = operationStatistics(rows, start, end, generatedAt);
  if (selection.terminal !== 'TOUS') stats.byTerminal = stats.byTerminal.filter(item => item.terminal === selection.terminal);
  const workbook = buildStatisticsWorkbook(stats, start, end, selection.label, generatedAt);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="pia-trace-statistiques-${periode}-${start.toISOString().slice(0, 10)}${selection.suffix}.xlsx"`);
  res.send(Buffer.from(await workbook.xlsx.writeBuffer()));
});

export default router;

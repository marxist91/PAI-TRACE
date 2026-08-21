import { Router, Response } from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const valid = /\.(xlsx)$/i.test(file.originalname);
    if (valid) callback(null, true);
    else callback(new Error('Le manifeste doit être un fichier Excel .xlsx'));
  },
});

const aliases: Record<string, string[]> = {
  atp: ['ATP', 'NUMERO ATP', 'N ATP'],
  numeroConteneur: ['NUMERO CONTENEUR', 'N CONTENEUR', 'CONTENEUR', 'CONTAINER NUMBER', 'CONTAINER NO'],
  numeroBL: ['BL', 'NUMERO BL', 'N BL', 'CONNAISSEMENT', 'BILL OF LADING'],
  terminal: ['TERMINAL', 'MANUTENTIONNAIRE', 'CHECKPOINT'],
  datePrevuePia: ['DATE PREVUE PIA', 'ARRIVEE PREVUE PIA', 'ETA PIA'],
  dateDebarquement: ['DATE DEBARQUEMENT', 'VU A QUAI', 'DATE VAQ', 'VAQ'],
  paysDestination: ['PAYS DESTINATION', 'PAYS DE DESTINATION', 'DESTINATION'],
  typeMarchandise: ['MARCHANDISE', 'TYPE MARCHANDISE', 'DESCRIPTION MARCHANDISE'],
  consignataire: ['CONSIGNATAIRE', 'COMPAGNIE MARITIME', 'ARMATEUR'],
};

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

function columnMap(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => headers.set(normalize(cell.text), column));
  return Object.fromEntries(Object.entries(aliases).map(([field, names]) => {
    const column = names.map(normalize).map((name) => headers.get(name)).find(Boolean);
    return [field, column];
  })) as Record<keyof typeof aliases, number | undefined>;
}

function textAt(row: ExcelJS.Row, column?: number) {
  return column ? row.getCell(column).text.trim() : '';
}

function dateAt(row: ExcelJS.Row, column?: number): Date | null {
  if (!column) return null;
  const value = row.getCell(column).value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  const text = row.getCell(column).text.trim();
  const french = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (french) return new Date(Number(french[3]), Number(french[2]) - 1, Number(french[1]), Number(french[4] ?? 0), Number(french[5] ?? 0));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function terminalValue(value: string): 'LCT' | 'TOGO' | null {
  const normalized = normalize(value);
  if (normalized.includes('LCT')) return 'LCT';
  if (normalized.includes('TOGO')) return 'TOGO';
  return null;
}

function terminalForRole(role: string): 'LCT' | 'TOGO' | null {
  if (role === 'CONTROLEUR_LCT') return 'LCT';
  if (role === 'CONTROLEUR_TOGO') return 'TOGO';
  return null;
}

router.get('/', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO'), async (req: AuthRequest, res: Response) => {
  const terminalRole = req.user!.role === 'CONTROLEUR_LCT' ? 'CONTROLEUR_LCT' as const
    : req.user!.role === 'CONTROLEUR_TOGO' ? 'CONTROLEUR_TOGO' as const
      : null;
  const manifestes = await prisma.manifesteImport.findMany({
    where: terminalRole ? { importePar: { role: terminalRole } } : {},
    orderBy: { importedAt: 'desc' },
    take: 30,
    select: {
      id: true, nomFichier: true, source: true, lignesTotal: true, lignesImportees: true,
      lignesIgnorees: true, importedAt: true,
      importePar: { select: { nom: true, prenom: true } },
    },
  });
  res.json({ manifestes });
});

router.post('/import', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO'), upload.single('fichier'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier Excel requis' });
      return;
    }
    const workbook = new ExcelJS.Workbook();
    const excelBytes = new Uint8Array(req.file.buffer);
    await workbook.xlsx.load(excelBytes.buffer);
    const worksheet = workbook.worksheets[0];
    if (!worksheet || worksheet.rowCount < 2) {
      res.status(400).json({ error: 'Le fichier ne contient aucune ligne de manifeste' });
      return;
    }
    const columns = columnMap(worksheet);
    if (!columns.numeroConteneur && !columns.numeroBL) {
      res.status(400).json({ error: 'Ajoutez une colonne Numéro conteneur ou B/L' });
      return;
    }

    const fallbackConsignataire = await prisma.consignataire.upsert({
      where: { code: 'MNF' }, update: {}, create: { nom: 'Manifeste non renseigné', code: 'MNF' },
    });
    const forcedTerminal = terminalForRole(req.user!.role);
    const total = worksheet.rowCount - 1;
    const manifeste = await prisma.manifesteImport.create({
      data: {
        nomFichier: req.file.originalname,
        source: forcedTerminal ? `EXCEL_${forcedTerminal}` : 'EXCEL_PAL',
        lignesTotal: total,
        lignesImportees: 0,
        importeParId: req.user!.id,
      },
    });
    let imported = 0;
    let ignored = 0;

    for (let index = 2; index <= worksheet.rowCount; index += 1) {
      const row = worksheet.getRow(index);
      const numeroConteneur = textAt(row, columns.numeroConteneur).replace(/\s+/g, '').toUpperCase() || null;
      const numeroBL = textAt(row, columns.numeroBL) || numeroConteneur;
      if (!numeroBL) { ignored += 1; continue; }
      const datePrevuePia = dateAt(row, columns.datePrevuePia);
      const dateDebarquement = dateAt(row, columns.dateDebarquement);
      const terminalFromFile = terminalValue(textAt(row, columns.terminal));
      if (forcedTerminal && terminalFromFile && terminalFromFile !== forcedTerminal) {
        ignored += 1;
        continue;
      }
      const terminalAffecte = forcedTerminal ?? terminalFromFile;
      const consignataireNom = textAt(row, columns.consignataire);
      let consignataireId = fallbackConsignataire.id;
      if (consignataireNom) {
        const existing = await prisma.consignataire.findFirst({ where: { nom: { equals: consignataireNom, mode: 'insensitive' } } });
        if (existing) consignataireId = existing.id;
      }
      const data = {
        numeroBL,
        numeroConteneur,
        atp: textAt(row, columns.atp) || null,
        consignataireId,
        clientId: req.user!.id,
        destination: textAt(row, columns.paysDestination) || 'À renseigner',
        paysDestination: textAt(row, columns.paysDestination) || null,
        typeMarchandise: textAt(row, columns.typeMarchandise) || 'Non renseignée',
        dateArrivee: datePrevuePia ?? dateDebarquement ?? new Date(),
        datePrevuePia,
        dateDebarquement,
        vueAQuaiAt: dateDebarquement,
        terminalAffecte,
        statut: dateDebarquement ? 'VU_A_QUAI' as const : 'ATTENDU_PIA' as const,
        manifesteId: manifeste.id,
      };
      const existing = numeroConteneur
        ? await prisma.conteneur.findUnique({ where: { numeroConteneur }, select: { id: true, terminalAffecte: true } })
        : await prisma.conteneur.findFirst({ where: { numeroBL }, select: { id: true, terminalAffecte: true } });
      if (forcedTerminal && existing?.terminalAffecte && existing.terminalAffecte !== forcedTerminal) {
        ignored += 1;
        continue;
      }
      if (existing) await prisma.conteneur.update({ where: { id: existing.id }, data });
      else await prisma.conteneur.create({ data });
      imported += 1;
    }
    await prisma.manifesteImport.update({ where: { id: manifeste.id }, data: { lignesImportees: imported, lignesIgnorees: ignored } });
    res.status(201).json({ manifeste: { ...manifeste, lignesImportees: imported, lignesIgnorees: ignored } });
  } catch (error) {
    console.error('Erreur import manifeste:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Impossible de lire le manifeste' });
  }
});

export default router;

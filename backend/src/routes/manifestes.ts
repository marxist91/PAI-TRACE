import { Router, Response } from 'express';
import multer from 'multer';
import { prisma } from '../lib/prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { ParsedManifestRow, parseManifest, terminalForRole } from '../services/manifest-parser';
import { previewTransfers } from '../services/transfer-preview';
import { reconcilePia } from '../services/pia-reconciliation';
import { importOfficialPia, persistOfficialPia } from '../services/official-pia-import';
import { parseXmlManifest } from '../services/xml-manifest';
import { resolveXmlDestinations } from '../services/xml-destination';

async function previewXml(buffer: Buffer, role: string, dateVaq?: string) {
  const parsed = parseXmlManifest(buffer, role, dateVaq);
  const numbers = parsed.lignes.filter(row => row.action === 'ANALYSE').map(row => row.numeroConteneur);
  const terminal = terminalForRole(role);
  const registry = numbers.length ? await prisma.conteneur.findMany({
    where: { numeroConteneur: { in: numbers }, ...(terminal ? { terminalAffecte: terminal } : {}) },
    select: { numeroConteneur: true, paysDestination: true },
  }) : [];
  return resolveXmlDestinations(parsed, registry);
}

const router = Router();
const pairUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 2 },
  fileFilter: (_req, file, callback) => /\.xlsx$/i.test(file.originalname) ? callback(null, true) : callback(new Error('Fichier .xlsx requis')) });

router.post('/rapprochement', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO'),
  pairUpload.fields([{ name: 'listePia', maxCount: 1 }, { name: 'manifeste', maxCount: 1 }]), async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as Record<string, Express.Multer.File[]> | undefined;
      const pia = files?.listePia?.[0];
      const manifest = files?.manifeste?.[0];
      if (!pia || !manifest) return res.status(400).json({ error: 'Choisissez la liste PIA et le manifeste.' });
      if (await previewTransfers(pia.buffer, req.user!.role) || await previewTransfers(manifest.buffer, req.user!.role)) {
        return res.status(400).json({ error: 'Le suivi historique ne remplace pas la liste des attendus ou le manifeste source. Utilisez ici deux fichiers à colonnes en première ligne.' });
      }
      const [expected, actual] = await Promise.all([parseManifest(pia.buffer, req.user!.role), parseManifest(manifest.buffer, req.user!.role)]);
      return res.json({ rapprochement: reconcilePia(expected.rows, actual.rows) });
    } catch (error) { return res.status(400).json({ error: error instanceof Error ? error.message : 'Comparaison impossible' }); }
  });
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    const valid = /\.(xlsx|xml)$/i.test(file.originalname);
    if (valid) callback(null, true);
    else callback(new Error('Le manifeste doit être un fichier .xlsx ou .xml'));
  },
});

type ResolvedManifestRow = ParsedManifestRow & {
  action: 'CREATION' | 'MISE_A_JOUR' | 'IGNOREE';
  existingId: number | null;
};

async function resolveExistingContainers(rows: ParsedManifestRow[], forcedTerminal: 'LCT' | 'TOGO' | null): Promise<ResolvedManifestRow[]> {
  const containerNumbers = rows.flatMap((row) => row.numeroConteneur ? [row.numeroConteneur] : []);
  const billNumbers = rows.flatMap((row) => !row.numeroConteneur && row.numeroBL ? [row.numeroBL] : []);
  const filters = [
    ...(containerNumbers.length ? [{ numeroConteneur: { in: containerNumbers } }] : []),
    ...(billNumbers.length ? [{ numeroBL: { in: billNumbers } }] : []),
  ];
  const existingContainers = filters.length ? await prisma.conteneur.findMany({
    where: { OR: filters },
    select: { id: true, numeroConteneur: true, numeroBL: true, terminalAffecte: true },
  }) : [];
  const byContainer = new Map(existingContainers.flatMap((item) => item.numeroConteneur ? [[item.numeroConteneur, item] as const] : []));
  const byBill = new Map<string, typeof existingContainers>();
  for (const item of existingContainers) byBill.set(item.numeroBL, [...(byBill.get(item.numeroBL) ?? []), item]);

  return rows.map((row) => {
    const billMatches = !row.numeroConteneur && row.numeroBL ? byBill.get(row.numeroBL) ?? [] : [];
    const existing = row.numeroConteneur ? byContainer.get(row.numeroConteneur) : billMatches.length === 1 ? billMatches[0] : undefined;
    const issues = [...row.issues];
    let accepted = row.accepted;
    if (!existing || !row.numeroConteneur) {
      issues.push('Absent du registre PIA ou numéro de conteneur manquant : chargez d’abord la liste officielle PIA. Aucun ajout depuis le manifeste seul.');
      accepted = false;
    }
    if (accepted && !row.numeroConteneur && billMatches.length > 1) {
      issues.push('B/L associé à plusieurs conteneurs : ajoutez le numéro de conteneur');
      accepted = false;
    }
    if (accepted && forcedTerminal && existing?.terminalAffecte && existing.terminalAffecte !== forcedTerminal) {
      issues.push(`Conteneur déjà rattaché au terminal ${existing.terminalAffecte}`);
      accepted = false;
    }
    return {
      ...row,
      accepted,
      issues,
      existingId: existing?.id ?? null,
      action: !accepted ? 'IGNOREE' : existing ? 'MISE_A_JOUR' : 'CREATION',
    };
  });
}

function previewRow(row: ResolvedManifestRow) {
  return {
    line: row.line,
    numeroConteneur: row.numeroConteneur,
    numeroBL: row.numeroBL,
    atp: row.atp,
    terminal: row.terminalAffecte,
    datePrevuePia: row.datePrevuePia?.toISOString() ?? null,
    dateDebarquement: row.dateDebarquement?.toISOString() ?? null,
    paysDestination: row.paysDestination,
    typeMarchandise: row.typeMarchandise,
    action: row.action,
    issues: row.issues,
  };
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

router.post('/preview', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO'), upload.single('fichier'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier Excel requis' });
      return;
    }
    if (/\.xml$/i.test(req.file.originalname)) {
      const xml = await previewXml(req.file.buffer, req.user!.role);
      const displayRows = [...xml.lignes].sort((a, b) => Number(b.action === 'ANALYSE') - Number(a.action === 'ANALYSE'));
      res.json({ preview: { ...xml, nomFichier: req.file.originalname, lignes: displayRows.slice(0, 200), apercuLimite: xml.lignes.length > 200 } });
      return;
    }
    const transfer = await previewTransfers(req.file.buffer, req.user!.role);
    if (transfer) {
      res.json({ preview: { nomFichier: req.file.originalname, ...transfer, officiel: true } });
      return;
    }
    const parsed = await parseManifest(req.file.buffer, req.user!.role);
    const rows = await resolveExistingContainers(parsed.rows, terminalForRole(req.user!.role));
    const readyRows = rows.filter((row) => row.accepted);
    const previewLimit = 200;
    res.json({
      preview: {
        nomFichier: req.file.originalname,
        lignesTotal: rows.length,
        lignesValides: readyRows.length,
        lignesIgnorees: rows.length - readyRows.length,
        creations: readyRows.filter((row) => row.action === 'CREATION').length,
        misesAJour: readyRows.filter((row) => row.action === 'MISE_A_JOUR').length,
        colonnesReconnues: parsed.recognizedColumns,
        colonnesManquantes: parsed.missingColumns,
        lignes: rows.slice(0, previewLimit).map(previewRow),
        apercuLimite: rows.length > previewLimit,
      },
    });
  } catch (error) {
    console.error('Erreur aperçu manifeste:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Impossible de lire le manifeste' });
  }
});

router.post('/import', authenticate, requireRole('LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO'), upload.single('fichier'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Fichier Excel requis' });
      return;
    }
    if (/\.xml$/i.test(req.file.originalname)) {
      try {
        const xml = await previewXml(req.file.buffer, req.user!.role);
        if (!xml.lignesValides) {
          res.json({ manifeste: { lignesImportees: 0, lignesIgnorees: xml.lignesIgnorees, bilan: { crees: 0, completes: 0, inchanges: 0, operationsAjoutees: 0 } }, message: xml.message });
          return;
        }
        if (typeof req.body.dateVaq !== 'string' || !req.body.dateVaq) { res.status(400).json({ error: 'Confirmez la date réelle Vu à quai avant import.' }); return; }
        const confirmed = await previewXml(req.file.buffer, req.user!.role, req.body.dateVaq);
        const manifeste = await persistOfficialPia(confirmed, req.file.buffer, req.file.originalname, req.user!);
        res.status(201).json({ manifeste });
      } catch (error) { res.status(400).json({ error: error instanceof Error ? error.message : 'XML invalide' }); }
      return;
    }
    if (await previewTransfers(req.file.buffer, req.user!.role)) {
      try {
        const manifeste = await importOfficialPia(req.file.buffer, req.file.originalname, req.user!);
        res.status(201).json({ manifeste });
      } catch (error) {
        res.status(409).json({ error: error instanceof Error ? error.message : 'Import officiel impossible. Aucune modification enregistrée.' });
      }
      return;
    }
    const parsed = await parseManifest(req.file.buffer, req.user!.role);
    const forcedTerminal = terminalForRole(req.user!.role);
    const rows = await resolveExistingContainers(parsed.rows, forcedTerminal);

    const total = rows.length;
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
    const ignored = rows.filter((row) => !row.accepted).length;

    for (const row of rows) {
      if (!row.accepted || !row.numeroBL) continue;
      // Le manifeste enrichit uniquement une référence déjà inscrite au registre PIA.
      // Il ne remplace ni les dates d'opération, ni le statut, ni la provenance officielle.
      if (!row.existingId) continue;
      await prisma.conteneur.update({ where: { id: row.existingId }, data: {
        ...(parsed.columns.numeroBL && row.numeroBL && row.numeroBL !== row.numeroConteneur ? { numeroBL: row.numeroBL } : {}),
        ...(row.atp ? { atp: row.atp } : {}),
        ...(row.paysDestination ? { paysDestination: row.paysDestination, destination: row.paysDestination } : {}),
        ...(row.typeMarchandise ? { typeMarchandise: row.typeMarchandise } : {}),
      } });
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

import { createHash } from 'node:crypto';
import { prisma } from '../lib/prisma';
import { previewTransfers } from './transfer-preview';
import { isTogoCountry } from './xml-destination';
import type { Prisma } from '../generated/prisma/client';

const fields = ['dateDebarquement', 'dateSortieTerminal', 'dateEntreePia', 'dateSortiePia'] as const;
type Dates = Record<typeof fields[number], Date | null>;
export function mergeOfficialDates(existing: Dates, incoming: Record<keyof Dates, string | null>): Dates {
  const merged: Dates = { dateDebarquement: existing.dateDebarquement, dateSortieTerminal: existing.dateSortieTerminal,
    dateEntreePia: existing.dateEntreePia, dateSortiePia: existing.dateSortiePia };
  for (const field of fields) {
    const date = incoming[field] ? new Date(incoming[field]!) : null;
    if (date && existing[field] && date.getTime() !== existing[field]!.getTime()) throw new Error(`Conflit sur ${field} : une date est déjà enregistrée`);
    merged[field] = existing[field] ?? date;
  }
  const dates = fields.flatMap(field => merged[field] ? [merged[field]!.getTime()] : []);
  if (dates.some((date, i) => !Number.isFinite(date) || date > Date.now() || (i > 0 && date < dates[i - 1]))) throw new Error('Chronologie incohérente après rapprochement');
  return merged;
}

export async function importOfficialPia(buffer: Buffer, filename: string, actor: { id: number; role: string }, db: Pick<typeof prisma, '$transaction'> = prisma) {
  const preview = await previewTransfers(buffer, actor.role, true);
  if (!preview) throw new Error('Modèle officiel PIA non reconnu');
  return persistOfficialPia(preview, buffer, filename, actor, db);
}

export async function persistOfficialPia(preview: NonNullable<Awaited<ReturnType<typeof previewTransfers>>>, buffer: Buffer, filename: string, actor: { id: number; role: string }, db: Pick<typeof prisma, '$transaction'> = prisma) {
  const rows = preview.lignes.filter(row => row.action === 'ANALYSE');
  if (!rows.length) throw new Error('Aucune ligne valide à enregistrer');
  if (new Set(rows.map(row => row.numeroConteneur)).size !== rows.length) throw new Error('Le lot contient des références en double.');
  return db.$transaction(async tx => {
    const bilan = { crees: 0, completes: 0, inchanges: 0, operationsAjoutees: 0 };
    const company = await tx.consignataire.upsert({ where: { code: 'MNF' }, update: {}, create: { code: 'MNF', nom: 'Manifeste non renseigné' } });
    const batch = await tx.manifesteImport.create({ data: { nomFichier: filename, source: 'LISTE_OFFICIELLE_PIA', importeParId: actor.id,
      lignesTotal: preview.lignesTotal, lignesImportees: rows.length, lignesIgnorees: preview.lignesIgnorees } });
    const existingRows = await tx.conteneur.findMany({ where: { numeroConteneur: { in: rows.map(row => row.numeroConteneur) } } });
    const registry = new Map(existingRows.map(row => [row.numeroConteneur, row]));
    const creations: Prisma.ConteneurCreateManyInput[] = [];
    const operations: Array<{ numero: string; data: Omit<Prisma.CheckpointCreateManyInput, 'conteneurId'>; action: string }> = [];
    for (const row of rows) {
      const existing = registry.get(row.numeroConteneur);
      if (isTogoCountry(existing?.paysDestination) || isTogoCountry(row.paysDestination)) throw new Error(`${row.numeroConteneur} : destination Togo confirmée. Relancez l'aperçu pour exclure cette référence.`);
      if (row.numeroBL && existing?.numeroBL && row.numeroBL !== existing.numeroBL) throw new Error(`${row.numeroConteneur} : B/L différent du registre existant`);
      if (existing?.terminalAffecte && existing.terminalAffecte !== row.terminal) throw new Error(`${row.numeroConteneur} : terminal existant incompatible`);
      const empty: Dates = { dateDebarquement: null, dateSortieTerminal: null, dateEntreePia: null, dateSortiePia: null };
      let dates: Dates;
      try { dates = mergeOfficialDates(existing ?? empty, row); } catch (error) { throw new Error(`${row.numeroConteneur} : ${(error as Error).message}`); }
      const statut = dates.dateSortiePia ? 'SORTI_PIA' : dates.dateEntreePia ? 'ENTRE_PIA' : dates.dateSortieTerminal ? 'SORTI_TERMINAL' : dates.dateDebarquement ? 'VU_A_QUAI' : 'ATTENDU_PIA';
      const common = { ...dates, vueAQuaiAt: dates.dateDebarquement, statut: statut as 'SORTI_PIA' | 'ENTRE_PIA' | 'SORTI_TERMINAL' | 'VU_A_QUAI' | 'ATTENDU_PIA',
        ...(row.numeroBL ? { numeroBL: row.numeroBL } : {}),
        ...(row.typeMarchandise && (!existing || existing.typeMarchandise === 'Non renseignée') ? { typeMarchandise: row.typeMarchandise } : {}),
        atp: existing?.atp ?? row.atp, terminalAffecte: row.terminal, paysDestination: existing?.paysDestination ?? row.paysDestination,
        destination: existing?.paysDestination || row.paysDestination || existing?.destination || 'À confirmer' };
      const reference = row.dateReference ?? row.dateDebarquement ?? row.dateSortieTerminal ?? row.dateEntreePia ?? row.dateSortiePia;
      if (!existing && !reference) throw new Error(`${row.numeroConteneur} : date d'acostage ou d'opération requise par le registre actuel`);
      const changed = !existing || Object.entries(common).some(([key, value]) => {
        const before = existing[key as keyof typeof existing];
        return (before instanceof Date ? before.getTime() : before) !== (value instanceof Date ? value.getTime() : value);
      });
      if (!changed) { bilan.inchanges += 1; continue; }
      if (existing) bilan.completes += 1; else bilan.crees += 1;
      if (existing) await tx.conteneur.update({ where: { id: existing.id }, data: { ...common, manifesteId: batch.id } });
      else creations.push({
        ...common, manifesteId: batch.id, numeroConteneur: row.numeroConteneur, numeroBL: row.numeroBL || '', consignataireId: company.id, clientId: actor.id,
        typeMarchandise: row.typeMarchandise || 'Non renseignée', dateArrivee: new Date(reference!), isDemo: false,
      });
      for (const field of fields) {
        if (!dates[field] || existing?.[field]) continue;
        const terminalStep = field === 'dateDebarquement' || field === 'dateSortieTerminal';
        const action = { dateDebarquement: 'VU_A_QUAI', dateSortieTerminal: 'SORTIE_TERMINAL', dateEntreePia: 'ENTREE_PIA', dateSortiePia: 'SORTIE_PIA' }[field];
        const notes = `Import officiel PIA : ${filename}, feuille ${row.sheet}, ligne ${row.line}.`;
        operations.push({ numero: row.numeroConteneur, action, data: { date: dates[field]!,
          type: terminalStep ? row.terminal === 'LCT' ? 'TERMINAL_LCT' : 'TERMINAL_TOGO' : 'PIA',
          statut: action.replaceAll('_', ' '), lieu: terminalStep ? row.terminal! : 'PIA - Port sec', notes } });
        bilan.operationsAjoutees += 1;
      }
    }
    // Bounded bulk writes, all inside the same atomic transaction. Returned order is not assumed.
    const ids = new Map(existingRows.map(row => [row.numeroConteneur, row.id]));
    for (let offset = 0; offset < creations.length; offset += 500) {
      const created = await tx.conteneur.createManyAndReturn({ data: creations.slice(offset, offset + 500), select: { id: true, numeroConteneur: true } });
      for (const row of created) ids.set(row.numeroConteneur, row.id);
    }
    for (let offset = 0; offset < operations.length; offset += 500) {
      const group = operations.slice(offset, offset + 500);
      const checkpoints = await tx.checkpoint.createManyAndReturn({ data: group.map(op => ({ ...op.data, conteneurId: ids.get(op.numero)! })) });
      await tx.mouvement.createMany({ data: checkpoints.map(cp => ({ conteneurId: cp.conteneurId, checkpointId: cp.id,
        userId: actor.id, action: cp.statut.replaceAll(' ', '_'), date: cp.date, details: cp.notes })) });
    }
    await tx.rapport.create({ data: { titre: `Liste officielle PIA — ${filename}`, type: 'IMPORT_OFFICIEL_PIA', generePar: actor.id,
      dateDebut: new Date(), dateFin: new Date(), donnees: { sha256: createHash('sha256').update(buffer).digest('hex'), manifesteId: batch.id, bilan, lignes: preview.lignes } } });
    return { ...batch, bilan };
  }, { isolationLevel: 'Serializable', timeout: 120000 }).catch((error: unknown) => {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : undefined;
    if (code === 'P2028') throw new Error('Le délai d’enregistrement a été dépassé. Le lot a été annulé : aucun conteneur de cet import n’a été enregistré. Réessayez ; si le problème persiste, contactez le support.');
    if (code === 'P2034' || code === 'P2002') throw new Error('Le registre a changé pendant l’import. Le lot a été annulé. Rechargez l’aperçu avant de réessayer.');
    if (code) throw new Error('L’import a échoué dans la base de données. Le lot a été annulé. Contactez le support si le problème persiste.');
    throw error;
  });
}

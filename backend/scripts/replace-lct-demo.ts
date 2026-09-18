import 'dotenv/config';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import ExcelJS from 'exceljs';
import { prisma } from '../src/lib/prisma';
import { previewTransfers } from '../src/services/transfer-preview';
import type { StatutConteneur, TypeCheckpoint } from '../src/generated/prisma/client';

async function main() {
  const path = process.argv[2];
  assert.ok(path, 'Fichier source requis');
  const bytes = await readFile(path);
  const hash = createHash('sha256').update(bytes).digest('hex');
  const preview = await previewTransfers(bytes, 'CONTROLEUR_LCT');
  assert.ok(preview && !preview.apercuLimite, 'Aperçu complet requis');
  const rows = preview.lignes.filter((r) => r.action === 'ANALYSE');
  assert.equal(preview.lignesTotal, 168, 'Le fichier a changé : revérifier le périmètre');
  assert.equal(rows.length, 164);
  assert.equal(preview.exclusionsTogo, 4);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(bytes).buffer);
  const arrivals = new Map<string, Date>();
  for (const s of workbook.worksheets) {
    const text = Array.from({ length: 7 }, (_, n) => s.getRow(n + 1).getCell(1).text).join('\n');
    const match = text.match(/(?:ACOSTAGE\s*:|\bDU)\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (match) arrivals.set(s.name, new Date(Date.UTC(+match[3], +match[2] - 1, +match[1])));
  }
  for (const r of rows) assert.ok(arrivals.has(r.sheet), `Acostage manquant : ${r.sheet}`);
  const actor = await prisma.user.findFirstOrThrow({ where: { role: 'CONTROLEUR_LCT' }, orderBy: { id: 'asc' } });
  const scope = { terminalAffecte: 'LCT' as const, isDemo: true };
  const demo = await prisma.conteneur.findMany({ where: scope, include: { checkpoints: true, mouvements: true } });
  const ids = demo.map((c) => c.id);
  const notifications = await prisma.notification.findMany({ where: { conteneurId: { in: ids } } });
  const collisions = await prisma.conteneur.count({ where: { numeroConteneur: { in: rows.map((r) => r.numeroConteneur) }, NOT: scope } });
  assert.equal(collisions, 0, 'Des références existent hors des données de démonstration LCT');
  const otherBefore = await prisma.conteneur.findMany({ where: { NOT: scope }, orderBy: { id: 'asc' } });
  console.log(JSON.stringify({ mode: process.argv.includes('--apply') ? 'apply' : 'dry-run', hash,
    remove: { containers: ids.length, checkpoints: demo.reduce((n, c) => n + c.checkpoints.length, 0), movements: demo.reduce((n, c) => n + c.mouvements.length, 0), notifications: notifications.length },
    insert: rows.length, excludedTogo: 4, unknownCountries: preview.destinationsAConfirmer,
    statuses: rows.reduce((a, r) => { a[r.statut] = (a[r.statut] || 0) + 1; return a; }, {} as Record<string, number>) }, null, 2));
  if (!process.argv.includes('--apply')) return;
  assert.ok(ids.length, 'Aucune démonstration LCT à remplacer');
  const backupDir = 'backups';
  await mkdir(backupDir, { recursive: true, mode: 0o700 });
  const backupPath = `${backupDir}/lct-before-replacement-${Date.now()}.json`;
  await writeFile(backupPath, JSON.stringify({ hash, source: path, conteneurs: demo, notifications }, null, 2), { flag: 'wx', mode: 0o600 });
  const result = await prisma.$transaction(async (tx) => {
    // Align the verified legacy index with schema.prisma; rolled back on failure.
    await tx.$executeRawUnsafe('DROP INDEX IF EXISTS "public"."Conteneur_numeroBL_key"');
    assert.equal(await tx.conteneur.count({ where: scope }), ids.length, 'Les données ont changé, relancer le contrôle');
    await tx.notification.deleteMany({ where: { conteneurId: { in: ids } } });
    await tx.mouvement.deleteMany({ where: { conteneurId: { in: ids } } });
    await tx.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } });
    const removed = await tx.conteneur.deleteMany({ where: { ...scope, id: { in: ids } } });
    assert.equal(removed.count, ids.length);
    const company = await tx.consignataire.upsert({ where: { code: 'MNF' }, update: {}, create: { code: 'MNF', nom: 'Manifeste non renseigné' } });
    const batch = await tx.manifesteImport.create({ data: { nomFichier: path.split('/').pop()!, source: 'SUIVI_PIA_LCT_HISTORIQUE', lignesTotal: 168, lignesImportees: 164, lignesIgnorees: 4, importeParId: actor.id } });
    const imported = await tx.conteneur.createManyAndReturn({ data: rows.map((r) => ({
      numeroConteneur: r.numeroConteneur, numeroBL: '', atp: r.atp,
      terminalAffecte: 'LCT', consignataireId: company.id, clientId: actor.id,
      destination: r.paysDestination || 'À confirmer', paysDestination: r.paysDestination,
      typeMarchandise: 'Non renseignée', dateArrivee: arrivals.get(r.sheet)!,
      dateDebarquement: r.dateDebarquement, vueAQuaiAt: r.dateDebarquement,
      dateSortieTerminal: r.dateSortieTerminal, dateEntreePia: r.dateEntreePia, dateSortiePia: r.dateSortiePia,
      statut: (r.statut === 'A_CONFIRMER' ? 'ATTENDU_PIA' : r.statut) as StatutConteneur,
      isDemo: false, isDemoAnomaly: false, manifesteId: batch.id,
      updatedAt: new Date(r.dateSortiePia || r.dateEntreePia || r.dateSortieTerminal || r.dateDebarquement || arrivals.get(r.sheet)!),
    })) });
    const importedIds = new Map(imported.map((c) => [c.numeroConteneur, c.id]));
    const checks = rows.flatMap((r) => {
      const steps: Array<[string | null, TypeCheckpoint, string, string]> = [
        [r.dateDebarquement, 'TERMINAL_LCT', 'VU A QUAI', 'LCT'],
        [r.dateSortieTerminal, 'TERMINAL_LCT', 'SORTIE TERMINAL', 'LCT'],
        [r.dateEntreePia, 'PIA', 'ENTREE PIA', 'PIA - Port sec'],
        [r.dateSortiePia, 'PIA', 'SORTIE PIA', 'PIA - Port sec'],
      ];
      return steps.flatMap(([date, type, statut, lieu]) => date ? [{ conteneurId: importedIds.get(r.numeroConteneur)!, type, statut, lieu, date: new Date(date), notes: `Reprise historique PIA — ${r.sheet}, ligne ${r.line}. Navire ${r.navire}, ATP ${r.atp}. Prévision : ${r.previsionTransfert}; déclaration : ${r.declaration}; dépoté : ${r.depote ?? 'non renseigné'}.` }] : []);
    });
    const checkpoints = await tx.checkpoint.createManyAndReturn({ data: checks });
    await tx.mouvement.createMany({ data: checkpoints.map((c) => ({ conteneurId: c.conteneurId, checkpointId: c.id, userId: actor.id, action: c.statut.replaceAll(' ', '_'), date: c.date, details: c.notes })) });
    await tx.rapport.create({ data: { titre: `Reprise du suivi réel LCT — ${hash.slice(0, 12)}`, type: 'REPRISE_HISTORIQUE', dateDebut: new Date('2026-08-01T00:00:00Z'), dateFin: new Date(), generePar: actor.id, donnees: { source: batch.nomFichier, sha256: hash, manifesteId: batch.id, lignes: preview.lignes } } });
    assert.equal(await tx.conteneur.count({ where: { manifesteId: batch.id } }), 164);
    assert.deepEqual(await tx.conteneur.findMany({ where: { id: { in: otherBefore.map((c) => c.id) } }, orderBy: { id: 'asc' } }), otherBefore, 'Modification hors périmètre');
    return { removed: removed.count, imported: imported.length, checkpoints: checkpoints.length, batchId: batch.id };
  }, { timeout: 120000, isolationLevel: 'Serializable' });
  console.log(JSON.stringify({ success: true, ...result, backupPath }));
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());

import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from '../src/lib/prisma';

// Explicitly authorized test completion; never overwrites recorded operations.
const fields = ['dateDebarquement', 'dateSortieTerminal', 'dateEntreePia', 'dateSortiePia'] as const;
const actions = ['VU_A_QUAI', 'SORTIE_TERMINAL', 'ENTREE_PIA', 'SORTIE_PIA'];
const scope = { dateDebarquement: { gte: new Date('2026-07-01T00:00:00Z'), lt: new Date('2026-09-01T00:00:00Z') } };
const include = { checkpoints: true, mouvements: true } as const;
async function main() {
  const now = new Date();
  const rows = await prisma.conteneur.findMany({ where: scope, include, orderBy: { id: 'asc' } });
  const plans = rows.map(row => {
    const dates = fields.map(field => row[field]);
    let last = -Infinity;
    for (const date of dates) if (date) {
      assert(date.getTime() >= last && date <= now, `Dates incohérentes : ${row.id}`);
      last = date.getTime();
    }
    const data: Partial<Record<typeof fields[number], Date>> = {};
    for (let i = 1; i < dates.length; i++) {
      if (dates[i]) continue;
      const previous = dates[i - 1]!.getTime();
      const next = dates.findIndex((date, index) => index > i && date !== null);
      const proposed = previous + [0, 24, 2, 48][i] * 3600000;
      const bound = next < 0 ? now.getTime() : dates[next]!.getTime();
      const timestamp = Math.min(proposed, previous + Math.floor((bound - previous) / (next < 0 ? 2 : next - i + 1)));
      assert(timestamp >= previous && timestamp <= now.getTime());
      dates[i] = new Date(timestamp);
      data[fields[i]] = dates[i]!;
      assert(!row.checkpoints.some(cp => cp.statut.replaceAll(' ', '_') === actions[i]), `Checkpoint existant sans date : ${row.id}`);
    }
    return { row, data };
  }).filter(plan => Object.keys(plan.data).length || plan.row.statut !== 'SORTI_PIA');
  const summary = {
    selected: rows.length,
    july: rows.filter(r => r.dateDebarquement!.getUTCMonth() === 6).length,
    august: rows.filter(r => r.dateDebarquement!.getUTCMonth() === 7).length,
    toComplete: plans.length,
    alreadyComplete: rows.length - plans.length,
    additions: Object.fromEntries(fields.slice(1).map(field => [field, plans.filter(p => p.data[field]).length])),
    unknownCountriesPreserved: plans.filter(p => !p.row.paysDestination).length,
  };
  console.log(JSON.stringify({ mode: 'preview', ...summary }));
  if (!process.argv.includes('--apply') || !plans.length) return;
  assert.equal(rows.length, 88, 'Périmètre modifié : refaire la prévisualisation');
  const actor = await prisma.user.findFirstOrThrow({ where: { id: 35, role: 'ADMIN', isActive: true }, select: { id: true } });
  const ids = rows.map(r => r.id);
  const outside = await prisma.conteneur.findMany({ where: { id: { notIn: ids } }, orderBy: { id: 'asc' } });
  const backupPath = `backups/summer-test-journeys-${now.toISOString().replaceAll(':', '-')}.json`;
  await mkdir('backups', { recursive: true, mode: 0o700 });
  await writeFile(backupPath, JSON.stringify({ savedAt: now, scope, summary, rows, plans: plans.map(p => ({ id: p.row.id, data: p.data })), outside }, null, 2), { flag: 'wx', mode: 0o600 });
  const notes = `SIMULATION / TEST — clôture juillet-août 2026 autorisée par l'utilisateur, exécutée le ${now.toISOString()}. Date générée, non réelle. Sauvegarde : ${backupPath}.`;
  await prisma.$transaction(async tx => {
    assert.deepEqual(await tx.conteneur.findMany({ where: scope, include, orderBy: { id: 'asc' } }), rows, 'Données modifiées depuis la sauvegarde');
    for (const plan of plans) {
      assert(plan.row.terminalAffecte, 'Terminal manquant');
      const result = await tx.conteneur.updateMany({ where: { id: plan.row.id, updatedAt: plan.row.updatedAt }, data: { ...plan.data, statut: 'SORTI_PIA' } });
      assert.equal(result.count, 1);
    }
    const checkpoints = await tx.checkpoint.createManyAndReturn({ data: plans.flatMap(plan => fields.flatMap((field, i) => plan.data[field] ? [{
      conteneurId: plan.row.id, date: plan.data[field]!, type: i === 1 ? plan.row.terminalAffecte === 'LCT' ? 'TERMINAL_LCT' as const : 'TERMINAL_TOGO' as const : 'PIA' as const,
      statut: actions[i].replaceAll('_', ' '), lieu: i === 1 ? plan.row.terminalAffecte! : 'PIA - Port sec', notes,
    }] : [])) });
    await tx.mouvement.createMany({ data: checkpoints.map(cp => ({ conteneurId: cp.conteneurId, checkpointId: cp.id, userId: actor.id, action: cp.statut.replaceAll(' ', '_'), date: cp.date, details: notes })) });
    await tx.rapport.create({ data: { titre: 'Clôture TEST parcours juillet-août 2026', type: 'MAINTENANCE_TEST', generePar: actor.id, dateDebut: scope.dateDebarquement.gte, dateFin: scope.dateDebarquement.lt,
      donnees: { ...summary, backupPath, executedAt: now.toISOString(), containerIds: plans.map(p => p.row.id), generatedCheckpointIds: checkpoints.map(cp => cp.id) } } });
    const after = await tx.conteneur.findMany({ where: scope, orderBy: { id: 'asc' } });
    for (const before of rows) {
      const actual = after.find(r => r.id === before.id)!;
      const { checkpoints: _c, mouvements: _m, ...original } = before;
      const plan = plans.find(p => p.row.id === before.id);
      assert.deepEqual(actual, plan ? { ...original, ...plan.data, statut: 'SORTI_PIA', updatedAt: actual.updatedAt } : original);
      assert(fields.every(field => actual[field]), 'Parcours incomplet');
    }
    assert.deepEqual(await tx.conteneur.findMany({ where: { id: { notIn: ids } }, orderBy: { id: 'asc' } }), outside, 'Modification concurrente hors périmètre, annulation');
  }, { isolationLevel: 'Serializable', timeout: 120000 });
  console.log(JSON.stringify({ mode: 'applied', ...summary, backupPath, existingDatesPreserved: true, outsideUnchanged: true }));
}
main().then(async () => { await prisma.$disconnect(); process.exit(0); }).catch(async error => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connexion masquée]') : 'Échec');
  await prisma.$disconnect(); process.exit(1);
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import { prisma } from '../src/lib/prisma';

// Confirmed one-off scope: 76 untracked rows from historical import 22.
async function main() {
  const apply = process.argv.includes('--apply');
  const scope = {
    terminalAffecte: 'LCT' as const, manifesteId: 22, isDemo: false,
    statut: 'ATTENDU_PIA' as const,
    dateArrivee: new Date('2026-08-01T00:00:00Z'),
    checkpoints: { none: {} }, mouvements: { none: {} },
    dateDebarquement: null, dateSortieTerminal: null, dateEntreePia: null, dateSortiePia: null,
  };
  const result = await prisma.$transaction(async tx => {
    const source = await tx.manifesteImport.findUnique({ where: { id: 22 } });
    assert.equal(source?.source, 'SUIVI_PIA_LCT_HISTORIQUE');
    const rows = await tx.conteneur.findMany({ where: scope, orderBy: { id: 'asc' } });
    assert.equal(rows.length, 76, 'Périmètre modifié : arrêt sans suppression.');
    const ids = rows.map(row => row.id);
    const preserved = await tx.conteneur.findMany({ where: { id: { notIn: ids } }, orderBy: { id: 'asc' } });
    const notificationCount = await tx.notification.count({ where: { conteneurId: { in: ids } } });
    if (!apply) return { mode: 'dry-run', containers: rows.length, notifications: notificationCount, ids };
    const notifications = await tx.notification.deleteMany({ where: { conteneurId: { in: ids } } });
    const removed = await tx.conteneur.deleteMany({ where: { ...scope, id: { in: ids } } });
    assert.equal(removed.count, 76);
    assert.equal(notifications.count, notificationCount);
    assert.equal(await tx.conteneur.count({ where: scope }), 0);
    assert.deepEqual(await tx.conteneur.findMany({ orderBy: { id: 'asc' } }), preserved, 'Modification hors périmètre');
    assert.deepEqual(await tx.manifesteImport.findUnique({ where: { id: 22 } }), source);
    return { mode: 'applied', removed: removed.count, notificationsRemoved: notifications.count, checkpointsRemoved: 0, movementsRemoved: 0, preservedContainers: preserved.length, remainingTargets: 0, ids };
  }, { isolationLevel: 'Serializable', timeout: 120000 });
  console.log(JSON.stringify(result));
}
main().then(async () => { await prisma.$disconnect(); process.exit(0); }).catch(async error => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connexion masquée]') : 'Suppression non confirmée');
  await prisma.$disconnect(); process.exit(1);
});

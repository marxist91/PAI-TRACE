import 'dotenv/config';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { prisma } from '../src/lib/prisma';

// One-off cleanup, bound to the inspected demo dataset and preserved import.
async function main() {
  const apply = process.argv.includes('--apply');
  const scope = { terminalAffecte: 'TOGO' as const, isDemo: true, manifesteId: null };
  const result = await prisma.$transaction(async tx => {
    const demo = await tx.conteneur.findMany({ where: scope, orderBy: { id: 'asc' },
      include: { checkpoints: true, mouvements: true } });
    assert.equal(demo.length, 1640, 'Périmètre démo modifié : refaire le diagnostic.');
    assert.equal(await tx.conteneur.count({ where: { terminalAffecte: 'TOGO', isDemo: true } }), demo.length);
    const ids = demo.map(row => row.id);
    const preserved = await tx.conteneur.findMany({ where: { id: { notIn: ids } }, orderBy: { id: 'asc' } });
    assert.equal(preserved.filter(row => row.terminalAffecte === 'TOGO' && !row.isDemo && row.manifesteId === 25).length, 52);
    assert.equal(preserved.filter(row => row.terminalAffecte === 'LCT').length, 570);
    const notifications = await tx.notification.findMany({ where: { conteneurId: { in: ids } } });
    const counts = { containers: demo.length, checkpoints: demo.reduce((n, row) => n + row.checkpoints.length, 0),
      movements: demo.reduce((n, row) => n + row.mouvements.length, 0), notifications: notifications.length };
    if (!apply) return { mode: 'dry-run', counts };
    await mkdir('backups', { recursive: true, mode: 0o700 });
    const backupPath = `backups/togo-demo-before-cleanup-${Date.now()}.json`;
    await writeFile(backupPath, JSON.stringify({ scope, savedAt: new Date(), conteneurs: demo, notifications }, null, 2), { flag: 'wx', mode: 0o600 });
    assert.equal((await tx.notification.deleteMany({ where: { conteneurId: { in: ids } } })).count, counts.notifications);
    assert.equal((await tx.mouvement.deleteMany({ where: { conteneurId: { in: ids } } })).count, counts.movements);
    assert.equal((await tx.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } })).count, counts.checkpoints);
    assert.equal((await tx.conteneur.deleteMany({ where: { ...scope, id: { in: ids } } })).count, counts.containers);
    assert.deepEqual(await tx.conteneur.findMany({ orderBy: { id: 'asc' } }), preserved, 'Modification hors périmètre');
    return { mode: 'applied', removed: counts, backupPath, preservedTogo: 52, preservedLct: 570 };
  }, { isolationLevel: 'Serializable', timeout: 120000 });
  console.log(JSON.stringify(result));
}
main().then(async () => { await prisma.$disconnect(); process.exit(0); }).catch(async error => {
  console.error(error instanceof Error ? error.message.replace(/postgres(?:ql)?:\/\/\S+/g, '[connexion masquée]') : 'Nettoyage non confirmé');
  await prisma.$disconnect(); process.exit(1);
});

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import ExcelJS from 'exceljs';
import request from 'supertest';
import { readFile } from 'node:fs/promises';

async function main() {
  const target = process.env.TEST_DATABASE_URL;
  assert.ok(target, 'TEST_DATABASE_URL requis : aucune écriture sur la base applicative.');
  const url = new URL(target);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol), 'PostgreSQL requis');
  assert.match(url.pathname, /^\/pia_trace_test(?:_[a-z0-9]+)?$/, 'La base de recette doit se nommer pia_trace_test (ou pia_trace_test_suffixe).');
  assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname), 'Recette réservée à PostgreSQL local ou au service CI local.');
  if (process.env.DATABASE_URL) {
    const app = new URL(process.env.DATABASE_URL);
    const host = (u: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname) ? 'loopback' : u.hostname;
    assert.ok(host(app) !== host(url) || (app.port || '5432') !== (url.port || '5432') || app.pathname !== url.pathname,
      'La base de recette doit être différente de DATABASE_URL.');
  }
  process.env.DATABASE_URL = target;
  const { prisma } = await import('../src/lib/prisma');
  const { importOfficialPia } = await import('../src/services/official-pia-import');
  const run = randomUUID();
  const numbers = Array.from({ length: 408 }, (_, n) => `QATU${String((Date.now() + n) % 10000000).padStart(7, '0')}`);
  let actorId: number | undefined;
  async function file(rows: Array<{ number: string; exit?: string }>) {
    const book = new ExcelJS.Workbook();
    const sheet = book.addWorksheet('LCT');
    sheet.getCell('A1').value = 'MSC RECETTE DU 01/08/2020 : ATP 00001234';
    sheet.getRow(3).values = ['N°', 'TCS EN TRANSIT SAHEL', 'VU A QUAI', 'VU ENLEVE STOCK PAL (Transfert)', 'DESTINATION'];
    rows.forEach((row, i) => { sheet.getRow(i + 4).values = [i + 1, row.number, new Date('2020-08-01T10:00:00Z'), row.exit ? new Date(row.exit) : null, 'Niger']; });
    return Buffer.from(await book.xlsx.writeBuffer());
  }
  try {
    assert.equal(await prisma.conteneur.count({ where: { numeroConteneur: { in: numbers } } }), 0, 'Collision de référence : relancez le test.');
    const actor = await prisma.user.create({ data: { email: `recette-${run}@example.invalid`, password: 'COMPTE_TEST_SANS_CONNEXION', nom: 'Recette', prenom: 'Import', role: 'CONTROLEUR_LCT' } });
    actorId = actor.id;
    const original = await file([{ number: numbers[0], exit: '2020-08-02T10:00:00Z' }]);
    const first = await importOfficialPia(original, `recette-${run}.xlsx`, actor);
    assert.equal(first.bilan.crees, 1);
    const before = await prisma.conteneur.findUniqueOrThrow({ where: { numeroConteneur: numbers[0] } });
    await prisma.conteneur.update({ where: { id: before.id }, data: { numeroBL: 'BL-RECETTE-REEL' } });
    const snapshot = await prisma.conteneur.findUniqueOrThrow({ where: { id: before.id } });
    const checks = await prisma.checkpoint.count({ where: { conteneurId: before.id } });
    const movements = await prisma.mouvement.count({ where: { conteneurId: before.id } });
    const second = await importOfficialPia(original, `copie-${run}.xlsx`, actor);
    assert.equal(second.bilan.inchanges, 1);
    assert.equal(second.bilan.operationsAjoutees, 0);
    assert.deepEqual(await prisma.conteneur.findUnique({ where: { id: before.id } }), snapshot);
    assert.equal(await prisma.checkpoint.count({ where: { conteneurId: before.id } }), checks);
    assert.equal(await prisma.mouvement.count({ where: { conteneurId: before.id } }), movements);
    const batchCount = await prisma.manifesteImport.count({ where: { importeParId: actor.id } });
    const conflict = await file([{ number: numbers[1] }, { number: numbers[0], exit: '2020-08-03T10:00:00Z' }]);
    await assert.rejects(importOfficialPia(conflict, `conflit-${run}.xlsx`, actor), /Conflit/);
    assert.equal(await prisma.conteneur.count({ where: { numeroConteneur: numbers[1] } }), 0);
    assert.equal(await prisma.manifesteImport.count({ where: { importeParId: actor.id } }), batchCount);
    assert.deepEqual(await prisma.conteneur.findUnique({ where: { id: before.id } }), snapshot);
    console.log('OK PostgreSQL : réimport identique, conservation BL/dates/ordre, aucun doublon, annulation du lot en conflit.');
    const { createApp } = await import('../src/app');
    const { generateAccessToken } = await import('../src/middleware/auth');
    const app = createApp();
    const token = generateAccessToken(actor);
    const xml = (flags: string) => Buffer.from(`<Interchanges><MessageSet><Messages><Notification type="DAD" action="CREATE"><liste-apd><apd><voyage-mani atp="ATP-RECETTE"/><navire-mani nom="TEST SYNTHETIQUE"/><principal-mani-lieu manut="LCT"><principal-mani num="BL-XML-TEST" ${flags}><equipement-mani id="${numbers[1]}"/></principal-mani></principal-mani-lieu></apd></liste-apd></Notification></Messages></MessageSet></Interchanges>`);
    const positive = xml('transit="N" pia="Y"');
    const missingDate = await request(app).post('/api/manifestes/import').set('Authorization', `Bearer ${token}`).attach('fichier', positive, 'synthetique.xml');
    assert.equal(missingDate.status, 400);
    const imported = await request(app).post('/api/manifestes/import').set('Authorization', `Bearer ${token}`).field('dateVaq', '2020-08-01T10:00:00Z').attach('fichier', positive, 'synthetique.xml');
    assert.equal(imported.status, 201, JSON.stringify(imported.body));
    const created = await prisma.conteneur.findUniqueOrThrow({ where: { numeroConteneur: numbers[1] } });
    assert.equal(created.statut, 'VU_A_QUAI'); assert.equal(created.numeroBL, 'BL-XML-TEST');
    const repeated = await request(app).post('/api/manifestes/import').set('Authorization', `Bearer ${token}`).field('dateVaq', '2020-08-01T10:00:00Z').attach('fichier', positive, 'synthetique.xml');
    assert.equal(repeated.body.manifeste.bilan.inchanges, 1);
    const countBeforeIgnored = await prisma.manifesteImport.count();
    const containersBeforeIgnored = await prisma.conteneur.count();
    const checkpointsBeforeIgnored = await prisma.checkpoint.count();
    if (process.argv[2]) {
      const real = await request(app).post('/api/manifestes/preview').set('Authorization', `Bearer ${token}`).attach('fichier', await readFile(process.argv[2]), 'exemple.xml');
      assert.equal(real.status, 200);
      assert.equal(real.body.preview.lignesTotal, 1515); assert.equal(real.body.preview.lignesValides, 406);
      console.log('OK exemplaire réel : 1515 conteneurs, 406 candidats pia=Y (aperçu seulement).');
    }
    const ignored = xml('transit="Y" pia="N"');
    const preview = await request(app).post('/api/manifestes/preview').set('Authorization', `Bearer ${token}`).attach('fichier', ignored, 'exemple.xml');
    assert.equal(preview.status, 200); assert.equal(preview.body.preview.lignesValides, 0);
    const ignoredImport = await request(app).post('/api/manifestes/import').set('Authorization', `Bearer ${token}`).attach('fichier', ignored, 'exemple.xml');
    assert.equal(ignoredImport.status, 200); assert.equal(ignoredImport.body.manifeste.lignesImportees, 0);
    assert.equal(await prisma.manifesteImport.count(), countBeforeIgnored);
    assert.equal(await prisma.conteneur.count(), containersBeforeIgnored);
    assert.equal(await prisma.checkpoint.count(), checkpointsBeforeIgnored);
    await prisma.conteneur.update({ where: { id: created.id }, data: { paysDestination: 'Togo' } });
    const excluded = await request(app).post('/api/manifestes/preview').set('Authorization', `Bearer ${token}`).attach('fichier', positive, 'togo-confirme.xml');
    assert.equal(excluded.body.preview.exclusionsTogo, 1); assert.equal(excluded.body.preview.lignesValides, 0);
    const excludedImport = await request(app).post('/api/manifestes/import').set('Authorization', `Bearer ${token}`).attach('fichier', positive, 'togo-confirme.xml');
    assert.equal(excludedImport.body.manifeste.lignesImportees, 0);
    assert.equal(await prisma.manifesteImport.count(), countBeforeIgnored);
    console.log('OK API XML : N/Y accepté, pays inconnu conservé, Togo confirmé exclu même à l’import, pia=N ignoré sans écriture.');
    const bulkFile = await file(numbers.slice(2).map(number => ({ number })));
    const started = Date.now();
    const bulk = await importOfficialPia(bulkFile, `lot-406-${run}.xlsx`, actor);
    assert.equal(bulk.bilan.crees, 406);
    assert.equal(bulk.bilan.operationsAjoutees, 406);
    const bulkContainers = await prisma.conteneur.findMany({ where: { numeroConteneur: { in: numbers.slice(2) } }, select: { id: true } });
    const bulkIds = bulkContainers.map(row => row.id);
    assert.equal(bulkIds.length, 406);
    assert.equal(await prisma.mouvement.count({ where: { conteneurId: { in: bulkIds }, action: 'VU_A_QUAI' } }), 406);
    const bulkAgain = await importOfficialPia(bulkFile, `lot-406-bis-${run}.xlsx`, actor);
    assert.equal(bulkAgain.bilan.inchanges, 406);
    assert.equal(bulkAgain.bilan.operationsAjoutees, 0);
    console.log(`OK lot 406 : création et réimport sans doublon en ${Date.now() - started} ms (base locale).`);
  } finally {
    try {
      if (actorId) {
        const id = actorId;
        await prisma.$transaction(async tx => {
          const own = await tx.conteneur.findMany({ where: { clientId: id, numeroConteneur: { in: numbers } }, select: { id: true } });
          const ids = own.map(row => row.id);
          await tx.mouvement.deleteMany({ where: { userId: id, conteneurId: { in: ids } } });
          await tx.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } });
          await tx.conteneur.deleteMany({ where: { id: { in: ids }, clientId: id } });
          await tx.rapport.deleteMany({ where: { generePar: id, type: 'IMPORT_OFFICIEL_PIA' } });
          await tx.manifesteImport.deleteMany({ where: { importeParId: id } });
          await tx.user.delete({ where: { id } });
        });
        console.log('Données de cette recette supprimées ; référentiel MNF conservé.');
      }
    } finally { await prisma.$disconnect(); }
  }
}
// Le pool pg externe peut garder le processus vivant après Prisma.$disconnect.
// main ne se termine qu'après le nettoyage et la déconnexion dans finally.
main().then(() => process.exit(0)).catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : 'Échec de la recette PostgreSQL : vérifier le schéma, la connexion ou les assertions.');
  process.exit(1);
});

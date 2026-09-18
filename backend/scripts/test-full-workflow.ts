import 'dotenv/config';
import assert from 'node:assert/strict';
import request from 'supertest';
import ExcelJS from 'exceljs';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();
const password = 'password123';
const numeroBL = `RECETTE-PIA-${Date.now()}`;
const numeroConteneur = `TSTU${String(Date.now()).slice(-7)}`;
let conteneurId: number | null = null;
const manifesteIds: number[] = [];

type Session = { accessToken: string; refreshToken: string; user: { role: string } };

async function login(email: string, expectedRole: string): Promise<Session> {
  const response = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  assert.equal(response.body.user.role, expectedRole);
  return response.body as Session;
}

async function readStatus(accessToken: string): Promise<string> {
  assert.ok(conteneurId);
  const response = await request(app)
    .get(`/api/conteneurs/${conteneurId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);
  return response.body.conteneur.statut as string;
}

async function checkpoint(
  accessToken: string,
  type: string,
  statut: string,
  lieu: string,
  expectedStatus: string,
  paysDestination?: string,
) {
  assert.ok(conteneurId);
  await request(app)
    .post(`/api/conteneurs/${conteneurId}/checkpoints`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ type, statut, lieu, date: new Date().toISOString(), notes: '[RECETTE] Parcours automatisé', paysDestination })
    .expect(201);
  assert.equal(await readStatus(accessToken), expectedStatus);
  console.log(`  OK ${lieu}: ${expectedStatus}`);
}

async function cleanup() {
  await prisma.$transaction(async (tx) => {
    if (conteneurId) {
      await tx.notification.deleteMany({ where: { conteneurId } });
      await tx.mouvement.deleteMany({ where: { conteneurId } });
      await tx.checkpoint.deleteMany({ where: { conteneurId } });
      await tx.conteneur.deleteMany({ where: { id: conteneurId } });
    }
    if (manifesteIds.length) await tx.manifesteImport.deleteMany({ where: { id: { in: manifesteIds } } });
  });
  console.log('  OK données temporaires supprimées');
}

async function manifesteBuffer(terminal?: string) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Manifeste');
  sheet.addRow(['NUMERO CONTENEUR', 'BL', 'ATP', 'TERMINAL', 'DATE PREVUE PIA', 'DATE DEBARQUEMENT', 'PAYS DESTINATION', 'MARCHANDISE']);
  sheet.addRow([numeroConteneur, numeroBL, `ATP-${Date.now()}`, terminal ?? '', new Date(), new Date(), 'Burkina Faso', 'Marchandises de recette']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

async function main() {
  console.log('Recette complète Manifeste -> Vue à quai -> Togo Terminal -> entrée PIA -> séjour -> sortie PIA');
  const logisticien = await login('logisticien@pia.tg', 'LOGISTICIEN');
  const terminal = await login('controleur.togo@pia.tg', 'CONTROLEUR_TOGO');
  const terminalOppose = await login('controleur.lct@pia.tg', 'CONTROLEUR_LCT');
  const pia = await login('agent.pia@pia.tg', 'AGENT_PIA');
  const manifestCountBeforePreview = await prisma.manifesteImport.count();
  const preview = await request(app)
    .post('/api/manifestes/preview')
    .set('Authorization', `Bearer ${terminal.accessToken}`)
    .attach('fichier', await manifesteBuffer(), 'recette-apercu-togo.xlsx')
    .expect(200);
  assert.equal(preview.body.preview.lignesTotal, 1);
  assert.equal(preview.body.preview.lignesValides, 1);
  assert.equal(preview.body.preview.creations, 1);
  assert.equal(preview.body.preview.lignes[0].terminal, 'TOGO');
  assert.equal(await prisma.manifesteImport.count(), manifestCountBeforePreview);
  assert.equal(await prisma.conteneur.findUnique({ where: { numeroConteneur } }), null);
  console.log('  OK aperçu validé sans écriture en base');

  const creation = await request(app)
    .post('/api/manifestes/import')
    .set('Authorization', `Bearer ${terminal.accessToken}`)
    .attach('fichier', await manifesteBuffer(), 'recette-togo.xlsx')
    .expect(201);
  manifesteIds.push(creation.body.manifeste.id as number);
  assert.equal(creation.body.manifeste.lignesImportees, 1);
  const importedContainer = await prisma.conteneur.findUniqueOrThrow({ where: { numeroConteneur } });
  conteneurId = importedContainer.id;
  assert.equal(importedContainer.terminalAffecte, 'TOGO');
  console.log(`  OK manifeste Togo Terminal importé et affecté automatiquement: ${numeroBL}`);

  const rejectedImport = await request(app)
    .post('/api/manifestes/import')
    .set('Authorization', `Bearer ${terminalOppose.accessToken}`)
    .attach('fichier', await manifesteBuffer('TOGO'), 'recette-incompatible-lct.xlsx')
    .expect(201);
  manifesteIds.push(rejectedImport.body.manifeste.id as number);
  assert.equal(rejectedImport.body.manifeste.lignesImportees, 0);
  assert.equal(rejectedImport.body.manifeste.lignesIgnorees, 1);
  console.log('  OK une ligne Togo Terminal est refusée dans un manifeste LCT');

  await request(app)
    .get(`/api/conteneurs/${conteneurId}`)
    .set('Authorization', `Bearer ${terminalOppose.accessToken}`)
    .expect(403);
  console.log('  OK accès du terminal LCT opposé refusé');

  await checkpoint(terminal.accessToken, 'TERMINAL_TOGO', 'SORTIE TERMINAL', 'Togo Terminal', 'SORTI_TERMINAL');

  const terminalAfterExit = await request(app)
    .get('/api/conteneurs')
    .set('Authorization', `Bearer ${terminal.accessToken}`)
    .expect(200);
  assert.equal(terminalAfterExit.body.conteneurs[0]?.id, conteneurId);
  assert.ok(terminalAfterExit.body.conteneurs[0]?.dateSortieTerminal);

  const exportResponse = await request(app)
    .get('/api/operations/export.xlsx?liste=sorties-terminal&periode=jour')
    .set('Authorization', `Bearer ${terminal.accessToken}`)
    .buffer(true)
    .parse((response, callback) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => callback(null, Buffer.concat(chunks)));
    })
    .expect('Content-Type', /spreadsheetml/)
    .expect(200);
  assert.ok(Buffer.isBuffer(exportResponse.body));
  const exportedWorkbook = new ExcelJS.Workbook();
  await exportedWorkbook.xlsx.load(new Uint8Array(exportResponse.body).buffer);
  const exportedSheet = exportedWorkbook.getWorksheet('Liste opérationnelle');
  assert.ok(exportedSheet?.getColumn(1).values.includes(numeroConteneur));
  console.log('  OK export Excel terminal généré avec le conteneur validé');

  const piaQueue = await request(app)
    .get('/api/operations/pia')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  assert.equal(piaQueue.body.conteneurs[0]?.id, conteneurId);
  const expectedAtPia = piaQueue.body.conteneurs.find((item: { id: number }) => item.id === conteneurId);
  assert.equal(expectedAtPia?.statut, 'SORTI_TERMINAL');
  assert.ok(piaQueue.body.stats.attendusTogo > 0);

  const piaNotifications = await request(app)
    .get('/api/notifications')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  const handoffNotification = piaNotifications.body.notifications.find((item: { conteneurId: number }) => item.conteneurId === conteneurId);
  assert.match(handoffNotification?.message ?? '', new RegExp(numeroConteneur));
  assert.match(handoffNotification?.message ?? '', /attendu à la PIA/i);

  const piaDashboardQueue = await request(app)
    .get('/api/conteneurs')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  assert.equal(piaDashboardQueue.body.conteneurs[0]?.id, conteneurId);
  console.log('  OK la PIA reçoit la référence et voit le conteneur attendu');

  await checkpoint(pia.accessToken, 'PIA', 'ENTREE PIA', 'PIA - Port sec', 'ENTRE_PIA');
  const piaAfterEntry = await request(app)
    .get('/api/operations/pia')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  const enteredContainer = piaAfterEntry.body.conteneurs.find((item: { id: number }) => item.id === conteneurId);
  assert.ok(enteredContainer?.dateEntreePia);
  assert.equal(enteredContainer?.dateSortiePia, null);
  const piaListAfterEntry = await request(app)
    .get('/api/conteneurs')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  assert.equal(piaListAfterEntry.body.conteneurs[0]?.id, conteneurId);
  assert.ok(piaListAfterEntry.body.conteneurs[0]?.dateEntreePia);
  console.log('  OK le conteneur apparaît dans la vue Entrés à la PIA');

  await checkpoint(pia.accessToken, 'PIA', 'SORTIE PIA', 'PIA - Port sec', 'SORTI_PIA', 'Burkina Faso');
  const piaAfterExit = await request(app)
    .get('/api/operations/pia')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  const exitedContainer = piaAfterExit.body.conteneurs.find((item: { id: number }) => item.id === conteneurId);
  assert.ok(exitedContainer?.dateSortiePia);
  const piaListAfterExit = await request(app)
    .get('/api/conteneurs')
    .set('Authorization', `Bearer ${pia.accessToken}`)
    .expect(200);
  assert.equal(piaListAfterExit.body.conteneurs[0]?.id, conteneurId);
  assert.ok(piaListAfterExit.body.conteneurs[0]?.dateSortiePia);
  console.log('  OK le conteneur apparaît dans la vue Sortis de la PIA');

  const movementCount = await prisma.mouvement.count({ where: { conteneurId } });
  assert.equal(movementCount, 3);
  assert.equal(await readStatus(logisticien.accessToken), 'SORTI_PIA');
  console.log('  OK le centre des opérations voit la sortie PIA');
  console.log('Recette complète réussie');
}

main()
  .catch((error) => {
    console.error('Recette complète échouée', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { resolve } from 'node:path';

async function main() {
  assert.ok(process.env.TEST_DATABASE_URL, 'TEST_DATABASE_URL obligatoire');
  const target = new URL(process.env.TEST_DATABASE_URL);
  assert.ok(['postgres:', 'postgresql:'].includes(target.protocol) && ['localhost', '127.0.0.1'].includes(target.hostname));
  assert.match(target.pathname, /^\/pia_trace_test(?:_[a-z0-9]+)?$/);
  if (process.env.DATABASE_URL) {
    const source = new URL(process.env.DATABASE_URL);
    assert.ok(!(source.hostname === target.hostname && source.port === target.port && source.pathname === target.pathname), 'Base applicative interdite');
  }
  process.env.DATABASE_URL = target.href;
  if (process.env.PREVIEW_OPERATIONAL_VIEWS === '1') process.env.WEB_DIST_DIR = resolve('../web/dist');
  else delete process.env.WEB_DIST_DIR;
  const { prisma } = await import('../src/lib/prisma');
  const { createApp } = await import('../src/app');
  const { createRefreshToken, generateAccessToken, verifyRefreshToken } = await import('../src/middleware/auth');
  const app = createApp();
  const run = randomUUID();
  const users: number[] = [], containers: number[] = [], batches: number[] = [];
  let companyId: number | undefined;
  try {
    const actors = [];
    for (const role of ['CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'] as const) {
      const actor = await prisma.user.create({ data: { email: `${role.toLowerCase()}-${run}@example.invalid`, password: await bcrypt.hash('UiTestOnly-2026!', 10), prenom: 'Recette', nom: role, role } });
      actors.push(actor); users.push(actor.id);
    }
    const company = await prisma.consignataire.create({ data: { nom: 'Recette isolée', code: run } }); companyId = company.id;
    const now = new Date(), today = now.toISOString().slice(0, 10);
    const earlier = new Date(now.getTime() - 3 * 86400_000);
    const batch = await prisma.manifesteImport.create({ data: { nomFichier: 'MANIFESTE-RECETTE.xml', lignesTotal: 5, lignesImportees: 5, importeParId: actors[0]!.id } }); batches.push(batch.id);
    for (const [index, terminal, state] of [[0, 'LCT', 'VU_A_QUAI'], [1, 'LCT', 'VU_A_QUAI'], [2, 'TOGO', 'VU_A_QUAI'], [3, 'LCT', 'ENTRE_PIA'], [4, 'TOGO', 'SORTI_PIA']] as const) {
      const row = await prisma.conteneur.create({ data: { numeroConteneur: `RECETTE-${index}-${run}`, numeroBL: `BL-${index}`, atp: 'ATP-RECETTE', consignataireId: company.id, clientId: actors[0]!.id, destination: 'BURKINA FASO', typeMarchandise: 'Fixture de test uniquement', statut: state, terminalAffecte: terminal, manifesteId: batch.id, createdAt: index === 1 ? now : earlier, dateArrivee: earlier, dateDebarquement: earlier, dateSortieTerminal: index >= 3 ? earlier : null, dateEntreePia: index >= 3 ? earlier : null, dateSortiePia: index === 4 ? new Date(now.getTime() - 60_000) : null } }); containers.push(row.id);
    }
    for (const actor of actors) {
      const token = generateAccessToken(verifyRefreshToken(await createRefreshToken(actor.id)));
      const get = (path: string) => request(app).get(path).set('Authorization', `Bearer ${token}`);
      const list = await get('/api/conteneurs'); assert.equal(list.status, 200);
      assert.ok(list.body.conteneurs.every((r: any) => r.manifeste?.nomFichier === 'MANIFESTE-RECETTE.xml'));
      const stock = await get('/api/operations/stock-actuel'); assert.equal(stock.status, 200);
      assert.equal(stock.body.stock.total, actor.role === 'CONTROLEUR_TOGO' ? 0 : 1);
      assert.ok(stock.body.stock.conteneurs.every((r: any) => r.id === containers[3]));
      const stats = await get(`/api/operations/stats?periode=mois&date=${today}`); assert.equal(stats.status, 200);
      if (actor.role !== 'AGENT_PIA') {
        const own = actor.role === 'CONTROLEUR_LCT' ? 'LCT' : 'TOGO';
        assert.ok(list.body.conteneurs.every((r: any) => r.terminalAffecte === own));
        assert.equal(stats.body.stats.destinesPia, own === 'LCT' ? 3 : 2);
        const forbidden = await get(`/api/operations/stats?terminal=${own === 'LCT' ? 'TOGO' : 'LCT'}`);
        assert.equal(forbidden.body.stats.destinesPia, 0);
      } else assert.equal(stats.body.stats.destinesPia, 5);
      await prisma.refreshToken.deleteMany({ where: { userId: actor.id } });
    }
    if (process.env.PREVIEW_OPERATIONAL_VIEWS !== '1') {
      const piaToken = generateAccessToken(verifyRefreshToken(await createRefreshToken(actors[2]!.id)));
      const body = { type: 'PIA', statut: 'SORTIE PIA', date: new Date().toISOString(), lieu: 'PIA - Port sec', paysDestination: 'BURKINA FASO' };
      const exit = () => request(app).post(`/api/conteneurs/${containers[3]}/checkpoints`).set('Authorization', `Bearer ${piaToken}`).send(body);
      assert.equal((await exit()).status, 201);
      assert.equal((await exit()).status, 409);
      const remaining = await request(app).get('/api/operations/stock-actuel').set('Authorization', `Bearer ${piaToken}`);
      assert.equal(remaining.body.stock.total, 0);
    }
    console.log('OK vues opérationnelles : manifeste associé, stock sans sortis, statistiques PIA, isolation LCT/Togo et filtre forcé sans fuite.');
    if (process.env.PREVIEW_OPERATIONAL_VIEWS === '1') {
      const server = app.listen(4173, '127.0.0.1');
      console.log('PREVIEW http://127.0.0.1:4173 — fixtures uniquement');
      console.log(actors.map(actor => `${actor.role}: ${actor.email}`).join('\n'));
      await new Promise<void>(resolve => { process.once('SIGINT', resolve); process.once('SIGTERM', resolve); });
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  } finally {
    await prisma.notification.deleteMany({ where: { conteneurId: { in: containers } } });
    await prisma.mouvement.deleteMany({ where: { conteneurId: { in: containers } } });
    await prisma.checkpoint.deleteMany({ where: { conteneurId: { in: containers } } });
    await prisma.conteneur.deleteMany({ where: { id: { in: containers } } });
    await prisma.manifesteImport.deleteMany({ where: { id: { in: batches } } });
    await prisma.refreshToken.deleteMany({ where: { userId: { in: users } } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    if (companyId) await prisma.consignataire.delete({ where: { id: companyId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });

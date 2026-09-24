import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import bcrypt from 'bcrypt';

async function main() {
  const target = process.env.TEST_DATABASE_URL;
  assert.ok(target, 'TEST_DATABASE_URL obligatoire');
  const url = new URL(target);
  const local = (u: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  assert.ok(local(url) && ['postgres:', 'postgresql:'].includes(url.protocol));
  assert.match(url.pathname, /^\/pia_trace_test(?:_[a-z0-9]+)?$/);
  if (process.env.DATABASE_URL) {
    const app = new URL(process.env.DATABASE_URL);
    assert.ok(!(local(app) && (app.port || '5432') === (url.port || '5432') && app.pathname === url.pathname), 'Base applicative interdite');
  }
  process.env.DATABASE_URL = target;
  const { prisma } = await import('../src/lib/prisma');
  const { createApp } = await import('../src/app');
  const { generateAccessToken, createRefreshToken, verifyRefreshToken } = await import('../src/middleware/auth');
  const { evaluateAnomaly } = await import('../src/services/anomaly-rules');
  const { rulesSchema } = await import('../src/services/operational-settings');
  const app = createApp();
  const run = randomUUID();
  const ids: number[] = [];
  const email = `agent-${run}@example.invalid`;
  const pass = 'Test123!'; // Exactement huit caractères : borne minimale autorisée.
  const savedSettings = await prisma.operationalSettings.findUnique({ where: { id: 1 } });
  let touchedSettings = false;
  let companyId: number | undefined;
  let containerId: number | undefined;
  try {
    const admin = await prisma.user.create({ data: { email: `admin-${run}@example.invalid`, password: 'INUTILISABLE', nom: 'Test', prenom: 'Admin', role: 'ADMIN' } });
    ids.push(admin.id);
    const token = generateAccessToken(verifyRefreshToken(await createRefreshToken(admin.id)));
    const auth = { Authorization: `Bearer ${token}` };
    const logisticien = await prisma.user.create({ data: { email: `logisticien-${run}@example.invalid`, password: 'INUTILISABLE', nom: 'Test', prenom: 'Logistique', role: 'LOGISTICIEN' } });
    ids.push(logisticien.id);
    const logisticAuth = { Authorization: `Bearer ${generateAccessToken(verifyRefreshToken(await createRefreshToken(logisticien.id)))}` };
    for (const route of ['/api/users', '/api/settings']) {
      assert.equal((await request(app).get(route).set(logisticAuth)).status, 403);
      assert.equal((await request(app).put(`${route}${route.endsWith('users') ? `/${admin.id}` : ''}`).set(logisticAuth).send({})).status, 403);
    }
    assert.equal((await request(app).post('/api/users').set(logisticAuth).send({})).status, 403);
    assert.equal((await request(app).post('/api/auth/register').set(logisticAuth).send({})).status, 403);
    for (const session of [auth, logisticAuth]) assert.equal((await request(app).get('/api/conteneurs').set(session)).status, 200);
    const data = { nom: 'Agent', prenom: 'Test', email, role: 'CONTROLEUR_LCT', telephone: '', isActive: true, password: pass };
    assert.equal((await request(app).post('/api/auth/register').send(data)).status, 401);
    assert.equal((await request(app).post('/api/users').send(data)).status, 401);
    assert.equal((await request(app).post('/api/users').set(auth).send({ ...data, password: 'Test12!' })).status, 400);
    const created = await request(app).post('/api/users').set(auth).send(data);
    assert.equal(created.status, 201, JSON.stringify(created.body));
    let user = created.body.user;
    ids.push(user.id);
    assert.equal(user.password, undefined); assert.equal(user.tokenVersion, undefined);
    assert.ok(await bcrypt.compare(pass, (await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).password));
    assert.equal((await request(app).post('/api/users').set(auth).send({ ...data, email: email.toUpperCase() })).status, 409);
    const login = await request(app).post('/api/auth/login').send({ email, password: pass });
    assert.equal(login.status, 200);
    const agentAuth = { Authorization: `Bearer ${login.body.accessToken}` };
    assert.equal((await request(app).get('/api/users').set(agentAuth)).status, 403);
    assert.equal((await request(app).post('/api/users').set(agentAuth).send(data)).status, 403);
    assert.equal((await request(app).get('/api/settings').set(agentAuth)).status, 403);
    const edit = { ...data, password: undefined, role: 'CONTROLEUR_TOGO', updatedAt: user.updatedAt };
    assert.equal((await request(app).put(`/api/users/${user.id}`).set(agentAuth).send(edit)).status, 403);
    const changed = await request(app).put(`/api/users/${user.id}`).set(auth).send(edit);
    assert.equal(changed.status, 200, JSON.stringify(changed.body)); user = changed.body.user;
    assert.equal(user.role, 'CONTROLEUR_TOGO');
    assert.equal((await request(app).get('/api/auth/me').set(agentAuth)).status, 401);
    assert.equal((await request(app).post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken })).status, 401);
    assert.equal((await request(app).put(`/api/users/${user.id}`).set(auth).send(edit)).status, 409);
    const disabled = await request(app).put(`/api/users/${user.id}`).set(auth).send({ ...edit, updatedAt: user.updatedAt, isActive: false });
    assert.equal(disabled.status, 200); user = disabled.body.user;
    assert.equal((await request(app).post('/api/auth/login').send({ email, password: pass })).status, 401);
    const enabled = await request(app).put(`/api/users/${user.id}`).set(auth).send({ ...edit, updatedAt: user.updatedAt, password: 'Nouveau-test-456!', isActive: true });
    assert.equal(enabled.status, 200);
    assert.equal((await request(app).post('/api/auth/login').send({ email, password: pass })).status, 401);
    const relogin = await request(app).post('/api/auth/login').send({ email, password: 'Nouveau-test-456!' });
    assert.equal(relogin.status, 200);
    agentAuth.Authorization = `Bearer ${relogin.body.accessToken}`;
    const own = { nom: admin.nom, prenom: admin.prenom, email: admin.email, telephone: '', role: 'ADMIN', isActive: false, updatedAt: admin.updatedAt.toISOString() };
    assert.equal((await request(app).put(`/api/users/${admin.id}`).set(auth).send(own)).status, 409);
    assert.equal((await request(app).put(`/api/users/${admin.id}`).set(auth).send({ ...own, isActive: true, role: 'AGENT_PIA' })).status, 409);
    assert.equal((await request(app).put(`/api/users/${admin.id}`).set(auth).send({ ...own, isActive: true, role: 'LOGISTICIEN' })).status, 409);
    console.log('OK comptes : création, hash, doublons, rôles, modification, sessions révoquées, désactivation/réactivation et protection administrateur.');
    const settings = (await request(app).get('/api/settings').set(auth)).body;
    const rules = { ...settings.rules, ENTRE_PIA: { warningAfterHours: 48, criticalAfterHours: 96 } };
    assert.equal((await request(app).put('/api/settings').set(agentAuth).send({ rules, version: settings.version })).status, 403);
    assert.equal((await request(app).put('/api/settings').set(auth).send({ rules: { ...rules, ENTRE_PIA: { warningAfterHours: 96, criticalAfterHours: 48 } }, version: settings.version })).status, 400);
    touchedSettings = true;
    const result = await request(app).put('/api/settings').set(auth).send({ rules, version: settings.version });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    const persisted = (await request(app).get('/api/settings').set(auth)).body;
    assert.deepEqual(persisted.rules, rules);
    assert.equal(evaluateAnomaly('ENTRE_PIA', 50, persisted.rules)?.severity, 'warning');
    assert.equal(evaluateAnomaly('ENTRE_PIA', 50), null);
    assert.equal((await request(app).put('/api/settings').set(auth).send({ rules, version: settings.version })).status, 409);
    console.log('OK paramètres : droits, validation, persistance, effet sur les alertes et refus des écrasements concurrents.');

    const countryUrl = '/api/settings/destination-countries';
    for (const method of ['post', 'patch'] as const) {
      for (const session of [logisticAuth, agentAuth]) assert.equal((await request(app)[method](countryUrl).set(session).send({})).status, 403);
      assert.equal((await request(app)[method](countryUrl).send({})).status, 401);
    }
    assert.equal((await request(app).get(countryUrl).send()).status, 401);
    const added = await request(app).post(countryUrl).set(auth).send({ country: 'Ghana', version: persisted.version });
    assert.equal(added.status, 201, JSON.stringify(added.body));
    assert.equal((await request(app).post(countryUrl).set(auth).send({ country: ' ghana ', version: added.body.version })).status, 409);
    assert.equal((await request(app).post(countryUrl).set(auth).send({ country: 'Togo', version: added.body.version })).status, 400);
    const inactive = await request(app).patch(countryUrl).set(auth).send({ country: 'Ghana', active: false, version: added.body.version });
    assert.equal(inactive.status, 200, JSON.stringify(inactive.body));
    assert.ok(inactive.body.destinationCountries.includes('Ghana'));
    assert.ok(inactive.body.disabledDestinationCountries.includes('Ghana'));
    const listed = await request(app).get(countryUrl).set(logisticAuth);
    assert.equal(listed.status, 200);
    assert.ok(!listed.body.countries.includes('Ghana'));
    assert.equal(listed.body.rules, undefined);
    assert.equal((await request(app).patch(countryUrl).set(auth).send({ country: 'Ghana', active: true, version: added.body.version })).status, 409);

    const company = await prisma.consignataire.create({ data: { nom: `Pays ${run}`, code: run } });
    companyId = company.id;
    const container = await prisma.conteneur.create({ data: {
      numeroConteneur: `TEST-PAYS-${run}`, numeroBL: `TEST-${run}`, consignataireId: company.id, clientId: admin.id,
      destination: 'Ghana', paysDestination: 'Ghana', typeMarchandise: 'Recette', terminalAffecte: 'LCT', statut: 'ENTRE_PIA',
      dateArrivee: new Date('2020-01-01T08:00:00Z'), dateDebarquement: new Date('2020-01-01T08:00:00Z'),
      dateSortieTerminal: new Date('2020-01-01T09:00:00Z'), dateEntreePia: new Date('2020-01-01T10:00:00Z'),
    } });
    containerId = container.id;
    const exitUrl = `/api/conteneurs/${container.id}/checkpoints`;
    const exit = { type: 'PIA', statut: 'SORTIE PIA', date: '2020-01-01T11:00:00Z', lieu: 'PIA recette', paysDestination: 'Ghana' };
    for (const country of ['Ghana', 'Togo', '', 'Pays inconnu']) {
      assert.equal((await request(app).post(exitUrl).set(auth).send({ ...exit, paysDestination: country })).status, 400);
      assert.deepEqual(await prisma.conteneur.findUnique({ where: { id: container.id } }), container);
      assert.equal(await prisma.checkpoint.count({ where: { conteneurId: container.id } }), 0);
      assert.equal(await prisma.mouvement.count({ where: { conteneurId: container.id } }), 0);
      assert.equal(await prisma.notification.count({ where: { conteneurId: container.id } }), 0);
    }
    const active = await request(app).patch(countryUrl).set(auth).send({ country: 'Ghana', active: true, version: inactive.body.version });
    assert.equal(active.status, 200);
    assert.ok((await request(app).get(countryUrl).set(logisticAuth)).body.countries.includes('Ghana'));
    assert.equal((await request(app).post(exitUrl).set(auth).send({ ...exit, paysDestination: ' ghana ' })).status, 201);
    const completed = await prisma.conteneur.findUniqueOrThrow({ where: { id: container.id } });
    assert.equal(completed.statut, 'SORTI_PIA');
    assert.equal(completed.paysDestination, 'Ghana');
    assert.equal((await request(app).patch(countryUrl).set(auth).send({ country: 'Ghana', active: false, version: active.body.version })).status, 200);
    assert.deepEqual(await prisma.conteneur.findUnique({ where: { id: container.id } }), completed);
    console.log('OK destinations : droits, doublons, exclusion Togo, désactivation, refus sans écritures, réactivation et historique préservé.');
  } finally {
    try {
      await prisma.$transaction(async tx => {
        if (containerId) {
          await tx.notification.deleteMany({ where: { conteneurId: containerId } });
          await tx.mouvement.deleteMany({ where: { conteneurId: containerId } });
          await tx.checkpoint.deleteMany({ where: { conteneurId: containerId } });
          await tx.conteneur.delete({ where: { id: containerId } });
        }
        if (companyId) await tx.consignataire.delete({ where: { id: companyId } });
        if (touchedSettings) {
          if (savedSettings) await tx.operationalSettings.update({ where: { id: 1 }, data: { ...savedSettings, rules: rulesSchema.parse(savedSettings.rules) } });
          else await tx.operationalSettings.deleteMany({ where: { id: 1, updatedBy: { in: ids } } });
        }
        await tx.user.deleteMany({ where: { id: { in: ids } } });
      });
      console.log('Comptes de test retirés, réglages de recette restaurés.');
    } finally { await prisma.$disconnect(); }
  }
}
main().then(() => process.exit(0)).catch(error => { console.error(error instanceof assert.AssertionError ? error.message : 'Échec recette administrateur : connexion, schéma ou nettoyage à vérifier.'); process.exit(1); });

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { Role } from '../src/generated/prisma/client';

async function main() {
  const target = process.env.TEST_DATABASE_URL;
  assert.ok(target, 'TEST_DATABASE_URL obligatoire ; aucune écriture sur la base applicative.');
  const url = new URL(target);
  const local = (u: URL) => ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol) && local(url), 'PostgreSQL local requis.');
  assert.match(url.pathname, /^\/pia_trace_test(?:_[a-z0-9]+)?$/);
  if (process.env.DATABASE_URL) {
    const appUrl = new URL(process.env.DATABASE_URL);
    assert.ok(!(local(appUrl) && (appUrl.port || '5432') === (url.port || '5432') && appUrl.pathname === url.pathname), 'Base applicative interdite.');
  }
  process.env.DATABASE_URL = target;
  const { prisma } = await import('../src/lib/prisma');
  const { createApp } = await import('../src/app');
  const { generateAccessToken, createRefreshToken, verifyRefreshToken } = await import('../src/middleware/auth');
  const app = createApp();
  const run = randomUUID();
  const userIds: number[] = [];
  const ids: number[] = [];
  const tokens = new Map<Role, string>();
  let companyId: number | undefined;
  let checks = 0;
  const date = (hour: number) => new Date(Date.UTC(2020, 0, 1, hour)).toISOString();
  const payload = (type: string, statut: string, hour: number) => ({ type, statut, date: date(hour), lieu: 'Recette isolée', paysDestination: 'BURKINA FASO' });
  const send = (id: number, role: Role | null, body: object) => {
    const call = request(app).post(`/api/conteneurs/${id}/checkpoints`);
    return (role ? call.set('Authorization', `Bearer ${tokens.get(role)}`) : call).send(body);
  };
  async function snapshot(id: number) {
    return {
      container: await prisma.conteneur.findUniqueOrThrow({ where: { id } }),
      checkpoints: await prisma.checkpoint.findMany({ where: { conteneurId: id }, orderBy: { id: 'asc' } }),
      movements: await prisma.mouvement.findMany({ where: { conteneurId: id }, orderBy: { id: 'asc' } }),
      notifications: await prisma.notification.findMany({ where: { conteneurId: id }, orderBy: { id: 'asc' } }),
    };
  }
  async function refused(label: string, id: number, role: Role | null, body: object, status: number) {
    const before = await snapshot(id);
    const response = await send(id, role, body);
    assert.equal(response.status, status, `${label}: ${JSON.stringify(response.body)}`);
    assert.ok(response.body.error, `${label}: message explicite obligatoire`);
    assert.deepEqual(await snapshot(id), before, `${label}: refus sans aucune écriture`);
    checks++;
  }
  try {
    for (const role of ['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA', 'CLIENT', 'CONSIGNATAIRE'] as Role[]) {
      const actor = await prisma.user.create({ data: { email: `protection-${run}-${role}@example.invalid`, password: 'INUTILISABLE_TEST', nom: 'Recette', prenom: role, role } });
      userIds.push(actor.id);
      tokens.set(role, generateAccessToken(verifyRefreshToken(await createRefreshToken(actor.id))));
    }
    const company = await prisma.consignataire.create({ data: { nom: `Protection ${run}`, code: run } });
    companyId = company.id;
    for (const terminal of ['LCT', 'TOGO'] as const) {
      const container = await prisma.conteneur.create({ data: {
        numeroConteneur: `TEST-${run}-${terminal}`, numeroBL: `BL-${run}`, clientId: userIds[4], consignataireId: company.id,
        destination: 'BURKINA FASO', paysDestination: 'BURKINA FASO', typeMarchandise: 'Test', dateArrivee: date(8),
        dateDebarquement: date(8), statut: 'VU_A_QUAI', terminalAffecte: terminal,
      } });
      ids.push(container.id);
      const id = container.id;
      const role: Role = terminal === 'LCT' ? 'CONTROLEUR_LCT' : 'CONTROLEUR_TOGO';
      const other: Role = terminal === 'LCT' ? 'CONTROLEUR_TOGO' : 'CONTROLEUR_LCT';
      const exit = payload(`TERMINAL_${terminal}`, 'SORTIE_TERMINAL', 9);
      const entry = payload('PIA', 'ENTREE_PIA', 10);
      const finalExit = payload('PIA', 'SORTIE_PIA', 11);
      await refused('Sans authentification', id, null, exit, 401);
      for (const forbidden of ['CLIENT', 'CONSIGNATAIRE', other] as Role[]) await refused(`Rôle ${forbidden}`, id, forbidden, exit, 403);
      await refused('Terminal ne peut pas valider PIA', id, role, entry, 403);
      await refused('PIA ne peut pas valider terminal', id, 'AGENT_PIA', exit, 403);
      await refused('Administrateur mauvais terminal', id, 'LOGISTICIEN', { ...exit, type: terminal === 'LCT' ? 'TERMINAL_TOGO' : 'TERMINAL_LCT' }, 409);
      await refused('Entrée sans sortie terminal', id, 'AGENT_PIA', entry, 409);
      await refused('Sortie sans entrée PIA', id, 'AGENT_PIA', finalExit, 409);
      await refused('Date invalide', id, role, { ...exit, date: 'date-invalide' }, 400);
      await refused('Date future', id, role, { ...exit, date: new Date(Date.now() + 86400000).toISOString() }, 409);
      await refused('Sortie avant VAQ', id, role, { ...exit, date: date(7) }, 409);

      for (const [body, actor, earlier] of [[exit, role, null], [entry, 'AGENT_PIA', 8], [finalExit, 'AGENT_PIA', 9]] as const) {
        if (earlier !== null) await refused('Date avant étape précédente', id, actor, { ...body, date: date(earlier) }, 409);
        if (body !== exit) await refused('Date future PIA', id, actor, { ...body, date: new Date(Date.now() + 86400000).toISOString() }, 409);
        const before = await snapshot(id);
        // Deux requêtes simultanées : une seule opération et un seul lot de notifications.
        const responses = await Promise.all([send(id, actor, body), send(id, actor, body)]);
        assert.deepEqual(responses.map(r => r.status).sort(), [201, 409]);
        const after = await snapshot(id);
        assert.equal(after.checkpoints.length, before.checkpoints.length + 1);
        assert.equal(after.movements.length, before.movements.length + 1);
        const recipients: Array<{ id: number }> = await prisma.user.findMany({ where: { isActive: true, role: { in: ['ADMIN', 'LOGISTICIEN', 'AGENT_PIA', role] } }, select: { id: true } });
        const added = after.notifications.slice(before.notifications.length);
        assert.deepEqual(added.map(n => n.userId).sort((a,b) => a-b), recipients.map(u => u.id).sort((a,b) => a-b));
        checks++;
        await refused('Double validation successive', id, actor, body, 409);
      }
      const completed = (await snapshot(id)).container;
      assert.equal(completed.statut, 'SORTI_PIA');
      assert.equal(completed.dateSortieTerminal?.toISOString(), date(9));
      assert.equal(completed.dateEntreePia?.toISOString(), date(10));
      assert.equal(completed.dateSortiePia?.toISOString(), date(11));
      console.log(`OK ${terminal} : parcours complet, refus sans écriture et notifications limitées aux bons rôles.`);
    }
    console.log(`OK : ${checks} scénarios de protection API/PostgreSQL.`);
  } finally {
    try {
      await prisma.$transaction(async tx => {
        await tx.notification.deleteMany({ where: { conteneurId: { in: ids } } });
        await tx.mouvement.deleteMany({ where: { conteneurId: { in: ids } } });
        await tx.checkpoint.deleteMany({ where: { conteneurId: { in: ids } } });
        await tx.conteneur.deleteMany({ where: { id: { in: ids } } });
        await tx.user.deleteMany({ where: { id: { in: userIds } } });
        if (companyId) await tx.consignataire.delete({ where: { id: companyId } });
      });
      assert.equal(await prisma.conteneur.count({ where: { id: { in: ids } } }), 0);
      assert.equal(await prisma.user.count({ where: { id: { in: userIds } } }), 0);
      console.log('Nettoyage vérifié : seules les données temporaires de cette recette ont été retirées.');
    } finally { await prisma.$disconnect(); }
  }
}

main().then(() => process.exit(0)).catch(error => {
  console.error(error instanceof assert.AssertionError ? error.message : 'Échec de la recette : vérifier connexion, schéma et nettoyage de la base isolée.');
  process.exit(1);
});

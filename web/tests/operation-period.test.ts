import assert from 'node:assert/strict';
import test from 'node:test';
import { inOperationPeriod, operationRange } from '../src/utils/operation-period';

test('VAQ et sorties de période sont indépendants du statut et de leur date respective', () => {
  const rows = [
    { statut: 'SORTI_PIA', vaq: '2026-09-17T10:00:00Z', sortie: '2026-09-18T10:00:00Z' },
    { statut: 'VU_A_QUAI', vaq: '2026-09-18T09:00:00Z', sortie: null },
    { statut: 'ENTRE_PIA', vaq: '2026-09-18T08:00:00Z', sortie: '2026-09-18T11:00:00Z' },
  ];
  const vaq = rows.filter(row => inOperationPeriod(row.vaq, 'jour', '2026-09-18'));
  const sorties = rows.filter(row => inOperationPeriod(row.sortie, 'jour', '2026-09-18'));
  assert.deepEqual(vaq, [rows[1], rows[2]]);
  assert.deepEqual(sorties, [rows[0], rows[2]]);
});

test('jour UTC : minuit inclus, lendemain exclu, absence et date invalide refusées', () => {
  assert.equal(inOperationPeriod('2026-09-18T00:00:00Z', 'jour', '2026-09-18'), true);
  assert.equal(inOperationPeriod('2026-09-19T00:00:00Z', 'jour', '2026-09-18'), false);
  assert.equal(inOperationPeriod(null, 'jour', '2026-09-18'), false);
  assert.equal(operationRange('jour', '2026-02-30'), null);
});
test('semaine lundi-dimanche au changement d’année', () => {
  const range = operationRange('semaine', '2026-01-01')!;
  assert.equal(range.start.toISOString(), '2025-12-29T00:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-01-05T00:00:00.000Z');
});
test('mois bissextile et mois historique', () => {
  assert.equal(inOperationPeriod('2024-02-29T23:59:59Z', 'mois', '2024-02-01'), true);
  assert.equal(inOperationPeriod('2024-03-01T00:00:00Z', 'mois', '2024-02-01'), false);
  assert.equal(inOperationPeriod('2026-08-15T10:00:00Z', 'mois', '2026-08-01'), true);
});
test('un parcours est compté selon la date propre à chaque opération', () => {
  const row = { exitTerminal: '2026-09-17T23:50:00Z', entry: '2026-09-18T01:00:00Z', exit: '2026-09-19T09:00:00Z' };
  assert.equal(inOperationPeriod(row.exitTerminal, 'jour', '2026-09-18'), false);
  assert.equal(inOperationPeriod(row.entry, 'jour', '2026-09-18'), true);
  assert.equal(inOperationPeriod(row.exit, 'jour', '2026-09-18'), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { isPendingTerminal, terminalQueueAge } from '../src/utils/terminal-queue';

test('file terminal : seules les unités sans sortie ni réception restent à traiter', () => {
  assert.equal(isPendingTerminal({ statut: 'VU_A_QUAI' }), true);
  assert.equal(isPendingTerminal({ statut: 'ATTENDU_PIA' }), true);
  for (const date of ['dateSortieTerminal', 'dateEntreePia', 'dateSortiePia']) assert.equal(isPendingTerminal({ statut: 'VU_A_QUAI', [date]: '2026-09-24T00:00:00Z' }), false);
  assert.equal(isPendingTerminal({ statut: 'SORTI_PIA' }), false);
});

test('ancienneté : frontières UTC, dates inconnues et date de comparaison', () => {
  assert.equal(terminalQueueAge({ createdAt: '2026-09-23T23:59:59Z' }, '2026-09-24'), 'anciens');
  assert.equal(terminalQueueAge({ createdAt: '2026-09-24T00:00:00Z' }, '2026-09-24'), 'nouveaux');
  assert.equal(terminalQueueAge({ createdAt: '2026-09-25T00:00:00Z' }, '2026-09-24'), 'ulterieurs');
  assert.equal(terminalQueueAge({}, '2026-09-24'), 'inconnus');
  assert.equal(terminalQueueAge({ createdAt: 'invalid' }, '2026-09-24'), 'inconnus');
  assert.equal(terminalQueueAge({ createdAt: '2026-09-24T00:00:00Z' }, '2026-02-30'), 'inconnus');
});

test('un ancien réimporté aujourd’hui reste ancien ; le lendemain le nouveau devient ancien', () => {
  const row = { createdAt: '2026-09-20T10:00:00Z', updatedAt: '2026-09-24T10:00:00Z', manifeste: { importedAt: '2026-09-24T10:00:00Z' } };
  assert.equal(terminalQueueAge(row, '2026-09-24'), 'anciens');
  const fresh = { createdAt: '2026-09-24T10:00:00Z' };
  assert.equal(terminalQueueAge(fresh, '2026-09-24'), 'nouveaux');
  assert.equal(terminalQueueAge(fresh, '2026-09-25'), 'anciens');
});

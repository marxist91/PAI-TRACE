import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesContainerStage } from '../src/utils/container-stage';

test('une sortie terminal reste visible après entrée et sortie PIA', () => {
  for (const statut of ['SORTI_TERMINAL', 'ENTRE_PIA', 'SORTI_PIA']) {
    assert.equal(matchesContainerStage({ statut, dateSortieTerminal: '2026-09-18T09:00:00Z' }, 'SORTI_TERMINAL'), true);
  }
});
test('six sorties suivies d’une entrée PIA restent six sorties', () => {
  const rows = Array.from({ length: 6 }, () => ({ statut: 'ENTRE_PIA', dateSortieTerminal: '2026-09-18T09:00:00Z' }));
  assert.equal(rows.filter(row => matchesContainerStage(row, 'SORTI_TERMINAL')).length, 6);
});
test('aucune étape non enregistrée n’est inventée depuis le statut', () => {
  assert.equal(matchesContainerStage({ statut: 'SORTI_PIA', dateSortieTerminal: null }, 'SORTI_TERMINAL'), false);
  assert.equal(matchesContainerStage({ statut: 'VU_A_QUAI' }, 'ENTRE_PIA'), false);
});
test('les autres étapes réalisées restent visibles, les attendus gardent leur statut', () => {
  const completed = { statut: 'SORTI_PIA', dateDebarquement: '2026-09-17', dateEntreePia: '2026-09-18', dateSortiePia: '2026-09-18' };
  for (const stage of ['', 'VU_A_QUAI', 'ENTRE_PIA', 'SORTI_PIA']) assert.equal(matchesContainerStage(completed, stage), true);
  assert.equal(matchesContainerStage(completed, 'ATTENDU_PIA'), false);
  assert.equal(matchesContainerStage({ statut: 'ATTENDU_PIA' }, 'ATTENDU_PIA'), true);
});

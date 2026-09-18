import test from 'node:test';
import assert from 'node:assert/strict';
import { operationError } from './operation-validation';

test('refuse doublon, inversion, étape manquante et date future', () => {
  const date = new Date('2026-08-02T12:00:00Z');
  const empty = { dateDebarquement: null, dateSortieTerminal: null, dateEntreePia: null, dateSortiePia: null };
  assert.equal(operationError(empty, 'SORTI_TERMINAL', date), null);
  assert.match(operationError(empty, 'ENTRE_PIA', date)!, /sortie du terminal/);
  assert.match(operationError({ ...empty, dateSortieTerminal: date }, 'SORTI_TERMINAL', date)!, /déjà enregistrée/);
  assert.match(operationError({ ...empty, dateSortieTerminal: date }, 'ENTRE_PIA', new Date('2026-08-01'))!, /précéder/);
  assert.match(operationError(empty, 'SORTI_PIA', date)!, /entrée PIA/);
  assert.match(operationError(empty, 'SORTI_TERMINAL', new Date('2099-01-01'))!, /déjà réalisée/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { operationScopeFor, parseOperationTerminal } from './operation-terminal';
import { containerScopeFor } from './access-control';

const user = (role: string) => ({ id: 1, email: 'test@example.invalid', role, consignataireId: null });
test('terminal : paramètres explicites et invalides refusés', () => {
  assert.equal(parseOperationTerminal(undefined), 'TOUS');
  for (const value of ['TOUS', 'LCT', 'TOGO']) assert.equal(parseOperationTerminal(value), value);
  for (const value of [null, '', 'AUTRE', ['LCT', 'TOGO'], { terminal: 'LCT' }, 'lct']) assert.throws(() => parseOperationTerminal(value));
});
test('terminal : filtre intersecté avec les droits pour tous les rôles', () => {
  for (const role of ['ADMIN', 'LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA', 'CLIENT', 'CONSIGNATAIRE']) {
    for (const terminal of ['TOUS', 'LCT', 'TOGO']) {
      const selection = operationScopeFor(user(role), terminal);
      assert.deepEqual(selection.where.AND[0], containerScopeFor(user(role)));
      if (terminal !== 'TOUS') assert.deepEqual(selection.where.AND[1], { terminalAffecte: terminal });
    }
  }
  assert.deepEqual(operationScopeFor(user('CONTROLEUR_LCT'), 'TOGO').where.AND, [{ terminalAffecte: 'LCT' }, { terminalAffecte: 'TOGO' }]);
  assert.equal(operationScopeFor(user('CONTROLEUR_TOGO'), 'TOUS').terminal, 'TOGO');
  assert.equal(operationScopeFor(user('ADMIN'), 'TOUS').suffix, '');
  assert.equal(operationScopeFor(user('ADMIN'), 'TOGO').suffix, '-togo');
});

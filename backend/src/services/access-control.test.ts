import assert from 'node:assert/strict';
import test from 'node:test';
import { canAccessContainer, checkpointTypeForRole } from './access-control';

const baseContainer = { clientId: 20, consignataireId: 7, terminalAffecte: 'LCT', statut: 'AU_TERMINAL' };

test('admin et logisticien conservent les opérations des deux terminaux', () => {
  for (const role of ['ADMIN', 'LOGISTICIEN']) for (const terminalAffecte of ['LCT', 'TOGO']) {
    assert.equal(canAccessContainer({ id: 1, email: 'test@example.invalid', role, consignataireId: null }, { ...baseContainer, terminalAffecte }), true);
  }
});

test('les anciens rôles externes ne voient plus les conteneurs', () => {
  assert.equal(canAccessContainer({ id: 2, email: 'c@pia.tg', role: 'CONSIGNATAIRE', consignataireId: 7 }, baseContainer), false);
  assert.equal(canAccessContainer({ id: 20, email: 'x@pia.tg', role: 'CLIENT', consignataireId: null }, baseContainer), false);
});

test('les files LCT et Togo Terminal sont strictement séparées', () => {
  assert.equal(canAccessContainer({ id: 4, email: 'lct@pia.tg', role: 'CONTROLEUR_LCT', consignataireId: null }, baseContainer), true);
  assert.equal(canAccessContainer({ id: 5, email: 'togo@pia.tg', role: 'CONTROLEUR_TOGO', consignataireId: null }, baseContainer), false);
});

test('chaque rôle opérationnel actif est limité à son checkpoint', () => {
  assert.equal(checkpointTypeForRole('CONSIGNATAIRE'), null);
  assert.equal(checkpointTypeForRole('CONTROLEUR_LCT'), 'TERMINAL_LCT');
  assert.equal(checkpointTypeForRole('CONTROLEUR_TOGO'), 'TERMINAL_TOGO');
  assert.equal(checkpointTypeForRole('AGENT_PIA'), 'PIA');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcilePia } from './pia-reconciliation';
import type { ParsedManifestRow } from './manifest-parser';
const row = (numeroConteneur: string | null, patch: Partial<ParsedManifestRow> = {}): ParsedManifestRow => ({
  line: 2, numeroConteneur, numeroBL: 'BL-COMMUN', atp: null, terminalFromFile: 'LCT', terminalAffecte: 'LCT',
  datePrevuePia: null, dateDebarquement: null, paysDestination: null, typeMarchandise: null, consignataireNom: null,
  accepted: true, issues: [], ...patch,
});
test('liste PIA pilote le périmètre sans date prévue ni rapprochement par BL', () => {
  const result = reconcilePia([row('MSKU1234567'), row('MSKU1234568')], [row(' msku1234567 '), row('MSKU9999999')]);
  assert.equal(result.trouves, 1); assert.equal(result.absents, 1); assert.equal(result.horsListeTotal, 1);
  assert.equal(result.lignes[1].statut, 'ABSENT_MANIFESTE');
});
test('doublons des deux sources non sélectionnés automatiquement', () => {
  assert.equal(reconcilePia([row('A')], [row('A'), row('A')]).aVerifier, 1);
  assert.equal(reconcilePia([row('A'), row('A')], [row('A')]).trouves, 0);
});
test('terminal incompatible, référence manquante et ligne exclue à vérifier', () => {
  assert.equal(reconcilePia([row('A')], [row('A', { terminalAffecte: 'TOGO' })]).aVerifier, 1);
  assert.equal(reconcilePia([row(null)], [row(null)]).trouves, 0);
  assert.equal(reconcilePia([row('A')], [row('A', { accepted: false, issues: ['Destination Togo exclue'] })]).aVerifier, 1);
});

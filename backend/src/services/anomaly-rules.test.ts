import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateAnomaly } from './anomaly-rules';

test('ignore les statuts sans règle et les délais sous le seuil', () => {
  assert.equal(evaluateAnomaly('SORTI_PIA', 500), null);
  assert.equal(evaluateAnomaly('ATTENDU_PIA', 23), null);
  assert.equal(evaluateAnomaly('SORTI_TERMINAL', 5), null);
});

test('classe les dépassements en attention puis en critique', () => {
  assert.equal(evaluateAnomaly('ATTENDU_PIA', 24)?.severity, 'warning');
  assert.equal(evaluateAnomaly('ATTENDU_PIA', 48)?.severity, 'critical');
  assert.equal(evaluateAnomaly('VU_A_QUAI', 12)?.severity, 'warning');
  assert.equal(evaluateAnomaly('VU_A_QUAI', 24)?.severity, 'critical');
  assert.equal(evaluateAnomaly('SORTI_TERMINAL', 6)?.severity, 'warning');
  assert.equal(evaluateAnomaly('SORTI_TERMINAL', 12)?.severity, 'critical');
  assert.equal(evaluateAnomaly('ENTRE_PIA', 72)?.severity, 'warning');
  assert.equal(evaluateAnomaly('ENTRE_PIA', 120)?.severity, 'critical');
});

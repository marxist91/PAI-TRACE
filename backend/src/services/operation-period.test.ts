import { test } from 'node:test';
import assert from 'node:assert/strict';
import { periodRange } from './operation-period';

test('journée historique à Lomé, fin exclusive', () => {
  const { start, end } = periodRange('jour', '2026-08-11');
  assert.equal(start.toISOString(), '2026-08-11T00:00:00.000Z');
  assert.equal(end.toISOString(), '2026-08-12T00:00:00.000Z');
});
test('semaine lundi-dimanche traversant une année', () => {
  const { start, end } = periodRange('semaine', '2027-01-03');
  assert.equal(start.toISOString().slice(0, 10), '2026-12-28');
  assert.equal(end.toISOString().slice(0, 10), '2027-01-04');
});
test('mois bissextile et période actuelle par défaut', () => {
  const range = periodRange('mois', '2024-02-29');
  assert.equal(range.start.toISOString().slice(0, 10), '2024-02-01');
  assert.equal(range.end.toISOString().slice(0, 10), '2024-03-01');
  assert.equal(periodRange('jour', undefined, new Date('2026-09-15T12:00:00Z')).start.toISOString().slice(0, 10), '2026-09-15');
});
test('dates impossibles ou paramètres multiples refusés', () => {
  for (const date of ['2026-02-30', '2026-13-01', '', '15/09/2026', ['2026-09-15']]) assert.throws(() => periodRange('jour', date));
});

import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeOfficialDates } from './official-pia-import';
const empty = { dateDebarquement: null, dateSortieTerminal: null, dateEntreePia: null, dateSortiePia: null };
test('réimport identique et cellules vides conservent les dates', () => {
  const existing = { ...empty, dateDebarquement: new Date('2026-08-01T00:00:00Z') };
  assert.deepEqual(mergeOfficialDates(existing, empty), existing);
  assert.deepEqual(mergeOfficialDates(existing, { ...empty, dateDebarquement: '2026-08-01T00:00:00Z' }), existing);
});
test('complète une étape manquante sans exiger de BL ou date prévue', () => {
  const result = mergeOfficialDates(empty, { ...empty, dateSortieTerminal: '2026-08-02T12:00:00Z' });
  assert.equal(result.dateSortieTerminal?.toISOString(), '2026-08-02T12:00:00.000Z');
  assert.equal(result.dateDebarquement, null);
});
test('refuse une date contradictoire ou une inversion après fusion', () => {
  const existing = { ...empty, dateEntreePia: new Date('2026-08-03T00:00:00Z') };
  assert.throws(() => mergeOfficialDates(existing, { ...empty, dateEntreePia: '2026-08-04T00:00:00Z' }), /Conflit/);
  assert.throws(() => mergeOfficialDates(existing, { ...empty, dateSortieTerminal: '2026-08-04T00:00:00Z' }), /Chronologie/);
});
test('refuse une opération future', () => {
  assert.throws(() => mergeOfficialDates(empty, { ...empty, dateDebarquement: '2999-08-01T00:00:00Z' }), /Chronologie/);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { importDateUtc } from '../src/utils/import-date';
const now = new Date('2026-09-16T13:00:00Z');
test('saisie française explicite indépendante du navigateur', () => {
  assert.equal(importDateUtc(' 16/09/2026 12:30 ', now), '2026-09-16T12:30:00.000Z');
  for (const value of ['31/02/2026 12:30', '16/09/2026', '16/09/2026 24:30', '16/09/2026 14:00']) {
    assert.throws(() => importDateUtc(value, now));
  }
});
test('date navigateur avec minutes, secondes ou millisecondes', () => {
  for (const input of ['2026-09-16T12:30', '2026-09-16T12:30:00', '2026-09-16T12:30:00.000']) {
    assert.equal(importDateUtc(input, now), '2026-09-16T12:30:00.000Z');
  }
  assert.equal(importDateUtc('2026-09-16T12:30:42.12', now), '2026-09-16T12:30:42.120Z');
});
test('date incomplète, impossible ou future explique le blocage', () => {
  for (const input of ['', '2026-09-16', '2026-02-30T12:00', '2026-09-16T25:00', '2026-09-16T12:60']) assert.throws(() => importDateUtc(input, now));
  assert.throws(() => importDateUtc('2026-09-16T14:00', now), /futur/);
});

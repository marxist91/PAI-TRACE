import assert from 'node:assert/strict';
import test from 'node:test';
import { operationStatistics } from './operation-statistics';

const start = new Date('2026-09-14T00:00:00Z');
const end = new Date('2026-09-21T00:00:00Z');
const row = (entry: string | null, exit: string | null, terminal = 'LCT') => ({
  terminalAffecte: terminal, datePrevuePia: null, dateDebarquement: null,
  dateSortieTerminal: null, dateEntreePia: entry ? new Date(entry) : null, dateSortiePia: exit ? new Date(exit) : null,
});

test('séjours par terminal : médianes, pondération globale, inconnus et exclusions', () => {
  const exit = '2026-09-15T12:00Z';
  const stay = (hours: number, terminal: string) => row(new Date(new Date(exit).getTime() - hours * 3600000).toISOString(), exit, terminal);
  const result = operationStatistics([
    stay(0, 'LCT'), stay(2, 'LCT'), stay(100, 'LCT'), stay(10, 'TOGO'),
    row(null, exit, 'TOGO'), stay(4, 'AUTRE'),
    row('2026-09-16T00:00Z', exit, 'TOGO'), row(exit, null), row(exit, '2026-09-21T00:00Z'),
  ], start, end, end);
  const lct = result.byTerminal.find(t => t.terminal === 'LCT')!;
  assert.deepEqual([lct.sejoursMesures, lct.sejourMoyenHeures, lct.sejourMedianHeures, lct.sejourMinHeures, lct.sejourMaxHeures], [3, 34, 2, 0, 100]);
  const togo = result.byTerminal.find(t => t.terminal === 'TOGO')!;
  assert.deepEqual([togo.sejoursMesures, togo.sejoursNonMesurables, togo.sejourMedianHeures], [1, 2, 10]);
  assert.equal(result.sejourMedianHeures, 4);
  assert.equal(result.sejourMoyenHeures, 116 / 5);
  for (const key of ['sejoursMesures', 'sejoursNonMesurables', 'sortiesPia'] as const) assert.equal(result.byTerminal.reduce((s, t) => s + t[key], 0), result[key]);
  assert.equal(result.byTerminal.find(t => t.terminal === 'INCONNU')!.sejourMedianHeures, 4);
});

test('séjours par terminal : absence distincte de zéro et médiane paire', () => {
  const result = operationStatistics([row('2026-09-15T10:00Z', '2026-09-15T12:00Z'), row('2026-09-15T08:00Z', '2026-09-15T12:00Z')], start, end, end);
  assert.equal(result.byTerminal[0]!.sejourMedianHeures, 3);
  for (const item of operationStatistics([], start, end, end).byTerminal) {
    assert.equal(item.sejoursMesures, 0);
    for (const field of ['sejourMoyenHeures', 'sejourMedianHeures', 'sejourMinHeures', 'sejourMaxHeures'] as const) assert.equal(item[field], null);
  }
});

test('destinations : normalisation, inconnus, bornes et rapprochement des volumes', () => {
  const result = operationStatistics([
    { ...row('2026-09-13T00:00Z', '2026-09-14T00:00Z'), paysDestination: ' Burkina  Faso ' },
    { ...row('2026-09-15T00:00Z', '2026-09-15T02:00Z'), paysDestination: 'BURKINA FASO' },
    { ...row('2026-09-16T00:00Z', '2026-09-21T00:00Z'), paysDestination: 'Niger' },
    { ...row(null, '2026-09-17T00:00Z'), paysDestination: 'NON' },
    { ...row('2026-09-18T00:00Z', null), paysDestination: null },
    { ...row(null, null), paysDestination: 'MALI' },
  ], start, end, end);
  assert.equal(result.byDestination.length, 3);
  const burkina = result.byDestination.find(r => r.pays === 'BURKINA FASO')!;
  assert.equal(burkina.entreesPia, 1);
  assert.equal(burkina.sortiesPia, 2);
  assert.equal(burkina.sejourMoyenHeures, 13);
  assert.equal(burkina.partSorties, 2 / 3);
  const unknown = result.byDestination.find(r => r.pays === 'À confirmer')!;
  assert.equal(unknown.entreesPia, 1);
  assert.equal(unknown.sejoursNonMesurables, 1);
  assert.equal(unknown.sejourMoyenHeures, null);
  for (const field of ['entreesPia', 'sortiesPia', 'sejoursMesures', 'sejoursNonMesurables'] as const) {
    assert.equal(result.byDestination.reduce((sum, r) => sum + r[field], 0), result[field]);
  }
});

test('destinations : entrée seule, durée zéro, dates inversées et période future', () => {
  const records = [
    { ...row('2026-09-15T00:00Z', null), paysDestination: 'MALI' },
    { ...row('2026-09-15T00:00Z', '2026-09-15T00:00Z'), paysDestination: 'NIGER' },
    { ...row('2026-09-16T00:00Z', '2026-09-15T00:00Z'), paysDestination: 'NON RENSEIGNÉ' },
  ];
  const result = operationStatistics(records, start, end, end);
  assert.equal(result.byDestination.find(r => r.pays === 'NIGER')!.sejourMoyenHeures, 0);
  assert.equal(result.byDestination.find(r => r.pays === 'À confirmer')!.sejoursNonMesurables, 1);
  const entriesOnly = operationStatistics(records.slice(0, 1), start, end, end);
  assert.equal(entriesOnly.byDestination[0]!.partSorties, null);
  assert.equal(entriesOnly.byDestination[0]!.sejourMoyenHeures, null);
  assert.deepEqual(operationStatistics(records, start, end, new Date('2026-09-10Z')).byDestination, []);
});

test('répartition des séjours : bornes exactes, sans double comptage ni arrondi préalable', () => {
  const exit = '2026-09-15T12:00Z';
  const measured = [0, 24, 24 + 1 / 60, 72, 72 + 1 / 60, 168, 168 + 1 / 60].map(hours =>
    row(new Date(new Date(exit).getTime() - hours * 3_600_000).toISOString(), exit));
  const result = operationStatistics([...measured, row(null, exit), row(exit, null)], start, end, end);
  assert.deepEqual(result.sejoursParDuree.map(item => item.nombre), [2, 2, 2, 1]);
  assert.equal(result.sejoursParDuree.reduce((sum, item) => sum + item.nombre, 0), result.sejoursMesures);
  assert.equal(result.sejoursNonMesurables, 1);
  const empty = operationStatistics([], start, end, end);
  assert.deepEqual(empty.sejoursParDuree.map(item => item.nombre), [0, 0, 0, 0]);
});

test('séjours terminés : moyenne, médiane paire/impaire, extrêmes et entrée avant période', () => {
  const exit = '2026-09-15T12:00Z';
  const journey = (hours: number) => row(new Date(new Date(exit).getTime() - hours * 3_600_000).toISOString(), exit);
  const even = operationStatistics([journey(100), journey(0), journey(4), journey(2)], start, end, end);
  assert.equal(even.sejoursMesures, 4);
  assert.equal(even.sejourMoyenHeures, 26.5);
  assert.equal(even.sejourMedianHeures, 3);
  assert.equal(even.sejourMinHeures, 0);
  assert.equal(even.sejourMaxHeures, 100);
  const odd = operationStatistics([journey(100), journey(4), journey(2)], start, end, end);
  assert.equal(odd.sejourMedianHeures, 4);
});

test('séjours : incomplets/inversés non mesurables, séjours en cours et sorties hors période exclus', () => {
  const result = operationStatistics([
    row(null, '2026-09-15T12:00Z'),
    row('2026-09-15T13:00Z', '2026-09-15T12:00Z'),
    row('2026-09-15T10:00Z', null),
    row('2026-09-15T10:00Z', '2026-09-21T00:00Z'),
  ], start, end, end);
  assert.equal(result.sortiesPia, 2);
  assert.equal(result.sejoursNonMesurables, 2);
  assert.equal(result.sejoursMesures, 0);
  for (const key of ['sejourMoyenHeures', 'sejourMedianHeures', 'sejourMinHeures', 'sejourMaxHeures'] as const) assert.equal(result[key], null);
  const boundary = operationStatistics([row('2026-09-13T23:00Z', '2026-09-14T00:00Z')], start, end, end);
  assert.equal(boundary.sejourMedianHeures, 1);
  const future = operationStatistics([row('2026-09-15T10:00Z', '2026-09-20T00:00Z')], start, end, new Date('2026-09-16T00:00Z'));
  assert.equal(future.sejoursMesures, 0);
});

test('stock historique, sortie ultérieure et rapprochement des flux journaliers/terminaux', () => {
  const result = operationStatistics([
    row('2026-09-13T10:00Z', '2026-09-14T00:00Z'),
    row('2026-09-14T00:00Z', '2026-09-21T00:00Z', 'TOGO'),
    row('2026-09-15T09:00Z', '2026-09-15T10:00Z'),
    row('2026-09-13T10:00Z', null),
    row('2026-09-21T00:00Z', null),
  ], start, end, new Date('2026-09-22T00:00Z'));
  assert.equal(result.stockDebut, 2);
  assert.equal(result.stockFin, 2);
  assert.equal(result.entreesPia, 2);
  assert.equal(result.sortiesPia, 2);
  assert.equal(result.ecartStock, 0);
  assert.equal(result.daily.length, 7);
  assert.deepEqual(result.daily[0], { date: '2026-09-14', entrees: 1, sorties: 1, stockDebut: 2, stockFin: 2, ecartStock: 0, arreteAu: '2026-09-15T00:00:00.000Z', partiel: false });
  assert.deepEqual(result.daily[6], { date: '2026-09-20', entrees: 0, sorties: 0, stockDebut: 2, stockFin: 2, ecartStock: 0, arreteAu: '2026-09-21T00:00:00.000Z', partiel: false });
  assert.equal(result.byTerminal.reduce((sum, item) => sum + item.entreesPia, 0), result.entreesPia);
  assert.equal(result.byTerminal.reduce((sum, item) => sum + item.sortiesPia, 0), result.sortiesPia);
});

test('période en cours : aucun jour futur affiché et stock arrêté maintenant', () => {
  const result = operationStatistics([row('2026-09-15T09:00Z', '2026-09-20T09:00Z')], start, end, new Date('2026-09-16T12:00Z'));
  assert.equal(result.periodeEnCours, true);
  assert.equal(result.daily.length, 3);
  assert.equal(result.stockFin, 1);
  assert.equal(result.sortiesPia, 0);
  assert.deepEqual(result.daily.map(day => day.stockFin), [0, 1, 1]);
  assert.equal(result.daily[2]!.partiel, true);
  assert.equal(result.daily[2]!.arreteAu, '2026-09-16T12:00:00.000Z');
  assert.equal(result.daily.at(-1)!.stockFin, result.stockFin);
});

test('stock journalier : minuit exclusif, jours sans flux et bilan non additionnable', () => {
  const result = operationStatistics([
    row('2026-09-13T10:00Z', '2026-09-16T00:00Z'),
    row('2026-09-15T00:00Z', null),
    row('2026-09-16T12:00Z', null),
  ], start, end, new Date('2026-09-16T12:00Z'));
  assert.deepEqual(result.daily.map(d => [d.stockDebut, d.entrees, d.sorties, d.stockFin]), [[1, 0, 0, 1], [1, 1, 0, 2], [2, 0, 1, 1]]);
  assert(result.daily.every(d => d.ecartStock === 0));
  assert.equal(result.daily.at(-1)!.stockFin, result.stockFin);
});

test('stock journalier : écart local visible même si les erreurs se compensent sur la période', () => {
  const result = operationStatistics([row('2026-09-16T09:00Z', '2026-09-15T09:00Z')], start, end, end);
  assert.equal(result.ecartStock, 0);
  assert.deepEqual(result.daily.map(d => d.ecartStock), [0, 1, -1, 0, 0, 0, 0]);
  assert(result.daily.every(d => d.stockFin === 0));
});

test('mois bissextile, vide et période future', () => {
  const result = operationStatistics([], new Date('2024-02-01Z'), new Date('2024-03-01Z'), end);
  assert.equal(result.daily.length, 29);
  assert.equal(result.stockFin, 0);
  assert.equal(result.ecartStock, 0);
  const future = operationStatistics([], end, new Date('2026-10-01Z'), start);
  assert.equal(future.stockFin, null);
  assert.deepEqual(future.daily, []);
});

test('une sortie sans entrée produit un écart explicite, terminal inconnu conservé', () => {
  const result = operationStatistics([row(null, '2026-09-15T10:00Z', 'AUTRE')], start, end, end);
  assert.equal(result.ecartStock, 1);
  assert.equal(result.byTerminal[2]?.sortiesPia, 1);
});

test('transferts : cohorte des entrées, départ antérieur admis et moyenne globale pondérée', () => {
  const transfer = (departure: string, entry: string, terminal: string) => ({ ...row(entry, null, terminal), dateSortieTerminal: new Date(departure) });
  const result = operationStatistics([
    transfer('2026-09-13T23:00Z', '2026-09-14T00:00Z', 'LCT'),
    transfer('2026-09-15T08:00Z', '2026-09-15T11:00Z', 'LCT'),
    transfer('2026-09-15T00:00Z', '2026-09-15T08:00Z', 'TOGO'),
    transfer('2026-09-20T23:00Z', '2026-09-21T00:00Z', 'TOGO'),
  ], start, end, end);
  assert.equal(result.transfertsMesures, 3);
  assert.equal(result.transfertMoyenHeures, 4);
  assert.equal(result.byTerminal[0]!.transfertMoyenHeures, 2);
  assert.equal(result.byTerminal[1]!.transfertMoyenHeures, 8);
  assert.equal(result.transfertsNonMesurables, 0);
});

test('transferts : dates manquantes/inversées exclues, durée nulle valide, futur exclu', () => {
  const entry = '2026-09-15T10:00Z';
  const result = operationStatistics([
    row(entry, null),
    { ...row(entry, null), dateSortieTerminal: new Date('2026-09-15T11:00Z') },
    { ...row(entry, null, 'AUTRE'), dateSortieTerminal: new Date(entry) },
    { ...row('2026-09-20T10:00Z', null), dateSortieTerminal: start },
  ], start, end, new Date('2026-09-16T00:00Z'));
  assert.equal(result.entreesPia, 3);
  assert.equal(result.transfertsMesures, 1);
  assert.equal(result.transfertsNonMesurables, 2);
  assert.equal(result.transfertMoyenHeures, 0);
  assert.equal(result.byTerminal[0]!.transfertMoyenHeures, null);
  assert.equal(result.byTerminal[2]!.transfertsMesures, 1);
  assert.equal(operationStatistics([], start, end, end).transfertMoyenHeures, null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { operationStatistics } from './operation-statistics';
import { buildStatisticsWorkbook } from './statistics-export';

test('synthèse XLSX : stocks historiques, totaux quotidiens et terminaux concordent après relecture', async () => {
  const start = new Date('2026-09-14T00:00Z'), end = new Date('2026-09-21T00:00Z');
  const now = new Date('2026-09-22T10:00Z');
  const base = { datePrevuePia: null, dateDebarquement: null, dateSortieTerminal: null };
  const stats = operationStatistics([
    { ...base, terminalAffecte: 'LCT', dateEntreePia: new Date('2026-09-13T10:00Z'), dateSortiePia: new Date('2026-09-22T09:00Z') },
    { ...base, terminalAffecte: 'TOGO', dateSortieTerminal: new Date('2026-09-15T08:30Z'), dateEntreePia: new Date('2026-09-15T10:00Z'), dateSortiePia: new Date('2026-09-15T12:15Z') },
  ], start, end, now);
  const workbook = buildStatisticsWorkbook(stats, start, end, 'Tous terminaux', now);
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(await workbook.xlsx.writeBuffer());
  assert.deepEqual(copy.worksheets.map(sheet => sheet.name), ['Synthèse', 'Mouvements quotidiens', 'Terminaux', 'Destinations', 'Séjours par terminal']);
  const stays = copy.getWorksheet('Séjours par terminal')!;
  assert.equal(stays.getCell('E6').value, 'Non disponible');
  assert.equal(stays.getCell('C7').value, 1);
  for (const col of ['E', 'F', 'G', 'H']) {
    assert.equal(stays.getCell(`${col}7`).value, 2.25);
    assert.equal(stays.getCell(`${col}8`).value, 2.25);
    assert.equal(stays.getCell(`${col}7`).numFmt, '0.00');
  }
  const destinations = copy.getWorksheet('Destinations')!;
  assert.equal(destinations.getCell('A6').value, 'À confirmer');
  assert.equal(destinations.getCell('B6').value, 1);
  assert.equal(destinations.getCell('C6').value, 1);
  assert.equal(destinations.getCell('D6').value, 1);
  assert.equal(destinations.getCell('D6').numFmt, '0.0%');
  assert.equal(destinations.getCell('G6').value, 2.25);
  const summary = copy.getWorksheet('Synthèse')!;
  assert.equal(summary.getCell('B6').value, 1);
  assert.equal(summary.getCell('B7').value, 1);
  assert.equal(summary.getCell('B8').value, 1);
  assert.equal(summary.getCell('B9').value, 1);
  assert.equal(summary.getCell('B10').value, 0);
  assert.equal(summary.getCell('B12').value, 2.25);
  assert.equal(summary.getCell('B13').value, 0);
  assert.equal(summary.getCell('B15').value, 1.5);
  assert.equal(summary.getCell('B16').value, 1);
  assert.equal(summary.getCell('B17').value, 0);
  assert.equal(summary.getCell('B18').value, 1);
  assert.equal(summary.getCell('B19').value, 0);
  assert.deepEqual([23, 24, 25, 26].map(row => summary.getCell(`B${row}`).value), [1, 0, 0, 0]);
  assert.equal(summary.getCell('A23').value, 'Séjours — Jusqu’à 24 h');
  for (const address of ['B20', 'B21', 'B22']) {
    assert.equal(summary.getCell(address).value, 2.25);
    assert.equal(summary.getCell(address).numFmt, '0.00');
  }
  const daily = copy.getWorksheet('Mouvements quotidiens')!;
  assert.ok(daily.getCell('A6').value instanceof Date);
  assert.equal(daily.getCell('A6').numFmt, 'dd/mm/yyyy');
  assert.equal(daily.getCell('B13').value, 1);
  assert.equal(daily.getCell('C13').value, 1);
  assert.equal(daily.getCell('D6').value, 1);
  assert.equal(daily.getCell('E6').value, 1);
  assert.equal(daily.getCell('F6').value, 0);
  assert(daily.getCell('G6').value instanceof Date);
  assert.equal(daily.getCell('H6').value, 'Terminée');
  assert.equal(daily.getCell('E13').value, 1, 'Le bilan reprend le stock final, pas la somme des stocks');
  const terminals = copy.getWorksheet('Terminaux')!;
  assert.equal(terminals.getCell('A7').value, 'Togo Terminal');
  assert.equal(terminals.getCell('C8').value, 1);
  assert.equal(terminals.getCell('D8').value, 1);
  assert.equal(terminals.getCell('G6').value, 'Non disponible');
  assert.equal(terminals.getCell('E7').value, 1);
  assert.equal(terminals.getCell('G7').value, 1.5);
  assert.equal(terminals.getCell('G8').value, 1.5);
});

test('synthèse future : stocks et moyenne indisponibles, pas de faux jours observés', () => {
  const start = new Date('2026-10-01Z'), end = new Date('2026-11-01Z'), now = new Date('2026-09-21Z');
  const workbook = buildStatisticsWorkbook(operationStatistics([], start, end, now), start, end, 'LCT', now);
  assert.equal(workbook.getWorksheet('Synthèse')!.getCell('B6').value, 'Non disponible');
  assert.equal(workbook.getWorksheet('Synthèse')!.getCell('B12').value, 'Non disponible');
  assert.equal(workbook.getWorksheet('Synthèse')!.getCell('B18').value, 0);
  assert.equal(workbook.getWorksheet('Synthèse')!.getCell('B20').value, 'Non disponible');
  assert.deepEqual([23, 24, 25, 26].map(row => workbook.getWorksheet('Synthèse')!.getCell(`B${row}`).value), [0, 0, 0, 0]);
  assert.equal(workbook.getWorksheet('Mouvements quotidiens')!.rowCount, 6);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { currentPiaStock, filterStock, buildCurrentStockWorkbook, type StockRow } from './current-pia-stock';

const now = new Date('2026-09-22T12:00:00Z');
const rules = { warningAfterHours: 48, criticalAfterHours: 96 };
const row = (id: number, hours: number): StockRow => ({ id, numeroConteneur: `TEST${id}`, numeroBL: 'BL', terminalAffecte: 'LCT', paysDestination: 'Mali', dateEntreePia: new Date(now.getTime() - hours * 3_600_000), dateSortiePia: null });

test('stock actuel : présence par dates, seuils configurés inclusifs, catégories disjointes', () => {
  const result = currentPiaStock([
    row(1, 24), row(2, 48), row(3, 96), row(4, 168), row(5, 169),
    { ...row(6, 100), dateSortiePia: new Date(now.getTime() - 1) },
    row(7, -1), { ...row(8, 100), dateEntreePia: null },
  ], rules, now);
  assert.equal(result.total, 5);
  assert.equal(result.sansAlerte, 1);
  assert.equal(result.alertes, 1);
  assert.equal(result.critiques, 3);
  assert.deepEqual(result.repartition.map(item => item.nombre), [1, 1, 2, 1]);
  assert.deepEqual(result.conteneurs.map(item => item.id), [5, 4, 3, 2, 1]);
  assert.equal(filterStock(result, 'alertes').length, 4);
  assert.equal(filterStock(result, 'critiques').length, 3);
  assert.equal(result.total, result.sansAlerte + result.alertes + result.critiques);
});

test('stock actuel : instant frontière cohérent avec le stock statistique et absence de données', () => {
  const result = currentPiaStock([row(1, 0), { ...row(2, 10), dateSortiePia: now }], rules, now);
  assert.deepEqual(result.conteneurs.map(item => item.id), [2]);
  const empty = currentPiaStock([], rules, now);
  assert.equal(empty.total, 0);
  assert.equal(empty.repartition.reduce((sum, item) => sum + item.nombre, 0), 0);
});

test('export stock : filtre critique, date native et durée au même arrêté après relecture', async () => {
  const stock = currentPiaStock([row(1, 24), row(2, 48), row(3, 96)], rules, now);
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(await buildCurrentStockWorkbook(stock, 'critiques').xlsx.writeBuffer());
  const sheet = copy.getWorksheet('Stock actuel PIA')!;
  assert.equal(sheet.rowCount, 6);
  assert.equal(sheet.getCell('A6').value, 'TEST3');
  assert.ok(sheet.getCell('E6').value instanceof Date);
  assert.equal(sheet.getCell('F6').value, 96);
  assert.equal(sheet.getCell('G6').value, 'Critique');
  assert.match(String(sheet.getCell('A2').value), /hors filtre de période/);
  assert.match(String(sheet.getCell('A3').value), /48 h.*96 h/);
});

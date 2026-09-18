import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildOperationsWorkbook, exportDateFilter } from './operations-export';

test('filtres PIA : opérations de période ou présence, sans date de quai', () => {
  const start = new Date('2026-09-01Z'), end = new Date('2026-10-01Z');
  const range = { gte: start, lt: end };
  assert.deepEqual(exportDateFilter('entrees-pia', start, end), { dateEntreePia: range });
  assert.deepEqual(exportDateFilter('sorties-pia', start, end), { dateSortiePia: range });
  assert.deepEqual(exportDateFilter('flux-pia', start, end), { OR: [{ dateEntreePia: range }, { dateSortiePia: range }] });
  assert.deepEqual(exportDateFilter('sejours-pia', start, end), { AND: [{ dateEntreePia: { lt: end } }, { OR: [{ dateSortiePia: null }, { dateSortiePia: { gte: start } }] }] });
});

test('séjour exporté conserve les minutes en heures décimales', async () => {
  const start = new Date('2026-09-17T13:47:00Z'), end = new Date('2026-09-17T16:02:00Z');
  const wb = await buildOperationsWorkbook({ kind: 'sorties-pia', start, end, periodLabel: 'Septembre', scopeLabel: 'PAL', rows: [{
    numeroConteneur: 'TXGU7123767', numeroBL: 'BL', atp: 'ATP', terminalAffecte: 'TOGO', paysDestination: 'Burkina Faso', destination: 'Burkina Faso',
    typeMarchandise: '', statut: 'SORTI_PIA', datePrevuePia: null, dateDebarquement: null, dateSortieTerminal: null,
    dateEntreePia: start, dateSortiePia: end, updatedAt: end,
  }] });
  const copy = new ExcelJS.Workbook();
  await copy.xlsx.load(await wb.xlsx.writeBuffer());
  const sheet = copy.getWorksheet('Liste opérationnelle')!;
  assert.equal(sheet.getCell('M6').value, 2.25);
  assert.equal(sheet.getCell('M6').numFmt, '0.00');
});

test('l’export opérationnel conserve les dates Excel et le périmètre demandé', async () => {
  const operationDate = new Date('2026-09-11T10:30:00.000Z');
  const workbook = await buildOperationsWorkbook({
    kind: 'sorties-terminal', periodLabel: 'Aujourd’hui', scopeLabel: 'LCT',
    start: new Date('2026-09-11T00:00:00.000Z'), end: new Date('2026-09-12T00:00:00.000Z'),
    rows: [{
      numeroConteneur: 'MSKU1234567', numeroBL: 'BL-001', atp: 'ATP-001', terminalAffecte: 'LCT',
      paysDestination: 'Mali', destination: 'Mali', typeMarchandise: 'Textile', statut: 'SORTI_TERMINAL',
      datePrevuePia: operationDate, dateDebarquement: operationDate, dateSortieTerminal: operationDate,
      dateEntreePia: null, dateSortiePia: null, updatedAt: operationDate,
    }],
  });
  const buffer = await workbook.xlsx.writeBuffer();
  const reloaded = new ExcelJS.Workbook();
  await reloaded.xlsx.load(buffer);
  const sheet = reloaded.getWorksheet('Liste opérationnelle')!;
  assert.match(String(sheet.getCell('A2').value), /LCT/);
  assert.equal(sheet.getCell('A6').value, 'MSKU1234567');
  assert.ok(sheet.getCell('J6').value instanceof Date);
  assert.equal(sheet.getCell('G6').value, 'Sorti du terminal');
  assert.equal(sheet.autoFilter, 'A5:M6');
});

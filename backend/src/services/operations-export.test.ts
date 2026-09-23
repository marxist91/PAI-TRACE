import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildOperationsWorkbook, exportDateFilter } from './operations-export';

test('sorties terminal : dates décroissantes, égalités stables, sans mutation ni effet sur les autres exports', async () => {
  const start = new Date('2026-09-01T00:00:00Z'), end = new Date('2026-10-01T00:00:00Z');
  const base = {
    numeroBL: 'BL', atp: null, terminalAffecte: 'LCT', paysDestination: 'Mali', destination: 'Mali',
    typeMarchandise: '', statut: 'SORTI_PIA', datePrevuePia: null, dateDebarquement: null,
    dateEntreePia: null, dateSortiePia: null, updatedAt: end,
  };
  const rows = [
    { ...base, numeroConteneur: 'OLD', dateSortieTerminal: new Date('2026-09-15T10:27:00Z') },
    { ...base, numeroConteneur: 'B', terminalAffecte: 'TOGO', dateSortieTerminal: new Date('2026-09-22T10:30:00Z'), updatedAt: start },
    { ...base, numeroConteneur: 'MISSING', dateSortieTerminal: null },
    { ...base, numeroConteneur: 'A', dateSortieTerminal: new Date('2026-09-22T10:30:00Z') },
    { ...base, numeroConteneur: 'EARLIER', dateSortieTerminal: new Date('2026-09-22T10:29:00Z') },
  ];
  const original = structuredClone(rows);
  for (const kind of ['sorties-terminal', 'activite'] as const) {
    const workbook = await buildOperationsWorkbook({ kind, start, end, periodLabel: 'Septembre', scopeLabel: 'Tous', rows });
    const reloaded = new ExcelJS.Workbook();
    await reloaded.xlsx.load(await workbook.xlsx.writeBuffer());
    const sheet = reloaded.getWorksheet('Liste opérationnelle')!;
    const actual = Array.from({ length: rows.length }, (_, i) => sheet.getCell(`A${i + 6}`).value);
    assert.deepEqual(actual, kind === 'sorties-terminal' ? ['A', 'B', 'EARLIER', 'OLD', 'MISSING'] : rows.map(row => row.numeroConteneur));
    assert.equal(sheet.rowCount, 10);
    assert.match(String(sheet.getCell('A2').value), /5 conteneurs/);
    if (kind === 'sorties-terminal') assert.deepEqual(sheet.getCell('J6').value, rows[3].dateSortieTerminal);
    assert.deepEqual(rows, original);
  }
});

test('export PIA historique : aucune sortie ultérieure, bornes exclusives et totaux exacts', async () => {
  for (const [start, end] of [
    ['2026-09-14T00:00:00Z', '2026-09-21T00:00:00Z'],
    ['2026-09-01T00:00:00Z', '2026-10-01T00:00:00Z'],
  ]) {
    const first = new Date(start), last = new Date(end);
    const base = {
      numeroConteneur: 'TEST', numeroBL: 'BL', atp: null, terminalAffecte: 'LCT',
      paysDestination: 'Mali', destination: 'Mali', typeMarchandise: '', statut: 'SORTI_PIA',
      datePrevuePia: null, dateDebarquement: null, dateSortieTerminal: null, updatedAt: last,
    };
    const rows = [
      { ...base, dateEntreePia: first, dateSortiePia: last },
      { ...base, dateEntreePia: new Date(first.getTime() - 3600000), dateSortiePia: first },
      { ...base, dateEntreePia: first, dateSortiePia: new Date(first.getTime() + 3600000) },
      { ...base, dateEntreePia: last, dateSortiePia: null },
    ];
    for (const kind of ['flux-pia', 'entrees-pia', 'sorties-pia'] as const) {
      const wb = await buildOperationsWorkbook({ kind, start: first, end: last, periodLabel: 'Test', scopeLabel: 'LCT', rows });
      const copy = new ExcelJS.Workbook();
      await copy.xlsx.load(await wb.xlsx.writeBuffer());
      const sheet = copy.getWorksheet('Liste opérationnelle')!;
      const data = Array.from({ length: sheet.rowCount - 5 }, (_, i) => sheet.getRow(i + 6));
      assert.equal(data.length, kind === 'flux-pia' ? 3 : 2);
      assert.match(String(sheet.getCell('A2').value), kind === 'flux-pia' ? /2 entrées • 2 sorties/ : kind === 'entrees-pia' ? /2 entrées • 0 sorties/ : /0 entrées • 2 sorties/);
      for (const row of data) {
        for (const col of [11, 12]) {
          const date = row.getCell(col).value;
          assert.ok(date === null || (date instanceof Date && date >= first && date < last));
        }
        if (!row.getCell(12).value) assert.equal(row.getCell(13).value, null);
        assert.doesNotMatch(String(row.getCell(7).value), /Sorti de la PIA/);
      }
      if (kind === 'flux-pia') {
        assert.equal(sheet.getCell('L6').value, null);
        assert.equal(sheet.getCell('K7').value, null);
        assert.equal(sheet.getCell('M7').value, 1);
      }
    }
    assert.equal(rows[0].dateSortiePia, last);
  }
});

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
  const wb = await buildOperationsWorkbook({ kind: 'sorties-pia', start, end: new Date(end.getTime() + 1), periodLabel: 'Septembre', scopeLabel: 'PAL', rows: [{
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

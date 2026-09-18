import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { parseManifest } from './manifest-parser';

async function workbookBuffer(rows: unknown[][]) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Manifeste');
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

test('exclut la destination Togo sans exclure les opérations de Togo Terminal vers l’extérieur', async () => {
  const buffer = await workbookBuffer([
    ['CONTENEUR', 'DESTINATION'],
    ['MSKU1234567', ' togo '],
    ['MSKU1234568', 'TG'],
    ['MSKU1234569', 'République togolaise'],
    ['MSKU1234570', 'Burkina Faso'],
    ['MSKU1234571', 'Niger'],
    ['MSKU1234572', ''],
  ]);
  const parsed = await parseManifest(buffer, 'CONTROLEUR_TOGO');
  for (const row of parsed.rows.slice(0, 3)) {
    assert.equal(row.accepted, false);
    assert.match(row.issues.join(' '), /Hors périmètre.*Togo/);
  }
  for (const row of parsed.rows.slice(3, 5)) {
    assert.equal(row.accepted, true);
    assert.equal(row.terminalAffecte, 'TOGO');
  }
  assert.equal(parsed.rows[5].paysDestination, null);
  assert.match(parsed.rows[5].issues.join(' '), /destination à compléter/);
});

test('un agent Togo prévisualise ses lignes sans accepter un terminal LCT ni un doublon', async () => {
  const buffer = await workbookBuffer([
    ['NUMERO CONTENEUR', 'BL', 'ATP', 'TERMINAL', 'DATE PREVUE PIA', 'PAYS DESTINATION', 'MARCHANDISE'],
    ['MSKU 1234567', 'BL-001', 'ATP-001', '', '11/09/2026 14:30', 'Mali', 'Textile'],
    ['TCLU1234568', 'BL-002', 'ATP-002', 'LCT', '11/09/2026', 'Niger', 'Électronique'],
    ['MSKU1234567', 'BL-003', 'ATP-003', 'TOGO', '11/09/2026', 'Togo', 'Divers'],
  ]);

  const parsed = await parseManifest(buffer, 'CONTROLEUR_TOGO');

  assert.equal(parsed.rows.length, 3);
  assert.equal(parsed.rows[0].accepted, true);
  assert.equal(parsed.rows[0].numeroConteneur, 'MSKU1234567');
  assert.equal(parsed.rows[0].terminalAffecte, 'TOGO');
  assert.equal(parsed.rows[1].accepted, false);
  assert.match(parsed.rows[1].issues.join(' '), /incompatible/i);
  assert.equal(parsed.rows[2].accepted, false);
  assert.match(parsed.rows[2].issues.join(' '), /doublon/i);
});

test('un manifeste PAL exige un terminal et refuse une date fournie mais illisible', async () => {
  const buffer = await workbookBuffer([
    ['CONTENEUR', 'CONNAISSEMENT', 'TERMINAL', 'ETA PIA'],
    ['CMAU1234567', 'BL-010', '', '11/09/2026'],
    ['SEGU1234568', 'BL-011', 'LCT', 'date inconnue'],
  ]);

  const parsed = await parseManifest(buffer, 'LOGISTICIEN');

  assert.equal(parsed.rows[0].accepted, false);
  assert.match(parsed.rows[0].issues.join(' '), /terminal/i);
  assert.equal(parsed.rows[1].accepted, false);
  assert.match(parsed.rows[1].issues.join(' '), /date prévue PIA illisible/i);
  assert.ok(parsed.recognizedColumns.includes('numeroConteneur'));
  assert.ok(parsed.recognizedColumns.includes('numeroBL'));
});

test('un même B/L accepte plusieurs numéros de conteneur distincts', async () => {
  const buffer = await workbookBuffer([
    ['CONTENEUR', 'BL', 'TERMINAL'],
    ['MSKU1234567', 'BL-MULTI-001', 'LCT'],
    ['TCLU1234568', 'BL-MULTI-001', 'LCT'],
  ]);

  const parsed = await parseManifest(buffer, 'LOGISTICIEN');

  assert.equal(parsed.rows.length, 2);
  assert.equal(parsed.rows[0].accepted, true);
  assert.equal(parsed.rows[1].accepted, true);
  assert.equal(parsed.rows[0].numeroBL, parsed.rows[1].numeroBL);
  assert.notEqual(parsed.rows[0].numeroConteneur, parsed.rows[1].numeroConteneur);
});

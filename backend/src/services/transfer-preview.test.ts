import assert from 'node:assert/strict';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { previewTransfers } from './transfer-preview';

async function fixture() {
  const w = new ExcelJS.Workbook();
  for (const [name, header] of [['LCT NAVIRE A', 7], ['LCT NAVIRE B', 9]] as const) {
    const s = w.addWorksheet(name);
    s.getCell('A3').value = 'MSC TEST DU 01/08/2026 : ATP 00204411';
    s.getRow(header).values = ['N°', 'TCS EN TRANSIT SAHEL', 'PREVISION DU TRANSFERT', 'DECLARATION', 'VU A QUAI', 'VU ENLEVE STOCK PAL (Transfert)', 'VU ENTREE STOCK (PIA)', 'VU SORTI PIA', 'DESTINATION'];
    s.getRow(header + 1).values = [1, name.endsWith('A') ? 'MSKU1234567' : 'MSKU1234568', 'OUI', 'OUI', new Date('2026-08-01T10:00:00Z'), new Date('2026-08-02T10:00:00Z'), new Date('2026-08-02T12:00:00Z'), 'NON', name.endsWith('A') ? 'Togo' : 'NON'];
    s.getRow(header + 4).values = ['', 'TABLEAU COMPARATIF DU MANIFESTE ET LA LISTE PREVISIONNELLE DE LA PIA'];
  }
  return Buffer.from(await w.xlsx.writeBuffer());
}

test('lit les feuilles décalées, conserve ATP et dates, exclut Togo et ignore les récapitulatifs', async () => {
  const p = await previewTransfers(await fixture(), 'CONTROLEUR_LCT');
  assert.ok(p);
  assert.equal(p.lectureSeule, true);
  assert.equal(p.lignesTotal, 2);
  assert.equal(p.exclusionsTogo, 1);
  assert.equal(p.destinationsAConfirmer, 1);
  assert.equal(p.lignes[1].atp, '00204411');
  assert.equal(p.lignes[1].numeroBL, null);
  assert.equal(p.lignes[1].datePrevuePia, null);
  assert.equal(p.lignes[1].dateEntreePia, '2026-08-02T12:00:00.000Z');
  assert.equal(p.lignes[1].dateSortiePia, null);
  assert.equal(p.lignes[1].statut, 'ENTRE_PIA');
});

test('signale un classeur LCT incompatible avec le poste Togo Terminal', async () => {
  const p = await previewTransfers(await fixture(), 'CONTROLEUR_TOGO');
  assert.equal(p?.lignesValides, 0);
  assert.match(p!.lignes[1].issues.join(' '), /incompatible/);
});

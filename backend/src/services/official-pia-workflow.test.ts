import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import ExcelJS from 'exceljs';
import { importOfficialPia } from './official-pia-import';

// Simule les appels du service, pas le moteur transactionnel PostgreSQL.
function database() {
  type Row = Record<string, any>;
  let state: Record<'containers' | 'checkpoints' | 'movements' | 'batches' | 'reports', Row[]> = {
    containers: [], checkpoints: [], movements: [], batches: [], reports: [],
  };
  let writes = 0;
  const db = { $transaction: async (work: (tx: any) => Promise<unknown>, options: any) => {
    assert.equal(options.isolationLevel, 'Serializable');
    const draft = structuredClone(state);
    const insert = (table: Row[], data: Row) => { const result = { id: table.length + 1, ...data }; table.push(result); return result; };
    const result = await work({
      consignataire: { upsert: async () => ({ id: 1 }) },
      manifesteImport: { create: async ({ data }: Row) => insert(draft.batches, data) },
      rapport: { create: async ({ data }: Row) => insert(draft.reports, data) },
      checkpoint: { createManyAndReturn: async ({ data }: Row) => data.map((row: Row) => insert(draft.checkpoints, row)).reverse() },
      mouvement: { createMany: async ({ data }: Row) => { data.forEach((row: Row) => insert(draft.movements, row)); return { count: data.length }; } },
      conteneur: {
        findMany: async ({ where }: Row) => draft.containers.filter(row => where.numeroConteneur.in.includes(row.numeroConteneur)),
        createManyAndReturn: async ({ data }: Row) => data.map((row: Row) => insert(draft.containers, { updatedAt: new Date('2026-08-10T00:00:00Z'), ...row })).reverse(),
        update: async ({ where, data }: Row) => {
          writes++;
          const index = draft.containers.findIndex(row => row.id === where.id);
          const row = { ...draft.containers[index], ...data, updatedAt: new Date() };
          draft.containers[index] = row; return row;
        },
      },
    });
    state = draft;
    return result;
  } };
  return { db: db as unknown as NonNullable<Parameters<typeof importOfficialPia>[3]>, state: () => state, writes: () => writes };
}
async function workbook(entries: Array<{ number: string; exit?: string; country?: string }>) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet('LCT');
  sheet.getCell('A1').value = 'MSC TEST DU 01/08/2026 : ATP 00204411';
  sheet.getRow(3).values = ['N°', 'TCS EN TRANSIT SAHEL', 'VU A QUAI', 'VU ENLEVE STOCK PAL (Transfert)', 'DESTINATION'];
  entries.forEach((row, i) => { sheet.getRow(4 + i).values = [i + 1, row.number, new Date('2026-08-01T10:00:00Z'), row.exit ? new Date(row.exit) : null, row.country || 'Niger']; });
  return Buffer.from(await book.xlsx.writeBuffer());
}
const actor = { id: 1, role: 'CONTROLEUR_LCT' };
test('import et réimport : aucun doublon ni changement updatedAt ou BL', async () => {
  const store = database();
  const file = await workbook([{ number: 'MSKU1234567' }]);
  const first = await importOfficialPia(file, 'officiel.xlsx', actor, store.db);
  assert.deepEqual(first.bilan, { crees: 1, completes: 0, inchanges: 0, operationsAjoutees: 1 });
  store.state().containers[0].numeroBL = 'BL-REEL';
  const before = structuredClone(store.state().containers);
  const again = await importOfficialPia(file, 'copie.xlsx', actor, store.db);
  assert.deepEqual(again.bilan, { crees: 0, completes: 0, inchanges: 1, operationsAjoutees: 0 });
  assert.deepEqual(store.state().containers, before);
  assert.equal(store.writes(), 0);
  assert.equal(store.state().checkpoints.length, 1);
  assert.equal(store.state().movements.length, 1);
});
test('complète une sortie une fois et conserve les conteneurs absents du nouveau fichier', async () => {
  const store = database();
  await importOfficialPia(await workbook([{ number: 'MSKU1234567' }, { number: 'MSKU1234568' }]), 'a.xlsx', actor, store.db);
  const file = await workbook([{ number: 'MSKU1234567', exit: '2026-08-02T10:00:00Z' }]);
  const result = await importOfficialPia(file, 'b.xlsx', actor, store.db);
  assert.equal(result.bilan.completes, 1); assert.equal(result.bilan.operationsAjoutees, 1);
  await importOfficialPia(file, 'b.xlsx', actor, store.db);
  assert.equal(store.state().containers.length, 2); assert.equal(store.state().checkpoints.length, 3);
});
test('conflit tardif : le service échoue et la transaction simulée ne publie pas les écritures', async () => {
  const store = database();
  await importOfficialPia(await workbook([{ number: 'MSKU1234567', exit: '2026-08-02T10:00:00Z' }]), 'a.xlsx', actor, store.db);
  const before = structuredClone(store.state());
  await assert.rejects(importOfficialPia(await workbook([{ number: 'MSKU1234568' }, { number: 'MSKU1234567', exit: '2026-08-03T10:00:00Z' }]), 'b.xlsx', actor, store.db), /Conflit/);
  assert.deepEqual(store.state(), before);
});
test('isolation du terminal et exclusion de la destination Togo', async () => {
  const store = database();
  const file = await workbook([{ number: 'MSKU1234567', country: 'Togo' }, { number: 'MSKU1234568' }]);
  await assert.rejects(importOfficialPia(file, 'a.xlsx', { id: 2, role: 'CONTROLEUR_TOGO' }, store.db), /Aucune ligne valide/);
  const result = await importOfficialPia(file, 'a.xlsx', actor, store.db);
  assert.equal(result.lignesIgnorees, 1); assert.equal(store.state().containers.length, 1);
});

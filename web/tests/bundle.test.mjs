import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const dist = new URL('../dist/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('.vite/manifest.json', dist), 'utf8'));
const entryKey = Object.keys(manifest).find(key => manifest[key].isEntry);
const initial = new Set();
function visit(key) {
  if (initial.has(key)) return;
  initial.add(key);
  for (const child of manifest[key].imports ?? []) visit(child);
}
visit(entryKey);

test('le JavaScript initial reste sous 400 Ko, dépendances statiques incluses', () => {
  const bytes = [...initial].reduce((sum, key) => sum + statSync(new URL(manifest[key].file, dist)).size, 0);
  assert.ok(bytes < 400_000, `JavaScript initial : ${bytes} octets`);
});

test('les pages métier et la navigation ne sont pas chargées sur la connexion', () => {
  const pages = ['ConteneursPage', 'ConteneurDetailPage', 'ConteneurFormPage', 'CheckpointsPage', 'RapportsPage', 'MouvementsPage', 'AnomaliesPage', 'UtilisateursPage', 'ParametresPage', 'OperationalDashboardPage', 'PilotagePage', 'ManifestesPage', 'QuaiPage', 'PiaOperationsPage'];
  for (const key of [...pages.map(page => `src/pages/${page}.tsx`), 'src/components/Layout.tsx']) {
    assert.equal(manifest[key]?.isDynamicEntry, true, key);
    assert.equal(initial.has(key), false, key);
  }
});

test('aucun bloc JavaScript ne dépasse 500 Ko', () => {
  for (const { file } of Object.values(manifest)) {
    if (file.endsWith('.js')) assert.ok(statSync(new URL(file, dist)).size < 500_000, file);
  }
});

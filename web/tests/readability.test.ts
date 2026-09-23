import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('la couche de lisibilité est chargée après les anciens styles', () => {
  const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
  assert.ok(main.indexOf("import './readability.css'") > main.indexOf("import './index.css'"));
  const css = readFileSync(new URL('../src/readability.css', import.meta.url), 'utf8');
  assert.match(css, /\.ops-table td\s*\{[^}]*font-size: 15px/);
  assert.match(css, /\.login-command-card \.ops-input\s*\{[^}]*font-size: 16px/);
  assert.doesNotMatch(css, /\bzoom\s*:/);
});

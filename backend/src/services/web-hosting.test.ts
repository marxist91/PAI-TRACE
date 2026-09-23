import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import express from 'express';
import request from 'supertest';
import { mountWeb } from './web-hosting';

test('hébergement : React rechargeable, assets servis, API inconnue et secrets non exposés', async () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'pia-web-test-'));
  try {
    writeFileSync(path.join(directory, 'index.html'), '<html>PIA TEST</html>');
    writeFileSync(path.join(directory, 'app.js'), '/* asset */');
    writeFileSync(path.join(directory, '.env'), 'NE_PAS_EXPOSER');
    const app = express();
    app.get('/api/health', (_req, res) => res.json({ status: 'OK' }));
    mountWeb(app, directory);
    for (const route of ['/', '/conteneurs/123', '/parametres']) {
      const response = await request(app).get(route).set('Accept', 'text/html').expect(200);
      assert.match(response.text, /PIA TEST/);
      assert.equal(response.headers['cache-control'], 'no-cache');
    }
    await request(app).get('/app.js').expect(200);
    await request(app).get('/api/health').expect(200, { status: 'OK' });
    for (const route of ['/api/inconnue', '/socket.io/inconnue', '/absent.js', '/.env']) {
      await request(app).get(route).set('Accept', 'text/html').expect(404);
    }
    assert.throws(() => mountWeb(express(), path.join(directory, 'absent')));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

test('GET /api/health confirme que le service répond', async () => {
  const response = await request(app).get('/api/health').expect(200);
  assert.equal(response.body.status, 'OK');
  assert.equal(Number.isNaN(Date.parse(response.body.timestamp)), false);
});

test('GET /api/notifications refuse une requête sans session', async () => {
  const response = await request(app).get('/api/notifications').expect(401);
  assert.equal(response.body.error, 'Token manquant');
});

test('GET /api/notifications refuse un jeton invalide', async () => {
  const response = await request(app)
    .get('/api/notifications')
    .set('Authorization', 'Bearer jeton-invalide')
    .expect(401);
  assert.equal(response.body.error, 'Token invalide ou expiré');
});

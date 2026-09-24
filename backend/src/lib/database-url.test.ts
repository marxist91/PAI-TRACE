import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';
import { normalizeDatabaseSsl } from './database-url';

for (const mode of ['prefer', 'require', 'verify-ca']) {
  test(`SSL ${mode} devient verify-full sans modifier les identifiants et options`, () => {
    const original = new URL(`postgresql://user:p%40ss%2Fword@db.example:5432/pia?sslmode=${mode}&schema=public&application_name=PIA%20TRACE&connect_timeout=10`);
    const result = new URL(normalizeDatabaseSsl(original.href));
    assert.equal(result.searchParams.get('sslmode'), 'verify-full');
    result.searchParams.set('sslmode', mode);
    assert.equal(result.origin, original.origin);
    assert.equal(result.username, original.username);
    assert.equal(result.password, original.password);
    assert.equal(result.pathname, original.pathname);
    assert.deepEqual([...result.searchParams], [...original.searchParams]);
  });
}

test('les connexions locales et les choix SSL explicites restent inchangés', () => {
  for (const value of [
    'postgresql://user:pass@localhost:5432/test',
    'postgresql://user:pass@localhost/test?sslmode=disable',
    'postgresql://user:pass@db.example/test?sslmode=verify-full',
    'postgresql://user:pass@db.example/test?sslmode=require&uselibpqcompat=true',
    'postgresql://user:pass@db.example/test?sslmode=no-verify',
    '/var/run/postgresql',
    'not a URL',
  ]) assert.equal(normalizeDatabaseSsl(value), value);
});

test('pg conserve TLS avec validation des certificats, sans ouvrir de connexion', () => {
  const client = new pg.Client({ connectionString: normalizeDatabaseSsl('postgresql://user:pass@db.example/test?sslmode=require') });
  // pg's empty TLS options use Node's secure defaults (certificate + hostname).
  assert.deepEqual(client.ssl, {});
});

test('les chemins de certificats et les caractères encodés sont conservés', () => {
  const result = new URL(normalizeDatabaseSsl('postgres://u:p%23%25@db.example/db?sslmode=require&sslrootcert=%2Fcerts%2Froot.pem&sslcert=%2Fcerts%2Fclient.pem&sslkey=%2Fcerts%2Fclient.key'));
  assert.equal(result.password, 'p%23%25');
  assert.equal(result.searchParams.get('sslrootcert'), '/certs/root.pem');
  assert.equal(result.searchParams.get('sslcert'), '/certs/client.pem');
  assert.equal(result.searchParams.get('sslkey'), '/certs/client.key');
});

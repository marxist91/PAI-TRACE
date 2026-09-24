import 'dotenv/config';
import pg from 'pg';
import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, open, rename, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Only writes to a NEW local Docker container; no restore URL is accepted.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const runId = randomUUID();
const container = `pia-restore-${runId}`;
const image = 'postgres:17-alpine';
const directory = resolve(root, 'backups', `${new Date().toISOString().replace(/[:.]/g, '-')}-${runId.slice(0, 8)}`);
const archive = resolve(directory, 'database.dump');
let client;
let started = false;
let stage = 'préparation';

function docker(args, { env = process.env, input, output } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn('docker', args, { env, stdio: [input ?? 'ignore', output ?? 'pipe', 'pipe'] });
    const chunks = [];
    let diagnostic = '';
    child.stdout?.on('data', chunk => chunks.push(chunk));
    // Errors may include sensitive values. Do not send raw stderr to the console.
    child.stderr.on('data', chunk => { diagnostic = (diagnostic + chunk.toString()).slice(-8000); });
    child.on('error', () => reject(new Error('Docker indisponible')));
    child.on('close', code => {
      const category = ['certificate', 'snapshot', 'permission denied', 'no password', 'connection', 'version mismatch', 'already exists'].find(text => diagnostic.toLowerCase().includes(text));
      if (code === 0) accept(Buffer.concat(chunks).toString().trim());
      else reject(Object.assign(new Error('Échec outil PostgreSQL'), { code: `DOCKER_${code}_${category ?? 'UNKNOWN'}` }));
    });
  });
}

const quote = value => `"${value.replaceAll('"', '""')}"`;
const tableList = "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename";
function fingerprint(table) {
  // UTC + stable row JSON, independent of physical row order. Includes duplicates.
  return `SELECT json_build_object('rows',count(*)::text,'digest',md5(coalesce(string_agg(h,'' ORDER BY h),'')))::text AS result FROM (SELECT md5(row_to_json(t)::text) AS h FROM public.${quote(table)} t) hashes`;
}
async function localSql(sql) {
  return docker(['exec', container, 'psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-U', 'postgres', '-d', 'pia_restore_test', '-c', `SET timezone='UTC'; ${sql}`]);
}

async function main() {
  if (process.argv.length > 2) throw new Error('Ce script ne prend aucune cible de restauration.');
  const raw = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL ou DIRECT_DATABASE_URL obligatoire');
  const url = new URL(raw);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username) throw new Error('Connexion PostgreSQL directe requise');
  if (url.hostname.includes('pooled') || url.hostname.includes('pooler')) throw new Error('Définir DIRECT_DATABASE_URL avec la connexion directe avant la sauvegarde');
  // Prisma direct TCP with system CA verification. Do not silently ignore custom TLS options.
  for (const key of url.searchParams.keys()) {
    if (!['sslmode', 'schema', 'connect_timeout'].includes(key)) throw new Error('Option de connexion non prise en charge : vérifier la configuration TLS');
  }
  if (url.searchParams.get('schema') && url.searchParams.get('schema') !== 'public') throw new Error('Seul le schéma applicatif public est pris en charge');
  url.searchParams.set('sslmode', 'verify-full');
  await docker(['image', 'inspect', image, '--format', '{{.Id}}']);
  client = new pg.Client({ connectionString: url.href, connectionTimeoutMillis: 15000, query_timeout: 60000 });
  await client.connect();
  const { rows: [version] } = await client.query('SHOW server_version_num');
  if (Number(version.server_version_num) < 170000 || Number(version.server_version_num) >= 180000) throw new Error('Ce protocole exige PostgreSQL 17 ; adapter les outils à la version source');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  await client.query("SET LOCAL timezone='UTC'");
  const { rows: [snapshot] } = await client.query('SELECT pg_export_snapshot() AS id');
  const tables = (await client.query(tableList)).rows.map(row => row.tablename);
  if (!tables.includes('User') || !tables.includes('Conteneur')) throw new Error('La source ne correspond pas à PIA-TRACE');
  const expected = {};
  for (const table of tables) expected[table] = JSON.parse((await client.query(fingerprint(table))).rows[0].result);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const partial = await open(`${archive}.partial`, 'wx', 0o600);
  const env = {
    ...process.env,
    PGHOST: url.hostname, PGPORT: url.port || '5432', PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)) || 'postgres',
    PGSSLMODE: 'verify-full', PGSSLROOTCERT: 'system', PGCONNECT_TIMEOUT: '15',
  };
  stage = 'sauvegarde du schéma public';
  console.log('Sauvegarde cohérente en lecture seule…');
  try {
    await docker(['run', '--rm', ...['PGHOST','PGPORT','PGUSER','PGPASSWORD','PGDATABASE','PGSSLMODE','PGSSLROOTCERT','PGCONNECT_TIMEOUT'].flatMap(key => ['--env', key]), image,
      'pg_dump', '--format=custom', '--schema=public', '--no-acl', '--lock-wait-timeout=15000', `--snapshot=${snapshot.id}`], { env, output: partial.fd });
  } finally { await partial.close(); }
  await rename(`${archive}.partial`, archive);
  await client.query('ROLLBACK');
  await client.end();
  client = undefined;
  const sha256 = createHash('sha256').update(await readFile(archive)).digest('hex');
  await writeFile(resolve(directory, 'sha256.txt'), `${sha256}  database.dump\n`, { flag: 'wx', mode: 0o600 });
  stage = 'création de la base locale isolée';
  await docker(['run', '--detach', '--rm', '--name', container, '--network', 'none', '--label', 'pia-purpose=restore-verification',
    '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', 'POSTGRES_DB=pia_restore_test', image]);
  started = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const listening = await docker(['exec', container, 'psql', '-X', '-A', '-t', '-U', 'postgres', '-d', 'pia_restore_test', '-c', 'SHOW listen_addresses']);
      if (listening === '*') { ready = true; break; }
      await new Promise(done => setTimeout(done, 1000));
    }
    catch { await new Promise(done => setTimeout(done, 1000)); }
  }
  if (!ready) throw new Error('Base locale non disponible');
  stage = 'restauration locale';
  console.log('Restauration dans un conteneur local sans accès réseau…');
  // Only the empty default schema in our newly created, network-isolated container.
  await localSql('DROP SCHEMA public');
  const file = await open(archive, 'r');
  try {
    await docker(['exec', '-i', container, 'pg_restore', '--exit-on-error', '--single-transaction', '--no-owner', '--no-acl', '-U', 'postgres', '-d', 'pia_restore_test'], { input: file.fd });
  } finally { await file.close(); }
  stage = 'comparaison des données restaurées';
  const localTables = (await localSql(tableList)).split('\n').filter(line => line && line !== 'SET');
  if (JSON.stringify(tables) !== JSON.stringify(localTables)) throw new Error('Liste des tables restaurées différente');
  for (const table of tables) {
    const actual = JSON.parse((await localSql(fingerprint(table))).split('\n').filter(line => line !== 'SET').join('\n'));
    if (JSON.stringify(expected[table]) !== JSON.stringify(actual)) throw new Error('Différence détectée après restauration');
  }
  await writeFile(resolve(directory, 'verification.json'), JSON.stringify({
    verifiedAt: new Date().toISOString(), scope: 'public', postgresMajor: 17, sha256,
    restoredAndCompared: true, tables: expected,
    limitations: 'Ni rôles/ACL du serveur, ni secrets Render, ni fichiers externes. Comparaison des lignes via empreintes MD5 ; intégrité archive SHA-256.',
  }, null, 2), { flag: 'wx', mode: 0o600 });
  console.log(`VALIDÉ : ${tables.length} tables restaurées, nombres de lignes et empreintes identiques.`);
  console.log(`Sauvegarde privée : ${directory}`);
}

try { await main(); }
catch (error) {
  // Do not print raw exceptions from URL/pg: they can contain credentials or data.
  console.error(`ÉCHEC à l’étape « ${stage} ». Sauvegarde non certifiée ; aucun accès en écriture à la source.`);
  console.error(`Code : ${typeof error?.code === 'string' ? error.code : 'vérifier les prérequis ou la connexion directe'}`);
  process.exitCode = 1;
} finally {
  if (client) { await client.query('ROLLBACK').catch(() => {}); await client.end().catch(() => {}); }
  if (started) {
    try { await docker(['stop', container]); console.log('Copie de test locale supprimée ; archive conservée.'); }
    catch { console.error(`Nettoyage à terminer : docker stop ${container}`); process.exitCode = 1; }
  }
}

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { clearStoredSession, readStoredSession, writeStoredSession, SESSION_KEY } from '../src/utils/auth-storage';

class MemoryStorage {
  values = new Map<string, string>();
  getItem(key: string) { return this.values.get(key) ?? null; }
  setItem(key: string, value: string) { this.values.set(key, value); }
  removeItem(key: string) { this.values.delete(key); }
}
const local = new MemoryStorage();
const temporary = new MemoryStorage();
Object.defineProperty(globalThis, 'localStorage', { value: local, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: temporary, configurable: true });
const session = { accessToken: 'access-test', refreshToken: 'refresh-test', user: { id: 1, email:'test@example.invalid', nom:'Test', prenom:'Test', role:'ADMIN' as const }, password:'NEVER_STORE' };

test('sans souvenir : session temporaire et aucun mot de passe stocké', () => {
  writeStoredSession(session, false);
  assert.equal(local.getItem(SESSION_KEY), null);
  assert.ok(temporary.getItem(SESSION_KEY));
  assert.doesNotMatch(temporary.getItem(SESSION_KEY)!, /NEVER_STORE|password/);
  assert.equal(readStoredSession()?.rememberMe, false);
});
test('avec souvenir : session persistante, effacée à la déconnexion', () => {
  writeStoredSession(session, true);
  assert.equal(temporary.getItem(SESSION_KEY), null);
  assert.ok(local.getItem(SESSION_KEY));
  assert.doesNotMatch(local.getItem(SESSION_KEY)!, /NEVER_STORE|password/);
  clearStoredSession();
  assert.equal(readStoredSession(), null);
});
test('anciens jetons et session corrompue non réutilisés', () => {
  local.setItem('pia_web_refresh_token','legacy');
  assert.equal(readStoredSession(), null);
  assert.equal(local.getItem('pia_web_refresh_token'), null);
  local.setItem(SESSION_KEY, '{broken');
  assert.equal(readStoredSession(), null);
  assert.equal(local.getItem(SESSION_KEY), null);
});
test('connexion vide et souvenir décoché par défaut', () => {
  const page = readFileSync(new URL('../src/pages/LoginPage.tsx', import.meta.url), 'utf8');
  assert.match(page, /\[email, setEmail\] = useState\(''\)/);
  assert.match(page, /\[password, setPassword\] = useState\(''\)/);
  assert.match(page, /\[rememberMe, setRememberMe\] = useState\(false\)/);
  assert.doesNotMatch(page, /logisticien@pia\.tg|password123/);
});

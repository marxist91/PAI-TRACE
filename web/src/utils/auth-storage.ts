import type { AuthResponse } from '../services/api';
export const SESSION_KEY = 'pia_web_session_v2';
const legacy = ['pia_web_access_token', 'pia_web_refresh_token', 'pia_web_user'];
export function clearStoredSession() {
  for (const storage of [localStorage, sessionStorage]) {
    storage.removeItem(SESSION_KEY);
    for (const key of legacy) storage.removeItem(key);
  }
}
export function readStoredSession(): (AuthResponse & { rememberMe: boolean }) | null {
  for (const key of legacy) localStorage.removeItem(key);
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session.user?.id || typeof session.accessToken !== 'string' || typeof session.refreshToken !== 'string') throw new Error('Session invalide');
    return session;
  } catch { clearStoredSession(); return null; }
}
export function writeStoredSession(session: AuthResponse, rememberMe: boolean) {
  clearStoredSession();
  // Whitelist fields: never persist credentials from the login request.
  const stored = { user: session.user, accessToken: session.accessToken, refreshToken: session.refreshToken, rememberMe };
  (rememberMe ? localStorage : sessionStorage).setItem(SESSION_KEY, JSON.stringify(stored));
}

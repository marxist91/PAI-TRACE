import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import api, { authService, type LoginRequest, type RegisterRequest, type User, type AuthResponse } from '../services/api';
import { clearStoredSession, readStoredSession, writeStoredSession } from '../utils/auth-storage';

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
type Session = AuthResponse & { rememberMe: boolean };
type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };
const LOGOUT_EVENT = 'pia_web_logout';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const current = useRef<Session | null>(null);
  const generation = useRef(0);
  const refreshing = useRef<Promise<string> | null>(null);
  const cache = useQueryClient();
  const clearSession = useCallback(() => {
    generation.current++;
    current.current = null;
    clearStoredSession();
    setSession(null);
    cache.clear();
  }, [cache]);
  const saveSession = useCallback((value: Session) => {
    writeStoredSession(value, value.rememberMe);
    current.current = value;
    setSession(value);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const version = generation.current;
    const saved = readStoredSession();
    if (!saved) { setIsLoading(false); return; }
    // A cached profile never grants access without server validation.
    authService.refresh(saved.refreshToken).then(async response => {
      const token = response.data.accessToken;
      const result = await api.get<{ user: User }>('/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!cancelled && generation.current === version) saveSession({ ...saved, accessToken: token, user: result.data.user });
    }).catch(() => { if (!cancelled && generation.current === version) clearSession(); })
      .finally(() => { if (!cancelled) setIsLoading(false); });
    return () => { cancelled = true; };
  }, [clearSession, saveSession]);
  const logout = useCallback(async () => {
    const token = current.current?.refreshToken;
    // Do not pretend the server session is released if the network request fails.
    if (token) await authService.logout(token);
    clearSession();
    localStorage.setItem(LOGOUT_EVENT, String(Date.now()));
  }, [clearSession]);
  useEffect(() => {
    if (!session) return;
    let expiry: number;
    try { expiry = JSON.parse(atob(session.refreshToken.split('.')[1])).exp * 1000; }
    catch { clearSession(); return; }
    if (!Number.isFinite(expiry)) { clearSession(); return; }
    const timer = window.setTimeout(clearSession, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [session, clearSession]);
  useEffect(() => {
    const listener = (event: StorageEvent) => { if (event.key === LOGOUT_EVENT) clearSession(); };
    window.addEventListener('storage', listener);
    return () => window.removeEventListener('storage', listener);
  }, [clearSession]);
  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    generation.current++;
    cache.clear();
    saveSession({ ...response.data, rememberMe: data.rememberMe === true });
  }, [saveSession, cache]);
  const register = useCallback(async (data: RegisterRequest) => { await authService.register(data); }, []);
  useEffect(() => {
    const requestId = api.interceptors.request.use(config => {
      if (current.current && !config.headers.Authorization) config.headers.Authorization = `Bearer ${current.current.accessToken}`;
      return config;
    });
    const responseId = api.interceptors.response.use(response => response, async (error: AxiosError) => {
      const request = error.config as RetryableRequest | undefined;
      if (error.response?.status !== 401 || !request || request._retry || request.url?.startsWith('/auth/')) return Promise.reject(error);
      const saved = current.current;
      if (!saved) return Promise.reject(error);
      request._retry = true;
      const version = generation.current;
      try {
        if (!refreshing.current) refreshing.current = authService.refresh(saved.refreshToken).then(r => r.data.accessToken).finally(() => { refreshing.current = null; });
        const token = await refreshing.current;
        if (version !== generation.current) return Promise.reject(error);
        saveSession({ ...saved, accessToken: token });
        request.headers.Authorization = `Bearer ${token}`;
        return api(request);
      } catch (refreshError) {
        if (version === generation.current) clearSession();
        return Promise.reject(refreshError);
      }
    });
    return () => { api.interceptors.request.eject(requestId); api.interceptors.response.eject(responseId); };
  }, [clearSession, saveSession]);
  return <AuthContext.Provider value={{ user: session?.user ?? null, accessToken: session?.accessToken ?? null,
    isLoading, isAuthenticated: !!session, login, register, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

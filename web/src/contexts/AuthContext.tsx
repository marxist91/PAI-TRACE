import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import api, {
  authService,
  LoginRequest,
  RegisterRequest,
  User,
} from '../services/api';

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

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'pia_web_access_token',
  REFRESH_TOKEN: 'pia_web_refresh_token',
  USER: 'pia_web_user',
};

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };
let accessTokenRefresh: Promise<string> | null = null;

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  const scheduleAutoLogout = useCallback(
    (token: string) => {
      const expiry = getTokenExpiry(token);
      if (!expiry) return;
      const delay = expiry - Date.now();
      if (delay <= 0) {
        logout();
        return;
      }
      setTimeout(() => logout(), delay);
    },
    [clearSession],
  );

  useEffect(() => {
    const storedAccessToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        const parsedUser: User = JSON.parse(storedUser);
        if (!parsedUser?.id || !parsedUser.email) {
          throw new Error('Session utilisateur invalide');
        }
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(parsedUser);
        scheduleAutoLogout(storedRefreshToken);
      } catch {
        clearSession();
      }
    }

    setIsLoading(false);
  }, [clearSession, scheduleAutoLogout]);

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    const session = response.data;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setUser(session.user);
    scheduleAutoLogout(session.refreshToken);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authService.register(data);
    const session = response.data;
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, session.accessToken);
    localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, session.refreshToken);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(session.user));
    setAccessToken(session.accessToken);
    setRefreshToken(session.refreshToken);
    setUser(session.user);
    scheduleAutoLogout(session.refreshToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout(refreshToken);
    } catch (error) {
      console.error('Erreur logout:', error);
    } finally {
      clearSession();
    }
  }, [refreshToken, clearSession]);

  // Intercepteurs Axios : ajout du token et renouvellement automatique après un 401.
  useEffect(() => {
    const requestInterceptor = api.interceptors.request.use((config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`;
      }
      return config;
    });

    const responseInterceptor = api.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const request = error.config as RetryableRequest | undefined;
        const isAuthRequest = request?.url?.startsWith('/auth/') ?? false;

        if (error.response?.status !== 401 || !request || request._retry || isAuthRequest) {
          return Promise.reject(error);
        }

        const storedRefreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
        if (!storedRefreshToken) {
          clearSession();
          return Promise.reject(error);
        }

        request._retry = true;

        try {
          if (!accessTokenRefresh) {
            accessTokenRefresh = authService.refresh(storedRefreshToken)
              .then((response) => response.data.accessToken)
              .finally(() => { accessTokenRefresh = null; });
          }

          const renewedAccessToken = await accessTokenRefresh;
          localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, renewedAccessToken);
          setAccessToken(renewedAccessToken);
          request.headers.Authorization = `Bearer ${renewedAccessToken}`;
          return api(request);
        } catch (refreshError) {
          clearSession();
          return Promise.reject(refreshError);
        }
      },
    );

    return () => {
      api.interceptors.request.eject(requestInterceptor);
      api.interceptors.response.eject(responseInterceptor);
    };
  }, [accessToken, clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!accessToken && !!user,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

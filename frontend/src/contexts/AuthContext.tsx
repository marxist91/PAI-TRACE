import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  authService,
  STORAGE_KEYS,
  User,
  LoginRequest,
  RegisterRequest,
} from "../services/api";

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Extraire la date d'expiration d'un token JWT
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
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
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Nettoyer le timer de déconnexion automatique
  const clearLogoutTimer = useCallback(() => {
    if (logoutTimerRef.current) {
      clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  // Planifier la déconnexion automatique à l'expiration du refresh token
  const scheduleAutoLogout = useCallback(
    async (token: string | null) => {
      clearLogoutTimer();

      if (!token) return;

      const expiry = getTokenExpiry(token);
      if (!expiry) return;

      const now = Date.now();
      const delay = expiry - now;

      if (delay <= 0) {
        await logout();
        return;
      }

      logoutTimerRef.current = setTimeout(() => {
        logout();
      }, delay);
    },
    [clearLogoutTimer],
  );

  // Vérifier la session au démarrage
  useEffect(() => {
    loadSession();
  }, []);

  const loadSession = async () => {
    try {
      const storedAccessToken = await AsyncStorage.getItem(
        STORAGE_KEYS.ACCESS_TOKEN,
      );
      const storedRefreshToken = await AsyncStorage.getItem(
        STORAGE_KEYS.REFRESH_TOKEN,
      );
      const storedUser = await AsyncStorage.getItem(STORAGE_KEYS.USER);

      if (storedAccessToken && storedRefreshToken && storedUser) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
        scheduleAutoLogout(storedRefreshToken);
      }
    } catch (error) {
      console.error("Erreur chargement session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authService.login(data);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      response.refreshToken,
    );
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);
    scheduleAutoLogout(response.refreshToken);
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authService.register(data);
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, response.accessToken);
    await AsyncStorage.setItem(
      STORAGE_KEYS.REFRESH_TOKEN,
      response.refreshToken,
    );
    await AsyncStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.user));
    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);
    scheduleAutoLogout(response.refreshToken);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout(refreshToken);
    } catch (error) {
      console.error("Erreur lors de la déconnexion serveur:", error);
    } finally {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        STORAGE_KEYS.USER,
      ]);
      clearLogoutTimer();
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    }
  }, [refreshToken, clearLogoutTimer]);

  useEffect(() => {
    return () => {
      clearLogoutTimer();
    };
  }, [clearLogoutTimer]);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

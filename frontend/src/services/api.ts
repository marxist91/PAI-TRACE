import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const API_BASE_URL = "http://localhost:3000/api";

// Clés de stockage
export const STORAGE_KEYS = {
  ACCESS_TOKEN: "accessToken",
  REFRESH_TOKEN: "refreshToken",
  USER: "user",
} as const;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Gestion du refresh token
let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

async function clearAuthStorage(): Promise<void> {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.USER,
  ]);
}

async function refreshAccessToken(): Promise<string | null> {
  try {
    const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return null;
    }

    const response = await axios.post<{ accessToken: string }>(
      `${API_BASE_URL}/auth/refresh`,
      { refreshToken },
    );

    const { accessToken } = response.data;
    await AsyncStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    return accessToken;
  } catch (error) {
    await clearAuthStorage();
    return null;
  }
}

// Intercepteur pour ajouter le token JWT automatiquement
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error("Erreur récupération token:", error);
  }
  return config;
});

// Intercepteur pour gérer les erreurs 401 (token expiré) avec file d'attente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Attendre le nouveau token et relancer la requête
        return new Promise((resolve) => {
          addRefreshSubscriber((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const newToken = await refreshAccessToken();
      isRefreshing = false;

      if (newToken) {
        onTokenRefreshed(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Si le refresh échoue, forcer la déconnexion
      await clearAuthStorage();
      onTokenRefreshed("");
    }

    return Promise.reject(error);
  },
);

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: "LOGISTICIEN" | "CLIENT";
}

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: "LOGISTICIEN" | "CLIENT";
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Services d'authentification
export const authService = {
  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/login", data);
    return response.data;
  },

  register: async (data: RegisterRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>("/auth/register", data);
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>("/auth/refresh", {
      refreshToken,
    });
    return response.data;
  },

  logout: async (refreshToken: string | null): Promise<void> => {
    if (refreshToken) {
      await api.post("/auth/logout", { refreshToken });
    }
  },

  getProfile: async (): Promise<{ user: User }> => {
    const response = await api.get<{ user: User }>("/auth/me");
    return response.data;
  },
};

// Services de gestion des utilisateurs (logisticiens)
export const userService = {
  getAll: async (): Promise<User[]> => {
    const response = await api.get<User[]>("/users");
    return response.data;
  },

  update: async (id: number, data: Partial<User>): Promise<User> => {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`);
  },
};

// Types pour la traçabilité
export interface Consignataire {
  id: number;
  nom: string;
  code: string;
}

export interface Conteneur {
  id: number;
  numeroBL: string;
  destination: string;
  typeMarchandise: string;
  dateArrivee: string;
  statut: string;
  createdAt?: string;
  updatedAt?: string;
  consignataire: Consignataire;
  client: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
  };
  checkpoints?: Checkpoint[];
  mouvements?: Mouvement[];
}

export interface Checkpoint {
  id: number;
  type: string;
  statut: string;
  date: string;
  lieu: string;
  notes?: string;
}

export interface Mouvement {
  id: number;
  action: string;
  date: string;
  details?: string;
  user: {
    id: number;
    nom: string;
    prenom: string;
  };
}

export interface CreateConteneurRequest {
  numeroBL: string;
  consignataireId: number;
  clientEmail: string;
  destination: string;
  typeMarchandise: string;
  dateArrivee: string;
  statut?: string;
}

export interface CreateCheckpointRequest {
  type: string;
  statut: string;
  date: string;
  lieu: string;
  notes?: string;
}

// Services de traçabilité
export const consignataireService = {
  getAll: async (): Promise<Consignataire[]> => {
    const response = await api.get<{ consignataires: Consignataire[] }>(
      "/consignataires",
    );
    return response.data.consignataires;
  },
};

export const conteneurService = {
  getAll: async (params?: {
    statut?: string;
    search?: string;
  }): Promise<Conteneur[]> => {
    const response = await api.get<{ conteneurs: Conteneur[] }>("/conteneurs", {
      params,
    });
    return response.data.conteneurs;
  },

  getById: async (id: number): Promise<Conteneur> => {
    const response = await api.get<{ conteneur: Conteneur }>(`/conteneurs/${id}`);
    return response.data.conteneur;
  },

  create: async (data: CreateConteneurRequest): Promise<Conteneur> => {
    const response = await api.post<{ conteneur: Conteneur }>("/conteneurs", data);
    return response.data.conteneur;
  },

  update: async (id: number, data: Partial<CreateConteneurRequest>): Promise<Conteneur> => {
    const response = await api.put<{ conteneur: Conteneur }>(`/conteneurs/${id}`, data);
    return response.data.conteneur;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/conteneurs/${id}`);
  },

  addCheckpoint: async (
    id: number,
    data: CreateCheckpointRequest,
  ): Promise<Checkpoint> => {
    const response = await api.post<{ checkpoint: Checkpoint }>(
      `/conteneurs/${id}/checkpoints`,
      data,
    );
    return response.data.checkpoint;
  },
};

export const checkpointService = {
  getRecent: async (limit = 20): Promise<Checkpoint[]> => {
    const response = await api.get<{ checkpoints: Checkpoint[] }>("/checkpoints", {
      params: { limit },
    });
    return response.data.checkpoints;
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/checkpoints/${id}`);
  },
};

export default api;

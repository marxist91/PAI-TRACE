import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: Role;
}

export type Role = 'ADMIN' | 'LOGISTICIEN' | 'CONTROLEUR_LCT' | 'CONTROLEUR_TOGO' | 'AGENT_PIA' | 'CONSIGNATAIRE' | 'CLIENT';

export interface User {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  telephone?: string;
  role: Role;
  consignataireId?: number | null;
  consignataire?: Consignataire | null;
}

export interface UserSummary extends User {
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  _count: { conteneurs: number; mouvements: number };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Consignataire {
  id: number;
  nom: string;
  code: string;
}

export interface Conteneur {
  id: number;
  numeroConteneur?: string | null;
  numeroBL: string;
  atp?: string | null;
  destination: string;
  typeMarchandise: string;
  dateArrivee: string;
  datePrevuePia?: string | null;
  dateDebarquement?: string | null;
  dateSortieTerminal?: string | null;
  dateEntreePia?: string | null;
  dateSortiePia?: string | null;
  paysDestination?: string | null;
  sejourHeures?: number | null;
  sejourJours?: number | null;
  statut: string;
  terminalAffecte: 'LCT' | 'TOGO' | null;
  createdAt: string;
  updatedAt: string;
  consignataire: Consignataire;
  client: User;
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
  user: User;
  conteneur: Pick<Conteneur, 'id' | 'numeroConteneur' | 'numeroBL' | 'atp' | 'destination' | 'paysDestination' | 'statut'>;
  checkpoint: Checkpoint;
}

export interface Anomaly {
  id: number;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  hoursOpen: number;
  thresholdHours: number;
  criticalAfterHours: number;
  detectedAt: string;
  conteneur: Pick<Conteneur, 'id' | 'numeroConteneur' | 'numeroBL' | 'atp' | 'destination' | 'paysDestination' | 'statut'>;
  lastCheckpoint: Checkpoint | null;
}

export interface AppNotification {
  id: number;
  conteneurId: number | null;
  message: string;
  type: string;
  lu: boolean;
  createdAt: string;
}

export interface CreateConteneurRequest {
  numeroBL: string;
  numeroConteneur?: string;
  atp?: string;
  consignataireId?: number;
  clientEmail?: string;
  destination: string;
  typeMarchandise: string;
  dateArrivee: string;
  datePrevuePia?: string;
  dateDebarquement?: string;
  paysDestination?: string;
  statut?: string;
  terminalAffecte: 'LCT' | 'TOGO';
}

export interface CreateCheckpointRequest {
  type: string;
  statut: string;
  date: string;
  lieu: string;
  notes?: string;
  paysDestination?: string;
}

export type OperationPeriod = 'jour' | 'semaine' | 'mois';
export type OperationExportKind = 'activite' | 'attendus' | 'quai' | 'sorties-terminal' | 'entrees-pia' | 'sorties-pia' | 'registre-pia' | 'flux-pia' | 'sejours-pia';

export interface OperationStats {
  byDestination: { pays: string; entreesPia: number; sortiesPia: number; partSorties: number | null; sejoursMesures: number; sejoursNonMesurables: number; sejourMoyenHeures: number | null }[];
  stockDebut: number | null;
  stockFin: number | null;
  ecartStock: number | null;
  periodeEnCours: boolean;
  arreteAu: string;
  daily: { date: string; entrees: number; sorties: number; stockDebut: number; stockFin: number; ecartStock: number; arreteAu: string; partiel: boolean }[];
  transfertsMesures: number;
  transfertsNonMesurables: number;
  transfertMoyenHeures: number | null;
  byTerminal: { terminal: string; sortiesTerminal: number; entreesPia: number; sortiesPia: number; transfertsMesures: number; transfertsNonMesurables: number; transfertMoyenHeures: number | null; sejoursMesures: number; sejoursNonMesurables: number; sejourMoyenHeures: number | null; sejourMedianHeures: number | null; sejourMinHeures: number | null; sejourMaxHeures: number | null }[];
  destinesPia: number;
  attendus: number;
  attendusLct: number;
  attendusTogo: number;
  vusAQuai: number;
  sortiesTerminal: number;
  sortiesLct: number;
  sortiesTogo: number;
  entreesPia: number;
  sortiesPia: number;
  enSejour: number;
  sejourMoyenHeures: number | null;
  sejoursMesures: number;
  sejoursParDuree: { tranche: string; nombre: number }[];
  sejoursNonMesurables: number;
  sejourMedianHeures: number | null;
  sejourMinHeures: number | null;
  sejourMaxHeures: number | null;
}

export interface ManifesteImport {
  bilan?: { crees: number; completes: number; inchanges: number; operationsAjoutees: number };
  id: number;
  nomFichier: string;
  source: string;
  lignesTotal: number;
  lignesImportees: number;
  lignesIgnorees: number;
  importedAt: string;
  importePar?: { nom: string; prenom: string };
}

export interface ManifestePreviewRow {
  suggestionsPays?: string[];
  sourceDestination?: string;
  sheet?: string;
  navire?: string;
  dateSortieTerminal?: string | null;
  dateEntreePia?: string | null;
  dateSortiePia?: string | null;
  statut?: string;
  previsionTransfert?: string | null;
  declaration?: string | null;
  depote?: string | null;
  line: number;
  numeroConteneur: string | null;
  numeroBL: string | null;
  atp: string | null;
  terminal: 'LCT' | 'TOGO' | null;
  datePrevuePia: string | null;
  dateDebarquement: string | null;
  paysDestination: string | null;
  typeMarchandise: string | null;
  action: 'CREATION' | 'MISE_A_JOUR' | 'IGNOREE' | 'ANALYSE';
  issues: string[];
}

export interface ManifestePreview {
  xml?: boolean;
  message?: string;
  blTotal?: number;
  combinations?: Record<string, number>;
  lectureSeule?: boolean;
  officiel?: boolean;
  typeDocument?: 'SUIVI_TRANSFERT';
  exclusionsTogo?: number;
  destinationsAConfirmer?: number;
  feuilles?: { nom: string; lignes: number; entete: number }[];
  nomFichier: string;
  lignesTotal: number;
  lignesValides: number;
  lignesIgnorees: number;
  creations: number;
  misesAJour: number;
  colonnesReconnues: string[];
  colonnesManquantes: string[];
  lignes: ManifestePreviewRow[];
  apercuLimite: boolean;
}

// Auth
export const authService = {
  login: (data: LoginRequest) => api.post<AuthResponse>('/auth/login', data),
  register: (data: RegisterRequest) => api.post<{ user: User }>('/auth/register', data),
  logout: (refreshToken: string | null) =>
    refreshToken ? api.post('/auth/logout', { refreshToken }) : Promise.resolve(),
  refresh: (refreshToken: string) => api.post<{ accessToken: string }>('/auth/refresh', { refreshToken }),
  getProfile: () => api.get<{ user: User }>('/auth/me'),
};

// Consignataires
export const consignataireService = {
  getAll: () => api.get<{ consignataires: Consignataire[] }>('/consignataires'),
};

// Conteneurs
export const conteneurService = {
  getAll: (params?: { statut?: string; search?: string }) =>
    api.get<{ conteneurs: Conteneur[] }>('/conteneurs', { params }),
  getById: (id: number) => api.get<{ conteneur: Conteneur }>(`/conteneurs/${id}`),
  create: (data: CreateConteneurRequest) =>
    api.post<{ conteneur: Conteneur }>('/conteneurs', data),
  update: (id: number, data: Partial<CreateConteneurRequest>) =>
    api.put<{ conteneur: Conteneur }>(`/conteneurs/${id}`, data),
  delete: (id: number) => api.delete(`/conteneurs/${id}`),
  addCheckpoint: (id: number, data: CreateCheckpointRequest) =>
    api.post<{ checkpoint: Checkpoint }>(`/conteneurs/${id}/checkpoints`, data),
};

export const manifesteService = {
  getAll: () => api.get<{ manifestes: ManifesteImport[] }>('/manifestes'),
  preview: (fichier: File) => {
    const form = new FormData();
    form.append('fichier', fichier);
    return api.post<{ preview: ManifestePreview }>('/manifestes/preview', form, {
      headers: { 'Content-Type': undefined },
    });
  },
  import: (fichier: File, dateVaq?: string) => {
    const form = new FormData();
    form.append('fichier', fichier);
    if (dateVaq) form.append('dateVaq', dateVaq);
    return api.post<{ manifeste: ManifesteImport }>('/manifestes/import', form, {
      headers: { 'Content-Type': undefined },
      timeout: 150000,
    });
  },
};

export const operationService = {
  getCurrentStock: (terminal: 'TOUS' | 'LCT' | 'TOGO' = 'TOUS') => api.get<{ stock: CurrentPiaStock }>('/operations/stock-actuel', { params: { terminal } }),
  getExpected: (periode: OperationPeriod, date?: string) => api.get<{ conteneurs: Conteneur[] }>('/operations/attendus', { params: { periode, date } }),
  getQuay: (periode: OperationPeriod, date?: string) => api.get<{ conteneurs: Conteneur[] }>('/operations/quai', { params: { periode, date } }),
  getPia: () => api.get<{ conteneurs: Conteneur[]; stats: { attendus: number; attendusLct: number; attendusTogo: number; enSejour: number; sortis: number; sejourMoyenHeures: number } }>('/operations/pia'),
  getStats: (periode: OperationPeriod, date?: string, terminal: 'TOUS' | 'LCT' | 'TOGO' = 'TOUS') => api.get<{ stats: OperationStats }>('/operations/stats', { params: { periode, date, terminal } }),
  exportExcel: async (liste: OperationExportKind | 'statistiques' | 'stock-actuel', periode: OperationPeriod, date?: string, filtre?: string, terminal: 'TOUS' | 'LCT' | 'TOGO' = 'TOUS') => {
    const response = await api.get<Blob>(liste === 'stock-actuel' ? '/operations/stock-actuel.xlsx' : liste === 'statistiques' ? '/operations/stats-export.xlsx' : '/operations/export.xlsx', { params: liste === 'stock-actuel' ? { filtre, terminal } : { liste, periode, date, terminal }, responseType: 'blob' });
    const disposition = String(response.headers['content-disposition'] ?? '');
    const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `pia-trace-${liste}-${periode}.xlsx`;
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  },
};

// Users
export interface CurrentPiaStock {
  arreteAu: string;
  seuils: { warningAfterHours: number; criticalAfterHours: number };
  total: number;
  alertes: number;
  critiques: number;
  sansAlerte: number;
  repartition: { tranche: string; nombre: number }[];
  conteneurs: { id: number; numeroConteneur: string | null; numeroBL: string; terminalAffecte: string | null; paysDestination: string | null; dateEntreePia: string; heuresSejour: number; niveau: string }[];
}

export const userService = {
  revokeSession: (id: number) => api.post(`/users/${id}/revoke-session`),
  setActive: (id: number, isActive: boolean, updatedAt: string) => api.patch(`/users/${id}/status`, { isActive, updatedAt }),
  remove: (id: number, updatedAt: string) => api.delete(`/users/${id}`, { data: { updatedAt } }),
  getAll: () => api.get<{ users: UserSummary[] }>('/users'),
  create: (data: RegisterRequest & { isActive: boolean }) => api.post<{ user: UserSummary }>('/users', data),
  update: (id: number, data: Omit<RegisterRequest, 'password'> & { password?: string; isActive: boolean; updatedAt: string }) => api.put<{ user: UserSummary; sessionRevoked: boolean }>(`/users/${id}`, data),
};

export interface OperationalSettings {
  destinationCountries: string[];
  disabledDestinationCountries: string[];
  rules: Record<'ATTENDU_PIA' | 'VU_A_QUAI' | 'SORTI_TERMINAL' | 'ENTRE_PIA', { warningAfterHours: number; criticalAfterHours: number }>;
  version: number;
  updatedAt: string | null;
}
export const settingsService = {
  setCountryActive: (country: string, active: boolean, version: number) => api.patch<OperationalSettings>('/settings/destination-countries', { country, active, version }),
  getCountries: () => api.get<{ countries: string[] }>('/settings/destination-countries'),
  addCountry: (country: string, version: number) => api.post<OperationalSettings>('/settings/destination-countries', { country, version }),
  get: () => api.get<OperationalSettings>('/settings'),
  save: (data: Pick<OperationalSettings, 'rules' | 'version'>) => api.put<OperationalSettings>('/settings', data),
};

// Checkpoints
export const checkpointService = {
  getRecent: (limit = 20) =>
    api.get<{ checkpoints: Checkpoint[] }>('/checkpoints', { params: { limit } }),
  delete: (id: number) => api.delete(`/checkpoints/${id}`),
};

// Mouvements
export const mouvementService = {
  getAll: (params?: { search?: string; action?: string; limit?: number }) =>
    api.get<{ mouvements: Mouvement[]; total: number; stats: { action: string; count: number }[] }>('/mouvements', { params }),
};

// Anomalies
export const anomalyService = {
  getAll: (params?: { search?: string; severity?: string; limit?: number }) =>
    api.get<{ anomalies: Anomaly[]; stats: { total: number; critical: number; warning: number; info: number } }>('/anomalies', { params }),
};

// Notifications
export const notificationService = {
  getAll: (params?: { limit?: number; unread?: boolean }) =>
    api.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications', { params }),
  markRead: (id: number) => api.patch<{ updated: number }>(`/notifications/${id}/read`),
  markAllRead: () => api.patch<{ updated: number }>('/notifications/read-all'),
};

export default api;

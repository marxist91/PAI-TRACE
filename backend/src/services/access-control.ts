import type { AuthRequest } from '../middleware/auth';

export const GLOBAL_ROLES = ['LOGISTICIEN'] as const;
export const OPERATIONAL_ROLES = ['CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'] as const;

type SessionUser = NonNullable<AuthRequest['user']>;

export function containerScopeFor(user: SessionUser): Record<string, unknown> {
  switch (user.role) {
    case 'CLIENT':
    case 'CONSIGNATAIRE':
      return { id: -1 };
    case 'CONTROLEUR_LCT':
      return { terminalAffecte: 'LCT' };
    case 'CONTROLEUR_TOGO':
      return { terminalAffecte: 'TOGO' };
    case 'AGENT_PIA':
      return { statut: { in: ['ATTENDU_PIA', 'VU_A_QUAI', 'SORTI_TERMINAL', 'ENTRE_PIA', 'SORTI_PIA', 'EN_TRANSIT_VERS_PIA', 'ARRIVE_PIA', 'STOCKE_PIA', 'DOUANE', 'LIVRE'] } };
    default:
      return {};
  }
}

export function canAccessContainer(
  user: SessionUser,
  container: { clientId: number; consignataireId: number; terminalAffecte: string | null; statut: string },
): boolean {
  if (user.role === 'LOGISTICIEN') return true;
  if (user.role === 'CLIENT' || user.role === 'CONSIGNATAIRE') return false;
  if (user.role === 'CONTROLEUR_LCT') return container.terminalAffecte === 'LCT';
  if (user.role === 'CONTROLEUR_TOGO') return container.terminalAffecte === 'TOGO';
  if (user.role === 'AGENT_PIA') return ['ATTENDU_PIA', 'VU_A_QUAI', 'SORTI_TERMINAL', 'ENTRE_PIA', 'SORTI_PIA', 'EN_TRANSIT_VERS_PIA', 'ARRIVE_PIA', 'STOCKE_PIA', 'DOUANE', 'LIVRE'].includes(container.statut);
  return false;
}

export function checkpointTypeForRole(role: string): string | null {
  if (role === 'CONTROLEUR_LCT') return 'TERMINAL_LCT';
  if (role === 'CONTROLEUR_TOGO') return 'TERMINAL_TOGO';
  if (role === 'AGENT_PIA') return 'PIA';
  return null;
}

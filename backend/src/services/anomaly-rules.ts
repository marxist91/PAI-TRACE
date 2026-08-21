export type Severity = 'critical' | 'warning' | 'info';

export type TrackedAnomalyStatus =
  | 'ATTENDU_PIA'
  | 'VU_A_QUAI'
  | 'SORTI_TERMINAL'
  | 'ENTRE_PIA';

interface AnomalyRule {
  warningAfterHours: number;
  criticalAfterHours: number;
  title: string;
  description: string;
}

export interface AnomalyEvaluation {
  severity: Severity;
  title: string;
  description: string;
  thresholdHours: number;
  criticalAfterHours: number;
}

/**
 * Seuils opérationnels provisoires, centralisés pour pouvoir être ajustés
 * après validation par le Port autonome de Lomé.
 */
export const ANOMALY_RULES: Record<TrackedAnomalyStatus, AnomalyRule> = {
  ATTENDU_PIA: {
    warningAfterHours: 24,
    criticalAfterHours: 48,
    title: 'Conteneur attendu en retard',
    description: 'La vue à quai n’est pas confirmée 24 h après la date de référence.',
  },
  VU_A_QUAI: {
    warningAfterHours: 12,
    criticalAfterHours: 24,
    title: 'Sortie terminal en retard',
    description: 'La sortie LCT ou Togo Terminal n’est pas enregistrée 12 h après la vue à quai.',
  },
  SORTI_TERMINAL: {
    warningAfterHours: 6,
    criticalAfterHours: 12,
    title: 'Entrée PIA en retard',
    description: 'L’entrée à la PIA n’est pas confirmée 6 h après la sortie du terminal.',
  },
  ENTRE_PIA: {
    warningAfterHours: 72,
    criticalAfterHours: 120,
    title: 'Séjour PIA prolongé',
    description: 'Le conteneur séjourne à la PIA depuis plus de 72 h sans sortie enregistrée.',
  },
};

export const ANOMALY_STATUSES = Object.keys(ANOMALY_RULES) as TrackedAnomalyStatus[];

export function evaluateAnomaly(statut: string, hoursInStage: number): AnomalyEvaluation | null {
  const rule = ANOMALY_RULES[statut as TrackedAnomalyStatus];
  if (!rule || hoursInStage < rule.warningAfterHours) return null;

  return {
    severity: hoursInStage >= rule.criticalAfterHours ? 'critical' : 'warning',
    title: rule.title,
    description: rule.description,
    thresholdHours: rule.warningAfterHours,
    criticalAfterHours: rule.criticalAfterHours,
  };
}

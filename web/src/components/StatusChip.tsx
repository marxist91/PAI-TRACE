import {
  CheckCircle,
  Clock,
  DotOutline,
  Warning,
  type Icon,
} from '@phosphor-icons/react';

const styles: Record<string, { label: string; className: string; icon: Icon }> = {
  ATTENDU_PIA: { label: 'Attendu à la PIA', className: 'status-info', icon: Clock },
  VU_A_QUAI: { label: 'Vu à quai', className: 'status-warning', icon: DotOutline },
  SORTI_TERMINAL: { label: 'Sorti du terminal', className: 'status-warning', icon: CheckCircle },
  ENTRE_PIA: { label: 'Entré à la PIA', className: 'status-success', icon: CheckCircle },
  SORTI_PIA: { label: 'Sorti de la PIA', className: 'status-success', icon: CheckCircle },
  EN_ATTENTE: { label: 'En attente', className: 'status-info', icon: Clock },
  CHEZ_CONSIGNATAIRE: { label: 'Enregistré', className: 'status-info', icon: DotOutline },
  EN_TRANSIT_VERS_TERMINAL: { label: 'En transit', className: 'status-warning', icon: Clock },
  AU_TERMINAL: { label: 'Au terminal', className: 'status-warning', icon: DotOutline },
  DECHARGE_SOUS_PALAN: { label: 'Sous palan', className: 'status-warning', icon: DotOutline },
  EN_TRANSIT_VERS_PIA: { label: 'En transit', className: 'status-warning', icon: Clock },
  ARRIVE_PIA: { label: 'Arrivé', className: 'status-success', icon: CheckCircle },
  STOCKE_PIA: { label: 'Stocké', className: 'status-success', icon: CheckCircle },
  DOUANE: { label: 'À vérifier', className: 'status-danger', icon: Warning },
  LIVRE: { label: 'Livré', className: 'status-success', icon: CheckCircle },
};

export function StatusChip({ statut }: { statut: string }) {
  const config = styles[statut] ?? {
    label: statut,
    className: 'status-neutral',
    icon: DotOutline,
  };
  const Icon = config.icon;

  return (
    <span className={`status-chip ${config.className}`}>
      <Icon size={12} weight="bold" />
      {config.label}
    </span>
  );
}

export function statusLabel(statut: string) {
  return styles[statut]?.label ?? statut;
}

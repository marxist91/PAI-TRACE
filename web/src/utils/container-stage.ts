/** A completed checkpoint remains visible after the container advances. */
export interface ContainerStage {
  statut: string;
  dateDebarquement?: string | null;
  dateSortieTerminal?: string | null;
  dateEntreePia?: string | null;
  dateSortiePia?: string | null;
}

export function matchesContainerStage(container: ContainerStage, stage: string): boolean {
  switch (stage) {
    case '': return true;
    case 'VU_A_QUAI': return Boolean(container.dateDebarquement);
    case 'SORTI_TERMINAL': return Boolean(container.dateSortieTerminal);
    case 'ENTRE_PIA': return Boolean(container.dateEntreePia);
    case 'SORTI_PIA': return Boolean(container.dateSortiePia);
    default: return container.statut === stage;
  }
}

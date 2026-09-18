export function operationError(container: {
  dateDebarquement: Date | null; dateSortieTerminal: Date | null;
  dateEntreePia: Date | null; dateSortiePia: Date | null;
}, status: string, date: Date, now = new Date()): string | null {
  if (!Number.isFinite(date.getTime()) || date > now) return 'La date doit correspondre à une opération déjà réalisée.';
  const target = status === 'SORTI_TERMINAL' ? container.dateSortieTerminal : status === 'ENTRE_PIA' ? container.dateEntreePia : container.dateSortiePia;
  if (target) return 'Cette opération est déjà enregistrée.';
  if (container.dateSortiePia) return 'Le parcours est terminé : la sortie PIA est déjà enregistrée.';
  if (status === 'SORTI_TERMINAL' && container.dateEntreePia) return 'Une entrée PIA est déjà enregistrée pour ce conteneur.';
  if (status === 'ENTRE_PIA' && !container.dateSortieTerminal) return 'Enregistrez la sortie du terminal avant l’entrée PIA.';
  if (status === 'SORTI_PIA' && !container.dateEntreePia) return 'Enregistrez l’entrée PIA avant la sortie PIA.';
  const previous = status === 'SORTI_TERMINAL' ? container.dateDebarquement : status === 'ENTRE_PIA' ? container.dateSortieTerminal : container.dateEntreePia;
  if (previous && date < previous) return 'La date ne peut pas précéder l’étape précédente.';
  return null;
}

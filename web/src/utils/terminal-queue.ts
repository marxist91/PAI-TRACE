import { operationRange } from './operation-period';

export type QueueAge = 'anciens' | 'nouveaux' | 'ulterieurs' | 'inconnus';
type QueueRow = { statut: string; createdAt?: string | null; dateSortieTerminal?: string | null; dateEntreePia?: string | null; dateSortiePia?: string | null };

export function isPendingTerminal(row: QueueRow) {
  return ['ATTENDU_PIA', 'VU_A_QUAI'].includes(row.statut) && !row.dateSortieTerminal && !row.dateEntreePia && !row.dateSortiePia;
}

/** Cohort of the current backlog, NOT a reconstruction of the stock on that date.
 * First registration is stable across reimports; updatedAt and manifest date are not. */
export function terminalQueueAge(row: Pick<QueueRow, 'createdAt'>, date: string): QueueAge {
  const range = operationRange('jour', date);
  const created = row.createdAt ? new Date(row.createdAt).getTime() : NaN;
  if (!range || !Number.isFinite(created)) return 'inconnus';
  if (created < range.start.getTime()) return 'anciens';
  return created < range.end.getTime() ? 'nouveaux' : 'ulterieurs';
}

export const queueAgeLabels: Record<QueueAge, string> = {
  anciens: 'Antérieurs à la date', nouveaux: 'Enregistrés à cette date', ulterieurs: 'Postérieurs à la date', inconnus: 'Date inconnue',
};

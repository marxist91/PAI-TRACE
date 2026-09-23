export type Period = 'jour' | 'semaine' | 'mois';
/** Lomé/UTC, semaine lundi-dimanche ; borne de fin exclusive. */
export function operationRange(period: Period, date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date) return null;
  if (period === 'semaine') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() || 7) + 1);
  if (period === 'mois') start.setUTCDate(1);
  const end = new Date(start);
  if (period === 'mois') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (period === 'semaine' ? 7 : 1));
  return { start, end };
}
export function inOperationPeriod(value: string | null | undefined, period: Period, date: string) {
  const range = operationRange(period, date);
  if (!value || !range) return false;
  const timestamp = new Date(value).getTime();
  return timestamp >= range.start.getTime() && timestamp < range.end.getTime();
}
export function operationPeriodLabel(period: Period, date: string) {
  const range = operationRange(period, date);
  if (!range) return 'Date invalide';
  const format = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC' });
  return `Du ${format.format(range.start)} au ${format.format(new Date(range.end.getTime() - 1))} · Lomé / UTC`;
}

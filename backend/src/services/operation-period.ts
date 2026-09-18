/** Calendrier opérationnel de Lomé (UTC), fin exclusive. */
export function periodRange(value: unknown, date?: unknown, now = new Date()) {
  const periode = value === 'semaine' || value === 'mois' ? value : 'jour';
  const anchor = date === undefined ? now.toISOString().slice(0, 10) : date;
  if (typeof anchor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new Error('Date invalide (AAAA-MM-JJ attendu)');
  const start = new Date(`${anchor}T00:00:00.000Z`);
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== anchor) throw new Error('Date invalide');
  if (periode === 'semaine') start.setUTCDate(start.getUTCDate() - (start.getUTCDay() || 7) + 1);
  if (periode === 'mois') start.setUTCDate(1);
  const end = new Date(start);
  if (periode === 'mois') end.setUTCMonth(end.getUTCMonth() + 1);
  else end.setUTCDate(end.getUTCDate() + (periode === 'semaine' ? 7 : 1));
  return { periode, start, end };
}

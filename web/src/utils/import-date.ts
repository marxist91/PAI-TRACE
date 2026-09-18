/** Explicit French input or ISO local time, interpreted in Lomé (UTC). */
export function importDateUtc(value: string, now = new Date()): string {
  value = value.trim().replace(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}:\d{2})$/, '$3-$2-$1T$4');
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(value);
  if (!match) throw new Error('Renseignez une date et une heure complètes pour « Vu à quai ».');
  const [, y, m, d, h, min, sec = '0', fraction = '0'] = match;
  const date = new Date(0);
  date.setUTCFullYear(+y, +m - 1, +d);
  date.setUTCHours(+h, +min, +sec, +fraction.padEnd(3, '0'));
  if (+y < 1900 || date.getUTCFullYear() !== +y || date.getUTCMonth() !== +m - 1 || date.getUTCDate() !== +d ||
    date.getUTCHours() !== +h || date.getUTCMinutes() !== +min || date.getUTCSeconds() !== +sec) {
    throw new Error('La date « Vu à quai » est invalide. Vérifiez le jour et l’heure.');
  }
  if (date.getTime() > now.getTime()) throw new Error('La date « Vu à quai » ne peut pas être dans le futur (heure de Lomé).');
  return date.toISOString();
}

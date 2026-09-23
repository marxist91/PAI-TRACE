import { knownCountry } from './xml-destination';
import { normalizeManifestValue } from './manifest-parser';

interface Journey {
  paysDestination?: string | null;
  terminalAffecte: string | null;
  datePrevuePia: Date | null;
  dateDebarquement: Date | null;
  dateSortieTerminal: Date | null;
  dateEntreePia: Date | null;
  dateSortiePia: Date | null;
}

function summarizeStays(values: number[], exits: number) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return {
    sejoursMesures: sorted.length,
    sejoursNonMesurables: exits - sorted.length,
    sejourMoyenHeures: sorted.length ? sorted.reduce((sum, hours) => sum + hours, 0) / sorted.length : null,
    sejourMedianHeures: sorted.length ? (sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2) : null,
    sejourMinHeures: sorted[0] ?? null,
    sejourMaxHeures: sorted.at(-1) ?? null,
  };
}

/** Stocks are measured immediately before the boundary, flows in [start, end). */
export function operationStatistics(rows: Journey[], start: Date, end: Date, now = new Date()) {
  const cutoff = new Date(Math.min(end.getTime(), now.getTime()));
  const inPeriod = (date: Date | null) => date !== null && date >= start && date < cutoff;
  const presentBefore = (row: Journey, boundary: Date) => row.dateEntreePia !== null && row.dateEntreePia < boundary && (!row.dateSortiePia || row.dateSortiePia >= boundary);
  const daily = [] as { date: string; entrees: number; sorties: number }[];
  for (let day = new Date(start); day < cutoff; day.setUTCDate(day.getUTCDate() + 1)) {
    daily.push({ date: day.toISOString().slice(0, 10), entrees: 0, sorties: 0 });
  }
  const days = new Map(daily.map(day => [day.date, day]));
  const byTerminal = ['LCT', 'TOGO', 'INCONNU'].map(terminal => ({ terminal, sortiesTerminal: 0, entreesPia: 0, sortiesPia: 0, transfertsMesures: 0, transfertsNonMesurables: 0, transfertTotalHeures: 0, stayDurations: [] as number[] }));
  let attendus = 0, attendusLct = 0, attendusTogo = 0, vusAQuai = 0;
  let stockDebut = 0, stockFin = 0, enSejour = 0;
  const durations: number[] = [];
  const countries = new Map<string, { pays: string; entreesPia: number; sortiesPia: number; sejoursMesures: number; totalHeures: number }>();
  for (const row of rows) {
    let country: ReturnType<typeof countries.get>;
    if (inPeriod(row.dateEntreePia) || inPeriod(row.dateSortiePia)) {
      const name = knownCountry(row.paysDestination);
      const key = name ? normalizeManifestValue(name) : 'A CONFIRMER';
      if (!countries.has(key)) countries.set(key, { pays: key === 'A CONFIRMER' ? 'À confirmer' : key, entreesPia: 0, sortiesPia: 0, sejoursMesures: 0, totalHeures: 0 });
      country = countries.get(key)!;
    }
    const segment = byTerminal.find(item => item.terminal === row.terminalAffecte) ?? byTerminal[2]!;
    if (row.datePrevuePia && row.datePrevuePia >= start && row.datePrevuePia < end) {
      attendus++;
      if (row.terminalAffecte === 'LCT') attendusLct++;
      if (row.terminalAffecte === 'TOGO') attendusTogo++;
    }
    if (inPeriod(row.dateDebarquement)) vusAQuai++;
    if (inPeriod(row.dateSortieTerminal)) segment.sortiesTerminal++;
    if (inPeriod(row.dateEntreePia)) {
      segment.entreesPia++;
      country!.entreesPia++;
      days.get(row.dateEntreePia!.toISOString().slice(0, 10))!.entrees++;
      // Cohort: arrivals in the period, even when the terminal departure predates it.
      if (row.dateSortieTerminal && row.dateSortieTerminal <= row.dateEntreePia!) {
        segment.transfertsMesures++;
        segment.transfertTotalHeures += (row.dateEntreePia!.getTime() - row.dateSortieTerminal.getTime()) / 3_600_000;
      } else segment.transfertsNonMesurables++;
    }
    if (inPeriod(row.dateSortiePia)) {
      segment.sortiesPia++;
      country!.sortiesPia++;
      days.get(row.dateSortiePia!.toISOString().slice(0, 10))!.sorties++;
      if (row.dateEntreePia && row.dateSortiePia! >= row.dateEntreePia) {
        const hours = (row.dateSortiePia!.getTime() - row.dateEntreePia.getTime()) / 3_600_000;
        durations.push(hours);
        segment.stayDurations.push(hours);
        country!.sejoursMesures++;
        country!.totalHeures += hours;
      }
    }
    if (presentBefore(row, start)) stockDebut++;
    if (presentBefore(row, cutoff)) stockFin++;
    if (presentBefore(row, now)) enSejour++;
  }
  const entreesPia = daily.reduce((sum, day) => sum + day.entrees, 0);
  const sortiesPia = daily.reduce((sum, day) => sum + day.sorties, 0);
  // Reconstruct each closing stock independently: missing/inverted dates must
  // produce a reconciliation warning, never a fabricated negative stock.
  let opening = stockDebut;
  const dailyStocks = daily.map(day => {
    const nextMidnight = new Date(`${day.date}T00:00:00Z`).getTime() + 86_400_000;
    const boundary = new Date(Math.min(nextMidnight, cutoff.getTime()));
    const closing = rows.filter(row => presentBefore(row, boundary)).length;
    const result = { ...day, stockDebut: opening, stockFin: closing,
      ecartStock: closing - (opening + day.entrees - day.sorties),
      arreteAu: boundary.toISOString(), partiel: boundary.getTime() < nextMidnight };
    opening = closing;
    return result;
  });
  const transfertsMesures = byTerminal.reduce((sum, item) => sum + item.transfertsMesures, 0);
  const transfertTotalHeures = byTerminal.reduce((sum, item) => sum + item.transfertTotalHeures, 0);
  const sejoursParDuree = [
    { tranche: 'Jusqu’à 24 h', nombre: 0 },
    { tranche: 'Plus de 24 à 72 h', nombre: 0 },
    { tranche: 'Plus de 72 h à 7 j', nombre: 0 },
    { tranche: 'Plus de 7 j', nombre: 0 },
  ];
  for (const hours of durations) {
    sejoursParDuree[hours <= 24 ? 0 : hours <= 72 ? 1 : hours <= 168 ? 2 : 3]!.nombre++;
  }
  return {
    destinesPia: rows.length, attendus, attendusLct, attendusTogo, vusAQuai,
    sortiesTerminal: byTerminal.reduce((sum, item) => sum + item.sortiesTerminal, 0),
    sortiesLct: byTerminal[0]!.sortiesTerminal, sortiesTogo: byTerminal[1]!.sortiesTerminal,
    entreesPia, sortiesPia, enSejour,
    byDestination: [...countries.values()].map(({ totalHeures, ...item }) => ({
      ...item,
      partSorties: sortiesPia ? item.sortiesPia / sortiesPia : null,
      sejoursNonMesurables: item.sortiesPia - item.sejoursMesures,
      sejourMoyenHeures: item.sejoursMesures ? totalHeures / item.sejoursMesures : null,
    })).sort((a, b) => b.sortiesPia - a.sortiesPia || b.entreesPia - a.entreesPia || a.pays.localeCompare(b.pays, 'fr')),
    transfertsMesures,
    transfertsNonMesurables: entreesPia - transfertsMesures,
    transfertMoyenHeures: transfertsMesures ? transfertTotalHeures / transfertsMesures : null,
    ...summarizeStays(durations, sortiesPia),
    sejoursParDuree,
    stockDebut: start <= now ? stockDebut : null,
    stockFin: start <= now ? stockFin : null,
    ecartStock: start <= now ? stockFin - (stockDebut + entreesPia - sortiesPia) : null,
    periodeEnCours: start <= now && now < end,
    arreteAu: cutoff.toISOString(), daily: dailyStocks,
    byTerminal: byTerminal.filter(item => item.terminal !== 'INCONNU' || item.sortiesTerminal + item.entreesPia + item.sortiesPia > 0)
      .map(({ transfertTotalHeures, stayDurations, ...item }) => ({ ...item, ...summarizeStays(stayDurations, item.sortiesPia), transfertMoyenHeures: item.transfertsMesures ? transfertTotalHeures / item.transfertsMesures : null })),
  };
}

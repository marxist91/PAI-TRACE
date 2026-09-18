import ExcelJS from 'exceljs';
import { normalizeManifestValue, terminalForRole } from './manifest-parser';

const empty = (value: string) => ['', 'NON', '-', 'N A'].includes(normalizeManifestValue(value));
const isTogo = (value: string) => ['TOGO', 'TG', 'TGO', 'REPUBLIQUE TOGOLAISE', 'REPUBLIQUE DU TOGO'].includes(normalizeManifestValue(value));

/** Read-only analysis of PIA transfer registers. It never creates a manifest or operation. */
export async function previewTransfers(buffer: Buffer, role: string, complete = false) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(new Uint8Array(buffer).buffer);
  const rows: Array<{
    sheet: string; line: number; navire: string; atp: string | null; dateReference: string | null;
    numeroConteneur: string; numeroBL: string | null; terminal: 'LCT' | 'TOGO' | null;
    datePrevuePia: null; dateDebarquement: string | null;
    dateSortieTerminal: string | null; dateEntreePia: string | null; dateSortiePia: string | null;
    paysDestination: string | null; typeMarchandise: string | null; statut: string;
    previsionTransfert: string | null; declaration: string | null; depote: string | null;
    action: 'ANALYSE' | 'IGNOREE'; issues: string[];
  }> = [];
  const sheets: Array<{ nom: string; lignes: number; entete: number }> = [];
  const seen = new Set<string>();
  let found = false;
  for (const sheet of workbook.worksheets) {
    let header = 0;
    let cols: Record<string, number> = {};
    for (let n = 1; n <= Math.min(sheet.rowCount, 30); n++) {
      const map: Record<string, number> = {};
      sheet.getRow(n).eachCell((cell, col) => { map[normalizeManifestValue(cell.text)] = col; });
      if (map['TCS EN TRANSIT SAHEL']) { header = n; cols = map; break; }
    }
    if (!header) continue;
    found = true;
    const metadata = Array.from({ length: header - 1 }, (_, i) => sheet.getRow(i + 1).getCell(1).text).join('\n');
    const atp = metadata.match(/\bATP\s*[:°]?\s*(\d+)/i)?.[1] ?? null;
    const arrival = metadata.match(/(?:ACOSTAGE\s*:|\bDU)\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    const dateReference = arrival ? new Date(Date.UTC(+arrival[3], +arrival[2] - 1, +arrival[1])).toISOString() : null;
    const navire = metadata.split('\n').find((s) => /^MSC\s/i.test(s.trim()))?.split(/\s+DU\b|\s*:\s*ATP/i)[0].trim() || sheet.name.trim();
    const context = normalizeManifestValue(`${metadata} ${sheet.name}`);
    const terminal = /\bLCT\b/.test(context) ? 'LCT' as const : /\bTOGO TERMINAL\b/.test(context) ? 'TOGO' as const : null;
    const start = rows.length;
    for (let n = header + 1; n <= sheet.rowCount; n++) {
      const row = sheet.getRow(n);
      const get = (...names: string[]) => {
        const col = names.map((name) => cols[name]).find(Boolean);
        return col ? row.getCell(col) : null;
      };
      const numeroConteneur = get('TCS EN TRANSIT SAHEL')?.text.replace(/\s/g, '').toUpperCase() ?? '';
      const ordinal = row.getCell(1).value;
      if (!numeroConteneur || (!/^[A-Z]{4}\d{7}$/.test(numeroConteneur) && typeof ordinal !== 'number')) continue;
      const issues: string[] = [];
      let excluded = false;
      const reject = (message: string) => { issues.push(message); excluded = true; };
      if (!/^[A-Z]{4}\d{7}$/.test(numeroConteneur)) reject('Numéro de conteneur invalide');
      const date = (label: string, ...names: string[]) => {
        const cell = get(...names);
        if (!cell || empty(cell.text)) return null;
        let value = cell.value;
        if (typeof value === 'number') value = new Date(Date.UTC(workbook.properties.date1904 ? 1904 : 1899, workbook.properties.date1904 ? 0 : 11, workbook.properties.date1904 ? 1 : 30) + value * 86400000);
        if (!(value instanceof Date) || !Number.isFinite(value.getTime())) { reject(`${label} : date illisible`); return null; }
        if (value.getTime() > Date.now()) reject(`${label} : événement réalisé daté dans le futur`);
        return value.toISOString();
      };
      const dateDebarquement = date('Vu à quai', 'VU A QUAI');
      const dateSortieTerminal = date('Sortie terminal', 'VU ENLEVE STOCK PAL TRANSFERT');
      const dateEntreePia = date('Entrée PIA', 'VU ENTREE STOCK PIA');
      const dateSortiePia = date('Sortie PIA', 'VU SORTI PIA');
      const events = [dateDebarquement, dateSortieTerminal, dateEntreePia, dateSortiePia];
      const dated = events.filter((v): v is string => Boolean(v));
      if (dated.some((value, i) => i > 0 && value < dated[i - 1])) reject('Chronologie incohérente entre les étapes');
      if ((dateSortiePia && !dateEntreePia) || (dateEntreePia && !dateSortieTerminal)) issues.push('Historique incomplet : une date antérieure manque');
      const rawCountry = get('DESTINATION')?.text.trim() ?? '';
      const paysDestination = empty(rawCountry) ? null : rawCountry;
      if (isTogo(rawCountry)) reject('Hors périmètre : pays de destination Togo');
      if (!paysDestination) issues.push('Pays de destination à confirmer');
      const forced = terminalForRole(role);
      if (!terminal) reject('Terminal non identifié dans la feuille');
      if (forced && terminal && forced !== terminal) reject('Terminal incompatible avec votre poste');
      if (seen.has(numeroConteneur)) reject('Doublon entre les lignes ou feuilles du fichier');
      seen.add(numeroConteneur);
      rows.push({ sheet: sheet.name, line: n, navire, atp, dateReference, numeroConteneur, numeroBL: null, terminal,
        datePrevuePia: null, dateDebarquement, dateSortieTerminal, dateEntreePia, dateSortiePia,
        paysDestination, typeMarchandise: null,
        statut: dateSortiePia ? 'SORTI_PIA' : dateEntreePia ? 'ENTRE_PIA' : dateSortieTerminal ? 'SORTI_TERMINAL' : dateDebarquement ? 'VU_A_QUAI' : 'A_CONFIRMER',
        previsionTransfert: get('PREVISION DU TRANSFERT PIA', 'PREVISION DU TRANSFERT')?.text.trim() || null,
        declaration: get('DECLARATION')?.text.trim() || null,
        depote: get('DEPOTE OUI NON', 'DEPOTE')?.text.trim() || null,
        action: excluded ? 'IGNOREE' : 'ANALYSE', issues });
    }
    sheets.push({ nom: sheet.name, lignes: rows.length - start, entete: header });
  }
  if (!found) return null;
  return {
    typeDocument: 'SUIVI_TRANSFERT' as const, lectureSeule: true,
    lignesTotal: rows.length, lignesValides: rows.filter((r) => r.action !== 'IGNOREE').length,
    lignesIgnorees: rows.filter((r) => r.action === 'IGNOREE').length,
    exclusionsTogo: rows.filter((r) => r.paysDestination && isTogo(r.paysDestination)).length,
    destinationsAConfirmer: rows.filter((r) => r.action !== 'IGNOREE' && !r.paysDestination).length,
    creations: 0, misesAJour: 0, colonnesReconnues: [], colonnesManquantes: [],
    feuilles: sheets, lignes: complete ? rows : rows.slice(0, 200), apercuLimite: !complete && rows.length > 200,
  };
}

import ExcelJS from 'exceljs';

const aliases = {
  atp: ['ATP', 'NUMERO ATP', 'N ATP'],
  numeroConteneur: ['NUMERO CONTENEUR', 'N CONTENEUR', 'CONTENEUR', 'CONTAINER NUMBER', 'CONTAINER NO'],
  numeroBL: ['BL', 'NUMERO BL', 'N BL', 'CONNAISSEMENT', 'BILL OF LADING'],
  terminal: ['TERMINAL', 'MANUTENTIONNAIRE', 'CHECKPOINT'],
  datePrevuePia: ['DATE PREVUE PIA', 'ARRIVEE PREVUE PIA', 'ETA PIA'],
  dateDebarquement: ['DATE DEBARQUEMENT', 'VU A QUAI', 'DATE VAQ', 'VAQ'],
  paysDestination: ['PAYS DESTINATION', 'PAYS DE DESTINATION', 'DESTINATION'],
  typeMarchandise: ['MARCHANDISE', 'TYPE MARCHANDISE', 'DESCRIPTION MARCHANDISE'],
  consignataire: ['CONSIGNATAIRE', 'COMPAGNIE MARITIME', 'ARMATEUR'],
} as const;

export type ManifestField = keyof typeof aliases;
export type ManifestTerminal = 'LCT' | 'TOGO';

export interface ParsedManifestRow {
  line: number;
  numeroConteneur: string | null;
  numeroBL: string | null;
  atp: string | null;
  terminalFromFile: ManifestTerminal | null;
  terminalAffecte: ManifestTerminal | null;
  datePrevuePia: Date | null;
  dateDebarquement: Date | null;
  paysDestination: string | null;
  typeMarchandise: string | null;
  consignataireNom: string | null;
  accepted: boolean;
  issues: string[];
}

export interface ParsedManifest {
  rows: ParsedManifestRow[];
  columns: Partial<Record<ManifestField, number>>;
  recognizedColumns: ManifestField[];
  missingColumns: ManifestField[];
}

export function normalizeManifestValue(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
}

export function terminalForRole(role: string): ManifestTerminal | null {
  if (role === 'CONTROLEUR_LCT') return 'LCT';
  if (role === 'CONTROLEUR_TOGO') return 'TOGO';
  return null;
}

function buildColumnMap(worksheet: ExcelJS.Worksheet) {
  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, column) => headers.set(normalizeManifestValue(cell.text), column));
  return Object.fromEntries(Object.entries(aliases).map(([field, names]) => {
    const column = names.map(normalizeManifestValue).map((name) => headers.get(name)).find(Boolean);
    return [field, column];
  })) as Partial<Record<ManifestField, number>>;
}

function textAt(row: ExcelJS.Row, column?: number) {
  return column ? row.getCell(column).text.trim() : '';
}

function dateAt(row: ExcelJS.Row, column?: number): Date | null {
  if (!column) return null;
  const value = row.getCell(column).value;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'number') return new Date(Date.UTC(1899, 11, 30) + value * 86_400_000);
  const text = row.getCell(column).text.trim();
  const french = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
  if (french) return new Date(Number(french[3]), Number(french[2]) - 1, Number(french[1]), Number(french[4] ?? 0), Number(french[5] ?? 0));
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function terminalValue(value: string): ManifestTerminal | null {
  const normalized = normalizeManifestValue(value);
  if (normalized.includes('LCT')) return 'LCT';
  if (normalized.includes('TOGO')) return 'TOGO';
  return null;
}

export async function parseManifest(buffer: Buffer, role: string): Promise<ParsedManifest> {
  const workbook = new ExcelJS.Workbook();
  const excelBytes = new Uint8Array(buffer);
  await workbook.xlsx.load(excelBytes.buffer);
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount < 2) throw new Error('Le fichier ne contient aucune ligne de manifeste');

  const columns = buildColumnMap(worksheet);
  if (!columns.numeroConteneur && !columns.numeroBL) throw new Error('Ajoutez une colonne Numéro conteneur ou B/L');

  const forcedTerminal = terminalForRole(role);
  const seenReferences = new Set<string>();
  const rows: ParsedManifestRow[] = [];

  for (let index = 2; index <= worksheet.rowCount; index += 1) {
    const row = worksheet.getRow(index);
    const numeroConteneur = textAt(row, columns.numeroConteneur).replace(/\s+/g, '').toUpperCase() || null;
    const numeroBL = textAt(row, columns.numeroBL) || numeroConteneur;
    const terminalText = textAt(row, columns.terminal);
    const terminalFromFile = terminalValue(terminalText);
    const terminalAffecte = forcedTerminal ?? terminalFromFile;
    const rawDatePrevue = textAt(row, columns.datePrevuePia);
    const rawDateDebarquement = textAt(row, columns.dateDebarquement);
    const datePrevuePia = dateAt(row, columns.datePrevuePia);
    const dateDebarquement = dateAt(row, columns.dateDebarquement);
    const issues: string[] = [];
    let accepted = true;

    if (!numeroBL) {
      issues.push('Numéro de conteneur ou B/L manquant');
      accepted = false;
    }
    if (!forcedTerminal && !terminalAffecte) {
      issues.push('Terminal LCT ou Togo Terminal requis');
      accepted = false;
    }
    if (forcedTerminal && terminalFromFile && terminalFromFile !== forcedTerminal) {
      issues.push(`Terminal incompatible avec le poste ${forcedTerminal}`);
      accepted = false;
    }
    if (rawDatePrevue && !datePrevuePia) {
      issues.push('Date prévue PIA illisible');
      accepted = false;
    }
    if (rawDateDebarquement && !dateDebarquement) {
      issues.push('Date de débarquement / VAQ illisible');
      accepted = false;
    }

    const referenceKey = numeroConteneur ? `CONTENEUR:${numeroConteneur}` : numeroBL ? `BL:${normalizeManifestValue(numeroBL)}` : null;
    if (referenceKey && seenReferences.has(referenceKey)) {
      issues.push('Doublon dans le fichier');
      accepted = false;
    } else if (referenceKey) {
      seenReferences.add(referenceKey);
    }

    const paysDestination = textAt(row, columns.paysDestination) || null;
    if (paysDestination && ['TOGO', 'TG', 'TGO', 'REPUBLIQUE TOGOLAISE', 'REPUBLIQUE DU TOGO'].includes(normalizeManifestValue(paysDestination))) {
      issues.push('Hors périmètre : pays de destination Togo (transit international uniquement)');
      accepted = false;
    }
    const typeMarchandise = textAt(row, columns.typeMarchandise) || null;
    if (accepted && !paysDestination) issues.push('Pays de destination à compléter');
    if (accepted && !typeMarchandise) issues.push('Marchandise à compléter');

    rows.push({
      line: index,
      numeroConteneur,
      numeroBL,
      atp: textAt(row, columns.atp) || null,
      terminalFromFile,
      terminalAffecte,
      datePrevuePia,
      dateDebarquement,
      paysDestination,
      typeMarchandise,
      consignataireNom: textAt(row, columns.consignataire) || null,
      accepted,
      issues,
    });
  }

  const recognizedColumns = (Object.keys(aliases) as ManifestField[]).filter((field) => Boolean(columns[field]));
  const missingColumns = (Object.keys(aliases) as ManifestField[]).filter((field) => !columns[field]);
  return { rows, columns, recognizedColumns, missingColumns };
}

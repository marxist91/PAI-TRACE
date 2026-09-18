import ExcelJS from 'exceljs';

export type OperationExportKind = 'activite' | 'attendus' | 'quai' | 'sorties-terminal' | 'entrees-pia' | 'sorties-pia' | 'registre-pia' | 'flux-pia' | 'sejours-pia';

export function exportDateFilter(kind: OperationExportKind, start: Date, end: Date) {
  const range = { gte: start, lt: end };
  if (kind === 'attendus') return { datePrevuePia: range };
  if (kind === 'quai') return { dateDebarquement: range };
  if (kind === 'sorties-terminal') return { dateSortieTerminal: range };
  if (kind === 'entrees-pia') return { dateEntreePia: range };
  if (kind === 'sorties-pia') return { dateSortiePia: range };
  if (kind === 'flux-pia') return { OR: [{ dateEntreePia: range }, { dateSortiePia: range }] };
  if (kind === 'sejours-pia') return { AND: [{ dateEntreePia: { lt: end } }, { OR: [{ dateSortiePia: null }, { dateSortiePia: { gte: start } }] }] };
  if (kind === 'registre-pia') return { OR: [{ dateSortieTerminal: range }, { dateEntreePia: range }, { dateSortiePia: range }] };
  return { OR: [{ datePrevuePia: range }, { dateDebarquement: range }, { dateSortieTerminal: range }, { dateEntreePia: range }, { dateSortiePia: range }] };
}

export interface OperationExportRow {
  numeroConteneur: string | null;
  numeroBL: string;
  atp: string | null;
  terminalAffecte: string | null;
  paysDestination: string | null;
  destination: string;
  typeMarchandise: string;
  statut: string;
  datePrevuePia: Date | null;
  dateDebarquement: Date | null;
  dateSortieTerminal: Date | null;
  dateEntreePia: Date | null;
  dateSortiePia: Date | null;
  updatedAt: Date;
}

const KIND_LABELS: Record<OperationExportKind, string> = {
  activite: 'Activité opérationnelle',
  'flux-pia': 'Entrées et sorties PIA',
  'sejours-pia': 'Séjours PIA — présence pendant la période',
  attendus: 'Conteneurs attendus par la PIA',
  quai: 'Vue à quai',
  'sorties-terminal': 'Sorties des terminaux',
  'entrees-pia': 'Entrées à la PIA',
  'sorties-pia': 'Sorties de la PIA',
  'registre-pia': 'Registre PIA',
};

const STATUS_LABELS: Record<string, string> = {
  ATTENDU_PIA: 'Attendu à la PIA',
  VU_A_QUAI: 'Vu à quai',
  SORTI_TERMINAL: 'Sorti du terminal',
  ENTRE_PIA: 'Entré à la PIA',
  SORTI_PIA: 'Sorti de la PIA',
};

export async function buildOperationsWorkbook(options: {
  kind: OperationExportKind;
  periodLabel: string;
  scopeLabel: string;
  start: Date;
  end: Date;
  rows: OperationExportRow[];
}) {
  const workbook = new ExcelJS.Workbook();
  const generatedAt = new Date();
  workbook.creator = 'PIA-TRACE';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Liste opérationnelle', {
    views: [{ state: 'frozen', ySplit: 5 }],
    properties: { defaultRowHeight: 22 },
  });

  sheet.mergeCells('A1:M1');
  sheet.getCell('A1').value = `PIA-TRACE — ${KIND_LABELS[options.kind]}`;
  sheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 18 };
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF061A38' } };
  sheet.getCell('A1').alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 34;

  sheet.mergeCells('A2:M2');
  sheet.getCell('A2').value = `${options.scopeLabel} • ${options.periodLabel} • ${options.rows.length} conteneur${options.rows.length > 1 ? 's' : ''}`;
  sheet.getCell('A2').font = { bold: true, color: { argb: 'FF061A38' }, size: 11 };
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4D80B' } };

  sheet.mergeCells('A3:M3');
  sheet.getCell('A3').value = `Période : ${options.start.toLocaleString('fr-FR')} — ${options.end.toLocaleString('fr-FR')} (fin exclue)`;
  sheet.getCell('A3').font = { italic: true, color: { argb: 'FF53657F' } };

  sheet.columns = [
    { key: 'conteneur', width: 19 }, { key: 'bl', width: 21 }, { key: 'atp', width: 17 },
    { key: 'terminal', width: 18 }, { key: 'pays', width: 21 }, { key: 'marchandise', width: 24 },
    { key: 'statut', width: 21 }, { key: 'prevue', width: 20 }, { key: 'quai', width: 20 },
    { key: 'sortieTerminal', width: 20 }, { key: 'entreePia', width: 20 }, { key: 'sortiePia', width: 20 },
    { key: 'sejour', width: 17 },
  ];

  const header = sheet.getRow(5);
  header.values = ['Conteneur', 'B/L', 'ATP', 'Terminal', 'Pays de destination', 'Marchandise', 'Statut', 'Prévu à la PIA', 'Vue à quai', 'Sortie terminal', 'Entrée PIA', 'Sortie PIA', 'Séjour (heures)'];
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17316B' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });

  for (const item of options.rows) {
    const end = item.dateSortiePia ?? generatedAt;
    const stayHours = item.dateEntreePia ? Math.max(0, (end.getTime() - item.dateEntreePia.getTime()) / 3_600_000) : null;
    const row = sheet.addRow({
      conteneur: item.numeroConteneur ?? '', bl: item.numeroBL, atp: item.atp ?? '',
      terminal: item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte ?? 'À préciser',
      pays: item.paysDestination ?? item.destination, marchandise: item.typeMarchandise,
      statut: STATUS_LABELS[item.statut] ?? item.statut,
      prevue: item.datePrevuePia, quai: item.dateDebarquement, sortieTerminal: item.dateSortieTerminal,
      entreePia: item.dateEntreePia, sortiePia: item.dateSortiePia, sejour: stayHours,
    });
    row.eachCell((cell, column) => {
      cell.alignment = { vertical: 'middle', wrapText: column === 6 };
      cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DDEA' } } };
      if (row.number % 2 === 0) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F7FB' } };
    });
  }

  for (let column = 8; column <= 12; column += 1) sheet.getColumn(column).numFmt = 'dd/mm/yyyy hh:mm';
  sheet.getColumn(13).numFmt = '0.00';
  sheet.mergeCells('A4:M4');
  sheet.getCell('A4').value = `Séjour total entrée → sortie ; en cours arrêté au ${generatedAt.toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC. 2,25 h = 2 h 15 min.`;
  sheet.getCell('A4').font = { italic: true, size: 10 };
  sheet.autoFilter = { from: 'A5', to: `M${Math.max(5, sheet.rowCount)}` };
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 };
  return workbook;
}

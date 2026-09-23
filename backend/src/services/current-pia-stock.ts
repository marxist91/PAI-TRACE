import ExcelJS from 'exceljs';
import { evaluateAnomaly } from './anomaly-rules';

export interface StockRow {
  id: number;
  numeroConteneur: string | null;
  numeroBL: string;
  terminalAffecte: string | null;
  paysDestination: string | null;
  dateEntreePia: Date | null;
  dateSortiePia: Date | null;
}
export type StockFilter = 'tous' | 'alertes' | 'critiques';

export function currentPiaStock(rows: StockRow[], thresholds: { warningAfterHours: number; criticalAfterHours: number }, now = new Date()) {
  const buckets = [
    { tranche: 'Jusqu’à 24 h', nombre: 0 }, { tranche: 'Plus de 24 à 72 h', nombre: 0 },
    { tranche: 'Plus de 72 h à 7 j', nombre: 0 }, { tranche: 'Plus de 7 j', nombre: 0 },
  ];
  const containers = rows.filter(row => row.dateEntreePia && row.dateEntreePia < now && (!row.dateSortiePia || row.dateSortiePia >= now)).map(row => {
    const hours = (now.getTime() - row.dateEntreePia!.getTime()) / 3_600_000;
    buckets[hours <= 24 ? 0 : hours <= 72 ? 1 : hours <= 168 ? 2 : 3]!.nombre++;
    const severity = evaluateAnomaly('ENTRE_PIA', hours, { ENTRE_PIA: thresholds })?.severity ?? 'normal';
    return { ...row, heuresSejour: hours, niveau: severity };
  }).sort((a, b) => b.heuresSejour - a.heuresSejour || a.id - b.id);
  const critical = containers.filter(row => row.niveau === 'critical').length;
  const warning = containers.filter(row => row.niveau === 'warning').length;
  return { arreteAu: now.toISOString(), seuils: thresholds, total: containers.length, alertes: warning, critiques: critical, sansAlerte: containers.length - warning - critical, repartition: buckets, conteneurs: containers };
}

export function filterStock(stock: ReturnType<typeof currentPiaStock>, filter: StockFilter) {
  return stock.conteneurs.filter(row => filter === 'tous' || (filter === 'critiques' ? row.niveau === 'critical' : row.niveau !== 'normal'));
}

export function buildCurrentStockWorkbook(stock: ReturnType<typeof currentPiaStock>, filter: StockFilter) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock actuel PIA', { views: [{ state: 'frozen', ySplit: 5 }] });
  sheet.columns = [24, 26, 22, 24, 25, 22, 22].map(width => ({ width }));
  sheet.getCell('A1').value = 'PIA-TRACE — Stock actuel PIA';
  sheet.getCell('A2').value = `Arrêté au ${stock.arreteAu} — hors filtre de période historique`;
  sheet.getCell('A3').value = `Filtre : ${filter} ; alerte dès ${stock.seuils.warningAfterHours} h ; critique dès ${stock.seuils.criticalAfterHours} h.`;
  sheet.getCell('A4').value = `${filterStock(stock, filter).length} conteneur(s) exporté(s), sur ${stock.total} présent(s) dans le périmètre autorisé.`;
  sheet.getRow(5).values = ['Conteneur', 'B/L', 'Terminal', 'Destination', 'Entrée PIA (UTC)', 'Séjour en cours (h)', 'Niveau'];
  sheet.getRow(5).height = 32;
  sheet.getRow(5).eachCell(cell => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17316B' } };
    cell.alignment = { wrapText: true, vertical: 'middle' };
  });
  for (const row of filterStock(stock, filter)) sheet.addRow([
    row.numeroConteneur ?? 'Non renseigné', row.numeroBL,
    row.terminalAffecte === 'TOGO' ? 'Togo Terminal' : row.terminalAffecte ?? 'Non renseigné',
    row.paysDestination ?? 'À confirmer', row.dateEntreePia, row.heuresSejour,
    row.niveau === 'critical' ? 'Critique' : row.niveau === 'warning' ? 'Alerte' : 'Sous le seuil',
  ]);
  sheet.getColumn(5).numFmt = 'dd/mm/yyyy hh:mm';
  sheet.getColumn(6).numFmt = '0.00';
  sheet.autoFilter = `A5:G${Math.max(5, sheet.rowCount)}`;
  return workbook;
}

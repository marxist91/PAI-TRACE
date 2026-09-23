import ExcelJS from 'exceljs';
import { operationStatistics } from './operation-statistics';

export function buildStatisticsWorkbook(stats: ReturnType<typeof operationStatistics>, start: Date, end: Date, scope: string, generatedAt = new Date()) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PIA-TRACE';
  workbook.created = generatedAt;
  const dateText = (date: Date) => date.toLocaleDateString('fr-FR', { timeZone: 'UTC' });
  const period = `${dateText(start)} au ${dateText(new Date(end.getTime() - 1))} — Lomé / UTC`;
  const sheet = (name: string, headers: string[], widths: number[]) => {
    const tab = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 5, showGridLines: false }] });
    tab.columns = widths.map(width => ({ width }));
    tab.getCell('A1').value = `PIA-TRACE — ${name}`;
    tab.getCell('A1').font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FF061A38' } };
    tab.getCell('A2').value = `${scope} — ${period}`;
    tab.getCell('A3').value = `Généré le ${generatedAt.toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC`;
    tab.getCell('A4').value = stats.stockDebut === null ? 'Période non commencée : stocks non disponibles.' : stats.periodeEnCours ? `Période en cours, arrêté au ${new Date(stats.arreteAu).toLocaleString('fr-FR', { timeZone: 'UTC' })} UTC.` : 'Période terminée. Stock historique distinct du stock actuel.';
    tab.getRow(5).values = headers;
    tab.getRow(5).height = 32;
    tab.getRow(5).eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF17316B' } };
      cell.alignment = { wrapText: true, vertical: 'middle' };
    });
    tab.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: '1:5' };
    return tab;
  };
  const summary = sheet('Synthèse', ['Indicateur', 'Valeur', 'Définition'], [39, 22, 90]);
  const entries = [
    ['Stock initial', stats.stockDebut ?? 'Non disponible', 'Présents juste avant le début de la période.'],
    ['Entrées PIA', stats.entreesPia, 'Entrées réalisées dans la période observée.'],
    ['Sorties PIA', stats.sortiesPia, 'Sorties réalisées dans la période observée.'],
    ['Stock final', stats.stockFin ?? 'Non disponible', 'Présents juste avant la fin exclusive ; à la date d’arrêté si période en cours.'],
    ['Écart de rapprochement', stats.ecartStock ?? 'Non disponible', 'Stock final − (stock initial + entrées − sorties). Tout écart nécessite un contrôle.'],
    ['Sorties terminal', stats.sortiesTerminal, 'Date de sortie du terminal dans la période observée.'],
    ['Séjour moyen terminé (heures)', stats.sejourMoyenHeures ?? 'Non disponible', 'Moyenne des durées valides des séjours terminés dans la période, depuis leur entrée réelle ; 2,25 h = 2 h 15 min.'],
    ['Présents actuellement', stats.enSejour, 'Stock à la génération du fichier, indépendamment de la période sélectionnée.'],
    ['Destinés PIA — registre du périmètre', stats.destinesPia, 'Conteneurs accessibles au rôle connecté et au terminal sélectionné, sans filtre de date.'],
    ['Transfert moyen terminal → PIA (heures)', stats.transfertMoyenHeures ?? 'Non disponible', 'Entrées PIA de la période avec sortie terminal renseignée et antérieure ou égale à l’entrée. Moyenne pondérée par le nombre de transferts.'],
    ['Transferts mesurés', stats.transfertsMesures, 'Nombre d’entrées PIA de la période avec un délai de transfert calculable.'],
    ['Transferts non mesurables', stats.transfertsNonMesurables, 'Entrées PIA de la période : date de sortie terminal manquante ou postérieure à l’entrée PIA.'],
    ['Séjours terminés mesurés', stats.sejoursMesures, 'Sorties PIA de la période avec entrée renseignée et antérieure ou égale à la sortie. Séjours en cours exclus.'],
    ['Séjours non mesurables', stats.sejoursNonMesurables, 'Sorties PIA de la période avec entrée manquante ou postérieure à la sortie ; exclues des calculs de durée.'],
    ['Séjour médian (heures)', stats.sejourMedianHeures ?? 'Non disponible', 'Valeur centrale des durées triées ; moyenne des deux valeurs centrales si le nombre de séjours mesurés est pair.'],
    ['Séjour le plus court (heures)', stats.sejourMinHeures ?? 'Non disponible', 'Minimum des durées valides des séjours terminés dans la période, entrée antérieure à la période admise.'],
    ['Séjour le plus long (heures)', stats.sejourMaxHeures ?? 'Non disponible', 'Maximum des durées valides des séjours terminés dans la période, entrée antérieure à la période admise.'],
  ];
  entries.forEach(row => summary.addRow(row));
  stats.sejoursParDuree.forEach(item => summary.addRow([
    `Séjours — ${item.tranche}`, item.nombre,
    'Nombre de séjours terminés mesurés dans la période. Borne supérieure incluse ; 7 jours = 168 h. Tranches descriptives, sans lien avec les seuils d’alerte.',
  ]));
  summary.getCell('B12').numFmt = '0.00';
  summary.getCell('B15').numFmt = '0.00';
  summary.getCell('B20').numFmt = '0.00';
  summary.getCell('B21').numFmt = '0.00';
  summary.getCell('B22').numFmt = '0.00';
  const daily = sheet('Mouvements quotidiens', ['Jour (UTC)', 'Entrées PIA', 'Sorties PIA', 'Stock début', 'Stock fin / arrêté', 'Écart de rapprochement', 'Arrêté exclusif (UTC)', 'Journée'], [26, 20, 20, 20, 23, 27, 27, 22]);
  stats.daily.forEach(day => daily.addRow([new Date(`${day.date}T00:00:00Z`), day.entrees, day.sorties, day.stockDebut, day.stockFin, day.ecartStock, new Date(day.arreteAu), day.partiel ? 'En cours' : 'Terminée']));
  daily.getColumn(1).numFmt = 'dd/mm/yyyy';
  daily.getColumn(7).numFmt = 'dd/mm/yyyy hh:mm:ss';
  daily.addRow(['Bilan période', stats.entreesPia, stats.sortiesPia, stats.stockDebut ?? 'Non disponible', stats.stockFin ?? 'Non disponible', stats.ecartStock ?? 'Non disponible']).font = { bold: true };
  const terminals = sheet('Terminaux', ['Terminal d’origine', 'Sorties terminal', 'Entrées PIA', 'Sorties PIA', 'Transferts mesurés', 'Non mesurables', 'Transfert moyen (heures)'], [28, 24, 24, 24, 24, 24, 28]);
  stats.byTerminal.forEach(item => terminals.addRow([item.terminal === 'TOGO' ? 'Togo Terminal' : item.terminal === 'LCT' ? 'LCT' : 'Non renseigné', item.sortiesTerminal, item.entreesPia, item.sortiesPia, item.transfertsMesures, item.transfertsNonMesurables, item.transfertMoyenHeures ?? 'Non disponible']));
  terminals.getColumn(7).numFmt = '0.00';
  terminals.addRow(['Total', stats.sortiesTerminal, stats.entreesPia, stats.sortiesPia, stats.transfertsMesures, stats.transfertsNonMesurables, stats.transfertMoyenHeures ?? 'Non disponible']).font = { bold: true };
  const countries = sheet('Destinations', ['Pays de destination', 'Entrées PIA', 'Sorties PIA', 'Part des sorties', 'Séjours mesurés', 'Séjours non mesurables', 'Séjour moyen (heures)'], [30, 20, 20, 23, 24, 27, 28]);
  countries.getCell('A4').value = 'Pays actuel du registre ; inconnus conservés. Chaque flux suit sa date ; moyenne sur les sorties avec durée valide. Données de test incluses si présentes.';
  stats.byDestination.forEach(item => countries.addRow([item.pays, item.entreesPia, item.sortiesPia, item.partSorties ?? 'Non disponible', item.sejoursMesures, item.sejoursNonMesurables, item.sejourMoyenHeures ?? 'Non disponible']));
  countries.addRow(['Total', stats.entreesPia, stats.sortiesPia, stats.sortiesPia ? 1 : 'Non disponible', stats.sejoursMesures, stats.sejoursNonMesurables, stats.sejourMoyenHeures ?? 'Non disponible']).font = { bold: true };
  countries.getColumn(4).numFmt = '0.0%';
  countries.getColumn(7).numFmt = '0.00';
  const stays = sheet('Séjours par terminal', ['Terminal d’origine', 'Sorties PIA', 'Séjours mesurés', 'Non mesurables', 'Moyenne (heures)', 'Médiane (heures)', 'Minimum (heures)', 'Maximum (heures)'], [26, 18, 22, 22, 23, 23, 23, 23]);
  stays.getCell('A4').value = 'Sorties PIA de la période ; durées complètes valides depuis l’entrée. Ensemble calculé sur les séjours individuels. Tests inclus si présents.';
  const stayValues = (item: typeof stats | typeof stats.byTerminal[number]) => [item.sortiesPia, item.sejoursMesures, item.sejoursNonMesurables, item.sejourMoyenHeures ?? 'Non disponible', item.sejourMedianHeures ?? 'Non disponible', item.sejourMinHeures ?? 'Non disponible', item.sejourMaxHeures ?? 'Non disponible'];
  stats.byTerminal.forEach(item => stays.addRow([item.terminal === 'TOGO' ? 'Togo Terminal' : item.terminal === 'LCT' ? 'LCT' : 'Non renseigné', ...stayValues(item)]));
  stays.addRow(['Ensemble', ...stayValues(stats)]).font = { bold: true };
  for (const column of [5, 6, 7, 8]) stays.getColumn(column).numFmt = '0.00';
  for (const tab of workbook.worksheets) {
    tab.eachRow((row, index) => {
      if (index <= 5) return;
      row.height = tab === summary ? 34 : 23;
      row.eachCell(cell => {
        cell.alignment = { vertical: 'middle', wrapText: tab === summary };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFD5DDEA' } } };
      });
    });
  }
  return workbook;
}

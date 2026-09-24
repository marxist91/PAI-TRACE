import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CurrentPiaStockPanel } from '../components/CurrentPiaStockPanel';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { operationPeriodLabel } from '../utils/operation-period';
import { ArrowCircleDown, ArrowCircleUp, ChartBar, Clock, DownloadSimple, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { operationService, type OperationPeriod, type OperationExportKind } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const transferLabel = (hours: number | null | undefined) => {
  if (hours == null) return 'Non disponible';
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`;
};

export default function RapportsPage() {
  const { user } = useAuth();
  const fixedTerminal = user?.role === 'CONTROLEUR_LCT' ? 'LCT' : user?.role === 'CONTROLEUR_TOGO' ? 'TOGO' : null;
  const [periode, setPeriode] = useState<OperationPeriod>('semaine');
  const [selectedTerminal, setTerminal] = useState<'TOUS' | 'LCT' | 'TOGO'>('TOUS');
  const terminal = fixedTerminal ?? selectedTerminal;
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportKind, setExportKind] = useState<OperationExportKind>(fixedTerminal ? 'sorties-terminal' : 'flux-pia');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const download = async (kind: OperationExportKind | 'statistiques' = exportKind) => {
    setExporting(true); setExportError('');
    try { await operationService.exportExcel(kind, periode, date, undefined, terminal); }
    catch { setExportError('Export impossible. Vérifiez votre connexion et réessayez.'); }
    finally { setExporting(false); }
  };
  const query = useQuery({ queryKey: ['operations', 'stats', periode, date, terminal], queryFn: () => operationService.getStats(periode, date, terminal) });
  const stats = query.data?.data.stats;
  const stayLabel = transferLabel(stats?.sejourMoyenHeures);
  const terminalData = stats?.byTerminal.map(item => ({ ...item, name: item.terminal === 'TOGO' ? 'Togo Terminal' : item.terminal === 'LCT' ? 'LCT' : 'Non renseigné' })) ?? [];
  const dailyData = stats?.daily.map(item => ({ ...item, jour: `${item.date.slice(8, 10)}/${item.date.slice(5, 7)}` })) ?? [];
  return <OpsPage>
    <OpsHeader title={fixedTerminal ? `Statistiques — ${fixedTerminal === 'TOGO' ? 'Togo Terminal' : 'LCT'}` : user?.role === 'AGENT_PIA' ? 'Statistiques PIA' : 'Statistiques opérationnelles'} subtitle={fixedTerminal ? 'Sorties de votre terminal et suivi des mêmes conteneurs à la PIA. Aucun conteneur de l’autre terminal n’est inclus.' : 'Entrées, sorties et séjours à la PIA. Moyenne des séjours terminés pendant la période, arrondie à la minute.'} actions={<><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} /></>} />
    <div className="ops-inline-actions">
      <label htmlFor="stats-terminal">Terminal d’origine</label>
      <select id="stats-terminal" className="ops-select" value={terminal} disabled={exporting || !!fixedTerminal} onChange={event => setTerminal(event.target.value as typeof terminal)}>
        {!fixedTerminal && <option value="TOUS">Tous les terminaux autorisés</option>}{(!fixedTerminal || fixedTerminal === 'LCT') && <option value="LCT">LCT</option>}{(!fixedTerminal || fixedTerminal === 'TOGO') && <option value="TOGO">Togo Terminal</option>}
      </select>
    </div>
    <p>Ce filtre s’applique aux indicateurs, au stock actuel et à tous les exports de cette page, dans la limite de vos droits.</p>
    <p>{operationPeriodLabel(periode, date)}{stats?.periodeEnCours ? ` — période en cours, arrêté au ${new Date(stats.arreteAu).toLocaleString('fr-FR', { timeZone: 'UTC' })}` : ''}</p>
    <OpsPanel title="Exporter les opérations" subtitle={exportKind === 'sejours-pia' ? 'Conteneurs présents à la PIA pendant la période. Durée totale du séjour, jusqu’à la sortie ou à la date de l’export si toujours présents.' : 'Opérations réalisées pendant la période sélectionnée. Les conteneurs seulement vus à quai sont exclus.'}>
      <div className="ops-inline-actions">
        <select className="ops-select" aria-label="Liste à exporter" value={exportKind} onChange={e => setExportKind(e.target.value as OperationExportKind)} disabled={exporting}>
          <option value="flux-pia">Entrées et sorties PIA</option>
          <option value="entrees-pia">Entrées PIA</option>
          <option value="sorties-pia">Sorties PIA</option>
          <option value="sejours-pia">Séjours PIA</option>
          <option value="sorties-terminal">Sorties des terminaux</option>
        </select>
        <button className="ops-button" type="button" disabled={exporting} onClick={() => download()}><DownloadSimple size={17} />{exporting ? 'Export en cours…' : 'Exporter Excel'}</button>
        <button className="ops-button" type="button" disabled={exporting || !stats || query.isError || query.isFetching} onClick={() => download('statistiques')}><DownloadSimple size={17} />Exporter la synthèse statistique</button>
      </div>
      {exportError && <p role="alert" className="ops-inline-alert ops-inline-alert-danger">{exportError}</p>}
    </OpsPanel>
    {query.isLoading ? <OpsPanel><OpsState icon={ChartBar} title="Calcul des indicateurs" /></OpsPanel> : query.isError ? <OpsPanel><OpsState icon={WarningCircle} title="Statistiques indisponibles" tone="danger" /><button type="button" className="ops-button" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Chargement…' : 'Réessayer les statistiques'}</button></OpsPanel> : <>
      <OpsMetricStrip items={[{ label: fixedTerminal ? 'Sorties terminal — période' : 'Destinés PIA — registre du périmètre', value: fixedTerminal ? stats?.sortiesTerminal ?? 0 : stats?.destinesPia ?? 0, icon: ShippingContainer }, { label: 'Entrées PIA — période', value: stats?.entreesPia ?? 0, icon: ArrowCircleDown }, { label: 'Sorties PIA — période', value: stats?.sortiesPia ?? 0, icon: ArrowCircleUp, tone: 'success' }, { label: 'Séjour moyen terminé', value: stayLabel, icon: Clock }]} />
      <OpsPanel title="Stock PIA de la période" subtitle="Reconstitué à partir des dates d’entrée et de sortie, indépendamment du statut actuel. Stock initial + entrées − sorties = stock final.">
        <OpsMetricStrip items={[
          { label: 'Présents au début', value: stats?.stockDebut ?? 'Non disponible', icon: ShippingContainer },
          { label: 'Variation du stock', value: stats?.stockDebut == null ? 'Non disponible' : `${(stats.entreesPia - stats.sortiesPia) > 0 ? '+' : ''}${stats.entreesPia - stats.sortiesPia}`, icon: ChartBar },
          { label: stats?.periodeEnCours ? 'Présents à la date d’arrêté' : 'Présents en fin de période', value: stats?.stockFin ?? 'Non disponible', icon: ShippingContainer },
        ]} />
        {stats?.ecartStock != null && stats.ecartStock !== 0 && <p role="alert">Écart de rapprochement : {stats.ecartStock} conteneur(s). Vérifier les dates d’entrée et de sortie manquantes ou incohérentes.</p>}
        <h3>Évolution du stock jour par jour</h3>
        <p>Conteneurs présents en fin de journée à Lomé (UTC). Pour aujourd’hui, le dernier point correspond à l’heure d’arrêté, pas à une prévision de fin de journée.</p>
        {dailyData.length ? <>
          <div className="ops-chart" role="img" aria-label="Évolution quotidienne du stock PIA. Les valeurs exactes sont disponibles dans le détail journalier ci-dessous.">
            <ResponsiveContainer width="100%" height="100%"><LineChart data={dailyData} margin={{ top: 12, right: 24, bottom: 8, left: 0 }} accessibilityLayer>
              <CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="jour" stroke="#8295b2" minTickGap={20} />
              <YAxis stroke="#8295b2" allowDecimals={false} domain={[0, 'auto']} />
              <Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} labelFormatter={(_label, payload) => { const day = payload?.[0]?.payload; return day ? `${day.jour}${day.partiel ? ' — en cours' : ' — fin de journée'}` : _label; }} />
              <Legend /><Line type="linear" dataKey="stockFin" name="Stock PIA (conteneurs)" stroke="#f4d80b" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            </LineChart></ResponsiveContainer>
          </div>
          {dailyData.some(day => day.ecartStock !== 0) && <p role="alert">Des écarts journaliers sont présents : consultez le détail avant d’interpréter cette évolution.</p>}
          <details><summary>Détail journalier du stock</summary><div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>Jour</th><th>Stock début</th><th>Entrées</th><th>Sorties</th><th>Stock fin / arrêté</th><th>Écart</th></tr></thead>
            <tbody>{dailyData.map(day => <tr key={day.date}><td>{day.jour}{day.partiel ? ' (en cours)' : ''}</td><td>{day.stockDebut}</td><td>{day.entrees}</td><td>{day.sorties}</td><td>{day.stockFin}</td><td>{day.ecartStock}</td></tr>)}</tbody>
          </table></div></details>
        </> : <OpsState icon={Clock} title="Période non commencée" />}
      </OpsPanel>
      <div className="ops-report-grid">
        <OpsPanel title="Comparaison des terminaux" subtitle="Chaque opération est comptée à sa propre date. Les volumes ne représentent pas nécessairement les mêmes conteneurs."><div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={terminalData} accessibilityLayer><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="name" stroke="#8295b2" /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Legend /><Bar dataKey="sortiesTerminal" name="Sorties terminal" fill="#f4d80b" /><Bar dataKey="entreesPia" name="Entrées PIA" fill="#3d8eff" /><Bar dataKey="sortiesPia" name="Sorties PIA" fill="#4ade80" /></BarChart></ResponsiveContainer></div></OpsPanel>
        <OpsPanel title="Entrées et sorties PIA par jour" subtitle="Dates des opérations en heure de Lomé (UTC). Les jours écoulés sans mouvement restent visibles.">{dailyData.length ? <div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={dailyData} accessibilityLayer><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="jour" stroke="#8295b2" minTickGap={20} /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Legend /><Bar dataKey="entrees" name="Entrées PIA" fill="#3d8eff" /><Bar dataKey="sorties" name="Sorties PIA" fill="#4ade80" /></BarChart></ResponsiveContainer></div> : <OpsState icon={Clock} title="Période non commencée" />}</OpsPanel>
      </div>
      <OpsPanel title="Détail des volumes par terminal" subtitle="Les totaux correspondent aux opérations de la période sélectionnée."><div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Terminal d’origine</th><th>Sorties terminal</th><th>Entrées PIA</th><th>Sorties PIA</th></tr></thead><tbody>{terminalData.map(item => <tr key={item.terminal}><td>{item.name}</td><td>{item.sortiesTerminal}</td><td>{item.entreesPia}</td><td>{item.sortiesPia}</td></tr>)}</tbody></table></div></OpsPanel>
      <OpsPanel title="Durées des séjours terminés" subtitle="Sorties PIA de la période : durée complète depuis l’entrée, même si elle précède la période. Les séjours encore en cours sont exclus.">
        <OpsMetricStrip items={[
          { label: 'Séjour médian', value: transferLabel(stats?.sejourMedianHeures), icon: Clock },
          { label: 'Séjour le plus court', value: transferLabel(stats?.sejourMinHeures), icon: Clock },
          { label: 'Séjour le plus long', value: transferLabel(stats?.sejourMaxHeures), icon: Clock },
        ]} />
        <p>{stats?.sejoursMesures ?? 0} séjour(s) mesuré(s) sur {stats?.sortiesPia ?? 0} sortie(s). La médiane partage les durées triées en deux moitiés ; avec un nombre pair, elle est la moyenne des deux valeurs centrales.</p>
        {!!stats?.sejoursNonMesurables && <p role="alert">{stats.sejoursNonMesurables} séjour(s) non mesurable(s) : date d’entrée manquante ou postérieure à la sortie. Exclus des durées, mais conservés dans le nombre de sorties.</p>}
        <h3>Séjours par terminal d’origine</h3>
        <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Terminal</th><th>Mesurés / sorties</th><th>Non mesurables</th><th>Moyenne</th><th>Médiane</th><th>Minimum</th><th>Maximum</th></tr></thead>
          <tbody>{terminalData.map(item => <tr key={item.terminal}><td>{item.name}</td><td>{item.sejoursMesures} / {item.sortiesPia}</td><td>{item.sejoursNonMesurables}</td><td>{transferLabel(item.sejourMoyenHeures)}</td><td>{transferLabel(item.sejourMedianHeures)}</td><td>{transferLabel(item.sejourMinHeures)}</td><td>{transferLabel(item.sejourMaxHeures)}</td></tr>)}</tbody>
          <tfoot><tr><th>Ensemble</th><td>{stats?.sejoursMesures ?? 0} / {stats?.sortiesPia ?? 0}</td><td>{stats?.sejoursNonMesurables ?? 0}</td><td>{stayLabel}</td><td>{transferLabel(stats?.sejourMedianHeures)}</td><td>{transferLabel(stats?.sejourMinHeures)}</td><td>{transferLabel(stats?.sejourMaxHeures)}</td></tr></tfoot>
        </table></div>
        <p>Durées passées à la PIA, regroupées par terminal d’origine, et non temps de transfert. L’ensemble est calculé sur les séjours individuels, pas sur les moyennes ou médianes des terminaux.</p>
        <h3>Répartition par durée</h3>
        <p>Nombre de séjours mesurés par tranche, borne supérieure incluse. 7 jours = 168 h. Ces tranches ne sont pas des seuils d’alerte.</p>
        {stats?.sejoursMesures ? <div className="ops-chart" role="img" aria-label={`Répartition des ${stats.sejoursMesures} séjours terminés : ${stats.sejoursParDuree.map(item => `${item.tranche} : ${item.nombre}`).join(' ; ')}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.sejoursParDuree} layout="vertical" margin={{ top: 8, right: 36, bottom: 8, left: 8 }} accessibilityLayer>
              <CartesianGrid stroke="#233957" horizontal={false} />
              <XAxis type="number" stroke="#8295b2" allowDecimals={false} />
              <YAxis type="category" dataKey="tranche" width={145} stroke="#8295b2" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} cursor={{ fill: '#17316b' }} />
              <Bar dataKey="nombre" name="Séjours terminés" fill="#3d8eff" barSize={28}>
                <LabelList dataKey="nombre" position="right" fill="#e2e8f0" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div> : <OpsState icon={Clock} title="Aucun séjour terminé mesurable sur cette période" />}
      </OpsPanel>
      <OpsPanel title="Délai de transfert terminal → PIA" subtitle="Entrées PIA de la période : durée entre la sortie du terminal et l’entrée à la PIA, même si le départ précède la période. Dates manquantes ou inversées exclues de la moyenne.">
        <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Terminal d’origine</th><th>Transferts mesurés</th><th>Non mesurables</th><th>Délai moyen</th></tr></thead>
          <tbody>{terminalData.map(item => <tr key={item.terminal}><td>{item.name}</td><td>{item.transfertsMesures}</td><td>{item.transfertsNonMesurables}</td><td>{transferLabel(item.transfertMoyenHeures)}</td></tr>)}</tbody>
          <tfoot><tr><th>Ensemble</th><td>{stats?.transfertsMesures ?? 0}</td><td>{stats?.transfertsNonMesurables ?? 0}</td><td>{transferLabel(stats?.transfertMoyenHeures)}</td></tr></tfoot>
        </table></div>
      </OpsPanel>
      <OpsPanel title="Répartition par pays de destination" subtitle="Pays actuellement renseigné dans le registre. Entrées et sorties comptées chacune à leur date dans la période ; les pays inconnus restent « À confirmer ».">
        {stats?.byDestination?.length ? <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Pays</th><th>Entrées PIA</th><th>Sorties PIA</th><th>Part des sorties</th><th>Séjours mesurés / sorties</th><th>Séjour moyen terminé</th></tr></thead>
          <tbody>{stats.byDestination.map(item => <tr key={item.pays}><td>{item.pays}</td><td>{item.entreesPia}</td><td>{item.sortiesPia}</td><td>{item.partSorties == null ? 'Non disponible' : `${(item.partSorties * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} %`}</td><td>{item.sejoursMesures} / {item.sortiesPia}</td><td>{transferLabel(item.sejourMoyenHeures)}</td></tr>)}</tbody>
          <tfoot><tr><th>Ensemble</th><td>{stats.entreesPia}</td><td>{stats.sortiesPia}</td><td>{stats.sortiesPia ? '100 %' : 'Non disponible'}</td><td>{stats.sejoursMesures} / {stats.sortiesPia}</td><td>{stayLabel}</td></tr></tfoot>
        </table></div> : <OpsState icon={ChartBar} title="Aucune entrée ni sortie PIA sur cette période" />}
        <p>Part calculée sur toutes les sorties, y compris les destinations à confirmer. Moyenne sur les séjours terminés mesurables uniquement. Disponible dans l’onglet Destinations de la synthèse Excel.</p>
      </OpsPanel>
      <OpsPanel title="Lecture de la période" subtitle="Volumes de la période ; stock présent calculé à ce jour">
        <div className="ops-exception-summary"><div><ArrowCircleUp size={23} /><span>Sorties terminaux</span><strong>{stats?.sortiesTerminal ?? 0}</strong></div><div><ArrowCircleDown size={23} /><span>Entrées PIA</span><strong>{stats?.entreesPia ?? 0}</strong></div><div><ShippingContainer size={23} /><span>Présents à la PIA actuellement</span><strong>{stats?.enSejour ?? 0}</strong></div></div>
      </OpsPanel>
    </>}
    <CurrentPiaStockPanel terminal={terminal} />
  </OpsPage>;
}

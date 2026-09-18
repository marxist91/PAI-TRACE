import { useState } from 'react';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowCircleDown, ArrowCircleUp, ChartBar, Clock, DownloadSimple, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { operationService, type OperationPeriod, type OperationExportKind } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

export default function RapportsPage() {
  const [periode, setPeriode] = useState<OperationPeriod>('semaine');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exportKind, setExportKind] = useState<OperationExportKind>('flux-pia');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const download = async () => {
    setExporting(true); setExportError('');
    try { await operationService.exportExcel(exportKind, periode, date); }
    catch { setExportError('Export impossible. Vérifiez votre connexion et réessayez.'); }
    finally { setExporting(false); }
  };
  const query = useQuery({ queryKey: ['operations', 'stats', periode, date], queryFn: () => operationService.getStats(periode, date) });
  const stats = query.data?.data.stats;
  const minutes = Math.round((stats?.sejourMoyenHeures ?? 0) * 60);
  const stayLabel = stats?.sortiesPia ? `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min` : 'Non disponible';
  const terminalData = [{ name: 'LCT', sorties: stats?.sortiesLct ?? 0 }, { name: 'Togo Terminal', sorties: stats?.sortiesTogo ?? 0 }];
  const piaData = [{ name: 'Entrées', volume: stats?.entreesPia ?? 0 }, { name: 'Sorties', volume: stats?.sortiesPia ?? 0 }];
  return <OpsPage>
    <OpsHeader title="Statistiques opérationnelles" subtitle="Entrées, sorties et séjours à la PIA. Moyenne des séjours terminés pendant la période, arrondie à la minute." actions={<><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} /></>} />
    <OpsPanel title="Exporter les opérations" subtitle={exportKind === 'sejours-pia' ? 'Conteneurs présents à la PIA pendant la période. Durée totale du séjour, jusqu’à la sortie ou à la date de l’export si toujours présents.' : 'Opérations réalisées pendant la période sélectionnée. Les conteneurs seulement vus à quai sont exclus.'}>
      <div className="ops-inline-actions">
        <select className="ops-select" aria-label="Liste à exporter" value={exportKind} onChange={e => setExportKind(e.target.value as OperationExportKind)} disabled={exporting}>
          <option value="flux-pia">Entrées et sorties PIA</option>
          <option value="entrees-pia">Entrées PIA</option>
          <option value="sorties-pia">Sorties PIA</option>
          <option value="sejours-pia">Séjours PIA</option>
          <option value="sorties-terminal">Sorties des terminaux</option>
        </select>
        <button className="ops-button" type="button" disabled={exporting} onClick={download}><DownloadSimple size={17} />{exporting ? 'Export en cours…' : 'Exporter Excel'}</button>
      </div>
      {exportError && <p role="alert" className="ops-inline-alert ops-inline-alert-danger">{exportError}</p>}
    </OpsPanel>
    {query.isLoading ? <OpsPanel><OpsState icon={ChartBar} title="Calcul des indicateurs" /></OpsPanel> : query.isError ? <OpsPanel><OpsState icon={WarningCircle} title="Statistiques indisponibles" tone="danger" /></OpsPanel> : <>
      <OpsMetricStrip items={[{ label: 'Destinés PIA — registre complet', value: stats?.destinesPia ?? 0, icon: ShippingContainer }, { label: 'Entrées PIA — période', value: stats?.entreesPia ?? 0, icon: ArrowCircleDown }, { label: 'Sorties PIA — période', value: stats?.sortiesPia ?? 0, icon: ArrowCircleUp, tone: 'success' }, { label: 'Séjour moyen terminé', value: stayLabel, icon: Clock }]} />
      <div className="ops-report-grid">
        <OpsPanel title="Sorties des checkpoints" subtitle="Comparaison LCT et Togo Terminal"><div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={terminalData}><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="name" stroke="#8295b2" /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Bar dataKey="sorties" fill="#f4d80b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></OpsPanel>
        <OpsPanel title="Flux au port sec PIA" subtitle="Entrées et sorties pendant la période choisie"><div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={piaData}><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="name" stroke="#8295b2" /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Bar dataKey="volume" fill="#3d8eff" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></OpsPanel>
      </div>
      <OpsPanel title="Lecture de la période" subtitle="Volumes de la période ; stock présent calculé à ce jour">
        <div className="ops-exception-summary"><div><ArrowCircleUp size={23} /><span>Sorties terminaux</span><strong>{stats?.sortiesTerminal ?? 0}</strong></div><div><ArrowCircleDown size={23} /><span>Entrées PIA</span><strong>{stats?.entreesPia ?? 0}</strong></div><div><ShippingContainer size={23} /><span>Présents à la PIA actuellement</span><strong>{stats?.enSejour ?? 0}</strong></div></div>
      </OpsPanel>
    </>}
  </OpsPage>;
}

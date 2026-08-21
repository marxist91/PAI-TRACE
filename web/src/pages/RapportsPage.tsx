import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Anchor, ArrowCircleDown, ArrowCircleUp, ChartBar, Clock, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { operationService, type OperationPeriod } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

export default function RapportsPage() {
  const [periode, setPeriode] = useState<OperationPeriod>('semaine');
  const query = useQuery({ queryKey: ['operations', 'stats', periode], queryFn: () => operationService.getStats(periode) });
  const stats = query.data?.data.stats;
  const terminalData = [{ name: 'LCT', sorties: stats?.sortiesLct ?? 0 }, { name: 'Togo Terminal', sorties: stats?.sortiesTogo ?? 0 }];
  const piaData = [{ name: 'Entrées', volume: stats?.entreesPia ?? 0 }, { name: 'Sorties', volume: stats?.sortiesPia ?? 0 }, { name: 'En séjour', volume: stats?.enSejour ?? 0 }];
  return <OpsPage>
    <OpsHeader title="Statistiques opérationnelles" subtitle="Mesurez les volumes aux checkpoints et le temps de séjour réel à la PIA." actions={<select className="ops-select" value={periode} onChange={(e) => setPeriode(e.target.value as OperationPeriod)}><option value="jour">Aujourd’hui</option><option value="semaine">Cette semaine</option><option value="mois">Ce mois</option></select>} />
    {query.isLoading ? <OpsPanel><OpsState icon={ChartBar} title="Calcul des indicateurs" /></OpsPanel> : query.isError ? <OpsPanel><OpsState icon={WarningCircle} title="Statistiques indisponibles" tone="danger" /></OpsPanel> : <>
      <OpsMetricStrip items={[{ label: 'Attendus PIA', value: stats?.attendus ?? 0, icon: ShippingContainer }, { label: 'Vus à quai', value: stats?.vusAQuai ?? 0, icon: Anchor }, { label: 'Sorties PIA', value: stats?.sortiesPia ?? 0, icon: ArrowCircleUp, tone: 'success' }, { label: 'Séjour moyen', value: `${Math.round((stats?.sejourMoyenHeures ?? 0) / 24 * 10) / 10} j`, icon: Clock }]} />
      <div className="ops-report-grid">
        <OpsPanel title="Sorties des checkpoints" subtitle="Comparaison LCT et Togo Terminal"><div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={terminalData}><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="name" stroke="#8295b2" /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Bar dataKey="sorties" fill="#f4d80b" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></OpsPanel>
        <OpsPanel title="Flux au port sec PIA" subtitle="Entrées, sorties et conteneurs encore en séjour"><div className="ops-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={piaData}><CartesianGrid stroke="#233957" vertical={false} /><XAxis dataKey="name" stroke="#8295b2" /><YAxis stroke="#8295b2" allowDecimals={false} /><Tooltip contentStyle={{ background: '#081b36', border: '1px solid #3a5072' }} /><Bar dataKey="volume" fill="#3d8eff" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer></div></OpsPanel>
      </div>
      <OpsPanel title="Lecture de la période" subtitle="Indicateurs de conversion du flux">
        <div className="ops-exception-summary"><div><ArrowCircleUp size={23} /><span>Sorties terminaux</span><strong>{stats?.sortiesTerminal ?? 0}</strong></div><div><ArrowCircleDown size={23} /><span>Entrées PIA</span><strong>{stats?.entreesPia ?? 0}</strong></div><div><ShippingContainer size={23} /><span>Présents à la PIA</span><strong>{stats?.enSejour ?? 0}</strong></div></div>
      </OpsPanel>
    </>}
  </OpsPage>;
}

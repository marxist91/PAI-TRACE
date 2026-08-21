import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Anchor, ArrowCircleDown, ArrowCircleUp, Clock, FileXls, ShippingContainer, Warehouse, WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { operationService, type OperationPeriod } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

export default function PilotagePage() {
  const [periode, setPeriode] = useState<OperationPeriod>('jour');
  const statsQuery = useQuery({ queryKey: ['operations', 'stats', periode], queryFn: () => operationService.getStats(periode), refetchInterval: 30_000 });
  const expectedQuery = useQuery({ queryKey: ['operations', 'attendus', periode], queryFn: () => operationService.getExpected(periode), refetchInterval: 30_000 });
  const stats = statsQuery.data?.data.stats;
  const attendus = expectedQuery.data?.data.conteneurs ?? [];
  return <OpsPage>
    <OpsHeader title="Pilotage des flux port–PIA" subtitle="Du manifeste à la sortie PIA, avec traçabilité des dates enregistrées par chaque poste." actions={<><select className="ops-select" value={periode} onChange={(event) => setPeriode(event.target.value as OperationPeriod)}><option value="jour">Aujourd’hui</option><option value="semaine">Cette semaine</option><option value="mois">Ce mois</option></select><Link className="ops-button ops-button-primary" to="/manifestes"><FileXls size={17} />Importer un manifeste</Link></>} />
    {statsQuery.isError ? <OpsPanel><OpsState icon={WarningCircle} title="Les indicateurs ne sont pas disponibles" tone="danger" /></OpsPanel> : <>
      <OpsMetricStrip items={[{ label: 'Attendus PIA', value: stats?.attendus ?? 0, icon: ShippingContainer }, { label: 'Vus à quai', value: stats?.vusAQuai ?? 0, icon: Anchor }, { label: 'Sorties terminaux', value: stats?.sortiesTerminal ?? 0, icon: ArrowCircleUp }, { label: 'Entrées PIA', value: stats?.entreesPia ?? 0, icon: ArrowCircleDown, tone: 'success' }]} />
      <div className="ops-report-grid">
        <OpsPanel title="Activité des terminaux" subtitle="Attendus PIA et sorties confirmées sur la période">
          <div className="ops-flow-comparison"><div><span>Attendus depuis LCT</span><strong>{stats?.attendusLct ?? 0}</strong><i style={{ width: `${Math.min(100, ((stats?.attendusLct ?? 0) / Math.max(1, stats?.attendus ?? 1)) * 100)}%` }} /></div><div><span>Attendus depuis Togo Terminal</span><strong>{stats?.attendusTogo ?? 0}</strong><i style={{ width: `${Math.min(100, ((stats?.attendusTogo ?? 0) / Math.max(1, stats?.attendus ?? 1)) * 100)}%` }} /></div><div><span>Sorties LCT</span><strong>{stats?.sortiesLct ?? 0}</strong><i style={{ width: `${Math.min(100, ((stats?.sortiesLct ?? 0) / Math.max(1, stats?.sortiesTerminal ?? 1)) * 100)}%` }} /></div><div><span>Sorties Togo Terminal</span><strong>{stats?.sortiesTogo ?? 0}</strong><i style={{ width: `${Math.min(100, ((stats?.sortiesTogo ?? 0) / Math.max(1, stats?.sortiesTerminal ?? 1)) * 100)}%` }} /></div></div>
        </OpsPanel>
        <OpsPanel title="Situation PIA" subtitle="Stock et performance de séjour">
          <div className="ops-kpi-focus"><Warehouse size={34} weight="duotone" /><div><span>Conteneurs actuellement en séjour</span><strong>{stats?.enSejour ?? 0}</strong></div><div><span>Temps moyen avant sortie</span><strong>{Math.round((stats?.sejourMoyenHeures ?? 0) / 24 * 10) / 10} j</strong></div></div>
        </OpsPanel>
      </div>
      <OpsPanel title={`Conteneurs attendus — ${periode}`} subtitle="Prévisions issues du dernier manifeste importé" action={<Link to="/pia">Voir le registre PIA</Link>}>
        {expectedQuery.isLoading ? <OpsState icon={Clock} title="Chargement des prévisions" /> : !attendus.length ? <OpsState icon={ShippingContainer} title="Aucun conteneur attendu sur la période" description="Importez un manifeste ou changez la période d’affichage." /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Conteneur</th><th>B/L · ATP</th><th>Terminal</th><th>Arrivée prévue PIA</th><th>Destination</th><th>Statut</th></tr></thead><tbody>{attendus.slice(0, 12).map((item) => <tr key={item.id}><td><Link to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link></td><td>{item.numeroBL}<small>{item.atp || 'ATP non renseigné'}</small></td><td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte || 'À préciser'}</td><td>{item.datePrevuePia ? new Date(item.datePrevuePia).toLocaleString('fr-FR') : '—'}</td><td>{item.paysDestination || item.destination}</td><td>{item.statut.replaceAll('_', ' ')}</td></tr>)}</tbody></table></div>}
      </OpsPanel>
    </>}
  </OpsPage>;
}

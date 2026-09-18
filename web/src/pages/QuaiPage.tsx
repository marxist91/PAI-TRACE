import { useState } from 'react';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { useQuery } from '@tanstack/react-query';
import { Anchor, CalendarDots, CheckCircle, DownloadSimple, FileXls, ShippingContainer, Truck, WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { operationService, type OperationPeriod } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';

export default function QuaiPage() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState<OperationPeriod>('jour');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const query = useQuery({ queryKey: ['operations', 'quai', periode, date], queryFn: () => operationService.getQuay(periode, date) });
  const statsQuery = useQuery({ queryKey: ['operations', 'stats', periode, date, user?.role], queryFn: () => operationService.getStats(periode, date) });
  const rows = query.data?.data.conteneurs ?? [];
  const stats = statsQuery.data?.data.stats;
  const lct = rows.filter((item) => item.terminalAffecte === 'LCT').length;
  const togo = rows.filter((item) => item.terminalAffecte === 'TOGO').length;
  const isTerminal = user?.role === 'CONTROLEUR_LCT' || user?.role === 'CONTROLEUR_TOGO';
  const terminalName = user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : 'LCT';
  const terminalMetrics = [
    { label: `Débarqués ${terminalName}`, value: rows.length, icon: Anchor },
    { label: 'Destinés PIA — registre complet', value: stats?.destinesPia ?? 0, icon: CalendarDots },
    { label: 'Sorties enregistrées', value: stats?.sortiesTerminal ?? 0, icon: Truck, tone: 'warning' as const },
    { label: 'Entrés à la PIA', value: stats?.entreesPia ?? 0, icon: CheckCircle, tone: 'success' as const },
  ];
  const consolidatedMetrics = [{ label: 'Débarqués', value: rows.length, icon: Anchor }, { label: 'Affectés LCT', value: lct, icon: ShippingContainer }, { label: 'Affectés Togo Terminal', value: togo, icon: ShippingContainer }, { label: 'Terminal à préciser', value: rows.length - lct - togo, icon: CalendarDots, tone: 'warning' as const }];
  return <OpsPage>
    <OpsHeader title={isTerminal ? `Vue à quai ${terminalName}` : 'Vue à quai'} subtitle={isTerminal ? `Conteneurs de ${terminalName} uniquement, selon la date VAQ du manifeste.` : 'Vue consolidée des conteneurs débarqués à LCT et Togo Terminal.'} actions={<>{isTerminal && <Link className="ops-button ops-button-primary" to="/manifestes"><FileXls size={17} /> Importer mon manifeste</Link>}<button className="ops-button" type="button" onClick={() => operationService.exportExcel('quai', periode, date)}><DownloadSimple size={17} /> Exporter Excel</button><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} /></>} />
    <OpsMetricStrip items={isTerminal ? terminalMetrics : consolidatedMetrics} />
    <OpsPanel title="Liste des conteneurs reçus" subtitle="Source : date de débarquement ou Vu à quai du manifeste">
      {query.isLoading ? <OpsState icon={Anchor} title="Chargement de la vue à quai" /> : query.isError ? <OpsState icon={WarningCircle} title="Données indisponibles" tone="danger" /> : !rows.length ? <OpsState icon={CheckCircle} title="Aucun débarquement sur la période" tone="success" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Conteneur</th><th>B/L · ATP</th><th>Terminal</th><th>Débarquement / VAQ</th><th>Destination</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td><Link to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link></td><td>{item.numeroBL}<small>{item.atp || 'ATP non renseigné'}</small></td><td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte || 'À préciser'}</td><td>{item.dateDebarquement ? new Date(item.dateDebarquement).toLocaleString('fr-FR') : '—'}</td><td>{item.paysDestination || item.destination}</td></tr>)}</tbody></table></div>}
    </OpsPanel>
  </OpsPage>;
}

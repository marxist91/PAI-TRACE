import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowClockwise,
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  MagnifyingGlass,
  Warning,
  WarningCircle,
} from '@phosphor-icons/react';
import { anomalyService } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const severityLabel = { critical: 'Critique', warning: 'Attention', info: 'À vérifier' };

function formatDuration(hours: number) {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}

export default function AnomaliesPage() {
  const [search, setSearch] = useState('');
  const [severity, setSeverity] = useState('');
  const query = useQuery({
    queryKey: ['anomalies', search, severity],
    queryFn: () => anomalyService.getAll({ search: search || undefined, severity: severity || undefined, limit: 80 }),
    refetchInterval: 30_000,
  });
  const anomalies = query.data?.data.anomalies ?? [];
  const stats = query.data?.data.stats ?? { total: 0, critical: 0, warning: 0, info: 0 };

  return (
    <OpsPage>
      <OpsHeader title="Centre des anomalies" subtitle="Détection et priorisation des conteneurs qui nécessitent une intervention" actions={<button className="ops-button" onClick={() => query.refetch()}><ArrowClockwise size={15} className={query.isFetching ? 'animate-spin' : ''} /> Actualiser</button>} />

      <OpsMetricStrip items={[
        { label: 'Anomalies actives', value: stats.total, icon: Warning },
        { label: 'Critiques', value: stats.critical, icon: WarningCircle, tone: 'danger' },
        { label: 'À traiter', value: stats.warning, icon: Clock, tone: 'warning' },
        { label: 'À vérifier', value: stats.info, icon: Info },
      ]} />

      <div className="ops-toolbar">
        <div className="ops-search"><MagnifyingGlass size={15} /><input className="ops-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Conteneur, B/L, ATP ou destination" aria-label="Rechercher une anomalie" /></div>
        <div className="ops-filter-bar">
          {[['', 'Toutes'], ['critical', 'Critiques'], ['warning', 'Attention'], ['info', 'À vérifier']].map(([value, label]) => <button key={value || 'all'} className={severity === value ? 'active' : ''} onClick={() => setSeverity(value)}>{label}</button>)}
        </div>
      </div>

      <OpsPanel title="File de traitement" subtitle="Priorité calculée selon l’étape et le temps d’immobilisation">
        {query.isLoading ? <OpsState icon={Warning} title="Analyse des anomalies" /> :
          query.isError ? <OpsState icon={WarningCircle} title="Anomalies indisponibles" description="La connexion aux données a échoué." tone="danger" /> :
          anomalies.length === 0 ? <OpsState icon={CheckCircle} title="Aucune anomalie dans cette catégorie" description="Les opérations correspondantes sont à jour." tone="success" /> :
          <div className="ops-table-wrap"><table className="ops-table" style={{ minWidth: 980 }}>
            <thead><tr><th>Priorité</th><th>Conteneur / B/L</th><th>Cause détectée</th><th>Dernier point</th><th>Temps / seuil</th><th>Action</th></tr></thead>
            <tbody>{anomalies.map((item) => <tr key={item.id}>
              <td><span className={`ops-severity ops-severity-${item.severity}`}>{item.severity === 'critical' ? <WarningCircle size={13} weight="fill" /> : item.severity === 'warning' ? <Warning size={13} weight="fill" /> : <Info size={13} weight="fill" />}{severityLabel[item.severity]}</span></td>
              <td><Link className="ops-mono" to={`/conteneurs/${item.conteneur.id}`}>{item.conteneur.numeroConteneur || item.conteneur.numeroBL}</Link><small>B/L {item.conteneur.numeroBL} · {item.conteneur.paysDestination || item.conteneur.destination}</small></td>
              <td><strong>{item.title}</strong><small>{item.description}</small></td>
              <td>{item.lastCheckpoint?.lieu || 'Aucun checkpoint'}<small>{item.lastCheckpoint?.type?.replaceAll('_', ' ') || 'Étape initiale'}</small></td>
              <td><strong className="ops-mono">{formatDuration(item.hoursOpen)}</strong><small>Seuil {formatDuration(item.thresholdHours)}</small></td>
              <td><Link className="ops-button" to={`/conteneurs/${item.conteneur.id}`}>Traiter <ArrowRight size={13} /></Link></td>
            </tr>)}</tbody>
          </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

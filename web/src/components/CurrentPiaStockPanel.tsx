import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, DownloadSimple, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { operationService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { OpsMetricStrip, OpsPanel, OpsState } from './OperationsUI';

export function CurrentPiaStockPanel({ terminal = 'TOUS' }: { terminal?: 'TOUS' | 'LCT' | 'TOGO' }) {
  const { user } = useAuth();
  const canExit = !!user && ['ADMIN', 'LOGISTICIEN', 'AGENT_PIA'].includes(user.role);
  const [filter, setFilter] = useState('tous');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['operations', 'stock-actuel', terminal], queryFn: () => operationService.getCurrentStock(terminal), refetchInterval: 60_000 });
  const stock = query.data?.data.stock;
  const rows = stock?.conteneurs.filter(row => filter === 'tous' || (filter === 'critiques' ? row.niveau === 'critical' : row.niveau !== 'normal')) ?? [];
  const download = async () => {
    setExporting(true); setError('');
    try { await operationService.exportExcel('stock-actuel', 'jour', undefined, filter, terminal); }
    catch { setError('Export du stock impossible. Réessayez.'); }
    finally { setExporting(false); }
  };
  return <OpsPanel title="Stock actuel PIA — séjours en cours" subtitle="Terminal sélectionné, indépendamment de la période historique. Présence calculée à partir des dates d’entrée et de sortie, actualisée chaque minute.">
    {query.isLoading ? <OpsState icon={Clock} title="Chargement du stock actuel" /> : query.isError || !stock ? <><OpsState icon={WarningCircle} title="Stock actuel indisponible" tone="danger" /><button type="button" className="ops-button" disabled={query.isFetching} onClick={() => void query.refetch()}>{query.isFetching ? 'Chargement…' : 'Réessayer le stock actuel'}</button></> : <>
      <p>Arrêté au {new Date(stock.arreteAu).toLocaleString('fr-FR', { timeZone: 'UTC' })} (Lomé). Alerte dès {stock.seuils.warningAfterHours} h, critique dès {stock.seuils.criticalAfterHours} h.</p>
      <OpsMetricStrip items={[
        { label: 'Présents actuellement', value: stock.total, icon: ShippingContainer },
        { label: 'Sous le seuil', value: stock.sansAlerte, icon: Clock },
        { label: 'Alerte hors critiques', value: stock.alertes, icon: WarningCircle, tone: 'warning' },
        { label: 'Critiques', value: stock.critiques, icon: WarningCircle, tone: 'danger' },
      ]} />
      <div className="ops-table-wrap"><table className="ops-table"><caption>Ancienneté de tous les séjours en cours (bornes supérieures incluses)</caption><thead><tr>{stock.repartition.map(item => <th key={item.tranche}>{item.tranche}</th>)}</tr></thead><tbody><tr>{stock.repartition.map(item => <td key={item.tranche}>{item.nombre}</td>)}</tr></tbody></table></div>
      <div className="ops-inline-actions">
        <select className="ops-select" aria-label="Filtrer le stock actuel" value={filter} onChange={event => setFilter(event.target.value)} disabled={exporting}>
          <option value="tous">Tous les présents</option><option value="alertes">En alerte, critiques inclus</option><option value="critiques">Critiques uniquement</option>
        </select>
        <button type="button" className="ops-button" onClick={download} disabled={exporting || query.isFetching}><DownloadSimple size={17} />{exporting ? 'Export en cours…' : 'Exporter le stock filtré'}</button>
      </div>
      {error && <p role="alert">{error}</p>}
      <p>{rows.length} conteneur(s) dans cette liste, les plus anciens en premier. Les compteurs ci-dessus portent sur le stock autorisé du terminal sélectionné, avant filtrage des alertes.</p>
      {rows.length ? <div className="ops-table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}><table className="ops-table"><thead><tr><th>Conteneur / B/L</th><th>Terminal</th><th>Entrée PIA (UTC)</th><th>Séjour en cours</th><th>Niveau</th>{canExit && <th>Action</th>}</tr></thead><tbody>{rows.map(row => {
        const minutes = Math.floor(row.heuresSejour * 60);
        return <tr key={row.id}><td><Link to={`/conteneurs/${row.id}`}>{row.numeroConteneur ?? 'Ouvrir la fiche'}</Link><small>{row.numeroBL}</small></td><td>{row.terminalAffecte === 'TOGO' ? 'Togo Terminal' : row.terminalAffecte ?? 'Non renseigné'}</td><td>{new Date(row.dateEntreePia).toLocaleString('fr-FR', { timeZone: 'UTC' })}</td><td>{Math.floor(minutes / 60)} h {String(minutes % 60).padStart(2, '0')} min</td><td>{row.niveau === 'critical' ? 'Critique' : row.niveau === 'warning' ? 'Alerte' : 'Sous le seuil'}</td>{canExit && <td><Link className="ops-button ops-button-primary" to={`/conteneurs/${row.id}?action=sortie-pia#operation`}>Enregistrer la sortie</Link></td>}</tr>;
      })}</tbody></table></div> : <OpsState icon={ShippingContainer} title="Aucun conteneur pour ce filtre" />}
    </>}
  </OpsPanel>;
}

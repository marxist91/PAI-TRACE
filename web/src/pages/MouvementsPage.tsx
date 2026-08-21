import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowClockwise,
  ArrowsLeftRight,
  CheckCircle,
  ClockCounterClockwise,
  MagnifyingGlass,
  MapPin,
  Package,
  UserCircle,
  WarningCircle,
} from '@phosphor-icons/react';
import { mouvementService } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const actionLabels: Record<string, string> = {
  IMPORT_MANIFESTE: 'Import du manifeste',
  VUE_A_QUAI: 'Vue à quai confirmée',
  SORTIE_TERMINAL: 'Sortie du terminal',
  ENTREE_PIA: 'Entrée à la PIA',
  SORTIE_PIA: 'Sortie de la PIA',
  MISE_A_JOUR_STATUT: 'Mise à jour du statut',
};

const roleLabels: Record<string, string> = {
  LOGISTICIEN: 'Logisticien PAL',
  CONTROLEUR_LCT: 'Agent LCT',
  CONTROLEUR_TOGO: 'Agent Togo Terminal',
  AGENT_PIA: 'Agent PIA',
};

function formatAction(action: string) {
  return actionLabels[action] ?? action.replaceAll('_', ' ').toLocaleLowerCase('fr-FR').replace(/^./, (letter) => letter.toUpperCase());
}

export default function MouvementsPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const query = useQuery({
    queryKey: ['mouvements', search, action],
    queryFn: () => mouvementService.getAll({ search: search || undefined, action: action || undefined, limit: 80 }),
  });

  const mouvements = query.data?.data.mouvements ?? [];
  const stats = query.data?.data.stats ?? [];
  const total = query.data?.data.total ?? 0;
  const actors = new Set(mouvements.map((item) => item.user.id)).size;
  const locations = new Set(mouvements.map((item) => item.checkpoint?.lieu).filter(Boolean)).size;

  return (
    <OpsPage>
      <OpsHeader title="Journal des mouvements" subtitle="Traçabilité des validations du manifeste jusqu’à la sortie de la PIA" actions={<button className="ops-button" onClick={() => query.refetch()}><ArrowClockwise size={15} className={query.isFetching ? 'animate-spin' : ''} /> Actualiser</button>} />

      <OpsMetricStrip items={[
        { label: 'Mouvements', value: total, icon: ClockCounterClockwise },
        { label: 'Types d’opération', value: stats.length, icon: ArrowsLeftRight, tone: 'warning' },
        { label: 'Sites concernés', value: locations, icon: MapPin },
        { label: 'Agents actifs', value: actors, icon: UserCircle, tone: 'success' },
      ]} />

      <div className="ops-toolbar">
        <div className="ops-search"><MagnifyingGlass size={15} /><input className="ops-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Conteneur, lieu ou agent" aria-label="Rechercher un mouvement" /></div>
        <select className="ops-select" style={{ width: 240 }} value={action} onChange={(event) => setAction(event.target.value)} aria-label="Filtrer par opération">
          <option value="">Toutes les opérations</option>
          {stats.map((item) => <option key={item.action} value={item.action}>{formatAction(item.action)} ({item.count})</option>)}
        </select>
      </div>

      <OpsPanel title="Historique opérationnel" subtitle="Les événements les plus récents apparaissent en premier">
        {query.isLoading ? <OpsState icon={ClockCounterClockwise} title="Chargement du journal" /> :
          query.isError ? <OpsState icon={WarningCircle} title="Journal indisponible" description="La connexion aux mouvements a échoué." tone="danger" /> :
          mouvements.length === 0 ? <OpsState icon={CheckCircle} title="Aucun mouvement trouvé" description="Modifiez la recherche ou le type d’opération." tone="success" /> :
          <div className="ops-table-wrap"><table className="ops-table" style={{ minWidth: 980 }}>
            <thead><tr><th>Opération</th><th>Conteneur</th><th>Point de contrôle</th><th>Agent responsable</th><th>Date et heure</th><th>Action</th></tr></thead>
            <tbody>{mouvements.map((item) => <tr key={item.id}>
              <td><strong>{formatAction(item.action)}</strong><small>{item.details || 'Opération validée'}</small></td>
              <td><Link className="ops-mono" to={`/conteneurs/${item.conteneur.id}`}>{item.conteneur.numeroConteneur || item.conteneur.numeroBL}</Link><small>B/L {item.conteneur.numeroBL} · {item.conteneur.paysDestination || item.conteneur.destination}</small></td>
              <td>{item.checkpoint?.lieu || 'Non renseigné'}<small>{item.checkpoint?.type?.replaceAll('_', ' ')}</small></td>
              <td>{item.user.prenom} {item.user.nom}<small>{roleLabels[item.user.role] || 'Agent opérationnel'}</small></td>
              <td className="ops-mono">{new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
              <td><Link className="ops-button" to={`/conteneurs/${item.conteneur.id}`}><Package size={13} /> Ouvrir</Link></td>
            </tr>)}</tbody>
          </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

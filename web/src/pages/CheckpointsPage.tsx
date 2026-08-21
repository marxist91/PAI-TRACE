import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Anchor, ArrowClockwise, CheckCircle, FileXls, MapPin, ShippingContainer, Truck, WarningCircle } from '@phosphor-icons/react';
import { checkpointService, conteneurService } from '../services/api';
import { StatusChip } from '../components/StatusChip';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';

export default function CheckpointsPage() {
  const { user } = useAuth();
  const conteneursQuery = useQuery({ queryKey: ['conteneurs'], queryFn: () => conteneurService.getAll() });
  const checkpointsQuery = useQuery({ queryKey: ['checkpoints'], queryFn: () => checkpointService.getRecent(24) });
  const conteneurs = conteneursQuery.data?.data.conteneurs ?? [];
  const checkpoints = checkpointsQuery.data?.data.checkpoints ?? [];
  const vusAQuai = conteneurs.filter((item) => item.statut === 'VU_A_QUAI').length;
  const sortiesLct = conteneurs.filter((item) => item.terminalAffecte === 'LCT' && item.dateSortieTerminal).length;
  const sortiesTogo = conteneurs.filter((item) => item.terminalAffecte === 'TOGO' && item.dateSortieTerminal).length;
  const versPia = conteneurs.filter((item) => item.statut === 'SORTI_TERMINAL').length;
  const recusPia = conteneurs.filter((item) => ['ENTRE_PIA', 'SORTI_PIA'].includes(item.statut)).length;
  const isTerminal = user?.role === 'CONTROLEUR_LCT' || user?.role === 'CONTROLEUR_TOGO';
  const terminalName = user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : 'LCT';
  const terminalSorties = terminalName === 'LCT' ? sortiesLct : sortiesTogo;
  const terminalMetrics = [
    { label: 'Vus à quai', value: vusAQuai, icon: ShippingContainer },
    { label: `Sorties ${terminalName}`, value: terminalSorties, icon: Anchor, tone: 'warning' as const },
    { label: 'En route vers la PIA', value: versPia, icon: Truck },
    { label: 'Reçus à la PIA', value: recusPia, icon: MapPin, tone: 'success' as const },
  ];
  const consolidatedMetrics = [
    { label: 'Vus à quai', value: vusAQuai, icon: ShippingContainer },
    { label: 'Sorties LCT', value: sortiesLct, icon: Anchor, tone: 'warning' as const },
    { label: 'Sorties Togo Terminal', value: sortiesTogo, icon: Anchor },
    { label: 'En route vers la PIA', value: versPia, icon: Truck, tone: 'success' as const },
  ];
  const isLoading = conteneursQuery.isLoading || checkpointsQuery.isLoading;
  const isError = conteneursQuery.isError || checkpointsQuery.isError;

  return (
    <OpsPage>
      <OpsHeader title={isTerminal ? `Sorties ${terminalName}` : 'Sorties des terminaux'} subtitle={isTerminal ? `File autonome ${terminalName}. Aucun volume de l’autre terminal n’est affiché.` : 'Vue consolidée des sorties LCT et Togo Terminal vers la PIA.'} actions={<>{isTerminal && <Link className="ops-button ops-button-primary" to="/manifestes"><FileXls size={16} /> Importer mon manifeste</Link>}<button className="ops-button" onClick={() => void Promise.all([conteneursQuery.refetch(), checkpointsQuery.refetch()])}><ArrowClockwise size={15} className={conteneursQuery.isFetching || checkpointsQuery.isFetching ? 'animate-spin' : ''} /> Actualiser</button></>} />
      <OpsMetricStrip items={isTerminal ? terminalMetrics : consolidatedMetrics} />
      <OpsPanel title="Parcours de contrôle" subtitle="Position actuelle des conteneurs entre le manifeste et la réception à la PIA">
        <div className="ops-stage-lane">
          {[
            { title: 'Manifeste', value: conteneurs.length, icon: ShippingContainer, note: 'unités enregistrées' },
            { title: 'Vue à quai', value: vusAQuai, icon: Anchor, note: 'unités débarquées' },
            { title: isTerminal ? `Sortie ${terminalName}` : 'Sortie terminal', value: isTerminal ? terminalSorties : sortiesLct + sortiesTogo, icon: Truck, note: isTerminal ? `sorties enregistrées par ${terminalName}` : 'sorties LCT ou Togo Terminal' },
            { title: 'Entrée PIA', value: recusPia, icon: MapPin, note: 'unités reçues à la PIA' },
          ].map(({ title, value, icon: StageIcon, note }) => <div className="ops-stage" key={title}><span><StageIcon size={22} weight="duotone" /></span><div><strong>{title}</strong><b>{value.toLocaleString('fr-FR')}</b><small>{note}</small></div></div>)}
        </div>
      </OpsPanel>
      <OpsPanel title="File des sorties" subtitle={`${checkpoints.length} validations enregistrées au cours des dernières 24 heures`}>
        {isLoading ? <OpsState icon={ShippingContainer} title="Chargement des sorties" /> : isError ? <OpsState icon={WarningCircle} title="Sorties indisponibles" description="Les données des terminaux ne peuvent pas être chargées." tone="danger" /> : conteneurs.length === 0 ? <OpsState icon={CheckCircle} title="Aucun conteneur en file" description="Importez un manifeste pour démarrer le parcours." tone="success" /> : <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Conteneur</th><th>B/L · ATP</th><th>Terminal</th><th>Vue à quai</th><th>Statut</th><th>Action</th></tr></thead>
          <tbody>{conteneurs.slice(0, 12).map((item) => <tr key={item.id}>
            <td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link><small>Unité suivie</small></td>
            <td>{item.numeroBL}<small>{item.atp || 'ATP non renseigné'}</small></td>
            <td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte || 'À préciser'}</td>
            <td className="ops-mono">{item.dateDebarquement ? new Date(item.dateDebarquement).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'En attente'}</td>
            <td><StatusChip statut={item.statut} /></td>
            <td><Link className="ops-button" to={`/conteneurs/${item.id}`}>Contrôler <CheckCircle size={13} /></Link></td>
          </tr>)}</tbody>
        </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Anchor,
  ArrowRight,
  CheckCircle,
  Clock,
  Crane,
  FileXls,
  HouseLine,
  ShippingContainer,
  Truck,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { conteneurService, mouvementService, operationService, type Role } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { StatusChip } from '../components/StatusChip';

type OperationalRole = Extract<Role, 'CONTROLEUR_LCT' | 'CONTROLEUR_TOGO' | 'AGENT_PIA'>;

const roleConfig: Record<OperationalRole, {
  title: string;
  subtitle: string;
  context: string;
  queueTitle: string;
  queueSubtitle: string;
  checkpoint: string;
  icon: Icon;
  activeStatuses: string[];
}> = {
  CONTROLEUR_LCT: {
    title: 'Poste de contrôle LCT',
    subtitle: 'Enregistrez la sortie des conteneurs affectés à LCT.',
    context: 'File opérationnelle LCT, séparée de Togo Terminal',
    queueTitle: 'File LCT',
    queueSubtitle: 'Conteneurs attendus ou présents au terminal LCT',
    checkpoint: 'LCT',
    icon: Crane,
    activeStatuses: ['ATTENDU_PIA', 'VU_A_QUAI'],
  },
  CONTROLEUR_TOGO: {
    title: 'Poste Togo Terminal',
    subtitle: 'Enregistrez la sortie des conteneurs affectés à Togo Terminal.',
    context: 'File opérationnelle Togo Terminal, séparée de LCT',
    queueTitle: 'File Togo Terminal',
    queueSubtitle: 'Conteneurs attendus ou présents à Togo Terminal',
    checkpoint: 'Togo Terminal',
    icon: Anchor,
    activeStatuses: ['ATTENDU_PIA', 'VU_A_QUAI'],
  },
  AGENT_PIA: {
    title: 'Réception PIA',
    subtitle: 'Enregistrez les entrées, le séjour et les sorties du port sec PIA.',
    context: 'Périmètre des unités en route vers la PIA ou déjà réceptionnées',
    queueTitle: 'À valider immédiatement',
    queueSubtitle: 'Dernières sorties LCT et Togo Terminal reçues en temps réel',
    checkpoint: 'PIA - Port sec',
    icon: HouseLine,
    activeStatuses: ['SORTI_TERMINAL', 'ENTRE_PIA'],
  },
};

export default function OperationalDashboardPage() {
  const { user } = useAuth();
  const role = user!.role as OperationalRole;
  const config = roleConfig[role];
  const RoleIcon = config.icon;
  const containersQuery = useQuery({ queryKey: ['conteneurs', 'operational-home', role], queryFn: () => conteneurService.getAll() });
  const movementsQuery = useQuery({ queryKey: ['mouvements', 'operational-home', role], queryFn: () => mouvementService.getAll({ limit: 6 }) });
  const statsQuery = useQuery({ queryKey: ['operations', 'stats', 'jour', role], queryFn: () => operationService.getStats('jour') });
  const containers = containersQuery.data?.data.conteneurs ?? [];
  const movements = movementsQuery.data?.data.mouvements ?? [];
  const stats = statsQuery.data?.data.stats;
  const active = containers
    .filter((item) => config.activeStatuses.includes(item.statut))
    .sort((left, right) => {
      if (role !== 'AGENT_PIA') return 0;
      if (left.statut === right.statut) {
        return new Date(right.updatedAt || right.dateSortieTerminal || right.dateEntreePia || 0).getTime()
          - new Date(left.updatedAt || left.dateSortieTerminal || left.dateEntreePia || 0).getTime();
      }
      return left.statut === 'SORTI_TERMINAL' ? -1 : 1;
    });
  const isTerminal = role === 'CONTROLEUR_LCT' || role === 'CONTROLEUR_TOGO';
  const metricItems = isTerminal ? [
    { label: 'Conteneurs suivis', value: containers.length, icon: ShippingContainer },
    { label: 'Vus à quai aujourd’hui', value: stats?.vusAQuai ?? 0, icon: Anchor },
    { label: 'Sorties enregistrées', value: stats?.sortiesTerminal ?? 0, icon: Truck, tone: 'warning' as const },
    { label: 'Attendus par la PIA', value: stats?.attendus ?? 0, icon: HouseLine, tone: 'success' as const },
  ] : [
    { label: 'En route vers la PIA', value: active.filter((item) => item.statut === 'SORTI_TERMINAL').length, icon: Truck, tone: 'warning' as const },
    { label: 'Entrées aujourd’hui', value: stats?.entreesPia ?? 0, icon: HouseLine },
    { label: 'En séjour', value: stats?.enSejour ?? 0, icon: Clock, tone: 'warning' as const },
    { label: 'Sorties aujourd’hui', value: stats?.sortiesPia ?? 0, icon: CheckCircle, tone: 'success' as const },
  ];
  const isLoading = containersQuery.isLoading || movementsQuery.isLoading || statsQuery.isLoading;
  const isError = containersQuery.isError || movementsQuery.isError || statsQuery.isError;

  return <OpsPage>
    <OpsHeader title={config.title} subtitle={config.subtitle} actions={isTerminal ? <Link className="ops-button ops-button-primary" to="/manifestes"><FileXls size={17} /> Importer mon manifeste</Link> : <Link className="ops-button ops-button-primary" to="/pia">Ouvrir le registre PIA</Link>} />

    <section className="role-context-band">
      <span><RoleIcon size={24} weight="duotone" /></span>
      <div><small>Checkpoint autorisé</small><strong>{config.checkpoint}</strong></div>
      <p>{config.context}</p>
    </section>

    <OpsMetricStrip items={metricItems} />

    <div className="operational-dashboard-grid">
      <OpsPanel title={config.queueTitle} subtitle={config.queueSubtitle} action={<Link to="/conteneurs" className="ops-button">Toute la file</Link>}>
        {isLoading ? <OpsState icon={config.icon} title="Chargement de la file" />
          : isError ? <OpsState icon={WarningCircle} title="File indisponible" tone="danger" />
            : active.length === 0 ? <OpsState icon={CheckCircle} title="Aucune unité à traiter" description="La file de votre checkpoint est à jour." />
              : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Conteneur / B/L</th><th>ATP</th><th>Terminal</th><th>Statut</th><th>Action</th></tr></thead><tbody>
                {active.slice(0, 8).map((item) => {
                  const isExpectedAtPia = role === 'AGENT_PIA' && item.statut === 'SORTI_TERMINAL';
                  return <tr key={item.id}><td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link><small>{item.numeroBL}</small></td><td>{item.atp || 'Non renseigné'}</td><td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : 'LCT'}</td><td>{isExpectedAtPia ? <span className="status-chip status-warning"><Clock size={13} /> Attendu à la PIA</span> : <StatusChip statut={item.statut} />}</td><td><Link className="ops-button ops-button-primary" to={`/conteneurs/${item.id}`}>{isExpectedAtPia ? 'Enregistrer l’entrée' : 'Traiter'} <ArrowRight size={13} /></Link></td></tr>;
                })}
              </tbody></table></div>}
      </OpsPanel>

      <OpsPanel title="Dernières validations" subtitle="Actions enregistrées dans votre périmètre">
        {isLoading ? <OpsState icon={Clock} title="Chargement du journal" />
          : movements.length === 0 ? <OpsState icon={Clock} title="Aucune validation récente" />
            : <div className="client-activity-list">{movements.map((item) => <Link to={`/conteneurs/${item.conteneur.id}`} key={item.id}><span><CheckCircle size={18} weight="duotone" /></span><div><strong>{item.conteneur.numeroBL}</strong><p>{item.checkpoint.lieu} - {item.action.replaceAll('_', ' ').toLocaleLowerCase('fr-FR')}</p><small>{new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small></div><ArrowRight size={15} /></Link>)}</div>}
      </OpsPanel>
    </div>
  </OpsPage>;
}

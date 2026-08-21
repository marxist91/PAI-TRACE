import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Anchor,
  ArrowClockwise,
  ArrowRight,
  CaretRight,
  CheckCircle,
  Clock,
  Crane,
  ShippingContainer,
  Truck,
  Warehouse,
  Warning,
  WarningCircle,
  type Icon,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { StatusChip } from '../components/StatusChip';
import {
  anomalyService,
  conteneurService,
  mouvementService,
  type Anomaly,
} from '../services/api';

const TERMINAL_STATUSES = ['EN_TRANSIT_VERS_TERMINAL', 'AU_TERMINAL', 'DECHARGE_SOUS_PALAN'];
const PIA_STATUSES = ['EN_TRANSIT_VERS_PIA', 'ARRIVE_PIA', 'STOCKE_PIA', 'DOUANE', 'LIVRE'];

const severityConfig: Record<Anomaly['severity'], { label: string; icon: Icon; className: string }> = {
  critical: { label: 'Critique', icon: WarningCircle, className: 'text-[#ff5f68] border-[#ff5f68]/35' },
  warning: { label: 'À traiter', icon: Warning, className: 'text-[#f3c400] border-[#f3c400]/35' },
  info: { label: 'À vérifier', icon: Clock, className: 'text-[#5e9cff] border-[#5e9cff]/35' },
};

function formatDuration(hours: number) {
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return `${days} j ${hours % 24} h`;
}

function Metric({ label, value, icon: MetricIcon, tone = 'brand' }: { label: string; value: number; icon: Icon; tone?: 'brand' | 'danger' }) {
  return (
    <div className="command-metric">
      <span className={tone === 'danger' ? 'command-metric-icon command-metric-icon-danger' : 'command-metric-icon'}>
        <MetricIcon size={24} weight="duotone" />
      </span>
      <div>
        <p>{label}</p>
        <strong className={tone === 'danger' ? 'text-[#ff676f]' : ''}>{value.toLocaleString('fr-FR')}</strong>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const conteneursQuery = useQuery({
    queryKey: ['conteneurs'],
    queryFn: () => conteneurService.getAll(),
    retry: 3,
    refetchInterval: 30_000,
  });
  const mouvementsQuery = useQuery({
    queryKey: ['mouvements', 'dashboard'],
    queryFn: () => mouvementService.getAll({ limit: 5 }),
    retry: 3,
    refetchInterval: 30_000,
  });
  const anomaliesQuery = useQuery({
    queryKey: ['anomalies', 'dashboard'],
    queryFn: () => anomalyService.getAll({ limit: 5 }),
    retry: 3,
    refetchInterval: 30_000,
  });

  const conteneurs = conteneursQuery.data?.data.conteneurs ?? [];
  const mouvements = mouvementsQuery.data?.data.mouvements ?? [];
  const anomalies = anomaliesQuery.data?.data.anomalies ?? [];
  const anomalyStats = anomaliesQuery.data?.data.stats ?? { total: 0, critical: 0, warning: 0, info: 0 };

  const enTransit = conteneurs.filter((item) =>
    ['EN_TRANSIT_VERS_TERMINAL', 'EN_TRANSIT_VERS_PIA'].includes(item.statut),
  ).length;
  const sousPalan = conteneurs.filter((item) => item.statut === 'DECHARGE_SOUS_PALAN').length;
  const arrivesPIA = conteneurs.filter((item) =>
    ['ARRIVE_PIA', 'STOCKE_PIA', 'DOUANE', 'LIVRE'].includes(item.statut),
  ).length;
  const chezConsignataire = conteneurs.filter((item) =>
    ['EN_ATTENTE', 'CHEZ_CONSIGNATAIRE'].includes(item.statut),
  ).length;
  const auTerminal = conteneurs.filter((item) => TERMINAL_STATUSES.includes(item.statut)).length;
  const versPIA = conteneurs.filter((item) => PIA_STATUSES.includes(item.statut)).length;

  const isLoading = conteneursQuery.isLoading || mouvementsQuery.isLoading || anomaliesQuery.isLoading;
  const hasError = conteneursQuery.isError || mouvementsQuery.isError || anomaliesQuery.isError;

  useEffect(() => {
    document.documentElement.dataset.apiState = hasError ? 'offline' : 'online';
    return () => { delete document.documentElement.dataset.apiState; };
  }, [hasError]);

  return (
    <div className="command-page">
      {hasError && (
        <div className="command-error" role="alert">
          <div><strong>Connexion aux données interrompue</strong><span>Nouvelle tentative automatique dans quelques secondes.</span></div>
          <button onClick={() => void Promise.all([conteneursQuery.refetch(), mouvementsQuery.refetch(), anomaliesQuery.refetch()])}>
            <ArrowClockwise size={15} /> Réessayer
          </button>
        </div>
      )}

      <section className="command-metrics" aria-label="Indicateurs opérationnels">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, index) => <div key={index} className="command-metric-skeleton" />)
        ) : (
          <>
            <Metric label="En transit" value={enTransit} icon={Truck} />
            <Metric label="Arrivés à la PIA" value={arrivesPIA} icon={CheckCircle} />
            <Metric label="Déchargés sous palan" value={sousPalan} icon={Crane} />
            <Metric label="Anomalies actives" value={anomalyStats.total} icon={WarningCircle} tone="danger" />
          </>
        )}
      </section>

      <section className="command-grid">
        <article className="command-panel command-corridor" aria-label="Carte du flux des conteneurs">
          <div className="corridor-canvas">
            <div className="corridor-title"><h2>Flux des conteneurs</h2><p>{conteneurs.length.toLocaleString('fr-FR')} conteneurs suivis</p></div>
            <svg className="corridor-path" viewBox="0 0 1000 500" preserveAspectRatio="none" aria-hidden="true">
              <defs>
                <marker id="route-arrow" markerWidth="7" markerHeight="7" refX="5.5" refY="2.5" orient="auto"><path d="M0,0 L0,5 L6,2.5 z" fill="#1584ff" /></marker>
              </defs>
              <path d="M165 335 C270 385 330 410 440 345 S560 245 645 265 S765 380 890 305" fill="none" stroke="#1584ff" strokeWidth="3.25" strokeLinecap="round" markerMid="url(#route-arrow)" markerEnd="url(#route-arrow)" />
            </svg>

            <div className="map-checkpoint map-checkpoint-port">
              <span><Anchor size={22} weight="fill" /></span><strong>PORT DE LOMÉ</strong><small>{chezConsignataire.toLocaleString('fr-FR')} en préparation</small>
            </div>
            <div className="map-checkpoint map-checkpoint-terminal">
              <span><Crane size={22} weight="fill" /></span><strong>LCT / TOGO TERMINAL</strong><small>{auTerminal.toLocaleString('fr-FR')} au terminal</small>
            </div>
            <div className="map-checkpoint map-checkpoint-pia">
              <span><Warehouse size={22} weight="fill" /></span><strong>PIA PORT SEC</strong><small>{versPIA.toLocaleString('fr-FR')} vers ou à la PIA</small>
            </div>

            <div className="map-scale">2 km</div>
            <div className="map-compass"><span>N</span><ArrowRight size={18} weight="bold" /></div>
            <Link className="map-open" to="/checkpoints">Voir les checkpoints <ArrowRight size={13} /></Link>
          </div>
        </article>

        <aside className="command-panel command-exceptions">
          <div className="command-panel-heading">
            <div><h2>Exceptions prioritaires</h2><p>Retards et conteneurs à vérifier</p></div>
            <Link to="/anomalies">Voir tout</Link>
          </div>

          {anomaliesQuery.isLoading ? (
            <div className="command-list-loading">Analyse des anomalies...</div>
          ) : anomalies.length === 0 ? (
            <div className="command-empty"><CheckCircle size={30} weight="duotone" /><strong>Aucune anomalie active</strong><span>Les opérations sont à jour.</span></div>
          ) : (
            <div className="command-exception-list">
              {anomalies.map((item) => {
                const config = severityConfig[item.severity];
                const SeverityIcon = config.icon;
                return (
                  <Link to={`/conteneurs/${item.conteneur.id}`} key={item.id}>
                    <span className={`command-severity ${config.className}`}><SeverityIcon size={18} weight="duotone" /></span>
                    <div><strong>{item.conteneur.numeroBL}</strong><p>{item.title}</p><small>{item.lastCheckpoint?.lieu || 'Aucun checkpoint'}</small></div>
                    <div className="command-exception-time"><strong>{formatDuration(item.hoursOpen)}</strong><span>{config.label}</span></div>
                    <CaretRight size={15} />
                  </Link>
                );
              })}
            </div>
          )}
        </aside>
      </section>

      <section className="command-panel command-movements">
        <div className="command-panel-heading">
          <div><h2>Mouvements récents</h2><p>Journal des validations enregistrées à chaque checkpoint</p></div>
          <Link to="/mouvements">Historique complet <ArrowRight size={14} /></Link>
        </div>

        {mouvementsQuery.isLoading ? (
          <div className="command-list-loading">Chargement du journal...</div>
        ) : mouvements.length === 0 ? (
          <div className="command-empty"><ShippingContainer size={30} weight="duotone" /><strong>Aucun mouvement enregistré</strong><span>Un mouvement apparaîtra après la validation d’un checkpoint.</span></div>
        ) : (
          <div className="command-table-wrap">
            <table>
              <thead><tr><th>Conteneur / B/L</th><th>ATP</th><th>Checkpoint</th><th>Action</th><th>Agent responsable</th><th>Statut</th><th>Date et heure</th></tr></thead>
              <tbody>
                {mouvements.map((item) => (
                  <tr key={item.id}>
                    <td><Link to={`/conteneurs/${item.conteneur.id}`}>{item.conteneur.numeroConteneur || item.conteneur.numeroBL}</Link><small>{item.conteneur.numeroBL}</small></td>
                    <td>{item.conteneur.atp || 'Non renseigné'}</td>
                    <td>{item.checkpoint?.lieu || 'Non renseigné'}</td>
                    <td>{item.action.replaceAll('_', ' ').toLocaleLowerCase('fr-FR')}</td>
                    <td>{item.user.prenom} {item.user.nom}</td>
                    <td><StatusChip statut={item.conteneur.statut} /></td>
                    <td>{new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

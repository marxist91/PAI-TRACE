import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Clock,
  ClockCounterClockwise,
  ShippingContainer,
  Truck,
  WarningCircle,
} from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { conteneurService, mouvementService } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { StatusChip } from '../components/StatusChip';

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const conteneursQuery = useQuery({
    queryKey: ['conteneurs', 'client-home'],
    queryFn: () => conteneurService.getAll(),
  });
  const mouvementsQuery = useQuery({
    queryKey: ['mouvements', 'client-home'],
    queryFn: () => mouvementService.getAll({ limit: 6 }),
  });

  const conteneurs = conteneursQuery.data?.data.conteneurs ?? [];
  const mouvements = mouvementsQuery.data?.data.mouvements ?? [];
  const transit = conteneurs.filter((item) => item.statut.includes('TRANSIT')).length;
  const arrived = conteneurs.filter((item) => ['ARRIVE_PIA', 'STOCKE_PIA', 'LIVRE'].includes(item.statut)).length;
  const pending = conteneurs.filter((item) => ['EN_ATTENTE', 'CHEZ_CONSIGNATAIRE'].includes(item.statut)).length;
  const isLoading = conteneursQuery.isLoading || mouvementsQuery.isLoading;
  const isError = conteneursQuery.isError || mouvementsQuery.isError;

  return (
    <OpsPage>
      <OpsHeader
        title={`Bonjour ${user?.prenom ?? ''}`.trim()}
        subtitle="Suivez uniquement vos conteneurs, leur position actuelle et les dernières validations du parcours."
        actions={<Link to="/conteneurs" className="ops-button ops-button-primary">Mes conteneurs <ArrowRight size={15} /></Link>}
      />

      <section className="client-access-band">
        <div><span>Espace client</span><strong>Suivi en lecture seule</strong></div>
        <p>Les mises à jour sont enregistrées par les équipes du Port autonome de Lomé et des terminaux.</p>
      </section>

      <OpsMetricStrip items={[
        { label: 'Mes conteneurs', value: conteneurs.length, icon: ShippingContainer },
        { label: 'En préparation', value: pending, icon: Clock },
        { label: 'En transit', value: transit, icon: Truck, tone: 'warning' },
        { label: 'Arrivés à la PIA', value: arrived, icon: CheckCircle, tone: 'success' },
      ]} />

      <div className="client-dashboard-grid">
        <OpsPanel title="Mes unités suivies" subtitle="Derniers conteneurs associés à votre compte" action={<Link to="/conteneurs" className="ops-button">Voir tout</Link>}>
          {isLoading ? <OpsState icon={ShippingContainer} title="Chargement de votre suivi" /> :
            isError ? <OpsState icon={WarningCircle} title="Suivi indisponible" description="Les données ne peuvent pas être chargées pour le moment." tone="danger" /> :
            conteneurs.length === 0 ? <OpsState icon={ShippingContainer} title="Aucun conteneur associé" description="Contactez votre interlocuteur PAL pour vérifier votre B/L." /> :
            <div className="ops-table-wrap"><table className="ops-table">
              <thead><tr><th>Conteneur / B/L</th><th>Consignataire</th><th>Destination</th><th>Statut</th><th>Suivi</th></tr></thead>
              <tbody>{conteneurs.slice(0, 6).map((item) => <tr key={item.id}>
                <td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroBL}</Link><small>{item.typeMarchandise}</small></td>
                <td>{item.consignataire.nom}</td>
                <td>{item.destination}</td>
                <td><StatusChip statut={item.statut} /></td>
                <td><Link className="ops-button" to={`/conteneurs/${item.id}`}>Consulter</Link></td>
              </tr>)}</tbody>
            </table></div>}
        </OpsPanel>

        <OpsPanel title="Dernières validations" subtitle="Historique récent de vos parcours">
          {isLoading ? <OpsState icon={ClockCounterClockwise} title="Chargement de l’historique" /> :
            mouvements.length === 0 ? <OpsState icon={ClockCounterClockwise} title="Aucune validation récente" /> :
            <div className="client-activity-list">{mouvements.map((item) => <Link to={`/conteneurs/${item.conteneur.id}`} key={item.id}>
              <span><ClockCounterClockwise size={18} weight="duotone" /></span>
              <div><strong>{item.conteneur.numeroBL}</strong><p>{item.checkpoint.lieu} - {item.action.replaceAll('_', ' ').toLocaleLowerCase('fr-FR')}</p><small>{new Date(item.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</small></div>
              <ArrowRight size={15} />
            </Link>)}</div>}
        </OpsPanel>
      </div>
    </OpsPage>
  );
}

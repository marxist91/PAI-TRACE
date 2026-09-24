import { useEffect, useRef, useState } from 'react';
import { isAxiosError } from 'axios';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  HouseLine,
  NavigationArrow,
  Truck,
} from '@phosphor-icons/react';
import { conteneurService, settingsService } from '../services/api';
import { StatusChip, statusLabel } from '../components/StatusChip';
import { OpsHeader, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';
import { ContainerTimeline } from '../components/ContainerTimeline';

const CHECKPOINT_TYPES: Record<string, string> = {
  TERMINAL_LCT: 'LCT',
  TERMINAL_TOGO: 'Togo Terminal',
  PIA: 'PIA (Port Sec)',
};

const CHECKPOINT_PLACES: Record<string, string> = {
  TERMINAL_LCT: 'LCT - Zone terminal',
  TERMINAL_TOGO: 'Togo Terminal',
  PIA: 'PIA - Port sec',
};

function formatDateTime(date: Date) {
  return date.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).replace(',', ' -');
}

export default function ConteneurDetailPage() {
  const { user } = useAuth();
  const isLogisticien = user?.role === 'LOGISTICIEN' || user?.role === 'ADMIN';
  const canUpdate = Boolean(user && ['ADMIN', 'LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'].includes(user.role));
  const roleCheckpointType = user?.role === 'CONTROLEUR_LCT' ? 'TERMINAL_LCT'
      : user?.role === 'CONTROLEUR_TOGO' ? 'TERMINAL_TOGO'
        : user?.role === 'AGENT_PIA' ? 'PIA' : 'TERMINAL_LCT';
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const fromStay = searchParams.get('action') === 'sortie-pia';
  const openedExitFor = useRef<string | undefined>(undefined);
  const operationForm = useRef<HTMLFormElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showCheckpointForm, setShowCheckpointForm] = useState(false);
  const [checkpoint, setCheckpoint] = useState({
    type: roleCheckpointType,
    statut: '',
    date: new Date().toISOString().slice(0, 16),
    lieu: CHECKPOINT_PLACES[roleCheckpointType],
    notes: '',
    paysDestination: '',
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conteneur', id],
    queryFn: () => conteneurService.getById(Number(id)),
  });
  useEffect(() => {
    const row = data?.data.conteneur;
    if (!fromStay || !row || openedExitFor.current === id || !user || !['ADMIN', 'LOGISTICIEN', 'AGENT_PIA'].includes(user.role) || !row.dateEntreePia || row.dateSortiePia) return;
    openedExitFor.current = id;
    setCheckpoint(previous => ({ ...previous, type: 'PIA', statut: 'SORTIE PIA', lieu: CHECKPOINT_PLACES.PIA }));
    setShowCheckpointForm(true);
  }, [data, fromStay, id, user]);
  useEffect(() => {
    if (fromStay && showCheckpointForm) operationForm.current?.scrollIntoView({ block: 'center' });
  }, [fromStay, showCheckpointForm]);

  const addCheckpointMutation = useMutation({
    mutationFn: (data: typeof checkpoint) =>
      conteneurService.addCheckpoint(Number(id), {
        ...data,
        date: new Date(data.date).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteneur', id] });
      queryClient.invalidateQueries({ queryKey: ['conteneurs'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements'] });
      setShowCheckpointForm(false);
      setCheckpoint({
        type: roleCheckpointType,
        statut: '',
        date: new Date().toISOString().slice(0, 16),
        lieu: CHECKPOINT_PLACES[roleCheckpointType],
        notes: '',
        paysDestination: '',
      });
      if (fromStay) navigate('/sejours');
    },
  });

  const destinationCountries = useQuery({
    queryKey: ['destination-countries'], queryFn: settingsService.getCountries,
    refetchInterval: 30_000,
    enabled: showCheckpointForm && checkpoint.type === 'PIA' && checkpoint.statut === 'SORTIE PIA',
  });

  const deleteMutation = useMutation({
    mutationFn: () => conteneurService.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conteneurs'] });
      navigate('/conteneurs');
    },
  });

  if (isLoading) {
    return <OpsPage><OpsPanel><OpsState icon={Truck} title="Chargement du parcours" /></OpsPanel></OpsPage>;
  }

  const conteneur = data?.data.conteneur;
  if (isError || !conteneur) {
    return <OpsPage><OpsPanel><OpsState icon={Truck} title="Conteneur non trouvé" description="Retournez au registre pour sélectionner une autre unité." tone="danger" /></OpsPanel></OpsPage>;
  }

  const canExitTerminal = !conteneur.dateSortieTerminal && !conteneur.dateEntreePia && !conteneur.dateSortiePia;
  const canEnterPia = Boolean(conteneur.dateSortieTerminal && !conteneur.dateEntreePia && !conteneur.dateSortiePia);
  const canExitPia = Boolean(conteneur.dateEntreePia && !conteneur.dateSortiePia);
  const hasAction = isLogisticien ? canExitTerminal || canEnterPia || canExitPia : roleCheckpointType === 'PIA' ? canEnterPia || canExitPia : canExitTerminal;

  return (
    <OpsPage>
      <OpsHeader title={conteneur.numeroConteneur || conteneur.numeroBL} subtitle={`B/L ${conteneur.numeroBL || 'non renseigné'}${conteneur.atp ? ` / ATP ${conteneur.atp}` : ''} / Destination : ${conteneur.paysDestination || conteneur.destination}`} actions={<><Link to="/conteneurs" className="ops-button"><ArrowLeft size={14} /> Retour</Link>{isLogisticien && <><Link to={`/conteneurs/${id}/editer`} className="ops-button">Modifier</Link><button className="ops-button ops-button-danger" onClick={() => { if (confirm('Supprimer ce conteneur ?')) deleteMutation.mutate(); }}>Supprimer</button></>}</>} />

      <section className="ops-status-band">
        <span><Truck size={26} weight="duotone" /></span>
        <div><small>Statut actuel</small><strong>{statusLabel(conteneur.statut)}</strong></div>
        <StatusChip statut={conteneur.statut} />
        <div className="ops-status-date"><small>Dernière mise à jour</small><b className="ops-mono">{new Date(conteneur.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>
        {canUpdate && hasAction && <button className="ops-button ops-button-primary" onClick={() => setShowCheckpointForm(!showCheckpointForm)}>Mettre à jour</button>}
      </section>

      <div className="ops-detail-grid">
        <OpsPanel title="Chronologie du parcours" subtitle="Dates réelles des opérations enregistrées">
          <ContainerTimeline conteneur={conteneur} />
        </OpsPanel>

        <div className="ops-detail-side">
          <OpsPanel title="Informations" subtitle="Données administratives de l’unité">
            <div className="ops-info-grid"><div><small>Numéro conteneur</small><strong>{conteneur.numeroConteneur || 'Non renseigné'}</strong></div><div><small>B/L</small><strong>{conteneur.numeroBL || 'Non renseigné'}</strong></div><div><small>ATP</small><strong>{conteneur.atp || 'Non renseigné'}</strong></div><div><small>Terminal de sortie</small><strong>{conteneur.terminalAffecte === 'TOGO' ? 'Togo Terminal' : conteneur.terminalAffecte || 'À préciser'}</strong></div><div><small>Pays de destination</small><strong>{conteneur.paysDestination || conteneur.destination}</strong></div><div><small>Débarquement / VAQ</small><strong className="ops-mono">{conteneur.dateDebarquement ? new Date(conteneur.dateDebarquement).toLocaleString('fr-FR') : 'Non renseigné'}</strong></div><div><small>Entrée PIA</small><strong className="ops-mono">{conteneur.dateEntreePia ? new Date(conteneur.dateEntreePia).toLocaleString('fr-FR') : 'En attente'}</strong></div><div><small>Sortie PIA</small><strong className="ops-mono">{conteneur.dateSortiePia ? new Date(conteneur.dateSortiePia).toLocaleString('fr-FR') : 'En attente'}</strong></div><div><small>Statut</small><StatusChip statut={conteneur.statut} /></div></div>
          </OpsPanel>

          <OpsPanel title="Entrées et sorties" subtitle="Oui = opération enregistrée. Non = aucune opération enregistrée.">
          <div className="ops-document-list">{[
            { label: 'Sortie du terminal', date: conteneur.dateSortieTerminal, icon: Truck },
            { label: 'Entrée à la PIA', date: conteneur.dateEntreePia, icon: HouseLine },
            { label: 'Sortie de la PIA', date: conteneur.dateSortiePia, icon: NavigationArrow },
          ].map(({ label, date, icon: Icon }) => {
            return <div key={label}><span><Icon size={17} weight="duotone" />{label}</span><span>{date && <time dateTime={date}>{formatDateTime(new Date(date))}</time>}<span className={`status-chip ${date ? 'status-success' : 'status-info'}`}>{date ? <CheckCircle size={12} weight="fill" /> : <Clock size={12} />}{date ? 'Oui' : 'Non'}</span></span></div>;
          })}</div>
          </OpsPanel>

          {canUpdate && !hasAction && <OpsPanel title={conteneur.dateSortiePia ? 'Parcours terminé' : 'Poste à jour'} subtitle={conteneur.dateSortiePia ? 'La sortie PIA est enregistrée. Aucune nouvelle opération à saisir.' : 'Aucune opération disponible à votre poste pour ce conteneur.'}>{null}</OpsPanel>}
          {canUpdate && hasAction && <OpsPanel title="Enregistrer une entrée ou une sortie" subtitle="Sélectionnez l’opération réalisée et sa date.">
          {addCheckpointMutation.isError && <p role="alert" className="ops-inline-alert ops-inline-alert-danger">{isAxiosError(addCheckpointMutation.error) ? addCheckpointMutation.error.response?.data?.error || 'Enregistrement impossible. Réessayez.' : 'Enregistrement impossible.'}</p>}
          {!showCheckpointForm && <div className="ops-panel-footer"><button onClick={() => setShowCheckpointForm(true)} className="ops-button ops-button-primary">Ajouter un checkpoint</button></div>}
          {showCheckpointForm && (
            <form id="operation" ref={operationForm} onSubmit={(event) => { event.preventDefault(); addCheckpointMutation.mutate(checkpoint); }}>
              <div className="ops-form-grid">
                <div className="ops-field"><label htmlFor="checkpointType">Poste</label><select id="checkpointType" className="ops-select" value={checkpoint.type} disabled={!isLogisticien} onChange={(event) => { const type = event.target.value; setCheckpoint({ ...checkpoint, type, statut: '', lieu: CHECKPOINT_PLACES[type] ?? checkpoint.lieu }); }}>{Object.entries(CHECKPOINT_TYPES).filter(([value]) => isLogisticien || value === roleCheckpointType).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="ops-field"><label htmlFor="checkpointStatus">Action réalisée</label><select id="checkpointStatus" className="ops-select" value={checkpoint.statut} onChange={(event) => setCheckpoint({ ...checkpoint, statut: event.target.value })} required><option value="">Sélectionner l’action</option>{checkpoint.type.startsWith('TERMINAL_') && canExitTerminal && <option value="SORTIE TERMINAL">Sortie du terminal</option>}{checkpoint.type === 'PIA' && <>{canEnterPia && <option value="ENTREE PIA">Entrée à la PIA</option>}{canExitPia && <option value="SORTIE PIA">Sortie de la PIA</option>}</>}</select></div>
                <div className="ops-field"><label htmlFor="checkpointDate">Date et heure</label><input id="checkpointDate" type="datetime-local" className="ops-input" value={checkpoint.date} onChange={(event) => setCheckpoint({ ...checkpoint, date: event.target.value })} required /></div>
                <div className="ops-field"><label htmlFor="checkpointPlace">Lieu</label><input id="checkpointPlace" className="ops-input" value={checkpoint.lieu} onChange={(event) => setCheckpoint({ ...checkpoint, lieu: event.target.value })} required readOnly={!isLogisticien} /></div>
                {checkpoint.type === 'PIA' && checkpoint.statut === 'SORTIE PIA' && <div className="ops-field ops-field-wide"><label htmlFor="checkpointCountry">Pays de destination</label><select id="checkpointCountry" className="ops-select" value={checkpoint.paysDestination} onChange={(event) => setCheckpoint({ ...checkpoint, paysDestination: event.target.value })} required aria-describedby="countryHelp"><option value="">{destinationCountries.isLoading ? 'Chargement des pays…' : 'Choisir le pays de destination'}</option>{destinationCountries.data?.data.countries.map(country => <option key={country} value={country}>{country}</option>)}</select><small id="countryHelp">Pays absent ? Demandez son ajout à l’administrateur.</small>{destinationCountries.isError && <><p role="alert">Impossible de charger les pays.</p><button className="ops-button" type="button" disabled={destinationCountries.isFetching} onClick={() => void destinationCountries.refetch()}>Réessayer</button></>}</div>}
                <div className="ops-field ops-field-wide"><label htmlFor="checkpointNotes">Notes</label><textarea id="checkpointNotes" className="ops-textarea" value={checkpoint.notes} onChange={(event) => setCheckpoint({ ...checkpoint, notes: event.target.value })} /></div>
              </div>
              <div className="ops-form-actions"><button type="button" className="ops-button" onClick={() => setShowCheckpointForm(false)}>Annuler</button><button type="submit" className="ops-button ops-button-primary" disabled={addCheckpointMutation.isPending}>{addCheckpointMutation.isPending ? 'Enregistrement...' : 'Valider le checkpoint'}</button></div>
            </form>
          )}
          </OpsPanel>}
        </div>
      </div>
    </OpsPage>
  );
}

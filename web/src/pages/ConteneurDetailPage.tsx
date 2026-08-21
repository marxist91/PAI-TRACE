import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Anchor,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  HouseLine,
  NavigationArrow,
  Truck,
  Warehouse,
} from '@phosphor-icons/react';
import { conteneurService, type Checkpoint, type Conteneur } from '../services/api';
import { StatusChip, statusLabel } from '../components/StatusChip';
import { OpsHeader, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';

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

const STATUS_STAGE: Record<string, number> = {
  ATTENDU_PIA: 0,
  VU_A_QUAI: 1,
  SORTI_TERMINAL: 2,
  ENTRE_PIA: 3,
  SORTI_PIA: 4,
  EN_ATTENTE: 0,
  CHEZ_CONSIGNATAIRE: 0,
  EN_TRANSIT_VERS_TERMINAL: 1,
  AU_TERMINAL: 1,
  DECHARGE_SOUS_PALAN: 1,
  EN_TRANSIT_VERS_PIA: 2,
  ARRIVE_PIA: 3,
  STOCKE_PIA: 3,
  DOUANE: 3,
  LIVRE: 3,
};

type TimelineState = 'completed' | 'current' | 'upcoming';

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

function findCheckpoint(checkpoints: Checkpoint[], types: string[]) {
  return [...checkpoints].reverse().find((item) => types.includes(item.type));
}

function inferredTerminalType(numeroBL: string) {
  const routeKey = [...numeroBL].reduce((total, character) => total + character.charCodeAt(0), 0);
  return routeKey % 2 === 0 ? 'TERMINAL_LCT' : 'TERMINAL_TOGO';
}

function buildTimeline(conteneur: Conteneur) {
  const checkpoints = conteneur.checkpoints ?? [];
  const currentStage = STATUS_STAGE[conteneur.statut] ?? 0;
  const completedAtDestination = ['SORTI_PIA', 'LIVRE'].includes(conteneur.statut);
  const baseDate = new Date(conteneur.dateArrivee);
  const terminalCheckpoint = findCheckpoint(checkpoints, ['TERMINAL_TOGO', 'TERMINAL_LCT']);
  const terminalType = terminalCheckpoint?.type ?? (conteneur.terminalAffecte === 'LCT' ? 'TERMINAL_LCT' : conteneur.terminalAffecte === 'TOGO' ? 'TERMINAL_TOGO' : inferredTerminalType(conteneur.numeroBL));
  const terminalTitle = terminalType === 'TERMINAL_LCT' ? 'LCT' : 'Togo Terminal';
  const stages = [
    {
      title: 'Vue à quai',
      caption: 'Débarquement confirmé par le manifeste / VAQ',
      icon: Warehouse,
      checkpoint: undefined,
      inferredDate: conteneur.dateDebarquement ? new Date(conteneur.dateDebarquement) : baseDate,
    },
    {
      title: terminalTitle,
      caption: `Sortie du camion-conteneur à ${terminalTitle}`,
      icon: Anchor,
      checkpoint: terminalCheckpoint,
      inferredDate: addMinutes(baseDate, 53),
    },
    {
      title: 'Route vers PIA',
      caption: 'Transfert routier vers le port sec',
      icon: Truck,
      checkpoint: undefined,
      inferredDate: addMinutes(baseDate, 126),
    },
    {
      title: 'PIA - Port sec',
      caption: 'Entrée effective et début du séjour à la PIA',
      icon: HouseLine,
      checkpoint: findCheckpoint(checkpoints, ['PIA']),
      inferredDate: addMinutes(baseDate, 443),
    },
    {
      title: 'Sortie PIA',
      caption: `Sortie vers ${conteneur.paysDestination || conteneur.destination}`,
      icon: NavigationArrow,
      checkpoint: undefined,
      inferredDate: conteneur.dateSortiePia ? new Date(conteneur.dateSortiePia) : addMinutes(baseDate, 1440),
    },
  ];

  return stages.map((stage, index) => {
    let state: TimelineState = index < currentStage ? 'completed' : index === currentStage ? 'current' : 'upcoming';
    if (index === 4 && completedAtDestination) state = 'completed';
    return {
      ...stage,
      state,
      date: stage.checkpoint ? new Date(stage.checkpoint.date) : stage.inferredDate,
      caption: stage.checkpoint?.notes || stage.checkpoint?.lieu || stage.caption,
      isRecorded: Boolean(stage.checkpoint),
    };
  });
}

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
  const isLogisticien = user?.role === 'LOGISTICIEN';
  const canUpdate = Boolean(user && ['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'].includes(user.role));
  const roleCheckpointType = user?.role === 'CONTROLEUR_LCT' ? 'TERMINAL_LCT'
      : user?.role === 'CONTROLEUR_TOGO' ? 'TERMINAL_TOGO'
        : user?.role === 'AGENT_PIA' ? 'PIA' : 'TERMINAL_LCT';
  const { id } = useParams<{ id: string }>();
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
      setShowCheckpointForm(false);
      setCheckpoint({
        type: roleCheckpointType,
        statut: '',
        date: new Date().toISOString().slice(0, 16),
        lieu: CHECKPOINT_PLACES[roleCheckpointType],
        notes: '',
        paysDestination: '',
      });
    },
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

  const timeline = buildTimeline(conteneur);
  const destinationReached = ['SORTI_PIA', 'LIVRE'].includes(conteneur.statut);
  const timelineProgress = destinationReached ? 100 : Math.min(90, (STATUS_STAGE[conteneur.statut] ?? 0) * 24 + 8);

  return (
    <OpsPage>
      <OpsHeader title={conteneur.numeroConteneur || conteneur.numeroBL} subtitle={`B/L ${conteneur.numeroBL}${conteneur.atp ? ` / ATP ${conteneur.atp}` : ''} / Destination : ${conteneur.paysDestination || conteneur.destination}`} actions={<><Link to="/conteneurs" className="ops-button"><ArrowLeft size={14} /> Retour</Link>{isLogisticien && <><Link to={`/conteneurs/${id}/editer`} className="ops-button">Modifier</Link><button className="ops-button ops-button-danger" onClick={() => { if (confirm('Supprimer ce conteneur ?')) deleteMutation.mutate(); }}>Supprimer</button></>}</>} />

      <section className="ops-status-band">
        <span><Truck size={26} weight="duotone" /></span>
        <div><small>Statut actuel</small><strong>{statusLabel(conteneur.statut)}</strong></div>
        <StatusChip statut={conteneur.statut} />
        <div className="ops-status-date"><small>Dernière mise à jour</small><b className="ops-mono">{new Date(conteneur.updatedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</b></div>
        {canUpdate && <button className="ops-button ops-button-primary" onClick={() => setShowCheckpointForm(!showCheckpointForm)}>Mettre à jour</button>}
      </section>

      <div className="ops-detail-grid">
        <OpsPanel title="Chronologie du parcours" subtitle="Étapes enregistrées et progression reconstituée depuis le statut">
          <div className="ops-timeline">
            <div className="ops-timeline-line" style={{ background: `linear-gradient(to bottom, #f4d80b 0%, #f4d80b ${timelineProgress}%, #314967 ${timelineProgress}%, #314967 100%)` }} />
            {timeline.map((stage) => {
              const Icon = stage.icon;
              const completed = stage.state === 'completed';
              const current = stage.state === 'current';
              const badge = completed ? 'Terminé' : current ? (conteneur.statut === 'DOUANE' ? 'À vérifier' : 'En cours') : 'À venir';
              return <div key={stage.title} className={`ops-timeline-item ${completed ? 'completed' : current ? 'current' : 'upcoming'}`}><span><Icon size={20} weight="duotone" /></span><div><div><strong>{stage.title}</strong><em>{completed ? <CheckCircle size={12} weight="fill" /> : current ? <NavigationArrow size={12} weight="fill" /> : <Clock size={12} />}{badge}</em></div><small>{completed ? 'Validation' : current ? 'Mise à jour' : 'Prévision'} : {formatDateTime(stage.date)}</small><p>{stage.caption}</p>{!stage.isRecorded && <small>Étape reconstituée depuis le statut actuel</small>}</div></div>;
            })}
          </div>
        </OpsPanel>

        <div className="ops-detail-side">
          <OpsPanel title="Informations" subtitle="Données administratives de l’unité">
            <div className="ops-info-grid"><div><small>Numéro conteneur</small><strong>{conteneur.numeroConteneur || 'Non renseigné'}</strong></div><div><small>B/L</small><strong>{conteneur.numeroBL}</strong></div><div><small>ATP</small><strong>{conteneur.atp || 'Non renseigné'}</strong></div><div><small>Terminal de sortie</small><strong>{conteneur.terminalAffecte === 'TOGO' ? 'Togo Terminal' : conteneur.terminalAffecte || 'À préciser'}</strong></div><div><small>Pays de destination</small><strong>{conteneur.paysDestination || conteneur.destination}</strong></div><div><small>Débarquement / VAQ</small><strong className="ops-mono">{conteneur.dateDebarquement ? new Date(conteneur.dateDebarquement).toLocaleString('fr-FR') : 'Non renseigné'}</strong></div><div><small>Entrée PIA</small><strong className="ops-mono">{conteneur.dateEntreePia ? new Date(conteneur.dateEntreePia).toLocaleString('fr-FR') : 'En attente'}</strong></div><div><small>Sortie PIA</small><strong className="ops-mono">{conteneur.dateSortiePia ? new Date(conteneur.dateSortiePia).toLocaleString('fr-FR') : 'En attente'}</strong></div><div><small>Statut</small><StatusChip statut={conteneur.statut} /></div></div>
          </OpsPanel>

          <OpsPanel title="Documents et conformité" subtitle="État indicatif des pièces de transport">
          <div className="ops-document-list">{['Connaissement', 'Bon de transfert', 'Scellé douanier', 'Preuve de livraison'].map((document, index) => {
            const proofPending = document === 'Preuve de livraison' && !['ARRIVE_PIA', 'STOCKE_PIA', 'LIVRE'].includes(conteneur.statut);
            const needsReview = index === 1;
            return <div key={document}><span><FileText size={15} weight="duotone" />{document}</span>{needsReview ? <span className="status-chip status-info"><Clock size={12} /> À vérifier</span> : proofPending ? <span className="status-chip status-warning"><Clock size={12} /> En attente</span> : <span className="status-chip status-success"><CheckCircle size={12} weight="fill" /> Validé</span>}</div>;
          })}</div>
          </OpsPanel>

          {canUpdate && <OpsPanel title="Mise à jour du parcours" subtitle="L’ajout d’un checkpoint crée aussi le mouvement associé">
          {!showCheckpointForm && <div className="ops-panel-footer"><button onClick={() => setShowCheckpointForm(true)} className="ops-button ops-button-primary">Ajouter un checkpoint</button></div>}
          {showCheckpointForm && (
            <form onSubmit={(event) => { event.preventDefault(); addCheckpointMutation.mutate(checkpoint); }}>
              <div className="ops-form-grid">
                <div className="ops-field"><label htmlFor="checkpointType">Poste</label><select id="checkpointType" className="ops-select" value={checkpoint.type} disabled={!isLogisticien} onChange={(event) => { const type = event.target.value; setCheckpoint({ ...checkpoint, type, statut: '', lieu: CHECKPOINT_PLACES[type] ?? checkpoint.lieu }); }}>{Object.entries(CHECKPOINT_TYPES).filter(([value]) => isLogisticien || value === roleCheckpointType).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
                <div className="ops-field"><label htmlFor="checkpointStatus">Action réalisée</label><select id="checkpointStatus" className="ops-select" value={checkpoint.statut} onChange={(event) => setCheckpoint({ ...checkpoint, statut: event.target.value })} required><option value="">Sélectionner l’action</option>{checkpoint.type.startsWith('TERMINAL_') && <option value="SORTIE TERMINAL">Sortie du terminal</option>}{checkpoint.type === 'PIA' && <><option value="ENTREE PIA">Entrée à la PIA</option><option value="SORTIE PIA">Sortie de la PIA</option></>}</select></div>
                <div className="ops-field"><label htmlFor="checkpointDate">Date et heure</label><input id="checkpointDate" type="datetime-local" className="ops-input" value={checkpoint.date} onChange={(event) => setCheckpoint({ ...checkpoint, date: event.target.value })} required /></div>
                <div className="ops-field"><label htmlFor="checkpointPlace">Lieu</label><input id="checkpointPlace" className="ops-input" value={checkpoint.lieu} onChange={(event) => setCheckpoint({ ...checkpoint, lieu: event.target.value })} required readOnly={!isLogisticien} /></div>
                {checkpoint.type === 'PIA' && checkpoint.statut === 'SORTIE PIA' && <div className="ops-field ops-field-wide"><label htmlFor="checkpointCountry">Pays de destination</label><input id="checkpointCountry" className="ops-input" value={checkpoint.paysDestination} onChange={(event) => setCheckpoint({ ...checkpoint, paysDestination: event.target.value })} required /></div>}
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

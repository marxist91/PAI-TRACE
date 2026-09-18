import { Anchor, CheckCircle, Clock, HouseLine, NavigationArrow, Warehouse } from '@phosphor-icons/react';
import type { Conteneur } from '../services/api';

export function ContainerTimeline({ conteneur }: { conteneur: Conteneur }) {
  const terminal = conteneur.terminalAffecte === 'LCT' ? 'LCT' : conteneur.terminalAffecte === 'TOGO' ? 'Togo Terminal' : 'terminal à préciser';
  const steps = [
    { title: 'Vu à quai', date: conteneur.dateDebarquement, icon: Warehouse, caption: 'Débarquement enregistré' },
    { title: `Sortie ${terminal}`, date: conteneur.dateSortieTerminal, icon: Anchor, caption: 'Départ vers la PIA' },
    { title: 'Entrée PIA', date: conteneur.dateEntreePia, icon: HouseLine, caption: 'Réception et début du séjour' },
    { title: 'Sortie PIA', date: conteneur.dateSortiePia, icon: NavigationArrow, caption: `Destination : ${conteneur.paysDestination || conteneur.destination || 'À confirmer'}` },
  ];
  return <div className="ops-timeline ops-timeline-connected">
    {steps.map(({ title, date, icon: Icon, caption }, index) => <div className={`ops-timeline-item ${date ? 'completed' : 'upcoming'}${date && steps[index + 1]?.date ? ' connected-completed' : ''}`} key={title}>
      <span><Icon size={20} weight="duotone" /></span>
      <div><div><strong>{title}</strong><em>{date ? <CheckCircle size={12} weight="fill" /> : <Clock size={12} />}{date ? 'Oui' : 'Non enregistré'}</em></div>
        {date ? <time dateTime={date}>{new Date(date).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</time> : <small>Date non renseignée</small>}
        <p>{caption}</p>
      </div>
    </div>)}
  </div>;
}

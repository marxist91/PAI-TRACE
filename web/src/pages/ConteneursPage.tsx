import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowClockwise,
  DownloadSimple,
  MagnifyingGlass,
  MapPin,
  ShippingContainer,
  Trash,
  Truck,
  Warehouse,
  WarningCircle,
} from '@phosphor-icons/react';
import { conteneurService, type Conteneur, type OperationPeriod } from '../services/api';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { inOperationPeriod, operationPeriodLabel } from '../utils/operation-period';
import { StatusChip } from '../components/StatusChip';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';
import { matchesContainerStage } from '../utils/container-stage';

const STATUT_LABELS: Record<string, string> = {
  ATTENDU_PIA: 'Attendu à la PIA',
  VU_A_QUAI: 'Vu à quai',
  SORTI_TERMINAL: 'Sorti du terminal',
  ENTRE_PIA: 'Entré à la PIA',
  SORTI_PIA: 'Sorti de la PIA',
  EN_ATTENTE: 'En attente',
  CHEZ_CONSIGNATAIRE: 'Chez consignataire',
  EN_TRANSIT_VERS_TERMINAL: 'Vers terminal',
  AU_TERMINAL: 'Au terminal',
  DECHARGE_SOUS_PALAN: 'Sous palan',
  EN_TRANSIT_VERS_PIA: 'Vers PIA',
  ARRIVE_PIA: 'Arrivé PIA',
  STOCKE_PIA: 'Stocké PIA',
  DOUANE: 'Douane',
  LIVRE: 'Livré',
};

const FILTRES = ['', 'ATTENDU_PIA', 'VU_A_QUAI', 'SORTI_TERMINAL', 'ENTRE_PIA', 'SORTI_PIA'];

const DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatOperationDate(value?: string | null) {
  return value ? DATE_FORMATTER.format(new Date(value)) : '-';
}

function JourneyDates({ conteneur }: { conteneur: Conteneur }) {
  const dates = [
    { key: 'terminal', label: 'Sortie terminal', value: conteneur.dateSortieTerminal },
    { key: 'pia-entry', label: 'Entrée PIA', value: conteneur.dateEntreePia },
    { key: 'pia-exit', label: 'Sortie PIA', value: conteneur.dateSortiePia },
  ];
  const latestKey = dates
    .filter((item) => item.value)
    .sort((a, b) => new Date(b.value!).getTime() - new Date(a.value!).getTime())[0]?.key;

  return <div className="ops-journey-dates">
    {dates.map((item) => <div className={`ops-journey-date${item.key === latestKey ? ' latest' : ''}`} key={item.key}>
      <span>{item.label}</span>
      {item.value ? <time dateTime={item.value}>{formatOperationDate(item.value)}</time> : <b>-</b>}
    </div>)}
  </div>;
}

export default function ConteneursPage() {
  const { user } = useAuth();
  const isLogisticien = user?.role === 'LOGISTICIEN' || user?.role === 'ADMIN';
  const title = user?.role === 'CONTROLEUR_LCT' ? 'File des conteneurs LCT'
        : user?.role === 'CONTROLEUR_TOGO' ? 'File Togo Terminal'
          : user?.role === 'AGENT_PIA' ? 'Conteneurs attendus à la PIA' : 'Registre des conteneurs';
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statut, setStatut] = useState('');
  const [periode, setPeriode] = useState<OperationPeriod>('jour');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const dateField = ({ SORTI_TERMINAL: 'dateSortieTerminal', ENTRE_PIA: 'dateEntreePia', SORTI_PIA: 'dateSortiePia' } as const)[statut as 'SORTI_TERMINAL' | 'ENTRE_PIA' | 'SORTI_PIA'];

  const query = useQuery({
    queryKey: ['conteneurs', 'parcours', user?.id, { search }],
    // Fetch the complete server-authorized scope: current status must not hide past steps.
    queryFn: () => conteneurService.getAll({ search: search || undefined }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => conteneurService.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['conteneurs'] }),
  });

  const conteneurs = (query.data?.data.conteneurs ?? []).filter(item => matchesContainerStage(item, statut) && (!dateField || inOperationPeriod(item[dateField], periode, date)));
  const aQuai = conteneurs.filter((item) => matchesContainerStage(item, 'VU_A_QUAI')).length;
  const terminal = conteneurs.filter((item) => matchesContainerStage(item, 'SORTI_TERMINAL')).length;
  const pia = conteneurs.filter((item) => ['ENTRE_PIA', 'SORTI_PIA'].includes(item.statut)).length;

  const exportCsv = () => {
    const rows = [
      ['Conteneur', 'B/L', 'ATP', 'Terminal', 'Pays de destination', 'Statut', 'Sortie terminal', 'Entrée PIA', 'Sortie PIA'],
      ...conteneurs.map((item) => [
        item.numeroConteneur || '',
        item.numeroBL,
        item.atp || '',
        item.terminalAffecte || '',
        item.paysDestination || item.destination,
        STATUT_LABELS[item.statut] ?? item.statut,
        formatOperationDate(item.dateSortieTerminal),
        formatOperationDate(item.dateEntreePia),
        formatOperationDate(item.dateSortiePia),
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'conteneurs-pia.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <OpsPage>
      <OpsHeader
        title={title}
        subtitle="Recherche par numéro de conteneur, B/L ou ATP dans le périmètre opérationnel actif."
      />

      <OpsMetricStrip items={[
        { label: 'Résultats', value: conteneurs.length, icon: ShippingContainer },
        { label: 'Vus à quai', value: aQuai, icon: Truck, tone: 'warning' },
        { label: 'Sortis terminal', value: terminal, icon: Warehouse },
        { label: 'À la PIA', value: pia, icon: MapPin, tone: 'success' },
      ]} />

      <div className="ops-toolbar">
        <div className="ops-search">
          <MagnifyingGlass size={15} />
          <input className="ops-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Conteneur, B/L ou ATP" aria-label="Rechercher un conteneur" />
        </div>
        <div className="ops-toolbar-actions">
          <button className="ops-icon-button" onClick={() => query.refetch()} aria-label="Actualiser"><ArrowClockwise size={16} className={query.isFetching ? 'animate-spin' : ''} /></button>
          <button className="ops-button" onClick={exportCsv}><DownloadSimple size={15} /> Exporter</button>
        </div>
      </div>

      <div className="ops-filter-bar" aria-label="Filtrer par étape enregistrée">
        {FILTRES.map((filter) => <button key={filter || 'tous'} className={statut === filter ? 'active' : ''} onClick={() => setStatut(filter)}>{filter ? STATUT_LABELS[filter] : 'Tous'}</button>)}
      </div>
      {dateField && <div className="ops-toolbar"><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} /><span>{operationPeriodLabel(periode, date)}</span></div>}

      <OpsPanel title={`${conteneurs.length.toLocaleString('fr-FR')} conteneurs`} subtitle={dateField ? `${STATUT_LABELS[statut]} — ${operationPeriodLabel(periode, date)}. Étape réalisée, quel que soit le statut actuel.` : statut ? `Filtre actif : ${STATUT_LABELS[statut]} — toutes dates` : 'Ensemble du registre visible — toutes dates'}>
        {query.isLoading ? <OpsState icon={ShippingContainer} title="Chargement du registre" description="Lecture des conteneurs dans Prisma." /> :
          query.isError ? <OpsState icon={WarningCircle} title="Registre indisponible" description="Vérifiez la connexion aux données puis actualisez." tone="danger" /> :
          conteneurs.length === 0 ? <OpsState icon={MagnifyingGlass} title="Aucun conteneur trouvé" description="Modifiez le filtre ou la recherche." /> :
          <div className="ops-table-wrap"><table className="ops-table ops-container-table">
            <thead><tr><th>Conteneur</th><th>B/L / ATP</th><th>Terminal</th><th>Pays de destination</th><th>Dates du parcours</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>{conteneurs.map((item) => <tr key={item.id}>
              <td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link><small>Unité suivie</small></td>
              <td>{item.numeroBL}<small>{item.atp || 'ATP non renseigné'}</small></td>
              <td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : 'LCT'}</td>
              <td>{item.paysDestination || item.destination}<small>{item.typeMarchandise}</small></td>
              <td><JourneyDates conteneur={item} /></td>
              <td><StatusChip statut={item.statut} /></td>
              <td><div className="ops-inline-actions"><Link className="ops-button" to={`/conteneurs/${item.id}`}>Ouvrir</Link>{isLogisticien && <><Link className="ops-button" to={`/conteneurs/${item.id}/editer`}>Modifier</Link><button className="ops-icon-button ops-button-danger" aria-label={`Supprimer ${item.numeroBL}`} onClick={() => { if (confirm(`Supprimer ${item.numeroBL} ?`)) deleteMutation.mutate(item.id); }}><Trash size={14} /></button></>}</div></td>
            </tr>)}</tbody>
          </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

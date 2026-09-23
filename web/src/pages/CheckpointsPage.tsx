import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Anchor, ArrowClockwise, CheckCircle, FileXls, MapPin, ShippingContainer, Truck, WarningCircle } from '@phosphor-icons/react';
import { conteneurService, type OperationPeriod } from '../services/api';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { inOperationPeriod, operationPeriodLabel } from '../utils/operation-period';
import { StatusChip } from '../components/StatusChip';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { useAuth } from '../contexts/AuthContext';

export default function CheckpointsPage() {
  const { user } = useAuth();
  const [periode, setPeriode] = useState<OperationPeriod>('jour');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const conteneursQuery = useQuery({ queryKey: ['conteneurs', 'sorties', user?.id], queryFn: () => conteneurService.getAll() });
  const registre = conteneursQuery.data?.data.conteneurs ?? [];
  const conteneurs = registre.filter(item => inOperationPeriod(item.dateSortieTerminal, periode, date));
  const vusAQuai = registre.filter(item => inOperationPeriod(item.dateDebarquement, periode, date)).length;
  const sortiesAvecVaq = conteneurs.filter(item => Boolean(item.dateDebarquement)).length;
  const sortiesLct = conteneurs.filter((item) => item.terminalAffecte === 'LCT' && item.dateSortieTerminal).length;
  const sortiesTogo = conteneurs.filter((item) => item.terminalAffecte === 'TOGO' && item.dateSortieTerminal).length;
  const versPia = conteneurs.filter((item) => item.statut === 'SORTI_TERMINAL').length;
  const recusPia = conteneurs.filter((item) => ['ENTRE_PIA', 'SORTI_PIA'].includes(item.statut)).length;
  const isTerminal = user?.role === 'CONTROLEUR_LCT' || user?.role === 'CONTROLEUR_TOGO';
  const terminalName = user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : 'LCT';
  const terminalSorties = terminalName === 'LCT' ? sortiesLct : sortiesTogo;
  const terminalMetrics = [
    { label: 'Vus à quai — date VAQ sur la période', value: vusAQuai, icon: ShippingContainer },
    { label: `Sorties ${terminalName}`, value: terminalSorties, icon: Anchor, tone: 'warning' as const },
    { label: 'En route vers la PIA', value: versPia, icon: Truck },
    { label: 'Reçus à la PIA', value: recusPia, icon: MapPin, tone: 'success' as const },
  ];
  const consolidatedMetrics = [
    { label: 'Vus à quai — date VAQ sur la période', value: vusAQuai, icon: ShippingContainer },
    { label: 'Sorties LCT', value: sortiesLct, icon: Anchor, tone: 'warning' as const },
    { label: 'Sorties Togo Terminal', value: sortiesTogo, icon: Anchor },
    { label: 'En route vers la PIA', value: versPia, icon: Truck, tone: 'success' as const },
  ];
  const isLoading = conteneursQuery.isLoading;
  const isError = conteneursQuery.isError;

  return (
    <OpsPage>
      <OpsHeader title={isTerminal ? `Sorties ${terminalName}` : 'Sorties des terminaux'} subtitle="Historique filtré sur la date de sortie terminal, même après réception à la PIA." actions={<><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} />{isTerminal && <Link className="ops-button ops-button-primary" to="/manifestes"><FileXls size={16} /> Importer mon manifeste</Link>}<button className="ops-button" onClick={() => conteneursQuery.refetch()}><ArrowClockwise size={15} className={conteneursQuery.isFetching ? 'animate-spin' : ''} /> Actualiser</button></>} />
      <p>{operationPeriodLabel(periode, date)}</p>
      <OpsMetricStrip items={isTerminal ? terminalMetrics : consolidatedMetrics} />
      <OpsPanel title="Parcours des conteneurs sortis sur la période" subtitle="Les positions PIA correspondent à leur situation actuelle, pas à leur situation historique.">
        <div className="ops-stage-lane">
          {[
            { title: 'Manifeste', value: conteneurs.length, icon: ShippingContainer, note: 'unités enregistrées' },
            { title: 'Vu à quai confirmé', value: sortiesAvecVaq, icon: Anchor, note: 'parmi ces sorties, quelle que soit la date VAQ' },
            { title: isTerminal ? `Sortie ${terminalName}` : 'Sortie terminal', value: isTerminal ? terminalSorties : sortiesLct + sortiesTogo, icon: Truck, note: isTerminal ? `sorties enregistrées par ${terminalName}` : 'sorties LCT ou Togo Terminal' },
            { title: 'Entrée PIA', value: recusPia, icon: MapPin, note: 'unités reçues à la PIA' },
          ].map(({ title, value, icon: StageIcon, note }) => <div className="ops-stage" key={title}><span><StageIcon size={22} weight="duotone" /></span><div><strong>{title}</strong><b>{value.toLocaleString('fr-FR')}</b><small>{note}</small></div></div>)}
        </div>
      </OpsPanel>
      <OpsPanel title="Sorties enregistrées" subtitle={`${conteneurs.length} sorties — ${operationPeriodLabel(periode, date)}`}>
        {isLoading ? <OpsState icon={ShippingContainer} title="Chargement des sorties" /> : isError ? <OpsState icon={WarningCircle} title="Sorties indisponibles" description="Les données des terminaux ne peuvent pas être chargées." tone="danger" /> : conteneurs.length === 0 ? <OpsState icon={CheckCircle} title="Aucune sortie sur cette période" description="Choisissez une autre date ou une autre période." tone="success" /> : <div className="ops-table-wrap"><table className="ops-table">
          <thead><tr><th>Conteneur</th><th>B/L · ATP</th><th>Terminal</th><th>Sortie terminal</th><th>Statut actuel</th><th>Action</th></tr></thead>
          <tbody>{conteneurs.map((item) => <tr key={item.id}>
            <td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link><small>Unité suivie</small></td>
            <td>{item.numeroBL}<small>{item.atp || 'ATP non renseigné'}</small></td>
            <td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte || 'À préciser'}</td>
            <td className="ops-mono">{item.dateSortieTerminal ? new Date(item.dateSortieTerminal).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'UTC' }) : '—'}</td>
            <td><StatusChip statut={item.statut} /></td>
            <td><Link className="ops-button" to={`/conteneurs/${item.id}`}>Contrôler <CheckCircle size={13} /></Link></td>
          </tr>)}</tbody>
        </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

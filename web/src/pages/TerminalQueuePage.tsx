import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Clock, ShippingContainer, WarningCircle } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { conteneurService } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { isPendingTerminal, terminalQueueAge, queueAgeLabels, type QueueAge } from '../utils/terminal-queue';
import { operationRange } from '../utils/operation-period';

export default function TerminalQueuePage() {
  const { user } = useAuth();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [age, setAge] = useState<QueueAge | 'tous'>('tous');
  const [batch, setBatch] = useState('tous');
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['conteneurs', 'file-terminal', user?.id], queryFn: () => conteneurService.getAll(), refetchInterval: 60_000 });
  const pending = (query.data?.data.conteneurs ?? []).filter(isPendingTerminal).sort((a, b) => (Date.parse(a.createdAt) || Infinity) - (Date.parse(b.createdAt) || Infinity) || a.id - b.id);
  const batches = [...new Map(pending.filter(row => row.manifeste).map(row => [String(row.manifeste!.id), row.manifeste!])).values()];
  const rows = pending.filter(row => (age === 'tous' || terminalQueueAge(row, date) === age)
    && (batch === 'tous' || (batch === 'aucun' ? !row.manifeste : String(row.manifeste?.id) === batch))
    && [row.numeroConteneur, row.numeroBL, row.atp].some(value => value?.toLocaleLowerCase('fr-FR').includes(search.trim().toLocaleLowerCase('fr-FR'))));
  const format = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('fr-FR', { timeZone: 'UTC' }) : 'Non renseignée';
  const terminal = user?.role === 'CONTROLEUR_LCT' ? 'LCT' : user?.role === 'CONTROLEUR_TOGO' ? 'Togo Terminal' : 'terminaux autorisés';
  return <OpsPage>
    <OpsHeader title={`Restant à sortir — ${terminal}`} subtitle="File actuelle des conteneurs sans sortie terminal enregistrée. Les plus anciens sont présentés en premier." actions={<Link to="/manifestes" className="ops-button ops-button-primary">Importer un manifeste</Link>} />
    {query.isLoading ? <OpsState icon={Clock} title="Chargement de la file" /> : query.isError ? <OpsState icon={WarningCircle} title="File indisponible" tone="danger" /> : <>
      <label>Date de comparaison <input className="ops-input" type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      <p>Ancienneté fondée sur le premier enregistrement dans l’application (Lomé / UTC), et non sur le dernier import ni la date de débarquement. Changer la date classe la file actuelle ; cela ne reconstitue pas une ancienne file.</p>
      {!operationRange('jour', date) ? <p role="alert">Choisissez une date valide.</p> : <>
        <OpsMetricStrip items={[
          { label: 'Restant à sortir — actuellement', value: pending.length, icon: ShippingContainer },
          { label: 'Antérieurs à la date', value: pending.filter(row => terminalQueueAge(row, date) === 'anciens').length, icon: Clock, tone: 'warning' },
          { label: 'Enregistrés à cette date', value: pending.filter(row => terminalQueueAge(row, date) === 'nouveaux').length, icon: ShippingContainer },
        ]} />
        <div className="ops-inline-actions">
          <select className="ops-select" aria-label="Ancienneté des conteneurs" value={age} onChange={e => setAge(e.target.value as typeof age)}><option value="tous">Toutes les anciennetés</option>{Object.entries(queueAgeLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
          <select className="ops-select" aria-label="Manifeste associé" value={batch} onChange={e => setBatch(e.target.value)}><option value="tous">Tous les manifestes associés</option><option value="aucun">Sans manifeste associé</option>{batches.map(item => <option key={item.id} value={item.id}>#{item.id} — {item.nomFichier}</option>)}</select>
          <input className="ops-input" aria-label="Rechercher dans la file terminal" placeholder="Conteneur, B/L ou ATP" value={search} onChange={e => setSearch(e.target.value)} />
          <button className="ops-button" onClick={() => { setAge('tous'); setBatch('tous'); setSearch(''); }}>Réinitialiser les filtres</button>
        </div>
        <OpsPanel title={`${rows.length} conteneur(s) à traiter`} subtitle="Les compteurs portent sur toute la file avant filtrage. Le manifeste affiché est le rattachement actuel ; un réimport ne change pas le premier enregistrement.">
          {!rows.length ? <OpsState icon={ShippingContainer} title="Aucun conteneur pour ces filtres" /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Conteneur / B/L</th><th>ATP / Terminal</th><th>Premier enregistrement</th><th>Ancienneté</th><th>Manifeste associé</th><th>Action</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}>
            <td><strong>{row.numeroConteneur || row.numeroBL}</strong><small>{row.numeroBL}</small></td><td>{row.atp || 'Non renseigné'}<small>{row.terminalAffecte === 'TOGO' ? 'Togo Terminal' : row.terminalAffecte || 'Non renseigné'}</small></td><td>{format(row.createdAt)}</td><td>{queueAgeLabels[terminalQueueAge(row, date)]}</td><td style={{ maxWidth: 280, overflowWrap: 'anywhere' }}>{row.manifeste ? `#${row.manifeste.id} — ${row.manifeste.nomFichier}` : 'Sans manifeste associé'}{row.manifeste && <small>Import : {format(row.manifeste.importedAt)}</small>}</td><td><Link className="ops-button ops-button-primary" to={`/conteneurs/${row.id}`}>Traiter</Link></td>
          </tr>)}</tbody></table></div>}
        </OpsPanel>
      </>}
    </>}
  </OpsPage>;
}

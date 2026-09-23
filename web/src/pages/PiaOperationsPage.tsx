import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ArrowCircleDown, ArrowCircleUp, Clock, DownloadSimple, MagnifyingGlass, Warehouse, WarningCircle } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { operationService, type OperationExportKind, type OperationPeriod } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';
import { OperationPeriodPicker } from '../components/OperationPeriodPicker';
import { inOperationPeriod, operationPeriodLabel } from '../utils/operation-period';

type RegisterView = 'expected' | 'inside' | 'exited';

export default function PiaOperationsPage() {
  const [search, setSearch] = useState('');
  const [view, setView] = useState<RegisterView>('expected');
  const [periode, setPeriode] = useState<OperationPeriod>('jour');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const query = useQuery({ queryKey: ['operations', 'pia'], queryFn: operationService.getPia });
  const rows = query.data?.data.conteneurs ?? [];
  const summary = query.data?.data.stats ?? { attendus: 0, attendusLct: 0, attendusTogo: 0, enSejour: 0, sortis: 0, sejourMoyenHeures: 0 };
  const rowsByView = rows.filter((item) => {
    if (view === 'expected') return item.statut === 'SORTI_TERMINAL' && !item.dateEntreePia;
    if (view === 'inside') return inOperationPeriod(item.dateEntreePia, periode, date);
    return inOperationPeriod(item.dateSortiePia, periode, date);
  });
  const normalizedSearch = search.trim().toLocaleLowerCase('fr-FR');
  const visibleRows = normalizedSearch
    ? rowsByView.filter((item) => [item.numeroConteneur, item.numeroBL, item.atp]
      .some((value) => value?.toLocaleLowerCase('fr-FR').includes(normalizedSearch)))
    : rowsByView;
  const viewMeta = {
    expected: { label: 'Attendus à la PIA', count: summary.attendus, icon: ArrowCircleDown, empty: 'Aucun conteneur attendu à la PIA' },
    inside: { label: 'Entrés à la PIA', count: rows.filter(item => inOperationPeriod(item.dateEntreePia, periode, date)).length, icon: Warehouse, empty: 'Aucune entrée PIA sur cette période' },
    exited: { label: 'Sortis de la PIA', count: rows.filter(item => inOperationPeriod(item.dateSortiePia, periode, date)).length, icon: ArrowCircleUp, empty: 'Aucune sortie PIA sur cette période' },
  } satisfies Record<RegisterView, { label: string; count: number; icon: typeof Warehouse; empty: string }>;
  const ActiveViewIcon = viewMeta[view].icon;
  const exportKind: Record<RegisterView, OperationExportKind> = { expected: 'sorties-terminal', inside: 'entrees-pia', exited: 'sorties-pia' };
  async function exportPeriod() {
    setExporting(true); setExportError('');
    try { await operationService.exportExcel(exportKind[view], periode, date); }
    catch { setExportError('Export impossible. Réessayez.'); }
    finally { setExporting(false); }
  }
  return <OpsPage>
    <OpsHeader title="Entrées et sorties PIA" subtitle="Les entrées restent visibles même après la sortie du conteneur. Les attendus correspondent à la file actuelle, sans filtre de date." actions={<><OperationPeriodPicker periode={periode} date={date} onPeriodChange={setPeriode} onDateChange={setDate} />{view !== 'expected' && <button className="ops-button" type="button" disabled={exporting} onClick={exportPeriod}><DownloadSimple size={17} />{exporting ? 'Export…' : 'Exporter la période (toutes références)'}</button>}</>} />
    <p>{operationPeriodLabel(periode, date)}</p>{exportError && <p role="alert">{exportError}</p>}
    <OpsMetricStrip items={[{ label: 'Attendus depuis LCT — actuellement', value: summary.attendusLct, icon: ArrowCircleDown, tone: 'warning' }, { label: 'Attendus depuis Togo Terminal — actuellement', value: summary.attendusTogo, icon: ArrowCircleDown, tone: 'warning' }, { label: 'Entrées PIA — période', value: viewMeta.inside.count, icon: Warehouse }, { label: 'Sorties PIA — période', value: viewMeta.exited.count, icon: ArrowCircleUp, tone: 'success' }]} />
    <OpsPanel title="Registre PIA" subtitle={`Présents actuellement : ${summary.enSejour}. Séjour moyen terminé — tout l’historique : ${summary.sejourMoyenHeures.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h.`} action={<div className="ops-search"><MagnifyingGlass size={15} /><input className="ops-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Conteneur, B/L ou ATP" aria-label="Rechercher dans le registre PIA" /></div>}>
      <div className="pia-register-tabs" role="tablist" aria-label="Filtrer le registre PIA par étape">
        {(Object.keys(viewMeta) as RegisterView[]).map((key) => {
          const item = viewMeta[key];
          const FilterIcon = item.icon;
          return <button key={key} type="button" role="tab" aria-selected={view === key} className={view === key ? 'active' : ''} onClick={() => setView(key)}><FilterIcon size={18} weight="duotone" /><span>{item.label}</span><strong>{item.count.toLocaleString('fr-FR')}</strong></button>;
        })}
      </div>
      {query.isLoading ? <OpsState icon={Warehouse} title="Chargement du registre PIA" /> : query.isError ? <OpsState icon={WarningCircle} title="Registre indisponible" tone="danger" /> : !rows.length ? <OpsState icon={Warehouse} title="Aucun conteneur attendu ou reçu" /> : !visibleRows.length ? <OpsState icon={normalizedSearch ? MagnifyingGlass : ActiveViewIcon} title={normalizedSearch ? 'Aucune référence trouvée' : viewMeta[view].empty} description={normalizedSearch ? 'Vérifiez le numéro de conteneur, le B/L ou l’ATP.' : undefined} /> : <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Références</th><th>Terminal de sortie</th><th>État PIA</th><th>Entrée PIA</th><th>Durée de séjour</th><th>Sortie PIA</th><th>Pays de destination</th></tr></thead><tbody>{visibleRows.map((item) => <tr key={item.id}><td><Link className="ops-mono" to={`/conteneurs/${item.id}`}>{item.numeroConteneur || item.numeroBL}</Link><small>B/L {item.numeroBL} · {item.atp || 'ATP non renseigné'}</small></td><td>{item.terminalAffecte === 'TOGO' ? 'Togo Terminal' : item.terminalAffecte || '-'}</td><td>{item.statut === 'SORTI_TERMINAL' ? <span className="status-chip status-warning"><Clock size={13} /> Attendu à la PIA</span> : item.dateSortiePia ? <span className="status-chip status-success"><ArrowCircleUp size={13} /> Sorti de la PIA</span> : <span className="status-chip status-info"><Warehouse size={13} /> En séjour</span>}</td><td>{item.dateEntreePia ? new Date(item.dateEntreePia).toLocaleString('fr-FR') : '-'}</td><td>{item.sejourJours == null ? '-' : `${item.sejourJours} jour${item.sejourJours > 1 ? 's' : ''}`}</td><td>{item.dateSortiePia ? new Date(item.dateSortiePia).toLocaleString('fr-FR') : '-'}</td><td>{item.paysDestination || item.destination || 'À renseigner'}</td></tr>)}</tbody></table></div>}
    </OpsPanel>
  </OpsPage>;
}

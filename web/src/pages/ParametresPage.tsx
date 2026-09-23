import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Gear, WarningCircle, Clock, Anchor, Truck, Warehouse, ShieldCheck, PencilSimple, CheckCircle, FileXls, GlobeHemisphereWest, Plus } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { settingsService, type OperationalSettings } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const labels = { ATTENDU_PIA: 'Attendu : vue à quai non confirmée', VU_A_QUAI: 'À quai : sortie terminal non enregistrée', SORTI_TERMINAL: 'En route : entrée PIA non enregistrée', ENTRE_PIA: 'Séjour PIA : sortie non enregistrée' };

function DestinationCountries({ settings }: { settings: OperationalSettings }) {
  const cache = useQueryClient();
  const [country, setCountry] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function toggle(name: string, active: boolean) {
    if (pending) return;
    setPending(true); setError(''); setSuccess('');
    try {
      const result = await settingsService.setCountryActive(name, active, settings.version);
      cache.setQueryData(['settings'], result);
      await cache.invalidateQueries({ queryKey: ['destination-countries'] });
      setSuccess(`${name} ${active ? 'réactivé' : 'désactivé'}. Les opérations déjà enregistrées sont conservées.`);
    } catch (e) { setError(isAxiosError(e) ? e.response?.data?.error || 'Modification impossible.' : 'Modification impossible.'); }
    finally { setPending(false); }
  }
  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true); setError(''); setSuccess('');
    try {
      const result = await settingsService.addCountry(country, settings.version);
      cache.setQueryData(['settings'], result);
      await cache.invalidateQueries({ queryKey: ['destination-countries'] });
      setCountry(''); setSuccess('Pays ajouté à la liste des destinations.');
    } catch (e) { setError(isAxiosError(e) ? e.response?.data?.error || 'Ajout impossible.' : 'Ajout impossible.'); }
    finally { setPending(false); }
  }
  return <OpsPanel title="Pays de destination" subtitle="Liste proposée lors d’une sortie PIA. Burkina Faso, Mali et Niger sont disponibles au départ. Le Togo reste exclu.">
    <p>Un pays désactivé n’est plus proposé pour les nouvelles sorties. Son historique reste conservé.</p>
    <div className="ops-settings-list">{settings.destinationCountries.map(name => {
      const inactive = settings.disabledDestinationCountries?.includes(name) ?? false;
      return <div key={name}><GlobeHemisphereWest size={22} weight="duotone" /><span><strong>{name}</strong><small>{inactive ? 'Désactivé' : 'Actif'}</small></span><button type="button" className="ops-button" disabled={pending} aria-label={`${inactive ? 'Réactiver' : 'Désactiver'} ${name}`} onClick={() => void toggle(name, inactive)}>{inactive ? 'Réactiver' : 'Désactiver'}</button></div>;
    })}</div>
    <form className="admin-form" onSubmit={add}><fieldset disabled={pending}><div className="ops-field"><label htmlFor="newDestinationCountry">Ajouter un pays de destination</label><input id="newDestinationCountry" className="ops-input" required minLength={2} maxLength={80} value={country} onChange={event => setCountry(event.target.value)} placeholder="Nom du pays" /></div><button type="submit" className="ops-button ops-button-primary"><Plus size={18} />{pending ? 'Enregistrement…' : 'Ajouter le pays'}</button></fieldset></form>
    {error && <p role="alert" className="admin-error">{error} <button type="button" className="ops-button" onClick={() => void cache.invalidateQueries({ queryKey: ['settings'] })}>Actualiser les paramètres</button></p>}
    {success && <p role="status" className="admin-save-success"><CheckCircle size={20} />{success}</p>}
  </OpsPanel>;
}

function SettingsForm({ initial, onSaved, onCancel }: { initial: OperationalSettings; onSaved: () => void; onCancel: () => void }) {
  const cache = useQueryClient();
  const [rules, setRules] = useState(initial.rules);
  const [version, setVersion] = useState(initial.version);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => { setRules(initial.rules); setVersion(initial.version); }, [initial]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (pending) return;
    setPending(true); setError(''); setMessage('');
    try {
      const result = await settingsService.save({ rules, version });
      setVersion(result.data.version);
      cache.setQueryData(['settings'], result);
      await cache.invalidateQueries({ queryKey: ['anomalies'] });
      onSaved();
    } catch (e) { setError(isAxiosError(e) ? e.response?.data?.error || 'Enregistrement impossible.' : 'Enregistrement impossible.'); }
    finally { setPending(false); }
  }
  return <form className="admin-form" onSubmit={save}><fieldset disabled={pending}>
    <div className="ops-table-wrap"><table className="ops-table"><thead><tr><th>Étape surveillée</th><th>Alerte après (heures)</th><th>Critique après (heures)</th></tr></thead><tbody>
      {(Object.keys(labels) as Array<keyof typeof labels>).map(key => <tr key={key}><td>{labels[key]}</td>
        {(['warningAfterHours', 'criticalAfterHours'] as const).map(field => <td key={field}><input className="ops-input" aria-label={`${labels[key]} — ${field === 'warningAfterHours' ? 'alerte' : 'critique'}`} type="number" required step="1" min={field === 'warningAfterHours' ? 1 : rules[key].warningAfterHours + 1} max={field === 'warningAfterHours' ? 8760 : 17520} value={Number.isNaN(rules[key][field]) ? '' : rules[key][field]} onChange={e => setRules({ ...rules, [key]: { ...rules[key], [field]: e.target.valueAsNumber } })} /></td>)}
      </tr>)}
    </tbody></table></div>
    <p>Le seuil critique doit être supérieur au seuil d’alerte. Ces réglages concernent tous les terminaux et ne modifient aucune date d’opération.</p>
    {error && <p role="alert" className="admin-error">{error}</p>}{message && <p role="status">{message}</p>}
    <div className="admin-form-actions"><button className="ops-button ops-button-primary" type="submit">{pending ? 'Enregistrement…' : 'Enregistrer les paramètres'}</button><button className="ops-button" type="button" onClick={onCancel}>Annuler les modifications</button></div>
  </fieldset></form>;
}

export default function ParametresPage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const query = useQuery({ queryKey: ['settings'], queryFn: settingsService.get });
  const data = query.data?.data;
  const items = [
    { key: 'ATTENDU_PIA' as const, label: 'Attente vue à quai', icon: Clock },
    { key: 'VU_A_QUAI' as const, label: 'Sortie terminal', icon: Anchor },
    { key: 'SORTI_TERMINAL' as const, label: 'Transfert vers PIA', icon: Truck },
    { key: 'ENTRE_PIA' as const, label: 'Séjour PIA', icon: Warehouse },
  ];
  return <OpsPage>
    <OpsHeader title="Paramètres opérationnels" subtitle="Références de contrôle, seuils du parcours et sécurité des accès" actions={!editing && <button className="ops-button ops-button-primary" disabled={!data} onClick={() => { setEditing(true); setSaved(false); }}><PencilSimple size={18} /> Modifier les paramètres</button>} />
    {saved && <p role="status" className="admin-save-success"><CheckCircle size={20} /> Paramètres enregistrés. Les nouveaux seuils sont appliqués à la prochaine actualisation des anomalies.</p>}
    {query.isLoading ? <OpsState icon={Gear} title="Chargement des paramètres" /> : query.isError ? <OpsState icon={WarningCircle} title="Paramètres indisponibles" description="Vérifiez votre connexion puis rechargez la page." tone="danger" /> : data && <>
      <OpsMetricStrip items={items.map(item => ({ label: item.label, icon: item.icon, value: `${data.rules[item.key].warningAfterHours} h`, tone: 'warning' as const }))} />
      {editing ? <OpsPanel title="Modifier les seuils d’alerte" subtitle="Les seuils critiques doivent dépasser les seuils d’alerte."><SettingsForm initial={data} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setSaved(true); }} /></OpsPanel> : <div className="ops-settings-grid">
        <OpsPanel title="Règles du parcours" subtitle="Seuils enregistrés pour le suivi des opérations">
          <div className="ops-settings-list">{items.map(({ key, label, icon: Icon }) => <div key={key}><Icon size={22} weight="duotone" /><span><strong>{label}</strong><small>{labels[key]}</small></span><b className="ops-mono">{data.rules[key].warningAfterHours} h<small>Critique : {data.rules[key].criticalAfterHours} h</small></b></div>)}</div>
        </OpsPanel>
        <OpsPanel title="Administration et plateforme" subtitle="Identité active et règles générales">
          <div className="ops-profile-block"><span><ShieldCheck size={24} weight="duotone" /></span><div><strong>{user?.prenom} {user?.nom}</strong><small>{user?.email}</small></div></div>
          <div className="ops-settings-list compact"><div><ShieldCheck size={20} /><span><strong>Administrateur</strong><small>Gestion des comptes et des paramètres</small></span><b>Tous les droits</b></div><div><Clock size={20} /><span><strong>Calendrier opérationnel</strong><small>Dates des opérations</small></span><b>Lomé / UTC</b></div><div><FileXls size={20} /><span><strong>Import des manifestes</strong><small>Excel et XML · pia=Y, Togo confirmé exclu</small></span><b>10 Mo</b></div><div><Gear size={20} /><span><strong>Dernier enregistrement</strong><small>Réglages persistants</small></span><b>{data.updatedAt ? new Date(data.updatedAt).toLocaleString('fr-FR') : 'Valeurs initiales'}</b></div></div>
        </OpsPanel>
      </div>}
      {!editing && <DestinationCountries settings={data} />}
    </>}
  </OpsPage>;
}

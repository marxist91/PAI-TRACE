import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useAuth } from '../contexts/AuthContext';
import {
  ArrowClockwise,
  CheckCircle,
  Factory,
  Eye,
  EyeSlash,
  MagnifyingGlass,
  MapPin,
  ShieldCheck,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { userService, type UserSummary, type Role } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  LOGISTICIEN: 'Logisticien PAL',
  CONTROLEUR_LCT: 'Agent LCT',
  CONTROLEUR_TOGO: 'Agent Togo Terminal',
  AGENT_PIA: 'Agent PIA',
};
const rights: Record<string, string> = {
  ADMIN: 'Tous les droits, y compris la gestion des utilisateurs et des paramètres.',
  LOGISTICIEN: 'Toutes les opérations, les deux terminaux, la PIA et les statistiques. Sans gestion des utilisateurs ni des paramètres.',
  CONTROLEUR_LCT: 'Import des manifestes LCT, consultation et validation des sorties LCT uniquement.',
  CONTROLEUR_TOGO: 'Import des manifestes Togo Terminal, consultation et validation des sorties de ce terminal uniquement.',
  AGENT_PIA: 'Réception des conteneurs des deux terminaux, validation des entrées et sorties PIA.',
};
const emptyForm = { nom: '', prenom: '', email: '', telephone: '', role: 'CONTROLEUR_LCT' as Role, password: '', isActive: true };

export default function UtilisateursPage() {
  const { user: currentUser, logout } = useAuth();
  const cache = useQueryClient();
  const [editor, setEditor] = useState<UserSummary | 'new' | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  function openEditor(user: UserSummary | 'new') {
    setEditor(user); setError(''); setMessage(''); setShowPassword(false);
    setForm(user === 'new' ? emptyForm : { nom: user.nom, prenom: user.prenom, email: user.email, telephone: user.telephone || '', role: user.role, password: '', isActive: user.isActive });
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (!editor || pending) return;
    const sensitive = editor !== 'new' && (form.role !== editor.role || form.isActive !== editor.isActive || !!form.password || form.email !== editor.email);
    if (sensitive && !window.confirm('Enregistrer ces changements ? Les sessions de cet utilisateur seront fermées.')) return;
    setPending(true); setError('');
    try {
      if (editor === 'new') await userService.create(form);
      else {
        const response = await userService.update(editor.id, { ...form, password: form.password || undefined, updatedAt: editor.updatedAt });
        if (editor.id === currentUser?.id && response.data.sessionRevoked) { await logout(); return; }
      }
      setMessage(editor === 'new' ? 'Compte créé. Transmettez le mot de passe par un canal sécurisé.' : 'Compte mis à jour.');
      setEditor(null); setForm(emptyForm); await cache.invalidateQueries({ queryKey: ['users'] });
    } catch (e) { setError(isAxiosError(e) ? e.response?.data?.error || 'Enregistrement impossible. Vérifiez la connexion.' : 'Enregistrement impossible.'); }
    finally { setPending(false); }
  }
  const [search, setSearch] = useState('');
  const query = useQuery({ queryKey: ['users'], queryFn: () => userService.getAll() });
  const users = query.data?.data.users ?? [];
  const filteredUsers = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('fr-FR');
    if (!term) return users;
    return users.filter((user) => `${user.prenom} ${user.nom} ${user.email}`.toLocaleLowerCase('fr-FR').includes(term));
  }, [search, users]);
  const logisticiens = users.filter((user) => user.role === 'LOGISTICIEN').length;
  const terminalAgents = users.filter((user) => ['CONTROLEUR_LCT', 'CONTROLEUR_TOGO'].includes(user.role)).length;
  const piaAgents = users.filter((user) => user.role === 'AGENT_PIA').length;

  return (
    <OpsPage>
      <OpsHeader title="Agents et accès" subtitle="Créer des comptes et attribuer les droits par rôle opérationnel" actions={<><button className="ops-button" onClick={() => query.refetch()}><ArrowClockwise size={15} /> Actualiser</button><button className="ops-button ops-button-primary" disabled={pending} onClick={() => openEditor('new')}>Créer un utilisateur</button></>} />
      {message && <p role="status">{message}</p>}
      {editor && <OpsPanel title={editor === 'new' ? 'Nouveau compte' : `Modifier ${editor.prenom} ${editor.nom}`} subtitle="Les droits sont appliqués côté serveur. Aucun mot de passe existant n’est affiché.">
        <form className="admin-form" onSubmit={save}>
          <fieldset disabled={pending}>
            <div className="admin-form-grid">
              {(['prenom', 'nom', 'email', 'telephone'] as const).map(key => <label key={key}>{({ prenom: 'Prénom', nom: 'Nom', email: 'Adresse email', telephone: 'Téléphone' })[key]}<input className="ops-input" required={key !== 'telephone'} type={key === 'email' ? 'email' : key === 'telephone' ? 'tel' : 'text'} maxLength={key === 'email' ? 254 : key === 'telephone' ? 30 : 100} value={form[key]} onChange={e => setForm({ ...form, [key]: e.target.value })} /></label>)}
              <label>Rôle et droits<select className="ops-input" value={form.role} disabled={editor !== 'new' && editor.id === currentUser?.id} onChange={e => setForm({ ...form, role: e.target.value as Role })}>{Object.entries(roleLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <div><label htmlFor="agent-password">{editor === 'new' ? 'Mot de passe initial' : 'Nouveau mot de passe (facultatif)'}</label><div className="admin-password"><input id="agent-password" className="ops-input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} maxLength={72} required={editor === 'new'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /><button className="ops-button" type="button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}</button></div><small>8 caractères minimum. Vide en modification : mot de passe inchangé.</small></div>
            </div>
            <p>{rights[form.role]}</p>
            <label><input type="checkbox" checked={form.isActive} disabled={editor !== 'new' && editor.id === currentUser?.id} onChange={e => setForm({ ...form, isActive: e.target.checked })} /> Compte actif — décocher bloque l’accès sans supprimer l’historique.</label>
            {error && <p role="alert" className="admin-error">{error}</p>}
            <div className="admin-form-actions"><button className="ops-button ops-button-primary" type="submit">{pending ? 'Enregistrement…' : 'Enregistrer'}</button><button className="ops-button" type="button" onClick={() => { setEditor(null); setForm(emptyForm); }}>Annuler</button></div>
          </fieldset>
        </form>
      </OpsPanel>}
      <OpsMetricStrip items={[
        { label: 'Utilisateurs', value: users.length, icon: Users },
        { label: 'Logisticiens', value: logisticiens, icon: ShieldCheck, tone: 'warning' },
        { label: 'Agents terminaux', value: terminalAgents, icon: Factory },
        { label: 'Agents PIA', value: piaAgents, icon: MapPin, tone: 'success' },
      ]} />
      <div className="ops-toolbar"><div className="ops-search"><MagnifyingGlass size={15} /><input className="ops-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom ou adresse email" aria-label="Rechercher un utilisateur" /></div></div>
      <OpsPanel title={`${filteredUsers.length} agents`} subtitle="Les mots de passe et jetons ne sont jamais exposés dans cette vue">
        {query.isLoading ? <OpsState icon={Users} title="Chargement des utilisateurs" /> :
          query.isError ? <OpsState icon={WarningCircle} title="Utilisateurs indisponibles" description="Votre rôle ou la connexion API ne permet pas cette lecture." tone="danger" /> :
          filteredUsers.length === 0 ? <OpsState icon={MagnifyingGlass} title="Aucun utilisateur trouvé" /> :
          <div className="ops-table-wrap"><table className="ops-table">
            <thead><tr><th>Agent</th><th>Rôle opérationnel</th><th>Téléphone</th><th>Mouvements</th><th>État</th><th>Actions</th></tr></thead>
            <tbody>{filteredUsers.map((user) => <tr key={user.id}>
              <td><strong>{user.prenom} {user.nom}</strong><small>{user.email}</small></td>
              <td><span className={`ops-severity ${user.role === 'LOGISTICIEN' ? 'ops-severity-warning' : 'ops-severity-info'}`}>{user.role === 'LOGISTICIEN' ? <ShieldCheck size={13} /> : <CheckCircle size={13} />}{roleLabels[user.role] || user.role}</span></td>
              <td>{user.telephone || 'Non renseigné'}</td>
              <td className="ops-mono">{user._count.mouvements.toLocaleString('fr-FR')}</td>
              <td>{user.isActive ? 'Actif' : 'Désactivé'}</td>
              <td><button className="ops-button" disabled={pending} onClick={() => openEditor(user)}>Modifier</button></td>
            </tr>)}</tbody>
          </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowClockwise,
  CheckCircle,
  Factory,
  MagnifyingGlass,
  MapPin,
  ShieldCheck,
  Users,
  WarningCircle,
} from '@phosphor-icons/react';
import { userService } from '../services/api';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel, OpsState } from '../components/OperationsUI';

const roleLabels: Record<string, string> = {
  LOGISTICIEN: 'Logisticien PAL',
  CONTROLEUR_LCT: 'Agent LCT',
  CONTROLEUR_TOGO: 'Agent Togo Terminal',
  AGENT_PIA: 'Agent PIA',
};

export default function UtilisateursPage() {
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
      <OpsHeader title="Agents et accès" subtitle="Comptes internes autorisés à opérer dans PIA-TRACE" actions={<button className="ops-button" onClick={() => query.refetch()}><ArrowClockwise size={15} className={query.isFetching ? 'animate-spin' : ''} /> Actualiser</button>} />
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
            <thead><tr><th>Agent</th><th>Rôle opérationnel</th><th>Téléphone</th><th>Mouvements</th><th>Création</th></tr></thead>
            <tbody>{filteredUsers.map((user) => <tr key={user.id}>
              <td><strong>{user.prenom} {user.nom}</strong><small>{user.email}</small></td>
              <td><span className={`ops-severity ${user.role === 'LOGISTICIEN' ? 'ops-severity-warning' : 'ops-severity-info'}`}>{user.role === 'LOGISTICIEN' ? <ShieldCheck size={13} /> : <CheckCircle size={13} />}{roleLabels[user.role] || user.role}</span></td>
              <td>{user.telephone || 'Non renseigné'}</td>
              <td className="ops-mono">{user._count.mouvements.toLocaleString('fr-FR')}</td>
              <td className="ops-mono">{new Date(user.createdAt).toLocaleDateString('fr-FR')}</td>
            </tr>)}</tbody>
          </table></div>}
      </OpsPanel>
    </OpsPage>
  );
}

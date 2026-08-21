import { Clock, Database, FileXls, Gear, ShieldCheck, Warehouse } from '@phosphor-icons/react';
import { useAuth } from '../contexts/AuthContext';
import { OpsHeader, OpsMetricStrip, OpsPage, OpsPanel } from '../components/OperationsUI';

const settings = [
  { label: 'Actualisation', value: '30 s', icon: Clock, description: 'Rafraîchissement des listes opérationnelles' },
  { label: 'Fenêtre journalière', value: '24 h', icon: Gear, description: 'Regroupement des entrées et sorties du jour' },
  { label: 'Alerte séjour PIA', value: '72 h', icon: Warehouse, description: 'Seuil provisoire à valider avec la PIA' },
  { label: 'Taille du manifeste', value: '10 Mo', icon: FileXls, description: 'Taille maximale d’un fichier Excel importé' },
];

const roleLabels: Record<string, string> = {
  LOGISTICIEN: 'Logisticien PAL',
  CONTROLEUR_LCT: 'Agent LCT',
  CONTROLEUR_TOGO: 'Agent Togo Terminal',
  AGENT_PIA: 'Agent PIA',
};

export default function ParametresPage() {
  const { user } = useAuth();
  return (
    <OpsPage>
      <OpsHeader title="Paramètres opérationnels" subtitle="Références de contrôle, sécurité de la session et état de la plateforme" />
      <OpsMetricStrip items={settings.map((item, index) => ({ ...item, tone: index === 2 ? 'warning' as const : 'default' as const }))} />
      <div className="ops-settings-grid">
        <OpsPanel title="Règles du parcours" subtitle="Paramètres appliqués au suivi du manifeste jusqu’à la sortie de la PIA">
          <div className="ops-settings-list">{settings.map(({ label, value, icon: SettingIcon, description }) => <div key={label}><SettingIcon size={18} weight="duotone" /><span><strong>{label}</strong><small>{description}</small></span><b className="ops-mono">{value}</b></div>)}</div>
        </OpsPanel>
        <OpsPanel title="Session active" subtitle="Identité et niveau d’accès actuellement utilisés">
          <div className="ops-profile-block"><span><Gear size={22} weight="duotone" /></span><div><strong>{user?.prenom} {user?.nom}</strong><small>{user?.email}</small></div></div>
          <div className="ops-settings-list compact"><div><ShieldCheck size={18} /><span><strong>Rôle</strong><small>Droits appliqués aux opérations</small></span><b>{roleLabels[user?.role ?? ''] ?? 'Accès non reconnu'}</b></div><div><Database size={18} /><span><strong>Source des données</strong><small>Prisma PostgreSQL</small></span><b>Connectée</b></div><div><Clock size={18} /><span><strong>Parcours actif</strong><small>Manifeste, quai, terminaux et PIA</small></span><b>6 étapes</b></div></div>
        </OpsPanel>
      </div>
    </OpsPage>
  );
}

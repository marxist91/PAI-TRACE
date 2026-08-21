import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowsLeftRight,
  Bell,
  ChartBar,
  Clock,
  Gear,
  List,
  MapPin,
  ShippingContainer,
  SignOut,
  SquaresFour,
  Users,
  Warning,
  X,
  UserCircle,
  FileXls,
  Anchor,
  Warehouse,
  type Icon,
} from '@phosphor-icons/react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { notificationService } from '../services/api';
import { createRealtimeSocket } from '../services/realtime';
import NotificationCenter from './NotificationCenter';

const navItems: Array<{ path: string; label: string; icon: Icon }> = [
  { path: '/', label: 'Pilotage', icon: SquaresFour },
  { path: '/manifestes', label: 'Manifestes', icon: FileXls },
  { path: '/quai', label: 'Vue à quai', icon: Anchor },
  { path: '/conteneurs', label: 'Conteneurs', icon: ShippingContainer },
  { path: '/checkpoints', label: 'Sorties terminaux', icon: MapPin },
  { path: '/pia', label: 'Flux PIA', icon: Warehouse },
  { path: '/mouvements', label: 'Mouvements', icon: ArrowsLeftRight },
  { path: '/anomalies', label: 'Anomalies', icon: Warning },
  { path: '/rapports', label: 'Statistiques', icon: ChartBar },
  { path: '/utilisateurs', label: 'Utilisateurs', icon: Users },
  { path: '/parametres', label: 'Paramètres', icon: Gear },
];

const terminalNavItems: typeof navItems = [
  { path: '/', label: 'File de contrôle', icon: SquaresFour },
  { path: '/manifestes', label: 'Mes manifestes', icon: FileXls },
  { path: '/quai', label: 'Vue à quai', icon: Anchor },
  { path: '/conteneurs', label: 'Conteneurs', icon: ShippingContainer },
  { path: '/checkpoints', label: 'Sorties terminal', icon: MapPin },
  { path: '/mouvements', label: 'Mouvements', icon: ArrowsLeftRight },
  { path: '/anomalies', label: 'Anomalies', icon: Warning },
  { path: '/parametres', label: 'Mon compte', icon: Gear },
];

const piaNavItems: typeof navItems = [
  { path: '/', label: 'Réceptions PIA', icon: SquaresFour },
  { path: '/conteneurs', label: 'Conteneurs', icon: ShippingContainer },
  { path: '/pia', label: 'Entrées / sorties', icon: Warehouse },
  { path: '/checkpoints', label: 'Contrôles PIA', icon: MapPin },
  { path: '/mouvements', label: 'Mouvements', icon: ArrowsLeftRight },
  { path: '/anomalies', label: 'Anomalies', icon: Warning },
  { path: '/parametres', label: 'Mon compte', icon: Gear },
];

const roleLabels: Record<string, string> = {
  LOGISTICIEN: 'Logisticien PAL',
  CONTROLEUR_LCT: 'Contrôleur LCT', CONTROLEUR_TOGO: 'Contrôleur Togo Terminal', AGENT_PIA: 'Agent PIA',
};

function Navigation({ items, close }: { items: typeof navItems; close?: () => void }) {
  const location = useLocation();

  return (
    <nav className="command-nav" aria-label="Navigation principale">
      {items.map((item) => {
        const active = item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path);
        const NavIcon = item.icon;
        return (
          <Link key={item.path} to={item.path} onClick={close} className={active ? 'active' : ''} title={item.label}>
            <NavIcon size={23} weight={active ? 'fill' : 'regular'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Layout() {
  const { logout, accessToken, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll({ limit: 30 }),
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!accessToken) return;
    const socket = createRealtimeSocket(accessToken);

    const refreshOperations = () => {
      queryClient.invalidateQueries({ queryKey: ['conteneurs'] });
      queryClient.invalidateQueries({ queryKey: ['checkpoints'] });
      queryClient.invalidateQueries({ queryKey: ['mouvements'] });
      queryClient.invalidateQueries({ queryKey: ['anomalies'] });
      queryClient.invalidateQueries({ queryKey: ['operations'] });
    };

    const refreshNotifications = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', refreshNotifications);
    socket.on('operations:changed', refreshOperations);

    return () => {
      socket.off('notification:new', refreshNotifications);
      socket.off('operations:changed', refreshOperations);
      socket.disconnect();
    };
  }, [accessToken, queryClient]);

  const activeNavItems = user?.role === 'CONTROLEUR_LCT' || user?.role === 'CONTROLEUR_TOGO' ? terminalNavItems
        : user?.role === 'AGENT_PIA' ? piaNavItems : navItems;
  const homeTitles: Record<string, string> = {
    LOGISTICIEN: 'Centre des opérations',
    CONTROLEUR_LCT: 'Poste LCT',
    CONTROLEUR_TOGO: 'Poste Togo Terminal',
    AGENT_PIA: 'Réception PIA',
  };
  const pageTitle = location.pathname === '/'
    ? homeTitles[user?.role ?? ''] ?? 'PIA-TRACE'
    : activeNavItems.find((item) => item.path !== '/' && location.pathname.startsWith(item.path))?.label ?? 'PIA-TRACE';

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="command-shell">
      <aside className="command-sidebar">
        <Link to="/" className="command-brand" aria-label="PIA-TRACE, accueil">
          <img src="/togo-port-logo.jpg" alt="Logo du Port Autonome de Lomé" />
          <span><strong>PIA-TRACE</strong><small>Port Autonome de Lomé</small></span>
        </Link>
        <Navigation items={activeNavItems} />
        <div className="command-sidebar-foot">
          <button onClick={handleLogout}><SignOut size={18} /><span>Déconnexion</span></button>
        </div>
      </aside>

      {mobileOpen && (
        <div className="command-mobile-layer">
          <button className="command-mobile-backdrop" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu" />
          <aside className="command-mobile-menu">
            <div className="flex items-center justify-between">
              <Link to="/" className="command-brand" onClick={() => setMobileOpen(false)}>
                <img src="/togo-port-logo.jpg" alt="Logo du Port Autonome de Lomé" />
                <span><strong>PIA-TRACE</strong><small>Port Autonome de Lomé</small></span>
              </Link>
              <button onClick={() => setMobileOpen(false)} aria-label="Fermer"><X size={22} /></button>
            </div>
            <Navigation items={activeNavItems} close={() => setMobileOpen(false)} />
            <div className="command-sidebar-foot command-mobile-foot">
              <button onClick={handleLogout}><SignOut size={18} /><span>Déconnexion</span></button>
            </div>
          </aside>
        </div>
      )}

      <div className="command-content">
        <header className="command-topbar">
          <button className="command-menu-button" onClick={() => setMobileOpen(true)} aria-label="Ouvrir le menu"><List size={22} /></button>
          <h1>{pageTitle}</h1>
          <div className="command-top-actions">
            <div className="command-account"><UserCircle size={20} weight="duotone" /><span><strong>{user?.prenom} {user?.nom}</strong><small>{roleLabels[user?.role ?? ''] ?? user?.role}</small></span></div>
            <div className="command-live"><span /><b className="live-online">En direct</b><b className="live-offline">Hors connexion</b></div>
            <div className="command-time"><Clock size={17} /> {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} GMT</div>
            <button
              type="button"
              className="command-notification"
              aria-label={`Consulter les notifications${notificationsQuery.data?.data.unreadCount ? `, ${notificationsQuery.data.data.unreadCount} non lues` : ''}`}
              aria-expanded={notificationsOpen}
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={20} />
              {!!notificationsQuery.data?.data.unreadCount && <span>{Math.min(notificationsQuery.data.data.unreadCount, 99)}</span>}
            </button>
          </div>
        </header>
        <main className="command-main"><Outlet /></main>
      </div>
      <NotificationCenter open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />
    </div>
  );
}

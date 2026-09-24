import { lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PageLoader from './components/PageLoader';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import type { Role } from './services/api';

const Layout = lazy(() => import('./components/Layout'));
const ConteneursPage = lazy(() => import('./pages/ConteneursPage'));
const ConteneurDetailPage = lazy(() => import('./pages/ConteneurDetailPage'));
const ConteneurFormPage = lazy(() => import('./pages/ConteneurFormPage'));
const CheckpointsPage = lazy(() => import('./pages/CheckpointsPage'));
const RapportsPage = lazy(() => import('./pages/RapportsPage'));
const MouvementsPage = lazy(() => import('./pages/MouvementsPage'));
const AnomaliesPage = lazy(() => import('./pages/AnomaliesPage'));
const UtilisateursPage = lazy(() => import('./pages/UtilisateursPage'));
const ParametresPage = lazy(() => import('./pages/ParametresPage'));
const OperationalDashboardPage = lazy(() => import('./pages/OperationalDashboardPage'));
const PilotagePage = lazy(() => import('./pages/PilotagePage'));
const ManifestesPage = lazy(() => import('./pages/ManifestesPage'));
const QuaiPage = lazy(() => import('./pages/QuaiPage'));
const PiaOperationsPage = lazy(() => import('./pages/PiaOperationsPage'));
const SejoursPage = lazy(() => import('./pages/SejoursPage'));
const TerminalQueuePage = lazy(() => import('./pages/TerminalQueuePage'));

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]" />
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function RoleRoute({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user } = useAuth();
  return user && (roles.includes(user.role) || (user.role === 'ADMIN' && roles.includes('LOGISTICIEN'))) ? children : <Navigate to="/" replace />;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role && ['CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'].includes(user.role)) return <OperationalDashboardPage />;
  if (!user || !['ADMIN', 'LOGISTICIEN'].includes(user.role)) return <Navigate to="/login" replace />;
  return <PilotagePage />;
}

export default function App() {
  return (
    <PageLoader>
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<RoleHome />} />
        <Route path="conteneurs" element={<ConteneursPage />} />
        <Route path="manifestes" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO']}><ManifestesPage /></RoleRoute>} />
        <Route path="quai" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><QuaiPage /></RoleRoute>} />
        <Route path="pia" element={<RoleRoute roles={['LOGISTICIEN', 'AGENT_PIA']}><PiaOperationsPage /></RoleRoute>} />
        <Route path="sejours" element={<RoleRoute roles={['LOGISTICIEN', 'AGENT_PIA']}><SejoursPage /></RoleRoute>} />
        <Route path="file-terminal" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO']}><TerminalQueuePage /></RoleRoute>} />
        <Route path="conteneurs/nouveau" element={<RoleRoute roles={['LOGISTICIEN']}><ConteneurFormPage /></RoleRoute>} />
        <Route path="conteneurs/:id" element={<ConteneurDetailPage />} />
        <Route path="conteneurs/:id/editer" element={<RoleRoute roles={['LOGISTICIEN']}><ConteneurFormPage /></RoleRoute>} />
        <Route path="checkpoints" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><CheckpointsPage /></RoleRoute>} />
        <Route path="rapports" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><RapportsPage /></RoleRoute>} />
        <Route path="mouvements" element={<MouvementsPage />} />
        <Route path="anomalies" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><AnomaliesPage /></RoleRoute>} />
        <Route path="utilisateurs" element={<RoleRoute roles={['ADMIN']}><UtilisateursPage /></RoleRoute>} />
        <Route path="parametres" element={<RoleRoute roles={['ADMIN']}><ParametresPage /></RoleRoute>} />
      </Route>
    </Routes>
    </PageLoader>
  );
}

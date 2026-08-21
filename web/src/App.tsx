import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import ConteneursPage from './pages/ConteneursPage';
import ConteneurDetailPage from './pages/ConteneurDetailPage';
import ConteneurFormPage from './pages/ConteneurFormPage';
import CheckpointsPage from './pages/CheckpointsPage';
import RapportsPage from './pages/RapportsPage';
import MouvementsPage from './pages/MouvementsPage';
import AnomaliesPage from './pages/AnomaliesPage';
import UtilisateursPage from './pages/UtilisateursPage';
import ParametresPage from './pages/ParametresPage';
import OperationalDashboardPage from './pages/OperationalDashboardPage';
import PilotagePage from './pages/PilotagePage';
import ManifestesPage from './pages/ManifestesPage';
import QuaiPage from './pages/QuaiPage';
import PiaOperationsPage from './pages/PiaOperationsPage';
import type { Role } from './services/api';

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
  return user && roles.includes(user.role) ? children : <Navigate to="/" replace />;
}

function RoleHome() {
  const { user } = useAuth();
  if (user?.role && ['CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA'].includes(user.role)) return <OperationalDashboardPage />;
  if (user?.role !== 'LOGISTICIEN') return <Navigate to="/login" replace />;
  return <PilotagePage />;
}

export default function App() {
  return (
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
        <Route path="conteneurs/nouveau" element={<RoleRoute roles={['LOGISTICIEN']}><ConteneurFormPage /></RoleRoute>} />
        <Route path="conteneurs/:id" element={<ConteneurDetailPage />} />
        <Route path="conteneurs/:id/editer" element={<RoleRoute roles={['LOGISTICIEN']}><ConteneurFormPage /></RoleRoute>} />
        <Route path="checkpoints" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><CheckpointsPage /></RoleRoute>} />
        <Route path="rapports" element={<RoleRoute roles={['LOGISTICIEN']}><RapportsPage /></RoleRoute>} />
        <Route path="mouvements" element={<MouvementsPage />} />
        <Route path="anomalies" element={<RoleRoute roles={['LOGISTICIEN', 'CONTROLEUR_LCT', 'CONTROLEUR_TOGO', 'AGENT_PIA']}><AnomaliesPage /></RoleRoute>} />
        <Route path="utilisateurs" element={<RoleRoute roles={['LOGISTICIEN']}><UtilisateursPage /></RoleRoute>} />
        <Route path="parametres" element={<ParametresPage />} />
      </Route>
    </Routes>
  );
}

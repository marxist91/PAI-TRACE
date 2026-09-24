import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, Eye, EyeSlash, LockKey, ShieldCheck } from '@phosphor-icons/react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password, rememberMe });
      setPassword('');
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <p role="status">Vérification de la session…</p>;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return (
    <div className="login-command">
      <section className="login-command-visual" aria-label="Corridor logistique du Port autonome de Lomé">
        <div className="login-command-brand"><img src="/togo-port-logo.jpg" alt="Logo du Port Autonome de Lomé" /><div><strong>PIA-TRACE</strong><span>Port Autonome de Lomé</span></div></div>
        <div className="login-command-message"><ShieldCheck size={28} weight="duotone" /><h1>Contrôler chaque transfert.</h1><p>Traçabilité des conteneurs du port de Lomé jusqu’au port sec de la PIA.</p></div>
      </section>
      <section className="login-command-form">
        <div className="login-command-card">
          <span className="login-lock"><LockKey size={22} weight="duotone" /></span>
          <h2>Accès aux opérations</h2>
          <p>Connectez-vous avec le compte correspondant à votre rôle dans le corridor.</p>
          {error && <div className="login-error">{error}</div>}
          <form onSubmit={handleSubmit}>
            <div className="ops-field"><label htmlFor="loginEmail">Email</label><input id="loginEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="ops-input" autoComplete="email" required /></div>
            <div className="ops-field"><label htmlFor="loginPassword">Mot de passe</label><div className="admin-password"><input id="loginPassword" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} className="ops-input" autoComplete="current-password" required /><button type="button" className="ops-button" aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}</button></div></div>
            <label className="login-remember"><input type="checkbox" checked={rememberMe} onChange={event => setRememberMe(event.target.checked)} /> Se souvenir de moi</label>
            <p className="login-session-help">Session conservée 7 jours si coché. Ne cochez pas cette case sur un ordinateur partagé. Utilisez Déconnexion avant de quitter ce poste.</p>
            <button type="submit" disabled={loading} className="ops-button ops-button-primary">{loading ? 'Connexion...' : 'Se connecter'} <ArrowRight size={14} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}

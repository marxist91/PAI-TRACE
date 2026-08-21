import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowRight, LockKey, ShieldCheck } from '@phosphor-icons/react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('logisticien@pia.tg');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="ops-field"><label htmlFor="loginPassword">Mot de passe</label><input id="loginPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="ops-input" autoComplete="current-password" required /></div>
            <button type="submit" disabled={loading} className="ops-button ops-button-primary">{loading ? 'Connexion...' : 'Se connecter'} <ArrowRight size={14} /></button>
          </form>
        </div>
      </section>
    </div>
  );
}

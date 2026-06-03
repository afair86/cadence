import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Infinity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './auth-page.scss';

export default function RegisterPage() {
  const { user, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [teamName, setTeamName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(email, password, name, teamName || undefined);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-page__card">
        <div className="auth-page__brand">
          <Infinity size={28} strokeWidth={2.5} />
          <span>Cadence</span>
        </div>
        <h1>Create your account</h1>
        <p>Start maintaining relationships intelligently</p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="auth-page__error">{error}</div> : null}
          <label>
            Your name
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </label>
          <label>
            Team name <span className="auth-page__optional">(optional)</span>
            <input value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <p className="auth-page__footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

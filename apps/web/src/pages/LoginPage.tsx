import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Infinity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './auth-page.scss';

export default function LoginPage() {
  const { user, login } = useAuth();
  const [email, setEmail] = useState('alex@demo.com');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
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
        <h1>Welcome back</h1>
        <p>Your AI relationship operating system</p>

        <form onSubmit={handleSubmit}>
          {error ? <div className="auth-page__error">{error}</div> : null}
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="auth-page__footer">
          New here? <Link to="/register">Create an account</Link>
        </p>
        <p className="auth-page__demo">Demo: alex@demo.com / demo1234</p>
      </div>
    </div>
  );
}

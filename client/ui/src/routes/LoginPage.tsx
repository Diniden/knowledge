import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import './AuthPage.scss';

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? 'Login failed');
      }

      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="AuthPage">
      <div className="AuthPage__Card">
        <h1 className="AuthPage__Title">Sign in</h1>
        <p className="AuthPage__Subtitle">Welcome back to Knowledge Graph</p>

        {error && <div className="AuthPage__Error">{error}</div>}

        <form className="AuthPage__Form" onSubmit={(e) => { void handleSubmit(e); }}>
          <div className="AuthPage__Field">
            <label className="AuthPage__Label" htmlFor="username">Username</label>
            <input
              id="username"
              className="AuthPage__Input"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => { setUsername(e.target.value); }}
              required
            />
          </div>
          <div className="AuthPage__Field">
            <label className="AuthPage__Label" htmlFor="password">Password</label>
            <input
              id="password"
              className="AuthPage__Input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); }}
              required
            />
          </div>
          <button
            className="AuthPage__Submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="AuthPage__Footer">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="AuthPage__Link">Create one</Link>
        </p>
      </div>
    </div>
  );
}

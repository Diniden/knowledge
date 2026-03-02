import { useState, useCallback, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { routes } from '../../routes/index.js';
import './LoginPage.scss';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setError('');

      if (!email.trim() || !password.trim()) {
        setError('Please fill in all fields.');
        return;
      }

      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        setError('Invalid email or password. Please try again.');
      }, 1000);
    },
    [email, password],
  );

  return (
    <div className="LoginPage">
      <div className="LoginPage__card">
        <div className="LoginPage__header">
          <div className="LoginPage__logo">Knowledge Graph</div>
          <div className="LoginPage__subtitle">Sign in to your account</div>
        </div>

        {error && <div className="LoginPage__error">{error}</div>}

        <form className="LoginPage__form" onSubmit={handleSubmit}>
          <div className="LoginPage__field">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div className="LoginPage__field">
            <Input
              label="Password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="LoginPage__submit">
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Sign In
            </Button>
          </div>
        </form>

        <div className="LoginPage__footer">
          Don&apos;t have an account?{' '}
          <Link className="LoginPage__link" to={routes.register}>
            Create one
          </Link>
        </div>
      </div>
    </div>
  );
}

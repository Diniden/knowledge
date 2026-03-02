import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

import './AuthPage.scss';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '',
    email: '',
    displayName: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/v1/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = (await res.json()) as { message?: string };
        throw new Error(data.message ?? 'Registration failed');
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
        <h1 className="AuthPage__Title">Create account</h1>
        <p className="AuthPage__Subtitle">Join the Knowledge Graph</p>

        {error && <div className="AuthPage__Error">{error}</div>}

        <form className="AuthPage__Form" onSubmit={(e) => { void handleSubmit(e); }}>
          {(['username', 'email', 'displayName', 'password'] as const).map(
            (field) => (
              <div key={field} className="AuthPage__Field">
                <label className="AuthPage__Label" htmlFor={field}>
                  {field === 'displayName' ? 'Display name' : field.charAt(0).toUpperCase() + field.slice(1)}
                </label>
                <input
                  id={field}
                  name={field}
                  className="AuthPage__Input"
                  type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
                  value={form[field]}
                  onChange={handleChange}
                  required
                />
              </div>
            ),
          )}
          <button
            className="AuthPage__Submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="AuthPage__Footer">
          Already have an account?{' '}
          <Link to="/login" className="AuthPage__Link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

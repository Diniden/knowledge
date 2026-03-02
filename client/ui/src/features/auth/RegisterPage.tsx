import { useState, useCallback, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/common/Button.js';
import { Input } from '../../components/common/Input.js';
import { routes } from '../../routes/index.js';
import './RegisterPage.scss';

export function RegisterPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!username.trim()) errors['username'] = 'Username is required.';
    if (!email.trim()) errors['email'] = 'Email is required.';
    if (!password.trim()) {
      errors['password'] = 'Password is required.';
    } else if (password.length < 8) {
      errors['password'] = 'Password must be at least 8 characters.';
    }
    if (password !== confirmPassword) {
      errors['confirmPassword'] = 'Passwords do not match.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [username, email, password, confirmPassword]);

  const handleSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      setError('');

      if (!validate()) return;

      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        navigate(routes.login);
      }, 1200);
    },
    [validate, navigate],
  );

  return (
    <div className="RegisterPage">
      <div className="RegisterPage__card">
        <div className="RegisterPage__header">
          <div className="RegisterPage__logo">Knowledge Graph</div>
          <div className="RegisterPage__subtitle">Create your account</div>
        </div>

        {error && <div className="RegisterPage__error">{error}</div>}

        <form className="RegisterPage__form" onSubmit={handleSubmit}>
          <div className="RegisterPage__field">
            <Input
              label="Username"
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              error={fieldErrors['username']}
              autoComplete="username"
            />
          </div>
          <div className="RegisterPage__field">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={fieldErrors['email']}
              autoComplete="email"
            />
          </div>
          <div className="RegisterPage__field">
            <Input
              label="Password"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors['password']}
              autoComplete="new-password"
            />
          </div>
          <div className="RegisterPage__field">
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              error={fieldErrors['confirmPassword']}
              autoComplete="new-password"
            />
          </div>
          <div className="RegisterPage__submit">
            <Button type="submit" variant="primary" fullWidth loading={loading}>
              Create Account
            </Button>
          </div>
        </form>

        <div className="RegisterPage__footer">
          Already have an account?{' '}
          <Link className="RegisterPage__link" to={routes.login}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}

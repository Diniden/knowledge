import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem' }}>
      <h1>404 — Page Not Found</h1>
      <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
        The page you are looking for does not exist.
      </p>
      <Link
        to="/dashboard"
        style={{
          display: 'inline-block',
          marginTop: '1.5rem',
          color: 'var(--color-primary)',
          fontWeight: 500,
        }}
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

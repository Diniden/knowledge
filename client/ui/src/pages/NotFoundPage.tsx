import { useNavigate } from 'react-router-dom';
import { Button } from '../components/common/Button.js';
import { routes } from '../routes/index.js';
import './NotFoundPage.scss';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="NotFoundPage">
      <div className="NotFoundPage__icon">🔍</div>
      <h1 className="NotFoundPage__title">Page Not Found</h1>
      <p className="NotFoundPage__message">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="NotFoundPage__action">
        <Button variant="primary" onClick={() => navigate(routes.dashboard)}>
          Go Home
        </Button>
      </div>
    </div>
  );
}

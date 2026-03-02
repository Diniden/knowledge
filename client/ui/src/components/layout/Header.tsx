import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/index.js';
import './Header.scss';

export interface HeaderProps {
  onToggleSidebar?: () => void;
  onToggleChat?: () => void;
}

const NAV_LINKS = [
  { to: routes.dashboard, label: 'Home' },
  { to: routes.documents, label: 'Documents' },
  { to: routes.graph, label: 'Graph' },
  { to: '/versions', label: 'Versions' },
  { to: routes.genui, label: 'GenUI' },
  { to: routes.settings, label: 'Settings' },
] as const;

export function Header({ onToggleSidebar, onToggleChat }: HeaderProps) {
  const { pathname } = useLocation();

  return (
    <header className="Header">
      <div className="Header__left">
        <button
          className="Header__toggle"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          type="button"
        >
          ☰
        </button>
        <Link className="Header__logo" to={routes.dashboard}>
          Knowledge Graph
        </Link>
      </div>
      <nav className="Header__nav" aria-label="Main navigation">
        {NAV_LINKS.map((link) => {
          const isActive = pathname === link.to;
          const classes = [
            'Header__navLink',
            isActive && 'Header__navLink--active',
          ]
            .filter(Boolean)
            .join(' ');

          return (
            <Link key={link.to} className={classes} to={link.to}>
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="Header__actions">
        <button
          className="Header__toggle"
          onClick={onToggleChat}
          aria-label="Toggle chat panel"
          type="button"
        >
          💬
        </button>
        <div className="Header__user">
          <span className="Header__avatar" aria-hidden="true">
            U
          </span>
        </div>
      </div>
    </header>
  );
}

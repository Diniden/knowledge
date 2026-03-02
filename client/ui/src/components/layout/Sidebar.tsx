import { Link, useLocation } from 'react-router-dom';
import { routes } from '../../routes/index.js';
import './Sidebar.scss';

export interface SidebarProps {
  open?: boolean;
  onToggle?: () => void;
}

interface DocTreeItem {
  id: string;
  icon: string;
  label: string;
}

const DOC_TREE: DocTreeItem[] = [
  { id: '1', icon: '📄', label: 'Getting Started' },
  { id: '2', icon: '📄', label: 'Architecture' },
  { id: '3', icon: '📄', label: 'API Reference' },
  { id: '4', icon: '📄', label: 'Authentication Flow' },
  { id: '5', icon: '📄', label: 'Data Model v2' },
];

const SIDEBAR_NAV = [
  { to: routes.dashboard, icon: '🏠', label: 'Dashboard' },
  { to: routes.documents, icon: '📁', label: 'Documents' },
  { to: routes.graph, icon: '🔗', label: 'Graph' },
  { to: routes.settings, icon: '⚙️', label: 'Settings' },
] as const;

export function Sidebar({ open = true, onToggle }: SidebarProps) {
  const { pathname } = useLocation();
  const classes = ['Sidebar', !open && 'Sidebar--collapsed']
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={classes} aria-label="Sidebar navigation">
      <div className="Sidebar__header">
        {open && <span className="Sidebar__title">Navigation</span>}
        <button
          className="Sidebar__toggle"
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          type="button"
        >
          {open ? '◂' : '▸'}
        </button>
      </div>
      {open && (
        <>
          <nav className="Sidebar__nav" aria-label="Page navigation">
            {SIDEBAR_NAV.map((item) => {
              const isActive = pathname === item.to;
              const itemClasses = [
                'Sidebar__item',
                isActive && 'Sidebar__item--active',
              ]
                .filter(Boolean)
                .join(' ');

              return (
                <Link key={item.to} className={itemClasses} to={item.to}>
                  <span className="Sidebar__itemIcon">{item.icon}</span>
                  <span className="Sidebar__itemLabel">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="Sidebar__section">
            <span className="Sidebar__title">Documents</span>
          </div>
          <nav className="Sidebar__tree" aria-label="Document tree">
            {DOC_TREE.map((doc) => (
              <Link
                key={doc.id}
                className="Sidebar__item"
                to={routes.documents}
              >
                <span className="Sidebar__itemIcon">{doc.icon}</span>
                <span className="Sidebar__itemLabel">{doc.label}</span>
              </Link>
            ))}
          </nav>
        </>
      )}
    </aside>
  );
}

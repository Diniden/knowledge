import { Outlet } from 'react-router-dom';

import './AppLayout.scss';

export function AppLayout() {
  return (
    <div className="AppLayout">
      <aside className="AppLayout__Sidebar">
        <nav className="AppLayout__Nav">
          <a href="/dashboard" className="AppLayout__NavLink">Dashboard</a>
          <a href="/graph" className="AppLayout__NavLink">Knowledge Graph</a>
        </nav>
      </aside>
      <main className="AppLayout__Main">
        <Outlet />
      </main>
      <aside className="AppLayout__ChatPanel">
        {/* Chat dialog panel — always visible */}
      </aside>
    </div>
  );
}

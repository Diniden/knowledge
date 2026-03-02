import type { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ChatPanel } from './ChatPanel';
import './AppLayout.scss';

export interface AppLayoutProps {
  children: ReactNode;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  chatOpen?: boolean;
  onToggleChat?: () => void;
}

export function AppLayout({
  children,
  sidebarOpen = true,
  onToggleSidebar,
  chatOpen = true,
  onToggleChat,
}: AppLayoutProps) {
  const classes = [
    'AppLayout',
    !sidebarOpen && 'AppLayout--sidebarCollapsed',
    !chatOpen && 'AppLayout--chatCollapsed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      <Header onToggleSidebar={onToggleSidebar} onToggleChat={onToggleChat} />
      <div className="AppLayout__body">
        <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} />
        <main className="AppLayout__main">{children}</main>
        <ChatPanel open={chatOpen} onToggle={onToggleChat} />
      </div>
    </div>
  );
}

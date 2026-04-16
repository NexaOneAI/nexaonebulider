import type { ReactNode } from 'react';
import { Topbar } from './Topbar';

interface AppShellProps {
  children: ReactNode;
  showNav?: boolean;
}

export function AppShell({ children, showNav = true }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      {showNav && <Topbar />}
      {children}
    </div>
  );
}

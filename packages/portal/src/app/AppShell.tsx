import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

/** Sidebar + topbar layout matching the deck wireframe. */
export function AppShell() {
  return (
    <div className="shell">
      <div className="shell__brand">
        <span className="dot" />
        PingIt
      </div>
      <Topbar />
      <Sidebar />
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}

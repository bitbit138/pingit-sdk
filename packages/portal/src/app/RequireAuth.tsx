import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/auth/useAuth';
import { canAccess } from '@/lib/roles';

/**
 * Route guard: redirects unauthenticated users to /login and blocks developers
 * from admin-only pages (role gating). `children` lets us also wrap the shell.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!canAccess(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

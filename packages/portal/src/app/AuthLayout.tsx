import { Outlet } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';

/**
 * Root layout that mounts AuthProvider inside the router. AuthProvider relies on
 * `useNavigate` (logout / 401 redirects), which is only available beneath the
 * RouterProvider — so the provider lives here rather than wrapping the router.
 */
export function AuthLayout() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

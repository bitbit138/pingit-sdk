import { createBrowserRouter, type RouteObject } from 'react-router-dom';
import { AuthLayout } from '@/app/AuthLayout';
import { AppShell } from '@/app/AppShell';
import { RequireAuth } from '@/app/RequireAuth';
import { LoginPage } from '@/pages/LoginPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilesPage } from '@/pages/ProfilesPage';
import { AppsPage } from '@/pages/AppsPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { HealthPage } from '@/pages/HealthPage';
import { CrashesPage } from '@/pages/CrashesPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

export const routes: RouteObject[] = [
  {
    // AuthLayout mounts AuthProvider INSIDE the router so its useNavigate works
    // and every child route can call useAuth().
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        path: '/',
        element: (
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        ),
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'profiles', element: <ProfilesPage /> },
          { path: 'apps', element: <AppsPage /> },
          { path: 'analytics', element: <AnalyticsPage /> },
          { path: 'history', element: <HistoryPage /> },
          { path: 'health', element: <HealthPage /> },
          { path: 'crashes', element: <CrashesPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);

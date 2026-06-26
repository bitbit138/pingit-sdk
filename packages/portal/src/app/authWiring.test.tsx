import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { routes } from '../router';

/**
 * Regression test: AuthProvider must be mounted (via AuthLayout, inside the
 * router) so that RequireAuth and the pages can call useAuth() without throwing
 * "useAuth must be used within an AuthProvider".
 */
function renderAt(path: string) {
  localStorage.clear();
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

describe('auth wiring', () => {
  it('renders the login page (LoginPage uses useAuth)', async () => {
    renderAt('/login');
    expect(await screen.findByText(/Admin Portal/i)).toBeInTheDocument();
  });

  it('redirects an unauthenticated protected visit to login (RequireAuth → useAuth)', async () => {
    renderAt('/');
    // RequireAuth sees no session → <Navigate to="/login"> → LoginPage renders.
    expect(await screen.findByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
});

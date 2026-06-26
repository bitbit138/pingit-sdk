import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Role } from '@pingit/contracts';
import { apiClient, setUnauthorizedHandler } from '@/api/client';
import {
  clearSession,
  isExpired,
  loadSession,
  saveSession,
  type StoredSession,
} from './token';

export interface AuthState {
  token: string | null;
  role: Role | null;
  /** Developer accounts are scoped to a single app; admins are null. */
  appId: string | null;
  expiresAt: string | null;
  isAuthenticated: boolean;
}

export interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const EMPTY: AuthState = {
  token: null,
  role: null,
  appId: null,
  expiresAt: null,
  isAuthenticated: false,
};

function fromSession(s: StoredSession | null): AuthState {
  if (!s || isExpired(s.expiresAt)) return EMPTY;
  return {
    token: s.token,
    role: s.role,
    appId: s.appId,
    expiresAt: s.expiresAt,
    isAuthenticated: true,
  };
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  // Rehydrate synchronously on first render (after expiry check).
  const [state, setState] = useState<AuthState>(() => fromSession(loadSession()));

  const logout = useCallback(() => {
    clearSession();
    setState(EMPTY);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Keep a stable ref so the registered 401 handler never goes stale.
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  useEffect(() => {
    setUnauthorizedHandler(() => logoutRef.current());
    return () => setUnauthorizedHandler(null);
  }, []);

  // If a rehydrated token is already expired, drop it.
  useEffect(() => {
    const s = loadSession();
    if (s && isExpired(s.expiresAt)) {
      clearSession();
      setState(EMPTY);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login({ email, password });
    const session: StoredSession = {
      token: res.token,
      role: res.role,
      appId: res.appId ?? null,
      expiresAt: res.expiresAt,
    };
    saveSession(session);
    setState(fromSession(session));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, login, logout }),
    [state, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

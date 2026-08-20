import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  AuthUserResponse,
  LoginRequest,
  SignupRequest,
} from '@mintreels/schema';
import { ApiError, api } from '@/lib/api';
import { queryClient } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

type AuthContextValue = {
  user: AuthUserResponse | null;
  status: AuthStatus;
  refresh: () => Promise<void>;
  login: (body: LoginRequest) => Promise<AuthUserResponse>;
  signup: (body: SignupRequest) => Promise<AuthUserResponse>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
      setStatus('authenticated');
    } catch (error) {
      setUser(null);
      setStatus('unauthenticated');
      if (!(error instanceof ApiError) || error.status !== 401) {
        // Keep unauthenticated for any me() failure; UI can still show login.
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (body: LoginRequest) => {
    const next = await api.login(body);
    setUser(next);
    setStatus('authenticated');
    return next;
  }, []);

  const signup = useCallback(async (body: SignupRequest) => {
    const next = await api.signup(body);
    setUser(next);
    setStatus('authenticated');
    return next;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setStatus('unauthenticated');
      void queryClient.removeQueries({ queryKey: queryKeys.all });
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      refresh,
      login,
      signup,
      logout,
    }),
    [user, status, refresh, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

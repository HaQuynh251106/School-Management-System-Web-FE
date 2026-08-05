import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setTokens, hasToken, refreshSession, AUTH_SESSION_EXPIRED } from './client';
import type { ApiUser } from './types';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  login: (username: string, password: string, twoFactorCode?: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const ready = hasToken() || await refreshSession();
        if (ready && active) {
          setUser(await api.get<ApiUser>('/me'));
        }
      } catch {
        setTokens(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    const expire = () => {
      setTokens(null);
      setUser(null);
    };
    window.addEventListener(AUTH_SESSION_EXPIRED, expire);
    return () => {
      active = false;
      window.removeEventListener(AUTH_SESSION_EXPIRED, expire);
    };
  }, []);

  const login = async (username: string, password: string, twoFactorCode?: string) => {
    const r = await api.post<{ user: ApiUser; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { username, password, twoFactorCode },
    );
    setTokens(r.accessToken);
    setUser(r.user);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setTokens(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

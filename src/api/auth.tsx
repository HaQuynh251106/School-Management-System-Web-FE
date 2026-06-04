import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api, setTokens, hasToken } from './client';
import type { ApiUser } from './types';

interface AuthContextValue {
  user: ApiUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>(null as unknown as AuthContextValue);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (hasToken()) {
        try {
          setUser(await api.get<ApiUser>('/me'));
        } catch {
          setTokens(null, null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = async (username: string, password: string) => {
    const r = await api.post<{ user: ApiUser; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { username, password },
    );
    setTokens(r.accessToken, r.refreshToken);
    setUser(r.user);
  };

  const logout = () => {
    api.post('/auth/logout').catch(() => {});
    setTokens(null, null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

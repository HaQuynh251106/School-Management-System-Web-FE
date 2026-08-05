import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  api,
  setTokens,
  hasToken,
  getRefreshToken,
  setAuthInvalidatedHandler,
} from './client';
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
  const authenticatedUserId = user?.id;
  const clearSession = useCallback(() => {
    setTokens(null, null);
    setUser(null);
  }, []);

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

  useEffect(() => {
    setAuthInvalidatedHandler(clearSession);
    return () => setAuthInvalidatedHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (!authenticatedUserId) return;
    let disposed = false;
    let validating = false;

    const validateSession = async () => {
      if (validating || disposed) return;
      validating = true;
      try {
        const current = await api.get<ApiUser>('/me');
        if (!disposed) setUser(current);
      } catch {
        if (!disposed) clearSession();
      } finally {
        validating = false;
      }
    };
    const validateWhenVisible = () => {
      if (document.visibilityState === 'visible') void validateSession();
    };
    const timer = window.setInterval(validateSession, 5_000);
    window.addEventListener('focus', validateSession);
    document.addEventListener('visibilitychange', validateWhenVisible);
    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', validateSession);
      document.removeEventListener('visibilitychange', validateWhenVisible);
    };
  }, [authenticatedUserId, clearSession]);

  const login = async (username: string, password: string) => {
    const deviceKey = 'sse-device-token';
    let deviceToken = sessionStorage.getItem(deviceKey);
    if (!deviceToken) {
      deviceToken = globalThis.crypto?.randomUUID?.() || `web-${Date.now()}`;
      sessionStorage.setItem(deviceKey, deviceToken);
    }
    const r = await api.post<{ user: ApiUser; accessToken: string; refreshToken: string }>(
      '/auth/login',
      {
        username,
        password,
        deviceToken,
        platform: 'WEB',
        deviceName: navigator.userAgent.includes('Edg/')
          ? 'Microsoft Edge'
          : navigator.userAgent.includes('Chrome/')
            ? 'Google Chrome'
            : 'Trinh duyet web',
      },
    );
    setTokens(r.accessToken, r.refreshToken);
    setUser(r.user);
  };

  const logout = () => {
    api.post('/auth/logout', { refreshToken: getRefreshToken() }).catch(() => {});
    clearSession();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

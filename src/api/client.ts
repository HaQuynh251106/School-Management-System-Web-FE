// API client gọi backend SSE (Spring Boot, mặc định http://localhost:4000).
// Quản lý JWT trong localStorage + tự refresh khi 401.

const BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000';

let accessToken: string | null = localStorage.getItem('sse_token');
let refreshToken: string | null = localStorage.getItem('sse_refresh');
let refreshInFlight: Promise<boolean> | null = null;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setTokens(access: string | null, refresh?: string | null) {
  accessToken = access;
  if (access) localStorage.setItem('sse_token', access);
  else localStorage.removeItem('sse_token');

  if (refresh !== undefined) {
    refreshToken = refresh;
    if (refresh) localStorage.setItem('sse_refresh', refresh);
    else localStorage.removeItem('sse_refresh');
  }
}

export function hasToken() {
  return !!accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

async function performRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function tryRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function parseResponse(res: Response): Promise<unknown> {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) return text;
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(res.status, 'Máy chủ trả về dữ liệu JSON không hợp lệ');
  }
}

async function request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((opts.headers as Record<string, string>) || {}),
  };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(path, opts, false);
    setTokens(null, null);
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String((data as { error: unknown }).error)
      : res.statusText;
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const api = {
  base: BASE,
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
};

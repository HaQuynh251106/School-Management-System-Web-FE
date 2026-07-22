// API client gọi backend SSE (Spring Boot, mặc định http://localhost:4000).
// Token chỉ tồn tại trong bộ nhớ của tab hiện tại để tránh bị đọc lại từ localStorage khi có XSS.

const BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000';

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const AUTH_SESSION_EXPIRED = 'sse:auth-session-expired';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setTokens(access: string | null) {
  accessToken = access;
}

export function hasToken() {
  return !!accessToken;
}

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export function refreshSession() {
  return tryRefresh();
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
  const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(path, opts, false);
    setTokens(null);
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
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

async function download(path: string, retry = true): Promise<{ blob: Blob; filename?: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetch(`${BASE}${path}`, { headers, credentials: 'include' });
  if (response.status === 401 && retry && await tryRefresh()) return download(path, false);
  if (!response.ok) {
    const data = await parseResponse(response);
    throw new ApiError(response.status, typeof data === 'object' && data && 'error' in data
      ? String((data as { error: unknown }).error) : response.statusText);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return { blob: await response.blob(), filename: encoded ? decodeURIComponent(encoded) : plain };
}

export const api = {
  base: BASE,
  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  patch: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T = any>(path: string, file: File) => {
    const data = new FormData();
    data.append('file', file);
    return request<T>(path, { method: 'POST', body: data });
  },
  download,
};

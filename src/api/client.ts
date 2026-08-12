import { showAppError } from './errorEvents';

// API client gọi backend SSE (Spring Boot, mặc định http://localhost:4000).
// Token chỉ tồn tại trong bộ nhớ của tab hiện tại để tránh bị đọc lại từ localStorage khi có XSS.

const BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000';

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let authInvalidatedHandler: (() => void) | null = null;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function setTokens(access: string | null, refresh?: string | null) {
  accessToken = access;

  if (refresh !== undefined) {
    refreshToken = refresh;
  }
}

export function hasToken() {
  return !!accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setAuthInvalidatedHandler(handler: (() => void) | null) {
  authInvalidatedHandler = handler;
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

async function fetchOrThrow(input: RequestInfo | URL, init?: RequestInit) {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    const message = 'Không thể kết nối tới máy chủ. Hãy kiểm tra backend và kết nối mạng rồi thử lại.';
    showAppError(message);
    throw new ApiError(0, message);
  }
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
    const message = 'Máy chủ trả về dữ liệu JSON không hợp lệ';
    showAppError(message);
    throw new ApiError(res.status, message);
  }
}

export type ApiRequestOptions = RequestInit & {
  suppressErrorStatuses?: number[];
};

async function request<T>(path: string, opts: ApiRequestOptions = {}, retry = true): Promise<T> {
  const { suppressErrorStatuses = [], ...requestInit } = opts;
  const headers: Record<string, string> = { ...((requestInit.headers as Record<string, string>) || {}) };
  if (!(requestInit.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const res = await fetchOrThrow(`${BASE}${path}`, { ...requestInit, headers });

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(path, opts, false);
    setTokens(null, null);
    authInvalidatedHandler?.();
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String((data as { error: unknown }).error)
      : res.statusText;
    if (!suppressErrorStatuses.includes(res.status)) showAppError(message);
    throw new ApiError(res.status, message);
  }
  return data as T;
}

async function download(path: string, retry = true): Promise<{ blob: Blob; filename?: string }> {
  const headers: Record<string, string> = {};
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const response = await fetchOrThrow(`${BASE}${path}`, { headers });
  if (response.status === 401 && retry && await tryRefresh()) return download(path, false);
  if (!response.ok) {
    const data = await parseResponse(response);
    const message = typeof data === 'object' && data && 'error' in data
      ? String((data as { error: unknown }).error) : response.statusText;
    showAppError(message);
    throw new ApiError(response.status, message);
  }
  const disposition = response.headers.get('content-disposition') || '';
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition.match(/filename="?([^";]+)"?/i)?.[1];
  return { blob: await response.blob(), filename: encoded ? decodeURIComponent(encoded) : plain };
}

export interface SseSubscription {
  close: () => void;
}

function streamSse<T>(
  path: string,
  onEvent: (event: T) => void,
  onConnectionChange?: (connected: boolean) => void,
): SseSubscription {
  const controller = new AbortController();
  let closed = false;

  const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  const connect = async () => {
    while (!closed) {
      try {
        const headers: Record<string, string> = { Accept: 'text/event-stream' };
        if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
        let response = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
        if (response.status === 401 && await tryRefresh()) {
          headers.Authorization = `Bearer ${accessToken}`;
          response = await fetch(`${BASE}${path}`, { headers, signal: controller.signal });
        }
        if (!response.ok || !response.body) throw new ApiError(response.status, response.statusText);
        onConnectionChange?.(true);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!closed) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const data = frame.split('\n')
              .filter((line) => line.startsWith('data:'))
              .map((line) => line.slice(5).trimStart())
              .join('\n');
            if (data) {
              try { onEvent(JSON.parse(data) as T); } catch { /* Ignore malformed provider frames. */ }
            }
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (closed || (error instanceof DOMException && error.name === 'AbortError')) break;
      }
      onConnectionChange?.(false);
      if (!closed) await wait(3000);
    }
  };

  void connect();
  return {
    close: () => {
      closed = true;
      controller.abort();
      onConnectionChange?.(false);
    },
  };
}

export const api = {
  base: BASE,
  get: <T = any>(path: string, options?: ApiRequestOptions) => request<T>(path, options),
  post: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  put: <T = any>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) }),
  del: <T = any>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  upload: <T = any>(path: string, file: File) => {
    const data = new FormData();
    data.append('file', file);
    return request<T>(path, { method: 'POST', body: data });
  },
  streamSse,
  download,
};

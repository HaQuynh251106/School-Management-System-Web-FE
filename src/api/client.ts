// Token chỉ tồn tại trong bộ nhớ của tab hiện tại để tránh bị đọc lại từ
// localStorage khi có XSS. Phiên được khôi phục bằng refresh cookie HttpOnly.
//
// Trên máy phát triển, `localhost` và `127.0.0.1` là hai site khác nhau đối với
// SameSite cookie. Vì vậy API loopback phải luôn dùng cùng hostname với website.
type BrowserLocation = Pick<Location, 'protocol' | 'hostname'>;

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function resolveApiBase(
  configuredBase?: string,
  location: BrowserLocation = window.location,
) {
  const configured = configuredBase?.trim();
  if (!configured) return `${location.protocol}//${location.hostname}:4000`;

  try {
    const url = new URL(configured);
    if (LOOPBACK_HOSTS.has(url.hostname) && LOOPBACK_HOSTS.has(location.hostname)) {
      url.hostname = location.hostname;
    }
    return url.toString().replace(/\/$/, '');
  } catch {
    return configured.replace(/\/$/, '');
  }
}

const BASE = resolveApiBase((import.meta as any).env?.VITE_API_BASE as string | undefined);

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export const AUTH_SESSION_EXPIRED = 'sse:auth-session-expired';

export class ApiError extends Error {
  status: number;
  code?: string;
  requestId?: string;
  fieldErrors: Record<string, string>;

  constructor(
    status: number,
    message: string,
    options: {
      code?: string;
      requestId?: string;
      fieldErrors?: Record<string, string>;
    } = {},
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options.code;
    this.requestId = options.requestId;
    this.fieldErrors = options.fieldErrors ?? {};
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

export interface RealtimeEvent {
  type: string;
  data: Record<string, unknown>;
}

/**
 * Kết nối SSE bằng fetch để vẫn gửi được access token trong header. Tự kết nối
 * lại khi proxy/ngủ máy làm đứt luồng; dữ liệu nguồn vẫn được tải qua REST.
 */
export function subscribeRealtime(onEvent: (event: RealtimeEvent) => void) {
  let stopped = false;
  let controller: AbortController | null = null;
  let reconnectTimer: number | null = null;
  let reconnectDelay = 1000;

  const scheduleReconnect = () => {
    if (stopped || reconnectTimer != null) return;
    reconnectTimer = window.setTimeout(() => {
      reconnectTimer = null;
      void connect();
    }, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 15_000);
  };

  const connect = async () => {
    if (stopped) return;
    if (!accessToken && !(await tryRefresh())) return scheduleReconnect();
    controller = new AbortController();
    try {
      let response = await fetch(`${BASE}/realtime/events`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        credentials: 'include',
        signal: controller.signal,
      });
      if (response.status === 401 && await tryRefresh()) {
        response = await fetch(`${BASE}/realtime/events`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          credentials: 'include',
          signal: controller.signal,
        });
      }
      if (!response.ok || !response.body) throw new Error(`Realtime HTTP ${response.status}`);
      reconnectDelay = 1000;
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventType = 'message';
      while (!stopped) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
        let boundary = buffer.indexOf('\n\n');
        while (boundary >= 0) {
          const block = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          let data = '';
          for (const line of block.split('\n')) {
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (data) {
            try { onEvent({ type: eventType, data: JSON.parse(data) }); } catch { /* Bỏ qua frame hỏng. */ }
          }
          eventType = 'message';
          boundary = buffer.indexOf('\n\n');
        }
      }
    } catch (error) {
      if (!stopped && !(error instanceof DOMException && error.name === 'AbortError')) scheduleReconnect();
    } finally {
      if (!stopped) scheduleReconnect();
    }
  };

  void connect();
  return () => {
    stopped = true;
    controller?.abort();
    if (reconnectTimer != null) window.clearTimeout(reconnectTimer);
  };
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

function createRequestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `web-${crypto.randomUUID()}`;
  }
  return `web-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

type ErrorPayload = {
  error?: unknown;
  code?: unknown;
  requestId?: unknown;
  fieldErrors?: unknown;
};

function apiError(res: Response, data: unknown, fallbackRequestId: string) {
  const payload = typeof data === 'object' && data !== null ? data as ErrorPayload : {};
  const fieldErrors = typeof payload.fieldErrors === 'object' && payload.fieldErrors !== null
    ? Object.fromEntries(
      Object.entries(payload.fieldErrors)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
    : {};
  const requestId = typeof payload.requestId === 'string'
    ? payload.requestId
    : res.headers.get('X-Request-ID') ?? fallbackRequestId;
  const publicMessage = typeof payload.error === 'string' && payload.error.trim()
    ? payload.error
    : res.statusText;
  const firstFieldError = Object.entries(fieldErrors)[0];
  const message = firstFieldError
    ? `${firstFieldError[0]}: ${firstFieldError[1]}`
    : res.status >= 500 && requestId
      ? `${publicMessage} Mã hỗ trợ: ${requestId}`
      : publicMessage;
  return new ApiError(
    res.status,
    message,
    {
      code: typeof payload.code === 'string' ? payload.code : undefined,
      requestId,
      fieldErrors,
    },
  );
}

async function request<T>(
  path: string,
  opts: RequestInit = {},
  retry = true,
  requestId = createRequestId(),
): Promise<T> {
  const headers: Record<string, string> = { ...((opts.headers as Record<string, string>) || {}) };
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  headers['X-Request-ID'] = requestId;

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { ...opts, headers, credentials: 'include' });
  } catch {
    throw new ApiError(
      0,
      'Không thể kết nối tới máy chủ. Vui lòng kiểm tra mạng và thử lại.',
      { code: 'NETWORK_ERROR', requestId },
    );
  }

  if (res.status === 401 && retry && !path.startsWith('/auth/')) {
    if (await tryRefresh()) return request<T>(path, opts, false, requestId);
    setTokens(null);
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED));
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    throw apiError(res, data, requestId);
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
  uploadForm: <T = any>(path: string, file: File, fields: Record<string, string> = {}) => {
    const data = new FormData();
    data.append('file', file);
    Object.entries(fields).forEach(([key, value]) => data.append(key, value));
    return request<T>(path, { method: 'POST', body: data });
  },
  download,
};

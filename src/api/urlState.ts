import { useCallback, useEffect, useState } from 'react';
import type { SetStateAction } from 'react';

export type UrlHistoryMode = 'push' | 'replace';
const URL_STATE_EVENT = 'sse:url-state-changed';

export function readHashRoute() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const separator = raw.indexOf('?');
  return {
    path: (separator >= 0 ? raw.slice(0, separator) : raw).trim(),
    params: new URLSearchParams(separator >= 0 ? raw.slice(separator + 1) : ''),
  };
}

function writeHashParams(params: URLSearchParams, mode: UrlHistoryMode) {
  const route = readHashRoute().path || 'dashboard';
  const query = params.toString();
  const next = `#/${route}${query ? `?${query}` : ''}`;
  if (next === window.location.hash) return;
  window.history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', next);
  window.dispatchEvent(new Event(URL_STATE_EVENT));
}

function subscribe(listener: () => void) {
  window.addEventListener(URL_STATE_EVENT, listener);
  window.addEventListener('popstate', listener);
  window.addEventListener('hashchange', listener);
  return () => {
    window.removeEventListener(URL_STATE_EVENT, listener);
    window.removeEventListener('popstate', listener);
    window.removeEventListener('hashchange', listener);
  };
}

function stringValue(key: string, fallback: string) {
  return readHashRoute().params.get(key) ?? fallback;
}

export function updateHashQuery(
  updates: Record<string, string | number | null | undefined>,
  mode: UrlHistoryMode = 'replace',
) {
  const params = readHashRoute().params;
  Object.entries(updates).forEach(([key, value]) => {
    if (value == null || value === '') params.delete(key);
    else params.set(key, String(value));
  });
  writeHashParams(params, mode);
}

export function useHashString(
  key: string,
  fallback = '',
): [string, (value: SetStateAction<string>, mode?: UrlHistoryMode) => void] {
  const [value, setLocalValue] = useState(() => stringValue(key, fallback));

  useEffect(() => subscribe(() => setLocalValue(stringValue(key, fallback))), [fallback, key]);

  const setValue = useCallback((next: SetStateAction<string>, mode: UrlHistoryMode = 'replace') => {
    const current = stringValue(key, fallback);
    const resolved = typeof next === 'function' ? next(current) : next;
    setLocalValue(resolved);
    updateHashQuery({ [key]: resolved === fallback ? null : resolved }, mode);
  }, [fallback, key]);

  return [value, setValue];
}

export function useHashNumber(
  key: string,
  fallback: number,
  minimum = 1,
): [number, (value: SetStateAction<number>, mode?: UrlHistoryMode) => void] {
  const parse = useCallback(() => {
    const raw = Number(readHashRoute().params.get(key));
    return Number.isFinite(raw) && raw >= minimum ? raw : fallback;
  }, [fallback, key, minimum]);
  const [value, setLocalValue] = useState(parse);

  useEffect(() => subscribe(() => setLocalValue(parse())), [parse]);

  const setValue = useCallback((next: SetStateAction<number>, mode: UrlHistoryMode = 'replace') => {
    const current = parse();
    const resolved = Math.max(minimum, typeof next === 'function' ? next(current) : next);
    setLocalValue(resolved);
    updateHashQuery({ [key]: resolved === fallback ? null : resolved }, mode);
  }, [fallback, key, minimum, parse]);

  return [value, setValue];
}

export function urlKey(label: string) {
  return label.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'data';
}

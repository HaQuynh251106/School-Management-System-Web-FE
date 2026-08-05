import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './client';

type UseApiOptions = {
  suppressErrorStatuses?: number[];
};

/** GET có loading/error + reload. Truyền path=null để bỏ qua (chưa đủ điều kiện). */
export function useApi<T = any>(path: string | null, options: UseApiOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [reloadVersion, setReloadVersion] = useState(0);
  const suppressedStatusesKey = (options.suppressErrorStatuses || []).join(',');

  const reload = useCallback(() => setReloadVersion((current) => current + 1), []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      setErrorStatus(null);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    api
      .get<T>(path, {
        signal: controller.signal,
        suppressErrorStatuses: suppressedStatusesKey
          ? suppressedStatusesKey.split(',').map(Number)
          : [],
      })
      .then((d) => {
        if (controller.signal.aborted) return;
        setData(d);
        setError(null);
        setErrorStatus(null);
      })
      .catch((e) => {
        if (controller.signal.aborted || (e instanceof DOMException && e.name === 'AbortError')) return;
        setError(e instanceof ApiError ? e.message : String(e));
        setErrorStatus(e instanceof ApiError ? e.status : null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [path, reloadVersion, suppressedStatusesKey]);

  return { data, loading, error, errorStatus, reload, setData };
}

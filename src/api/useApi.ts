import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from './client';

/** GET có loading/error + reload. Truyền path=null để bỏ qua (chưa đủ điều kiện). */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .get<T>(path)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

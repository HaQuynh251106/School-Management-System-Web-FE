import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './client';

/** GET có loading/error + reload. Truyền path=null để bỏ qua (chưa đủ điều kiện). */
export function useApi<T = any>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);
  const [errorInfo, setErrorInfo] = useState<ApiError | null>(null);
  const requestSequence = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!path) {
      setData(null);
      setLoading(false);
      setError(null);
      setErrorInfo(null);
      return;
    }
    setLoading(true);
    try {
      const response = await api.get<T>(path);
      if (requestId !== requestSequence.current) return;
      setData(response);
      setError(null);
      setErrorInfo(null);
    } catch (e) {
      if (requestId !== requestSequence.current) return;
      setError(e instanceof ApiError ? e.message : String(e));
      setErrorInfo(e instanceof ApiError ? e : null);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, loading, error, errorInfo, reload, setData };
}

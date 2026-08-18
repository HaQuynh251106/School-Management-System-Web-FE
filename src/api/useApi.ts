import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './client';
import { BUSINESS_DATA_CHANGED, businessEventAffectsPath, type BusinessDataChangedDetail } from './liveEvents';

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

  useEffect(() => {
    if (!path) return;
    const refreshDomainData = (raw: Event) => {
      const detail = (raw as CustomEvent<BusinessDataChangedDetail>).detail;
      if (detail?.type && businessEventAffectsPath(detail.type, path)) void reload();
    };
    window.addEventListener(BUSINESS_DATA_CHANGED, refreshDomainData);
    return () => window.removeEventListener(BUSINESS_DATA_CHANGED, refreshDomainData);
  }, [path, reload]);

  return { data, loading, error, errorInfo, reload, setData };
}

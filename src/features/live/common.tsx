import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Inbox, RefreshCw, XCircle } from 'lucide-react';
import type { PageResponse } from '../../api/types';
import { urlKey, useHashNumber } from '../../api/urlState';

export const vnd = new Intl.NumberFormat('vi-VN');
export const money = (n: number) => `${vnd.format(n ?? 0)} ₫`;

export function fmtDate(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('vi-VN');
}
export function fmtDateTime(s?: string | null) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleString('vi-VN');
}

export const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DAY_LABEL: Record<string, string> = { MON: 'T2', TUE: 'T3', WED: 'T4', THU: 'T5', FRI: 'T6', SAT: 'T7' };

export function LoadingBlock() {
  return (
    <div className="async-state async-state--loading" role="status" aria-live="polite">
      <span className="async-state__spinner" aria-hidden="true" />
      <div className="async-state__loading-copy"><strong>Đang tải dữ liệu</strong><span>Vui lòng chờ trong giây lát…</span></div>
      <div className="async-state__skeleton" aria-hidden="true"><i /><i /><i /></div>
    </div>
  );
}
export function ErrorBlock({ msg, onRetry }: { msg: string; onRetry?: () => void }) {
  return (
    <div className="async-state async-state--error" role="alert">
      <span className="async-state__icon"><AlertCircle size={21} /></span>
      <div><strong>Chưa thể tải dữ liệu</strong><span>{msg}</span></div>
      {onRetry && <button type="button" onClick={onRetry}><RefreshCw size={15} /> Thử lại</button>}
    </div>
  );
}
export function EmptyState({ label = 'Chưa có dữ liệu' }: { label?: string }) {
  return (
    <div className="empty-state async-state--empty">
      <span className="async-state__icon"><Inbox size={21} /></span>
      <div><strong>{label}</strong><span>Hãy kiểm tra phạm vi hoặc tạo dữ liệu mới để bắt đầu.</span></div>
    </div>
  );
}

/** Bọc trạng thái fetch: loading / error / empty / data. */
export function Async<T>({
  state,
  children,
  empty,
  allowEmpty = false,
  paginate = false,
  pageSize = 10,
  itemLabel = 'bản ghi',
  resetKey,
  urlStateKey,
}: {
  state: { data: T | null; loading: boolean; error: string | null; reload?: () => void | Promise<void> };
  children: (data: T) => ReactNode;
  empty?: string;
  allowEmpty?: boolean;
  paginate?: boolean;
  pageSize?: number;
  itemLabel?: string;
  resetKey?: string | number;
  urlStateKey?: string;
}) {
  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorBlock msg={state.error} onRetry={state.reload ? () => { void state.reload?.(); } : undefined} />;
  if (state.data == null || (!allowEmpty && Array.isArray(state.data) && state.data.length === 0)) {
    return <EmptyState label={empty} />;
  }
  if (paginate && Array.isArray(state.data)) {
    return (
      <PaginatedData items={state.data} pageSize={pageSize} itemLabel={itemLabel} resetKey={resetKey} urlStateKey={urlStateKey}>
        {(items) => children(items as T)}
      </PaginatedData>
    );
  }
  return <>{children(state.data)}</>;
}

/** Phân trang thống nhất cho mọi bảng/danh sách dữ liệu phía client. */
export function PaginatedData<T>({
  items,
  children,
  pageSize: initialPageSize = 10,
  itemLabel = 'bản ghi',
  resetKey,
  urlStateKey,
}: {
  items: T[];
  children: (items: T[]) => ReactNode;
  pageSize?: number;
  itemLabel?: string;
  resetKey?: string | number;
  urlStateKey?: string;
}) {
  const paginationKey = urlStateKey || urlKey(itemLabel);
  const [page, setPage] = useHashNumber(`p_${paginationKey}`, 1);
  const [pageSize, setPageSize] = useHashNumber(`s_${paginationKey}`, initialPageSize);
  const previousResetKey = useRef(resetKey);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [setPage, totalPages]);

  useEffect(() => {
    if (previousResetKey.current === resetKey) return;
    previousResetKey.current = resetKey;
    setPage(1);
  }, [resetKey, setPage]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const visiblePages = useMemo(() => {
    const visibleCount = Math.min(5, totalPages);
    const start = Math.max(1, Math.min(page - 2, totalPages - visibleCount + 1));
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [page, totalPages]);

  const first = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, items.length);

  return (
    <>
      {children(pageItems)}
      {items.length > 0 && (
        <nav className="data-pagination" aria-label={`Phân trang ${itemLabel}`}>
          <span className="data-pagination-summary">
            Hiển thị <strong>{first}–{last}</strong> trong <strong>{items.length}</strong> {itemLabel}
          </span>
          <label>
            <span>Số dòng</span>
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1), 'push')} disabled={page === 1} aria-label="Trang trước">‹</button>
          <div className="data-pagination-pages">
            {visiblePages.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={pageNumber === page ? 'active' : ''}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber, 'push')}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1), 'push')} disabled={page === totalPages} aria-label="Trang sau">›</button>
        </nav>
      )}
    </>
  );
}

export function ServerPagination<T>({
  data,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'bản ghi',
  pageSizes = [10, 20, 50, 100],
}: {
  data: PageResponse<T>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
  pageSizes?: number[];
}) {
  if (data.totalElements === 0) return null;
  const first = data.page * data.size + 1;
  const last = Math.min((data.page + 1) * data.size, data.totalElements);
  const visibleCount = Math.min(5, Math.max(1, data.totalPages));
  const start = Math.max(0, Math.min(data.page - 2, data.totalPages - visibleCount));
  const pages = Array.from({ length: visibleCount }, (_, index) => start + index);
  return (
    <nav className="data-pagination" aria-label={`Phân trang ${itemLabel}`}>
      <span className="data-pagination-summary">
        Hiển thị <strong>{first}–{last}</strong> trong <strong>{data.totalElements}</strong> {itemLabel}
      </span>
      <label>
        <span>Số dòng</span>
        <select value={data.size} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
          {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
        </select>
      </label>
      <button type="button" onClick={() => onPageChange(Math.max(0, data.page - 1))}
        disabled={data.first} aria-label="Trang trước">‹</button>
      <div className="data-pagination-pages">
        {pages.map((page) => (
          <button type="button" key={page} className={page === data.page ? 'active' : ''}
            aria-current={page === data.page ? 'page' : undefined} onClick={() => onPageChange(page)}>
            {page + 1}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => onPageChange(Math.min(data.totalPages - 1, data.page + 1))}
        disabled={data.last} aria-label="Trang sau">›</button>
    </nav>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const timer = useRef<number | null>(null);
  const show = useCallback((kind: 'ok' | 'err', text: string) => {
    if (timer.current) window.clearTimeout(timer.current);
    setMsg({ kind, text });
    timer.current = window.setTimeout(() => setMsg(null), 6000);
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const node = msg ? <div className={`live-msg ${msg.kind}`} role="status" aria-live="polite">
    {msg.kind === 'ok' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
    <span>{msg.text}</span>
    <button type="button" aria-label="Đóng thông báo" title="Đóng" onClick={() => setMsg(null)}>×</button>
  </div> : null;
  return { show, node };
}

export const ATT_LABEL: Record<string, string> = {
  PRESENT: 'Có mặt',
  LATE: 'Trễ',
  ABSENT_UNEXCUSED: 'Vắng KP',
  ABSENT_EXCUSED: 'Vắng CP',
};

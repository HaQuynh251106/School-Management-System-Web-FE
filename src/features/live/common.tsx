import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

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
  return <div className="live-loading">Đang tải…</div>;
}
export function ErrorBlock({ msg }: { msg: string }) {
  return <div className="live-msg err">{msg}</div>;
}
export function EmptyState({ label = 'Chưa có dữ liệu' }: { label?: string }) {
  return <div className="empty-state"><strong>{label}</strong></div>;
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
}: {
  state: { data: T | null; loading: boolean; error: string | null };
  children: (data: T) => ReactNode;
  empty?: string;
  allowEmpty?: boolean;
  paginate?: boolean;
  pageSize?: number;
  itemLabel?: string;
  resetKey?: string | number;
}) {
  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorBlock msg={state.error} />;
  if (state.data == null || (!allowEmpty && Array.isArray(state.data) && state.data.length === 0)) {
    return <EmptyState label={empty} />;
  }
  if (paginate && Array.isArray(state.data)) {
    return (
      <PaginatedData items={state.data} pageSize={pageSize} itemLabel={itemLabel} resetKey={resetKey}>
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
}: {
  items: T[];
  children: (items: T[]) => ReactNode;
  pageSize?: number;
  itemLabel?: string;
  resetKey?: string | number;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

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
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} aria-label="Trang trước">‹</button>
          <div className="data-pagination-pages">
            {visiblePages.map((pageNumber) => (
              <button
                type="button"
                key={pageNumber}
                className={pageNumber === page ? 'active' : ''}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} aria-label="Trang sau">›</button>
        </nav>
      )}
    </>
  );
}

export function useToast() {
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const show = (kind: 'ok' | 'err', text: string) => {
    setMsg({ kind, text });
    setTimeout(() => setMsg(null), 4000);
  };
  const node = msg ? <div className={`live-msg ${msg.kind}`}>{msg.text}</div> : null;
  return { show, node };
}

export const ATT_LABEL: Record<string, string> = {
  PRESENT: 'Có mặt',
  LATE: 'Trễ',
  ABSENT_UNEXCUSED: 'Vắng KP',
  ABSENT_EXCUSED: 'Vắng CP',
};

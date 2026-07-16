import { useState } from 'react';
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
}: {
  state: { data: T | null; loading: boolean; error: string | null };
  children: (data: T) => ReactNode;
  empty?: string;
  allowEmpty?: boolean;
}) {
  if (state.loading) return <LoadingBlock />;
  if (state.error) return <ErrorBlock msg={state.error} />;
  if (state.data == null || (!allowEmpty && Array.isArray(state.data) && state.data.length === 0)) {
    return <EmptyState label={empty} />;
  }
  return <>{children(state.data)}</>;
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

import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { viLabel } from '../../../components/ui';

const labels: Record<string, string> = {
  PROMOTED: 'Lên lớp', RETAINED: 'Lưu ban', COMPLETED: 'Hoàn thành', GRADUATED: 'Tốt nghiệp',
  TRANSFERRED: 'Chuyển trường', WITHDRAWN: 'Thôi học', NOT_GRADUATED: 'Chưa tốt nghiệp',
  INCOMPLETE: 'Chưa hoàn thiện', MISSING: 'Thiếu dữ liệu', EXCELLENT: 'Xuất sắc', GOOD: 'Tốt',
  FAIR: 'Khá', AVERAGE: 'Trung bình', WEAK: 'Yếu', PUBLISHED: 'Đã phát hành',
  LOCKED: 'Đã khóa', APPROVED: 'Đã duyệt', DRAFT: 'Bản nháp', ACTIVE: 'Đang theo học',
  ARCHIVED: 'Đã lưu trữ', MALE: 'Nam', FEMALE: 'Nữ', ENROLLED: 'Đang học',
};

export function archiveLabel(value?: string | null) {
  if (!value) return 'Chưa có dữ liệu';
  return labels[value] || viLabel(value);
}

export function archiveTone(value?: string | null): 'green' | 'blue' | 'orange' | 'red' | 'violet' {
  if (['GRADUATED', 'PROMOTED', 'PUBLISHED', 'COMPLETED', 'GOOD', 'EXCELLENT'].includes(value || '')) return 'green';
  if (['ACTIVE', 'APPROVED', 'LOCKED', 'FAIR', 'ENROLLED'].includes(value || '')) return 'blue';
  if (['RETAINED', 'WEAK', 'WITHDRAWN'].includes(value || '')) return 'red';
  if (['INCOMPLETE', 'MISSING', 'NOT_GRADUATED', 'AVERAGE', 'DRAFT'].includes(value || '')) return 'orange';
  return 'violet';
}

export function archiveScore(value?: number | null) {
  return value == null ? '—' : value.toFixed(1);
}

export function ArchiveMetric({ icon, label, value, detail, tone = '' }: {
  icon: ReactNode; label: string; value: string | number; detail: string; tone?: string;
}) {
  return <article className={tone}><span>{icon}</span><div><small>{label}</small><strong>{typeof value === 'number' ? value.toLocaleString('vi-VN') : value}</strong><p>{detail}</p></div></article>;
}

export function ArchiveFilterSelect({ label, value, onChange, options, includeAll = true }: {
  label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]>; includeAll?: boolean;
}) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{includeAll && <option value="">Tất cả</option>}{options.map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>;
}

export function ArchiveSkeleton({ rows }: { rows: number }) {
  return <div className="archive-v2-skeleton" aria-label="Đang tải dữ liệu">{Array.from({ length: rows }, (_, index) => <span key={index} />)}</div>;
}

export function ArchiveError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="archive-v2-state error"><AlertTriangle size={26} /><div><strong>Không thể tải dữ liệu</strong><p>{message}</p></div><button className="live-btn ghost" type="button" onClick={retry}><RefreshCw size={15} /> Thử lại</button></div>;
}

export function ArchiveEmpty({ title, detail }: { title: string; detail: string }) {
  return <div className="archive-v2-state empty"><div><strong>{title}</strong><p>{detail}</p></div></div>;
}

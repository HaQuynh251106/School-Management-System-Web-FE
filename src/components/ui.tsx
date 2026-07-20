import { useState } from 'react';
import type React from 'react';
import type { LucideIcon } from 'lucide-react';
import { permissionRows } from '../data/mockData';
import type { TabItem } from '../types';

export function FunctionTabs({ tabs }: { tabs: TabItem[] }) {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <div className="tabbed-feature">
      <div className="tab-list" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={active.id === tab.id ? 'active' : ''}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <tab.Icon size={17} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tab-panel">{active.content}</div>
    </div>
  );
}

export function InfoGrid({ items }: { items: Array<{ title: string; value: string; meta: string }> }) {
  return (
    <div className="info-grid">
      {items.map((item) => (
        <article key={`${item.title}-${item.value}`} className="info-tile">
          <span>{item.title}</span>
          <strong>{item.value}</strong>
          <small>{item.meta}</small>
        </article>
      ))}
    </div>
  );
}

export function ProcessList({ items }: { items: string[] }) {
  return (
    <ol className="process-list">
      {items.map((item, index) => (
        <li key={item}>
          <span>{index + 1}</span>
          <strong>{item}</strong>
        </li>
      ))}
    </ol>
  );
}

export function FormPreview({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="form-preview">
      {rows.map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  );
}

export function PermissionMatrix() {
  return (
    <div className="permission-matrix">
      <div className="matrix-head">Quyền</div>
      <div className="matrix-head">Quản trị</div>
      <div className="matrix-head">Giáo viên</div>
      <div className="matrix-head">Học sinh</div>
      <div className="matrix-head">Phụ huynh</div>
      {permissionRows.map((row) => [
        <strong key={`${row.permission}-name`}>{row.permission}</strong>,
        <span key={`${row.permission}-admin`}>{row.admin ? '✓' : '-'}</span>,
        <span key={`${row.permission}-teacher`}>{row.teacher ? '✓' : '-'}</span>,
        <span key={`${row.permission}-student`}>{row.student ? '✓' : '-'}</span>,
        <span key={`${row.permission}-parent`}>{row.parent ? '✓' : '-'}</span>,
      ])}
    </div>
  );
}

export function Section({
  title,
  subtitle,
  action,
  children,
  wide,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <section className={`section-card ${wide ? 'wide' : ''}`}>
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function CommandButton({ Icon, label }: { Icon: LucideIcon; label: string }) {
  return (
    <button className="command-button">
      <Icon size={17} />
      <span>{label}</span>
    </button>
  );
}

export function Badge({ tone, children }: { tone: 'green' | 'blue' | 'orange' | 'red' | 'violet'; children: React.ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

const VI_LABELS: Record<string, string> = {
  ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', LOCKED: 'Đã khóa', PENDING: 'Chờ xử lý', PLANNED: 'Dự kiến',
  PUBLISHED: 'Đã phát hành', DRAFT: 'Bản nháp', CLOSED: 'Đã đóng', OPEN: 'Đang mở',
  SUBMITTED: 'Đã nộp', LATE: 'Nộp muộn', GRADED: 'Đã chấm',
  PENDING_PARENT: 'Chờ phụ huynh xác nhận', PENDING_HOMEROOM: 'Chờ GVCN duyệt',
  APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy', RESUBMISSION_ALLOWED: 'Được nộp lại',
  PAID: 'Đã thanh toán', PARTIAL: 'Thanh toán một phần', OVERDUE: 'Quá hạn',
  SUCCESS: 'Thành công', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền',
  SENT: 'Đã gửi', RETRYING: 'Đang gửi lại', MAINTENANCE: 'Đang bảo trì',
  READ: 'Đã đọc', UNREAD: 'Chưa đọc',
  PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', ABSENT_EXCUSED: 'Vắng có phép', ABSENT_UNEXCUSED: 'Vắng không phép',
  ADMIN: 'Quản trị viên', TEACHER: 'Giáo viên', STUDENT: 'Học sinh', PARENT: 'Phụ huynh', SYSTEM: 'Hệ thống', GUEST: 'Khách',
  LOGIN: 'Đăng nhập', LOGIN_FAILED: 'Đăng nhập thất bại', CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa', EXPORT: 'Xuất dữ liệu', PAYMENT: 'Thanh toán',
  ATTENDANCE_REMINDER: 'Nhắc điểm danh', ATTENDANCE_UNLOCK: 'Mở khóa điểm danh', ATTENDANCE_SESSION: 'Phiên điểm danh',
  FEE: 'Khoản thu', INVOICE: 'Hóa đơn', FINANCE_REMINDER: 'Nhắc hạn khoản thu',
  FINANCE_CLASS_COMPLETE: 'Lớp hoàn thành tài chính',
  CASH: 'Tiền mặt', VNPAY: 'VNPay', MOMO: 'MoMo',
  PUSH: 'Thông báo đẩy', EMAIL: 'Email', IN_APP: 'Trong ứng dụng', ON: 'Đang bật', OFF: 'Đang tắt',
};

export function viLabel(value?: string | null) {
  if (!value) return '—';
  return VI_LABELS[value.trim().toUpperCase()] ?? value;
}

export function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const tone =
    normalized === 'active' || normalized === 'paid' || normalized === 'success' || normalized === 'read' || normalized.includes('có mặt') || normalized.includes('đang học')
      ? 'green'
      : normalized === 'pending' || normalized === 'planned' || normalized === 'partial' || normalized === 'unread' || normalized.includes('trễ') || normalized.includes('cần')
        ? 'orange'
        : normalized.includes('vắng') || normalized === 'locked' || normalized === 'inactive' || normalized === 'failed' || normalized === 'overdue'
          ? 'red'
          : 'blue';

  return <Badge tone={tone}>{viLabel(value)}</Badge>;
}


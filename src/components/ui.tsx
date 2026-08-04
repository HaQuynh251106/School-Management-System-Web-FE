import type React from 'react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Info } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TabItem } from '../types';
import { useHashString } from '../api/urlState';

export function FunctionTabs({ tabs, mode = 'auto' }: { tabs: TabItem[]; mode?: 'auto' | 'tabs' | 'workflow' }) {
  const [activeTab, setActiveTab] = useHashString('tab', tabs[0]?.id ?? '');
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
  const workflow = mode === 'workflow' || (mode === 'auto' && tabs.some((tab) => Boolean(tab.description)));
  const activeIndex = Math.max(0, tabs.findIndex((tab) => tab.id === active.id));
  const moveTab = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabs.length - 1;
    if (nextIndex == null) return;
    event.preventDefault();
    const next = tabs[nextIndex];
    setActiveTab(next.id, 'push');
    window.requestAnimationFrame(() => document.getElementById(`tab-${next.id}`)?.focus());
  };

  return (
    <div className="tabbed-feature">
      <div className={`tab-navigation ${workflow ? 'workflow-navigation' : ''}`}>
        <div className="tab-navigation-heading">
          <small>{workflow ? `Bước ${activeIndex + 1} / ${tabs.length}` : 'Khu vực làm việc'}</small>
          <strong>{active.label}</strong>
          {workflow && active.description && <p>{active.description}</p>}
        </div>
        <select className="tab-mobile-select" aria-label="Chọn khu vực làm việc" value={active.id} onChange={(event) => setActiveTab(event.target.value, 'push')}>
          {tabs.map((tab, index) => <option key={tab.id} value={tab.id}>{workflow ? `Bước ${index + 1}: ` : ''}{tab.label}</option>)}
        </select>
        {workflow ? <div className="workflow-compact-control" aria-label="Điều hướng quy trình">
          <button type="button" disabled={activeIndex === 0} onClick={() => setActiveTab(tabs[activeIndex - 1].id, 'push')} aria-label="Bước trước"><ChevronLeft size={18} /></button>
          <label>
            <span>Chuyển đến bước</span>
            <select aria-label="Chuyển đến bước" value={active.id} onChange={(event) => setActiveTab(event.target.value, 'push')}>
              {tabs.map((tab, index) => <option key={tab.id} value={tab.id}>{index + 1}. {tab.label}</option>)}
            </select>
          </label>
          <button className="next" type="button" disabled={activeIndex === tabs.length - 1} onClick={() => setActiveTab(tabs[activeIndex + 1].id, 'push')}>Bước tiếp theo <ChevronRight size={18} /></button>
        </div> : <div className="tab-list" role="tablist" aria-orientation="horizontal">
          {tabs.map((tab, index) => (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              className={active.id === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id, 'push')}
              onKeyDown={(event) => moveTab(event, index)}
              type="button"
              role="tab"
              aria-selected={active.id === tab.id}
              aria-controls={`panel-${tab.id}`}
              tabIndex={active.id === tab.id ? 0 : -1}
            >
              {workflow ? <span className="workflow-step-number">{index + 1}</span> : <tab.Icon size={17} />}
              <span className="tab-label-copy"><strong>{tab.label}</strong>{tab.description && <small>{tab.description}</small>}</span>
            </button>
          ))}
        </div>}
      </div>
      {workflow && <div className="workflow-progress" aria-label={`Tiến độ ${activeIndex + 1} trên ${tabs.length} bước`}><span style={{ width: `${((activeIndex + 1) / tabs.length) * 100}%` }} /></div>}
      <div
        className="tab-panel"
        id={`panel-${active.id}`}
        role="tabpanel"
        {...(!workflow ? { 'aria-labelledby': `tab-${active.id}` } : { 'aria-label': active.label })}
        tabIndex={0}
      >
        {active.content}
      </div>
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
  ATTENDANCE_MISSED: 'Quên điểm danh',
  ACTIVE: 'Đang hoạt động', INACTIVE: 'Ngừng hoạt động', LOCKED: 'Đã khóa', PENDING: 'Chờ xử lý', PLANNED: 'Dự kiến',
    PUBLISHED: 'Đã phát hành', DRAFT: 'Bản nháp', CLOSED: 'Đã đóng', OPEN: 'Đang mở', NOT_STARTED: 'Chưa đến thời gian',
  SUBMITTED: 'Đã nộp', LATE: 'Nộp muộn', GRADED: 'Đã chấm',
  PENDING_PARENT: 'Chờ phụ huynh xác nhận', PENDING_HOMEROOM: 'Chờ GVCN duyệt',
  APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối', CANCELLED: 'Đã hủy', RESUBMISSION_ALLOWED: 'Được nộp lại',
  PAID: 'Đã thanh toán', PARTIAL: 'Thanh toán một phần', OVERDUE: 'Quá hạn',
  SUCCESS: 'Thành công', FAILED: 'Thất bại', REFUNDED: 'Đã hoàn tiền',
  SENT: 'Đã gửi', RETRYING: 'Đang gửi lại', MAINTENANCE: 'Đang bảo trì',
  READ: 'Đã đọc', UNREAD: 'Chưa đọc',
  PRESENT: 'Có mặt', ABSENT: 'Vắng mặt', ABSENT_EXCUSED: 'Vắng có phép', ABSENT_UNEXCUSED: 'Vắng không phép',
  ADMIN: 'Quản trị viên', ACADEMIC_STAFF: 'Giáo vụ', ACCOUNTANT: 'Kế toán', TEACHER: 'Giáo viên', STUDENT: 'Học sinh', PARENT: 'Phụ huynh', SYSTEM: 'Hệ thống', GUEST: 'Khách',
  LOGIN: 'Đăng nhập', LOGIN_FAILED: 'Đăng nhập thất bại', CREATE: 'Tạo mới', UPDATE: 'Cập nhật', DELETE: 'Xóa', EXPORT: 'Xuất dữ liệu', PAYMENT: 'Thanh toán',
  ATTENDANCE_REMINDER: 'Nhắc điểm danh', ATTENDANCE_UNLOCK: 'Mở khóa điểm danh', ATTENDANCE_SESSION: 'Phiên điểm danh',
  FEE: 'Khoản thu', INVOICE: 'Hóa đơn', FINANCE_REMINDER: 'Nhắc hạn khoản thu',
  FINANCE_CLASS_COMPLETE: 'Lớp hoàn thành tài chính',
  FINANCE_TASK_REMINDER: 'Nhiệm vụ tài chính lớp',
  CASH: 'Tiền mặt', VIETQR: 'VietQR', OPENING_BALANCE: 'Số dư thanh toán đầu kỳ',
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

  const StatusIcon = tone === 'green' ? CheckCircle2 : tone === 'orange' ? Clock3 : tone === 'red' ? AlertTriangle : Info;
  return <Badge tone={tone}><StatusIcon size={12} aria-hidden="true" /> {viLabel(value)}</Badge>;
}


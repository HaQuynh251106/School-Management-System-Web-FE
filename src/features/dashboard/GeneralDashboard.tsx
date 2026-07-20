import {
  Activity, ArrowRight, BarChart3, Bell, BellRing, BookOpenCheck, CalendarCheck2, CalendarDays,
  Check, CheckCircle2, ClipboardCheck, GraduationCap, MessageSquareText, RefreshCw, School,
  ShieldCheck, Sparkles, Upload, Users, WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, DashboardChart, DashboardMetric, DashboardResponse, Notification, SchoolClass,
} from '../../api/types';
import { BarList, ChartCard, ColumnChart, MetricCard } from '../../components/charts';
import { Section, StatusPill, viLabel } from '../../components/ui';
import type { Metric, PageId, RoleId } from '../../types';
import { PaginatedData } from '../live/common';

type RoleIntro = {
  eyebrow: string;
  title: string;
  description: string;
  facts: string[];
  imageAlt: string;
  Icon: LucideIcon;
};

type DashboardLink = {
  code: PageId;
  title: string;
  description: string;
  Icon: LucideIcon;
};

const roleDashboardIntros: Record<RoleId, RoleIntro> = {
  admin: {
    eyebrow: 'Trung tâm điều hành thời gian thực',
    title: 'Điều hành nhà trường bằng dữ liệu',
    description: 'Nắm bắt quy mô, chuyên cần, tài chính và các vấn đề cần xử lý trên một màn hình thống nhất, cập nhật trực tiếp từ hệ thống.',
    facts: ['Dữ liệu PostgreSQL đồng bộ', 'Cảnh báo ưu tiên theo thời gian thực'],
    imageAlt: 'Quản trị viên theo dõi dữ liệu vận hành nhà trường',
    Icon: ShieldCheck,
  },
  teacher: {
    eyebrow: 'Không gian giáo viên',
    title: 'Bắt đầu ngày dạy với đúng việc cần làm',
    description: 'Lịch dạy, chuyên cần, điểm số và bài tập được sắp xếp theo mức độ ưu tiên trong một không gian thống nhất.',
    facts: ['Lịch dạy rõ ràng', 'Theo sát từng lớp'],
    imageAlt: 'Giáo viên hướng dẫn học sinh trong lớp học',
    Icon: School,
  },
  student: {
    eyebrow: 'Hành trình học tập',
    title: 'Chủ động tiến độ, vững vàng mỗi ngày',
    description: 'Nắm nhanh kết quả học tập, chuyên cần, bài cần nộp và các cập nhật mới nhất từ giáo viên.',
    facts: ['Tiến độ cá nhân', 'Nhắc việc thông minh'],
    imageAlt: 'Học sinh cùng nhau học tập',
    Icon: GraduationCap,
  },
  parent: {
    eyebrow: 'Đồng hành cùng con',
    title: 'Thông tin quan trọng luôn trong tầm mắt',
    description: 'Theo dõi kết quả, chuyên cần, thông báo và các khoản thu của từng học sinh được liên kết.',
    facts: ['Cập nhật kịp thời', 'Theo dõi tập trung'],
    imageAlt: 'Phụ huynh theo dõi thông tin học tập trên điện thoại',
    Icon: Users,
  },
};

const quickLinks: Record<RoleId, DashboardLink[]> = {
  admin: [
    { code: 'A1S', title: 'Quản lý học sinh', description: 'Hồ sơ và phân lớp', Icon: GraduationCap },
    { code: 'A3', title: 'Thời khóa biểu', description: 'Phân công và xếp lịch', Icon: CalendarDays },
    { code: 'A7', title: 'Tài chính', description: 'Khoản thu và công nợ', Icon: WalletCards },
    { code: 'A9', title: 'Gửi thông báo', description: 'Kết nối toàn trường', Icon: Bell },
  ],
  teacher: [
    { code: 'B2', title: 'Lịch dạy', description: 'Xem thời khóa biểu tuần', Icon: CalendarDays },
    { code: 'B3', title: 'Điểm danh', description: 'Ghi nhận theo tiết học', Icon: ClipboardCheck },
    { code: 'B4', title: 'Bảng điểm', description: 'Cập nhật kết quả học tập', Icon: BarChart3 },
    { code: 'B5', title: 'Giao bài tập', description: 'Tạo và chấm bài', Icon: BookOpenCheck },
  ],
  student: [
    { code: 'C2', title: 'Kết quả học tập', description: 'Điểm và thời khóa biểu', Icon: BarChart3 },
    { code: 'C4', title: 'Bài tập', description: 'Xem và nộp bài', Icon: Upload },
    { code: 'C5', title: 'Thông báo', description: 'Cập nhật mới nhất', Icon: Bell },
    { code: 'C7', title: 'Trao đổi', description: 'Nhắn tin giáo viên', Icon: MessageSquareText },
  ],
  parent: [
    { code: 'D1', title: 'Chọn học sinh', description: 'Đổi hồ sơ đang theo dõi', Icon: Users },
    { code: 'D2', title: 'Tình hình học tập', description: 'Điểm và chuyên cần', Icon: BarChart3 },
    { code: 'D3', title: 'Liên lạc giáo viên', description: 'Trao đổi với giáo viên', Icon: MessageSquareText },
    { code: 'D4', title: 'Khoản thu', description: 'Hóa đơn và thanh toán', Icon: WalletCards },
    { code: 'D5', title: 'Thông báo', description: 'Cập nhật từ nhà trường', Icon: Bell },
  ],
};

const metricIcons: Record<string, LucideIcon> = {
  users: Users, classes: School, attendance: CalendarDays, alerts: Activity, grades: BarChart3,
  assignments: BookOpenCheck, calendar: CalendarDays, children: Users, invoices: WalletCards,
  notifications: Bell,
};

const validTones = new Set<Metric['tone']>(['blue', 'green', 'orange', 'red', 'violet']);

export function GeneralDashboard({ roleId, onNavigate }: { roleId: RoleId; onNavigate?: (page: PageId) => void }) {
  const { user } = useAuth();
  const dashboard = useApi<DashboardResponse>('/dashboard');
  const users = useApi<ApiUser[]>(roleId === 'admin' ? '/users' : null);
  const classes = useApi<SchoolClass[]>(roleId === 'admin' ? '/classes' : null);
  const notifications = useApi<Notification[]>('/notifications');
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const intro = roleDashboardIntros[roleId];
  const IntroIcon = intro.Icon;
  const metrics = (dashboard.data?.metrics ?? []).map(toMetric);
  const nameParts = user?.fullName.trim().split(/\s+/) ?? [];
  const firstName = nameParts[nameParts.length - 1] || roleLabel(roleId);
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date());
  const hasError = Boolean(dashboard.error || users.error || classes.error || notifications.error);
  const loading = dashboard.loading;
  const links = quickLinks[roleId];
  const primaryLink = roleId === 'admin'
    ? { code: 'A8' as PageId, title: 'Mở báo cáo điều hành' }
    : { code: links[0].code, title: links[0].title };
  const focusItems = buildFocusItems(roleId, dashboard.data?.metrics ?? [], notifications.data ?? []);
  const teacherAnnouncements = roleId === 'teacher'
    ? (notifications.data ?? []).filter((item) => item.refType === 'ANNOUNCEMENT').slice(0, 4)
    : [];

  const navigate = (page: PageId) => onNavigate?.(page);
  const reloadAll = () => {
    dashboard.reload();
    users.reload();
    classes.reload();
    notifications.reload();
  };
  const markNotificationRead = async (id: string) => {
    setMarkingNotificationId(id);
    try {
      await api.post(`/notifications/${id}/read`);
      notifications.reload();
      dashboard.reload();
    } finally {
      setMarkingNotificationId(null);
    }
  };

  return (
    <div className={`dashboard role-dashboard role-dashboard--${roleId}`}>
      {hasError && (
        <div className="dashboard-data-notice" role="alert">
          <Activity size={18} />
          <div><strong>Một số dữ liệu chưa được cập nhật</strong><span>Kiểm tra kết nối và thử đồng bộ lại Dashboard.</span></div>
          <button type="button" onClick={reloadAll}><RefreshCw size={15} /> Thử lại</button>
        </div>
      )}

      <section className={`portal-hero portal-hero--${roleId}`}>
        <div className="portal-hero-copy">
          <span className="portal-hero-kicker"><Sparkles size={15} /> {intro.eyebrow}</span>
          <p className="portal-hero-welcome">Xin chào, {firstName}</p>
          <h2>{intro.title}</h2>
          <p>{intro.description}</p>
          <div className="dashboard-hero-actions">
            <button type="button" className="dashboard-primary-action" onClick={() => navigate(primaryLink.code)}>
              {primaryLink.title} <ArrowRight size={17} />
            </button>
            <button type="button" className="dashboard-refresh-action" onClick={reloadAll} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Cập nhật dữ liệu
            </button>
          </div>
          <div className="portal-hero-facts">
            {intro.facts.map((fact) => <strong key={fact}><CheckCircle2 size={16} /> {fact}</strong>)}
            <strong><IntroIcon size={16} /> {today}</strong>
          </div>
        </div>
        {roleId === 'admin' ? (
          <div className="admin-hero-visual" role="img" aria-label={intro.imageAlt}>
            <img src="/images/admin-dashboard-hero.png" alt="" width="1774" height="887" />
            <div className="admin-hero-live-card">
              <header><span><Activity size={14} /> Dữ liệu trực tiếp</span><i className={loading ? 'loading' : ''} /></header>
              <strong>{loading ? 'Đang đồng bộ dữ liệu…' : heroInsight(roleId, dashboard.data?.metrics ?? [])}</strong>
              <small>Tổng hợp tự động từ dữ liệu vận hành hiện tại</small>
            </div>
          </div>
        ) : (
          <div className={`portal-hero-art role-art role-art--${roleId}`} role="img" aria-label={intro.imageAlt}>
            <div className="dashboard-art-status">
              <span><Activity size={14} /> Cập nhật trực tiếp</span>
              <strong>{loading ? 'Đang đồng bộ…' : heroInsight(roleId, dashboard.data?.metrics ?? [])}</strong>
            </div>
          </div>
        )}
      </section>

      {roleId === 'teacher' && (
        <TeacherAnnouncementSpotlight
          items={teacherAnnouncements}
          loading={notifications.loading}
          markingId={markingNotificationId}
          onMarkRead={markNotificationRead}
          onOpenInbox={() => navigate('B7')}
        />
      )}

      {loading && <DashboardSkeleton />}
      {!loading && metrics.length > 0 && (
        <section className="metric-grid dashboard-metric-grid" aria-label="Chỉ số tổng quan">
          {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </section>
      )}

      <section className="dashboard-command-grid">
        <div className="dashboard-command-card">
          <div className="dashboard-card-heading">
            <div><span>Điều hướng nhanh</span><h3>Công việc thường dùng</h3></div>
            <Sparkles size={20} />
          </div>
          <div className="dashboard-quick-grid">
            {links.map(({ code, title, description, Icon }) => (
              <button type="button" key={code} className="dashboard-quick-link" onClick={() => navigate(code)}>
                <span><Icon size={20} /></span>
                <div><strong>{title}</strong><small>{description}</small></div>
                <ArrowRight size={16} />
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-command-card dashboard-focus-card">
          <div className="dashboard-card-heading">
            <div><span>Trợ lý công việc</span><h3>Việc cần ưu tiên</h3></div>
            <CalendarCheck2 size={20} />
          </div>
          <div className="dashboard-focus-list">
            {focusItems.map((item) => (
              <button type="button" key={`${item.code}-${item.title}`} onClick={() => navigate(item.code)}>
                <span className={`dashboard-focus-dot dashboard-focus-dot--${item.tone}`} />
                <div><strong>{item.title}</strong><small>{item.description}</small></div>
                <ArrowRight size={15} />
              </button>
            ))}
          </div>
        </div>
      </section>

      {!loading && (dashboard.data?.charts.length ?? 0) > 0 && (
        <section className="dashboard-insights-section">
          <div className="dashboard-section-title">
            <div><span>Phân tích dữ liệu</span><h3>Xu hướng nổi bật</h3></div>
            <small>Dữ liệu được tổng hợp tự động từ hệ thống</small>
          </div>
          <div className="dashboard-grid">
            {dashboard.data?.charts.map((chart) => <DashboardChartCard key={chart.title} chart={chart} />)}
          </div>
        </section>
      )}

      {roleId === 'admin' && (
        <AdminDashboardTables users={users.data ?? []} classes={classes.data ?? []} notifications={notifications.data ?? []} />
      )}
    </div>
  );
}

function TeacherAnnouncementSpotlight({ items, loading, markingId, onMarkRead, onOpenInbox }: {
  items: Notification[];
  loading: boolean;
  markingId: string | null;
  onMarkRead: (id: string) => Promise<void>;
  onOpenInbox: () => void;
}) {
  const unreadCount = items.filter((item) => !item.read).length;
  return (
    <section className="teacher-announcement-spotlight" aria-label="Thông báo từ Ban quản trị">
      <header>
        <div className="teacher-announcement-title">
          <span><BellRing size={22} /></span>
          <div><small>Thông tin điều hành</small><h3>Thông báo từ nhà trường</h3></div>
        </div>
        <div className="teacher-announcement-tools">
          {unreadCount > 0 && <strong>{unreadCount} chưa đọc</strong>}
          <button type="button" onClick={onOpenInbox}>Xem tất cả <ArrowRight size={15} /></button>
        </div>
      </header>

      {loading ? (
        <div className="teacher-announcement-loading"><i /><i /><i /></div>
      ) : items.length === 0 ? (
        <div className="teacher-announcement-empty">
          <CheckCircle2 size={20} /><div><strong>Không có thông báo mới</strong><small>Các thông tin từ Ban quản trị sẽ xuất hiện nổi bật tại đây.</small></div>
        </div>
      ) : (
        <div className="teacher-announcement-list">
          {items.map((item, index) => (
            <article key={item.id} className={`${item.read ? 'is-read' : 'is-unread'} priority-${(item.priority || 'NORMAL').toLowerCase()}`}>
              <div className="teacher-announcement-icon"><Bell size={18} /></div>
              <div className="teacher-announcement-content">
                <div><span>{notificationCategoryLabel(item.type)}</span>{index === 0 && !item.read && <b>Mới nhất</b>}<time>{formatDashboardTime(item.createdAt)}</time></div>
                <strong>{item.title}</strong>
                <p>{item.body}</p>
              </div>
              {!item.read ? (
                <button type="button" className="teacher-announcement-read" disabled={markingId === item.id} onClick={() => onMarkRead(item.id)} title="Đánh dấu đã đọc">
                  <Check size={16} /> <span>{markingId === item.id ? 'Đang lưu…' : 'Đã đọc'}</span>
                </button>
              ) : <span className="teacher-announcement-read-state"><CheckCircle2 size={15} /> Đã đọc</span>}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <section className="metric-grid dashboard-skeleton" aria-label="Đang tải dữ liệu tổng quan">
      {[0, 1, 2, 3].map((item) => <div key={item} className="metric-card"><i /><i /><i /></div>)}
    </section>
  );
}

function DashboardChartCard({ chart }: { chart: DashboardChart }) {
  const max = Math.max(1, chart.max, ...chart.data.map((item) => item.value));
  return (
    <ChartCard title={chart.title} subtitle={chart.subtitle}>
      {chart.data.length === 0 ? (
        <div className="chart-empty"><BarChart3 size={24} /><span>Chưa có dữ liệu để hiển thị</span></div>
      ) : chart.type === 'COLUMN' ? (
        <ColumnChart data={chart.data} max={max} suffix={chart.suffix} />
      ) : (
        <BarList data={chart.data} max={max} suffix={chart.suffix} />
      )}
    </ChartCard>
  );
}

function AdminDashboardTables({ users, classes, notifications }: {
  users: ApiUser[];
  classes: SchoolClass[];
  notifications: Notification[];
}) {
  return (
    <section className="dashboard-operations-section">
      <div className="dashboard-section-title">
        <div><span>Vận hành nhà trường</span><h3>Dữ liệu cần theo dõi</h3></div>
        <small>Bảng dữ liệu thật, có phân trang</small>
      </div>
      <div className="admin-dashboard-table-grid">
        <Section title="Tài khoản người dùng" subtitle="Tình trạng truy cập theo từng vai trò">
          <PaginatedData items={users} pageSize={5} itemLabel="tài khoản">
            {(items) => <div className="admin-table-scroll"><table className="live-table admin-data-table">
              <thead><tr><th>Họ và tên</th><th>Vai trò</th><th>Tài khoản</th><th>Trạng thái</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id}>
                <td><strong>{item.fullName}</strong><small>{item.email || 'Chưa cập nhật email'}</small></td>
                <td>{viLabel(item.role)}</td><td>@{item.username}</td><td><StatusPill value={item.status} /></td>
              </tr>)}</tbody>
            </table></div>}
          </PaginatedData>
        </Section>

        <Section title="Lớp học hiện tại" subtitle="Sĩ số và giáo viên chủ nhiệm">
          <PaginatedData items={classes} pageSize={5} itemLabel="lớp học">
            {(items) => <div className="admin-table-scroll"><table className="live-table admin-data-table">
              <thead><tr><th>Lớp</th><th>Khối</th><th>Giáo viên chủ nhiệm</th><th>Sĩ số</th></tr></thead>
              <tbody>{items.map((item) => <tr key={item.id}>
                <td><strong>{item.code}</strong><small>{item.name}</small></td>
                <td>{item.gradeLevel}</td><td>{item.homeroomTeacherName || 'Chưa phân công'}</td><td><strong>{item.studentCount}</strong> học sinh</td>
              </tr>)}</tbody>
            </table></div>}
          </PaginatedData>
        </Section>
      </div>

      <Section title="Thông báo mới nhất" subtitle="Sự kiện và cảnh báo trong hệ thống" wide>
        <PaginatedData items={notifications} pageSize={5} itemLabel="thông báo">
          {(items) => <div className="admin-table-scroll"><table className="live-table admin-data-table">
            <thead><tr><th>Loại</th><th>Nội dung</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}>
              <td>{viLabel(item.type)}</td><td><strong>{item.title}</strong><small>{item.body}</small></td>
              <td>{formatDashboardTime(item.createdAt)}</td><td><StatusPill value={item.read ? 'READ' : 'UNREAD'} /></td>
            </tr>)}</tbody>
          </table></div>}
        </PaginatedData>
      </Section>
    </section>
  );
}

type FocusItem = DashboardLink & { tone: 'blue' | 'green' | 'orange' | 'violet' };

function buildFocusItems(roleId: RoleId, metrics: DashboardMetric[], notifications: Notification[]): FocusItem[] {
  const unread = notifications.filter((item) => !item.read).slice(0, 1);
  const links = quickLinks[roleId];
  const byKey = new Map(metrics.map((item) => [item.key, item.value]));
  const items: FocusItem[] = [];

  if ((byKey.get('alerts') ?? 0) > 0) items.push({ ...links[2], title: `${formatCompact(byKey.get('alerts'))} vấn đề cần xử lý`, description: 'Kiểm tra cảnh báo vận hành đang mở', tone: 'orange' });
  if ((byKey.get('assignments') ?? 0) > 0 && roleId === 'student') items.push({ ...links[1], title: `${formatCompact(byKey.get('assignments'))} bài tập cần nộp`, description: 'Ưu tiên bài gần đến hạn trước', tone: 'orange' });
  if ((byKey.get('invoices') ?? 0) > 0) items.push({ ...links[3], title: `${formatCompact(byKey.get('invoices'))} khoản thu chưa hoàn tất`, description: 'Xem hạn thanh toán và trạng thái hóa đơn', tone: 'orange' });
  if (unread[0]) items.push({ ...notificationLink(roleId), title: unread[0].title, description: 'Thông báo chưa đọc mới nhất', tone: unread[0].priority === 'URGENT' ? 'orange' : 'blue' });

  const defaults: Record<RoleId, FocusItem[]> = {
    admin: [
      { ...links[1], title: 'Rà soát lịch và phân công', description: 'Kiểm tra lớp hoặc giáo viên còn thiếu lịch', tone: 'blue' },
      { ...links[3], title: 'Cập nhật thông tin toàn trường', description: 'Gửi lịch sự kiện và thông báo chung', tone: 'violet' },
    ],
    teacher: [
      { ...links[0], title: 'Xem tiết dạy tiếp theo', description: 'Chuẩn bị lớp, môn và phòng học', tone: 'blue' },
      { ...links[1], title: 'Hoàn thành sổ điểm danh', description: 'Ghi nhận chuyên cần đúng tiết dạy', tone: 'green' },
    ],
    student: [
      { ...links[0], title: 'Xem lịch học hôm nay', description: 'Chuẩn bị môn học và phòng học', tone: 'blue' },
      { ...links[2], title: 'Kiểm tra cập nhật mới', description: 'Không bỏ lỡ thông tin từ giáo viên', tone: 'violet' },
    ],
    parent: [
      { ...links[1], title: 'Xem tình hình học tập', description: 'Theo dõi điểm và chuyên cần của con', tone: 'blue' },
      { ...links[2], title: 'Trao đổi với giáo viên', description: 'Liên hệ khi cần làm rõ thông tin', tone: 'green' },
    ],
  };
  for (const item of defaults[roleId]) {
    if (items.length >= 3) break;
    if (!items.some((current) => current.code === item.code)) items.push(item);
  }
  return items.slice(0, 3);
}

function notificationLink(roleId: RoleId): FocusItem {
  const map: Record<RoleId, FocusItem> = {
    admin: { ...quickLinks.admin[3], tone: 'blue' },
    teacher: { code: 'B7', title: 'Thông báo', description: 'Xem cập nhật', Icon: Bell, tone: 'blue' },
    student: { ...quickLinks.student[2], tone: 'blue' },
    parent: { code: 'D5', title: 'Thông báo', description: 'Xem cập nhật mới nhất', Icon: Bell, tone: 'blue' },
  };
  return map[roleId];
}

function heroInsight(roleId: RoleId, metrics: DashboardMetric[]) {
  if (metrics.length === 0) return 'Sẵn sàng cho ngày mới';
  const preferredKey = { admin: 'attendance', teacher: 'calendar', student: 'assignments', parent: 'notifications' }[roleId];
  const metric = metrics.find((item) => item.key === preferredKey) ?? metrics[0];
  return `${metric.label}: ${formatMetricValue(metric.value, metric.format)}`;
}

function toMetric(item: DashboardMetric): Metric {
  const tone = validTones.has(item.tone as Metric['tone']) ? item.tone as Metric['tone'] : 'blue';
  return {
    label: item.label,
    value: formatMetricValue(item.value, item.format),
    hint: item.hint,
    Icon: metricIcons[item.key] || Activity,
    tone,
  };
}

function formatMetricValue(value: number, format: string) {
  if (format === 'PERCENT') return `${formatNumber(value, 1)}%`;
  if (format === 'DECIMAL_1') return formatNumber(value, 1);
  if (format === 'CURRENCY') return `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value);
}

function formatCompact(value?: number) {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value ?? 0);
}

function formatNumber(value: number, digits: number) {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function formatDashboardTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function notificationCategoryLabel(type: string) {
  return ({
    GENERAL: 'Thông báo chung',
    HOLIDAY: 'Lịch nghỉ',
    EVENT: 'Sự kiện',
    PARENT_MEETING: 'Họp phụ huynh',
  } as Record<string, string>)[type] || viLabel(type);
}

function roleLabel(role: RoleId) {
  return { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' }[role];
}

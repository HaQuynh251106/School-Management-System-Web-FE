import {
  Activity, BarChart3, Bell, BookOpenCheck, CalendarDays, CheckCircle2,
  GraduationCap, School, ShieldCheck, Sparkles, Users, WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, DashboardChart, DashboardMetric, DashboardResponse, Notification, SchoolClass,
} from '../../api/types';
import { BarList, ChartCard, ColumnChart, MetricCard } from '../../components/charts';
import { Section, StatusPill, viLabel } from '../../components/ui';
import type { Metric, RoleId } from '../../types';
import { PaginatedData } from '../live/common';

type RoleIntro = {
  eyebrow: string;
  title: string;
  description: string;
  facts: string[];
  imageAlt: string;
  Icon: LucideIcon;
};

const roleDashboardIntros: Record<RoleId, RoleIntro> = {
  admin: {
    eyebrow: 'Trung tâm điều hành',
    title: 'Một góc nhìn, toàn bộ nhà trường',
    description: 'Theo dõi vận hành, học tập, nhân sự và tài chính bằng dữ liệu được cập nhật trực tiếp từ hệ thống.',
    facts: ['Phân quyền an toàn', 'Dữ liệu tập trung'],
    imageAlt: 'Minh hoạ quản trị viên đang theo dõi dữ liệu nhà trường',
    Icon: ShieldCheck,
  },
  teacher: {
    eyebrow: 'Không gian giáo viên',
    title: 'Tổ chức lớp học hiệu quả hơn mỗi ngày',
    description: 'Theo dõi lịch dạy, chuyên cần, điểm số và bài tập trong một không gian làm việc thống nhất.',
    facts: ['Lịch dạy rõ ràng', 'Dữ liệu lớp học trực tiếp'],
    imageAlt: 'Minh hoạ giáo viên đang hướng dẫn học sinh trong lớp',
    Icon: School,
  },
  student: {
    eyebrow: 'Hành trình học tập',
    title: 'Nắm bắt tiến độ, chủ động học tập',
    description: 'Tổng hợp thời khóa biểu, kết quả học tập, chuyên cần và nhiệm vụ cần hoàn thành.',
    facts: ['Kết quả theo học kỳ', 'Bài tập và thông báo mới'],
    imageAlt: 'Minh hoạ học sinh cùng nhau học tập',
    Icon: GraduationCap,
  },
  parent: {
    eyebrow: 'Đồng hành cùng con',
    title: 'Theo dõi việc học một cách dễ dàng',
    description: 'Cập nhật kết quả, chuyên cần, thông báo và học phí của từng học sinh được liên kết.',
    facts: ['Thông tin tập trung', 'Cập nhật từ nhà trường'],
    imageAlt: 'Minh hoạ phụ huynh theo dõi thông tin học tập trên điện thoại',
    Icon: Users,
  },
};

const metricIcons: Record<string, LucideIcon> = {
  users: Users,
  classes: School,
  attendance: CalendarDays,
  alerts: Activity,
  grades: BarChart3,
  assignments: BookOpenCheck,
  calendar: CalendarDays,
  children: Users,
  invoices: WalletCards,
  notifications: Bell,
};

const validTones = new Set<Metric['tone']>(['blue', 'green', 'orange', 'red', 'violet']);

export function GeneralDashboard({ roleId }: { roleId: RoleId }) {
  const { user } = useAuth();
  const dashboard = useApi<DashboardResponse>('/dashboard');
  const users = useApi<ApiUser[]>(roleId === 'admin' ? '/users' : null);
  const classes = useApi<SchoolClass[]>(roleId === 'admin' ? '/classes' : null);
  const notifications = useApi<Notification[]>('/notifications');
  const reloadDashboard = dashboard.reload;
  const reloadDashboardNotifications = notifications.reload;
  const intro = roleDashboardIntros[roleId];
  const IntroIcon = intro.Icon;
  const metrics = (dashboard.data?.metrics ?? []).map(toMetric);
  const nameParts = user?.fullName.trim().split(/\s+/) ?? [];
  const firstName = nameParts[nameParts.length - 1] || roleLabel(roleId);
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date());
  const error = dashboard.error || users.error || classes.error || notifications.error;
  const loading = dashboard.loading;

  useEffect(() => {
    const refreshNotificationMetrics = () => {
      reloadDashboard();
      reloadDashboardNotifications();
    };
    window.addEventListener('sse:notifications-changed', refreshNotificationMetrics);
    return () => window.removeEventListener('sse:notifications-changed', refreshNotificationMetrics);
  }, [reloadDashboard, reloadDashboardNotifications]);

  return (
    <div className={`dashboard role-dashboard role-dashboard--${roleId}`}>
      {error && <div className="error-banner">Không thể tải một phần dữ liệu: {error}</div>}

      <section className={`portal-hero portal-hero--${roleId}`}>
        <div className="portal-hero-copy">
          <span className="portal-hero-kicker"><Sparkles size={15} /> {intro.eyebrow}</span>
          <p className="portal-hero-welcome">Xin chào, {firstName}</p>
          <h2>{intro.title}</h2>
          <p>{intro.description}</p>
          <div className="portal-hero-facts">
            {intro.facts.map((fact) => <strong key={fact}><CheckCircle2 size={16} /> {fact}</strong>)}
            <strong><IntroIcon size={16} /> {today}</strong>
          </div>
        </div>
        <div className={`portal-hero-art role-art role-art--${roleId}`} role="img" aria-label={intro.imageAlt} />
      </section>

      {loading && <DashboardSkeleton />}
      {!loading && metrics.length > 0 && (
        <section className="metric-grid">
          {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </section>
      )}

      {!loading && (dashboard.data?.shortcuts?.length ?? 0) > 0 && (
        <section className="dashboard-shortcuts" aria-label="Việc cần xử lý">
          <div className="dashboard-shortcuts-head"><div><strong>Việc cần xử lý</strong><small>Số liệu theo đúng phạm vi tài khoản đang đăng nhập</small></div></div>
          <div className="dashboard-shortcut-grid">{dashboard.data!.shortcuts.map((item) => (
            <button key={item.key} data-tone={item.tone} onClick={() => window.dispatchEvent(new CustomEvent('sse:navigate', { detail: { pageId: item.pageId, filter: item.filter } }))}>
              <span>{item.count}</span><strong>{item.label}</strong>
            </button>
          ))}</div>
        </section>
      )}

      {!loading && (dashboard.data?.charts.length ?? 0) > 0 && (
        <div className="dashboard-grid">
          {dashboard.data?.charts.map((chart) => <DashboardChartCard key={chart.title} chart={chart} />)}
        </div>
      )}

      {roleId === 'admin' && (
        <AdminDashboardTables users={users.data ?? []} classes={classes.data ?? []} notifications={notifications.data ?? []} />
      )}
    </div>
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
    <>
      <div className="admin-dashboard-table-grid">
        <Section title="Tài khoản người dùng" subtitle="Dữ liệu người dùng theo từng vai trò">
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

      <Section title="Thông báo mới nhất" subtitle="Các sự kiện và cảnh báo trong hệ thống" wide>
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
    </>
  );
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

function formatNumber(value: number, digits: number) {
  return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
}

function formatDashboardTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

function roleLabel(role: RoleId) {
  return { admin: 'Quản trị viên', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' }[role];
}

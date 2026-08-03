import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, BellRing, BookOpenCheck, CalendarCheck2,
  CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3,
  GraduationCap, HeartHandshake, MessageSquareText, RefreshCw, School, ShieldCheck, Sparkles, Upload,
  UserRoundCheck, Users, WalletCards,
} from 'lucide-react';
import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useActiveChild } from '../../api/activeChild';
import { emitNotificationInboxChanged } from '../../api/liveEvents';
import { pageHash } from '../../api/routes';
import type {
  DashboardCalendarItem, DashboardChart, DashboardMetric, DashboardResponse, DashboardWorkItem,
  ExamAgendaItem, Notification, TeacherDashboardOverview, TeacherWorkspaceContext,
} from '../../api/types';
import { BarList, ChartCard, ColumnChart, MetricCard, PieChart } from '../../components/charts';
import { viLabel } from '../../components/ui';
import type { Metric, PageId, RoleId } from '../../types';

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
    description: 'Theo dõi toàn cảnh hoạt động, quản lý người dùng và xử lý các vấn đề cấp hệ thống; nghiệp vụ học vụ và tài chính đã được giao đúng bộ phận.',
    facts: ['Phân quyền đúng trách nhiệm', 'Dữ liệu PostgreSQL đồng bộ'],
    imageAlt: 'Quản trị viên theo dõi dữ liệu vận hành nhà trường',
    Icon: ShieldCheck,
  },
  academic_staff: {
    eyebrow: 'Trung tâm điều hành học vụ',
    title: 'Tổ chức đào tạo chủ động và nhất quán',
    description: 'Quản lý cơ cấu đào tạo, phân công, thời khóa biểu và kỳ thi trong một không gian chuyên trách.',
    facts: ['Tập trung nghiệp vụ giáo vụ', 'Theo dõi tiến độ theo năm học'],
    imageAlt: 'Nhân viên giáo vụ điều phối hoạt động đào tạo',
    Icon: School,
  },
  accountant: {
    eyebrow: 'Trung tâm tài chính nhà trường',
    title: 'Kiểm soát khoản thu và công nợ rõ ràng',
    description: 'Theo dõi đợt thu, hóa đơn, giao dịch và tiến độ công nợ theo khối lớp với dữ liệu tập trung.',
    facts: ['Đối soát minh bạch', 'Theo dõi công nợ theo lớp'],
    imageAlt: 'Nhân viên kế toán theo dõi tài chính nhà trường',
    Icon: WalletCards,
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
    { code: 'A1S', title: 'Quản lý học sinh', description: 'Hồ sơ và tài khoản học sinh', Icon: GraduationCap },
    { code: 'A1O', title: 'Nhân sự vận hành', description: 'Tài khoản Giáo vụ và Kế toán', Icon: Users },
    { code: 'A8', title: 'Báo cáo điều hành', description: 'Giám sát hoạt động toàn trường', Icon: BarChart3 },
    { code: 'A9', title: 'Gửi thông báo', description: 'Kết nối toàn trường', Icon: Bell },
  ],
  academic_staff: [
    { code: 'E1', title: 'Cơ cấu đào tạo', description: 'Năm học, lớp, môn và phòng', Icon: School },
    { code: 'E2', title: 'Xếp thời khóa biểu', description: 'Phân công và tối ưu lịch học', Icon: CalendarDays },
    { code: 'E3', title: 'Tạo kỳ thi', description: 'Lịch thi, phòng và phân công', Icon: CalendarCheck2 },
  ],
  accountant: [
    { code: 'F1', title: 'Tổng quan tài chính', description: 'Theo dõi thu và công nợ', Icon: WalletCards },
    { code: 'F1', title: 'Quản lý đợt thu', description: 'Tạo, mở và phát hành khoản thu', Icon: CalendarCheck2 },
    { code: 'F1', title: 'Công nợ theo lớp', description: 'Lọc và nhắc các khoản còn thiếu', Icon: BarChart3 },
    { code: 'F1', title: 'Giao dịch', description: 'Đối soát trạng thái thanh toán', Icon: CheckCircle2 },
  ],
  teacher: [
    { code: 'B2', title: 'Lịch dạy', description: 'Xem thời khóa biểu tuần', Icon: CalendarDays },
    { code: 'B3', title: 'Điểm danh', description: 'Ghi nhận theo tiết học', Icon: ClipboardCheck },
    { code: 'B4', title: 'Bảng điểm', description: 'Cập nhật kết quả học tập', Icon: BarChart3 },
    { code: 'B5', title: 'Giao bài tập', description: 'Tạo và chấm bài', Icon: BookOpenCheck },
    { code: 'B16', title: 'Hỗ trợ học sinh', description: 'Ghi nhận và theo dõi can thiệp', Icon: HeartHandshake },
    { code: 'B12', title: 'Lịch thi & nhiệm vụ', description: 'Coi thi và nhập điểm', Icon: CalendarCheck2 },
  ],
  student: [
    { code: 'C2', title: 'Kết quả học tập', description: 'Điểm và thời khóa biểu', Icon: BarChart3 },
    { code: 'C4', title: 'Bài tập', description: 'Xem và nộp bài', Icon: Upload },
    { code: 'C5', title: 'Thông báo', description: 'Cập nhật mới nhất', Icon: Bell },
    { code: 'C7', title: 'Trao đổi', description: 'Nhắn tin giáo viên', Icon: MessageSquareText },
    { code: 'C10', title: 'Lịch thi', description: 'Phòng, SBD và chỗ ngồi', Icon: CalendarCheck2 },
  ],
  parent: [
    { code: 'D1', title: 'Chọn học sinh', description: 'Đổi hồ sơ đang theo dõi', Icon: Users },
    { code: 'D2', title: 'Tình hình học tập', description: 'Điểm và chuyên cần', Icon: BarChart3 },
    { code: 'D3', title: 'Liên lạc giáo viên', description: 'Trao đổi với giáo viên', Icon: MessageSquareText },
    { code: 'D4', title: 'Khoản thu', description: 'Hóa đơn và thanh toán', Icon: WalletCards },
    { code: 'D5', title: 'Thông báo', description: 'Cập nhật từ nhà trường', Icon: Bell },
    { code: 'D9', title: 'Lịch thi của con', description: 'Lịch, phòng và SBD', Icon: CalendarCheck2 },
  ],
};

const metricIcons: Record<string, LucideIcon> = {
  users: Users, classes: School, attendance: CalendarDays, alerts: Activity, grades: BarChart3,
  assignments: BookOpenCheck, calendar: CalendarDays, children: Users, invoices: WalletCards,
  notifications: Bell, payments: WalletCards, overdue: Activity, students: GraduationCap,
  teachers: UserRoundCheck, tasks: AlertTriangle,
};

const validTones = new Set<Metric['tone']>(['blue', 'green', 'orange', 'red', 'violet']);

export function GeneralDashboard({ roleId, onNavigate }: { roleId: RoleId; onNavigate?: (page: PageId) => void }) {
  const { user } = useAuth();
  const { childId } = useActiveChild();
  const dashboard = useApi<DashboardResponse>(roleId === 'parent' && childId
    ? `/dashboard?childId=${encodeURIComponent(childId)}` : '/dashboard');
  const notifications = useApi<Notification[]>(['teacher', 'student', 'parent'].includes(roleId) ? '/notifications' : null);
  const examAgendaEnabled = ['teacher', 'student', 'parent'].includes(roleId);
  const examAgenda = useApi<ExamAgendaItem[]>(examAgendaEnabled ? '/me/exam-agenda' : null);
  const teacherWorkspace = useApi<TeacherWorkspaceContext>(roleId === 'teacher' ? '/me/teacher-workspace' : null);
  const [markingNotificationId, setMarkingNotificationId] = useState<string | null>(null);
  const intro = roleDashboardIntros[roleId];
  const IntroIcon = intro.Icon;
  const metrics = (dashboard.data?.metrics ?? []).map(toMetric);
  const nameParts = user?.fullName.trim().split(/\s+/) ?? [];
  const firstName = nameParts[nameParts.length - 1] || roleLabel(roleId);
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }).format(new Date());
  const hasError = Boolean(dashboard.error || notifications.error || examAgenda.error || teacherWorkspace.error);
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
    notifications.reload();
    examAgenda.reload();
    teacherWorkspace.reload();
  };
  const markNotificationRead = async (id: string) => {
    setMarkingNotificationId(id);
    try {
      await api.post(`/notifications/${id}/read`);
      notifications.setData((current) => current?.map((item) => item.id === id ? { ...item, read: true } : item) ?? current);
      emitNotificationInboxChanged();
      notifications.reload();
      dashboard.reload();
    } finally {
      setMarkingNotificationId(null);
    }
  };

  if (roleId === 'admin') {
    return (
      <AdminCommandDashboard
        firstName={firstName}
        today={today}
        data={dashboard.data}
        loading={loading}
        hasError={hasError}
        onReload={reloadAll}
        onNavigate={navigate}
      />
    );
  }

  if (roleId === 'academic_staff' || roleId === 'accountant' || roleId === 'teacher') {
    return (
      <OperationalRoleDashboard
        roleId={roleId}
        firstName={firstName}
        today={today}
        data={dashboard.data}
        loading={loading}
        hasError={hasError}
        notifications={teacherAnnouncements}
        notificationsLoading={notifications.loading}
        markingNotificationId={markingNotificationId}
        examAgenda={examAgenda.data ?? []}
        examAgendaLoading={examAgenda.loading}
        teacherWorkspace={teacherWorkspace.data}
        onMarkNotificationRead={markNotificationRead}
        onReload={reloadAll}
        onNavigate={navigate}
      />
    );
  }

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
        <div className={`portal-hero-art role-art role-art--${roleId}`} role="img" aria-label={intro.imageAlt}>
          <div className="dashboard-art-status">
            <span><Activity size={14} /> Cập nhật trực tiếp</span>
            <strong>{loading ? 'Đang đồng bộ…' : heroInsight(roleId, dashboard.data?.metrics ?? [])}</strong>
          </div>
        </div>
      </section>

      {examAgendaEnabled && (
        <ExamAgendaSpotlight roleId={roleId} items={examAgenda.data ?? []} loading={examAgenda.loading} onOpen={() => navigate(examPage(roleId))} />
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

    </div>
  );
}

type OperationalRole = 'academic_staff' | 'accountant' | 'teacher';

const operationalDashboardConfig: Record<OperationalRole, {
  eyebrow: string;
  title: string;
  description: string;
  calendarTitle: string;
  calendarDescription: string;
  workTitle: string;
  workDescription: string;
  Icon: LucideIcon;
}> = {
  academic_staff: {
    eyebrow: 'TRUNG TÂM ĐIỀU PHỐI HỌC VỤ',
    title: 'Tổ chức năm học chủ động, đúng tiến độ',
    description: 'Nắm nhanh tình trạng phân lớp, chủ nhiệm, thời khóa biểu và kỳ thi trong một bảng điều hành thống nhất.',
    calendarTitle: 'Lịch vận hành học vụ',
    calendarDescription: 'Mốc học kỳ, kỳ thi và ngày nghỉ được đồng bộ theo kế hoạch năm học.',
    workTitle: 'Nghiệp vụ cần hoàn tất',
    workDescription: 'Sắp xếp theo mức độ ảnh hưởng đến tiến độ đào tạo.',
    Icon: School,
  },
  accountant: {
    eyebrow: 'BẢNG ĐIỀU HÀNH TÀI CHÍNH',
    title: 'Kiểm soát dòng tiền và công nợ rõ ràng',
    description: 'Theo dõi tổng phải thu, tiến độ thu tiền, hóa đơn quá hạn và các mốc cần nhắc trong cùng một màn hình.',
    calendarTitle: 'Lịch khoản thu',
    calendarDescription: 'Các hạn thanh toán đã phát hành được tổng hợp tự động theo tháng.',
    workTitle: 'Công việc cần đối soát',
    workDescription: 'Ưu tiên khoản quá hạn, giao dịch chờ và đợt thu chưa phát hành.',
    Icon: WalletCards,
  },
  teacher: {
    eyebrow: 'KHÔNG GIAN LÀM VIỆC GIÁO VIÊN',
    title: 'Đúng lịch dạy, đúng việc cần làm hôm nay',
    description: 'Lịch dạy, điểm danh, bài chờ chấm và thông báo quan trọng được đưa về một nhịp làm việc rõ ràng.',
    calendarTitle: 'Lịch dạy và hạn công việc',
    calendarDescription: 'Tiết dạy cùng hạn bài tập được hiển thị trực tiếp trên lịch tháng.',
    workTitle: 'Việc ưu tiên trong ngày',
    workDescription: 'Tập trung các tác vụ ảnh hưởng trực tiếp đến học sinh và lớp phụ trách.',
    Icon: ClipboardCheck,
  },
};

function OperationalRoleDashboard({
  roleId, firstName, today, data, loading, hasError, notifications, notificationsLoading,
  markingNotificationId, examAgenda, examAgendaLoading, onMarkNotificationRead, onReload, onNavigate,
  teacherWorkspace,
}: {
  roleId: OperationalRole;
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  loading: boolean;
  hasError: boolean;
  notifications: Notification[];
  notificationsLoading: boolean;
  markingNotificationId: string | null;
  examAgenda: ExamAgendaItem[];
  examAgendaLoading: boolean;
  teacherWorkspace?: TeacherWorkspaceContext | null;
  onMarkNotificationRead: (id: string) => Promise<void>;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const config = operationalDashboardConfig[roleId];
  const overview = data?.roleOverview;
  const metrics = (data?.metrics ?? []).slice(0, 4).map(toMetric);
  const links = (roleId === 'teacher' ? teacherDashboardLinks(teacherWorkspace) : quickLinks[roleId]).slice(0, 3);
  const workItems = (overview?.workItems ?? []).slice(0, 4);
  const openItems = workItems.filter((item) => item.severity !== 'SUCCESS');
  const HeroIcon = config.Icon;

  return (
    <div className={`dashboard role-command-dashboard role-command-dashboard--${roleId}`}>
      {hasError && (
        <div className="dashboard-data-notice" role="alert">
          <Activity size={18} />
          <div><strong>Chưa thể đồng bộ đầy đủ dữ liệu</strong><span>Hãy tải lại để kiểm tra các chỉ số trong phạm vi phụ trách.</span></div>
          <button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button>
        </div>
      )}

      <section className="role-command-header">
        <div className="role-command-heading">
          <span><HeroIcon size={15} /> {config.eyebrow}</span>
          <p>Xin chào {firstName}</p>
          <h2>{config.title}</h2>
          <div>{config.description}</div>
        </div>
        <div className="role-command-context">
          <div><small>Năm học</small><strong>{overview?.academicYear || 'Chưa thiết lập'}</strong><span>{statusLabel(overview?.academicYearStatus)}</span></div>
          <div><small>Học kỳ</small><strong>{overview?.semester || 'Chưa thiết lập'}</strong><span>{statusLabel(overview?.semesterStatus)}</span></div>
          <button type="button" onClick={onReload} disabled={loading}><RefreshCw size={17} className={loading ? 'is-spinning' : ''} /><span>Cập nhật</span></button>
        </div>
        <small className="role-command-today"><CalendarDays size={14} /> {today}</small>
      </section>

      {loading ? <DashboardSkeleton /> : (
        <section className="role-command-kpis" aria-label="Chỉ số công việc trọng yếu">
          {metrics.map((metric, index) => {
            const Icon = metric.Icon;
            return <article key={metric.label} className={`role-command-kpi tone-${metric.tone}`}>
              <header><span><Icon size={19} /></span><small>0{index + 1}</small></header>
              <strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.hint}</p>
            </article>;
          })}
        </section>
      )}

      {roleId === 'teacher' && (
        <TeacherTodayWorkspace
          overview={data?.teacherOverview}
          loading={loading}
          onNavigate={onNavigate}
        />
      )}

      <section className="role-command-workspace">
        <article className="role-command-worklist">
          <header><div><span>CẦN XỬ LÝ</span><h3>{config.workTitle}</h3><p>{config.workDescription}</p></div><strong className={openItems.length ? 'has-work' : 'is-clear'}>{openItems.length} nhóm việc</strong></header>
          <div>{loading ? <AdminListSkeleton /> : workItems.map((item) => <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />)}</div>
        </article>
        <aside className="role-command-shortcuts">
          <header><span>TRUY CẬP NHANH</span><h3>Công cụ thường dùng</h3></header>
          <div>{links.map(({ code, title, description, Icon }) => <button type="button" key={`${code}-${title}`} onClick={() => onNavigate(code)}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{description}</small></div><ArrowRight size={15} /></button>)}</div>
        </aside>
      </section>

      <AdminCalendarWidget
        items={overview?.calendarItems ?? []}
        loading={loading}
        onNavigate={onNavigate}
        eyebrow="LỊCH CÔNG VIỆC"
        title={config.calendarTitle}
        description={config.calendarDescription}
      />

      {roleId === 'teacher' && <TeacherAnnouncementSpotlight items={notifications} loading={notificationsLoading} markingId={markingNotificationId} onMarkRead={onMarkNotificationRead} onOpenInbox={() => onNavigate('B7')} />}
      {roleId === 'teacher' && <ExamAgendaSpotlight roleId="teacher" items={examAgenda} loading={examAgendaLoading} onOpen={() => onNavigate('B12')} />}

      {!loading && (data?.charts.length ?? 0) > 0 && <section className="role-command-insights">
        <header><div><span>PHÂN TÍCH THEO PHẠM VI</span><h3>{roleId === 'accountant' ? 'Tình hình thu và công nợ' : roleId === 'teacher' ? 'Nhịp giảng dạy của tôi' : 'Tiến độ tổ chức đào tạo'}</h3></div><small>Dữ liệu được tổng hợp tự động</small></header>
        <div>{data?.charts.slice(0, 2).map((chart) => <DashboardChartCard key={chart.title} chart={chart} />)}</div>
      </section>}
    </div>
  );
}

function teacherDashboardLinks(workspace?: TeacherWorkspaceContext | null): DashboardLink[] {
  const links = quickLinks.teacher.filter((item) => item.code !== 'B12' || workspace?.examResponsibilities);
  if (workspace?.loadRegistrationVisible) {
    links.push({ code: 'B14', title: 'Đăng ký tải dạy', description: workspace.loadRegistrationOpen ? 'Theo dõi kỳ đăng ký hiện tại' : 'Xem kế hoạch tải dạy', Icon: Clock3 });
  }
  if (workspace?.homeroomTeacher) {
    links.push({ code: 'B9', title: 'Duyệt đơn nghỉ', description: 'Xử lý yêu cầu của lớp chủ nhiệm', Icon: CalendarCheck2 });
    links.push({ code: 'B13', title: 'Học bạ lớp chủ nhiệm', description: 'Theo dõi và xác nhận hồ sơ', Icon: GraduationCap });
  }
  return links;
}

function TeacherTodayWorkspace({ overview, loading, onNavigate }: {
  overview?: TeacherDashboardOverview | null;
  loading: boolean;
  onNavigate: (page: PageId) => void;
}) {
  const lessons = overview?.todayLessons ?? [];
  const students = overview?.attentionStudents ?? [];
  const nextLesson = lessons.find((item) => item.status === 'IN_PROGRESS')
    ?? lessons.find((item) => item.status === 'UPCOMING');
  return (
    <section className="teacher-today-workspace" aria-label="Trung tâm công việc hôm nay">
      <article className="teacher-today-lessons">
        <header>
          <div><span>NHỊP DẠY HÔM NAY</span><h3>Tiết dạy và điểm danh</h3><p>Trạng thái được đồng bộ theo từng tiết, không cần dò lại thời khóa biểu.</p></div>
          <strong>{lessons.length} tiết</strong>
        </header>
        {loading ? <AdminListSkeleton /> : lessons.length === 0 ? (
          <div className="teacher-today-empty"><CalendarCheck2 size={22} /><div><strong>Hôm nay không có tiết dạy</strong><small>Bạn có thể chuẩn bị bài hoặc xử lý các công việc còn tồn.</small></div></div>
        ) : (
          <div className="teacher-lesson-list">
            {lessons.map((lesson) => {
              const active = lesson.slotId === nextLesson?.slotId;
              return <button type="button" key={lesson.slotId} className={`${active ? 'is-next' : ''} is-${lesson.status.toLowerCase()}`} onClick={() => onNavigate(lesson.attendanceRecorded ? 'B2' : 'B3')}>
                <time><strong>{lesson.startTime || `Tiết ${lesson.periodNo}`}</strong><span>{lesson.endTime || `Tiết ${lesson.periodNo}`}</span></time>
                <div><small>{active ? lesson.status === 'IN_PROGRESS' ? 'ĐANG DIỄN RA' : 'TIẾT TIẾP THEO' : `TIẾT ${lesson.periodNo}`}</small><strong>{lesson.subjectName} · {lesson.classCode}</strong><span>{lesson.roomCode ? `Phòng ${lesson.roomCode}` : 'Chưa xếp phòng'}</span></div>
                <b className={lesson.attendanceRecorded ? 'is-done' : 'is-pending'}>{lesson.attendanceRecorded ? 'Đã điểm danh' : 'Chưa điểm danh'}</b>
                <ArrowRight size={15} />
              </button>;
            })}
          </div>
        )}
      </article>

      <article className="teacher-attention-students">
        <header>
          <div><span>CẦN QUAN TÂM</span><h3>Học sinh cần hỗ trợ</h3><p>Tổng hợp từ chuyên cần, bài quá hạn và điểm thuộc đúng phạm vi phụ trách.</p></div>
          <strong className={students.length ? 'has-alert' : 'is-clear'}>{students.length}</strong>
        </header>
        {loading ? <AdminListSkeleton /> : students.length === 0 ? (
          <div className="teacher-today-empty is-safe"><CheckCircle2 size={22} /><div><strong>Chưa có cảnh báo nổi bật</strong><small>Không phát hiện trường hợp cần ưu tiên trong dữ liệu hiện tại.</small></div></div>
        ) : (
          <div className="teacher-attention-list">
            {students.map((student) => <button type="button" key={student.studentId} onClick={() => {
              window.location.hash = pageHash('teacher', 'B16', new URLSearchParams({ class: student.classId, student: student.studentId }));
            }}>
              <span className={student.severity === 'CRITICAL' ? 'is-critical' : 'is-warning'}>{student.studentName.trim().charAt(0)}</span>
              <div><small>{student.classCode} · {student.studentCode}</small><strong>{student.studentName}</strong><p>{student.reason}</p></div>
              <ArrowRight size={15} />
            </button>)}
          </div>
        )}
      </article>
    </section>
  );
}

function AdminCommandDashboard({ firstName, today, data, loading, hasError, onReload, onNavigate }: {
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  loading: boolean;
  hasError: boolean;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const overview = data?.adminOverview;
  const metrics = (data?.metrics ?? []).map(toMetric);
  const workItems = (overview?.workItems ?? []).slice(0, 4);
  const openWorkItems = workItems.filter((item) => item.severity !== 'SUCCESS');
  const attendanceRate = overview && overview.attendanceRecorded > 0
    ? (overview.present / overview.attendanceRecorded) * 100 : null;

  return (
    <div className="dashboard admin-command-dashboard">
      {hasError && (
        <div className="dashboard-data-notice" role="alert">
          <Activity size={18} />
          <div><strong>Chưa thể đồng bộ đầy đủ dữ liệu điều hành</strong><span>Nhấn tải lại để kiểm tra kết nối với hệ thống.</span></div>
          <button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button>
        </div>
      )}

      <section className="admin-command-header">
        <div className="admin-command-heading">
          <span><ShieldCheck size={15} /> Trung tâm điều hành</span>
          <h2>Chào {firstName}, đây là tình hình nhà trường hôm nay</h2>
          <p>{today}. Các chỉ số bên dưới được tổng hợp theo đúng phạm vi quản trị và trách nhiệm của từng bộ phận.</p>
        </div>
        <div className="admin-command-context">
          <div>
            <small>Năm học hiện tại</small>
            <strong>{overview?.academicYear || 'Chưa thiết lập'}</strong>
            <span className={statusClass(overview?.academicYearStatus)}>{statusLabel(overview?.academicYearStatus)}</span>
          </div>
          <div>
            <small>Học kỳ</small>
            <strong>{overview?.semester || 'Chưa thiết lập'}</strong>
            <span className={statusClass(overview?.semesterStatus)}>{statusLabel(overview?.semesterStatus)}</span>
          </div>
          <button type="button" onClick={onReload} disabled={loading} title="Cập nhật dữ liệu Dashboard">
            <RefreshCw size={17} className={loading ? 'is-spinning' : ''} />
            <span>{loading ? 'Đang cập nhật' : 'Cập nhật'}</span>
          </button>
        </div>
      </section>

      {loading ? <DashboardSkeleton /> : (
        <section className="admin-command-kpis" aria-label="Chỉ số điều hành trọng yếu">
          {metrics.map((metric, index) => {
            const Icon = metric.Icon;
            return (
              <article key={metric.label} className={`admin-command-kpi tone-${metric.tone}`}>
                <div className="admin-command-kpi-top"><span><Icon size={20} /></span><small>0{index + 1}</small></div>
                <strong>{metric.value}</strong>
                <h3>{metric.label}</h3>
                <p>{metric.hint}</p>
              </article>
            );
          })}
        </section>
      )}

      <AdminCalendarWidget
        items={overview?.calendarItems ?? []}
        loading={loading}
        onNavigate={onNavigate}
      />

      <section className="admin-command-core">
        <article className="admin-command-priorities">
          <header>
            <div><span>CẦN QUYẾT ĐỊNH</span><h3>Việc cần xử lý</h3><p>Chỉ hiển thị những việc còn tồn đọng và có người phụ trách rõ ràng.</p></div>
            <strong className={openWorkItems.length > 0 ? 'has-work' : 'is-clear'}>{openWorkItems.length} nhóm việc</strong>
          </header>
          <div className="admin-command-work-list">
            {loading ? <AdminListSkeleton /> : workItems.map((item) => (
              <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />
            ))}
          </div>
        </article>

        <aside className="admin-command-today">
          <header><div><span>HÔM NAY</span><h3>Tình hình chuyên cần</h3></div><CalendarCheck2 size={20} /></header>
          <div className="admin-attendance-score">
            <strong>{attendanceRate == null ? '—' : `${formatNumber(attendanceRate, 1)}%`}</strong>
            <span>{overview?.attendanceRecorded ?? 0} lượt đã ghi nhận</span>
          </div>
          <div className="admin-progress-track" aria-label="Tỷ lệ học sinh có mặt">
            <i style={{ width: `${Math.min(100, attendanceRate ?? 0)}%` }} />
          </div>
          <dl className="admin-attendance-breakdown">
            <div><dt>Có mặt</dt><dd>{formatCompact(overview?.present)}</dd></div>
            <div><dt>Vắng có phép</dt><dd>{formatCompact(overview?.excusedAbsences)}</dd></div>
            <div><dt>Vắng không phép</dt><dd>{formatCompact(overview?.unexcusedAbsences)}</dd></div>
            <div><dt>Đi muộn</dt><dd>{formatCompact(overview?.late)}</dd></div>
          </dl>
          <button type="button" onClick={() => onNavigate('A8')}>Mở báo cáo chuyên cần <ArrowRight size={15} /></button>
        </aside>
      </section>

      {!loading && (data?.charts.length ?? 0) > 0 && (
        <section className="admin-command-analysis">
          <div className="admin-command-section-heading">
            <div><span>PHÂN TÍCH CƠ CẤU</span><h3>Dữ liệu cần quan sát định kỳ</h3></div>
            <button type="button" onClick={() => onNavigate('A8')}>Xem báo cáo đầy đủ <ArrowRight size={15} /></button>
          </div>
          <div className="dashboard-grid">
            {data?.charts.map((chart) => <DashboardChartCard key={chart.title} chart={chart} />)}
          </div>
        </section>
      )}

    </div>
  );
}

function AdminCalendarWidget({ items, loading, onNavigate, eyebrow = 'LỊCH ĐIỀU HÀNH', title = 'Kế hoạch trong tháng', description = 'Kỳ thi, học kỳ, hạn khoản thu và lịch nghỉ được đồng bộ tự động.' }: {
  items: DashboardCalendarItem[];
  loading: boolean;
  onNavigate: (page: PageId) => void;
  eyebrow?: string;
  title?: string;
  description?: string;
}) {
  const now = new Date();
  const [visibleMonth, setVisibleMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(now));
  const days = calendarDays(visibleMonth);
  const selectedItems = items.filter((item) => item.date === selectedDate);
  const monthItems = items.filter((item) => {
    const date = parseLocalDate(item.date);
    return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth();
  });
  const agendaItems = selectedItems.length > 0 ? selectedItems : monthItems.slice(0, 5);
  const legendTypes = Array.from(new Set(items.map((item) => item.type))).slice(0, 5);
  const selectedLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(parseLocalDate(selectedDate));

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  };

  return (
    <section className="admin-calendar-widget">
      <header className="admin-calendar-header">
        <div className="admin-calendar-title">
          <span><CalendarDays size={20} /></span>
          <div><small>{eyebrow}</small><h3>{title}</h3><p>{description}</p></div>
        </div>
        <div className="admin-calendar-toolbar">
          <div className="admin-calendar-legend">
            {legendTypes.map((type) => <span key={type} className={type.toLowerCase()}>{calendarEventLabel(type)}</span>)}
          </div>
          <div className="admin-calendar-navigation">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Tháng trước"><ChevronLeft size={17} /></button>
            <strong>{new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(visibleMonth)}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Tháng sau"><ChevronRight size={17} /></button>
          </div>
        </div>
      </header>

      <div className="admin-calendar-layout">
        <div className="admin-calendar-board" aria-label={`Lịch ${new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(visibleMonth)}`}>
          <div className="admin-calendar-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="admin-calendar-grid">
            {days.map((date) => {
              const dateKey = localDateKey(date);
              const dayItems = items.filter((item) => item.date === dateKey);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isToday = dateKey === localDateKey(now);
              return (
                <button
                  type="button"
                  key={dateKey}
                  className={`${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${selectedDate === dateKey ? 'selected' : ''}`.trim()}
                  onClick={() => setSelectedDate(dateKey)}
                  aria-label={`${date.toLocaleDateString('vi-VN')}${dayItems.length ? `, ${dayItems.length} sự kiện` : ''}`}
                >
                  <span>{date.getDate()}</span>
                  <i>{dayItems.slice(0, 3).map((item) => <b key={item.id} className={item.type.toLowerCase()} />)}</i>
                </button>
              );
            })}
          </div>
        </div>

        <aside className="admin-calendar-agenda">
          <div><small>{selectedItems.length > 0 ? 'SỰ KIỆN ĐÃ CHỌN' : 'SỰ KIỆN TRONG THÁNG'}</small><h4>{selectedItems.length > 0 ? capitalize(selectedLabel) : `${monthItems.length} lịch cần lưu ý`}</h4></div>
          {loading ? <AdminListSkeleton /> : agendaItems.length === 0 ? (
            <div className="admin-calendar-empty"><CheckCircle2 size={22} /><strong>Tháng này chưa có lịch quan trọng</strong><span>Các mốc mới sẽ tự động xuất hiện sau khi được tạo.</span></div>
          ) : (
            <div className="admin-calendar-agenda-list">
              {agendaItems.map((item) => {
                const Icon = calendarEventIcon(item.type);
                return <button type="button" key={item.id} className={`event-${item.type.toLowerCase()}`} onClick={() => onNavigate(item.pageCode)}>
                  <time><strong>{parseLocalDate(item.date).getDate()}</strong><span>Thg {parseLocalDate(item.date).getMonth() + 1}</span></time>
                  <span><Icon size={17} /></span>
                  <div><small>{calendarEventLabel(item.type)}</small><strong>{item.title}</strong><p>{item.detail || 'Xem thông tin chi tiết'}</p></div>
                  <ArrowRight size={15} />
                </button>;
              })}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function AdminWorkItemRow({ item, onNavigate }: { item: DashboardWorkItem; onNavigate: (page: PageId) => void }) {
  const Icon = item.severity === 'SUCCESS' ? CheckCircle2 : item.severity === 'CRITICAL' ? AlertTriangle : Activity;
  return (
    <button type="button" className={`admin-work-item severity-${item.severity.toLowerCase()}`} onClick={() => onNavigate(item.pageCode)}>
      <span><Icon size={18} /></span>
      <div><strong>{item.title}</strong><small>{item.detail}</small></div>
      {item.value > 0 && <b>{formatCompact(item.value)} <small>{item.unit}</small></b>}
      <ArrowRight size={16} />
    </button>
  );
}

function AdminListSkeleton() {
  return <div className="admin-command-list-skeleton" aria-label="Đang tải danh sách"><i /><i /><i /></div>;
}

function statusLabel(status?: string) {
  return ({ ACTIVE: 'Đang hoạt động', PLANNED: 'Sắp diễn ra', COMPLETED: 'Đã kết thúc' } as Record<string, string>)[status || ''] || 'Chưa xác định';
}

function statusClass(status?: string) {
  return status === 'ACTIVE' ? 'is-active' : 'is-neutral';
}

function calendarDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(first.getFullYear(), first.getMonth(), 1 - mondayOffset);
  return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function calendarEventLabel(type: string) {
  return ({
    EXAM: 'Kỳ thi', FEE: 'Hạn khoản thu', SEMESTER: 'Mốc học kỳ', HOLIDAY: 'Lịch nghỉ',
    LESSON: 'Tiết dạy', ASSIGNMENT: 'Hạn bài tập',
  } as Record<string, string>)[type] || 'Sự kiện';
}

function calendarEventIcon(type: string): LucideIcon {
  return ({
    EXAM: CalendarCheck2, FEE: WalletCards, SEMESTER: School, HOLIDAY: Bell,
    LESSON: Clock3, ASSIGNMENT: BookOpenCheck,
  } as Record<string, LucideIcon>)[type] || CalendarDays;
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function ExamAgendaSpotlight({ roleId, items, loading, onOpen }: {
  roleId: RoleId; items: ExamAgendaItem[]; loading: boolean; onOpen: () => void;
}) {
  const active = items.filter((item) => !['COMPLETED', 'LOCKED'].includes(item.status)).slice(0, 3);
  if (!loading && active.length === 0) return null;
  return <section className="dashboard-exam-spotlight">
    <header><div><span><CalendarCheck2 size={19} /></span><div><small>Lịch khảo thí chính thức</small><h3>{roleId === 'teacher' ? 'Nhiệm vụ sắp tới' : roleId === 'parent' ? 'Lịch thi sắp tới của con' : 'Lịch thi sắp tới'}</h3></div></div><button type="button" onClick={onOpen}>Xem toàn bộ <ArrowRight size={15} /></button></header>
    {loading ? <div className="dashboard-exam-loading"><i /><i /><i /></div> : <div className="dashboard-exam-items">{active.map((item) => <article key={item.id}>
      <time><strong>{new Date(`${item.examDate}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit' })}</strong><span>thg {new Date(`${item.examDate}T00:00:00`).toLocaleDateString('vi-VN', { month: '2-digit' })}</span></time>
      <div><small>{item.taskLabel} · {item.examPeriodName}</small><strong>{item.subjectName}</strong><span>{item.startTime} · {item.roomCode ? `Phòng ${item.roomCode}` : item.classCode ? `Lớp ${item.classCode}` : 'Xem chi tiết'}</span></div>
      {item.status === 'TODAY' && <b>Hôm nay</b>}
    </article>)}</div>}
  </section>;
}

function examPage(roleId: RoleId): PageId {
  return ({ teacher: 'B12', student: 'C10', parent: 'D9', admin: 'A4', academic_staff: 'E3', accountant: 'dashboard' } as Record<RoleId, PageId>)[roleId];
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
      ) : chart.type === 'PIE' ? (
        <PieChart data={chart.data} suffix={chart.suffix} />
      ) : chart.type === 'COLUMN' ? (
        <ColumnChart data={chart.data} max={max} suffix={chart.suffix} />
      ) : (
        <BarList data={chart.data} max={max} suffix={chart.suffix} />
      )}
    </ChartCard>
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
      { ...links[1], title: 'Quản lý nhân sự vận hành', description: 'Cấp tài khoản cho Giáo vụ và Kế toán', tone: 'blue' },
      { ...links[3], title: 'Cập nhật thông tin toàn trường', description: 'Gửi lịch sự kiện và thông báo chung', tone: 'violet' },
    ],
    academic_staff: [
      { ...links[0], title: 'Kiểm tra cơ cấu năm học', description: 'Rà soát lớp, môn học và phòng học đang hoạt động', tone: 'blue' },
      { ...links[1], title: 'Hoàn thiện thời khóa biểu', description: 'Xử lý phân công và các tiết còn xung đột', tone: 'green' },
      { ...links[2], title: 'Chuẩn bị kỳ thi', description: 'Thiết lập lịch, phòng và nhiệm vụ khảo thí', tone: 'violet' },
    ],
    accountant: [
      { ...links[0], title: 'Theo dõi tổng thu và công nợ', description: 'Nắm nhanh tiến độ tài chính toàn trường', tone: 'blue' },
      { ...links[2], title: 'Rà soát lớp còn công nợ', description: 'Lọc các khoản chưa hoàn tất để nhắc hạn', tone: 'orange' },
      { ...links[3], title: 'Đối soát giao dịch', description: 'Kiểm tra các khoản thanh toán mới nhất', tone: 'green' },
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
    academic_staff: { ...quickLinks.academic_staff[0], tone: 'blue' },
    accountant: { ...quickLinks.accountant[0], tone: 'blue' },
    teacher: { code: 'B7', title: 'Thông báo', description: 'Xem cập nhật', Icon: Bell, tone: 'blue' },
    student: { ...quickLinks.student[2], tone: 'blue' },
    parent: { code: 'D5', title: 'Thông báo', description: 'Xem cập nhật mới nhất', Icon: Bell, tone: 'blue' },
  };
  return map[roleId];
}

function heroInsight(roleId: RoleId, metrics: DashboardMetric[]) {
  if (metrics.length === 0) return 'Sẵn sàng cho ngày mới';
  const preferredKey = { admin: 'attendance', academic_staff: 'calendar', accountant: 'invoices', teacher: 'calendar', student: 'assignments', parent: 'notifications' }[roleId];
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
  if (format === 'PERCENT_OR_EMPTY') return 'Chưa có dữ liệu';
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
    ATTENDANCE_REMINDER: 'Nhắc điểm danh',
    ATTENDANCE_MISSED: 'Quên điểm danh',
    GENERAL: 'Thông báo chung',
    HOLIDAY: 'Lịch nghỉ',
    EVENT: 'Sự kiện',
    PARENT_MEETING: 'Họp phụ huynh',
  } as Record<string, string>)[type] || viLabel(type);
}

function roleLabel(role: RoleId) {
  return { admin: 'Quản trị viên', academic_staff: 'Giáo vụ', accountant: 'Kế toán', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' }[role];
}

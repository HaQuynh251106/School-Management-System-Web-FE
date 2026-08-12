import {
  Activity, AlertTriangle, ArrowRight, BarChart3, Bell, BookOpenCheck, CalendarCheck2,
  CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, ClipboardCheck, Clock3,
  Database, GraduationCap, HeartHandshake, KeyRound, MessageSquareText, RefreshCw, School, Server, ShieldCheck, Sparkles, Upload,
  UserRoundCheck, Users, WalletCards, ListChecks,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import { useActiveChild } from '../../api/activeChild';
import { pageHash } from '../../api/routes';
import { NOTIFICATION_INBOX_CHANGED } from '../../api/liveEvents';
import type {
  DashboardCalendarItem, DashboardChart, DashboardMetric, DashboardResponse, DashboardWorkItem,
  ExamAgendaItem, Notification, TeacherDashboardOverview, TeacherWorkspaceContext,
  PageResponse,
} from '../../api/types';
import { BarList, ChartCard, ColumnChart, MetricCard, PieChart } from '../../components/charts';
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

type DashboardOperationTask = {
  id: string; title: string; effectiveStatus: string; priority: string; dueDate?: string;
  assignedToName?: string; assignedRole: string; progressPercent: number; overdue: boolean;
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
    { code: 'C7', title: 'Trao đổi', description: 'Nhắn tin giáo viên', Icon: MessageSquareText },
    { code: 'C10', title: 'Lịch thi', description: 'Phòng, SBD và chỗ ngồi', Icon: CalendarCheck2 },
  ],
  parent: [
    { code: 'D2', title: 'Tình hình học tập', description: 'Điểm và chuyên cần', Icon: BarChart3 },
    { code: 'D3', title: 'Liên lạc giáo viên', description: 'Trao đổi với giáo viên', Icon: MessageSquareText },
    { code: 'D4', title: 'Khoản thu', description: 'Hóa đơn và thanh toán', Icon: WalletCards },
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
  const workCenterEnabled = ['admin', 'academic_staff', 'accountant', 'teacher'].includes(roleId);
  const workTasks = useApi<PageResponse<DashboardOperationTask>>(workCenterEnabled
    ? '/work-center/tasks?size=5&page=0&sort=dueDate&direction=asc&active=true' : null);
  const reloadWorkTasks = workTasks.reload;
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

  const navigate = (page: PageId) => onNavigate?.(page);
  const reloadAll = () => {
    dashboard.reload();
    notifications.reload();
    examAgenda.reload();
    teacherWorkspace.reload();
    workTasks.reload();
  };

  useEffect(() => {
    if (!workCenterEnabled) return;
    const reload = () => { void reloadWorkTasks(); };
    window.addEventListener(NOTIFICATION_INBOX_CHANGED, reload);
    return () => window.removeEventListener(NOTIFICATION_INBOX_CHANGED, reload);
  }, [reloadWorkTasks, workCenterEnabled]);

  if (roleId === 'admin') {
    return (<div className="dashboard-with-work-center">
      <AdminCommandDashboard
        firstName={firstName}
        today={today}
        data={dashboard.data}
        loading={loading}
        hasError={hasError}
        onReload={reloadAll}
        onNavigate={navigate}
      /><DashboardWorkCenterWidget roleId={roleId} state={workTasks} onNavigate={navigate} />
    </div>);
  }

  if (roleId === 'teacher') {
    return <div className="dashboard-with-work-center"><TeacherReferenceDashboard firstName={user?.fullName || firstName} today={today} data={dashboard.data} notifications={notifications.data ?? []} loading={loading} hasError={hasError} onReload={reloadAll} onNavigate={navigate} teacherWorkspace={teacherWorkspace.data} /><DashboardWorkCenterWidget roleId={roleId} state={workTasks} onNavigate={navigate} /></div>;
  }

  if (roleId === 'accountant') {
    return <div className="dashboard-with-work-center"><AccountantReferenceDashboard firstName={user?.fullName || firstName} today={today} data={dashboard.data} loading={loading} hasError={hasError} onReload={reloadAll} onNavigate={navigate} /><DashboardWorkCenterWidget roleId={roleId} state={workTasks} onNavigate={navigate} /></div>;
  }

  if (roleId === 'academic_staff') {
    return (<div className="dashboard-with-work-center">
      <OperationalRoleDashboard
        roleId={roleId}
        firstName={firstName}
        today={today}
        data={dashboard.data}
        loading={loading}
        hasError={hasError}
        teacherWorkspace={teacherWorkspace.data}
        onReload={reloadAll}
        onNavigate={navigate}
      /><DashboardWorkCenterWidget roleId={roleId} state={workTasks} onNavigate={navigate} />
    </div>);
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

function DashboardWorkCenterWidget({ roleId, state, onNavigate }: {
  roleId: RoleId;
  state: ReturnType<typeof useApi<PageResponse<DashboardOperationTask>>>;
  onNavigate: (page: PageId) => void;
}) {
  const page = ({ admin: 'A10', academic_staff: 'E7', accountant: 'F2', teacher: 'B17' } as Partial<Record<RoleId, PageId>>)[roleId];
  if (!page) return null;
  const summary = state.data?.summary ?? {};
  return <section className="dashboard-work-center-widget">
    <header><div><span><ListChecks size={16} /> TRUNG TÂM CÔNG VIỆC</span><h3>Việc cần ưu tiên xử lý</h3><p>Theo dõi tiến độ, hạn hoàn thành và xác nhận kết quả.</p></div><button type="button" onClick={() => onNavigate(page)}>Mở trung tâm <ArrowRight size={15} /></button></header>
    <div className="dashboard-work-center-summary">
      <span><small>Đang thực hiện</small><strong>{summary.inProgress ?? 0}</strong></span>
      <span className="warning"><small>Chờ xác nhận</small><strong>{summary.waitingConfirmation ?? 0}</strong></span>
      <span className="danger"><small>Quá hạn</small><strong>{summary.overdue ?? 0}</strong></span>
    </div>
    {state.loading ? <div className="dashboard-work-center-loading"><i /><i /><i /></div> : state.error ? <div className="dashboard-work-center-empty"><AlertTriangle size={18} /><span>Chưa thể đồng bộ công việc.</span><button type="button" onClick={() => void state.reload()}>Thử lại</button></div>
      : !state.data?.items.length ? <div className="dashboard-work-center-empty"><CheckCircle2 size={19} /><span>Không có công việc tồn đọng trong phạm vi của bạn.</span></div>
        : <div className="dashboard-work-center-list">{state.data.items.map((item) => <button type="button" key={item.id} onClick={() => { window.location.hash = `${pageHash(roleId, page)}?task=${encodeURIComponent(item.id)}`; }}><i className={`priority-${item.priority.toLowerCase()}`} /><span><strong>{item.title}</strong><small>{item.assignedToName || item.assignedRole} · {item.dueDate ? `Hạn ${new Date(item.dueDate).toLocaleDateString('vi-VN')}` : 'Không đặt hạn'}</small></span><b className={item.overdue ? 'overdue' : ''}>{item.overdue ? 'Quá hạn' : `${item.progressPercent}%`}</b><ArrowRight size={15} /></button>)}</div>}
  </section>;
}

function OperationalRoleDashboard({
  roleId, firstName, today, data, loading, hasError, onReload, onNavigate,
  teacherWorkspace,
}: {
  roleId: OperationalRole;
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  loading: boolean;
  hasError: boolean;
  teacherWorkspace?: TeacherWorkspaceContext | null;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
}) {
  if (roleId === 'academic_staff') {
    return <AcademicReferenceDashboard firstName={firstName} today={today} data={data} loading={loading} hasError={hasError} onReload={onReload} onNavigate={onNavigate} />;
  }
  const config = operationalDashboardConfig[roleId];
  const overview = data?.roleOverview;
  const metrics = roleId === 'teacher'
    ? teacherPriorityMetrics(data)
    : (data?.metrics ?? []).slice(0, 4).map(toMetric);
  const links = (roleId === 'teacher' ? teacherDashboardLinks(teacherWorkspace) : quickLinks[roleId]).slice(0, 3);
  const workItems = (overview?.workItems ?? [])
    .filter((item) => roleId !== 'teacher' || !['attendance', 'grading', 'unread'].includes(item.key))
    .slice(0, roleId === 'teacher' ? 3 : 4);
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

      {roleId === 'teacher' ? (
        <TeacherWeekWidget items={overview?.calendarItems ?? []} loading={loading} onNavigate={onNavigate} />
      ) : (
        <AdminCalendarWidget
          items={overview?.calendarItems ?? []}
          loading={loading}
          onNavigate={onNavigate}
          eyebrow="LỊCH CÔNG VIỆC"
          title={config.calendarTitle}
          description={config.calendarDescription}
        />
      )}

      {roleId !== 'teacher' && !loading && (
        <OperationalHealthStrip roleId={roleId} items={overview?.workItems ?? []} />
      )}

      <section className={`role-command-workspace ${roleId === 'teacher' ? 'teacher-compact' : ''}`}>
        <article className="role-command-worklist">
          <header><div><span>CẦN XỬ LÝ</span><h3>{config.workTitle}</h3><p>{config.workDescription}</p></div><strong className={openItems.length ? 'has-work' : 'is-clear'}>{openItems.length} nhóm việc</strong></header>
          <div>{loading ? <AdminListSkeleton /> : workItems.map((item) => <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />)}</div>
        </article>
        {roleId !== 'teacher' && <aside className="role-command-shortcuts">
          <header><span>TRUY CẬP NHANH</span><h3>Công cụ thường dùng</h3></header>
          <div>{links.map(({ code, title, description, Icon }) => <button type="button" key={`${code}-${title}`} onClick={() => onNavigate(code)}><span><Icon size={18} /></span><div><strong>{title}</strong><small>{description}</small></div><ArrowRight size={15} /></button>)}</div>
        </aside>}
      </section>

      {!loading && roleId !== 'teacher' && (data?.charts.length ?? 0) > 0 && <section className="role-command-insights">
        <header><div><span>PHÂN TÍCH THEO PHẠM VI</span><h3>{roleId === 'accountant' ? 'Tình hình thu và công nợ' : 'Tiến độ tổ chức đào tạo'}</h3></div><small>Dữ liệu được tổng hợp tự động</small></header>
        <div>{data?.charts.slice(0, 2).map((chart) => <DashboardChartCard key={chart.title} chart={chart} />)}</div>
      </section>}

      {!loading && roleId === 'teacher' && teacherWorkspace?.homeroomTeacher && data?.charts.some((chart) => chart.type === 'PIE') && (
        <section className="teacher-homeroom-insight">
          <header><div><span>LỚP CHỦ NHIỆM</span><h3>Cơ cấu học sinh</h3><p>Số liệu giới tính được tổng hợp từ hồ sơ lớp chủ nhiệm.</p></div></header>
          <DashboardChartCard chart={data.charts.find((chart) => chart.type === 'PIE')!} />
        </section>
      )}
    </div>
  );
}

function AcademicReferenceDashboard({ firstName, today, data, loading, hasError, onReload, onNavigate }: {
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  loading: boolean;
  hasError: boolean;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const overview = data?.roleOverview;
  const metrics = (data?.metrics ?? []).slice(0, 4).map(toMetric);
  const workItems = overview?.workItems ?? [];
  const chart = data?.charts[0];
  const openItems = workItems.filter((item) => item.severity !== 'SUCCESS');
  const approvalItems = openItems.filter((item) => [
    'pending-schedule-restrictions', 'pending-timetable-changes', 'timetable-drafts', 'draft-exams',
  ].includes(item.key));
  const quickActions: Array<{ page: PageId; title: string; detail: string; Icon: LucideIcon }> = [
    { page: 'E1', title: 'Chuẩn bị năm học', detail: 'Cơ cấu, lớp và phòng', Icon: School },
    { page: 'E2', title: 'Phân công & xếp lịch', detail: 'Giáo viên và thời khóa biểu', Icon: CalendarDays },
    { page: 'E3', title: 'Tổ chức kỳ thi', detail: 'Lịch, phòng và nhiệm vụ', Icon: CalendarCheck2 },
    { page: 'E4', title: 'Tổng kết năm học', detail: 'Xét duyệt và chuyển năm', Icon: GraduationCap },
  ];
  const primaryItem = openItems[0];
  return <div className="dashboard academic-control-dashboard">
    {hasError && <div className="dashboard-data-notice" role="alert"><Activity size={18} /><div><strong>Chưa thể đồng bộ đầy đủ dữ liệu học vụ</strong><span>Hãy tải lại để kiểm tra tiến độ năm học và cảnh báo.</span></div><button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button></div>}

    <section className="academic-control-hero">
      <div className="academic-control-welcome"><span><School size={15} /> KHÔNG GIAN ĐIỀU PHỐI HỌC VỤ</span><h2>Chào {firstName}, đây là tình hình hôm nay</h2><p>Ưu tiên xử lý các việc ảnh hưởng trực tiếp đến tiến độ năm học.</p><small><CalendarDays size={14} /> {today}</small></div>
      <div className="academic-control-context" aria-label="Phạm vi dữ liệu hiện hành"><div><small>Năm học đang xem</small><strong>{overview?.academicYear || 'Chưa thiết lập'}</strong><span>{statusLabel(overview?.academicYearStatus)}</span></div><div><small>Học kỳ đang xem</small><strong>{overview?.semester || 'Chưa thiết lập'}</strong><span>{statusLabel(overview?.semesterStatus)}</span></div><button type="button" onClick={onReload} disabled={loading}><RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Làm mới</button></div>
    </section>

    {loading ? <DashboardSkeleton /> : <section className="academic-control-kpis" aria-label="Chỉ số vận hành học vụ">{metrics.map((metric) => { const Icon = metric.Icon; return <article key={metric.label} className={`tone-${metric.tone}`}><span><Icon size={21} /></span><div><small>{metric.label}</small><strong>{metric.value}</strong><p>{metric.hint}</p></div></article>; })}</section>}

    <AcademicApprovalQueue items={approvalItems} onNavigate={onNavigate} />

    <section className={`academic-control-priority ${primaryItem ? 'has-priority' : 'is-clear'}`}>
      <span className="academic-control-priority-icon">{primaryItem ? <AlertTriangle size={21} /> : <CheckCircle2 size={21} />}</span>
      <div><small>{primaryItem ? 'ƯU TIÊN CAO NHẤT' : 'TIẾN ĐỘ ỔN ĐỊNH'}</small><h3>{primaryItem ? primaryItem.title : 'Không có việc học vụ tồn đọng'}</h3><p>{primaryItem ? primaryItem.detail : 'Các đầu việc trong phạm vi Giáo vụ đang vận hành theo đúng kế hoạch.'}</p></div>
      {primaryItem ? <><strong>{formatCompact(primaryItem.value)} {primaryItem.unit}</strong><button type="button" onClick={() => onNavigate(primaryItem.pageCode as PageId)}>Xử lý ngay <ArrowRight size={16} /></button></> : <button type="button" onClick={() => onNavigate('E7')}>Mở trung tâm công việc <ArrowRight size={16} /></button>}
    </section>

    <section className="academic-control-main">
      <AdminCalendarWidget
        items={overview?.calendarItems ?? []}
        loading={loading}
        onNavigate={onNavigate}
        eyebrow="LỊCH HỌC VỤ THÁNG"
        title="Kế hoạch điều phối học vụ"
        description="Kỳ thi, học kỳ, đổi tiết và các công việc cần hoàn thành trong tháng."
      />
      <aside className="academic-control-side">
        <AcademicYearProgress overview={overview} workItems={openItems} />
        <article className="academic-control-worklist"><header><div><span>VIỆC CẦN THEO DÕI</span><h3>Danh sách ưu tiên</h3></div><button type="button" onClick={() => onNavigate('E7')}>Xem tất cả</button></header><div>{openItems.slice(0, 4).map((item) => <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />)}{openItems.length === 0 && <span className="teacher-reference-empty"><CheckCircle2 size={18} /> Công việc đang đúng tiến độ</span>}</div></article>
      </aside>
    </section>

    <section className="academic-control-bottom">
      <article className="academic-control-actions"><header><span>QUY TRÌNH LÀM VIỆC</span><h3>Đi đến đúng nghiệp vụ chỉ với một bước</h3></header><div>{quickActions.map(({ page, title, detail, Icon }, index) => <button type="button" key={page} onClick={() => onNavigate(page)}><i>{index + 1}</i><span><Icon size={18} /><strong>{title}</strong><small>{detail}</small></span><ArrowRight size={16} /></button>)}</div></article>
      <article className="academic-control-capacity"><header><div><span>QUY MÔ ĐÀO TẠO</span><h3>{chart?.title || 'Sĩ số và sức chứa theo khối'}</h3></div><button type="button" onClick={() => onNavigate('E1')}>Xem cơ cấu</button></header>{loading ? <AdminListSkeleton /> : chart ? <DashboardChartCard chart={chart} /> : <div className="admin-reference-empty">Chưa có dữ liệu sĩ số</div>}</article>
    </section>
  </div>;
}

function AcademicApprovalQueue({ items, onNavigate }: {
  items: DashboardWorkItem[];
  onNavigate: (page: PageId) => void;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  return <section className={`academic-approval-queue ${items.length ? 'has-pending' : 'is-clear'}`}>
    <header>
      <span className="academic-approval-icon">{items.length ? <ClipboardCheck size={22} /> : <CheckCircle2 size={22} />}</span>
      <div>
        <small>HÀNG CHỜ PHÊ DUYỆT</small>
        <h3>{items.length ? `${total} yêu cầu cần Giáo vụ xử lý` : 'Không có yêu cầu đang chờ duyệt'}</h3>
        <p>{items.length ? 'Ưu tiên yêu cầu ảnh hưởng trực tiếp đến lịch dạy và lịch học.' : 'Các đề nghị điều chỉnh nghiệp vụ đã được xử lý đầy đủ.'}</p>
      </div>
      <button type="button" onClick={() => onNavigate(items[0]?.pageCode as PageId || 'E7')}>Xem tất cả <ArrowRight size={16} /></button>
    </header>
    {items.length > 0 && <div className="academic-approval-list">{items.slice(0, 4).map((item) => <button type="button" key={item.key} onClick={() => onNavigate(item.pageCode as PageId)}>
      <span className={`severity-${item.severity.toLowerCase()}`}><AlertTriangle size={17} /></span>
      <span><strong>{item.title}</strong><small>{item.detail}</small></span>
      <b>{formatCompact(item.value)} {item.unit}</b>
      <ArrowRight size={16} />
    </button>)}</div>}
  </section>;
}

function AcademicWeekCalendar({ items, loading, onNavigate }: { items: DashboardCalendarItem[]; loading: boolean; onNavigate: (page: PageId) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const monday = startOfTeachingWeek(new Date(), weekOffset);
  const days = Array.from({ length: 5 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
  const range = formatWeekRange(days);
  return <article className="academic-week-calendar"><header><div><span>LỊCH TUẦN</span><h3>Kế hoạch học vụ từ Thứ 2 đến Thứ 6</h3></div><nav><button type="button" onClick={() => setWeekOffset(0)}>Hôm nay</button><button type="button" aria-label="Tuần trước" onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft size={16} /></button><strong>{range}</strong><button type="button" aria-label="Tuần sau" onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight size={16} /></button></nav></header>{loading ? <AdminListSkeleton /> : <div className="academic-week-grid">{days.map((day) => { const key = localDateKey(day); const events = items.filter((item) => item.date.slice(0, 10) === key); return <section key={key} className={key === localDateKey(new Date()) ? 'is-today' : ''}><header><strong>{new Intl.DateTimeFormat('vi-VN',{weekday:'long'}).format(day)}</strong><span>{day.getDate()}/{day.getMonth()+1}</span></header><div>{events.length ? events.slice(0, 5).map((item) => <button type="button" key={item.id} className={`event-${item.type.toLowerCase()}`} onClick={() => onNavigate(item.pageCode as PageId)}><strong>{item.title}</strong><small>{item.detail || calendarEventLabel(item.type)}</small></button>) : <span>Không có lịch</span>}</div>{events.length > 5 && <small>+{events.length - 5} lịch khác</small>}</section>; })}</div>}<footer><span>Kỳ thi</span><span>Công bố</span><span>Hạn chót</span><span>Họp</span><span>Khác</span></footer></article>;
}

function AcademicYearProgress({ overview, workItems }: {
  overview?: DashboardResponse['roleOverview'];
  workItems: DashboardWorkItem[];
}) {
  const completed = overview?.academicYearStatus === 'COMPLETED';
  const active = overview?.academicYearStatus === 'ACTIVE';
  const preparationKeys = ['unassigned-students', 'missing-homeroom'];
  const operationKeys = ['teacher-workload', 'pending-schedule-restrictions', 'pending-timetable-changes', 'timetable-incomplete', 'timetable-conflicts', 'timetable-drafts', 'draft-exams', 'exam-incomplete'];
  const openKeys = new Set(workItems.map((item) => item.key));
  const preparationReady = preparationKeys.every((key) => !openKeys.has(key));
  const operationReady = operationKeys.every((key) => !openKeys.has(key));
  const checks = [...preparationKeys, ...operationKeys];
  const passedChecks = checks.filter((key) => !openKeys.has(key)).length;
  const percent = completed ? 100 : Math.round((passedChecks / checks.length) * 100);
  return <article className="academic-year-progress"><header><div><small>MỨC ĐỘ SẴN SÀNG</small><h3>Vận hành năm học</h3></div><span>{overview?.academicYear || 'Chưa thiết lập'}</span></header><div className="academic-progress-steps"><section className={preparationReady ? 'is-done' : 'has-warning'}><i>{preparationReady ? <CheckCircle2 size={16} /> : <AlertTriangle size={15} />}</i><strong>Chuẩn bị</strong><small>{preparationReady ? 'Đủ điều kiện' : 'Còn dữ liệu thiếu'}</small></section><section className={operationReady ? 'is-done' : active ? 'is-active' : ''}><i>{operationReady ? <CheckCircle2 size={16} /> : '2'}</i><strong>Vận hành</strong><small>{operationReady ? 'Không còn cảnh báo' : active ? 'Đang xử lý' : 'Chưa bắt đầu'}</small></section><section className={completed ? 'is-done' : ''}><i>{completed ? <CheckCircle2 size={16} /> : '3'}</i><strong>Tổng kết</strong><small>{completed ? 'Đã hoàn thành' : 'Chưa đến kỳ'}</small></section></div><div className="academic-progress-track"><i style={{ width: `${percent}%` }} /></div><footer><span>{passedChecks}/{checks.length} điều kiện vận hành đã đạt</span><strong>{percent}%</strong></footer></article>;
}

function AccountantReferenceDashboard({ firstName, today, data, loading, hasError, onReload, onNavigate }: {
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  loading: boolean;
  hasError: boolean;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
}) {
  const overview = data?.roleOverview;
  const metrics = (data?.metrics ?? []).slice(0, 4).map(toMetric);
  const workItems = overview?.workItems ?? [];
  const financeChart = data?.charts[0];
  const pendingPayments = findWorkValue(workItems, ['pending-payments', 'reconciliation']);
  const failedPayments = findWorkValue(workItems, ['failed-payments']);
  const overdueInvoices = findWorkValue(workItems, ['overdue-invoices']);
  const receiptFailures = findWorkValue(workItems, ['receipt-email']);
  const totalTransactions = Math.max(pendingPayments + failedPayments, findWorkValue(workItems, ['open-invoices']));
  const matchedTransactions = Math.max(0, totalTransactions - pendingPayments - failedPayments);
  return <div className="dashboard accountant-reference-dashboard">
    {hasError && <div className="dashboard-data-notice" role="alert"><Activity size={18} /><div><strong>Chưa thể đồng bộ đầy đủ dữ liệu tài chính</strong><span>Hãy tải lại để kiểm tra giao dịch và công nợ.</span></div><button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button></div>}

    <section className="accountant-reference-heading"><div><span>BẢNG ĐIỀU HÀNH TÀI CHÍNH</span><h2>Tổng quan Kế toán</h2><p>Xin chào {firstName} · {today}</p></div><div><span><small>Năm học</small><strong>{overview?.academicYear || 'Chưa thiết lập'}</strong></span><span><small>Học kỳ</small><strong>{overview?.semester || 'Chưa thiết lập'}</strong></span><button type="button" onClick={onReload} disabled={loading}><RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Cập nhật</button></div></section>

    {loading ? <DashboardSkeleton /> : <section className="accountant-reference-kpis" aria-label="Chỉ số tài chính quan trọng">{metrics.map((metric, index) => { const Icon = metric.Icon; return <article key={metric.label} className={`tone-${metric.tone}`}><span><Icon size={24} /></span><div><h3>{metric.label}</h3><strong>{metric.value}</strong><p>{metric.hint}</p></div><small>0{index + 1}</small></article>; })}</section>}

    <section className="accountant-reference-main">
      <article className="accountant-reference-chart"><header><div><span>TIẾN ĐỘ THU</span><h3>Cơ cấu trạng thái hóa đơn</h3><p>Phân bổ hóa đơn theo từng trạng thái trong năm học hiện hành.</p></div><button type="button" onClick={() => onNavigate('F1')}>Xem báo cáo</button></header>{loading ? <AdminListSkeleton /> : financeChart ? <AccountantInvoiceStatusChart chart={financeChart} /> : <div className="admin-reference-empty">Chưa có dữ liệu tiến độ thu</div>}</article>
      <AdminCalendarWidget
        items={overview?.calendarItems ?? []}
        loading={loading}
        onNavigate={onNavigate}
        eyebrow="LỊCH TÀI CHÍNH THÁNG"
        title="Mốc thu và đối soát"
        description="Ngày mở đợt thu, hạn thanh toán và công việc tài chính trong tháng."
      />
      <aside className="accountant-reference-side">
        <article className="accountant-reconcile-card"><header><h3>Đối soát VietQR</h3><button type="button" onClick={() => onNavigate('F1')}>Xem tất cả</button></header><div className="accountant-reconcile-total"><span>Tổng giao dịch</span><strong>{formatCompact(totalTransactions)}</strong></div><dl><div className="is-success"><dt><CheckCircle2 size={15} /> Đã khớp</dt><dd><strong>{formatCompact(matchedTransactions)}</strong><small>{financePercent(matchedTransactions, totalTransactions)}</small></dd></div><div className="is-pending"><dt><Clock3 size={15} /> Chờ khớp</dt><dd><strong>{formatCompact(pendingPayments)}</strong><small>{financePercent(pendingPayments, totalTransactions)}</small></dd></div><div className="is-failed"><dt><AlertTriangle size={15} /> Không khớp</dt><dd><strong>{formatCompact(failedPayments)}</strong><small>{financePercent(failedPayments, totalTransactions)}</small></dd></div></dl></article>
        <article className="accountant-receipt-card"><header><h3>Biên nhận</h3><button type="button" onClick={() => onNavigate('F1')}>Xem tất cả</button></header><div><span><small>Đang chờ xử lý</small><strong>{formatCompact(Math.max(0, totalTransactions - receiptFailures))}</strong></span><span><small>Gửi thất bại</small><strong className={receiptFailures ? 'has-error' : ''}>{formatCompact(receiptFailures)}</strong></span></div><button type="button" onClick={() => onNavigate('F1')}><MessageSquareText size={16} /> Kiểm tra email biên nhận</button></article>
      </aside>
    </section>

    <section className="accountant-reference-bottom"><article className="accountant-debt-worklist"><header><div><span>CÔNG NỢ CẦN XỬ LÝ</span><h3>Theo dõi theo nhóm trạng thái</h3></div><div><span>{overdueInvoices} hóa đơn quá hạn</span><button type="button" onClick={() => onNavigate('F1')}>Mở bộ lọc</button></div></header><div className="accountant-debt-table"><div className="is-head"><strong>Nhóm công việc</strong><strong>Chi tiết</strong><strong>Số lượng</strong><strong>Trạng thái</strong></div>{workItems.filter((item) => item.severity !== 'SUCCESS').slice(0, 5).map((item) => <button type="button" key={item.key} onClick={() => onNavigate(item.pageCode as PageId)}><strong>{item.title}</strong><span>{item.detail}</span><b>{formatCompact(item.value)} {item.unit}</b><em className={`severity-${item.severity.toLowerCase()}`}>{item.severity === 'CRITICAL' ? 'Khẩn cấp' : item.severity === 'WARNING' ? 'Cần xử lý' : 'Theo dõi'}</em></button>)}</div></article><aside className="accountant-reference-actions"><button type="button" onClick={() => onNavigate('F1')}><span><WalletCards size={22} /></span><div><strong>Tạo đợt thu</strong><small>Tạo mới khoản thu học phí</small></div><ArrowRight size={17} /></button><button type="button" onClick={() => onNavigate('F1')}><span><Upload size={22} /></span><div><strong>Xuất báo cáo</strong><small>Tải báo cáo doanh thu, công nợ</small></div><ArrowRight size={17} /></button></aside></section>
  </div>;
}

function AccountantCollectionCalendar({ items, loading, onNavigate }: { items: DashboardCalendarItem[]; loading: boolean; onNavigate: (page: PageId) => void }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => localDateKey(new Date()));
  const month = new Date(new Date().getFullYear(), new Date().getMonth() + monthOffset, 1);
  const days = calendarDays(month);
  const monthLabel = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(month);
  const selectedItems = items.filter((item) => item.date.slice(0, 10) === selectedDate);
  return <article className="accountant-collection-calendar"><header><div><span>LỊCH TÀI CHÍNH</span><h3>{monthLabel}</h3></div><nav><button type="button" aria-label="Tháng trước" onClick={() => setMonthOffset((value) => value - 1)}><ChevronLeft size={16} /></button><button type="button" onClick={() => { setMonthOffset(0); setSelectedDate(localDateKey(new Date())); }}>Hôm nay</button><button type="button" aria-label="Tháng sau" onClick={() => setMonthOffset((value) => value + 1)}><ChevronRight size={16} /></button></nav></header>{loading ? <AdminListSkeleton /> : <><div className="accountant-calendar-weekdays">{['T2','T3','T4','T5','T6','T7','CN'].map((day) => <span key={day}>{day}</span>)}</div><div className="accountant-calendar-days">{days.map((day) => { const key = localDateKey(day); const dayItems = items.filter((item) => item.date.slice(0, 10) === key); return <button type="button" key={key} className={`${day.getMonth() !== month.getMonth() ? 'outside' : ''} ${key === localDateKey(new Date()) ? 'today' : ''} ${key === selectedDate ? 'selected' : ''}`} onClick={() => setSelectedDate(key)}><span>{day.getDate()}</span><i>{dayItems.slice(0, 3).map((item) => <b key={item.id} className={item.type.toLowerCase()} />)}</i></button>; })}</div><div className="accountant-calendar-agenda"><header><strong>{new Intl.DateTimeFormat('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit' }).format(parseLocalDate(selectedDate))}</strong><span>{selectedItems.length} mốc công việc</span></header>{selectedItems.length ? selectedItems.slice(0, 4).map((item) => <button type="button" key={item.id} onClick={() => onNavigate(item.pageCode as PageId)}><i className={item.type.toLowerCase()} /><span><strong>{item.title}</strong><small>{item.detail || calendarEventLabel(item.type)}</small></span><ArrowRight size={14} /></button>) : <p>Không có hạn thu hoặc công việc trong ngày này.</p>}</div><footer><span>Đợt thu</span><span>Hạn thanh toán</span><span>Công việc</span></footer></>}</article>;
}

function AccountantInvoiceStatusChart({ chart }: { chart: DashboardChart }) {
  const colors = ['#2563eb', '#12a68d', '#ef5a61', '#f1a62f', '#7a5bd5'];
  const rows = chart.data.slice(0, 5);
  const total = rows.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = rows.map((item, index) => {
    const start = cursor;
    cursor += total > 0 ? item.value / total * 100 : 0;
    return `${colors[index]} ${start}% ${cursor}%`;
  });
  const primaryRate = total > 0 && rows.length > 0 ? rows[0].value / total * 100 : 0;
  return <div className="accountant-invoice-chart">
    <section className="accountant-invoice-visual">
      <div className="accountant-invoice-donut" style={{ background: total > 0 ? `conic-gradient(${segments.join(',')})` : 'var(--border)' }}><span><small>Tổng cộng</small><strong>{formatCompact(total)}</strong><em>hóa đơn</em></span></div>
      <div className="accountant-invoice-rate"><span>Tỷ trọng nhóm lớn nhất</span><strong>{formatNumber(primaryRate, 1)}%</strong><small>{rows[0]?.label || 'Chưa có dữ liệu'}</small></div>
    </section>
    <section className="accountant-invoice-legend">{rows.map((item, index) => { const percent = total > 0 ? item.value / total * 100 : 0; return <div key={item.label}><i style={{ background: colors[index] }} /><span><strong>{item.label}</strong><small>{formatNumber(percent, 1)}% tổng số</small></span><b>{formatCompact(item.value)}<small>{chart.suffix || 'hóa đơn'}</small></b><em><u style={{ width: `${percent}%`, background: colors[index] }} /></em></div>; })}</section>
  </div>;
}

function findWorkValue(items: DashboardWorkItem[], keys: string[]) {
  return items.filter((item) => keys.includes(item.key)).reduce((sum, item) => sum + item.value, 0);
}

function financePercent(value: number, total: number) {
  return total > 0 ? `${formatNumber(value / total * 100, 1)}%` : '0%';
}

function TeacherReferenceDashboard({ firstName, today, data, notifications, loading, hasError, onReload, onNavigate, teacherWorkspace }: {
  firstName: string;
  today: string;
  data?: DashboardResponse | null;
  notifications: Notification[];
  loading: boolean;
  hasError: boolean;
  onReload: () => void;
  onNavigate: (page: PageId) => void;
  teacherWorkspace?: TeacherWorkspaceContext | null;
}) {
  const metrics = teacherPriorityMetrics(data);
  const overview = data?.roleOverview;
  const teacherOverview = data?.teacherOverview;
  const workItems = (overview?.workItems ?? []).filter((item) => !['attendance', 'grading', 'unread', 'healthy'].includes(item.key)).slice(0, 3);
  const attentionStudents = teacherOverview?.attentionStudents ?? [];
  const genderChart = data?.charts.find((chart) => chart.type === 'PIE');
  const nextLesson = teacherOverview?.todayLessons.find((item) => item.status === 'IN_PROGRESS') ?? teacherOverview?.todayLessons.find((item) => item.status === 'UPCOMING');
  return <div className="dashboard teacher-reference-dashboard">
    {hasError && <div className="dashboard-data-notice" role="alert"><Activity size={18} /><div><strong>Chưa thể đồng bộ đầy đủ dữ liệu</strong><span>Hãy tải lại để kiểm tra lịch dạy và công việc.</span></div><button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button></div>}

    <section className="teacher-reference-heading">
      <div><span>TỔNG QUAN GIÁO VIÊN</span><h2>Xin chào, {firstName}</h2><p>Chúc bạn một ngày làm việc hiệu quả và nhiều năng lượng.</p></div>
      <div><CalendarDays size={16} /><span>{today}</span><button type="button" onClick={onReload} disabled={loading}><RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Cập nhật</button></div>
    </section>

    {loading ? <DashboardSkeleton /> : <section className="teacher-reference-kpis" aria-label="Công việc quan trọng của giáo viên">
      <article className="teacher-next-lesson-card">
        <header><span><BookOpenCheck size={21} /></span><strong>Tiết dạy tiếp theo</strong></header>
        <h3>{nextLesson?.subjectName || 'Đã hoàn tất lịch dạy'}</h3>
        <p>{nextLesson ? `Lớp ${nextLesson.classCode} · ${nextLesson.roomCode ? `Phòng ${nextLesson.roomCode}` : 'Chưa xếp phòng'}` : 'Không còn tiết dạy trong hôm nay'}</p>
        <time>{nextLesson ? `${nextLesson.startTime} – ${nextLesson.endTime} · Tiết ${nextLesson.periodNo}` : 'Hẹn gặp lại vào tiết học tiếp theo'}</time>
        <button type="button" onClick={() => onNavigate(nextLesson?.attendanceRecorded ? 'B2' : 'B3')}>{nextLesson ? nextLesson.attendanceRecorded ? 'Xem lịch dạy' : 'Điểm danh ngay' : 'Mở thời khóa biểu'} <ArrowRight size={16} /></button>
      </article>
      {metrics.slice(1).map((metric, index) => { const Icon = metric.Icon; const pages: PageId[] = ['B3', 'B5', 'B15']; return <article key={metric.label} className={`teacher-reference-kpi tone-${metric.tone}`}><header><span><Icon size={20} /></span><small>0{index + 2}</small></header><strong>{metric.value}</strong><h3>{metric.label}</h3><p>{metric.hint}</p><button type="button" onClick={() => onNavigate(pages[index])}>{index === 0 ? 'Điểm danh ngay' : index === 1 ? 'Xem và chấm bài' : 'Xem công việc'} <ArrowRight size={15} /></button></article>; })}
    </section>}

    <section className="teacher-reference-main">
      <AdminCalendarWidget
        items={overview?.calendarItems ?? []}
        loading={loading}
        onNavigate={onNavigate}
        eyebrow="LỊCH GIẢNG DẠY THÁNG"
        title="Lịch dạy và nhiệm vụ"
        description="Tiết dạy, hạn bài tập, coi thi, chấm thi và công việc được giao."
      />
      <aside className="teacher-reference-side">
        {teacherWorkspace?.homeroomTeacher && <TeacherHomeroomSummary classCodes={teacherWorkspace.homeroomClasses.map((item) => item.code)} chart={genderChart} students={attentionStudents} onNavigate={onNavigate} />}
        <article className="teacher-reference-list"><header><div><ClipboardCheck size={18} /><h3>Công việc cần xử lý</h3></div><button type="button" onClick={() => onNavigate('B15')}>Xem tất cả</button></header><div>{workItems.length ? workItems.map((item) => <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />) : <span className="teacher-reference-empty"><CheckCircle2 size={18} /> Không có công việc tồn đọng</span>}</div></article>
        <article className="teacher-reference-list teacher-reference-notifications"><header><div><MessageSquareText size={18} /><h3>Thông báo lớp học</h3></div><button type="button" onClick={() => onNavigate('B7')}>Xem tất cả</button></header><div>{notifications.slice(0, 3).map((item) => <button type="button" key={item.id} onClick={() => onNavigate('B7')}><span>{item.read ? <Bell size={15} /> : <Bell size={15} fill="currentColor" />}</span><div><strong>{item.title}</strong><small>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</small></div><ArrowRight size={14} /></button>)}{notifications.length === 0 && <span className="teacher-reference-empty"><CheckCircle2 size={18} /> Chưa có thông báo mới</span>}</div></article>
      </aside>
    </section>
  </div>;
}

function TeacherHomeroomSummary({ classCodes, chart, students, onNavigate }: { classCodes: string[]; chart?: DashboardChart; students: TeacherDashboardOverview['attentionStudents']; onNavigate: (page: PageId) => void }) {
  const parts = chart?.data.slice(0, 2) ?? [];
  const total = parts.reduce((sum, item) => sum + item.value, 0);
  const firstPercent = total > 0 ? (parts[0]?.value ?? 0) / total * 100 : 50;
  return <article className="teacher-homeroom-summary"><header><div><Users size={19} /><h3>Lớp {classCodes.join(', ') || 'chủ nhiệm'}</h3></div><button type="button" onClick={() => onNavigate('B16')}>Xem lớp chủ nhiệm</button></header><div className="teacher-homeroom-overview"><section><small>Tổng số học sinh</small><strong>{formatCompact(total)}</strong>{parts.map((item, index) => <span key={item.label} className={`gender-${index}`}><i />{item.label}: {item.value}</span>)}</section><div className="teacher-homeroom-donut" style={{ background: `conic-gradient(#16a6a0 0 ${firstPercent}%, #55c7dc ${firstPercent}% 100%)` }}><span><strong>{formatCompact(total)}</strong><small>học sinh</small></span></div><section className="teacher-support-mini"><small>Học sinh cần hỗ trợ ({students.length})</small>{students.slice(0, 3).map((student) => <button type="button" key={student.studentId} onClick={() => onNavigate('B16')}><i>{student.studentName.trim().charAt(0)}</i><span>{student.studentName}</span></button>)}</section></div><button type="button" className="teacher-homeroom-footer" onClick={() => onNavigate('B16')}>Xem danh sách lớp <ArrowRight size={14} /></button></article>;
}

function teacherDashboardLinks(workspace?: TeacherWorkspaceContext | null): DashboardLink[] {
  const links = quickLinks.teacher.filter((item) => item.code !== 'B12' || workspace?.examResponsibilities);
  links.push({ code: 'B14', title: 'Đề nghị hạn chế lịch dạy', description: 'Gửi ngoại lệ có căn cứ và xem chỉ tiêu hệ thống', Icon: Clock3 });
  if (workspace?.homeroomTeacher) {
    links.push({ code: 'B9', title: 'Duyệt đơn nghỉ', description: 'Xử lý yêu cầu của lớp chủ nhiệm', Icon: CalendarCheck2 });
    links.push({ code: 'B13', title: 'Học bạ lớp chủ nhiệm', description: 'Theo dõi và xác nhận hồ sơ', Icon: GraduationCap });
  }
  return links;
}

function teacherPriorityMetrics(data?: DashboardResponse | null): Metric[] {
  const workItems = data?.roleOverview?.workItems ?? [];
  const lessons = data?.teacherOverview?.todayLessons ?? [];
  const nextLesson = lessons.find((item) => item.status === 'IN_PROGRESS')
    ?? lessons.find((item) => item.status === 'UPCOMING');
  const attendance = workItems.find((item) => item.key === 'attendance')?.value ?? 0;
  const grading = workItems.find((item) => item.key === 'grading')?.value ?? 0;
  const dueTasks = workItems
    .filter((item) => !['attendance', 'grading', 'unread', 'healthy'].includes(item.key) && item.severity !== 'SUCCESS')
    .length;

  return [
    {
      label: 'Tiết dạy tiếp theo',
      value: nextLesson?.startTime || 'Đã hoàn tất',
      hint: nextLesson ? `${nextLesson.subjectName} · Lớp ${nextLesson.classCode}` : 'Không còn tiết dạy trong hôm nay',
      Icon: Clock3,
      tone: nextLesson?.status === 'IN_PROGRESS' ? 'green' : 'blue',
    },
    {
      label: 'Tiết chưa điểm danh',
      value: formatCompact(attendance),
      hint: attendance > 0 ? 'Cần hoàn tất sổ điểm danh theo từng tiết' : 'Đã hoàn tất điểm danh hôm nay',
      Icon: CalendarCheck2,
      tone: attendance > 0 ? 'red' : 'green',
    },
    {
      label: 'Bài chờ chấm',
      value: formatCompact(grading),
      hint: grading > 0 ? 'Ưu tiên bài gần hạn trả kết quả' : 'Không còn bài làm chờ xử lý',
      Icon: BookOpenCheck,
      tone: grading > 0 ? 'orange' : 'green',
    },
    {
      label: 'Công việc đến hạn',
      value: formatCompact(dueTasks),
      hint: dueTasks > 0 ? 'Đơn xin nghỉ, sổ điểm hoặc nhiệm vụ khảo thí' : 'Không có công việc tồn đọng',
      Icon: AlertTriangle,
      tone: dueTasks > 0 ? 'orange' : 'green',
    },
  ];
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
            {students.slice(0, 3).map((student) => <button type="button" key={student.studentId} onClick={() => {
              window.location.hash = pageHash('teacher', 'B16', new URLSearchParams({ class: student.classId, student: student.studentId }));
            }}>
              <span className={student.severity === 'CRITICAL' ? 'is-critical' : 'is-warning'}>{student.studentName.trim().charAt(0)}</span>
              <div><small>{student.classCode} · {student.studentCode}</small><strong>{student.studentName}</strong><p>{student.reason}</p></div>
              <ArrowRight size={15} />
            </button>)}
            {students.length > 3 && <button type="button" className="teacher-attention-more" onClick={() => onNavigate('B16')}>
              <span><Users size={17} /></span><div><strong>Xem tất cả {students.length} học sinh</strong><small>Mở danh sách theo dõi chi tiết</small></div><ArrowRight size={15} />
            </button>}
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
  const workItems = (overview?.workItems ?? []).slice(0, 4);
  const openWorkItems = workItems.filter((item) => item.severity !== 'SUCCESS');
  const metrics: Metric[] = overview ? [
    { label: 'Người dùng hoạt động', value: formatCompact(overview.activeStudents + overview.activeTeachers + overview.activeParents), hint: 'Học sinh, giáo viên và phụ huynh', Icon: Users, tone: 'blue' },
    { label: 'Tài khoản cần xử lý', value: formatCompact(overview.pendingActivationAccounts + overview.lockedAccounts), hint: 'Chờ kích hoạt hoặc đang bị khóa', Icon: KeyRound, tone: 'green' },
    { label: 'Cảnh báo hệ thống', value: formatCompact(openWorkItems.length), hint: 'Nhóm công việc cần theo dõi', Icon: AlertTriangle, tone: openWorkItems.length ? 'red' : 'green' },
    { label: 'Yêu cầu ngoại lệ', value: formatCompact(overview.unassignedStudents + overview.classesWithoutHomeroom), hint: 'Hồ sơ chưa phân lớp hoặc thiếu chủ nhiệm', Icon: ShieldCheck, tone: 'violet' },
  ] : (data?.metrics ?? []).map(toMetric).slice(0, 4);

  return (
    <div className="dashboard admin-command-dashboard">
      {hasError && (
        <div className="dashboard-data-notice" role="alert">
          <Activity size={18} />
          <div><strong>Chưa thể đồng bộ đầy đủ dữ liệu điều hành</strong><span>Nhấn tải lại để kiểm tra kết nối với hệ thống.</span></div>
          <button type="button" onClick={onReload}><RefreshCw size={15} /> Tải lại</button>
        </div>
      )}

      <section className="admin-reference-heading">
        <div><span>TỔNG QUAN QUẢN TRỊ</span><h2>Chào {firstName}, đây là tình hình hệ thống hôm nay</h2><p>{today}</p></div>
        <div className="admin-reference-period">
          <span><small>Năm học</small><strong>{overview?.academicYear || 'Chưa thiết lập'}</strong></span>
          <span><small>Học kỳ</small><strong>{overview?.semester || 'Chưa thiết lập'}</strong></span>
          <button type="button" onClick={onReload} disabled={loading}><RefreshCw size={16} className={loading ? 'is-spinning' : ''} /> Cập nhật</button>
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

      <section className="admin-reference-main">
        <AdminCalendarWidget
          items={overview?.calendarItems ?? []}
          loading={loading}
          onNavigate={onNavigate}
          eyebrow="LỊCH ĐIỀU HÀNH THÁNG"
          title="Sự kiện và mốc toàn trường"
          description="Công việc, kỳ thi, khoản thu, thông báo và ngày nghỉ trong tháng."
        />
        <aside className="admin-reference-side">
          <article className="admin-reference-chart">
            <header><h3>Phân bố vai trò</h3><button type="button" onClick={() => onNavigate('A1L')}>Xem chi tiết</button></header>
            {loading ? <AdminListSkeleton /> : <AdminRoleDistribution overview={overview} />}
          </article>
          <AdminSystemStatus overview={overview} onNavigate={onNavigate} />
        </aside>
      </section>

      <section className="admin-reference-bottom">
        <article className="admin-reference-activity">
          <header><div><span>HOẠT ĐỘNG GẦN ĐÂY</span><h3>Công việc và cảnh báo cần theo dõi</h3></div><strong className={openWorkItems.length ? 'has-work' : 'is-clear'}>{openWorkItems.length} cần xử lý</strong></header>
          <div>{loading ? <AdminListSkeleton /> : workItems.map((item) => <AdminWorkItemRow key={item.key} item={item} onNavigate={onNavigate} />)}</div>
          <button type="button" onClick={() => onNavigate('A8')}>Xem toàn bộ báo cáo <ArrowRight size={15} /></button>
        </article>
        <aside className="admin-reference-actions">
          <button type="button" onClick={() => onNavigate('A1L')}><span><Upload size={21} /></span><div><strong>Nhập người dùng</strong><small>Import hồ sơ từ Excel</small></div><ArrowRight size={17} /></button>
          <button type="button" onClick={() => onNavigate('A1L')}><span><KeyRound size={21} /></span><div><strong>Duyệt ngoại lệ</strong><small>{formatCompact(overview?.pendingActivationAccounts)} tài khoản chờ xử lý</small></div><ArrowRight size={17} /></button>
        </aside>
      </section>

    </div>
  );
}

function AdminRoleDistribution({ overview }: { overview?: DashboardResponse['adminOverview'] }) {
  const parts = [
    { label: 'Học sinh', value: overview?.activeStudents ?? 0, color: '#2563eb' },
    { label: 'Phụ huynh', value: overview?.activeParents ?? 0, color: '#18a5b8' },
    { label: 'Giáo viên', value: overview?.activeTeachers ?? 0, color: '#815fd4' },
  ];
  const total = parts.reduce((sum, item) => sum + item.value, 0);
  let cursor = 0;
  const segments = parts.map((item) => {
    const start = cursor;
    cursor += total > 0 ? (item.value / total) * 100 : 0;
    return `${item.color} ${start}% ${cursor}%`;
  });
  return <div className="admin-role-distribution">
    <div className="admin-role-donut" style={{ background: total > 0 ? `conic-gradient(${segments.join(',')})` : 'var(--border)' }}><span><strong>{formatCompact(total)}</strong><small>Tổng</small></span></div>
    <div className="admin-role-legend">{parts.map((item) => <div key={item.label}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{formatCompact(item.value)}</strong><small>{total > 0 ? `${formatNumber((item.value / total) * 100, 1)}%` : '0%'}</small></div>)}</div>
  </div>;
}

function AdminWeekCalendar({ items, loading, onNavigate }: { items: DashboardCalendarItem[]; loading: boolean; onNavigate: (page: PageId) => void }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const base = new Date();
  const mondayIndex = (base.getDay() + 6) % 7;
  base.setDate(base.getDate() - mondayIndex + weekOffset * 7);
  base.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 5 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return date;
  });
  const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const rangeLabel = `${days[0].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} – ${days[4].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
  return <article className="admin-reference-calendar">
    <header><div><h3>Lịch tuần</h3><p>Sự kiện, kỳ thi và các mốc hành chính toàn trường.</p></div><div><button type="button" onClick={() => setWeekOffset(0)}>Hôm nay</button><button type="button" aria-label="Tuần trước" onClick={() => setWeekOffset((value) => value - 1)}><ChevronLeft size={17} /></button><strong>{rangeLabel}</strong><button type="button" aria-label="Tuần sau" onClick={() => setWeekOffset((value) => value + 1)}><ChevronRight size={17} /></button></div></header>
    {loading ? <AdminListSkeleton /> : <div className="admin-reference-week">
      {days.map((day, index) => {
        const dayItems = items.filter((item) => item.date.slice(0, 10) === isoDate(day));
        const todayDay = isoDate(day) === isoDate(new Date());
        return <section key={isoDate(day)} className={todayDay ? 'is-today' : ''}>
          <header><strong>{`Thứ ${index + 2}`}</strong><span>{day.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span></header>
          <div>{dayItems.length ? dayItems.slice(0, 4).map((item) => <button type="button" key={item.id} className={`event-${item.type.toLowerCase()}`} onClick={() => onNavigate(item.pageCode as PageId)}><strong>{item.title}</strong><small>{item.detail || calendarEventLabel(item.type)}</small></button>) : <span className="admin-reference-no-event">Không có lịch</span>}</div>
          {dayItems.length > 4 && <small className="admin-reference-more">+{dayItems.length - 4} lịch khác</small>}
        </section>;
      })}
    </div>}
    <footer><span className="task">Công việc</span><span className="exam">Kỳ thi</span><span className="fee">Khoản thu</span><span className="holiday">Thông báo & ngày nghỉ</span></footer>
  </article>;
}

function AdminSystemStatus({ overview, onNavigate }: { overview?: DashboardResponse['adminOverview']; onNavigate: (page: PageId) => void }) {
  const statuses = [
    { label: 'Tài khoản', value: overview?.lockedAccounts ?? 0, Icon: Users, ok: (overview?.lockedAccounts ?? 0) === 0 },
    { label: 'Cơ sở dữ liệu', value: 0, Icon: Database, ok: true },
    { label: 'Phân quyền', value: overview?.inactiveAccounts ?? 0, Icon: ShieldCheck, ok: (overview?.inactiveAccounts ?? 0) === 0 },
    { label: 'Dịch vụ', value: 0, Icon: Server, ok: true },
  ];
  return <article className="admin-reference-status"><header><h3>Tình trạng hệ thống</h3><button type="button" onClick={() => onNavigate('A8')}>Xem chi tiết</button></header><div>{statuses.map(({ label, value, Icon, ok }) => <button type="button" key={label} onClick={() => onNavigate(label === 'Tài khoản' ? 'A1L' : 'A8')}><span className={ok ? 'is-ok' : 'has-warning'}><Icon size={22} /></span><strong>{label}</strong><small>{ok ? 'Hoạt động' : `${value} cần xử lý`}</small></button>)}</div></article>;
}

function OperationalHealthStrip({ roleId, items }: { roleId: Exclude<OperationalRole, 'teacher'>; items: DashboardWorkItem[] }) {
  const definitions = roleId === 'academic_staff' ? [
    { label: 'Phân công & định mức', keys: ['unassigned-teaching', 'teacher-workload', 'missing-homeroom'] },
    { label: 'TKB & phát hành', keys: ['timetable-incomplete', 'timetable-conflicts', 'timetable-drafts'] },
    { label: 'Tổ chức kỳ thi', keys: ['draft-exams', 'exam-incomplete'] },
    { label: 'Học bạ & tổng kết', keys: ['report-cards', 'year-end'] },
  ] : [
    { label: 'Tiến độ thu', keys: ['open-invoices'] },
    { label: 'Khoản quá hạn', keys: ['overdue-invoices'] },
    { label: 'VietQR & đối soát', keys: ['pending-payments', 'failed-payments', 'reconciliation'] },
    { label: 'Email biên nhận', keys: ['receipt-email'] },
  ];
  return <section className="operational-health-strip" aria-label="Trạng thái vận hành">
    {definitions.map((definition) => {
      const relevant = items.filter((item) => definition.keys.includes(item.key) && item.severity !== 'SUCCESS');
      const critical = relevant.some((item) => item.severity === 'CRITICAL');
      return <article key={definition.label} className={relevant.length ? critical ? 'is-critical' : 'is-warning' : 'is-ready'}>
        {relevant.length ? <AlertTriangle size={17} /> : <CheckCircle2 size={17} />}
        <div><strong>{definition.label}</strong><span>{relevant.length ? `${relevant.length} nhóm cần xử lý` : 'Đang ổn định'}</span></div>
      </article>;
    })}
  </section>;
}

function TeacherWeekWidget({ items, loading, onNavigate }: {
  items: DashboardCalendarItem[];
  loading: boolean;
  onNavigate: (page: PageId) => void;
}) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});
  const now = new Date();
  const monday = startOfTeachingWeek(now, weekOffset);
  const days = Array.from({ length: 5 }, (_, index) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + index));
  const weekItems = items.filter((item) => days.some((day) => localDateKey(day) === item.date));
  const lessonCount = weekItems.filter(isTeacherLesson).length;
  const taskCount = weekItems.length - lessonCount;
  return <section className="teacher-week-widget">
    <header>
      <div><span><CalendarDays size={19} /></span><div><small>LỊCH TUẦN</small><h3>Tuần làm việc từ Thứ 2 đến Thứ 6</h3><p>Tiết dạy và hạn công việc quan trọng trong tuần.</p></div></div>
      <nav aria-label="Chuyển tuần"><button type="button" onClick={() => setWeekOffset((value) => value - 1)} aria-label="Tuần trước"><ChevronLeft size={17} /></button><strong>{formatWeekRange(days)}</strong><button type="button" onClick={() => setWeekOffset((value) => value + 1)} aria-label="Tuần sau"><ChevronRight size={17} /></button></nav>
    </header>
    {!loading && <div className="teacher-week-summary" aria-label="Tổng quan lịch tuần">
      <span><Clock3 size={15} /><strong>{lessonCount}</strong> tiết dạy</span>
      <span><BookOpenCheck size={15} /><strong>{taskCount}</strong> việc đến hạn</span>
      <span className={weekItems.length ? 'is-ready' : ''}><CheckCircle2 size={15} />{weekItems.length ? 'Đã đồng bộ lịch' : 'Tuần trống'}</span>
    </div>}
    {loading ? <AdminListSkeleton /> : <div className="teacher-week-grid">
      {days.map((day) => {
        const dateKey = localDateKey(day);
        const dayItems = weekItems.filter((item) => item.date === dateKey);
        const lessons = dayItems.filter(isTeacherLesson).sort(compareTeacherCalendarItems);
        const tasks = dayItems.filter((item) => !isTeacherLesson(item)).sort(compareTeacherCalendarItems);
        const visibleTasks = expandedTasks[dateKey] ? tasks : tasks.slice(0, 2);
        const isToday = dateKey === localDateKey(now);
        return <article key={dateKey} className={isToday ? 'is-today' : ''}>
          <header><strong>{new Intl.DateTimeFormat('vi-VN', { weekday: 'short' }).format(day)} {isToday && <em>Hôm nay</em>}</strong><span>{day.getDate()}/{day.getMonth() + 1}</span></header>
          {dayItems.length === 0 ? <span className="teacher-week-empty"><CalendarCheck2 size={18} />Không có tiết dạy hoặc công việc</span> : <>
            {lessons.length > 0 && <section className="teacher-week-section"><h4><Clock3 size={13} />Tiết dạy <span>{lessons.length}</span></h4><div>{lessons.map((item) => <TeacherWeekItem key={item.id} item={item} onNavigate={onNavigate} />)}</div></section>}
            {tasks.length > 0 && <section className="teacher-week-section is-task"><h4><BookOpenCheck size={13} />Việc đến hạn <span>{tasks.length}</span></h4><div>{visibleTasks.map((item) => <TeacherWeekItem key={item.id} item={item} onNavigate={onNavigate} />)}</div>
              {tasks.length > 2 && <button className="teacher-week-expand" type="button" onClick={() => setExpandedTasks((value) => ({ ...value, [dateKey]: !value[dateKey] }))}>{expandedTasks[dateKey] ? 'Thu gọn' : `Xem thêm ${tasks.length - 2} việc`}</button>}
            </section>}
          </>}
        </article>;
      })}
    </div>}
  </section>;
}

function TeacherWeekItem({ item, onNavigate }: { item: DashboardCalendarItem; onNavigate: (page: PageId) => void }) {
  return <button type="button" onClick={() => onNavigate(item.pageCode)}>
    <i className={item.type.toLowerCase()} />
    <span><strong>{item.title}</strong><small>{item.detail || calendarEventLabel(item.type)}</small></span>
  </button>;
}

function isTeacherLesson(item: DashboardCalendarItem) {
  return item.type.toUpperCase() === 'LESSON';
}

function compareTeacherCalendarItems(left: DashboardCalendarItem, right: DashboardCalendarItem) {
  return calendarItemTime(left).localeCompare(calendarItemTime(right), 'vi') || left.title.localeCompare(right.title, 'vi');
}

function calendarItemTime(item: DashboardCalendarItem) {
  const match = item.detail?.match(/(?:^|\s)(\d{1,2}):?(\d{2})/);
  return match ? `${match[1].padStart(2, '0')}:${match[2]}` : '99:99';
}

function startOfTeachingWeek(date: Date, offset: number) {
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekendAdvance = offset === 0 && (day === 0 || day === 6) ? 7 : 0;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + mondayOffset + weekendAdvance + offset * 7);
}

function formatWeekRange(days: Date[]) {
  const first = days[0];
  const last = days[days.length - 1];
  return `${first.getDate()}/${first.getMonth() + 1} – ${last.getDate()}/${last.getMonth() + 1}`;
}

function AdminCalendarWidget({ items, loading, onNavigate, eyebrow = 'LỊCH ĐIỀU HÀNH', title = 'Sự kiện cấp trường', description = 'Thông báo chung, sự kiện và các mốc hành chính toàn trường.' }: {
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
  const selectedItems = items
    .filter((item) => item.date.slice(0, 10) === selectedDate)
    .sort(compareTeacherCalendarItems);
  const monthItems = items.filter((item) => {
    const date = parseLocalDate(item.date);
    return date.getFullYear() === visibleMonth.getFullYear() && date.getMonth() === visibleMonth.getMonth();
  });
  const agendaItems = selectedItems;
  const legendTypes = Array.from(new Set(items.map((item) => item.type))).slice(0, 5);
  const selectedLabel = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' })
    .format(parseLocalDate(selectedDate));

  const moveMonth = (amount: number) => {
    setVisibleMonth((current) => {
      const target = new Date(current.getFullYear(), current.getMonth() + amount, 1);
      setSelectedDate(localDateKey(target));
      return target;
    });
  };

  const goToday = () => {
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(localDateKey(now));
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
            <button type="button" className="calendar-today-button" onClick={goToday}>Hôm nay</button>
          </div>
        </div>
      </header>

      <div className="admin-calendar-layout">
        <div className="admin-calendar-board" aria-label={`Lịch ${new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(visibleMonth)}`}>
          <div className="admin-calendar-weekdays">{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="admin-calendar-grid">
            {days.map((date) => {
              const dateKey = localDateKey(date);
              const dayItems = items.filter((item) => item.date.slice(0, 10) === dateKey);
              const isCurrentMonth = date.getMonth() === visibleMonth.getMonth();
              const isToday = dateKey === localDateKey(now);
              return (
                <button
                  type="button"
                  key={dateKey}
                  className={`${isCurrentMonth ? '' : 'outside'} ${isToday ? 'today' : ''} ${selectedDate === dateKey ? 'selected' : ''}`.trim()}
                  onClick={() => {
                    setSelectedDate(dateKey);
                    if (!isCurrentMonth) setVisibleMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                  }}
                  aria-label={`${date.toLocaleDateString('vi-VN')}${dayItems.length ? `, ${dayItems.length} sự kiện` : ''}`}
                >
                  <span>{date.getDate()}</span>
                  <i>{dayItems.slice(0, 3).map((item) => <b key={item.id} className={item.type.toLowerCase()} />)}</i>
                  {dayItems.length > 0 && <em>{dayItems.length}</em>}
                </button>
              );
            })}
          </div>
        </div>

        <aside className="admin-calendar-agenda">
          <div><small>CHI TIẾT NGÀY ĐÃ CHỌN</small><h4>{capitalize(selectedLabel)}</h4><span>{selectedItems.length} lịch trong ngày · {monthItems.length} lịch trong tháng</span></div>
          {loading ? <AdminListSkeleton /> : agendaItems.length === 0 ? (
            <div className="admin-calendar-empty"><CheckCircle2 size={22} /><strong>Ngày này chưa có lịch</strong><span>Chọn một ngày có dấu sự kiện hoặc chuyển sang tháng khác để xem.</span></div>
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
    EXAM: 'Kỳ thi', FEE: 'Hạn khoản thu', SEMESTER: 'Mốc học kỳ', HOLIDAY: 'Lịch nghỉ', ANNOUNCEMENT: 'Thông báo',
    LESSON: 'Tiết dạy', ASSIGNMENT: 'Hạn bài tập', TASK: 'Hạn công việc', COLLECTION: 'Đợt thu',
    SCHEDULE_CHANGE: 'Đổi tiết hoặc dạy thay', EXAM_DUTY: 'Nhiệm vụ coi thi', GRADING_DUTY: 'Nhiệm vụ chấm thi',
  } as Record<string, string>)[type] || 'Sự kiện';
}

function calendarEventIcon(type: string): LucideIcon {
  return ({
    EXAM: CalendarCheck2, FEE: WalletCards, SEMESTER: School, HOLIDAY: Bell, ANNOUNCEMENT: Bell,
    LESSON: Clock3, ASSIGNMENT: BookOpenCheck, TASK: ListChecks, COLLECTION: WalletCards,
    SCHEDULE_CHANGE: CalendarDays, EXAM_DUTY: ClipboardCheck, GRADING_DUTY: BookOpenCheck,
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

function roleLabel(role: RoleId) {
  return { admin: 'Quản trị viên', academic_staff: 'Giáo vụ', accountant: 'Kế toán', teacher: 'Giáo viên', student: 'Học sinh', parent: 'Phụ huynh' }[role];
}

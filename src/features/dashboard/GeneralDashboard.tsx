import { Activity, BarChart3, Bell, BookOpenCheck, CalendarDays, CheckCircle2, School, ShieldCheck, Sparkles, Users, WalletCards } from 'lucide-react';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import type { ApiUser, Assignment, AttendanceRecord, Grade, Invoice, Notification, SchoolClass, TimetableSlot } from '../../api/types';
import { BarList, ChartCard, ColumnChart, MetricCard } from '../../components/charts';
import { Section, StatusPill, viLabel } from '../../components/ui';
import type { Metric, RoleId } from '../../types';

type Overview = { students: number; teachers: number; parents: number; admins: number; classes: number; subjects: number };
type AttendanceSummary = { present: number; late: number; absentExcused: number; absentUnexcused: number; total: number; attendanceRate: number };
type Revenue = { invoiceCount: number; paidCount: number; totalAmount: number; paidAmount: number; outstanding: number };
type GradeBand = { band: string; count: number };

const money = (value: number) => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;

const roleDashboardIntros = {
  teacher: {
    eyebrow: 'Không gian giáo viên',
    title: 'Tổ chức lớp học hiệu quả hơn mỗi ngày',
    description: 'Theo dõi lịch dạy, chuyên cần, điểm số và bài tập trong một không gian làm việc thống nhất.',
    facts: ['Lịch dạy rõ ràng', 'Dữ liệu lớp học trực tiếp'],
    Icon: School,
  },
  student: {
    eyebrow: 'Hành trình học tập',
    title: 'Nắm bắt tiến độ, chủ động học tập',
    description: 'Tổng hợp thời khóa biểu, kết quả học tập, chuyên cần và nhiệm vụ cần hoàn thành.',
    facts: ['Kết quả theo học kỳ', 'Bài tập và thông báo mới'],
    Icon: BookOpenCheck,
  },
  parent: {
    eyebrow: 'Đồng hành cùng con',
    title: 'Theo dõi việc học một cách dễ dàng',
    description: 'Cập nhật kết quả, chuyên cần, thông báo và học phí của học sinh đang được chọn.',
    facts: ['Thông tin tập trung', 'Cập nhật từ nhà trường'],
    Icon: Users,
  },
};

export function GeneralDashboard({ roleId }: { roleId: RoleId }) {
  const { childId } = useActiveChild();
  const children = useApi<ApiUser[]>(roleId === 'parent' ? '/me/children' : null);
  const selectedChild = childId || children.data?.[0]?.id || null;
  const studentQuery = roleId === 'student' ? '' : selectedChild ? `?studentId=${encodeURIComponent(selectedChild)}` : null;

  const overview = useApi<Overview>(roleId === 'admin' ? '/reports/overview' : null);
  const revenue = useApi<Revenue>(roleId === 'admin' ? '/reports/revenue' : null);
  const adminUsers = useApi<ApiUser[]>(roleId === 'admin' ? '/users' : null);
  const schoolClasses = useApi<SchoolClass[]>(roleId === 'admin' ? '/classes' : null);
  const gradeBands = useApi<GradeBand[]>(roleId === 'admin' || roleId === 'teacher' ? '/reports/grade-distribution' : null);
  const attendanceSummary = useApi<AttendanceSummary>(roleId === 'admin' || roleId === 'teacher' ? '/reports/attendance-summary' : null);
  const grades = useApi<Grade[]>(roleId === 'student' ? '/grades' : roleId === 'parent' && studentQuery ? `/grades${studentQuery}` : null);
  const attendance = useApi<AttendanceRecord[]>(roleId === 'student' ? '/attendance' : roleId === 'parent' && studentQuery ? `/attendance${studentQuery}` : null);
  const timetable = useApi<TimetableSlot[]>(roleId === 'teacher' || roleId === 'student' ? '/me/timetable' : null);
  const assignments = useApi<Assignment[]>(roleId === 'teacher' ? '/assignments' : roleId === 'student' ? '/me/assignments' : null);
  const invoices = useApi<Invoice[]>(roleId === 'student' ? '/invoices' : roleId === 'parent' && studentQuery ? `/invoices${studentQuery}` : null);
  const notifications = useApi<Notification[]>('/notifications');

  const unread = notifications.data?.filter((item) => !item.read).length ?? 0;
  const metrics = buildMetrics(roleId, {
    overview: overview.data,
    revenue: revenue.data,
    attendanceSummary: attendanceSummary.data,
    grades: grades.data,
    attendance: attendance.data,
    timetable: timetable.data,
    assignments: assignments.data,
    invoices: invoices.data,
    children: children.data,
    unread,
  });
  const error = [overview, revenue, adminUsers, schoolClasses, gradeBands, attendanceSummary, grades, attendance, timetable, assignments, invoices, notifications]
    .map((result) => result.error).find(Boolean);

  if (roleId === 'admin') {
    const today = new Intl.DateTimeFormat('vi-VN', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    }).format(new Date());
    const totalGrades = (gradeBands.data ?? []).reduce((sum, item) => sum + item.count, 0);
    const operationRows = [
      { area: 'Chuyên cần toàn trường', value: `${attendanceSummary.data?.attendanceRate ?? 0}%`, detail: `${attendanceSummary.data?.total ?? 0} lượt điểm danh`, status: (attendanceSummary.data?.attendanceRate ?? 0) >= 95 ? 'ACTIVE' : 'PENDING' },
      { area: 'Thu học phí', value: money(revenue.data?.paidAmount ?? 0), detail: `${revenue.data?.paidCount ?? 0}/${revenue.data?.invoiceCount ?? 0} hóa đơn`, status: (revenue.data?.outstanding ?? 0) > 0 ? 'PENDING' : 'ACTIVE' },
      { area: 'Dữ liệu bảng điểm', value: `${totalGrades} kết quả`, detail: `${gradeBands.data?.length ?? 0} nhóm điểm`, status: totalGrades > 0 ? 'ACTIVE' : 'PENDING' },
      { area: 'Thông báo hệ thống', value: `${unread} chưa đọc`, detail: `${notifications.data?.length ?? 0} thông báo gần đây`, status: unread > 0 ? 'PENDING' : 'ACTIVE' },
    ];

    return (
      <div className="dashboard admin-dashboard">
        {error && <div className="error-banner">Không thể tải một phần dữ liệu quản trị: {error}</div>}

        <section className="admin-overview-hero">
          <img src="/images/admin-dashboard-hero.png" alt="" loading="eager" />
          <div className="admin-overview-copy">
            <span><Sparkles size={15} /> Trung tâm điều hành nhà trường</span>
            <h2>Chào buổi sáng, Quản trị viên</h2>
            <p>Theo dõi dữ liệu vận hành, nhân sự và học tập trong một không gian quản trị thống nhất.</p>
            <div className="admin-hero-facts">
              <strong><ShieldCheck size={17} /> Hệ thống an toàn</strong>
              <strong><Activity size={17} /> Dữ liệu trực tiếp</strong>
              <strong><CheckCircle2 size={17} /> {today}</strong>
            </div>
          </div>
        </section>

        <section className="metric-grid">
          {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
        </section>

        <div className="admin-dashboard-table-grid">
          <Section title="Tài khoản người dùng" subtitle="Danh sách tài khoản đang có trong hệ thống">
            <div className="admin-table-scroll">
              <table className="live-table admin-data-table">
                <thead><tr><th>Họ và tên</th><th>Vai trò</th><th>Tài khoản</th><th>Trạng thái</th></tr></thead>
                <tbody>{(adminUsers.data ?? []).slice(0, 6).map((user) => <tr key={user.id}>
                  <td><strong>{user.fullName}</strong><small>{user.email || 'Chưa cập nhật email'}</small></td>
                  <td>{viLabel(user.role)}</td><td>@{user.username}</td><td><StatusPill value={user.status} /></td>
                </tr>)}</tbody>
              </table>
            </div>
          </Section>

          <Section title="Lớp học hiện tại" subtitle="Sĩ số và giáo viên chủ nhiệm">
            <div className="admin-table-scroll">
              <table className="live-table admin-data-table">
                <thead><tr><th>Lớp</th><th>Khối</th><th>Giáo viên chủ nhiệm</th><th>Sĩ số</th></tr></thead>
                <tbody>{(schoolClasses.data ?? []).slice(0, 6).map((schoolClass) => <tr key={schoolClass.id}>
                  <td><strong>{schoolClass.code}</strong><small>{schoolClass.name}</small></td>
                  <td>{schoolClass.gradeLevel}</td><td>{schoolClass.homeroomTeacherName || 'Chưa phân công'}</td><td><strong>{schoolClass.studentCount}</strong> học sinh</td>
                </tr>)}</tbody>
              </table>
            </div>
          </Section>
        </div>

        <Section title="Tình hình vận hành" subtitle="Tổng hợp dữ liệu quan trọng cần quản trị viên theo dõi" wide>
          <div className="admin-table-scroll">
            <table className="live-table admin-data-table operation-table">
              <thead><tr><th>Hạng mục</th><th>Giá trị hiện tại</th><th>Thông tin chi tiết</th><th>Trạng thái</th></tr></thead>
              <tbody>{operationRows.map((row) => <tr key={row.area}><td><strong>{row.area}</strong></td><td className="admin-table-value">{row.value}</td><td>{row.detail}</td><td><StatusPill value={row.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </Section>

        <Section title="Thông báo mới nhất" subtitle="Các sự kiện và cảnh báo trong hệ thống" wide>
          <div className="admin-table-scroll">
            <table className="live-table admin-data-table">
              <thead><tr><th>Loại</th><th>Nội dung</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
              <tbody>{(notifications.data ?? []).slice(0, 6).map((item) => <tr key={item.id}>
                <td>{viLabel(item.type)}</td><td><strong>{item.title}</strong><small>{item.body}</small></td><td>{formatDashboardTime(item.createdAt)}</td><td><StatusPill value={item.read ? 'READ' : 'UNREAD'} /></td>
              </tr>)}</tbody>
            </table>
          </div>
        </Section>
      </div>
    );
  }

  const roleIntro = roleDashboardIntros[roleId];
  const RoleIntroIcon = roleIntro.Icon;

  return (
    <div className={`dashboard role-dashboard role-dashboard--${roleId}`}>
      {error && <div className="error-banner">Không thể tải một phần dashboard: {error}</div>}

      <section className="role-dashboard-hero">
        <div className="role-dashboard-heading">
          <span className="role-dashboard-kicker"><RoleIntroIcon size={16} /> {roleIntro.eyebrow}</span>
          <h2>{roleIntro.title}</h2>
          <p>{roleIntro.description}</p>
          <div className="role-dashboard-facts">
            {roleIntro.facts.map((fact) => <strong key={fact}><CheckCircle2 size={16} /> {fact}</strong>)}
          </div>
        </div>
        <div className="role-dashboard-symbol" aria-hidden="true"><RoleIntroIcon size={54} /></div>
      </section>

      <section className="metric-grid">
        {metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}
      </section>

      {roleId === 'teacher' && (
        <div className="dashboard-grid">
          <ChartCard title="Phân bố điểm" subtitle="Dữ liệu trực tiếp từ sổ điểm">
            <ColumnChart data={(gradeBands.data ?? []).map((item) => ({ label: item.band, value: item.count }))} max={Math.max(1, ...(gradeBands.data ?? []).map((item) => item.count))} suffix="" />
          </ChartCard>
          <ChartCard title="Chuyên cần" subtitle="Tổng hợp bản ghi điểm danh">
            <BarList data={attendanceBars(attendanceSummary.data)} max={Math.max(1, attendanceSummary.data?.total ?? 0)} suffix="" />
          </ChartCard>
        </div>
      )}

      {(roleId === 'student' || roleId === 'parent') && (
        <div className="dashboard-grid">
          <ChartCard title="Điểm theo môn" subtitle="Điểm trung bình từ dữ liệu đã công bố">
            <BarList data={subjectAverages(grades.data ?? [])} max={10} suffix="" />
          </ChartCard>
          <ChartCard title="Trạng thái hóa đơn" subtitle={roleId === 'parent' ? 'Theo học sinh đang chọn' : 'Hóa đơn của bạn'}>
            <ColumnChart data={invoiceBars(invoices.data ?? [])} max={Math.max(1, ...(invoiceBars(invoices.data ?? []).map((item) => item.value)))} suffix="" />
          </ChartCard>
        </div>
      )}
    </div>
  );
}

function formatDashboardTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}

type DashboardData = {
  overview: Overview | null; revenue: Revenue | null; attendanceSummary: AttendanceSummary | null;
  grades: Grade[] | null; attendance: AttendanceRecord[] | null; timetable: TimetableSlot[] | null;
  assignments: Assignment[] | null; invoices: Invoice[] | null; children: ApiUser[] | null; unread: number;
};

function buildMetrics(role: RoleId, data: DashboardData): Metric[] {
  if (role === 'admin') return [
    { label: 'Học sinh', value: String(data.overview?.students ?? '…'), hint: `${data.overview?.classes ?? '…'} lớp`, Icon: Users, tone: 'blue' },
    { label: 'Giáo viên', value: String(data.overview?.teachers ?? '…'), hint: `${data.overview?.subjects ?? '…'} môn học`, Icon: School, tone: 'green' },
    { label: 'Đã thu', value: money(data.revenue?.paidAmount ?? 0), hint: `${data.revenue?.paidCount ?? 0}/${data.revenue?.invoiceCount ?? 0} hóa đơn`, Icon: WalletCards, tone: 'orange' },
    { label: 'Chưa thu', value: money(data.revenue?.outstanding ?? 0), hint: 'Cập nhật theo giao dịch', Icon: BarChart3, tone: 'red' },
  ];
  if (role === 'teacher') return [
    { label: 'Tiết dạy', value: String(data.timetable?.length ?? '…'), hint: 'Trong thời khóa biểu', Icon: CalendarDays, tone: 'blue' },
    { label: 'Bài tập', value: String(data.assignments?.length ?? '…'), hint: 'Đã tạo', Icon: BookOpenCheck, tone: 'green' },
    { label: 'Chuyên cần', value: `${data.attendanceSummary?.attendanceRate ?? 0}%`, hint: `${data.attendanceSummary?.total ?? 0} lượt`, Icon: BarChart3, tone: 'orange' },
    { label: 'Thông báo mới', value: String(data.unread), hint: 'Chưa đọc', Icon: Bell, tone: 'violet' },
  ];
  const avg = data.grades?.length ? data.grades.reduce((sum, item) => sum + item.score, 0) / data.grades.length : 0;
  const attendanceRate = personalAttendanceRate(data.attendance ?? []);
  if (role === 'student') return [
    { label: 'Điểm trung bình', value: avg.toFixed(1), hint: `${data.grades?.length ?? 0} đầu điểm`, Icon: BarChart3, tone: 'blue' },
    { label: 'Chuyên cần', value: `${attendanceRate}%`, hint: `${data.attendance?.length ?? 0} lượt`, Icon: CalendarDays, tone: 'green' },
    { label: 'Bài tập', value: String(data.assignments?.length ?? '…'), hint: 'Được giao', Icon: BookOpenCheck, tone: 'orange' },
    { label: 'Thông báo mới', value: String(data.unread), hint: 'Chưa đọc', Icon: Bell, tone: 'violet' },
  ];
  const due = (data.invoices ?? []).reduce((sum, item) => sum + Math.max(0, item.totalAmount - item.paidAmount), 0);
  return [
    { label: 'Học sinh', value: String(data.children?.length ?? '…'), hint: 'Đã liên kết', Icon: Users, tone: 'blue' },
    { label: 'Điểm trung bình', value: avg.toFixed(1), hint: `${data.grades?.length ?? 0} đầu điểm`, Icon: BarChart3, tone: 'green' },
    { label: 'Cần thanh toán', value: money(due), hint: `${(data.invoices ?? []).filter((item) => item.status !== 'PAID').length} hóa đơn`, Icon: WalletCards, tone: 'orange' },
    { label: 'Thông báo mới', value: String(data.unread), hint: 'Chưa đọc', Icon: Bell, tone: 'violet' },
  ];
}

function attendanceBars(data: AttendanceSummary | null) {
  return [
    { label: 'Có mặt', value: data?.present ?? 0 }, { label: 'Đi muộn', value: data?.late ?? 0 },
    { label: 'Vắng phép', value: data?.absentExcused ?? 0 }, { label: 'Vắng không phép', value: data?.absentUnexcused ?? 0 },
  ];
}

function subjectAverages(grades: Grade[]) {
  const grouped = new Map<string, number[]>();
  grades.forEach((grade) => grouped.set(grade.subjectName, [...(grouped.get(grade.subjectName) ?? []), grade.score]));
  return [...grouped].map(([label, scores]) => ({ label, value: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10 }));
}

function invoiceBars(invoices: Invoice[]) {
  const statuses = ['PAID', 'PARTIAL', 'UNPAID'];
  return statuses.map((status) => ({ label: status === 'PAID' ? 'Đã trả' : status === 'PARTIAL' ? 'Một phần' : 'Chưa trả', value: invoices.filter((item) => item.status === status).length }));
}

function personalAttendanceRate(records: AttendanceRecord[]) {
  if (!records.length) return 0;
  const attended = records.filter((item) => item.status === 'PRESENT' || item.status === 'LATE').length;
  return Math.round(attended / records.length * 1000) / 10;
}

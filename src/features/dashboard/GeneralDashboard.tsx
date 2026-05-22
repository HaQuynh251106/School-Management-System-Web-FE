import {
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  MessageSquareText,
  School,
  Users,
  WalletCards,
} from 'lucide-react';
import {
  assignments,
  attendanceTrend,
  chatThreads,
  children,
  classes,
  currency,
  eventFlow,
  gradeBands,
  initialGrades,
  invoiceStatus,
  invoices,
  roleDistribution,
  roster,
  subjectScores,
  teacherClasses,
} from '../../data/mockData';
import type { Metric, RoleId } from '../../types';
import { BarList, ChartCard, ColumnChart, MetricCard, SplitDashboard } from '../../components/charts';
import { InfoGrid, ProcessList, StatusPill } from '../../components/ui';

export function GeneralDashboard({ roleId }: { roleId: RoleId }) {
  const metrics = dashboardMetricsByRole[roleId];

  return (
    <div className="dashboard">
      <section className="metric-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.label} metric={metric} />
        ))}
      </section>

      {roleId === 'admin' && <AdminDashboard />}
      {roleId === 'teacher' && <TeacherDashboard />}
      {roleId === 'student' && <StudentDashboard />}
      {roleId === 'parent' && <ParentDashboard />}
    </div>
  );
}

const dashboardMetricsByRole: Record<RoleId, Metric[]> = {
  admin: [
    { label: 'Tài khoản hoạt động', value: '2,438', hint: '4 vai trò RBAC', Icon: Users, tone: 'blue' },
    { label: 'Lớp đang mở', value: String(classes.length), hint: 'Năm học 2025-2026', Icon: School, tone: 'green' },
    { label: 'Cảnh báo TKB', value: '6', hint: 'GV/phòng/lớp trùng lịch', Icon: AlertTriangle, tone: 'orange' },
    { label: 'Sự kiện hôm nay', value: '2.7K', hint: 'RabbitMQ + audit log', Icon: Bell, tone: 'violet' },
  ],
  teacher: [
    { label: 'Lớp đang dạy', value: String(teacherClasses.length), hint: 'Toán 10 và 11', Icon: School, tone: 'blue' },
    { label: 'Tiết hôm nay', value: '4', hint: '2 tiết cần điểm danh', Icon: CalendarDays, tone: 'green' },
    { label: 'Bài chưa chấm', value: '18', hint: 'Deadline tuần này', Icon: BookOpenCheck, tone: 'orange' },
    { label: 'Tin nhắn mới', value: '3', hint: 'HS/PH và lớp 10A1', Icon: MessageSquareText, tone: 'violet' },
  ],
  student: [
    { label: 'Điểm trung bình', value: '8.4', hint: 'HK1 đang học', Icon: BarChart3, tone: 'green' },
    { label: 'Chuyên cần', value: '96%', hint: '1 buổi vắng có phép', Icon: CheckCircle2, tone: 'blue' },
    { label: 'Bài sắp đến hạn', value: '3', hint: 'Trong 7 ngày', Icon: Clock3, tone: 'orange' },
    { label: 'Thông báo', value: '12', hint: 'In-app + push', Icon: Bell, tone: 'violet' },
  ],
  parent: [
    { label: 'Hồ sơ con', value: String(children.length), hint: 'Switch profile sẵn sàng', Icon: Users, tone: 'blue' },
    { label: 'Cảnh báo chuyên cần', value: '1', hint: 'Cần xác nhận lý do', Icon: AlertTriangle, tone: 'red' },
    { label: 'Hóa đơn mở', value: '2', hint: 'VNPAY/MoMo sandbox', Icon: WalletCards, tone: 'orange' },
    { label: 'Trao đổi GVCN', value: '4', hint: 'Tin nhắn trong tuần', Icon: MessageSquareText, tone: 'violet' },
  ],
};

function AdminDashboard() {
  return (
    <section className="chart-grid">
      <ChartCard title="Phân bổ tài khoản" subtitle="Admin theo dõi cơ cấu người dùng toàn trường">
        <BarList data={roleDistribution} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Chuyên cần toàn trường" subtitle="Tỷ lệ có mặt 7 ngày gần nhất">
        <ColumnChart data={attendanceTrend} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Phổ điểm học kỳ" subtitle="Admin xem chất lượng học tập theo dải điểm">
        <BarList data={gradeBands} max={80} suffix=" HS" />
      </ChartCard>

      <ChartCard title="Tài chính & event queue" subtitle="Hóa đơn, trạng thái thanh toán và lượng event">
        <SplitDashboard />
      </ChartCard>
    </section>
  );
}

function TeacherDashboard() {
  const assignmentProgress = assignments.map((item) => ({
    label: item.className,
    value: Math.round((item.submitted / item.total) * 100),
  }));
  const classLoad = teacherClasses.map((item) => ({ label: item.className, value: item.students }));
  const scoreDistribution = roster.map((student) => ({
    label: student.name,
    value: Math.round((initialGrades[student.id] ?? 0) * 10),
  }));
  const unreadByThread = chatThreads.map((thread) => ({
    label: thread.name,
    value: thread.unread,
  }));

  return (
    <section className="chart-grid">
      <ChartCard title="Lớp đang phụ trách" subtitle="Sĩ số theo phân công giáo viên">
        <BarList data={classLoad} max={45} suffix=" HS" />
      </ChartCard>

      <ChartCard title="Tiến độ nộp bài" subtitle="Tỷ lệ bài nộp theo lớp">
        <BarList data={assignmentProgress} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Điểm lớp 10A1" subtitle="Điểm miệng gần nhất của học sinh">
        <BarList data={scoreDistribution} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Tin nhắn cần xử lý" subtitle="Luồng giao tiếp với HS/PH">
        <BarList data={unreadByThread} max={3} suffix=" mới" />
      </ChartCard>
    </section>
  );
}

function StudentDashboard() {
  const scoreBySubject = subjectScores.map((score) => ({
    label: score.subject,
    value: Math.round(score.avg * 10),
  }));
  const assignmentStatus = assignments.map((item) => ({
    label: item.title.replace('Bài tập ', ''),
    value: Math.round((item.submitted / item.total) * 100),
  }));

  return (
    <section className="chart-grid">
      <ChartCard title="Điểm theo môn" subtitle="Học sinh theo dõi kết quả HK1 của mình">
        <BarList data={scoreBySubject} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Chuyên cần cá nhân" subtitle="Tỷ lệ có mặt theo ngày trong tuần">
        <ColumnChart data={attendanceTrend} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Bài tập cần theo dõi" subtitle="Tiến độ nộp bài trong lớp">
        <BarList data={assignmentStatus} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Lịch học hôm nay" subtitle="Các tiết học và việc cần làm">
        <ProcessList
          items={[
            'Tiết 1: Toán tại P201, kiểm tra miệng.',
            'Tiết 2: Vật lý tại P304, chuẩn bị thí nghiệm.',
            'Tiết 3: Tiếng Anh tại P108, nộp bài speaking.',
            'Sau giờ học: CLB Robotics tại Lab 2.',
          ]}
        />
      </ChartCard>
    </section>
  );
}

function ParentDashboard() {
  const childScores = children.map((child) => ({
    label: child.name,
    value: Math.round(child.avg * 10),
  }));
  const childAttendance = children.map((child) => ({
    label: child.name,
    value: child.attendance,
  }));
  const invoiceAmounts = invoices.map((invoice) => ({
    label: invoice.title.replace(' học sinh', ''),
    value: Math.round(invoice.amount / 100000),
  }));

  return (
    <section className="chart-grid">
      <ChartCard title="Kết quả học tập của con" subtitle="Điểm trung bình theo từng hồ sơ con">
        <BarList data={childScores} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Chuyên cần của con" subtitle="Phụ huynh theo dõi tỷ lệ đi học">
        <ColumnChart data={childAttendance} max={100} suffix="%" />
      </ChartCard>

      <ChartCard title="Học phí cần theo dõi" subtitle="Số tiền theo từng hóa đơn">
        <BarList data={invoiceAmounts} max={70} suffix="00K" />
      </ChartCard>

      <ChartCard title="Việc cần làm" subtitle="Các đầu việc ưu tiên của phụ huynh">
        <div className="dashboard-task-list">
          <div>
            <span>Xác nhận vắng</span>
            <strong>{children[0].alert}</strong>
            <StatusPill value="Cần xử lý" />
          </div>
          <div>
            <span>Học phí</span>
            <strong>{currency.format(invoices[0].amount)}</strong>
            <StatusPill value={invoices[0].status} />
          </div>
          <div>
            <span>Liên lạc</span>
            <strong>4 tin nhắn với GVCN</strong>
            <StatusPill value="PENDING" />
          </div>
        </div>
      </ChartCard>
    </section>
  );
}

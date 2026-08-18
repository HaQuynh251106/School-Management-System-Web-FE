import { BarChart3, BookOpenCheck, CalendarDays, ClipboardCheck, ClipboardList, GraduationCap, History, LockKeyhole, Mail, TrendingUp, Users } from 'lucide-react';
import { attendanceTrend, children, subjects, subjectScores } from '../../data/mockData';
import { BarList, ChartCard, ColumnChart } from '../../components/charts';
import { Badge, FormPreview, FunctionTabs, InfoGrid, ProcessList, Section } from '../../components/ui';
import { AttendanceHistory, StudentProfileCard, StudentSchedule, StudentScoreTable } from '../shared/FeatureWidgets';

export function StudentProfileFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'info',
          label: 'Thông tin',
          Icon: GraduationCap,
          content: (
            <Section title="Hồ sơ học sinh" subtitle="C1 - thông tin cá nhân và lớp hiện tại" wide>
              <StudentProfileCard />
            </Section>
          ),
        },
        {
          id: 'guardians',
          label: 'Phụ huynh',
          Icon: Users,
          content: (
            <Section title="Người giám hộ" subtitle="Parent-student relationship dùng cho Switch Profile" wide>
              <InfoGrid
                items={children.map((child) => ({
                  title: child.name,
                  value: child.className,
                  meta: `GVCN ${child.homeroom}`,
                }))}
              />
            </Section>
          ),
        },
        {
          id: 'account',
          label: 'Tài khoản',
          Icon: LockKeyhole,
          content: (
            <Section title="Thông tin đăng nhập" subtitle="Trạng thái tài khoản và bảo mật phiên" wide>
              <ProcessList
                items={[
                  'Tài khoản đang ACTIVE và chưa yêu cầu đổi mật khẩu.',
                  'JWT access token dùng cho API Gateway.',
                  'Thiết bị nhận push đã đăng ký trong user_devices.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function StudentAcademicFeature() {
  const avgYear = (
    subjectScores.reduce((s, sc) => s + sc.avg, 0) / subjectScores.length
  ).toFixed(2);

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'schedule',
          label: 'TKB',
          Icon: CalendarDays,
          content: (
            <Section title="TKB hôm nay" subtitle="C2 - lịch học cá nhân" wide>
              <StudentSchedule />
            </Section>
          ),
        },
        {
          id: 'hk1',
          label: 'Điểm HK1',
          Icon: BarChart3,
          content: (
            <Section title="Bảng điểm HK1 — 2025/2026" subtitle="Điểm miệng, GK, CK và TB môn có hệ số" wide>
              <StudentScoreTable />
            </Section>
          ),
        },
        {
          id: 'hk2',
          label: 'Điểm HK2',
          Icon: BarChart3,
          content: (
            <Section title="Bảng điểm HK2 — 2025/2026" subtitle="Đang cập nhật từ giáo viên bộ môn" wide>
              <div className="score-table">
                {subjectScores.map((score) => (
                  <div key={score.subject} className="score-row">
                    <strong>{score.subject}</strong>
                    <span>Miệng {Math.max(5, score.oral - 0.5).toFixed(1)}</span>
                    <span>GK —</span>
                    <span>CK —</span>
                    <Badge tone="orange">Đang cập nhật</Badge>
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'yearly',
          label: 'Cả năm',
          Icon: TrendingUp,
          content: (
            <Section title={`TB cả năm tạm tính: ${avgYear}`} subtitle="Công thức (TB HK1 + 2 × TB HK2) / 3" wide>
              <ChartCard title="So sánh TB các môn" subtitle="HK1 vs ước tính HK2">
                <BarList
                  data={subjectScores.map((s) => ({ label: s.subject, value: Math.round(s.avg * 10) }))}
                  max={100}
                  suffix="%"
                />
              </ChartCard>
            </Section>
          ),
        },
        {
          id: 'subjects',
          label: 'Môn học',
          Icon: BookOpenCheck,
          content: (
            <Section title="Môn đang học" subtitle="Danh sách môn và giáo viên phụ trách" wide>
              <InfoGrid
                items={subjects.map((item) => ({
                  title: item.name,
                  value: item.code,
                  meta: `${item.teachers} GV · hệ số ${item.coefficient}`,
                }))}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function StudentAttendanceFeature() {
  return (
    <FunctionTabs
      tabs={[
        {
          id: 'week',
          label: 'Tuần này',
          Icon: ClipboardCheck,
          content: (
            <div className="feature-grid">
              <ChartCard title="Tỉ lệ có mặt theo ngày" subtitle="6 ngày làm việc gần nhất">
                <ColumnChart data={attendanceTrend} max={100} suffix="%" />
              </ChartCard>
              <Section title="Tiết học tuần này" subtitle="Cập nhật theo điểm danh của GV">
                <AttendanceHistory />
              </Section>
            </div>
          ),
        },
        {
          id: 'month',
          label: 'Tháng này',
          Icon: ClipboardList,
          content: (
            <Section title="Tổng kết tháng 05/2026" subtitle="Có mặt · Trễ · Vắng" wide>
              <InfoGrid
                items={[
                  { title: 'Có mặt', value: '18 buổi', meta: '90%' },
                  { title: 'Trễ', value: '1', meta: '5%' },
                  { title: 'Vắng phép', value: '1', meta: '5%' },
                  { title: 'Vắng KP', value: '0', meta: '—' },
                ]}
              />
            </Section>
          ),
        },
        {
          id: 'semester',
          label: 'Học kỳ',
          Icon: History,
          content: (
            <Section title="Học kỳ 2 — 2025/2026" subtitle="Tổng hợp đầy đủ kèm ghi chú GV" wide>
              <AttendanceHistory />
            </Section>
          ),
        },
        {
          id: 'leave',
          label: 'Xin phép',
          Icon: Mail,
          content: (
            <Section title="Đơn xin phép nghỉ" subtitle="Mẫu luồng gửi lý do vắng tới GVCN" wide>
              <FormPreview
                rows={[
                  ['Ngày nghỉ', '23/05/2026'],
                  ['Buổi/tiết', 'Sáng · tiết 1-3'],
                  ['Lý do', 'Khám sức khỏe định kỳ'],
                  ['Trạng thái', 'Chờ GVCN duyệt'],
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

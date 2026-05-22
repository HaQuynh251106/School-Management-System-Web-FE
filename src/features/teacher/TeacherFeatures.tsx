import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Bell, CalendarDays, CheckCircle2, ClipboardCheck, ClipboardList, Clock3, Eye, FileSpreadsheet, School, Send, Settings, ShieldCheck, Users } from 'lucide-react';
import { assignments, gradeChangeLogs, initialAttendance, initialGrades, roster, teacherClasses, timetable } from '../../data/mockData';
import type { AttendanceStatus } from '../../types';
import { BarList, ChartCard } from '../../components/charts';
import { Badge, CommandButton, FunctionTabs, InfoGrid, ProcessList, Section, StatusPill } from '../../components/ui';
import { ScoreConfigFeature } from '../admin/AdminFeatures';
import { AttendanceEditor, AttendanceHistory, GradeEditor, RosterList, TeacherClassList } from '../shared/FeatureWidgets';

export function TeacherClassesFeature() {
  const activeClass = teacherClasses[0];

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'classes',
          label: `Lớp dạy (${teacherClasses.length})`,
          Icon: School,
          content: (
            <Section title="Lớp đang dạy" subtitle="Teacher-Class-Subject Assignment" wide>
              <TeacherClassList />
            </Section>
          ),
        },
        {
          id: 'detail',
          label: `Chi tiết ${activeClass.className}`,
          Icon: Eye,
          content: (
            <Section
              title={`Lớp ${activeClass.className} — ${activeClass.subject}`}
              subtitle={`GVCN ${activeClass.semester} · ${activeClass.students} HS · ${activeClass.nextSlot}`}
              action={<CommandButton Icon={FileSpreadsheet} label="Xuất danh sách" />}
              wide
            >
              <div className="feature-grid">
                <div>
                  <InfoGrid
                    items={[
                      { title: 'Sĩ số', value: `${activeClass.students} HS`, meta: 'class_enrollments active' },
                      { title: 'Học kỳ', value: activeClass.semester, meta: 'TKB đang phát hành' },
                      { title: 'Tiết kế tiếp', value: activeClass.nextSlot, meta: 'Tự động lấy từ TKB' },
                      { title: 'Tỷ lệ chuyên cần', value: '94%', meta: 'Tuần này' },
                    ]}
                  />
                </div>
                <Section title="Danh sách HS lớp" subtitle="Roster gọn cho lớp đang chọn">
                  <RosterList />
                </Section>
              </div>
            </Section>
          ),
        },
        {
          id: 'roster',
          label: 'Roster',
          Icon: Users,
          content: (
            <Section title={`Danh sách học sinh ${activeClass.className}`} subtitle="Tìm kiếm và mở hồ sơ HS" wide>
              <RosterList />
            </Section>
          ),
        },
        {
          id: 'timetable',
          label: 'TKB lớp',
          Icon: CalendarDays,
          content: (
            <Section title={`TKB tuần — ${activeClass.className}`} subtitle="Lịch chi tiết theo ngày + tiết" wide>
              <div className="timetable" role="table" aria-label="Thời khóa biểu lớp">
                <div className="time-head empty-cell" />
                {['T2', 'T3', 'T4', 'T5', 'T6'].map((day) => (
                  <div key={day} className="time-head">{day}</div>
                ))}
                {timetable.map((row, rowIdx) => [
                  <div key={`p-${rowIdx}`} className="time-period">Tiết {rowIdx + 1}</div>,
                  ...row.map((cell, cellIdx) => (
                    <div key={`${rowIdx}-${cellIdx}`} className={`time-cell ${cell.includes('trùng') ? 'conflict' : ''}`}>
                      <strong>{cell}</strong>
                    </div>
                  )),
                ])}
              </div>
            </Section>
          ),
        },
        {
          id: 'progress',
          label: 'Tiến độ',
          Icon: BarChart3,
          content: (
            <div className="feature-grid">
              <ChartCard title="Tiến độ nộp bài" subtitle="Theo lớp giáo viên phụ trách">
                <BarList data={assignments.map((item) => ({ label: item.className, value: Math.round((item.submitted / item.total) * 100) }))} max={100} suffix="%" />
              </ChartCard>
              <ChartCard title="Phổ điểm lớp" subtitle="Dữ liệu mẫu theo điểm miệng">
                <BarList data={roster.map((student) => ({ label: student.name, value: Math.round((initialGrades[student.id] ?? 0) * 10) }))} max={100} suffix="%" />
              </ChartCard>
            </div>
          ),
        },
      ]}
    />
  );
}

export function TeacherAttendanceFeature() {
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(initialAttendance);
  const absentCount = Object.values(attendance).filter((status) => status === 'absent').length;
  const lateCount = Object.values(attendance).filter((status) => status === 'late').length;

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'today',
          label: 'Hôm nay',
          Icon: Clock3,
          content: (
            <Section title="Tổng quan tiết học" subtitle="Ngày 22/05/2026" wide>
              <div className="lesson-summary">
                <div>
                  <Clock3 size={19} />
                  <strong>Tiết 2</strong>
                  <span>10A1 · Toán · P201</span>
                </div>
                <div>
                  <AlertTriangle size={19} />
                  <strong>{absentCount} vắng</strong>
                  <span>{lateCount} trễ</span>
                </div>
                <div>
                  <Send size={19} />
                  <strong>Push</strong>
                  <span>Gửi cảnh báo PH</span>
                </div>
              </div>
            </Section>
          ),
        },
        {
          id: 'mark',
          label: 'Điểm danh',
          Icon: ClipboardCheck,
          content: (
            <Section
              title="Sổ điểm danh"
              subtitle="Bulk submit attendance_records, publish academic.attendance.absent"
              action={<CommandButton Icon={Send} label="Gửi điểm danh" />}
              wide
            >
              <AttendanceEditor attendance={attendance} onChange={setAttendance} />
            </Section>
          ),
        },
        {
          id: 'history',
          label: 'Lịch sử',
          Icon: ClipboardList,
          content: (
            <Section title="Lịch sử chuyên cần" subtitle="Các bản ghi theo tiết học gần nhất" wide>
              <AttendanceHistory />
            </Section>
          ),
        },
        {
          id: 'alerts',
          label: 'Cảnh báo PH',
          Icon: Bell,
          content: (
            <Section title="Cảnh báo tự động" subtitle="Sự kiện absent được gửi tới Notification Service" wide>
              <ProcessList
                items={[
                  'Bulk insert attendance_records theo tiết học.',
                  'Tạo event academic.attendance.absent cho từng học sinh vắng.',
                  'Lookup parent_student_relations để tìm phụ huynh.',
                  'Gửi push/email/in-app theo preference của từng phụ huynh.',
                ]}
              />
            </Section>
          ),
        },
      ]}
    />
  );
}

export function TeacherGradesFeature() {
  const [grades, setGrades] = useState<Record<string, number>>(initialGrades);
  const avgScore = useMemo(() => {
    const values = Object.values(grades);
    return (values.reduce((total, value) => total + value, 0) / values.length).toFixed(1);
  }, [grades]);

  return (
    <FunctionTabs
      tabs={[
        {
          id: 'input',
          label: 'Nhập điểm',
          Icon: CheckCircle2,
          content: (
            <Section
              title="Bảng điểm"
              subtitle="Nhập/sửa điểm có ghi grade_change_logs"
              action={<CommandButton Icon={CheckCircle2} label="Lưu điểm" />}
              wide
            >
              <GradeEditor grades={grades} onChange={setGrades} />
            </Section>
          ),
        },
        {
          id: 'distribution',
          label: 'Phổ điểm',
          Icon: BarChart3,
          content: (
            <ChartCard title="Phổ điểm lớp" subtitle={`Điểm miệng trung bình ${avgScore}`}>
              <BarList data={roster.map((student) => ({ label: student.name, value: Math.round((grades[student.id] ?? 0) * 10) }))} max={100} suffix="%" />
            </ChartCard>
          ),
        },
        {
          id: 'logs',
          label: 'Log sửa điểm',
          Icon: ShieldCheck,
          content: (
            <Section title="Grade change logs" subtitle="Mọi lần sửa điểm được lưu old_score, new_score và reason" wide>
              <div className="compact-table">
                {gradeChangeLogs.map((item) => (
                  <div key={`${item.student}-${item.reason}`}>
                    <strong>{item.student}</strong>
                    <span>{item.from} → {item.to}</span>
                    <span>{item.reason}</span>
                    <small>{item.by}</small>
                  </div>
                ))}
              </div>
            </Section>
          ),
        },
        {
          id: 'config',
          label: 'Loại điểm',
          Icon: Settings,
          content: <ScoreConfigFeature />,
        },
      ]}
    />
  );
}

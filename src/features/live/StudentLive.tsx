import { useState } from 'react';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import type { Grade, Semester, AttendanceRecord } from '../../api/types';
import { Section, FunctionTabs, StatusPill, InfoGrid } from '../../components/ui';
import { Async, ATT_LABEL, fmtDate } from './common';
import { WeeklyTimetable } from './SharedLive';
import { CalendarDays, BookOpen } from 'lucide-react';

/* ===== C1 — Hồ sơ ===== */
export function StudentProfileLive() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <Section title="Hồ sơ cá nhân (C1)" subtitle="Dữ liệu thật từ /me" wide>
      <InfoGrid items={[
        { title: 'Họ tên', value: user.fullName, meta: '@' + user.username },
        { title: 'Mã học sinh', value: user.studentCode || '—', meta: 'student_code' },
        { title: 'Lớp', value: user.className || '—', meta: user.classId || '' },
        { title: 'Email', value: user.email || '—', meta: user.phone || '' },
      ]} />
    </Section>
  );
}

/* ===== C2 — Theo dõi học thuật ===== */
export function StudentAcademicLive() {
  const semesters = useApi<Semester[]>('/semesters');
  const [sem, setSem] = useState('');
  const effSem = sem || semesters.data?.[0]?.id || '';
  const grades = useApi<Grade[]>(effSem ? `/grades?semesterId=${effSem}` : null);

  return (
    <FunctionTabs tabs={[
      { id: 'tkb', label: 'Thời khóa biểu', Icon: CalendarDays, content: (
        <Section title="Thời khóa biểu (C2)" subtitle="/me/timetable" wide><WeeklyTimetable path="/me/timetable" /></Section>
      ) },
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Bảng điểm học kỳ" subtitle="/grades (tự động giới hạn theo HS đăng nhập)" wide>
          <div className="live-toolbar">
            <select className="live-select" value={effSem} onChange={(e) => setSem(e.target.value)}>
              {(semesters.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <Async state={grades} empty="Chưa có điểm trong học kỳ này">
            {(l) => (
              <table className="live-table">
                <thead><tr><th>Môn</th><th>Loại điểm</th><th>Điểm</th><th>Ngày</th></tr></thead>
                <tbody>{l.map((g) => (
                  <tr key={g.id}><td><strong>{g.subjectName}</strong></td><td>{g.categoryName}</td>
                    <td><strong>{g.score?.toFixed(1)}</strong></td><td>{fmtDate(g.recordedAt)}</td></tr>
                ))}</tbody>
              </table>
            )}
          </Async>
        </Section>
      ) },
    ]} />
  );
}

/* ===== C3 — Chuyên cần ===== */
export function StudentAttendanceLive() {
  const att = useApi<AttendanceRecord[]>('/attendance');
  return (
    <Section title="Chuyên cần cá nhân (C3)" subtitle="/attendance (tự động theo HS đăng nhập)" wide>
      <Async state={att} empty="Chưa có dữ liệu điểm danh">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Ngày</th><th>Tiết</th><th>Môn</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
            <tbody>{l.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((r) => (
              <tr key={r.id}><td>{fmtDate(r.date)}</td><td>{r.periodNo ?? '—'}</td><td>{r.subjectName}</td>
                <td><StatusPill value={ATT_LABEL[r.status] || r.status} /></td><td><small>{r.note || '—'}</small></td></tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}

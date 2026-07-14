import { useMemo, useState } from 'react';
import { useApi } from '../../api/useApi';
import { useAuth } from '../../api/auth';
import type { Grade, Semester, AttendanceRecord, ExamCategory } from '../../api/types';
import { Section, FunctionTabs, StatusPill, InfoGrid } from '../../components/ui';
import { Async, ATT_LABEL, fmtDate } from './common';
import { WeeklyTimetable } from './SharedLive';
import { BarChart3, BookOpen, CalendarDays, CheckCircle2, Trophy } from 'lucide-react';
import { formatScore, gradeColumns, scoreTone, weightedAverage } from './gradebook';

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
  const categories = useApi<ExamCategory[]>('/exam-categories');
  const [sem, setSem] = useState('');
  const effSem = sem || semesters.data?.[0]?.id || '';
  const grades = useApi<Grade[]>(effSem ? `/grades?semesterId=${effSem}` : null);

  const categoryList = useMemo<ExamCategory[]>(() => {
    if (categories.data?.length) return categories.data;
    const unique = new Map<string, ExamCategory>();
    (grades.data || []).forEach((grade) => unique.set(grade.category, {
      id: grade.category,
      code: grade.category,
      name: grade.categoryName,
      weight: 1,
    }));
    return [...unique.values()];
  }, [categories.data, grades.data]);

  const subjectRows = useMemo(() => {
    const grouped = new Map<string, { subjectId: string; subjectName: string; grades: Grade[] }>();
    (grades.data || []).forEach((grade) => {
      const row = grouped.get(grade.subjectId) || { subjectId: grade.subjectId, subjectName: grade.subjectName, grades: [] };
      row.grades.push(grade);
      grouped.set(grade.subjectId, row);
    });
    return [...grouped.values()].map((row) => ({ ...row, average: weightedAverage(row.grades, categoryList) }));
  }, [grades.data, categoryList]);
  const columns = useMemo(() => gradeColumns(categoryList), [categoryList]);

  const subjectAverages = subjectRows.map((row) => row.average).filter((score): score is number => score != null);
  const semesterAverage = subjectAverages.length
    ? Math.round((subjectAverages.reduce((total, score) => total + score, 0) / subjectAverages.length) * 10) / 10
    : null;
  const bestSubject = subjectRows.reduce<(typeof subjectRows)[number] | null>((best, row) => (
    row.average != null && (!best || best.average == null || row.average > best.average) ? row : best
  ), null);

  return (
    <FunctionTabs tabs={[
      { id: 'tkb', label: 'Thời khóa biểu', Icon: CalendarDays, content: (
        <Section title="Thời khóa biểu (C2)" subtitle="/me/timetable" wide><WeeklyTimetable path="/me/timetable" /></Section>
      ) },
      { id: 'grades', label: 'Điểm', Icon: BookOpen, content: (
        <Section title="Bảng điểm học kỳ" subtitle="Tổng hợp theo từng đầu điểm và hệ số đã cấu hình" wide
          action={<select className="live-select gradebook-semester-select" aria-label="Chọn học kỳ" value={effSem} onChange={(e) => setSem(e.target.value)}>
            {(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
          </select>}>
          <Async state={grades} empty="Chưa có điểm trong học kỳ này">
            {(l) => (
              <div className="gradebook-shell">
                <div className="gradebook-summary student-grade-summary">
                  <article className="gradebook-stat primary"><span><BarChart3 size={19} /></span><div><small>Trung bình học kỳ</small><strong>{formatScore(semesterAverage)}</strong><p>Trung bình {subjectAverages.length} môn có điểm</p></div></article>
                  <article className="gradebook-stat"><span><Trophy size={19} /></span><div><small>Môn nổi bật</small><strong>{bestSubject?.subjectName || '—'}</strong><p>{bestSubject?.average != null ? `${formatScore(bestSubject.average)} điểm` : 'Chưa đủ dữ liệu'}</p></div></article>
                  <article className="gradebook-stat"><span><CheckCircle2 size={19} /></span><div><small>Đầu điểm đã có</small><strong>{l.length}</strong><p>{subjectRows.length} môn học trong kỳ</p></div></article>
                </div>

                <div className="gradebook-legend"><span><i className="score-dot excellent" /> Tốt</span><span><i className="score-dot average" /> Đạt</span><span><i className="score-dot needs-attention" /> Cần cải thiện</span></div>

                <div className="gradebook-table-wrap">
                  <table className="gradebook-table student-gradebook-table">
                    <thead><tr>
                      <th className="gradebook-sticky-col">Môn học</th>
                      {columns.map((column) => <th key={`${column.category.code}-${column.assessmentIndex}`}><span>{column.label}</span><small>Hệ số {column.category.weight}</small></th>)}
                      <th className="gradebook-total-head">Tổng kết</th>
                    </tr></thead>
                    <tbody>{subjectRows.map((row) => (
                      <tr key={row.subjectId}>
                        <td className="gradebook-sticky-col"><strong>{row.subjectName}</strong><small>{columns.filter((column) => row.grades.some((item) => item.category === column.category.code && (item.assessmentIndex ?? 1) === column.assessmentIndex)).length}/{columns.length} đầu điểm</small></td>
                        {columns.map((column) => {
                          const grade = row.grades.find((item) => item.category === column.category.code && (item.assessmentIndex ?? 1) === column.assessmentIndex);
                          const score = grade?.score ?? null;
                          return <td key={`${column.category.code}-${column.assessmentIndex}`}><span className={`grade-score ${scoreTone(score)}`} title={grade?.recordedAt ? `Cập nhật ${fmtDate(grade.recordedAt)}` : 'Chưa có điểm'}>{formatScore(score)}</span></td>;
                        })}
                        <td className="gradebook-total-cell"><strong className={`grade-total ${scoreTone(row.average)}`}>{row.average == null ? '' : formatScore(row.average)}</strong><small>{row.average == null ? 'Chưa đủ điểm' : 'Thang 10'}</small></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
                <p className="gradebook-note">Điểm tổng kết chỉ hiển thị khi đủ điểm miệng, điểm 15 phút, điểm giữa kỳ và cuối kỳ. Thiếu đầu điểm nào thì tổng kết để trống.</p>
              </div>
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

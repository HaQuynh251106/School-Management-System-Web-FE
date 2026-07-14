import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CheckCircle2, Send, Trophy, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { ApiUser, SchoolClass, Semester, ExamCategory, TimetableSlot, Grade, TeacherGradebookContext } from '../../api/types';
import { Section } from '../../components/ui';
import { Async, useToast, ATT_LABEL, DAY_LABEL } from './common';
import { formatScore, gradeColumns, gradeKey, scoreTone, weightedAverage } from './gradebook';

const TODAY = new Date().toISOString().slice(0, 10);
const ATT_STATES = ['PRESENT', 'LATE', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED'];

/* ===== B1 — Lớp được phân công ===== */
export function TeacherClassesLive() {
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const classesApi = useApi<SchoolClass[]>('/classes');
  const [classId, setClassId] = useState('');
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);

  const classMap = useMemo(() => {
    const m: Record<string, SchoolClass> = {};
    (classesApi.data || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [classesApi.data]);

  const groups = useMemo(() => {
    const g: Record<string, { classId: string; subjects: Set<string>; count: number }> = {};
    (slots.data || []).forEach((s) => {
      g[s.classId] = g[s.classId] || { classId: s.classId, subjects: new Set(), count: 0 };
      g[s.classId].subjects.add(s.subjectName);
      g[s.classId].count++;
    });
    return Object.values(g);
  }, [slots.data]);

  return (
    <Section title="Lớp được phân công (B1)" subtitle="Suy ra từ TKB cá nhân · /me/timetable" wide>
      <Async state={slots} empty="Chưa được phân công lớp nào">
        {() => (
          <table className="live-table">
            <thead><tr><th>Lớp</th><th>Môn dạy</th><th>Số tiết/tuần</th><th></th></tr></thead>
            <tbody>
              {groups.map((g) => (
                <tr key={g.classId} style={{ background: classId === g.classId ? '#f1f5fd' : undefined }}>
                  <td><strong>{classMap[g.classId]?.code || g.classId}</strong></td>
                  <td>{[...g.subjects].join(', ')}</td>
                  <td>{g.count}</td>
                  <td><button className="live-btn subtle" onClick={() => setClassId(g.classId)}><Users size={14} /> Danh sách HS</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
      {classId && (
        <div style={{ marginTop: 14 }}>
          <Async state={students} empty="Lớp chưa có học sinh">
            {(l) => (
              <table className="live-table"><thead><tr><th>Mã HS</th><th>Họ tên</th><th>Lớp</th></tr></thead>
                <tbody>{l.map((s) => <tr key={s.id}><td>{s.studentCode}</td><td><strong>{s.fullName}</strong></td><td>{s.className}</td></tr>)}</tbody></table>
            )}
          </Async>
        </div>
      )}
    </Section>
  );
}

/* ===== B3 — Sổ điểm danh ===== */
export function TeacherAttendanceLive() {
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState(TODAY);
  const toast = useToast();
  const slot = (slots.data || []).find((s) => s.id === slotId);
  const students = useApi<ApiUser[]>(slot ? `/classes/${slot.classId}/students` : null);
  const [marks, setMarks] = useState<Record<string, string>>({});

  useEffect(() => {
    if (students.data) setMarks(Object.fromEntries(students.data.map((s) => [s.id, 'PRESENT'])));
  }, [students.data]);

  const submit = async () => {
    if (!slot) return toast.show('err', 'Chọn tiết học');
    try {
      const body = { slotId, date, marks: (students.data || []).map((s) => ({ studentId: s.id, status: marks[s.id] || 'PRESENT' })) };
      await api.post('/attendance/bulk', body);
      const absent = Object.values(marks).filter((v) => v !== 'PRESENT').length;
      toast.show('ok', `Đã lưu điểm danh. ${absent} HS vắng/trễ → đã gửi cảnh báo phụ huynh.`);
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Sổ điểm danh (B3)" subtitle="Bulk submit → backend tự cảnh báo PH (flowchart 2.5)" wide
      action={<button className="live-btn" onClick={submit}><Send size={15} /> Gửi điểm danh</button>}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select grow" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
          <option value="">— Chọn tiết —</option>
          {(slots.data || []).map((s) => (
            <option key={s.id} value={s.id}>{DAY_LABEL[s.dayOfWeek]} · Tiết {s.periodNo} · {s.subjectName} · {s.classId}</option>
          ))}
        </select>
        <input className="live-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </div>
      {!slot ? <div className="live-loading">Chọn một tiết để điểm danh.</div> : (
        <Async state={students} empty="Lớp chưa có học sinh">
          {(l) => (
            <table className="live-table">
              <thead><tr><th>Học sinh</th><th>Trạng thái</th></tr></thead>
              <tbody>
                {l.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.fullName}</strong> <small style={{ color: 'var(--muted)' }}>{s.studentCode}</small></td>
                    <td>
                      <div className="seg">
                        {ATT_STATES.map((st) => {
                          const on = (marks[s.id] || 'PRESENT') === st;
                          const cls = st === 'PRESENT' ? 'on-present' : st === 'LATE' ? 'on-late' : 'on-absent';
                          return <button key={st} className={on ? cls : ''} onClick={() => setMarks({ ...marks, [s.id]: st })}>{ATT_LABEL[st]}</button>;
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Async>
      )}
    </Section>
  );
}

/* ===== B4 — Bảng điểm ===== */
export function TeacherGradesLive() {
  const { user } = useAuth();
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const classes = useApi<SchoolClass[]>('/classes');
  const semesters = useApi<Semester[]>('/semesters');
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();

  const classOpts = useMemo(() => {
    const m: Record<string, true> = {};
    const mainSubject = user?.mainSubject?.trim().toLocaleLowerCase('vi');
    (slots.data || [])
      .filter((slot) => !mainSubject || slot.subjectName.trim().toLocaleLowerCase('vi') === mainSubject)
      .forEach((slot) => (m[slot.classId] = true));
    return Object.keys(m);
  }, [slots.data, user?.mainSubject]);

  const [classId, setClassId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!classId && classOpts.length) setClassId(classOpts[0]);
  }, [classId, classOpts]);

  useEffect(() => {
    if (!semesterId && semesters.data?.length) {
      setSemesterId(semesters.data.find((semester) => semester.status === 'ACTIVE')?.id || semesters.data[0].id);
    }
  }, [semesterId, semesters.data]);

  const gradebookContext = useApi<TeacherGradebookContext>(classId && semesterId
    ? `/me/gradebook-context?classId=${encodeURIComponent(classId)}&semesterId=${encodeURIComponent(semesterId)}`
    : null);
  const contextMatches = gradebookContext.data?.classId === classId && gradebookContext.data?.semesterId === semesterId;
  const subjectId = contextMatches ? gradebookContext.data?.subjectId || '' : '';
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);
  const existing = useApi<Grade[]>(
    classId && subjectId && semesterId
      ? `/grades?classId=${classId}&semesterId=${semesterId}`
      : null,
  );
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    (existing.data || []).forEach((grade) => (m[gradeKey(grade.studentId, grade.category, grade.assessmentIndex ?? 1)] = String(grade.score)));
    setScores(m);
  }, [existing.data]);

  const ready = Boolean(classId && semesterId && subjectId && cats.data?.length);
  const classMap = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item.code])), [classes.data]);
  const subjectName = contextMatches ? gradebookContext.data?.subjectName || '' : user?.mainSubject || '';
  const columns = useMemo(() => gradeColumns(cats.data || []), [cats.data]);
  const gradeVersions = useMemo(() => new Map((existing.data || []).map((grade) => [
    gradeKey(grade.studentId, grade.category, grade.assessmentIndex ?? 1),
    grade.version,
  ])), [existing.data]);

  const gradeRows = useMemo(() => (students.data || []).map((student) => {
    const values = columns.flatMap((column) => {
      const value = scores[gradeKey(student.id, column.category.code, column.assessmentIndex)];
      return value === undefined || value === '' ? [] : [{
        category: column.category.code,
        assessmentIndex: column.assessmentIndex,
        score: Number(value),
      }];
    });
    return { student, values, average: weightedAverage(values, cats.data || []) };
  }), [students.data, cats.data, columns, scores]);

  const averages = gradeRows.map((row) => row.average).filter((score): score is number => score != null);
  const classAverage = averages.length
    ? Math.round((averages.reduce((total, score) => total + score, 0) / averages.length) * 10) / 10
    : null;
  const highest = averages.length ? Math.max(...averages) : null;
  const totalCells = gradeRows.length * columns.length;
  const completedCells = gradeRows.reduce((total, row) => total + row.values.length, 0);
  const completion = totalCells ? Math.round((completedCells / totalCells) * 100) : 0;

  const submit = async () => {
    if (!ready) return toast.show('err', 'Chọn đủ Lớp / Học kỳ để hệ thống xác định môn mặc định');
    const invalid = Object.values(scores).some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10));
    if (invalid) return toast.show('err', 'Điểm phải nằm trong khoảng 0 đến 10');

    const batches = columns.map((column) => ({
      column,
      entries: (students.data || [])
        .filter((student) => scores[gradeKey(student.id, column.category.code, column.assessmentIndex)] !== undefined && scores[gradeKey(student.id, column.category.code, column.assessmentIndex)] !== '')
        .map((student) => {
          const key = gradeKey(student.id, column.category.code, column.assessmentIndex);
          return { studentId: student.id, score: Number(scores[key]), expectedVersion: gradeVersions.get(key) };
        }),
    })).filter((batch) => batch.entries.length);
    const entryCount = batches.reduce((total, batch) => total + batch.entries.length, 0);
    if (!entryCount) return toast.show('err', 'Chưa nhập đầu điểm nào');

    try {
      await Promise.all(batches.map((batch) => api.post('/grades/bulk', {
        classId,
        semesterId,
        category: batch.column.category.code,
        assessmentIndex: batch.column.assessmentIndex,
        reason,
        entries: batch.entries,
      })));
      toast.show('ok', `Đã lưu ${entryCount} đầu điểm và cập nhật tổng kết học kỳ.`);
      existing.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Sổ điểm học kỳ" subtitle="Nhập điểm theo từng đầu điểm và tự động tính tổng kết theo hệ số" wide
      action={<button className="live-btn gradebook-save" onClick={submit} disabled={!ready}><Send size={15} /> Lưu sổ điểm</button>}>
      {toast.node}
      <div className="gradebook-filterbar">
        <label><span>Lớp giảng dạy</span><select className="live-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Chọn lớp —</option>{classOpts.map((id) => <option key={id} value={id}>{classMap.get(id) || id}</option>)}
        </select></label>
        <label><span>Học kỳ</span><select className="live-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">— Chọn học kỳ —</option>{(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
        </select></label>
        <div className="gradebook-auto-subject"><span>Môn mặc định</span><strong>{gradebookContext.loading ? 'Đang xác định…' : subjectName || '—'}</strong><small>Tự động theo phân công giảng dạy</small></div>
        <label className="gradebook-reason"><span>Lý do điều chỉnh (nếu có)</span><input className="live-input" placeholder="Ví dụ: cập nhật sau phúc khảo" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      </div>

      {!ready ? <div className="gradebook-onboarding"><BarChart3 size={26} /><strong>Chọn lớp và học kỳ</strong><span>{gradebookContext.error || 'Môn học sẽ được hệ thống tự động xác định theo hồ sơ và phân công của giáo viên.'}</span></div> : existing.loading ? <div className="live-loading">Đang tải sổ điểm…</div> : (
        <Async state={students} empty="Lớp chưa có học sinh">
          {(list) => (
            <div className="gradebook-shell">
              <div className="gradebook-context"><div><small>Đang xem</small><strong>{classMap.get(classId) || classId} · {subjectName}</strong></div><span>{columns.length} đầu điểm · Hệ số tự động</span></div>

              <div className="gradebook-summary">
                <article className="gradebook-stat primary"><span><BarChart3 size={19} /></span><div><small>Trung bình lớp</small><strong>{formatScore(classAverage)}</strong><p>{averages.length}/{list.length} học sinh có điểm</p></div></article>
                <article className="gradebook-stat"><span><Trophy size={19} /></span><div><small>Điểm cao nhất</small><strong>{formatScore(highest)}</strong><p>Theo tổng kết hiện tại</p></div></article>
                <article className="gradebook-stat"><span><CheckCircle2 size={19} /></span><div><small>Tiến độ nhập</small><strong>{completion}%</strong><p>{completedCells}/{totalCells} đầu điểm</p></div></article>
              </div>

              <div className="gradebook-table-wrap">
                <table className="gradebook-table teacher-gradebook-table">
                  <thead><tr>
                    <th className="gradebook-sticky-col">Học sinh</th>
                    {columns.map((column) => <th key={`${column.category.code}-${column.assessmentIndex}`}><span>{column.label}</span><small>Hệ số {column.category.weight}</small></th>)}
                    <th className="gradebook-total-head">Tổng kết</th>
                    <th>Trạng thái</th>
                  </tr></thead>
                  <tbody>{gradeRows.map((row) => {
                    const missing = columns.length - row.values.length;
                    return <tr key={row.student.id}>
                      <td className="gradebook-sticky-col"><strong>{row.student.fullName}</strong><small>{row.student.studentCode || row.student.username}</small></td>
                      {columns.map((column) => {
                        const key = gradeKey(row.student.id, column.category.code, column.assessmentIndex);
                        return <td key={`${column.category.code}-${column.assessmentIndex}`}><input className={`gradebook-score-input ${scoreTone(scores[key] === undefined || scores[key] === '' ? null : Number(scores[key]))}`} aria-label={`${column.label} của ${row.student.fullName}`} type="number" min={0} max={10} step="0.1" placeholder="—" value={scores[key] ?? ''} onChange={(event) => setScores({ ...scores, [key]: event.target.value })} /></td>;
                      })}
                      <td className="gradebook-total-cell"><strong className={`grade-total ${scoreTone(row.average)}`}>{row.average == null ? '' : formatScore(row.average)}</strong><small>{row.average == null ? 'Chưa đủ điểm' : 'Thang 10'}</small></td>
                      <td><span className={`gradebook-completion ${missing ? 'incomplete' : 'complete'}`}>{missing ? `Thiếu ${missing}` : 'Đủ điểm'}</span></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <p className="gradebook-note">Tổng kết chỉ được tính khi đủ điểm miệng, điểm 15 phút, điểm giữa kỳ và cuối kỳ. Nếu thiếu bất kỳ đầu điểm nào, tổng kết để trống.</p>
            </div>
          )}
        </Async>
      )}
    </Section>
  );
}

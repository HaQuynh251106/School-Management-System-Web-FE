import { useEffect, useMemo, useState } from 'react';
import { Send, RefreshCw, School, ClipboardCheck, BarChart3, Users } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { ApiUser, SchoolClass, Subject, Semester, ExamCategory, TimetableSlot, Grade } from '../../api/types';
import { Section, FunctionTabs, Badge, StatusPill } from '../../components/ui';
import { Async, useToast, ATT_LABEL, DAY_LABEL } from './common';

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
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const subjects = useApi<Subject[]>('/subjects');
  const semesters = useApi<Semester[]>('/semesters');
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();

  const classOpts = useMemo(() => {
    const m: Record<string, true> = {};
    (slots.data || []).forEach((s) => (m[s.classId] = true));
    return Object.keys(m);
  }, [slots.data]);

  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [category, setCategory] = useState('');
  const [reason, setReason] = useState('');
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);
  const existing = useApi<Grade[]>(
    classId && subjectId && semesterId && category
      ? `/grades?classId=${classId}&subjectId=${subjectId}&semesterId=${semesterId}&category=${category}`
      : null,
  );
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    (existing.data || []).forEach((g) => (m[g.studentId] = String(g.score)));
    setScores(m);
  }, [existing.data]);

  const ready = classId && subjectId && semesterId && category;
  const submit = async () => {
    if (!ready) return toast.show('err', 'Chọn đủ Lớp / Môn / Học kỳ / Loại điểm');
    const entries = (students.data || [])
      .filter((s) => scores[s.id] !== undefined && scores[s.id] !== '')
      .map((s) => ({ studentId: s.id, score: Number(scores[s.id]) }));
    if (!entries.length) return toast.show('err', 'Chưa nhập điểm nào');
    try {
      await api.post('/grades/bulk', { subjectId, semesterId, category, reason, entries });
      toast.show('ok', `Đã lưu ${entries.length} điểm (HS/PH được thông báo, sửa điểm ghi log).`);
      existing.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Bảng điểm (B4)" subtitle="Nhập/sửa điểm → /grades/bulk · ghi grade_change_logs" wide
      action={<button className="live-btn" onClick={submit}><Send size={15} /> Lưu điểm</button>}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Lớp —</option>{classOpts.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="live-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
          <option value="">— Môn —</option>{(subjects.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="live-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">— Học kỳ —</option>{(semesters.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="live-select" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">— Loại điểm —</option>{(cats.data || []).map((c) => <option key={c.id} value={c.code}>{c.name}</option>)}
        </select>
        <input className="live-input grow" placeholder="Lý do sửa (nếu có)" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>
      {!ready ? <div className="live-loading">Chọn Lớp / Môn / Học kỳ / Loại điểm để nhập.</div> : (
        <Async state={students} empty="Lớp chưa có học sinh">
          {(l) => (
            <table className="live-table">
              <thead><tr><th>Học sinh</th><th>Điểm (0–10)</th></tr></thead>
              <tbody>{l.map((s) => (
                <tr key={s.id}>
                  <td><strong>{s.fullName}</strong> <small style={{ color: 'var(--muted)' }}>{s.studentCode}</small></td>
                  <td><input className="score-input" type="number" min={0} max={10} step="0.1"
                    value={scores[s.id] ?? ''} onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })} /></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </Async>
      )}
    </Section>
  );
}

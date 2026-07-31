import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck, CalendarClock, CheckCircle2, ClipboardPenLine, DoorOpen, Lock, Megaphone, Pencil,
  Plus, RefreshCw, Save, ShieldCheck, Trash2, Unlock, UsersRound, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, ApiUser, EligibleExamGrader, ExamCandidate, ExamGradingAssignment,
  ExamPeriod, ExamPeriodSummary, ExamRoom, ExamSchedule, Room, SchoolClass, Semester, Subject,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';
import { AdminExamCategoriesLive } from './AdminLive';
import { useHashString } from '../../api/urlState';

const today = new Date().toISOString().slice(0, 10);
const blankSchedule = (date = today) => ({ subjectId: '', classIds: [] as string[], examDate: date, startTime: '07:30', durationMinutes: 90, notes: '' });
type ExamSetupStep = 'rooms' | 'candidates' | 'graders';

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function schedulesOverlap(first: Pick<ExamSchedule, 'examDate' | 'startTime' | 'durationMinutes'>, second: Pick<ExamSchedule, 'examDate' | 'startTime' | 'durationMinutes'>) {
  if (first.examDate !== second.examDate) return false;
  const firstStart = toMinutes(first.startTime);
  const secondStart = toMinutes(second.startTime);
  return firstStart < secondStart + second.durationMinutes && secondStart < firstStart + first.durationMinutes;
}

export function AdminExamsLive() {
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const schoolRooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const periods = useApi<ExamPeriodSummary[]>('/exam-periods');
  const [periodId, setPeriodId] = useHashString('exam_period', '');
  const [scheduleId, setScheduleId] = useState('');
  const schedules = useApi<ExamSchedule[]>(periodId ? `/exam-periods/${periodId}/schedules` : null);
  const rooms = useApi<ExamRoom[]>(scheduleId ? `/exam-schedules/${scheduleId}/rooms` : null);
  const graders = useApi<ExamGradingAssignment[]>(scheduleId ? `/exam-schedules/${scheduleId}/graders` : null);
  const eligibleGraders = useApi<EligibleExamGrader[]>(scheduleId ? `/exam-schedules/${scheduleId}/eligible-graders` : null);
  const candidates = useApi<ExamCandidate[]>(periodId
    ? `/exam-periods/${periodId}/candidates${scheduleId ? `?scheduleId=${scheduleId}` : ''}` : null);

  const selectedSummary = periods.data?.find((item) => item.period.id === periodId);
  const selectedPeriod = selectedSummary?.period;
  const selectedSchedule = schedules.data?.find((item) => item.id === scheduleId);
  const [periodForm, setPeriodForm] = useState({ code: '', name: '', academicYearId: '', semesterId: '', gradeLevel: '', startDate: today, endDate: today });
  const [editingPeriodId, setEditingPeriodId] = useState('');
  const [scheduleForm, setScheduleForm] = useState(blankSchedule());
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [roomForm, setRoomForm] = useState({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
  const [editingRoomId, setEditingRoomId] = useState('');
  const [allocationClassId, setAllocationClassId] = useState('');
  const [allocationRoomId, setAllocationRoomId] = useState('');
  const [graderForm, setGraderForm] = useState({ classId: '', teacherId: '' });
  const [setupStep, setSetupStep] = useState<ExamSetupStep>('rooms');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!periodId && periods.data?.length) setPeriodId(periods.data[0].period.id);
  }, [periodId, periods.data, setPeriodId]);
  useEffect(() => {
    if (scheduleId && !schedules.data?.some((item) => item.id === scheduleId)) setScheduleId('');
  }, [scheduleId, schedules.data]);
  useEffect(() => {
    setEditingRoomId('');
    setAllocationRoomId('');
    setAllocationClassId('');
    setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
    setGraderForm({ classId: '', teacherId: '' });
    setSetupStep('rooms');
  }, [scheduleId]);
  useEffect(() => {
    setEditingScheduleId('');
    setScheduleForm(blankSchedule(selectedPeriod?.startDate || today));
  }, [periodId, selectedPeriod?.startDate]);

  const semesterOptions = (semesters.data || []).filter((item) => !periodForm.academicYearId || item.academicYearId === periodForm.academicYearId);
  const gradeOptions = useMemo(() => [...new Set((classes.data || []).map((item) => item.gradeLevel).filter(Boolean))].sort(), [classes.data]);
  const eligibleClasses = useMemo(() => (classes.data || []).filter((item) => !selectedPeriod?.gradeLevel || item.gradeLevel === selectedPeriod.gradeLevel), [classes.data, selectedPeriod]);
  const classById = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item])), [classes.data]);
  const selectedScheduleClasses = useMemo(
    () => eligibleClasses.filter((item) => (selectedSchedule?.classIds || []).includes(item.id)),
    [eligibleClasses, selectedSchedule],
  );
  const candidatesByClass = useMemo(() => {
    const counts = new Map<string, number>();
    for (const candidate of candidates.data || []) {
      counts.set(candidate.classId, (counts.get(candidate.classId) || 0) + 1);
    }
    return counts;
  }, [candidates.data]);
  const candidateRoomsByClass = useMemo(() => {
    const roomNames = new Map((rooms.data || []).map((room) => [room.id, room.roomCode]));
    const grouped = new Map<string, Set<string>>();
    for (const candidate of candidates.data || []) {
      const roomCode = roomNames.get(candidate.examRoomId);
      if (!roomCode) continue;
      const current = grouped.get(candidate.classId) || new Set<string>();
      current.add(roomCode);
      grouped.set(candidate.classId, current);
    }
    return new Map([...grouped].map(([classId, values]) => [classId, [...values].join(', ')]));
  }, [candidates.data, rooms.data]);
  const allocatedClassCount = selectedScheduleClasses.filter((item) => (candidatesByClass.get(item.id) || 0) > 0).length;
  const assignedGraderCount = selectedScheduleClasses.filter((item) =>
    (graders.data || []).some((assignment) => assignment.classId === item.id)).length;
  const readyRoomCount = (rooms.data || []).filter((room) => !!room.proctorOneId).length;
  const roomsReady = !!rooms.data?.length && readyRoomCount === rooms.data.length;
  const candidatesReady = !!selectedScheduleClasses.length && allocatedClassCount === selectedScheduleClasses.length;
  const gradersReady = !!selectedScheduleClasses.length && assignedGraderCount === selectedScheduleClasses.length;
  const completedSetupSteps = [roomsReady, candidatesReady, gradersReady].filter(Boolean).length;
  const scheduleConflicts = useMemo(() => (schedules.data || []).filter((item) => {
    if (item.id === editingScheduleId) return false;
    const sharedClass = (item.classIds || []).some((classId) => scheduleForm.classIds.includes(classId));
    return sharedClass && schedulesOverlap(item, scheduleForm);
  }), [editingScheduleId, scheduleForm, schedules.data]);
  const conflictingScheduleIds = useMemo(() => {
    const ids = new Set<string>();
    const rows = schedules.data || [];
    rows.forEach((first, index) => rows.slice(index + 1).forEach((second) => {
      if (!(first.classIds || []).some((id) => (second.classIds || []).includes(id)) || !schedulesOverlap(first, second)) return;
      ids.add(first.id); ids.add(second.id);
    }));
    return ids;
  }, [schedules.data]);

  const refreshExam = () => {
    periods.reload(); schedules.reload(); rooms.reload(); candidates.reload();
    graders.reload(); eligibleGraders.reload();
  };
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try { await action(); toast.show('ok', success); refreshExam(); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const resetPeriodForm = () => {
    setEditingPeriodId('');
    setPeriodForm({ code: '', name: '', academicYearId: '', semesterId: '', gradeLevel: '', startDate: today, endDate: today });
  };

  const savePeriod = () => run(async () => {
    const created = editingPeriodId
      ? await api.put<ExamPeriod>(`/exam-periods/${editingPeriodId}`, periodForm)
      : await api.post<ExamPeriod>('/exam-periods', periodForm);
    setPeriodId(created.id);
    resetPeriodForm();
  }, editingPeriodId ? 'Đã cập nhật kỳ thi' : 'Đã tạo kỳ thi');

  const editPeriod = (period: ExamPeriod) => {
    setEditingPeriodId(period.id);
    setPeriodId(period.id);
    setPeriodForm({ code: period.code, name: period.name, academicYearId: period.academicYearId,
      semesterId: period.semesterId, gradeLevel: period.gradeLevel || '', startDate: period.startDate, endDate: period.endDate });
  };

  const deletePeriod = (period: ExamPeriod) => {
    if (!window.confirm(`Xóa kỳ thi “${period.name}” cùng toàn bộ lịch, phòng và danh sách dự thi?`)) return;
    run(async () => {
      await api.del(`/exam-periods/${period.id}`);
      if (periodId === period.id) { setPeriodId(''); setScheduleId(''); }
      if (editingPeriodId === period.id) resetPeriodForm();
    }, 'Đã xóa kỳ thi và dữ liệu liên quan');
  };

  const resetScheduleForm = () => {
    setEditingScheduleId('');
    setScheduleForm(blankSchedule(selectedPeriod?.startDate || today));
  };

  const saveSchedule = () => periodId && run(async () => {
    const created = editingScheduleId
      ? await api.put<ExamSchedule>(`/exam-schedules/${editingScheduleId}`, scheduleForm)
      : await api.post<ExamSchedule>(`/exam-periods/${periodId}/schedules`, scheduleForm);
    setScheduleId(created.id);
    resetScheduleForm();
  }, editingScheduleId ? 'Đã cập nhật lịch thi' : 'Đã thêm lịch thi');

  const editSchedule = (schedule: ExamSchedule) => {
    setScheduleId(schedule.id);
    setEditingScheduleId(schedule.id);
    setScheduleForm({ subjectId: schedule.subjectId, classIds: [...(schedule.classIds || [])], examDate: schedule.examDate, startTime: schedule.startTime, durationMinutes: schedule.durationMinutes, notes: schedule.notes || '' });
  };

  const deleteSchedule = (schedule: ExamSchedule) => {
    if (!window.confirm(`Xóa lịch thi môn ${schedule.subjectName}? Phòng thi và danh sách dự thi của ca này cũng sẽ bị xóa.`)) return;
    run(async () => {
      await api.del(`/exam-schedules/${schedule.id}`);
      if (scheduleId === schedule.id) setScheduleId('');
      if (editingScheduleId === schedule.id) resetScheduleForm();
    }, 'Đã xóa lịch thi');
  };

  const toggleScheduleClass = (classId: string) => setScheduleForm((current) => ({
    ...current,
    classIds: current.classIds.includes(classId) ? current.classIds.filter((id) => id !== classId) : [...current.classIds, classId],
  }));

  const saveRoom = () => scheduleId && run(async () => {
    const created = await api.post<ExamRoom>(`/exam-schedules/${scheduleId}/rooms`, { ...roomForm, id: editingRoomId || undefined });
    setAllocationRoomId(created.id);
    setEditingRoomId('');
    setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
  }, editingRoomId ? 'Đã cập nhật phòng thi' : 'Đã phân phòng và giám thị');

  const editRoom = (room: ExamRoom) => {
    setEditingRoomId(room.id);
    setAllocationRoomId(room.id);
    setRoomForm({ roomCode: room.roomCode, capacity: room.capacity, proctorOneId: room.proctorOneId || '', proctorTwoId: room.proctorTwoId || '' });
  };

  const deleteRoom = (room: ExamRoom) => {
    if (!window.confirm(`Xóa phòng thi ${room.roomCode}?`)) return;
    run(async () => {
      await api.del(`/exam-rooms/${room.id}`);
      if (allocationRoomId === room.id) setAllocationRoomId('');
      if (editingRoomId === room.id) {
        setEditingRoomId('');
        setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
      }
    }, 'Đã xóa phòng thi');
  };

  const allocate = () => allocationRoomId && allocationClassId && run(
    () => api.post(`/exam-rooms/${allocationRoomId}/allocate`, { classId: allocationClassId }),
    'Đã cấp số báo danh và xếp chỗ cho lớp',
  );

  const assignGrader = () => scheduleId && graderForm.classId && graderForm.teacherId && run(async () => {
    await api.put(`/exam-schedules/${scheduleId}/graders`, graderForm);
    setGraderForm({ classId: '', teacherId: '' });
  }, 'Đã phân công giáo viên chấm thi');

  const editGrader = (assignment: ExamGradingAssignment) => {
    setGraderForm({ classId: assignment.classId, teacherId: assignment.teacherId });
  };

  const deleteGrader = (assignment: ExamGradingAssignment) => {
    if (!window.confirm(`Xóa phân công chấm thi lớp ${assignment.classCode} của ${assignment.teacherName}?`)) return;
    run(async () => {
      await api.del(`/exam-grading-assignments/${assignment.id}`);
      if (graderForm.classId === assignment.classId) {
        setGraderForm({ classId: '', teacherId: '' });
      }
    }, 'Đã xóa phân công chấm thi');
  };

  const changeLock = (locked: boolean) => periodId && run(
    () => api.post(`/exam-periods/${periodId}/${locked ? 'lock-scores' : 'unlock-scores'}`),
    locked ? 'Đã khóa nhập điểm và công bố kết quả' : 'Đã mở lại quyền nhập điểm',
  );

  const publishSchedule = () => periodId && run(
    () => api.post(`/exam-periods/${periodId}/publish-schedule`),
    selectedPeriod?.scheduleRevision
      ? 'Đã công bố lại lịch; nhiệm vụ giáo viên sẽ được nhắc đúng thời điểm'
      : 'Đã công bố lịch; nhiệm vụ giáo viên sẽ được nhắc đúng thời điểm',
  );

  const confirmPeriod = () => periodId && run(
    () => api.post(`/exam-periods/${periodId}/confirm`), 'Đã xác nhận kỳ thi và báo cáo',
  );

  const contextBar = (
    <div className="exam-context-bar">
      <label><span>Kỳ thi đang thao tác</span><select className="live-select" value={periodId} onChange={(event) => { setPeriodId(event.target.value); setScheduleId(''); }}>
        <option value="">Chọn kỳ thi</option>{(periods.data || []).map(({ period }) => <option key={period.id} value={period.id}>{period.code} · {period.name}</option>)}
      </select></label>
      {selectedPeriod && <><div><small>Thời gian</small><strong>{fmtDate(selectedPeriod.startDate)} – {fmtDate(selectedPeriod.endDate)}</strong></div>
        <div><small>Trạng thái</small><StatusPill value={selectedPeriod.status} /></div>
        <div><small>Lịch người dùng</small><strong className={selectedPeriod.schedulePublished ? 'exam-published' : 'exam-unpublished'}>{selectedPeriod.schedulePublished ? `Đã công bố · v${selectedPeriod.scheduleRevision}` : selectedPeriod.scheduleRevision ? 'Có thay đổi · cần công bố lại' : 'Chưa công bố'}</strong></div></>}
      <button className="live-btn ghost compact" onClick={refreshExam}><RefreshCw size={15} /> Làm mới</button>
    </div>
  );

  return <div className="exam-workspace">
    {toast.node}
    <section className="exam-hero">
      <div><span className="exam-eyebrow"><ShieldCheck size={15} /> Trung tâm khảo thí số</span>
        <h2>Quản lý toàn bộ vòng đời kỳ thi</h2>
        <p>Tạo kỳ thi, lập lịch, phân phòng, cấp số báo danh tự động và điều phối công tác tổ chức trên một quy trình.</p></div>
      <div className="exam-kpis">
        <div><strong>{periods.data?.length || 0}</strong><span>Kỳ thi</span></div>
        <div><strong>{selectedSummary?.scheduleCount || 0}</strong><span>Môn thi</span></div>
        <div><strong>{selectedSummary?.candidateCount || 0}</strong><span>Thí sinh</span></div>
        <div><strong>{selectedSummary?.roomCount || 0}</strong><span>Phòng thi</span></div>
      </div>
    </section>
    {contextBar}
    <FunctionTabs tabs={[
      { id: 'periods', label: 'Kỳ thi', description: 'Tạo và kiểm tra điều kiện kỳ thi', Icon: CalendarClock, content: <Section title="Kỳ thi và trạng thái" subtitle="Tạo kỳ thi, kiểm soát nhập điểm và xác nhận kết quả" wide>
        <div className="exam-form-grid period">
          <input className="live-input" placeholder="Mã kỳ thi" value={periodForm.code} onChange={(e) => setPeriodForm({ ...periodForm, code: e.target.value })} />
          <input className="live-input" placeholder="Tên kỳ thi" value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} />
          <select className="live-select" value={periodForm.academicYearId} onChange={(e) => setPeriodForm({ ...periodForm, academicYearId: e.target.value, semesterId: '' })}><option value="">Năm học</option>{(years.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="live-select" value={periodForm.semesterId} onChange={(e) => setPeriodForm({ ...periodForm, semesterId: e.target.value })}><option value="">Học kỳ</option>{semesterOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="live-select" value={periodForm.gradeLevel} onChange={(e) => setPeriodForm({ ...periodForm, gradeLevel: e.target.value })}><option value="">Toàn trường</option>{gradeOptions.map((x) => <option key={x} value={x}>Khối {x}</option>)}</select>
          <input className="live-input" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
          <input className="live-input" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
          {editingPeriodId && <button className="live-btn ghost" disabled={busy} onClick={resetPeriodForm}><X size={15} /> Hủy sửa</button>}
          <button className="live-btn" disabled={busy || !periodForm.code.trim() || !periodForm.name.trim() || !periodForm.academicYearId || !periodForm.semesterId} onClick={savePeriod}>{editingPeriodId ? <Save size={16} /> : <Plus size={16} />} {editingPeriodId ? 'Lưu kỳ thi' : 'Tạo kỳ thi'}</button>
        </div>
        <Async state={periods} allowEmpty empty="Chưa có kỳ thi">{(rows) => <div className="exam-period-list">{rows.map((item) => <article key={item.period.id} className={item.period.id === periodId ? 'active' : ''}>
          <button type="button" className="exam-period-select" onClick={() => setPeriodId(item.period.id)}><div><strong>{item.period.name}</strong><span>{item.period.code} · {fmtDate(item.period.startDate)} – {fmtDate(item.period.endDate)}</span></div><StatusPill value={item.period.status} /><small>{item.scheduleCount} môn · {item.candidateCount} thí sinh · {item.period.schedulePublished ? `Đã công bố v${item.period.scheduleRevision}` : item.period.scheduleRevision ? 'Cần công bố lại' : 'Chưa công bố'}</small></button>
          <div className="exam-row-actions"><button title="Sửa kỳ thi" disabled={item.period.status === 'CONFIRMED'} onClick={() => editPeriod(item.period)}><Pencil size={15} /></button><button className="danger" title="Xóa kỳ thi" disabled={item.period.status !== 'DRAFT'} onClick={() => deletePeriod(item.period)}><Trash2 size={15} /></button></div>
        </article>)}</div>}</Async>
        {selectedPeriod && <div className="exam-action-strip"><span><Megaphone size={17} /> {selectedPeriod.schedulePublished ? <><strong>Lịch chính thức</strong> đang hiển thị cho người dùng</> : <><strong>Lịch chưa phát hành</strong> nên giáo viên, học sinh và phụ huynh chưa thấy</>}</span>
          <button className="live-btn publish" disabled={busy || selectedPeriod.schedulePublished} onClick={publishSchedule}><Megaphone size={15} /> {selectedPeriod.scheduleRevision ? 'Công bố lại lịch' : 'Công bố lịch thi'}</button>
          <button className="live-btn ghost" disabled={busy || selectedPeriod.status === 'CONFIRMED'} onClick={() => changeLock(!selectedPeriod.scoreEntryLocked)}>{selectedPeriod.scoreEntryLocked ? <Unlock size={15} /> : <Lock size={15} />}{selectedPeriod.scoreEntryLocked ? 'Mở nhập điểm' : 'Khóa nhập điểm'}</button>
          <button className="live-btn" disabled={busy || !selectedPeriod.scoreEntryLocked || selectedPeriod.status === 'CONFIRMED'} onClick={confirmPeriod}><ShieldCheck size={15} /> Xác nhận kỳ thi</button>
        </div>}
      </Section> },
      { id: 'schedule', label: 'Lịch & phòng', description: 'Xếp môn, phòng, giám thị và giáo viên chấm', Icon: DoorOpen, content: <Section title="Lịch thi, phòng thi và giám thị" subtitle="Chọn rõ lớp áp dụng; hệ thống ngăn trùng giờ, phòng và giám thị" wide>
        {!periodId ? <div className="empty-state"><strong>Chọn kỳ thi để lập lịch</strong></div> : <>
          <div className={`exam-schedule-editor ${editingScheduleId ? 'editing' : ''}`}>
            <div className="exam-editor-heading"><div><strong>{editingScheduleId ? 'Chỉnh sửa ca thi' : 'Tạo ca thi mới'}</strong><span>{editingScheduleId ? 'Thay đổi được kiểm tra xung đột trước khi lưu' : 'Mỗi ca thi phải chọn ít nhất một lớp áp dụng'}</span></div>{editingScheduleId && <button className="icon-action" title="Hủy chỉnh sửa" onClick={resetScheduleForm}><X size={17} /></button>}</div>
            <div className="exam-form-grid schedule">
            <select className="live-select" value={scheduleForm.subjectId} onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}><option value="">Chọn môn thi</option>{(subjects.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <input className="live-input" type="date" value={scheduleForm.examDate} onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })} />
            <input className="live-input" type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} />
            <input className="live-input" type="number" min="15" max="480" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })} />
            <input className="live-input" placeholder="Ghi chú" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            <button className="live-btn" disabled={busy || !!selectedPeriod?.scoreEntryLocked || !scheduleForm.subjectId || !scheduleForm.classIds.length || !scheduleForm.examDate || !scheduleForm.startTime || scheduleForm.durationMinutes < 15 || scheduleForm.durationMinutes > 480 || !!scheduleConflicts.length} onClick={saveSchedule}>{editingScheduleId ? <Save size={15} /> : <Plus size={15} />} {editingScheduleId ? 'Lưu thay đổi' : 'Thêm lịch thi'}</button>
            </div>
            <div className="exam-class-scope"><div><strong>Lớp áp dụng</strong><button type="button" onClick={() => setScheduleForm((current) => ({ ...current, classIds: current.classIds.length === eligibleClasses.length ? [] : eligibleClasses.map((item) => item.id) }))}>{scheduleForm.classIds.length === eligibleClasses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div><div className="exam-class-options">{eligibleClasses.map((item) => <label key={item.id} className={scheduleForm.classIds.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={scheduleForm.classIds.includes(item.id)} onChange={() => toggleScheduleClass(item.id)} /><span>{item.code}</span></label>)}</div></div>
            {!!scheduleConflicts.length && <div className="exam-conflict-alert"><CalendarClock size={18} /><div><strong>Không thể lưu vì trùng lịch</strong>{scheduleConflicts.map((item) => <span key={item.id}>{item.subjectName} · {fmtDate(item.examDate)} {item.startTime} · {(item.classIds || []).filter((id) => scheduleForm.classIds.includes(id)).map((id) => classById.get(id)?.code).filter(Boolean).join(', ')}</span>)}</div></div>}
          </div>
          <div className="exam-setup-layout">
            <aside className="exam-schedule-rail">
              <div className="exam-list-heading">
                <div>
                  <h3>Danh sách ca thi</h3>
                  <small>Chọn một ca để hoàn thiện công tác tổ chức</small>
                </div>
                {!!conflictingScheduleIds.size && <span>{conflictingScheduleIds.size} ca cần xử lý</span>}
              </div>
              <Async state={schedules} allowEmpty empty="Chưa có lịch thi">
                {(rows) => <div className="exam-schedule-list">{rows.map((item) => {
                  const classCodes = (item.classIds || []).map((id) => classById.get(id)?.code).filter(Boolean);
                  return <article key={item.id} className={`${item.id === scheduleId ? 'active' : ''} ${conflictingScheduleIds.has(item.id) ? 'conflict' : ''}`}>
                    <button type="button" className="exam-schedule-select" onClick={() => setScheduleId(item.id)}>
                      <CalendarClock size={18} />
                      <span>
                        <strong>{item.subjectName}</strong>
                        <small>{fmtDate(item.examDate)} · {item.startTime} · {item.durationMinutes} phút</small>
                        <em>{classCodes.join(' · ') || 'Chưa chọn lớp'}</em>
                      </span>
                    </button>
                    <div className="exam-row-actions">
                      <button title="Sửa ca thi" onClick={() => editSchedule(item)}><Pencil size={15} /></button>
                      <button className="danger" title="Xóa ca thi" onClick={() => deleteSchedule(item)}><Trash2 size={15} /></button>
                    </div>
                    {conflictingScheduleIds.has(item.id) && <small className="exam-conflict-tag">Trùng giờ của lớp</small>}
                  </article>;
                })}</div>}
              </Async>
            </aside>

            <div className="exam-setup-workspace">
              {scheduleId && selectedSchedule ? <>
                <header className="exam-selected-schedule">
                  <span><CalendarClock size={21} /></span>
                  <div>
                    <small>Ca thi đang hoàn thiện</small>
                    <h3>{selectedSchedule.subjectName}</h3>
                    <p>{fmtDate(selectedSchedule.examDate)} · {selectedSchedule.startTime} · {selectedSchedule.durationMinutes} phút · {selectedScheduleClasses.map((item) => item.code).join(', ')}</p>
                  </div>
                  <strong className={completedSetupSteps === 3 ? 'complete' : ''}>
                    {completedSetupSteps}/3 bước
                  </strong>
                </header>

                <nav className="exam-setup-steps" aria-label="Các bước tổ chức ca thi">
                  <button type="button" className={`${setupStep === 'rooms' ? 'active' : ''} ${roomsReady ? 'done' : ''}`} onClick={() => setSetupStep('rooms')}>
                    <span>{roomsReady ? <CheckCircle2 size={18} /> : <DoorOpen size={18} />}</span>
                    <div><small>Bước 1</small><strong>Phòng & giám thị</strong><em>{rooms.data?.length || 0} phòng</em></div>
                  </button>
                  <button type="button" className={`${setupStep === 'candidates' ? 'active' : ''} ${candidatesReady ? 'done' : ''}`} onClick={() => setSetupStep('candidates')}>
                    <span>{candidatesReady ? <CheckCircle2 size={18} /> : <UsersRound size={18} />}</span>
                    <div><small>Bước 2</small><strong>Thí sinh & SBD</strong><em>{allocatedClassCount}/{selectedScheduleClasses.length} lớp</em></div>
                  </button>
                  <button type="button" className={`${setupStep === 'graders' ? 'active' : ''} ${gradersReady ? 'done' : ''}`} onClick={() => setSetupStep('graders')}>
                    <span>{gradersReady ? <CheckCircle2 size={18} /> : <ClipboardPenLine size={18} />}</span>
                    <div><small>Bước 3</small><strong>Giáo viên chấm</strong><em>{assignedGraderCount}/{selectedScheduleClasses.length} lớp</em></div>
                  </button>
                </nav>

                {setupStep === 'rooms' && <section className="exam-operation-panel">
                  <header>
                    <div><span><DoorOpen size={18} /></span><div><h4>Phân phòng và giám thị</h4><p>Tạo từng phòng thi; giám thị 1 là bắt buộc, giám thị 2 có thể bổ sung sau.</p></div></div>
                    <b>{readyRoomCount}/{rooms.data?.length || 0} phòng sẵn sàng</b>
                  </header>
                  <div className="exam-room-editor">
                    <label><span>Phòng thi</span><select className="live-select" value={roomForm.roomCode} onChange={(e) => setRoomForm({ ...roomForm, roomCode: e.target.value })}><option value="">Chọn phòng</option>{(schoolRooms.data || []).map((x) => <option key={x.id} value={x.code}>{x.code} · {x.capacity || 0} chỗ</option>)}</select></label>
                    <label><span>Sức chứa sử dụng</span><input className="live-input" type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></label>
                    <label><span>Giám thị 1 <b>*</b></span><select className="live-select" value={roomForm.proctorOneId} onChange={(e) => setRoomForm({ ...roomForm, proctorOneId: e.target.value })}><option value="">Chọn giám thị chính</option>{(teachers.data || []).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></label>
                    <label><span>Giám thị 2</span><select className="live-select" value={roomForm.proctorTwoId} onChange={(e) => setRoomForm({ ...roomForm, proctorTwoId: e.target.value })}><option value="">Không bắt buộc</option>{(teachers.data || []).filter((x) => x.id !== roomForm.proctorOneId).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select></label>
                    <div className="exam-editor-actions">
                      {editingRoomId && <button className="live-btn ghost" onClick={() => { setEditingRoomId(''); setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' }); }}><X size={15} /> Hủy</button>}
                      <button className="live-btn" disabled={busy || !!selectedPeriod?.scoreEntryLocked || !roomForm.roomCode || !roomForm.proctorOneId || roomForm.capacity < 1} onClick={saveRoom}>{editingRoomId ? <Save size={15} /> : <Plus size={15} />} {editingRoomId ? 'Lưu thay đổi' : 'Thêm phòng thi'}</button>
                    </div>
                  </div>
                  <Async state={rooms} allowEmpty empty="Chưa có phòng thi. Hãy thêm phòng đầu tiên ở biểu mẫu phía trên.">
                    {(rows) => <div className="exam-room-grid">{rows.map((room) => <article key={room.id} className={room.id === allocationRoomId ? 'active' : ''}>
                      <span className="exam-room-icon"><DoorOpen size={20} /></span>
                      <div><strong>{room.roomCode}</strong><span>{room.capacity} chỗ</span><small><b>GT1:</b> {room.proctorOneName || 'Chưa phân công'}</small><small><b>GT2:</b> {room.proctorTwoName || 'Chưa phân công'}</small></div>
                      <div className="exam-row-actions"><button title="Sửa phòng" onClick={() => editRoom(room)}><Pencil size={14} /></button><button className="danger" title="Xóa phòng" onClick={() => deleteRoom(room)}><Trash2 size={14} /></button></div>
                    </article>)}</div>}
                  </Async>
                  {!!rooms.data?.length && <button className="exam-next-step" type="button" onClick={() => setSetupStep('candidates')}>Tiếp tục xếp thí sinh <UsersRound size={15} /></button>}
                </section>}

                {setupStep === 'candidates' && <section className="exam-operation-panel">
                  <header>
                    <div><span><UsersRound size={18} /></span><div><h4>Cấp số báo danh và xếp chỗ</h4><p>Chọn phòng tiếp nhận và lớp dự thi. Hệ thống tự sinh SBD 6 chữ số, xếp chỗ và kiểm tra sức chứa.</p></div></div>
                    <b>{allocatedClassCount}/{selectedScheduleClasses.length} lớp hoàn tất</b>
                  </header>
                  {!rooms.data?.length ? <div className="exam-step-warning"><DoorOpen size={18} /><div><strong>Chưa có phòng thi</strong><span>Hoàn thành bước Phòng & giám thị trước khi xếp thí sinh.</span></div><button type="button" onClick={() => setSetupStep('rooms')}>Về bước 1</button></div> : <>
                    <div className="exam-allocation-editor">
                      <label><span>Phòng tiếp nhận</span><select className="live-select" value={allocationRoomId} onChange={(event) => setAllocationRoomId(event.target.value)}><option value="">Chọn phòng</option>{(rooms.data || []).map((room) => <option key={room.id} value={room.id}>{room.roomCode} · {room.capacity} chỗ</option>)}</select></label>
                      <label><span>Lớp dự thi</span><select className="live-select" value={allocationClassId} onChange={(event) => setAllocationClassId(event.target.value)}><option value="">Chọn lớp</option>{selectedScheduleClasses.map((item) => <option key={item.id} value={item.id}>{item.code}{candidatesByClass.get(item.id) ? ` · Đã xếp ${candidatesByClass.get(item.id)} HS` : ''}</option>)}</select></label>
                      <button className="live-btn" disabled={busy || !allocationRoomId || !allocationClassId} onClick={allocate}><UsersRound size={15} /> Cấp SBD & xếp chỗ</button>
                    </div>
                    <div className="exam-class-progress-grid">{selectedScheduleClasses.map((item) => {
                      const count = candidatesByClass.get(item.id) || 0;
                      return <article key={item.id} className={count ? 'done' : ''}><span>{count ? <CheckCircle2 size={18} /> : <UsersRound size={18} />}</span><div><strong>Lớp {item.code}</strong><small>{count ? `${count} thí sinh · Phòng ${candidateRoomsByClass.get(item.id) || '—'}` : 'Chưa cấp SBD và xếp chỗ'}</small></div><b>{count ? 'Hoàn tất' : 'Chờ xếp'}</b></article>;
                    })}</div>
                  </>}
                  {candidatesReady && <button className="exam-next-step" type="button" onClick={() => setSetupStep('graders')}>Tiếp tục phân công chấm thi <ClipboardPenLine size={15} /></button>}
                </section>}

                {setupStep === 'graders' && <section className="exam-operation-panel exam-grader-panel">
                  <header>
                    <div><span><ClipboardPenLine size={18} /></span><div><h4>Phân công giáo viên chấm thi</h4><p>Mỗi lớp có một người chấm; danh sách chỉ gồm giáo viên đúng chuyên môn {selectedSchedule.subjectName}.</p></div></div>
                    <b>{assignedGraderCount}/{selectedScheduleClasses.length} lớp hoàn tất</b>
                  </header>
                  <div className="exam-grader-policy"><ShieldCheck size={16} /><span>Nhiệm vụ chấm thi được nhắc trước 7 ngày. Quyền nhập điểm tự mở sau <b>7 ngày kể từ khi ca thi kết thúc</b>.</span></div>
                  <div className="exam-grader-form">
                    <label><span>Lớp chấm thi</span><select className="live-select" value={graderForm.classId} onChange={(event) => {
                      const current = graders.data?.find((assignment) => assignment.classId === event.target.value);
                      setGraderForm({ classId: event.target.value, teacherId: current?.teacherId || '' });
                    }}><option value="">Chọn lớp cần phân công</option>{selectedScheduleClasses.map((item) => {
                      const current = graders.data?.find((assignment) => assignment.classId === item.id);
                      return <option key={item.id} value={item.id}>{item.code}{current ? ` · ${current.teacherName}` : ' · Chưa phân công'}</option>;
                    })}</select></label>
                    <label><span>Giáo viên đúng chuyên môn</span><select className="live-select" value={graderForm.teacherId} onChange={(event) => setGraderForm({ ...graderForm, teacherId: event.target.value })}><option value="">Chọn giáo viên</option>{(eligibleGraders.data || []).map((teacher) => <option key={teacher.teacherId} value={teacher.teacherId}>{teacher.teacherName}{teacher.teacherCode ? ` · ${teacher.teacherCode}` : ''}</option>)}</select></label>
                    <button className="live-btn" disabled={busy || !graderForm.classId || !graderForm.teacherId} onClick={assignGrader}><Save size={15} /> Lưu phân công</button>
                  </div>
                  {eligibleGraders.data && eligibleGraders.data.length === 0 && <div className="exam-step-warning"><ShieldCheck size={18} /><div><strong>Chưa có giáo viên phù hợp</strong><span>Hãy cập nhật môn chuyên ngành hoặc phân công giảng dạy môn {selectedSchedule.subjectName} cho giáo viên trước.</span></div></div>}
                  <Async state={graders} allowEmpty empty="Chưa phân công giáo viên chấm thi">
                    {(rows) => rows.length ? <div className="exam-grader-list">{rows.map((assignment) => <article key={assignment.id}><span className="exam-grader-class">{assignment.classCode}</span><div><strong>{assignment.teacherName}</strong><small>{assignment.subjectName} · Có quyền nhập điểm lớp {assignment.classCode}</small></div><div className="exam-row-actions"><button title="Sửa phân công chấm thi" onClick={() => editGrader(assignment)}><Pencil size={14} /></button><button className="danger" title="Xóa phân công chấm thi" onClick={() => deleteGrader(assignment)}><Trash2 size={14} /></button></div></article>)}</div> : <div className="exam-grader-empty"><ClipboardPenLine size={18} /><span>Chưa có giáo viên chấm thi</span></div>}
                  </Async>
                </section>}
              </> : <div className="exam-select-schedule-empty"><CalendarClock size={28} /><strong>Chọn một ca thi ở cột bên trái</strong><span>Sau đó hoàn thiện lần lượt phòng thi, thí sinh và giáo viên chấm thi.</span></div>}
            </div>
          </div>
        </>}
      </Section> },
      { id: 'categories', label: 'Cấu hình đầu điểm', description: 'Kiểm tra quy tắc trước khi nhập điểm', Icon: BookOpenCheck, content: <AdminExamCategoriesLive /> },
    ]} />
  </div>;
}

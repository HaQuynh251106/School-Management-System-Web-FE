import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, CalendarClock, CheckCircle2, ClipboardPenLine, DoorOpen, Lock, Megaphone, Pencil,
  Plus, RefreshCw, RotateCcw, Save, ShieldCheck, Sparkles, Trash2, Unlock, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, EligibleExamGrader, ExamGradingAssignment, ExamDayPolicy, ExamOrganizationPlan,
  ExamOrganizationReadiness, ExamPeriod, ExamPeriodSummary, ExamSchedule,
  SchoolClass, Semester, Subject,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';
import { AdminExamCategoriesLive } from './AdminLive';
import { useHashString } from '../../api/urlState';
import { canApplyExamOrganizationPlan } from './examOrganizationPlanning';

const today = new Date().toISOString().slice(0, 10);
const blankSchedule = (date = today) => ({ subjectId: '', classIds: [] as string[], examDate: date, startTime: '07:30', durationMinutes: 90, notes: '' });
type ExamSetupStep = 'organization' | 'graders';

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

type OrganizationForm = { maxCandidatesPerRoom: number; studentsPerDesk: number; includeSecondProctor: boolean };

function UnifiedOrganizationPanel({ plan, historyCount, form, setForm, busy, policy, onPreview, onApply, onUndo, onNext }: {
  plan?: ExamOrganizationPlan; historyCount: number; form: OrganizationForm;
  setForm: (value: OrganizationForm) => void; busy: boolean; policy?: ExamDayPolicy;
  onPreview: () => void; onApply: () => void; onUndo: () => void; onNext: () => void;
}) {
  const ready = !!plan && plan.missingAssignmentCount === 0 && plan.assignedCount === plan.candidateCount;
  const canApply = canApplyExamOrganizationPlan(plan);
  return <section className="exam-operation-panel exam-unified-organization">
    <header>
      <div><span><Sparkles size={19} /></span><div><h4>Tổ chức ca thi tự động trong một lần</h4><p>Hệ thống tự chọn phòng, phân giám thị, chia thí sinh, cấp SBD 6 chữ số và vị trí bàn. Bản xem trước không thay đổi dữ liệu.</p></div></div>
      <b className={ready ? 'is-ready' : 'needs-work'}>{ready ? 'Sẵn sàng áp dụng' : 'Cần tạo phương án'}</b>
    </header>
    {policy && <div className="exam-day-policy"><span><CalendarClock size={18} /></span><div><strong>{policy.title}</strong><p>{policy.description}</p></div><b>Áp dụng {fmtDate(policy.examDate)}</b></div>}

    <div className="exam-unified-flow" aria-label="Quy trình tự động">
      <span><b>1</b><small>Chọn đủ phòng</small></span><i>→</i>
      <span><b>2</b><small>Phân giám thị</small></span><i>→</i>
      <span><b>3</b><small>Xếp thí sinh</small></span><i>→</i>
      <span><b>4</b><small>Cấp SBD & bàn</small></span>
    </div>

    <div className="exam-organization-config">
      <label><span>Số thí sinh tối đa mỗi phòng</span><strong>Giới hạn sử dụng, không vượt sức chứa thật</strong><input className="live-input" type="number" min="1" max="1000" value={form.maxCandidatesPerRoom} onChange={(event) => setForm({ ...form, maxCandidatesPerRoom: Math.max(1, Number(event.target.value)) })} /></label>
      <label><span>Số thí sinh mỗi bàn</span><strong>Chọn 1 để mỗi người ngồi một bàn riêng</strong><select className="live-select" value={form.studentsPerDesk} onChange={(event) => setForm({ ...form, studentsPerDesk: Number(event.target.value) })}><option value="1">1 người / bàn</option><option value="2">2 người / bàn</option><option value="3">3 người / bàn</option><option value="4">4 người / bàn</option></select></label>
      <label className="exam-config-switch"><span>Giám thị hỗ trợ</span><strong>Ngoài một giám thị chính bắt buộc</strong><input type="checkbox" checked={form.includeSecondProctor} onChange={(event) => setForm({ ...form, includeSecondProctor: event.target.checked })} /><em>{form.includeSecondProctor ? 'Mỗi phòng có 2 giám thị' : 'Mỗi phòng có 1 giám thị'}</em></label>
      <button className="live-btn exam-generate-plan" disabled={busy || form.maxCandidatesPerRoom < 1} onClick={onPreview}><Sparkles size={16} /> {plan ? 'Tạo lại phương án' : 'Tạo phương án tự động'}</button>
    </div>

    {plan ? <div className="exam-unified-preview">
      <div className="exam-unified-summary">
        <article><small>Phòng được chọn</small><strong>{plan.roomCount}</strong><span>Tự chọn vừa đủ nhu cầu</span></article>
        <article><small>Thí sinh đã xếp</small><strong>{plan.assignedCount}/{plan.candidateCount}</strong><span>SBD gồm đúng 6 chữ số</span></article>
        <article><small>Sức chứa sử dụng</small><strong>{plan.effectiveCapacity}</strong><span>Tối đa {plan.maxCandidatesPerRoom} em/phòng</span></article>
        <article className={ready ? 'success' : 'danger'}><small>Cần xử lý</small><strong>{plan.missingAssignmentCount}</strong><span>{ready ? 'Phương án hợp lệ' : 'Xem cảnh báo phía dưới'}</span></article>
      </div>
      {!!plan.warningSummary && <div className="exam-plan-notice"><AlertTriangle size={16} /> {plan.warningSummary}</div>}
      <div className="exam-unified-room-grid">{plan.rooms.map((room) => <article key={room.roomId} className={room.ready ? 'ready' : 'warning'}>
        <header><span><DoorOpen size={17} /></span><div><strong>{room.roomCode}</strong><small>{room.candidateCount}/{room.effectiveCapacity} thí sinh · dùng {room.deskCount} bàn</small></div><b>{room.ready ? 'Sẵn sàng' : 'Thiếu giám thị'}</b></header>
        <div><span><b>GT chính</b>{room.proctorOneName || 'Chưa xếp'}</span><span><b>GT hỗ trợ</b>{room.proctorTwoName || 'Không yêu cầu'}</span></div>
        <footer>Sức chứa thật {room.physicalCapacity} · Dùng tối đa {room.effectiveCapacity}</footer>
      </article>)}</div>
      <details className="exam-candidate-details"><summary>Xem danh sách SBD, phòng và bàn ({plan.candidates.length})</summary><div className="live-table-wrap"><table className="live-table"><thead><tr><th>SBD</th><th>Học sinh</th><th>Lớp</th><th>Phòng</th><th>Bàn</th><th>Vị trí</th></tr></thead><tbody>{plan.candidates.map((item) => <tr key={item.studentId}><td className="candidate-number">{item.candidateNo}</td><td>{item.studentName}</td><td>{item.classCode}</td><td>{item.roomCode}</td><td>{item.deskNo}</td><td>{plan.studentsPerDesk === 1 ? 'Ngồi riêng' : `Vị trí ${item.seatPosition}`}</td></tr>)}</tbody></table></div></details>
      <div className="exam-unified-actions"><span>{historyCount} phương án trong lịch sử · {plan.status === 'PREVIEW' ? 'Chưa thay đổi dữ liệu hiện tại' : plan.status === 'APPLIED' ? 'Đang được áp dụng' : 'Đã lưu lịch sử'}</span>{plan.status === 'PREVIEW' && <button className="live-btn" disabled={busy || !canApply} onClick={onApply}><CheckCircle2 size={16} /> Xác nhận và tổ chức ca thi</button>}{plan.status === 'APPLIED' && <button className="live-btn ghost" disabled={busy} onClick={onUndo}><RotateCcw size={16} /> Hoàn tác toàn bộ</button>}</div>
      {plan.status === 'APPLIED' && ready && <button className="exam-next-step" type="button" onClick={onNext}>Tiếp tục phân công chấm thi <ClipboardPenLine size={15} /></button>}
    </div> : <div className="exam-plan-empty"><Sparkles size={24} /><strong>Chưa có phương án tổ chức</strong><span>Điều chỉnh số người mỗi phòng và mỗi bàn, sau đó nhấn “Tạo phương án tự động”.</span></div>}
  </section>;
}

export function AdminExamsLive() {
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const periods = useApi<ExamPeriodSummary[]>('/exam-periods');
  const [periodId, setPeriodId] = useHashString('exam_period', '');
  const [scheduleId, setScheduleId] = useState('');
  const schedules = useApi<ExamSchedule[]>(periodId ? `/exam-periods/${periodId}/schedules` : null);
  const graders = useApi<ExamGradingAssignment[]>(scheduleId ? `/exam-schedules/${scheduleId}/graders` : null);
  const eligibleGraders = useApi<EligibleExamGrader[]>(scheduleId ? `/exam-schedules/${scheduleId}/eligible-graders` : null);
  const readiness = useApi<ExamOrganizationReadiness>(scheduleId ? `/exam-schedules/${scheduleId}/organization-readiness` : null);
  const organizationPlans = useApi<ExamOrganizationPlan[]>(scheduleId ? `/exam-schedules/${scheduleId}/organization-plans` : null);
  const examDayPolicy = useApi<ExamDayPolicy>(scheduleId ? `/exam-schedules/${scheduleId}/day-policy` : null);

  const selectedSummary = periods.data?.find((item) => item.period.id === periodId);
  const selectedPeriod = selectedSummary?.period;
  const selectedSchedule = schedules.data?.find((item) => item.id === scheduleId);
  const [periodForm, setPeriodForm] = useState({ code: '', name: '', academicYearId: '', semesterId: '', gradeLevel: '', startDate: today, endDate: today });
  const [editingPeriodId, setEditingPeriodId] = useState('');
  const [scheduleForm, setScheduleForm] = useState(blankSchedule());
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [organizationForm, setOrganizationForm] = useState({ maxCandidatesPerRoom: 20, studentsPerDesk: 1, includeSecondProctor: false });
  const [graderForm, setGraderForm] = useState({ classId: '', teacherId: '' });
  const [setupStep, setSetupStep] = useState<ExamSetupStep>('organization');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!periodId && periods.data?.length) setPeriodId(periods.data[0].period.id);
  }, [periodId, periods.data, setPeriodId]);
  useEffect(() => {
    if (scheduleId && !schedules.data?.some((item) => item.id === scheduleId)) setScheduleId('');
  }, [scheduleId, schedules.data]);
  useEffect(() => {
    setOrganizationForm({ maxCandidatesPerRoom: 20, studentsPerDesk: 1, includeSecondProctor: false });
    setGraderForm({ classId: '', teacherId: '' });
    setSetupStep('organization');
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
  const assignedGraderCount = selectedScheduleClasses.filter((item) =>
    (graders.data || []).some((assignment) => assignment.classId === item.id)).length;
  const roomsReady = !!readiness.data?.roomsReady;
  const candidatesReady = !!readiness.data?.candidatesReady;
  const organizationReady = roomsReady && candidatesReady;
  const gradersReady = !!selectedScheduleClasses.length && assignedGraderCount === selectedScheduleClasses.length;
  const completedSetupSteps = [organizationReady, gradersReady].filter(Boolean).length;
  const latestOrganizationPlan = organizationPlans.data?.[0];
  const activeOrganizationPlan = latestOrganizationPlan && ['PREVIEW', 'APPLIED'].includes(latestOrganizationPlan.status)
    ? latestOrganizationPlan : undefined;
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
    periods.reload(); schedules.reload(); graders.reload(); eligibleGraders.reload(); readiness.reload();
    organizationPlans.reload(); examDayPolicy.reload();
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

  const previewOrganization = () => scheduleId && run(
    () => api.post(`/exam-schedules/${scheduleId}/organization-plans/preview`, organizationForm),
    'Đã tạo phương án tổ chức ca thi hoàn chỉnh',
  );

  const applyOrganization = () => activeOrganizationPlan?.status === 'PREVIEW'
    && window.confirm('Áp dụng sẽ thay thế đồng thời phòng thi, giám thị, danh sách thí sinh, SBD và chỗ ngồi. Tiếp tục?')
    && run(() => api.post(`/exam-organization-plans/${activeOrganizationPlan.id}/apply`, {}),
      'Đã tổ chức ca thi và lưu toàn bộ dữ liệu');

  const undoOrganization = () => activeOrganizationPlan?.status === 'APPLIED'
    && window.confirm('Hoàn tác sẽ phục hồi toàn bộ phòng, giám thị và danh sách thí sinh trước lần áp dụng. Tiếp tục?')
    && run(() => api.post(`/exam-organization-plans/${activeOrganizationPlan.id}/undo`, {}),
      'Đã hoàn tác toàn bộ phương án tổ chức ca thi');

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
                  <strong className={completedSetupSteps === 2 ? 'complete' : ''}>
                    {completedSetupSteps}/2 bước
                  </strong>
                </header>

                <nav className="exam-setup-steps" aria-label="Các bước tổ chức ca thi">
                  <button type="button" className={`${setupStep === 'organization' ? 'active' : ''} ${organizationReady ? 'done' : ''}`} onClick={() => setSetupStep('organization')}>
                    <span>{organizationReady ? <CheckCircle2 size={18} /> : <DoorOpen size={18} />}</span>
                    <div><small>Bước 1</small><strong>Tổ chức ca thi tự động</strong><em>{readiness.data?.allocatedCount || 0}/{readiness.data?.candidateCount || 0} thí sinh · phòng, giám thị, SBD và bàn</em></div>
                  </button>
                  <button type="button" className={`${setupStep === 'graders' ? 'active' : ''} ${gradersReady ? 'done' : ''}`} onClick={() => setSetupStep('graders')}>
                    <span>{gradersReady ? <CheckCircle2 size={18} /> : <ClipboardPenLine size={18} />}</span>
                    <div><small>Bước 2</small><strong>Giáo viên chấm</strong><em>{assignedGraderCount}/{selectedScheduleClasses.length} lớp</em></div>
                  </button>
                </nav>

                {setupStep === 'organization' && <UnifiedOrganizationPanel plan={activeOrganizationPlan}
                  historyCount={organizationPlans.data?.length || 0} form={organizationForm} setForm={setOrganizationForm}
                  busy={busy} policy={examDayPolicy.data || undefined} onPreview={previewOrganization}
                  onApply={applyOrganization} onUndo={undoOrganization} onNext={() => setSetupStep('graders')} />}
                {/* Giao diện tổ chức rời cũ được giữ tạm trong lịch sử nguồn để đối chiếu khi chuyển đổi.
                {setupStep === 'organization' && <div className="exam-combined-organization">
                <section className="exam-operation-panel">
                  <header>
                    <div><span><DoorOpen size={18} /></span><div><h4>Chọn đủ phòng, sau đó phân công giám thị</h4><p>Mỗi phòng dùng đúng sức chứa thực tế. Bước này chỉ hoàn tất khi đủ chỗ và tất cả phòng có giám thị chính.</p></div></div>
                    <b className={roomsReady ? 'is-ready' : 'needs-work'}>{roomsReady ? 'Đã đủ điều kiện' : 'Chưa hoàn tất'}</b>
                  </header>
                  {examDayPolicy.data && <div className="exam-day-policy"><span><CalendarClock size={18} /></span><div><strong>{examDayPolicy.data.title}</strong><p>{examDayPolicy.data.description}</p></div><b>Áp dụng {fmtDate(examDayPolicy.data.examDate)}</b></div>}
                  <div className="exam-capacity-overview">
                    <article><small>Thí sinh cần chỗ</small><strong>{readiness.data?.candidateCount ?? '—'}</strong><span>học sinh thuộc {selectedScheduleClasses.length} lớp</span></article>
                    <article><small>Sức chứa đã chọn</small><strong>{readiness.data?.totalCapacity ?? 0}</strong><span>{rooms.data?.length || 0} phòng thi</span></article>
                    <article className={(readiness.data?.missingSeats || 0) > 0 ? 'danger' : 'success'}><small>Chỗ còn thiếu</small><strong>{readiness.data?.missingSeats ?? 0}</strong><span>{readiness.data?.missingSeats ? 'Cần chọn thêm phòng' : 'Đã đủ chỗ ngồi'}</span></article>
                    <article className={readyRoomCount < (rooms.data?.length || 0) ? 'warning' : 'success'}><small>Đã có giám thị chính</small><strong>{readyRoomCount}/{rooms.data?.length || 0}</strong><span>{readyRoomCount < (rooms.data?.length || 0) ? 'Cần bổ sung giám thị' : 'Đã hoàn tất'}</span></article>
                  </div>
                  {!editingRoomId && <div className="exam-batch-room-picker">
                    <div className="exam-picker-heading"><div><strong>1. Chọn nhiều phòng cùng lúc</strong><span>Chọn các phòng muốn dùng, hệ thống tự lấy sức chứa thực tế.</span></div><button className="live-btn" disabled={busy || !selectedPhysicalRooms.length} onClick={addSelectedRooms}><Plus size={15} /> Thêm {selectedPhysicalRooms.length || ''} phòng</button></div>
                    {availablePhysicalRooms.length ? <div className="exam-room-choice-grid">{availablePhysicalRooms.map((room) => {
                      const checked = selectedPhysicalRooms.includes(room.roomCode);
                      return <label key={room.roomId} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={() => setSelectedPhysicalRooms((current) => checked ? current.filter((code) => code !== room.roomCode) : [...current, room.roomCode])} /><span><strong>{room.roomCode}</strong><small>{room.capacity || 0} chỗ · {room.roomName || 'Phòng học'}</small><em>{room.reason}</em></span></label>;
                    })}</div> : <div className="exam-inline-success"><CheckCircle2 size={16} /> Tất cả phòng khả dụng đã được thêm vào ca thi.</div>}
                    {!!blockedPhysicalRooms.length && <details className="exam-blocked-rooms"><summary>{blockedPhysicalRooms.length} phòng không thể chọn do trùng ca thi</summary><div>{blockedPhysicalRooms.map((room) => <span key={room.roomId}><b>{room.roomCode}</b><small>{room.conflictingSubject} · {room.conflictingStartTime} · {room.reason}</small></span>)}</div></details>}
                  </div>}
                  {editingRoomId && <div className="exam-room-editor exam-room-editor-editing">
                    <div className="exam-form-title"><strong>2. Phân công giám thị cho phòng {roomForm.roomCode}</strong><span>Có thể giảm sức chứa sử dụng, nhưng không được vượt sức chứa thật.</span></div>
                    <label><span>Phòng thi</span><input className="live-input" value={roomForm.roomCode} disabled /></label>
                    <label><span>Sức chứa sử dụng</span><input className="live-input" type="number" min="1" max={(schoolRooms.data || []).find((room) => room.code === roomForm.roomCode)?.capacity || 1000} value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} /></label>
                    <label><span>Giám thị chính <b>*</b></span><select className="live-select" value={roomForm.proctorOneId} onChange={(e) => setRoomForm({ ...roomForm, proctorOneId: e.target.value })}><option value="">Chọn giáo viên đang rảnh</option>{manualProctorOptions.map((x) => <option key={x.teacherId} value={x.teacherId}>{x.teacherName} · {x.currentDutyCount} ca · {x.teachesExamSubject ? 'cùng môn' : 'khác môn'}</option>)}</select><small className="exam-field-help">Chỉ loại giáo viên đang coi một ca thi khác trùng giờ; lịch dạy thường được tạm dừng.</small></label>
                    <label><span>Giám thị hỗ trợ</span><select className="live-select" value={roomForm.proctorTwoId} onChange={(e) => setRoomForm({ ...roomForm, proctorTwoId: e.target.value })}><option value="">Không bắt buộc</option>{manualProctorOptions.filter((x) => x.teacherId !== roomForm.proctorOneId).map((x) => <option key={x.teacherId} value={x.teacherId}>{x.teacherName} · {x.currentDutyCount} ca · {x.teachesExamSubject ? 'cùng môn' : 'khác môn'}</option>)}</select></label>
                    <div className="exam-editor-actions"><button className="live-btn ghost" onClick={() => { setEditingRoomId(''); setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' }); }}><X size={15} /> Hủy</button><button className="live-btn" disabled={busy || !roomForm.proctorOneId || roomForm.capacity < 1} onClick={saveRoom}><Save size={15} /> Lưu giám thị</button></div>
                  </div>}
                  <Async state={rooms} allowEmpty empty="Chưa có phòng thi. Hãy thêm phòng đầu tiên ở biểu mẫu phía trên.">
                    {(rows) => <div className="exam-room-grid">{rows.map((room) => <article key={room.id} className={room.proctorOneId ? 'ready' : 'missing-proctor'}>
                      <span className="exam-room-icon"><DoorOpen size={20} /></span>
                      <div><strong>{room.roomCode} · {room.capacity} chỗ</strong><span className={room.proctorOneId ? 'room-status-ready' : 'room-status-missing'}>{room.proctorOneId ? 'Đã có giám thị' : 'Thiếu giám thị chính'}</span>{lockedProctorRoomIds.includes(room.id) && <span className="room-status-locked"><Lock size={11} /> Giữ nguyên khi tự động xếp</span>}<small><b>Chính:</b> {room.proctorOneName || 'Chưa phân công'}</small><small><b>Hỗ trợ:</b> {room.proctorTwoName || 'Không có'}</small></div>
                      <div className="exam-row-actions"><button className={lockedProctorRoomIds.includes(room.id) ? 'is-locked' : ''} title={lockedProctorRoomIds.includes(room.id) ? 'Bỏ giữ nguyên phân công' : 'Giữ nguyên phân công hiện tại'} onClick={() => toggleLockedProctorRoom(room)}>{lockedProctorRoomIds.includes(room.id) ? <Lock size={14} /> : <Unlock size={14} />}</button><button title="Phân công hoặc sửa giám thị" onClick={() => editRoom(room)}><Pencil size={14} /></button><button className="danger" title="Xóa phòng" onClick={() => deleteRoom(room)}><Trash2 size={14} /></button></div>
                    </article>)}</div>}
                  </Async>
                  {!!rooms.data?.length && <section className="exam-proctor-automation">
                    <header className="exam-proctor-heading">
                      <div className="exam-proctor-title"><span><Sparkles size={19} /></span><div><small>PHÂN CÔNG NHANH</small><h5>Để hệ thống chọn giám thị phù hợp</h5><p>Bạn xem trước kết quả rồi mới áp dụng. Dữ liệu hiện tại chưa thay đổi ở bước xem trước.</p></div></div>
                      <div className="exam-proctor-actions">
                        <label className="exam-proctor-switch"><input type="checkbox" checked={includeSecondProctor} onChange={(event) => setIncludeSecondProctor(event.target.checked)} /><span><b>Thêm giám thị hỗ trợ</b><small>Mỗi phòng có 2 giáo viên</small></span></label>
                        <button className="live-btn ghost" disabled={busy} onClick={previewProctors}><Sparkles size={15} /> {activeProctorPlan ? 'Tạo lại đề xuất' : 'Tạo đề xuất'}</button>
                      </div>
                    </header>
                    <div className="exam-proctor-rules">
                      <span><CheckCircle2 size={14} /><b>Không trùng ca thi</b><small>Lịch dạy thường không chặn phân công ngày thi</small></span>
                      <span><ShieldCheck size={14} /><b>Ưu tiên khác môn</b><small>Giảm xung đột chuyên môn môn thi</small></span>
                      <span><UsersRound size={14} /><b>Cân bằng nhiệm vụ</b><small>Ưu tiên người đang có ít ca hơn</small></span>
                    </div>
                    {activeProctorPlan ? <div className="exam-proctor-preview">
                      <div className="exam-proctor-summary">
                        <div><span className={`exam-proctor-state ${activeProctorPlan.status.toLowerCase()}`}>{activeProctorPlan.status === 'PREVIEW' ? 'Bản xem trước' : 'Đã áp dụng'}</span><strong>{activeProctorPlan.readyRoomCount}/{activeProctorPlan.roomCount} phòng sẵn sàng</strong><small>{activeProctorPlan.missingAssignmentCount ? `${activeProctorPlan.missingAssignmentCount} phòng cần chọn lại` : 'Không phát hiện trùng lịch'}</small></div>
                        <div className="exam-proctor-confirm">{activeProctorPlan.status === 'PREVIEW' && <button className="live-btn" disabled={busy || activeProctorPlan.missingAssignmentCount > 0} onClick={applyProctors}><CheckCircle2 size={15} /> Xác nhận và áp dụng</button>}{activeProctorPlan.status === 'APPLIED' && <button className="live-btn ghost" disabled={busy} onClick={undoProctors}><RotateCcw size={15} /> Hoàn tác</button>}</div>
                      </div>
                      {!!activeProctorPlan.warningSummary && <div className="exam-proctor-warning"><AlertTriangle size={15} /> {activeProctorPlan.warningSummary}</div>}
                      <div className="exam-proctor-plan-grid">{activeProctorPlan.items.map((item) => <article key={item.roomId} className={`${item.status === 'READY' ? 'ready' : 'warning'} ${item.locked ? 'locked' : ''}`}>
                        <div className="exam-proctor-room"><span><DoorOpen size={15} /></span><strong>{item.roomCode}</strong>{item.locked && <em><Lock size={11} /> Đã khóa</em>}<b>{item.status === 'READY' ? 'Sẵn sàng' : 'Cần xử lý'}</b></div>
                        <div className="exam-proctor-change"><div><small>Hiện tại</small><span>{item.previousProctorOneName || 'Chưa có giám thị'}</span>{item.previousProctorTwoName && <span>{item.previousProctorTwoName}</span>}</div><span className="exam-proctor-arrow">→</span><div><small>Hệ thống đề xuất</small><strong>{item.proposedProctorOneName || 'Chưa tìm được'}</strong>{item.proposedProctorOneName && <em>{item.proctorOneDutyCount || 0} ca đang phụ trách</em>}{item.proposedProctorTwoName && <><strong>{item.proposedProctorTwoName}</strong><em>{item.proctorTwoDutyCount || 0} ca đang phụ trách</em></>}</div></div>
                        <p>{item.message}</p>
                      </article>)}</div>
                    </div> : <div className="exam-proctor-empty"><span><Sparkles size={18} /></span><div><strong>Chưa tạo đề xuất</strong><small>Nếu muốn giữ một giáo viên đã chọn, nhấn biểu tượng khóa tại phòng đó trước khi tạo đề xuất.</small></div></div>}
                    {!!proctorPlans.data?.length && <details className="exam-proctor-history"><summary>Lịch sử phân công ({proctorPlans.data.length})</summary><div>{proctorPlans.data.map((plan) => <span key={plan.id}><b>{plan.status === 'PREVIEW' ? 'Xem trước' : plan.status === 'APPLIED' ? 'Đã áp dụng' : plan.status === 'UNDONE' ? 'Đã hoàn tác' : 'Đã thay thế'}</b><small>{new Date(plan.createdAt).toLocaleString('vi-VN')} · {plan.readyRoomCount}/{plan.roomCount} phòng</small></span>)}</div></details>}
                  </section>}
                  {!!readiness.data?.warnings.length && <div className="exam-readiness-warnings">{readiness.data.warnings.filter((warning) => !warning.includes('thí sinh chưa được xếp')).map((warning) => <span key={warning}><AlertTriangle size={14} /> {warning}</span>)}</div>}
                </section>

                <section className="exam-operation-panel exam-candidate-panel">
                  <header>
                    <div><span><UsersRound size={18} /></span><div><h4>Tự động xếp thí sinh và cấp SBD</h4><p>Hệ thống ưu tiên giữ học sinh cùng lớp trong một phòng; khi cần sẽ tự chia lớp sang nhiều phòng mà không vượt sức chứa.</p></div></div>
                    <b className={candidatesReady ? 'is-ready' : 'needs-work'}>{readiness.data?.allocatedCount || 0}/{readiness.data?.candidateCount || 0} thí sinh</b>
                  </header>
                  {!roomsReady ? <div className="exam-step-warning"><AlertTriangle size={18} /><div><strong>Chưa thể xếp thí sinh</strong><span>{readiness.data?.warnings.filter((warning) => !warning.includes('chưa được xếp')).join(' · ') || 'Hãy chọn đủ phòng và phân công giám thị chính ở phần phía trên.'}</span></div></div> : <>
                    <div className="exam-plan-toolbar"><div><strong>Phương án tự động</strong><span>Xem trước không thay đổi dữ liệu. Chỉ nút “Áp dụng” mới lưu danh sách phòng, SBD và số ghế.</span></div><button className="live-btn ghost" disabled={busy} onClick={previewSeating}><Sparkles size={15} /> {activeSeatingPlan ? 'Tạo lại xem trước' : 'Tạo bản xem trước'}</button>{activeSeatingPlan?.status === 'PREVIEW' && <button className="live-btn" disabled={busy || !canApplyExamPlan(readiness.data, activeSeatingPlan)} onClick={applySeating}><CheckCircle2 size={15} /> Áp dụng phương án</button>}{activeSeatingPlan?.status === 'APPLIED' && <button className="live-btn ghost" disabled={busy} onClick={undoSeating}><RotateCcw size={15} /> Hoàn tác</button>}</div>
                    {activeSeatingPlan ? <div className="exam-plan-preview">
                      <div className="exam-plan-summary"><article><small>Trạng thái</small><strong>{activeSeatingPlan.status === 'PREVIEW' ? 'Đang xem trước' : 'Đã áp dụng'}</strong></article><article><small>Đã xếp</small><strong>{activeSeatingPlan.assignedCount}/{activeSeatingPlan.candidateCount}</strong></article><article className={activeSeatingPlan.unassignedCount ? 'danger' : 'success'}><small>Chưa có chỗ</small><strong>{activeSeatingPlan.unassignedCount}</strong></article><article><small>Sức chứa còn trống</small><strong>{Math.max(0, activeSeatingPlan.totalCapacity - activeSeatingPlan.assignedCount)}</strong></article></div>
                      {!!activeSeatingPlan.warningSummary && <div className="exam-plan-notice"><AlertTriangle size={16} /> {activeSeatingPlan.warningSummary}</div>}
                      <div className="exam-plan-room-grid">{activeSeatingPlan.rooms.map((room) => <article key={room.roomId} className={!room.hasMainProctor ? 'warning' : ''}><div><strong>{room.roomCode}</strong><span>{room.assignedCount}/{room.capacity} chỗ</span></div><progress max={room.capacity} value={room.assignedCount} /><small>Lớp: {room.classCodes.join(', ') || 'Chưa có'} · Còn {room.remainingCapacity} chỗ</small></article>)}</div>
                      <div className="exam-plan-class-list">{activeSeatingPlan.classes.map((item) => <article key={item.classId}><span className="exam-grader-class">{item.classCode}</span><div><strong>{item.assignedCount}/{item.candidateCount} thí sinh đã có chỗ</strong><small>{item.roomCount > 1 ? `Được chia hợp lệ qua ${item.roomCount} phòng: ${item.roomCodes.join(', ')}` : `Phòng ${item.roomCodes[0] || 'chưa xếp'}`}</small></div><b className={item.assignedCount === item.candidateCount ? 'complete' : ''}>{item.assignedCount === item.candidateCount ? 'Đủ' : 'Thiếu'}</b></article>)}</div>
                      <details className="exam-candidate-details"><summary>Xem danh sách SBD và số ghế ({activeSeatingPlan.candidates.length})</summary><div className="live-table-wrap"><table className="live-table"><thead><tr><th>SBD</th><th>Học sinh</th><th>Lớp</th><th>Phòng</th><th>Ghế</th></tr></thead><tbody>{activeSeatingPlan.candidates.map((item) => <tr key={item.studentId}><td className="candidate-number">{item.candidateNo}</td><td>{item.studentName}</td><td>{item.classCode}</td><td>{item.roomCode || 'Chưa xếp'}</td><td>{item.seatNo || '—'}</td></tr>)}</tbody></table></div></details>
                    </div> : <div className="exam-plan-empty"><Sparkles size={22} /><strong>Chưa có bản xem trước</strong><span>Nhấn “Tạo bản xem trước” để biết từng phòng nhận bao nhiêu học sinh và lớp nào cần chia phòng.</span></div>}
                    <details className="exam-manual-allocation"><summary>Điều chỉnh thủ công một lớp (nâng cao)</summary><div className="exam-allocation-editor"><label><span>Phòng tiếp nhận</span><select className="live-select" value={allocationRoomId} onChange={(event) => setAllocationRoomId(event.target.value)}><option value="">Chọn phòng</option>{(rooms.data || []).map((room) => <option key={room.id} value={room.id}>{room.roomCode} · {room.capacity} chỗ</option>)}</select></label><label><span>Lớp dự thi</span><select className="live-select" value={allocationClassId} onChange={(event) => setAllocationClassId(event.target.value)}><option value="">Chọn lớp</option>{selectedScheduleClasses.map((item) => <option key={item.id} value={item.id}>{item.code}{candidatesByClass.get(item.id) ? ` · Đã xếp ${candidatesByClass.get(item.id)} HS` : ''}</option>)}</select></label><button className="live-btn" disabled={busy || !allocationRoomId || !allocationClassId} onClick={allocate}><UsersRound size={15} /> Xếp lại lớp</button></div></details>
                    {!!seatingPlans.data?.length && <details className="exam-plan-history"><summary>Lịch sử phương án ({seatingPlans.data.length})</summary><div>{seatingPlans.data.map((plan, index) => <article key={plan.id}><span>{index + 1}</span><div><strong>{examPlanStatusLabel(plan.status)}</strong><small>{new Date(plan.createdAt).toLocaleString('vi-VN')} · {plan.assignedCount}/{plan.candidateCount} thí sinh</small></div></article>)}</div></details>}
                  </>}
                  {candidatesReady && <button className="exam-next-step" type="button" onClick={() => setSetupStep('graders')}>Tiếp tục phân công chấm thi <ClipboardPenLine size={15} /></button>}
                </section>
                </div>}
                */}

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

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, CalendarCheck2, CheckCircle2, ClipboardCheck, Clock3,
  Copy, History, LockKeyhole, Pencil, Rocket, RotateCcw, Send, Sparkles, Trash2, UserRoundCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { updateHashQuery, useHashString } from '../../api/urlState';
import type {
  AcademicYear, AutoAssignmentPlan, AutoTimetablePlan, CurriculumReadiness, CurriculumRequirement,
  CurriculumRequirementHistory, Semester, Subject, TeacherLoadRegistration, TeacherWorkspaceContext,
  TeachingAssignment, TimetableVersion,
} from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';

const GRADES = ['K10', 'K11', 'K12'];
const DAYS = [
  ['MON', 'Thứ 2'], ['TUE', 'Thứ 3'], ['WED', 'Thứ 4'],
  ['THU', 'Thứ 5'], ['FRI', 'Thứ 6'], ['SAT', 'Thứ 7'],
] as const;

function useSelectedSemester() {
  const semesters = useApi<Semester[]>('/semesters');
  const years = useApi<AcademicYear[]>('/academicYears');
  const [semesterId, setSemesterId] = useHashString('hoc_ky', '');
  const operationalYearIds = useMemo(() => new Set((years.data || [])
    .filter((year) => year.status === 'ACTIVE' || year.status === 'PLANNED').map((year) => year.id)), [years.data]);
  const semesterOptions = useMemo(() => (semesters.data || []).filter((item) => item.status !== 'CLOSED'
    && operationalYearIds.has(item.academicYearId)), [operationalYearIds, semesters.data]);
  useEffect(() => {
    if (!semesterOptions.length) {
      if (semesterId) setSemesterId('');
      return;
    }
    const currentSemesterExists = semesterOptions.some((item) => item.id === semesterId);
    if (currentSemesterExists) return;
    const preferred = semesterOptions.find((item) => item.status === 'ACTIVE')
      ?? semesterOptions.find((item) => item.status === 'PLANNED')
      ?? semesterOptions[0];
    setSemesterId(preferred.id);
  }, [semesterId, semesterOptions, setSemesterId]);
  const semesterLabel = (semester: Semester) => {
    const year = years.data?.find((item) => item.id === semester.academicYearId);
    const status = semester.status === 'ACTIVE' ? 'Đang hoạt động'
      : semester.status === 'PLANNED' ? 'Sắp diễn ra'
        : semester.status === 'COMPLETED' ? 'Đã kết thúc' : semester.status;
    return `${year?.code || 'Chưa rõ năm học'} · ${semester.name} · ${status}`;
  };
  return { semesters, semesterOptions, semesterId, setSemesterId, semesterLabel };
}

export function TeacherLoadRegistrationLive() {
  const { semesterOptions, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const workspace = useApi<TeacherWorkspaceContext>('/me/teacher-workspace');
  const registration = useApi<TeacherLoadRegistration>(
    semesterId ? `/me/teacher-load-registration?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const toast = useToast();
  const [maxPeriods, setMaxPeriods] = useState(20);
  const [grades, setGrades] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const editableByStatus = !registration.data || ['DRAFT', 'REJECTED'].includes(registration.data.status);
  const editable = editableByStatus && workspace.data?.loadRegistrationEditable === true
    && workspace.data.semesterId === semesterId;

  useEffect(() => {
    if (workspace.data?.semesterId && semesterOptions.some((item) => item.id === workspace.data?.semesterId)
      && semesterId !== workspace.data.semesterId) {
      setSemesterId(workspace.data.semesterId);
    }
  }, [semesterId, semesterOptions, setSemesterId, workspace.data?.semesterId]);

  useEffect(() => {
    if (!registration.data) return;
    setMaxPeriods(registration.data.maxWeeklyPeriods);
    setGrades(registration.data.preferredGradeLevels || []);
    setUnavailable(registration.data.unavailableSlots || []);
    setNote(registration.data.note || '');
  }, [registration.data]);

  const toggle = (values: string[], value: string, update: (next: string[]) => void) =>
    update(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);

  const save = async () => {
    if (!semesterId) return;
    setBusy(true);
    try {
      await api.put('/me/teacher-load-registration', {
        semesterId, maxWeeklyPeriods: maxPeriods,
        unavailableSlots: unavailable, preferredGradeLevels: grades, note,
      });
      toast.show('ok', 'Đã lưu đăng ký tải dạy');
      await registration.reload();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể lưu đăng ký');
    } finally { setBusy(false); }
  };

  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/me/teacher-load-registration/submit?semesterId=${encodeURIComponent(semesterId)}`);
      toast.show('ok', 'Đã gửi đăng ký để quản trị viên duyệt');
      await registration.reload();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể gửi đăng ký');
    } finally { setBusy(false); }
  };

  return (
    <Section
      title="Đăng ký tải dạy học kỳ"
      subtitle="Khai báo số tiết tối đa, khung giờ không thể dạy và khối lớp ưu tiên trước khi nhà trường phân công"
      action={registration.data && <StatusPill value={registration.data.status} />}
      wide
    >
      <div className="load-registration-overview">
        <div className="load-registration-intro">
          <span><Clock3 size={22} /></span>
          <div><strong>Chủ động lịch giảng dạy</strong><small>Dữ liệu đã duyệt được dùng để hệ thống cân bằng tải và tránh xếp lịch sai.</small></div>
        </div>
        {registration.data && (
          <div className="load-registration-metrics">
            <div><span>Đã phân công</span><strong>{registration.data.assignedWeeklyPeriods} tiết</strong></div>
            <div><span>Còn khả dụng</span><strong>{registration.data.remainingWeeklyPeriods} tiết</strong></div>
          </div>
        )}
      </div>
      {workspace.data && <div className={`load-registration-window ${workspace.data.loadRegistrationOpen ? 'is-open' : 'is-closed'}`}>
        {workspace.data.loadRegistrationOpen ? <CalendarCheck2 size={18} /> : <LockKeyhole size={18} />}
        <div><strong>{workspace.data.loadRegistrationOpen ? 'Đang trong thời gian đăng ký' : 'Cổng đăng ký hiện đã đóng'}</strong>
          <small>{workspace.data.loadRegistrationOpensOn && workspace.data.loadRegistrationClosesOn
            ? `Thời gian: ${workspace.data.loadRegistrationOpensOn} đến ${workspace.data.loadRegistrationClosesOn}`
            : 'Thời gian đăng ký chưa được xác định'}</small></div>
      </div>}
      <div className="load-form-grid">
        <label><span>Học kỳ</span><select value={semesterId} disabled={Boolean(workspace.data?.semesterId)} onChange={(event) => setSemesterId(event.target.value)}>
          {semesterOptions.map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
        </select></label>
        <label><span>Số tiết tối đa/tuần</span><input type="number" min={1} max={60} disabled={!editable}
          value={maxPeriods} onChange={(event) => setMaxPeriods(Number(event.target.value))} /></label>
        <label className="load-note"><span>Ghi chú cho người phân công</span><input disabled={!editable}
          value={note} onChange={(event) => setNote(event.target.value)}
          placeholder="Ví dụ: ưu tiên không xếp tiết cuối thứ 6" /></label>
      </div>
      <div className="load-preferences">
        <div><strong>Khối lớp ưu tiên</strong><small>Đây là ưu tiên mềm, không phải giới hạn bắt buộc.</small></div>
        <div className="choice-chips">{GRADES.map((grade) => <button type="button" key={grade}
          disabled={!editable} className={grades.includes(grade) ? 'selected' : ''}
          onClick={() => toggle(grades, grade, setGrades)}>{grade.replace('K', 'Khối ')}</button>)}</div>
      </div>
      <div className="availability-editor">
        <div><strong>Khung giờ không thể dạy</strong><small>Chọn những tiết hệ thống phải loại khỏi lịch của thầy cô.</small></div>
        <div className="availability-grid">
          <span />
          {[1, 2, 3, 4, 5, 6].map((period) => <b key={period}>Tiết {period}</b>)}
          {DAYS.map(([day, label]) => [
            <strong key={`${day}-label`}>{label}</strong>,
            ...[1, 2, 3, 4, 5, 6].map((period) => {
              const value = `${day}:${period}`;
              return <button key={value} type="button" disabled={!editable}
                className={unavailable.includes(value) ? 'blocked' : ''}
                onClick={() => toggle(unavailable, value, setUnavailable)}
                title={unavailable.includes(value) ? 'Không thể dạy' : 'Có thể dạy'}>
                {unavailable.includes(value) ? 'Bận' : 'Rảnh'}
              </button>;
            }),
          ])}
        </div>
      </div>
      {registration.data?.reviewNote && <div className="inline-warning"><AlertTriangle size={16} /> Phản hồi: {registration.data.reviewNote}</div>}
      <div className="load-form-actions">
        <button className="live-btn subtle" disabled={!editable || busy} onClick={save}><ClipboardCheck size={16} /> Lưu bản nháp</button>
        <button className="live-btn primary" disabled={!editable || !registration.data || busy} onClick={submit}><Send size={16} /> Gửi duyệt</button>
      </div>
    </Section>
  );
}

export function AdminWorkloadPlanningLive() {
  const { semesterOptions, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const subjects = useApi<Subject[]>('/subjects');
  const requirements = useApi<CurriculumRequirement[]>(
    semesterId ? `/curriculum-requirements?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const readiness = useApi<CurriculumReadiness>(
    semesterId ? `/curriculum-requirements/readiness?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const history = useApi<CurriculumRequirementHistory[]>(
    semesterId ? `/curriculum-requirements/history?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const registrations = useApi<TeacherLoadRegistration[]>(
    semesterId ? `/teacher-load-registrations?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const toast = useToast();
  const [grade, setGrade] = useHashString('dinh_muc_khoi', 'K10');
  const [subjectId, setSubjectId] = useState('');
  const [periods, setPeriods] = useState(2);
  const [plan, setPlan] = useState<AutoAssignmentPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'subjects' | 'teachers' | 'review'>('subjects');
  const [lastDeleted, setLastDeleted] = useState<CurriculumRequirement | null>(null);
  const [copySourceSemesterId, setCopySourceSemesterId] = useState('');
  const [copySourceGrade, setCopySourceGrade] = useState('K10');
  const [showHistory, setShowHistory] = useState(false);
  const pending = (registrations.data || []).filter((item) => item.status === 'SUBMITTED').length;
  const approved = (registrations.data || []).filter((item) => ['APPROVED', 'LOCKED'].includes(item.status)).length;
  const assignmentComplete = Boolean(plan && plan.unassignedCount === 0
    && (plan.applied || plan.proposedCount === 0 && plan.existingCount > 0));
  const curriculumComplete = readiness.data?.complete === true;

  const reloadCurriculum = async () => {
    await Promise.all([requirements.reload(), readiness.reload(), history.reload()]);
  };

  const saveRequirement = async () => {
    if (!semesterId || !subjectId) return;
    try {
      await api.put('/curriculum-requirements', { semesterId, gradeLevel: grade, subjectId, weeklyPeriods: periods });
      toast.show('ok', 'Đã cập nhật định mức môn học');
      await reloadCurriculum();
      setSubjectId('');
      setLastDeleted(null);
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể lưu định mức'); }
  };

  const review = async (item: TeacherLoadRegistration, status: string) => {
    try {
      const reviewNote = status === 'REJECTED' ? window.prompt('Lý do cần giáo viên điều chỉnh:') : null;
      if (status === 'REJECTED' && reviewNote === null) return;
      await api.put(`/teacher-load-registrations/${item.id}/status`, { status, reviewNote });
      toast.show('ok', status === 'APPROVED' ? 'Đã duyệt tải dạy' : status === 'DRAFT' ? 'Đã mở lại đăng ký' : 'Đã gửi yêu cầu điều chỉnh');
      await registrations.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật'); }
  };

  const editRequirement = (item: CurriculumRequirement) => {
    setGrade(item.gradeLevel);
    setSubjectId(item.subjectId);
    setPeriods(item.weeklyPeriods);
  };

  const deleteRequirement = async (item: CurriculumRequirement) => {
    if (!window.confirm(`Xóa định mức ${item.subjectName} của ${item.gradeLevel.replace('K', 'Khối ')}?`)) return;
    try {
      await api.del(`/curriculum-requirements/${item.id}`);
      setLastDeleted(item);
      await reloadCurriculum();
      toast.show('ok', `Đã xóa ${item.subjectName}. Bạn có thể hoàn tác ngay bên dưới.`);
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể xóa định mức'); }
  };

  const undoDelete = async () => {
    if (!lastDeleted) return;
    try {
      await api.put('/curriculum-requirements', {
        semesterId: lastDeleted.semesterId, gradeLevel: lastDeleted.gradeLevel,
        subjectId: lastDeleted.subjectId, weeklyPeriods: lastDeleted.weeklyPeriods,
      });
      toast.show('ok', `Đã khôi phục định mức ${lastDeleted.subjectName}`);
      setLastDeleted(null);
      await reloadCurriculum();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể hoàn tác'); }
  };

  const copyRequirements = async () => {
    if (!copySourceSemesterId) return toast.show('err', 'Hãy chọn học kỳ nguồn');
    try {
      await api.post('/curriculum-requirements/copy', {
        sourceSemesterId: copySourceSemesterId, sourceGradeLevel: copySourceGrade,
        targetSemesterId: semesterId, targetGradeLevel: grade, overwrite: true,
      });
      toast.show('ok', `Đã sao chép định mức ${copySourceGrade} vào ${grade}`);
      await reloadCurriculum();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể sao chép định mức'); }
  };

  const updateSpecialization = async (item: TeacherLoadRegistration) => {
    const mainSubject = window.prompt(`Chuyên môn chính của ${item.teacherName}:`, item.mainSubject || '');
    if (mainSubject === null) return;
    if (!mainSubject.trim()) return toast.show('err', 'Vui lòng nhập chuyên môn chính');
    try {
      await api.put(`/users/${item.teacherId}/specialization`, { mainSubject: mainSubject.trim() });
      toast.show('ok', `Đã chuẩn hóa chuyên môn của ${item.teacherName}`);
      await registrations.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật chuyên môn'); }
  };

  const generatePlan = async (apply: boolean) => {
    setBusy(true);
    try {
      const result = await api.post<AutoAssignmentPlan>('/teaching-assignments/auto-plan', {
        semesterId, apply, allowPartial: false,
      });
      setPlan(result);
      toast.show('ok', apply
        ? result.proposedCount > 0 ? `Đã lưu ${result.proposedCount} phân công giáo viên` : 'Các phân công này đã được lưu trước đó'
        : 'Đã tạo phương án xem trước');
      if (apply) {
        await registrations.reload();
        updateHashQuery({ tab: 'automatic' }, 'push');
      }
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể tạo phương án'); }
    finally { setBusy(false); }
  };

  const groupedRequirements = useMemo(() => GRADES.map((item) => ({
    grade: item, rows: (requirements.data || []).filter((row) => row.gradeLevel === item),
  })), [requirements.data]);
  const activeRequirementGroup = groupedRequirements.find((item) => item.grade === grade)
    ?? groupedRequirements[0];
  const activeReadiness = readiness.data?.grades.find((item) => item.gradeLevel === grade);
  const expectedSubjectCount = readiness.data?.expectedSubjectCount || subjects.data?.length || 0;
  const missingSubjects = activeReadiness?.missingSubjects || [];
  const selectedGradePeriods = activeRequirementGroup?.rows.reduce((sum, item) => sum + item.weeklyPeriods, 0) || 0;
  const unusualRequirements = (activeRequirementGroup?.rows || []).filter((item) => item.weeklyPeriods > 10);
  const unusualTotal = selectedGradePeriods > 0 && (selectedGradePeriods < 25 || selectedGradePeriods > 40);
  const registrationByTeacher = useMemo(() => new Map(
    (registrations.data || []).map((item) => [item.teacherId, item]),
  ), [registrations.data]);
  const finalProjectedLoad = useMemo(() => {
    const values = new Map<string, number>();
    (plan?.items || []).forEach((item) => {
      if (!item.teacherId) return;
      values.set(item.teacherId, Math.max(values.get(item.teacherId) || 0, item.projectedTeacherPeriods));
    });
    return values;
  }, [plan]);

  return (
    <div className="workload-planning-page">
      <div className="planning-control-shell">
        <div className="planning-control-heading">
          <div><span>PHÂN CÔNG TỰ ĐỘNG</span><strong>Chuẩn bị dữ liệu theo học kỳ</strong><small>Chỉ lưu vào hệ thống sau khi bạn kiểm tra và xác nhận phương án.</small></div>
          <label className="semester-focus"><span>Học kỳ đang lập kế hoạch</span><select aria-label="Học kỳ đang lập kế hoạch" value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setPlan(null); setStage('subjects'); }}>
            {semesterOptions.map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
          </select></label>
        </div>
        <div className="planning-stepper planning-stepper-buttons">
          <button type="button" className={`${stage === 'subjects' ? 'active' : ''} ${curriculumComplete ? 'done' : ''}`} onClick={() => setStage('subjects')}><span>1</span><strong>Khai báo số tiết</strong><small>{curriculumComplete ? 'Đã đủ định mức cho mọi khối' : 'Cần hoàn thiện đủ môn trước'}</small></button>
          <button type="button" disabled={!curriculumComplete} className={`${stage === 'teachers' ? 'active' : ''} ${approved ? 'done' : ''}`} onClick={() => setStage('teachers')}><span>2</span><strong>Kiểm tra giáo viên</strong><small>{curriculumComplete ? `${pending} chờ duyệt · ${approved} có thể phân công` : 'Đang khóa vì thiếu định mức'}</small></button>
          <button type="button" disabled={!curriculumComplete || !approved} className={`${stage === 'review' ? 'active' : ''} ${plan ? 'done' : ''}`} onClick={() => setStage('review')}><span>3</span><strong>Xem và xác nhận</strong><small>{!curriculumComplete ? 'Hoàn thiện bước 1 trước' : approved ? 'Kiểm tra kết quả trước khi lưu' : 'Cần duyệt giáo viên ở bước 2'}</small></button>
        </div>
      </div>

      {stage === 'subjects' && (
      <Section title="Định mức môn học theo khối" subtitle="Hoàn thiện đủ danh mục môn và số tiết mỗi tuần trước khi phân công giáo viên" wide>
        <div className={`curriculum-readiness-banner ${curriculumComplete ? 'is-complete' : 'is-incomplete'}`}>
          {curriculumComplete ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          <div><strong>{curriculumComplete ? 'Định mức đã sẵn sàng để phân công' : 'Định mức chưa đầy đủ — bước tiếp theo đang được khóa'}</strong>
            <span>{curriculumComplete ? `Đã kiểm tra đủ ${expectedSubjectCount} môn cho tất cả các khối.` : 'Chọn từng khối bên dưới và bổ sung các môn còn thiếu.'}</span></div>
          <b>{readiness.data?.configuredRequirementCount || 0}/{(readiness.data?.grades.length || GRADES.length) * expectedSubjectCount} môn–khối</b>
        </div>

        <div className="requirement-grade-tabs" role="tablist" aria-label="Chọn khối cần khai báo">
          {groupedRequirements.map((group) => {
            const status = readiness.data?.grades.find((item) => item.gradeLevel === group.grade);
            const complete = status?.complete === true;
            return <button type="button" role="tab" aria-selected={grade === group.grade}
              className={`${grade === group.grade ? 'active' : ''} ${complete ? 'complete' : 'incomplete'}`}
              key={group.grade} onClick={() => setGrade(group.grade)}>
              <span>{group.grade.replace('K', 'Khối ')}</span>
              <small>{group.rows.length}/{expectedSubjectCount} môn · {status?.totalWeeklyPeriods || 0} tiết/tuần</small>
              <em>{complete ? 'Đã hoàn thiện' : `Thiếu ${status?.missingSubjects.length ?? Math.max(0, expectedSubjectCount - group.rows.length)} môn`}</em>
            </button>;
          })}
        </div>

        <div className="curriculum-grade-summary">
          <div><span>Khối đang thiết lập</span><strong>{grade.replace('K', 'Khối ')}</strong></div>
          <div><span>Số môn</span><strong>{activeRequirementGroup?.rows.length || 0}/{expectedSubjectCount}</strong></div>
          <div><span>Tổng tải học</span><strong>{selectedGradePeriods} tiết/tuần</strong></div>
          <div><span>Trạng thái</span><strong className={activeReadiness?.complete ? 'text-success' : 'text-warning'}>{activeReadiness?.complete ? 'Sẵn sàng' : 'Cần bổ sung'}</strong></div>
        </div>

        {missingSubjects.length > 0 && <div className="curriculum-missing-panel">
          <div><AlertTriangle size={18} /><span><strong>Còn thiếu {missingSubjects.length} môn</strong><small>Chọn một môn để điền nhanh vào biểu mẫu.</small></span></div>
          <div>{missingSubjects.map((item) => <button type="button" key={item.subjectId}
            onClick={() => { setSubjectId(item.subjectId); setPeriods(2); }}>{item.subjectName}</button>)}</div>
        </div>}
        {(unusualTotal || unusualRequirements.length > 0) && <div className="inline-warning">
          <AlertTriangle size={17} /> Định mức có dấu hiệu bất thường:
          {unusualTotal ? ` tổng ${selectedGradePeriods} tiết/tuần nằm ngoài khoảng tham chiếu 25–40` : ''}
          {unusualRequirements.length ? `; ${unusualRequirements.map((item) => item.subjectName).join(', ')} vượt 10 tiết/tuần` : ''}.
        </div>}

        <div className="requirement-form requirement-form-compact">
          <select aria-label="Môn học cần khai báo" value={subjectId} onChange={(event) => {
            const nextId = event.target.value;
            setSubjectId(nextId);
            const existing = activeRequirementGroup?.rows.find((item) => item.subjectId === nextId);
            if (existing) setPeriods(existing.weeklyPeriods);
          }}><option value="">Chọn môn học</option>{(subjects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <label><span>Số tiết/tuần</span><input type="number" min={1} max={20} value={periods} onChange={(event) => setPeriods(Number(event.target.value))} /></label>
          <button className="live-btn primary" disabled={!subjectId || periods < 1 || periods > 20} onClick={saveRequirement}><BookOpenCheck size={16} /> {activeRequirementGroup?.rows.some((item) => item.subjectId === subjectId) ? 'Cập nhật định mức' : 'Thêm định mức'}</button>
        </div>

        <div className="requirement-columns requirement-single-column"><article>
          <header><strong>Danh sách môn {grade.replace('K', 'Khối ')}</strong><span>{activeRequirementGroup?.rows.length || 0} môn · {selectedGradePeriods} tiết/tuần</span></header>
          {activeRequirementGroup?.rows.length ? activeRequirementGroup.rows.map((item) => <div key={item.id}>
            <span>{item.subjectName}</span><b>{item.weeklyPeriods} tiết/tuần</b>
            <span className="requirement-row-actions"><button aria-label={`Sửa định mức ${item.subjectName}`} title="Sửa" onClick={() => editRequirement(item)}><Pencil size={14} /></button>
              <button aria-label={`Xóa định mức ${item.subjectName}`} title="Xóa" onClick={() => deleteRequirement(item)}><Trash2 size={14} /></button></span>
          </div>) : <p>Chưa có định mức cho khối này</p>}
        </article></div>

        {lastDeleted && <div className="curriculum-undo"><RotateCcw size={18} /><span>Đã xóa <strong>{lastDeleted.subjectName}</strong> của {lastDeleted.gradeLevel.replace('K', 'Khối ')}.</span><button className="live-btn subtle" onClick={undoDelete}>Hoàn tác</button></div>}

        <details className="curriculum-copy-panel">
          <summary><Copy size={17} /> Sao chép định mức từ học kỳ hoặc khối khác</summary>
          <div><label><span>Học kỳ nguồn</span><select value={copySourceSemesterId} onChange={(event) => setCopySourceSemesterId(event.target.value)}><option value="">Chọn học kỳ nguồn</option>{semesterOptions.map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}</select></label>
            <label><span>Khối nguồn</span><select value={copySourceGrade} onChange={(event) => setCopySourceGrade(event.target.value)}>{GRADES.map((item) => <option key={item} value={item}>{item.replace('K', 'Khối ')}</option>)}</select></label>
            <div className="copy-target"><span>Sao chép vào</span><strong>{grade.replace('K', 'Khối ')} · học kỳ hiện tại</strong></div>
            <button className="live-btn subtle" disabled={!copySourceSemesterId || (copySourceSemesterId === semesterId && copySourceGrade === grade)} onClick={copyRequirements}><Copy size={16} /> Sao chép và ghi đè</button></div>
        </details>

        <div className="curriculum-history-toggle"><button type="button" className="link-button" onClick={() => setShowHistory((value) => !value)}><History size={16} /> {showHistory ? 'Ẩn lịch sử thay đổi' : 'Xem lịch sử thay đổi'}</button></div>
        {showHistory && <div className="curriculum-history-list">{(history.data || []).length ? (history.data || []).slice(0, 20).map((item) => <div key={item.id}>
          <span><strong>{item.subjectName}</strong><small>{item.gradeLevel.replace('K', 'Khối ')} · {new Date(item.createdAt).toLocaleString('vi-VN')}</small></span>
          <b>{item.action === 'CREATED' ? 'Đã thêm' : item.action === 'UPDATED' ? `Đổi ${item.previousWeeklyPeriods} → ${item.newWeeklyPeriods}` : item.action === 'DELETED' ? 'Đã xóa' : 'Đã sao chép'}</b>
        </div>) : <p>Chưa có lịch sử thay đổi trong học kỳ này.</p>}</div>}

        <div className="wizard-footer"><span>{curriculumComplete ? 'Định mức đã hợp lệ' : 'Hoàn thiện đủ môn cho tất cả các khối để mở bước 2'}</span><button className="live-btn primary" disabled={!curriculumComplete} onClick={() => setStage('teachers')}>Tiếp theo: Kiểm tra giáo viên</button></div>
      </Section>
      )}

      {stage === 'teachers' && (
      <Section title="Đăng ký tải dạy của giáo viên" subtitle="Chỉ đăng ký đã duyệt mới được dùng trong thuật toán phân công" wide>
        <div className="plain-language-help"><UserRoundCheck size={20} /><div><strong>Kiểm tra khả năng nhận lớp của giáo viên</strong><span>“Tải tối đa” là số tiết giáo viên đăng ký có thể dạy trong một tuần. Hãy duyệt các đăng ký hợp lệ trước khi sang bước 3.</span></div></div>
        <Async state={registrations} empty="Chưa có giáo viên gửi đăng ký tải dạy" paginate pageSize={10} itemLabel="giáo viên" urlStateKey="teacher-load-review">
          {(rows) => <div className="teacher-load-table"><table className="live-table"><thead><tr><th>Giáo viên</th><th>Chuyên môn</th><th>Tải tối đa</th><th>Đã giao</th><th>Khối ưu tiên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.teacherName}</strong><small>{item.teacherCode || '—'}</small></td><td><div className="proposed-teacher"><strong>{item.mainSubject || 'Chưa cập nhật'}</strong><button type="button" className="link-button" onClick={() => updateSpecialization(item)}>Chuẩn hóa</button></div></td><td>{item.maxWeeklyPeriods} tiết</td><td>{item.assignedWeeklyPeriods}/{item.maxWeeklyPeriods}</td><td>{item.preferredGradeLevels.join(', ') || 'Không giới hạn'}</td><td><StatusPill value={item.status} /></td><td><div className="row-actions">
              {item.status === 'SUBMITTED' && <><button className="icon-btn success" title="Duyệt" onClick={() => review(item, 'APPROVED')}><CheckCircle2 size={16} /></button><button className="icon-btn danger" title="Yêu cầu điều chỉnh" onClick={() => review(item, 'REJECTED')}><AlertTriangle size={16} /></button></>}
              {['APPROVED', 'LOCKED', 'REJECTED'].includes(item.status) && <button className="icon-btn" title="Mở lại cho giáo viên sửa" onClick={() => review(item, 'DRAFT')}><LockKeyhole size={16} /></button>}
            </div></td></tr>)}</tbody></table></div>}
        </Async>
        <div className="wizard-footer"><button className="live-btn subtle" onClick={() => setStage('subjects')}>Quay lại số tiết</button><span>{approved} giáo viên sẵn sàng</span><button className="live-btn primary" disabled={!approved} onClick={() => setStage('review')}>Tiếp theo: Xem phương án</button></div>
      </Section>
      )}

      {stage === 'review' && (
      <Section title="Đề xuất phân công tự động" subtitle="Hệ thống giữ nguyên dữ liệu hiện có, ưu tiên đúng chuyên môn, không vượt tải và cân bằng giữa giáo viên" wide
        action={<div className="row-actions"><button className="live-btn subtle" disabled={busy || !semesterId || !curriculumComplete} onClick={() => generatePlan(false)}><Sparkles size={16} /> Làm mới bản xem trước</button>{assignmentComplete ? <><button className="live-btn success" disabled><CheckCircle2 size={16} /> Đã lưu phân công</button><button className="live-btn primary" onClick={() => updateHashQuery({ tab: 'automatic' }, 'push')}><CalendarCheck2 size={16} /> Tiếp theo: Tạo thời khóa biểu</button></> : <button className="live-btn primary" disabled={busy || !plan || plan.unassignedCount > 0 || plan.proposedCount === 0 || !curriculumComplete} onClick={() => generatePlan(true)}><UserRoundCheck size={16} /> Lưu các phân công được đề xuất</button>}</div>}>
        {!plan ? <div className="planning-empty"><Sparkles size={30} /><strong>Chưa tạo phương án</strong><span>Hoàn tất định mức và duyệt tải giáo viên, sau đó chọn “Tạo bản xem trước”.</span></div>
          : <>{assignmentComplete && <div className="assignment-applied-confirmation"><CheckCircle2 size={26} /><div><strong>Phân công giáo viên đã hoàn tất</strong><span>{plan.existingCount || plan.proposedCount} môn–lớp đã được lưu. Không cần áp dụng lại; hãy chuyển sang tạo thời khóa biểu.</span></div></div>}
          {!assignmentComplete && <div className="assignment-preview-guide">
            <div><Sparkles size={20} /><span><strong>Đây là bản xem trước</strong><small>Chưa lưu vào hệ thống cho đến khi bạn chọn “Áp dụng phương án”.</small></span></div>
            <div><UserRoundCheck size={20} /><span><strong>{plan.proposedCount} phân công môn–lớp</strong><small>Mỗi dòng là một môn của một lớp, không phải số lượng giáo viên.</small></span></div>
            <div><Clock3 size={20} /><span><strong>Tải hiển thị dạng đã dùng / giới hạn</strong><small>Ví dụ 24/28 nghĩa là giáo viên còn nhận được 4 tiết mỗi tuần.</small></span></div>
          </div>}
          <div className="plan-summary">
            <Badge tone="blue">{plan.existingCount} phân công được giữ nguyên</Badge><Badge tone="green">{plan.proposedCount} phân công mới được đề xuất</Badge>
            {plan.unassignedCount > 0 ? <Badge tone="red">{plan.unassignedCount} môn–lớp chưa có giáo viên</Badge> : <Badge tone="green">Tất cả đều trong giới hạn tải</Badge>}
          </div>
          <div className="teacher-load-table"><table className="live-table assignment-preview-table"><thead><tr><th>Lớp</th><th>Môn học</th><th>Số tiết/tuần</th><th>Giáo viên được đề xuất</th><th>Tổng tải của giáo viên sau phương án</th><th>Kết quả</th></tr></thead><tbody>
            {plan.items.map((item) => {
              const registration = item.teacherId ? registrationByTeacher.get(item.teacherId) : undefined;
              const projected = item.teacherId ? finalProjectedLoad.get(item.teacherId) || item.projectedTeacherPeriods : 0;
              const limit = registration?.maxWeeklyPeriods || 0;
              const percent = limit ? Math.min(100, Math.round(projected / limit * 100)) : 0;
              const remaining = Math.max(0, limit - projected);
              return <tr key={`${item.classId}-${item.subjectId}`}><td><strong>{item.classCode}</strong></td><td>{item.subjectName}</td><td><strong>{item.weeklyPeriods}</strong> tiết</td><td>{item.teacherName ? <div className="proposed-teacher"><strong>{item.teacherName}</strong><small>{registration?.mainSubject || item.subjectName}</small></div> : <span className="missing-teacher">Chưa có giáo viên phù hợp</span>}</td><td>{item.teacherName && limit ? <div className="projected-load"><div><strong>{projected}/{limit} tiết</strong><span>Còn {remaining} tiết</span></div><span className="projected-load-track"><i style={{ width: `${percent}%` }} /></span></div> : '—'}</td><td>{item.status === 'PROPOSED' ? <Badge tone="green">Có thể phân công</Badge> : item.status === 'EXISTING' ? <Badge tone="blue">Đang phụ trách</Badge> : <Badge tone="red">Cần xử lý</Badge>}</td></tr>;
            })}
          </tbody></table></div></>}
        <div className="wizard-footer"><button className="live-btn subtle" onClick={() => setStage('teachers')}>Quay lại giáo viên</button><span>{plan ? 'Đã có kết quả để kiểm tra' : 'Chưa tạo bản xem trước'}</span></div>
      </Section>
      )}
    </div>
  );
}

export function AdminAutoTimetableLive() {
  const { semesterOptions, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const assignments = useApi<TeachingAssignment[]>(semesterId
    ? `/teaching-assignments?semesterId=${encodeURIComponent(semesterId)}` : null);
  const versions = useApi<TimetableVersion[]>(semesterId
    ? `/timetable-versions?semesterId=${encodeURIComponent(semesterId)}` : null);
  const toast = useToast();
  const [plan, setPlan] = useState<AutoTimetablePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [versionBusy, setVersionBusy] = useState('');
  const [selectedPreviewClass, setSelectedPreviewClass] = useState('');

  const classPreviews = useMemo(() => {
    const grouped = new Map<string, AutoTimetablePlan['items']>();
    (plan?.items || []).forEach((item) => grouped.set(item.classId, [...(grouped.get(item.classId) || []), item]));
    return [...grouped.entries()].map(([classId, items]) => ({
      classId,
      classCode: items[0]?.classCode || classId,
      shift: items[0]?.studyShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng',
      roomCode: items[0]?.roomCode || 'Chưa có phòng',
      items,
      scheduled: items.filter((item) => item.status === 'PROPOSED').length,
      issues: items.filter((item) => item.status === 'UNSCHEDULED').length,
    })).sort((a, b) => a.classCode.localeCompare(b.classCode, 'vi'));
  }, [plan]);
  const activeClassPreview = classPreviews.find((item) => item.classId === selectedPreviewClass)
    || classPreviews[0];

  const generate = async (apply: boolean) => {
    setBusy(true);
    try {
      const result = await api.post<AutoTimetablePlan>('/timetableSlots/auto-plan', {
        semesterId, apply, allowPartial: false,
      });
      setPlan(result);
      setSelectedPreviewClass(result.items.find((item) => item.status === 'UNSCHEDULED')?.classId
        || result.items[0]?.classId || '');
      toast.show('ok', apply ? 'Đã áp dụng thời khóa biểu tự động' : 'Đã tạo bản xem trước thời khóa biểu');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể xếp thời khóa biểu');
    } finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!semesterId || !plan || plan.unscheduledSlots > 0) return;
    setBusy(true);
    try {
      const applied = await api.post<AutoTimetablePlan>('/timetableSlots/auto-plan', {
        semesterId, apply: true, allowPartial: false,
      });
      const nextVersion = (versions.data?.[0]?.versionNo || 0) + 1;
      await api.post<TimetableVersion>('/timetable-versions', {
        semesterId, name: `Thời khóa biểu học kỳ · phiên bản ${nextVersion}`,
      });
      setPlan(applied);
      await versions.reload();
      toast.show('ok', 'Đã lưu bản nháp. Hãy kiểm tra và phát hành để giáo viên, học sinh, phụ huynh nhìn thấy.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể lưu phiên bản thời khóa biểu');
    } finally { setBusy(false); }
  };

  const publishVersion = async (item: TimetableVersion) => {
    setVersionBusy(item.id);
    try {
      await api.post(`/timetable-versions/${item.id}/publish`);
      await versions.reload();
      toast.show('ok', `Đã phát hành phiên bản ${item.versionNo}`);
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể phát hành phiên bản');
    } finally { setVersionBusy(''); }
  };

  const restoreVersion = async (item: TimetableVersion) => {
    setVersionBusy(item.id);
    try {
      await api.post(`/timetable-versions/${item.id}/restore`, {
        name: `Khôi phục từ phiên bản ${item.versionNo}`,
      });
      await versions.reload();
      toast.show('ok', 'Đã tạo bản nháp khôi phục. Lịch đang phát hành chưa bị thay đổi.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể khôi phục phiên bản');
    } finally { setVersionBusy(''); }
  };

  return (
    <Section title="Tạo thời khóa biểu tự động" subtitle="Sau khi đã phân công giáo viên, hệ thống sẽ chọn thứ, tiết và phòng học phù hợp" wide
      action={<div className="row-actions"><button className="live-btn subtle" disabled={busy || !semesterId || !assignments.data?.length} onClick={() => generate(false)}><Sparkles size={16} /> {busy ? 'Đang xử lý…' : plan ? 'Tính lại lịch dự kiến' : '1. Xem lịch dự kiến'}</button><button className="live-btn primary" disabled={busy || !plan || plan.unscheduledSlots > 0} onClick={saveDraft}><CalendarCheck2 size={16} /> 2. Lưu bản nháp</button></div>}>
      <div className="timetable-simple-flow">
        <div className={assignments.data?.length ? 'done' : 'current'}><span>1</span><div><strong>Đã phân công giáo viên</strong><small>{assignments.loading ? 'Đang kiểm tra…' : assignments.data?.length ? `${assignments.data.length} môn–lớp đã sẵn sàng` : 'Chưa có phân công trong học kỳ này'}</small></div></div>
        <div className={plan ? 'done' : assignments.data?.length ? 'current' : ''}><span>2</span><div><strong>Xem lịch dự kiến</strong><small>Kiểm tra thứ, tiết, phòng và cảnh báo</small></div></div>
        <div className={versions.data?.some((item) => ['DRAFT', 'VALIDATED'].includes(item.status)) ? 'done' : plan && !plan.unscheduledSlots ? 'current' : ''}><span>3</span><div><strong>Lưu thành bản nháp</strong><small>Có thể kiểm tra mà chưa ảnh hưởng người dùng</small></div></div>
        <div className={versions.data?.some((item) => item.status === 'PUBLISHED') ? 'done' : versions.data?.length ? 'current' : ''}><span>4</span><div><strong>Phát hành</strong><small>Chỉ lịch đã phát hành mới là phiên bản chính thức</small></div></div>
      </div>
      <div className="auto-timetable-toolbar">
        <label><span>Chọn học kỳ cần tạo thời khóa biểu</span><select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setPlan(null); setSelectedPreviewClass(''); }}>
          {semesterOptions.map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
        </select></label>
        <div className="automation-rules"><CheckCircle2 size={18} /><span><strong>Hệ thống tự kiểm tra trước khi lưu</strong>Không trùng lớp · Không trùng giáo viên · Không trùng phòng · Tôn trọng ca học và tiết bận</span></div>
      </div>
      {!assignments.loading && !assignments.data?.length ? <div className="workflow-blocker"><AlertTriangle size={24} /><div><strong>Chưa thể xếp thời khóa biểu</strong><span>Học kỳ này chưa có giáo viên phụ trách các môn. Hãy hoàn tất tab “Phân công giáo viên tự động” trước.</span></div></div>
        : !plan ? <div className="planning-empty"><CalendarCheck2 size={32} /><strong>Đã đủ điều kiện để tạo lịch</strong><span>Chọn “1. Xem lịch dự kiến”. Hệ thống chưa lưu hay thay đổi thời khóa biểu ở bước này.</span></div>
        : plan.proposedSlots === 0 && plan.unscheduledSlots === 0 ? <div className="workflow-complete"><CheckCircle2 size={26} /><div><strong>Thời khóa biểu đã đầy đủ</strong><span>{plan.existingSlots} tiết hiện có được giữ nguyên; không còn tiết nào cần xếp thêm.</span></div></div>
        : <>
          <div className={`schedule-result-hero ${plan.unscheduledSlots ? 'warning' : 'success'}`}>
            {plan.unscheduledSlots ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
            <div><strong>{plan.unscheduledSlots ? `Còn ${plan.unscheduledSlots} tiết cần xử lý` : `Đã xếp đủ ${plan.proposedSlots} tiết`}</strong><span>{plan.unscheduledSlots ? 'Chọn lớp có cảnh báo để xem nguyên nhân và điều chỉnh.' : 'Không trùng lớp, giáo viên, phòng học hoặc ca học. Bạn có thể kiểm tra theo từng lớp trước khi lưu.'}</span></div>
            <div className="schedule-result-metrics"><span><b>{classPreviews.length}</b> lớp</span><span><b>{plan.proposedSlots}</b> tiết hợp lệ</span>{plan.existingSlots > 0 && <span><b>{plan.existingSlots}</b> tiết giữ nguyên</span>}{plan.unscheduledSlots > 0 && <button type="button" className="live-btn primary" disabled={busy} onClick={() => generate(false)}><Sparkles size={15} /> Tự động xếp lại</button>}</div>
          </div>

          <div className="class-preview-picker" aria-label="Chọn lớp để xem lịch dự kiến">
            <div><strong>Kiểm tra theo từng lớp</strong><span>Chọn một lớp để xem lịch dạng lưới</span></div>
            <div className="class-preview-buttons">{classPreviews.map((item) => <button type="button" key={item.classId} className={activeClassPreview?.classId === item.classId ? 'active' : ''} onClick={() => setSelectedPreviewClass(item.classId)}><span>{item.classCode}</span><small>{item.shift} · {item.roomCode}</small>{item.issues > 0 ? <b className="has-issue">{item.issues} lỗi</b> : <b>{item.scheduled} tiết</b>}</button>)}</div>
          </div>

          {activeClassPreview && <div className="class-timetable-preview">
            <header><div><strong>Thời khóa biểu dự kiến lớp {activeClassPreview.classCode}</strong><span>{activeClassPreview.shift} · Phòng {activeClassPreview.roomCode} · {activeClassPreview.scheduled} tiết đã xếp</span></div>{activeClassPreview.issues ? <Badge tone="red">{activeClassPreview.issues} tiết cần xử lý</Badge> : <Badge tone="green">Không có xung đột</Badge>}</header>
            {activeClassPreview.issues > 0 && <div className="class-preview-issues">{activeClassPreview.items.filter((item) => item.status === 'UNSCHEDULED').map((item, index) => <div key={`${item.subjectId}-${index}`}><AlertTriangle size={16} /><span><strong>{item.subjectName} · {item.teacherName}</strong><small>{item.message}</small></span></div>)}</div>}
            <div className="compact-timetable-grid">
              <div className="grid-corner">Tiết</div>{DAYS.map(([day, label]) => <div className="grid-day" key={day}>{label}</div>)}
              {[1, 2, 3, 4, 5, 6].flatMap((period) => [<div className="grid-period" key={`period-${period}`}>{period}</div>, ...DAYS.map(([day]) => {
                const lesson = activeClassPreview.items.find((item) => item.status === 'PROPOSED' && item.dayOfWeek === day && item.periodNo === period);
                return <div className={`grid-lesson ${lesson ? 'filled' : ''}`} key={`${day}-${period}`}>{lesson ? <><strong>{lesson.subjectName}</strong><span>{lesson.teacherName}</span></> : <span>Trống</span>}</div>;
              })])}
            </div>
          </div>}

          <details className="technical-schedule-details"><summary><span><strong>Xem danh sách kỹ thuật</strong><small>Dành cho kiểm tra chi tiết từng tiết và nguyên nhân thuật toán</small></span><b>{plan.items.length} dòng</b></summary>
            <div className="teacher-load-table"><table className="live-table auto-timetable-preview-table"><thead><tr><th>Lớp</th><th>Ca</th><th>Môn</th><th>Giáo viên</th><th>Thứ</th><th>Tiết</th><th>Phòng</th><th>Kết quả</th><th>Giải thích</th></tr></thead><tbody>
              {plan.items.map((item, index) => <tr key={`${item.classId}-${item.subjectId}-${index}`}><td><strong>{item.classCode}</strong></td><td>{item.studyShift === 'AFTERNOON' ? 'Chiều' : 'Sáng'}</td><td>{item.subjectName}</td><td>{item.teacherName}</td><td>{item.dayOfWeek ? ({ MON: 'Thứ 2', TUE: 'Thứ 3', WED: 'Thứ 4', THU: 'Thứ 5', FRI: 'Thứ 6', SAT: 'Thứ 7' } as Record<string, string>)[item.dayOfWeek] : '—'}</td><td>{item.periodNo || '—'}</td><td>{item.roomCode || '—'}</td><td>{item.status === 'PROPOSED' ? <Badge tone="green">Có thể xếp</Badge> : <Badge tone="red">Cần xử lý</Badge>}</td><td className={item.status === 'UNSCHEDULED' ? 'schedule-reason error' : 'schedule-reason'}>{item.message}</td></tr>)}
            </tbody></table></div>
          </details>
        </>}

      <div className="timetable-version-panel">
        <div className="timetable-version-heading"><div><History size={20} /><span><strong>Phiên bản và lịch sử phát hành</strong><small>Mỗi lần lưu tạo một bản độc lập; khôi phục không ghi đè lịch đang dùng.</small></span></div><Badge tone={versions.data?.some((item) => item.status === 'PUBLISHED') ? 'green' : 'red'}>{versions.data?.some((item) => item.status === 'PUBLISHED') ? 'Đã có lịch chính thức' : 'Chưa phát hành'}</Badge></div>
        <Async state={versions} empty="Chưa có phiên bản. Hãy xem lịch dự kiến rồi lưu bản nháp.">
          {(items) => <div className="timetable-version-list">{items.map((item) => <article key={item.id} className={`timetable-version-card ${item.status.toLowerCase()}`}>
            <div className="version-number"><span>v{item.versionNo}</span><StatusPill value={item.status} /></div>
            <div className="version-main"><strong>{item.name}</strong><span>{item.totalPeriods} tiết · chất lượng {item.qualityScore}% · {new Date(item.createdAt).toLocaleString('vi-VN')}</span>{item.sourcePlanId && <small>Được khôi phục từ một phiên bản trước</small>}{item.conflictSummary && <small className="version-conflict">{item.conflictSummary}</small>}</div>
            <div className="row-actions">{['DRAFT', 'VALIDATED'].includes(item.status) && <button className="live-btn primary" disabled={Boolean(versionBusy)} onClick={() => publishVersion(item)}><Rocket size={15} /> {versionBusy === item.id ? 'Đang phát hành…' : 'Phát hành'}</button>}{['PUBLISHED', 'SUPERSEDED'].includes(item.status) && <button className="live-btn subtle" disabled={Boolean(versionBusy)} onClick={() => restoreVersion(item)}><RotateCcw size={15} /> Tạo bản khôi phục</button>}</div>
          </article>)}</div>}
        </Async>
      </div>
    </Section>
  );
}

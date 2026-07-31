import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, CalendarCheck2, CheckCircle2, ClipboardCheck, Clock3,
  LockKeyhole, Send, Sparkles, Trash2, UserRoundCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { updateHashQuery, useHashString } from '../../api/urlState';
import type {
  AcademicYear, AutoAssignmentPlan, AutoTimetablePlan, CurriculumRequirement, Semester, Subject, TeacherLoadRegistration, TeachingAssignment,
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
  useEffect(() => {
    if (!semesters.data?.length) return;
    const currentSemesterExists = semesters.data.some((item) => item.id === semesterId);
    if (currentSemesterExists) return;
    const preferred = semesters.data.find((item) => item.status === 'ACTIVE')
      ?? semesters.data.find((item) => item.status === 'PLANNED')
      ?? semesters.data[0];
    setSemesterId(preferred.id);
  }, [semesterId, semesters.data, setSemesterId]);
  const semesterLabel = (semester: Semester) => {
    const year = years.data?.find((item) => item.id === semester.academicYearId);
    const status = semester.status === 'ACTIVE' ? 'Đang hoạt động'
      : semester.status === 'PLANNED' ? 'Sắp diễn ra'
        : semester.status === 'COMPLETED' ? 'Đã kết thúc' : semester.status;
    return `${year?.code || 'Chưa rõ năm học'} · ${semester.name} · ${status}`;
  };
  return { semesters, semesterId, setSemesterId, semesterLabel };
}

export function TeacherLoadRegistrationLive() {
  const { semesters, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const registration = useApi<TeacherLoadRegistration>(
    semesterId ? `/me/teacher-load-registration?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const toast = useToast();
  const [maxPeriods, setMaxPeriods] = useState(20);
  const [grades, setGrades] = useState<string[]>([]);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const editable = !registration.data || ['DRAFT', 'REJECTED'].includes(registration.data.status);

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
      <div className="load-form-grid">
        <label><span>Học kỳ</span><select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>
          {(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
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
  const { semesters, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const subjects = useApi<Subject[]>('/subjects');
  const requirements = useApi<CurriculumRequirement[]>(
    semesterId ? `/curriculum-requirements?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const registrations = useApi<TeacherLoadRegistration[]>(
    semesterId ? `/teacher-load-registrations?semesterId=${encodeURIComponent(semesterId)}` : null,
  );
  const toast = useToast();
  const [grade, setGrade] = useState('K10');
  const [subjectId, setSubjectId] = useState('');
  const [periods, setPeriods] = useState(2);
  const [plan, setPlan] = useState<AutoAssignmentPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState<'subjects' | 'teachers' | 'review'>('subjects');
  const pending = (registrations.data || []).filter((item) => item.status === 'SUBMITTED').length;
  const approved = (registrations.data || []).filter((item) => ['APPROVED', 'LOCKED'].includes(item.status)).length;
  const assignmentComplete = Boolean(plan && plan.unassignedCount === 0
    && (plan.applied || plan.proposedCount === 0 && plan.existingCount > 0));

  const saveRequirement = async () => {
    if (!semesterId || !subjectId) return;
    try {
      await api.put('/curriculum-requirements', { semesterId, gradeLevel: grade, subjectId, weeklyPeriods: periods });
      toast.show('ok', 'Đã cập nhật định mức môn học');
      await requirements.reload();
      setSubjectId('');
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
      <Section title="Phân công giáo viên tự động" subtitle="Thực hiện lần lượt 3 bước; hệ thống chỉ lưu khi bạn xác nhận ở bước cuối" wide>
        <label className="semester-focus"><span>1. Chọn học kỳ cần phân công</span><select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setPlan(null); setStage('subjects'); }}>
          {(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
        </select></label>
        <div className="planning-stepper planning-stepper-buttons">
          <button type="button" className={`${stage === 'subjects' ? 'active' : ''} ${requirements.data?.length ? 'done' : ''}`} onClick={() => setStage('subjects')}><span>1</span><strong>Khai báo số tiết</strong><small>Mỗi môn học bao nhiêu tiết/tuần?</small></button>
          <button type="button" className={`${stage === 'teachers' ? 'active' : ''} ${approved ? 'done' : ''}`} onClick={() => setStage('teachers')}><span>2</span><strong>Kiểm tra giáo viên</strong><small>{pending} chờ duyệt · {approved} có thể phân công</small></button>
          <button type="button" disabled={!approved} className={`${stage === 'review' ? 'active' : ''} ${plan ? 'done' : ''}`} onClick={() => setStage('review')}><span>3</span><strong>Xem và xác nhận</strong><small>{approved ? 'Kiểm tra kết quả trước khi lưu' : 'Cần duyệt giáo viên ở bước 2'}</small></button>
        </div>
      </Section>

      {stage === 'subjects' && (
      <Section title="Số tiết học mỗi tuần" subtitle="Chọn khối, môn học và nhập số tiết mà mỗi lớp cần học trong một tuần" wide>
        <div className="plain-language-help"><BookOpenCheck size={20} /><div><strong>Bước này trả lời một câu hỏi đơn giản</strong><span>Mỗi lớp của từng khối cần học môn này bao nhiêu tiết trong một tuần?</span></div></div>
        <div className="requirement-form">
          <select value={grade} onChange={(event) => setGrade(event.target.value)}>{GRADES.map((item) => <option key={item} value={item}>{item.replace('K', 'Khối ')}</option>)}</select>
          <select value={subjectId} onChange={(event) => setSubjectId(event.target.value)}><option value="">Chọn môn học</option>{(subjects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
          <input type="number" min={1} max={20} value={periods} onChange={(event) => setPeriods(Number(event.target.value))} />
          <button className="live-btn primary" disabled={!subjectId} onClick={saveRequirement}><BookOpenCheck size={16} /> Lưu định mức</button>
        </div>
        <div className="requirement-columns">{groupedRequirements.map((group) => <article key={group.grade}>
          <header><strong>{group.grade.replace('K', 'Khối ')}</strong><span>{group.rows.length} môn</span></header>
          {group.rows.length ? group.rows.map((item) => <div key={item.id}><span>{item.subjectName}</span><b>{item.weeklyPeriods} tiết</b><button title="Xóa" onClick={async () => { await api.del(`/curriculum-requirements/${item.id}`); requirements.reload(); }}><Trash2 size={14} /></button></div>) : <p>Chưa có định mức</p>}
        </article>)}</div>
        <div className="wizard-footer"><span>Đã khai báo {(requirements.data || []).length} môn–khối</span><button className="live-btn primary" onClick={() => setStage('teachers')}>Tiếp theo: Kiểm tra giáo viên</button></div>
      </Section>
      )}

      {stage === 'teachers' && (
      <Section title="Đăng ký tải dạy của giáo viên" subtitle="Chỉ đăng ký đã duyệt mới được dùng trong thuật toán phân công" wide>
        <div className="plain-language-help"><UserRoundCheck size={20} /><div><strong>Kiểm tra khả năng nhận lớp của giáo viên</strong><span>“Tải tối đa” là số tiết giáo viên đăng ký có thể dạy trong một tuần. Hãy duyệt các đăng ký hợp lệ trước khi sang bước 3.</span></div></div>
        <Async state={registrations} empty="Chưa có giáo viên gửi đăng ký tải dạy">
          {(rows) => <div className="teacher-load-table"><table className="live-table"><thead><tr><th>Giáo viên</th><th>Chuyên môn</th><th>Tải tối đa</th><th>Đã giao</th><th>Khối ưu tiên</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>{rows.map((item) => <tr key={item.id}><td><strong>{item.teacherName}</strong><small>{item.teacherCode || '—'}</small></td><td>{item.mainSubject || 'Chưa cập nhật'}</td><td>{item.maxWeeklyPeriods} tiết</td><td>{item.assignedWeeklyPeriods}/{item.maxWeeklyPeriods}</td><td>{item.preferredGradeLevels.join(', ') || 'Không giới hạn'}</td><td><StatusPill value={item.status} /></td><td><div className="row-actions">
              {item.status === 'SUBMITTED' && <><button className="icon-btn success" title="Duyệt" onClick={() => review(item, 'APPROVED')}><CheckCircle2 size={16} /></button><button className="icon-btn danger" title="Yêu cầu điều chỉnh" onClick={() => review(item, 'REJECTED')}><AlertTriangle size={16} /></button></>}
              {['APPROVED', 'LOCKED', 'REJECTED'].includes(item.status) && <button className="icon-btn" title="Mở lại cho giáo viên sửa" onClick={() => review(item, 'DRAFT')}><LockKeyhole size={16} /></button>}
            </div></td></tr>)}</tbody></table></div>}
        </Async>
        <div className="wizard-footer"><button className="live-btn subtle" onClick={() => setStage('subjects')}>Quay lại số tiết</button><span>{approved} giáo viên sẵn sàng</span><button className="live-btn primary" disabled={!approved} onClick={() => setStage('review')}>Tiếp theo: Xem phương án</button></div>
      </Section>
      )}

      {stage === 'review' && (
      <Section title="Đề xuất phân công tự động" subtitle="Hệ thống giữ nguyên dữ liệu hiện có, ưu tiên đúng chuyên môn, không vượt tải và cân bằng giữa giáo viên" wide
        action={<div className="row-actions"><button className="live-btn subtle" disabled={busy || !semesterId} onClick={() => generatePlan(false)}><Sparkles size={16} /> Làm mới bản xem trước</button>{assignmentComplete ? <><button className="live-btn success" disabled><CheckCircle2 size={16} /> Đã lưu phân công</button><button className="live-btn primary" onClick={() => updateHashQuery({ tab: 'automatic' }, 'push')}><CalendarCheck2 size={16} /> Tiếp theo: Tạo thời khóa biểu</button></> : <button className="live-btn primary" disabled={busy || !plan || plan.unassignedCount > 0 || plan.proposedCount === 0} onClick={() => generatePlan(true)}><UserRoundCheck size={16} /> Lưu các phân công được đề xuất</button>}</div>}>
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
  const { semesters, semesterId, setSemesterId, semesterLabel } = useSelectedSemester();
  const assignments = useApi<TeachingAssignment[]>(semesterId
    ? `/teaching-assignments?semesterId=${encodeURIComponent(semesterId)}` : null);
  const toast = useToast();
  const [plan, setPlan] = useState<AutoTimetablePlan | null>(null);
  const [busy, setBusy] = useState(false);
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

  return (
    <Section title="Tạo thời khóa biểu tự động" subtitle="Sau khi đã phân công giáo viên, hệ thống sẽ chọn thứ, tiết và phòng học phù hợp" wide
      action={<div className="row-actions"><button className="live-btn subtle" disabled={busy || !semesterId || !assignments.data?.length} onClick={() => generate(false)}><Sparkles size={16} /> {busy ? 'Đang tìm phương án…' : plan ? 'Tính lại lịch dự kiến' : '1. Xem lịch dự kiến'}</button><button className="live-btn primary" disabled={busy || !plan || plan.unscheduledSlots > 0 || plan.proposedSlots === 0} onClick={() => generate(true)}><CalendarCheck2 size={16} /> 2. Lưu thời khóa biểu</button></div>}>
      <div className="timetable-simple-flow">
        <div className={assignments.data?.length ? 'done' : 'current'}><span>1</span><div><strong>Đã phân công giáo viên</strong><small>{assignments.loading ? 'Đang kiểm tra…' : assignments.data?.length ? `${assignments.data.length} môn–lớp đã sẵn sàng` : 'Chưa có phân công trong học kỳ này'}</small></div></div>
        <div className={plan ? 'done' : assignments.data?.length ? 'current' : ''}><span>2</span><div><strong>Xem lịch dự kiến</strong><small>Kiểm tra thứ, tiết, phòng và cảnh báo</small></div></div>
        <div className={plan?.applied ? 'done' : plan && !plan.unscheduledSlots ? 'current' : ''}><span>3</span><div><strong>Lưu thời khóa biểu</strong><small>Chỉ lưu sau khi không còn xung đột</small></div></div>
      </div>
      <div className="auto-timetable-toolbar">
        <label><span>Chọn học kỳ cần tạo thời khóa biểu</span><select value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setPlan(null); setSelectedPreviewClass(''); }}>
          {(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{semesterLabel(item)}</option>)}
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
    </Section>
  );
}

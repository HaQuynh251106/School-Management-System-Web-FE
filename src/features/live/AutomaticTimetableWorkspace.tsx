import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  AlertTriangle, CalendarCheck2, CalendarPlus2, Check, CheckCircle2, Clock3,
  GripVertical, RefreshCw, Rocket, RotateCcw, Save, Search, Send, Sparkles, Trash2, UsersRound,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicCurriculumItem, AcademicYear, ClassLessonProgress,
  ProgressComparison, Room, ScheduleGenerationReadiness, ScheduleGenerationResult, ScheduleValidation,
  SchoolClass, Semester, Subject, TeachingAssignment, TimetableDraftSlot,
  TeacherStaffingAnalysis, TimetableMakeupProposal, TimetableSchedule,
} from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, DAY_LABEL, fmtDate, useToast } from './common';
import { FormValidationSummary, Modal } from './Modal';
import { TeacherStaffingPanel } from './TeacherStaffingPanel';

const DAY_OPTIONS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const PERIOD_INFO: Record<number, { session: string; time: string }> = {
  1: { session: 'Sáng', time: '07:00 - 07:45' },
  2: { session: 'Sáng', time: '07:50 - 08:35' },
  3: { session: 'Sáng', time: '08:45 - 09:30' },
  4: { session: 'Sáng', time: '09:35 - 10:20' },
  5: { session: 'Sáng', time: '10:25 - 11:10' },
  6: { session: 'Chiều', time: '13:30 - 14:15' },
  7: { session: 'Chiều', time: '14:20 - 15:05' },
  8: { session: 'Chiều', time: '15:15 - 16:00' },
  9: { session: 'Chiều', time: '16:05 - 16:50' },
  10: { session: 'Chiều', time: '17:00 - 17:45' },
};

type SemesterSelectionProps = {
  semesterId: string;
  onSemesterChange: (semesterId: string) => void;
};

function err(error: unknown) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('uk_timetable_class_period') || message.includes('DataIntegrityViolationException')) {
    return 'Không thể thay thế thời khóa biểu cũ. Vui lòng kiểm tra lại bản lịch rồi thử phát hành lại.';
  }
  return message || 'Không thể hoàn thành thao tác.';
}

function scheduleStatusLabel(status: string) {
  return ({ PUBLISHED: 'Đã phát hành', DRAFT: 'Bản nháp', LOCKED: 'Đã được thay thế' } as Record<string, string>)[status] || status;
}

function progressStatusLabel(status: string) {
  return ({ COMPLETED: 'Đã hoàn thành', PARTIAL: 'Dạy một phần', PLANNED: 'Chưa hoàn thành', CANCELLED: 'Đã hủy' } as Record<string, string>)[status] || status;
}

function makeupStatusLabel(status: string) {
  return ({ PROPOSED: 'Đang đề xuất', APPROVED: 'Đã duyệt', REJECTED: 'Yêu cầu điều chỉnh', UNSCHEDULED: 'Chưa tìm được lịch' } as Record<string, string>)[status] || status;
}

function friendlyRoom(code?: string | null) {
  if (!code) return 'Chưa có phòng';
  const homeRoom = code.match(/^G0-\d{8}-(.+)$/i);
  if (homeRoom) return `Phòng ${homeRoom[1]}`;
  if (code.toUpperCase().startsWith('IT')) return `Phòng máy ${code}`;
  if (code.toUpperCase().startsWith('LAB')) return `Phòng thực hành ${code}`;
  if (code.toUpperCase().startsWith('GYM')) return `Sân tập ${code}`;
  return `Phòng ${code}`;
}

export function AutomaticTimetableWorkspace({ semesterId, onSemesterChange: setSemesterId }: SemesterSelectionProps) {
  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const rooms = useApi<Room[]>('/rooms');
  const subjects = useApi<Subject[]>('/subjects');
  const toast = useToast();
  const activeYear = years.data?.find((item) => item.status === 'ACTIVE');
  const activeSemesters = useMemo(
    () => (semesters.data || [])
      .filter((item) => item.academicYearId === activeYear?.id)
      .sort((a, b) => a.sequence - b.sequence),
    [semesters.data, activeYear?.id],
  );
  const schedules = useApi<TimetableSchedule[]>(semesterId ? `/timetable/schedules?semesterId=${encodeURIComponent(semesterId)}` : null);
  const [scheduleId, setScheduleId] = useState('');
  const selectedSchedule = schedules.data?.find((item) => item.id === scheduleId);
  const selectedGradeLevel = selectedSchedule?.scopeGradeLevel;
  const scopedClasses = (classes.data || []).filter((item) => item.academicYearId === activeYear?.id
    && (!selectedGradeLevel || item.gradeLevel === selectedGradeLevel));
  const [classId, setClassId] = useState('');
  const slots = useApi<TimetableDraftSlot[]>(scheduleId && classId ? `/timetable/schedules/${scheduleId}/slots?classId=${encodeURIComponent(classId)}` : null);
  const validation = useApi<ScheduleValidation>(scheduleId ? `/timetable/schedules/${scheduleId}/validation` : null);
  const makeup = useApi<TimetableMakeupProposal[]>(scheduleId && selectedSchedule?.status !== 'DRAFT'
    ? `/academic/progress/schedules/${scheduleId}/makeup` : null);
  const semesterAssignments = useApi<TeachingAssignment[]>(semesterId
    ? `/teaching-assignments?semesterId=${encodeURIComponent(semesterId)}` : null);
  const [draggedId, setDraggedId] = useState('');
  const [selectedMoveSlotId, setSelectedMoveSlotId] = useState('');
  const [busy, setBusy] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationElapsed, setGenerationElapsed] = useState(0);
  const [confirmAction, setConfirmAction] = useState<'PUBLISH' | 'DELETE' | null>(null);
  const [makeupRange, setMakeupRange] = useState({ fromDate: '', toDate: '' });
  const [classSearch, setClassSearch] = useState('');
  const [makeupFilter, setMakeupFilter] = useState({ search: '', status: 'ALL' });
  const [reviewingMakeupId, setReviewingMakeupId] = useState('');
  const [rejectProposal, setRejectProposal] = useState<TimetableMakeupProposal | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState({
    scopeGradeLevel: 'ALL', name: '', teachingDays: DAY_OPTIONS,
    firstPeriod: 1, lastPeriod: 10, maxPeriodsPerDay: 8,
    maxProgressGapDays: 2, maxProgressGapPeriods: 2, maxCurriculumGapLessons: 1,
    solveSeconds: 60,
  });
  const readinessPath = activeYear && semesterId
    ? `/timetable/schedules/generation-readiness?academicYearId=${encodeURIComponent(activeYear.id)}&semesterId=${encodeURIComponent(semesterId)}${form.scopeGradeLevel === 'ALL' ? '' : `&scopeGradeLevel=${encodeURIComponent(form.scopeGradeLevel)}`}`
    : null;
  const readiness = useApi<ScheduleGenerationReadiness>(readinessPath);
  const staffingPath = activeYear && semesterId
    ? `/academic/teacher-staffing?academicYearId=${encodeURIComponent(activeYear.id)}&semesterId=${encodeURIComponent(semesterId)}${form.scopeGradeLevel === 'ALL' ? '' : `&scopeGradeLevel=${encodeURIComponent(form.scopeGradeLevel)}`}`
    : null;
  const staffing = useApi<TeacherStaffingAnalysis>(staffingPath);
  const [staffingPolicy, setStaffingPolicy] = useState({
    schoolType: 'PUBLIC_REGULAR', weeklyTeachingNorm: 17, teachingWeeks: 35,
  });
  const [savingStaffingPolicy, setSavingStaffingPolicy] = useState(false);
  const visibleSchedules = useMemo(() => (schedules.data || []).filter((item) =>
    form.scopeGradeLevel === 'ALL'
      ? !item.scopeGradeLevel
      : item.scopeGradeLevel === form.scopeGradeLevel), [schedules.data, form.scopeGradeLevel]);
  const generationIssues = useMemo(() => {
    const issues: string[] = [];
    const targetClasses = (classes.data || []).filter((item) => item.academicYearId === activeYear?.id
      && (form.scopeGradeLevel === 'ALL' || item.gradeLevel === form.scopeGradeLevel));
    if (!activeYear) issues.push('Chưa có năm học đang mở.');
    if (!semesterId || !activeSemesters.some((item) => item.id === semesterId)) {
      issues.push('Chọn học kỳ thuộc năm học đang mở.');
    }
    if (!form.name.trim()) issues.push('Nhập tên bản lịch để dễ quản lý phiên bản.');
    if (form.teachingDays.length === 0) issues.push('Chọn ít nhất một ngày dạy trong tuần.');
    if (form.firstPeriod < 1 || form.lastPeriod > 10 || form.firstPeriod > form.lastPeriod) {
      issues.push('Khoảng tiết học phải nằm từ tiết 1 đến tiết 10 và tiết đầu không được sau tiết cuối.');
    }
    const availablePeriods = Math.max(0, form.lastPeriod - form.firstPeriod + 1);
    if (form.maxPeriodsPerDay < 1 || form.maxPeriodsPerDay > availablePeriods) {
      issues.push(`Số tiết tối đa mỗi ngày phải từ 1 đến ${availablePeriods || 1}.`);
    }
    const minimumSolveSeconds = form.scopeGradeLevel === 'ALL' ? 60 : 1;
    if (form.solveSeconds < minimumSolveSeconds || form.solveSeconds > 120) {
      issues.push(`Thời gian giải phải từ ${minimumSolveSeconds} đến 120 giây.`);
    }
    if (!classes.loading && !classes.error && targetClasses.length === 0) {
      issues.push(form.scopeGradeLevel === 'ALL'
        ? 'Năm học đang mở chưa có lớp để xếp lịch.'
        : `Khối ${form.scopeGradeLevel.replace('K', '')} chưa có lớp để xếp lịch.`);
    }
    if (!readiness.loading && readiness.error) {
      issues.push(readiness.error);
    } else if (!readiness.loading && readiness.data) {
      issues.push(...readiness.data.issues
        .filter((item) => item.level === 'ERROR')
        .map((item) => item.message));
    }
    return issues;
  }, [activeYear, semesterId, activeSemesters, form, classes.data, classes.loading, classes.error,
    readiness.data, readiness.loading, readiness.error]);
  const groupedValidationIssues = useMemo(() => {
    const groups = new Map<string, { code: string; level: 'ERROR' | 'WARNING'; message: string; items: ScheduleValidation['issues'] }>();
    (validation.data?.issues || []).forEach((issue) => {
      const key = `${issue.level}:${issue.code}`;
      const current = groups.get(key);
      if (current) current.items.push(issue);
      else groups.set(key, { code: issue.code, level: issue.level, message: issue.message, items: [issue] });
    });
    return Array.from(groups.values()).sort((a, b) => a.level.localeCompare(b.level) || b.items.length - a.items.length);
  }, [validation.data?.issues]);
  const filteredScopedClasses = useMemo(() => {
    const keyword = classSearch.trim().toLocaleLowerCase('vi');
    if (!keyword) return scopedClasses;
    return scopedClasses.filter((item) => `${item.code} ${item.name || ''}`.toLocaleLowerCase('vi').includes(keyword));
  }, [scopedClasses, classSearch]);
  const visibleMakeup = useMemo(() => {
    const keyword = makeupFilter.search.trim().toLocaleLowerCase('vi');
    return (makeup.data || []).filter((item) => {
      const schoolClass = scopedClasses.find((row) => row.id === item.classId);
      const subject = subjects.data?.find((row) => row.id === item.subjectId);
      const assignment = semesterAssignments.data?.find((row) => row.classId === item.classId
        && row.subjectId === item.subjectId && row.teacherId === item.teacherId);
      const matchesStatus = makeupFilter.status === 'ALL' || item.status === makeupFilter.status;
      const haystack = `${schoolClass?.code || ''} ${subject?.name || ''} ${assignment?.teacherName || ''}`.toLocaleLowerCase('vi');
      return matchesStatus && (!keyword || haystack.includes(keyword));
    });
  }, [makeup.data, makeupFilter, scopedClasses, subjects.data, semesterAssignments.data]);
  const generationBusy = generationStartedAt !== null;
  const expectedGenerationSeconds = Math.max(1, form.solveSeconds * (form.scopeGradeLevel === 'ALL' ? 3 : 1));
  const generationPercent = generationBusy
    ? Math.min(95, Math.max(4, Math.round((generationElapsed / expectedGenerationSeconds) * 100))) : 0;
  const generationStage = form.scopeGradeLevel !== 'ALL'
    ? `Đang tối ưu khối ${form.scopeGradeLevel.replace('K', '')}`
    : generationPercent < 34 ? 'Đang tối ưu khối 10'
      : generationPercent < 67 ? 'Đang tối ưu khối 11' : 'Đang tối ưu khối 12';

  useEffect(() => {
    if (activeSemesters.length && !activeSemesters.some((item) => item.id === semesterId)) {
      setSemesterId(activeSemesters[0].id);
    }
  }, [activeSemesters, semesterId, setSemesterId]);
  useEffect(() => {
    const semester = activeSemesters.find((item) => item.id === semesterId);
    if (!activeYear || !semester) return;
    setForm((current) => current.name.trim()
      ? current
      : { ...current, name: `TKB_${semester.code}_${activeYear.code}_Lan-01` });
  }, [activeYear, activeSemesters, semesterId]);
  useEffect(() => {
    if (!visibleSchedules.some((item) => item.id === scheduleId)) {
      setScheduleId(visibleSchedules[0]?.id || '');
    }
  }, [scheduleId, visibleSchedules]);
  useEffect(() => {
    const availableClasses = (classes.data || []).filter((item) => item.academicYearId === activeYear?.id
      && (!selectedGradeLevel || item.gradeLevel === selectedGradeLevel));
    if (!availableClasses.some((item) => item.id === classId)) setClassId(availableClasses[0]?.id || '');
  }, [classId, classes.data, activeYear?.id, selectedGradeLevel]);
  useEffect(() => {
    const semester = activeSemesters.find((item) => item.id === semesterId);
    if (semester?.startDate && semester?.endDate) {
      setMakeupRange({ fromDate: semester.startDate, toDate: semester.endDate });
    }
  }, [activeSemesters, semesterId]);
  useEffect(() => {
    if (generationStartedAt === null) return;
    const update = () => setGenerationElapsed(Math.max(0, Math.floor((Date.now() - generationStartedAt) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [generationStartedAt]);

  const days = selectedSchedule?.teachingDays.split(',') || form.teachingDays;
  const periods = selectedSchedule
    ? Array.from({ length: selectedSchedule.lastPeriod - selectedSchedule.firstPeriod + 1 }, (_, i) => selectedSchedule.firstPeriod + i)
    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const cell = (day: string, period: number) => (slots.data || []).find((slot) => slot.dayOfWeek === day && slot.periodNo === period);
  const allowedRooms = (slot: TimetableDraftSlot) => {
    const requiredType = (slot.requiredRoomType || 'GENERAL').toUpperCase();
    if (requiredType === 'GENERAL') {
      const schoolClass = (classes.data || []).find((item) => item.id === slot.classId);
      return (rooms.data || []).filter((room) => room.active !== false && room.id === schoolClass?.homeRoomId);
    }
    return (rooms.data || []).filter((room) => room.active !== false
      && (room.roomType || 'GENERAL').toUpperCase() === requiredType);
  };

  const reload = () => { schedules.reload(); slots.reload(); validation.reload(); };
  const generate = async () => {
    if (!activeYear || !semesterId || generationIssues.length > 0) return;
    setGenerationElapsed(0);
    setGenerationStartedAt(Date.now());
    try {
      const result = await api.post<ScheduleGenerationResult>('/timetable/schedules/generate', {
        ...form, academicYearId: activeYear.id, semesterId,
        scopeGradeLevel: form.scopeGradeLevel === 'ALL' ? null : form.scopeGradeLevel,
      });
      schedules.setData((current) => [
        result.schedule,
        ...(current || []).filter((item) => item.id !== result.schedule.id),
      ]);
      setScheduleId(result.schedule.id);
      toast.show(result.validation.valid ? 'ok' : 'err', result.validation.valid
        ? `Đã sinh đủ ${result.validation.scheduledPeriods} tiết trong bản nháp.`
        : `Đã sinh bản nháp nhưng còn ${result.validation.errorCount} xung đột.`);
    } catch (error) { toast.show('err', err(error)); }
    finally { setGenerationStartedAt(null); }
  };

  const move = async (slot: TimetableDraftSlot, dayOfWeek: string, periodNo: number, roomId = slot.roomId || '') => {
    if (!selectedSchedule || selectedSchedule.status !== 'DRAFT' || !roomId) return;
    try {
      await api.put(`/timetable/schedules/${selectedSchedule.id}/slots/${slot.id}`, { dayOfWeek, periodNo, roomId });
      toast.show('ok', 'Đã chuyển tiết và kiểm tra lại toàn bộ ràng buộc.');
      reload();
    } catch (error) { toast.show('err', err(error)); }
  };

  const publish = async () => {
    if (!selectedSchedule || !validation.data?.valid) return toast.show('err', 'Bản lịch còn lỗi bắt buộc nên chưa thể phát hành.');
    setBusy(true);
    try {
      await api.post(`/timetable/schedules/${selectedSchedule.id}/publish`);
      setConfirmAction(null);
      toast.show('ok', 'Đã phát hành lịch và gửi thông báo qua RabbitMQ.');
      reload();
    } catch (error) { toast.show('err', err(error)); }
    finally { setBusy(false); }
  };

  const saveStaffingPolicy = async () => {
    if (!activeYear) return;
    setSavingStaffingPolicy(true);
    try {
      await api.put(`/academic/teacher-staffing/policy/${activeYear.id}`, {
        ...staffingPolicy,
        schoolType: 'PUBLIC_REGULAR',
      });
      toast.show('ok', 'Đã lưu định mức nhân sự và tính lại nhu cầu giáo viên.');
      staffing.reload();
      readiness.reload();
    } catch (error) { toast.show('err', err(error)); }
    finally { setSavingStaffingPolicy(false); }
  };

  const deleteDraft = async () => {
    if (!selectedSchedule || selectedSchedule.status !== 'DRAFT') return;
    setBusy(true);
    try {
      await api.del(`/timetable/schedules/${selectedSchedule.id}`);
      setScheduleId('');
      setConfirmAction(null);
      toast.show('ok', 'Đã xóa bản nháp thời khóa biểu.');
      schedules.reload();
    } catch (error) { toast.show('err', err(error)); }
    finally { setBusy(false); }
  };

  const generateMakeup = async () => {
    if (!selectedSchedule || !makeupRange.fromDate || !makeupRange.toDate) {
      return toast.show('err', 'Chọn khoảng ngày cần rà soát lịch nghỉ.');
    }
    try {
      await api.post(`/academic/progress/schedules/${selectedSchedule.id}/makeup/generate`, makeupRange);
      toast.show('ok', 'Đã rà soát ngày nghỉ và tạo các đề xuất dạy bù phù hợp.');
      makeup.reload();
    } catch (error) { toast.show('err', err(error)); }
  };

  const reviewMakeup = async (proposalId: string, status: 'APPROVED' | 'REJECTED', reason?: string) => {
    setReviewingMakeupId(proposalId);
    try {
      await api.put(`/academic/progress/makeup/${proposalId}`, { status, reason });
      toast.show('ok', status === 'APPROVED'
        ? 'Đã duyệt lịch dạy bù và gửi thông báo liên quan.'
        : 'Đã yêu cầu điều chỉnh đề xuất dạy bù.');
      makeup.reload();
      setRejectProposal(null);
      setRejectReason('');
    } catch (error) { toast.show('err', err(error)); }
    finally { setReviewingMakeupId(''); }
  };

  return (
    <Section title="Xếp thời khóa biểu tự động" subtitle="Sinh bản nháp bằng bộ giải ràng buộc, chỉnh tay rồi phát hành" wide>
      {toast.node}
      <div className="active-academic-year-strip">
        <CalendarCheck2 size={17} />
        <span>Học kỳ đang thao tác</span>
        <strong>{activeSemesters.find((item) => item.id === semesterId)?.name || 'Chưa chọn học kỳ'}</strong>
        <small>{activeSemesters.find((item) => item.id === semesterId)?.startDate && activeSemesters.find((item) => item.id === semesterId)?.endDate
          ? `${fmtDate(activeSemesters.find((item) => item.id === semesterId)!.startDate)} đến ${fmtDate(activeSemesters.find((item) => item.id === semesterId)!.endDate)} · Đang hoạt động`
          : 'Chọn học kỳ trước khi tạo lịch.'}</small>
      </div>
      <div className="auto-schedule-config">
        <select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>{activeSemesters.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}</select>
        <select value={form.scopeGradeLevel} onChange={(event) => { const scopeGradeLevel = event.target.value; setForm({ ...form, scopeGradeLevel, solveSeconds: scopeGradeLevel === 'ALL' ? Math.max(60, form.solveSeconds) : form.solveSeconds }); }}><option value="ALL">Toàn trường</option><option value="K10">Khối 10</option><option value="K11">Khối 11</option><option value="K12">Khối 12</option></select>
        <input className="grow" placeholder="Tên bản lịch" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <label>{form.scopeGradeLevel === 'ALL' ? 'Thời gian/khối' : 'Thời gian giải'} <input type="number" min={form.scopeGradeLevel === 'ALL' ? 60 : 1} max={120} value={form.solveSeconds} onChange={(event) => setForm({ ...form, solveSeconds: Number(event.target.value) })} /> giây</label>
        <button className="live-btn" disabled={busy || generationBusy || readiness.loading || generationIssues.length > 0} onClick={generate}><Sparkles size={16} /> {generationBusy ? 'Đang tạo lịch…' : readiness.loading ? 'Đang kiểm tra…' : 'Tạo lịch tự động'}</button>
      </div>
      <TeacherStaffingPanel
        analysis={staffing.data}
        loading={staffing.loading}
        error={staffing.error}
        readiness={readiness.data}
      />
      <div className="staffing-analysis-panel staffing-analysis-legacy">
        <header>
          <div><UsersRound size={19} /><span><strong>Nhu cầu giáo viên để xếp lịch</strong><small>Tính từ kế hoạch GĐ3, tổ hợp môn và định mức của năm học</small></span></div>
          <div className="staffing-policy-controls">
            <select aria-label="Loại trường" value={staffingPolicy.schoolType} onChange={(event) => setStaffingPolicy({ ...staffingPolicy, schoolType: event.target.value })}>
              <option value="PUBLIC_REGULAR">THPT công lập thông thường</option>
              <option value="ETHNIC_BOARDING">Phổ thông dân tộc nội trú</option>
              <option value="SPECIALIZED">THPT chuyên</option>
            </select>
            <label>Định mức <input type="number" min={1} max={30} value={staffingPolicy.weeklyTeachingNorm} onChange={(event) => setStaffingPolicy({ ...staffingPolicy, weeklyTeachingNorm: Number(event.target.value) })} /> tiết/tuần</label>
            <label><input type="number" min={1} max={52} value={staffingPolicy.teachingWeeks} onChange={(event) => setStaffingPolicy({ ...staffingPolicy, teachingWeeks: Number(event.target.value) })} /> tuần/năm</label>
            <button className="live-btn compact ghost" disabled={savingStaffingPolicy || !activeYear} onClick={saveStaffingPolicy}><Save size={14} /> {savingStaffingPolicy ? 'Đang lưu…' : 'Lưu định mức'}</button>
          </div>
        </header>
        <Async state={staffing} empty="Chưa có dữ liệu để tính nhu cầu giáo viên.">
          {(analysis) => <>
            <div className="staffing-metrics">
              <article><small>Tối thiểu theo kế hoạch năm</small><strong>{analysis.minimumSubjectTeachersForYear}</strong><span>giáo viên bộ môn</span></article>
              <article><small>Tối thiểu trong học kỳ</small><strong>{analysis.minimumSubjectTeachersForSemester}</strong><span>{analysis.totalSelectedWeeklyPeriods} tiết/tuần</span></article>
              <article><small>Hiện có</small><strong>{analysis.currentActiveTeacherCount}</strong><span>giáo viên đang hoạt động</span></article>
              <article><small>Trần theo loại trường</small><strong>{analysis.maximumWholeTeachers}</strong><span>{analysis.maximumTeacherFte.toLocaleString('vi-VN')} FTE · {analysis.schoolClassCount} lớp</span></article>
            </div>
            {(analysis.errors.length > 0 || analysis.warnings.length > 0) && <div className={`staffing-status ${analysis.errors.length ? 'invalid' : 'warning'}`}>
              <AlertTriangle size={17} />
              <div><strong>{analysis.errors.length ? 'Chưa đủ nhân sự để tạo lịch' : 'Có cảnh báo biên chế cần xem lại'}</strong>
                {[...analysis.errors, ...analysis.warnings].map((message) => <small key={message}>{message}</small>)}</div>
            </div>}
            {analysis.errors.length === 0 && analysis.warnings.length === 0 && <div className="staffing-status valid"><CheckCircle2 size={17} /><div><strong>Đủ giáo viên đúng chuyên môn</strong><small>Có thể tiếp tục kiểm tra phân công từng lớp và tạo lịch.</small></div></div>}
            <details className="staffing-subject-details">
              <summary>Xem nhu cầu theo từng môn ({analysis.subjects.filter((item) => item.countedAsSubjectTeacher).length} môn)</summary>
              <div className="live-table-scroll"><table className="live-table staffing-table"><thead><tr><th>Môn học</th><th>Lớp áp dụng</th><th>Tiết/năm</th><th>Tiết kỳ này</th><th>Tối thiểu</th><th>Đúng chuyên môn</th><th>Đã phân công</th><th>Kết quả</th></tr></thead><tbody>
                {analysis.subjects.map((item) => <tr key={item.subjectId} className={item.shortage > 0 ? 'staffing-shortage-row' : ''}><td><strong>{item.subjectName}</strong><small>{item.subjectCode} · {item.countedAsSubjectTeacher ? 'Giáo viên bộ môn' : 'Hoạt động giáo dục'}</small></td><td>{item.applicableClassCount}</td><td>{item.annualPeriods.toLocaleString('vi-VN')}</td><td>{item.selectedSemesterPeriods.toLocaleString('vi-VN')}<small>{item.selectedWeeklyPeriods} tiết/tuần</small></td><td><strong>{item.minimumTeachersForYear}</strong><small>Kỳ này: {item.minimumTeachersForSemester}</small></td><td>{item.qualifiedTeacherCount}</td><td>{item.assignedTeacherCount}</td><td><span className={`staffing-result ${item.shortage > 0 ? 'shortage' : 'enough'}`}>{item.countedAsSubjectTeacher ? item.shortage > 0 ? `Thiếu ${item.shortage}` : 'Đủ' : 'GVCN phụ trách'}</span></td></tr>)}
              </tbody></table></div>
            </details>
            <p className="staffing-legal-note">Trần giáo viên/lớp không bao gồm Ban giám hiệu và nhân viên hỗ trợ. Số thập phân được hiển thị theo FTE; trần nguyên người được làm tròn xuống để không vượt tỷ lệ tối đa.</p>
          </>}
        </Async>
      </div>
      <FormValidationSummary
        errors={generationIssues}
        success={generationIssues.length === 0 && readiness.data?.ready
          ? `Sẵn sàng xếp ${readiness.data.classCount} lớp, ${readiness.data.requiredPeriods} tiết từ ${readiness.data.sourcePlanSummary || 'kế hoạch GĐ3'}.`
          : undefined}
      />
      {generationBusy && <div className="schedule-generation-progress" role="status" aria-live="polite">
        <div><strong>{generationStage}</strong><span>{generationPercent}%</span></div>
        <div className="schedule-generation-track"><i style={{ width: `${generationPercent}%` }} /></div>
        <small>Đã xử lý {generationElapsed} giây · giới hạn tối đa khoảng {expectedGenerationSeconds} giây cho phạm vi đã chọn. Nút tạo lịch được khóa để tránh gửi trùng.</small>
      </div>}
      <div className="school-shift-policy">
        <article><strong>Ca sáng · tiết 1-5</strong><span>07:00 - 11:10</span><small>Khối 12 và lớp 11A6-11A10 học chính</small></article>
        <article><strong>Ca chiều · tiết 6-10</strong><span>13:30 - 17:45</span><small>Khối 10 và lớp 11A1-11A5 học chính</small></article>
        <article><strong>Ba buổi đối ca</strong><span>T2-T4-T6 hoặc T3-T5-T7</span><small>Mỗi buổi một môn học liên tục 3 tiết</small></article>
        <article><strong>Tiết cố định theo ca chính</strong><span>Sáng: T2 tiết 1 · T7 tiết 5</span><small>Chiều: T2 tiết 6 · T7 tiết 10</small></article>
      </div>

      <div className="auto-schedule-toolbar">
        <select value={scheduleId} onChange={(event) => setScheduleId(event.target.value)}><option value="">Chưa có bản lịch</option>{visibleSchedules.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.scopeGradeLevel || 'Toàn trường'} · {scheduleStatusLabel(item.status)}</option>)}</select>
        <label className="schedule-class-search"><Search size={15} /><input aria-label="Tìm lớp" placeholder="Tìm mã hoặc tên lớp" value={classSearch} onChange={(event) => setClassSearch(event.target.value)} /></label>
        <select value={classId} onChange={(event) => setClassId(event.target.value)}><option value="">Chọn lớp để kiểm tra</option>{filteredScopedClasses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select>
        <button className="live-btn ghost" onClick={reload}><RefreshCw size={15} /> Kiểm tra lại</button>
        {selectedSchedule?.status === 'DRAFT' && <><button className="live-btn ghost danger" disabled={busy} onClick={() => setConfirmAction('DELETE')}><Trash2 size={15} /> Xóa bản nháp</button><button className="live-btn" disabled={!validation.data?.valid || busy} onClick={() => setConfirmAction('PUBLISH')}><Send size={15} /> Khóa & phát hành</button></>}
      </div>

      {selectedSchedule && <div className={`schedule-validation-strip ${validation.data?.valid ? 'valid' : 'invalid'}`}>
        {validation.data?.valid ? <CheckCircle2 size={19} /> : <AlertTriangle size={19} />}
        <div><strong>{selectedSchedule.status === 'PUBLISHED' ? 'Đã phát hành' : validation.data?.valid ? 'Đủ điều kiện phát hành' : `${validation.data?.errorCount || 0} lỗi bắt buộc`}</strong><small>{validation.data?.scheduledPeriods || 0}/{validation.data?.requiredPeriods || 0} tiết · {validation.data?.errorCount || 0} xung đột bắt buộc · {validation.data?.warningCount || 0} cảnh báo ưu tiên</small></div>
        {selectedSchedule.sourcePlanSummary && <div className="schedule-plan-source"><span>Nguồn kế hoạch</span><strong>{selectedSchedule.sourcePlanSummary}</strong></div>}
        <StatusPill value={selectedSchedule.status} />
      </div>}

      {selectedSchedule?.status === 'DRAFT' && classId && <div className="schedule-move-help">
        <GripVertical size={15} /><span>Kéo thả tiết học, hoặc chọn một tiết rồi bấm vào ô trống để chuyển trên màn hình cảm ứng.</span>
        {selectedMoveSlotId && <button className="live-btn compact ghost" onClick={() => setSelectedMoveSlotId('')}>Hủy chọn tiết</button>}
      </div>}
      {selectedSchedule && classId && <Async state={slots} allowEmpty empty="Bản nháp chưa có tiết cho lớp này">
        {() => <div className="auto-timetable-scroll"><div className="auto-timetable-grid" style={{ '--schedule-days': days.length } as CSSProperties}>
          <div className="auto-time-head"><Clock3 size={15} /></div>
          {days.map((day) => <div key={day} className="auto-time-head">{DAY_LABEL[day] || day}</div>)}
          {periods.map((period) => [
            <div key={`p-${period}`} className={`auto-period ${period === 6 ? 'session-start' : ''}`}><strong>{PERIOD_INFO[period]?.session} · Tiết {period}</strong><small>{PERIOD_INFO[period]?.time}</small></div>,
            ...days.map((day) => {
              const slot = cell(day, period);
              const selectedForMove = slot?.id === selectedMoveSlotId;
              return <div key={`${day}-${period}`} className={`auto-slot ${slot ? 'occupied' : 'empty'} ${selectedForMove ? 'selected-for-move' : ''} ${period === 6 ? 'session-start' : ''}`}
                onDragOver={(event) => event.preventDefault()}
                onClick={() => { const selectedSlot = (slots.data || []).find((item) => item.id === selectedMoveSlotId); if (!slot && selectedSlot && selectedSchedule.status === 'DRAFT') { move(selectedSlot, day, period); setSelectedMoveSlotId(''); } }}
                onDrop={() => { const dragged = (slots.data || []).find((item) => item.id === draggedId); if (dragged && !slot) move(dragged, day, period); setDraggedId(''); }}>
                {slot && <article draggable={selectedSchedule.status === 'DRAFT'} onClick={(event) => { event.stopPropagation(); if (selectedSchedule.status === 'DRAFT') setSelectedMoveSlotId(selectedForMove ? '' : slot.id); }} onDragStart={() => setDraggedId(slot.id)}>
                  <span><GripVertical size={14} /></span><div><strong>{slot.subjectName}</strong><small>GV: {slot.teacherName}</small><small>{PERIOD_INFO[period]?.time}{slot.source === 'AUTO_BLOCK' ? ' · Khối 3 tiết' : slot.source === 'FIXED_ACTIVITY' ? ' · Cố định' : ''}</small>
                  <select aria-label={`Phòng học ${slot.subjectName}`} title={slot.roomCode || ''} value={slot.roomId || ''} disabled={selectedSchedule.status !== 'DRAFT'} onClick={(event) => event.stopPropagation()} onChange={(event) => move(slot, day, period, event.target.value)}>{allowedRooms(slot).map((room) => <option key={room.id} value={room.id}>{friendlyRoom(room.code)}</option>)}</select></div>
                </article>}
              </div>;
            }),
          ])}
        </div></div>}
      </Async>}

      {!!groupedValidationIssues.length && <div className="schedule-issues"><strong>Xung đột và cảnh báo đã gom nhóm</strong>{groupedValidationIssues.map((group) => <details key={`${group.level}-${group.code}`} className={group.level.toLowerCase()} open={group.level === 'ERROR'}><summary>{group.level === 'ERROR' ? <AlertTriangle size={15} /> : <CalendarCheck2 size={15} />}<b>{group.items.length} trường hợp</b><span>{group.message}</span></summary><div>{group.items.map((issue, index) => { const issueClass = scopedClasses.find((row) => row.id === issue.classId); const issueSubject = subjects.data?.find((row) => row.id === issue.subjectId); return <article key={`${group.code}-${index}`}><span>{issueClass?.code || 'Toàn lịch'}{issueSubject ? ` · ${issueSubject.name}` : ''}{issue.dayOfWeek ? ` · ${DAY_LABEL[issue.dayOfWeek] || issue.dayOfWeek}` : ''}{issue.periodNo ? ` · tiết ${issue.periodNo}` : ''}</span><small>{issue.message}</small>{issue.classId && <button className="live-btn compact ghost" onClick={() => setClassId(issue.classId || '')}>Đi tới lớp</button>}</article>; })}</div></details>)}</div>}

      {selectedSchedule?.status !== 'DRAFT' && <div className="makeup-workspace">
        <header><div><strong>Đề xuất lịch dạy bù</strong><small>Rà soát các tiết trùng ngày nghỉ và đề xuất ngày gần nhất còn trống</small></div><div><input type="date" value={makeupRange.fromDate} onChange={(event) => setMakeupRange({ ...makeupRange, fromDate: event.target.value })} /><input type="date" value={makeupRange.toDate} onChange={(event) => setMakeupRange({ ...makeupRange, toDate: event.target.value })} /><button className="live-btn ghost" onClick={generateMakeup}><CalendarPlus2 size={15} /> Rà soát ngày nghỉ</button></div></header>
        <div className="makeup-filters"><label><Search size={15} /><input placeholder="Tìm lớp, môn hoặc giáo viên" value={makeupFilter.search} onChange={(event) => setMakeupFilter({ ...makeupFilter, search: event.target.value })} /></label><select value={makeupFilter.status} onChange={(event) => setMakeupFilter({ ...makeupFilter, status: event.target.value })}><option value="ALL">Tất cả trạng thái</option><option value="PROPOSED">Đang đề xuất</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Yêu cầu điều chỉnh</option><option value="UNSCHEDULED">Chưa tìm được lịch</option></select><span>{visibleMakeup.length} đề xuất</span></div>
        <Async state={makeup} allowEmpty empty="Không có tiết nào cần đề xuất dạy bù trong khoảng đã chọn">
          {() => visibleMakeup.length === 0 ? <div className="live-loading">Không có đề xuất phù hợp với bộ lọc.</div> : <div className="live-table-scroll"><table className="live-table makeup-table"><thead><tr><th>Lớp / môn</th><th>Giáo viên / phòng</th><th>Tiết bị nghỉ</th><th>Đề xuất dạy bù</th><th>Nguồn / lý do</th><th>Trạng thái</th><th /></tr></thead><tbody>{visibleMakeup.map((item) => { const assignment = semesterAssignments.data?.find((row) => row.classId === item.classId && row.subjectId === item.subjectId && row.teacherId === item.teacherId); const subject = subjects.data?.find((row) => row.id === item.subjectId); const reviewing = reviewingMakeupId === item.id; return <tr key={item.id}><td><strong>{scopedClasses.find((schoolClass) => schoolClass.id === item.classId)?.code || item.classId}</strong><small>{subject?.name || assignment?.subjectName || item.subjectId}</small></td><td><strong>{assignment?.teacherName || item.teacherId}</strong><small>{friendlyRoom(item.roomCode)}</small></td><td>{fmtDate(item.missedDate)}<small>Tiết {item.missedPeriodNo}</small></td><td>{item.proposedDate ? <>{fmtDate(item.proposedDate)}<small>Tiết {item.proposedPeriodNo} · kiểm tra lại khi duyệt</small></> : 'Chưa tìm được lịch trống'}</td><td><strong>{selectedSchedule?.name || 'Thời khóa biểu đang áp dụng'}</strong><small>{item.reviewNote || item.reason}</small></td><td><StatusPill value={reviewing ? 'Đang xử lý' : makeupStatusLabel(item.status)} /></td><td>{['PROPOSED', 'UNSCHEDULED'].includes(item.status) && <div className="academic-actions"><button className="icon-action" title={reviewing ? 'Đang duyệt đề xuất' : 'Duyệt đề xuất'} aria-label={reviewing ? 'Đang duyệt đề xuất' : 'Duyệt đề xuất'} disabled={reviewing || !item.proposedDate} onClick={() => reviewMakeup(item.id, 'APPROVED')}><Check size={15} /></button><button className="icon-action danger" title="Yêu cầu điều chỉnh" aria-label="Yêu cầu điều chỉnh" disabled={reviewing} onClick={() => { setRejectProposal(item); setRejectReason(''); }}><RotateCcw size={15} /></button></div>}</td></tr>; })}</tbody></table></div>}
        </Async>
      </div>}

      {rejectProposal && <Modal title="Yêu cầu điều chỉnh lịch dạy bù" onClose={() => setRejectProposal(null)} footer={<><button className="live-btn ghost" onClick={() => setRejectProposal(null)}>Hủy</button><button className="live-btn danger" disabled={!rejectReason.trim()} onClick={() => reviewMakeup(rejectProposal.id, 'REJECTED', rejectReason)}><RotateCcw size={15} /> Gửi yêu cầu</button></>}><p>Nhập rõ lý do để người lập lịch biết nội dung cần điều chỉnh.</p><textarea className="makeup-reject-reason" rows={4} maxLength={1000} autoFocus placeholder="Ví dụ: Giáo viên đã có lịch công tác vào thời gian đề xuất." value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} /></Modal>}

      {confirmAction && selectedSchedule && <Modal
        title={confirmAction === 'DELETE' ? 'Xóa bản nháp thời khóa biểu' : 'Phát hành thời khóa biểu'}
        onClose={() => !busy && setConfirmAction(null)}
        footer={<>
          <button className="live-btn subtle" type="button" disabled={busy} onClick={() => setConfirmAction(null)}>Hủy</button>
          <button className={`live-btn ${confirmAction === 'DELETE' ? 'danger' : 'primary'}`} type="button" disabled={busy} onClick={confirmAction === 'DELETE' ? deleteDraft : publish}>
            {confirmAction === 'DELETE' ? <Trash2 size={15} /> : <Send size={15} />}
            {busy ? 'Đang xử lý…' : confirmAction === 'DELETE' ? 'Xác nhận xóa' : 'Xác nhận phát hành'}
          </button>
        </>}
      >
        <div className={`schedule-confirm-dialog ${confirmAction === 'DELETE' ? 'danger' : 'publish'}`}>
          <span>{confirmAction === 'DELETE' ? <Trash2 size={22} /> : <AlertTriangle size={22} />}</span>
          <div>
<strong>{selectedSchedule?.name || 'Thời khóa biểu đang áp dụng'}</strong>
            <p>{confirmAction === 'DELETE'
              ? 'Chỉ bản nháp này bị xóa. Thời khóa biểu đang áp dụng cho giáo viên và học sinh không bị thay đổi.'
              : 'Lịch hiện tại của các lớp trong phạm vi sẽ được thay thế bằng bản lịch này. Bản lịch sẽ bị khóa sau khi phát hành.'}</p>
            <small>{activeSemesters.find((item) => item.id === semesterId)?.name} · {selectedSchedule.scopeGradeLevel || 'Toàn trường'}</small>
          </div>
        </div>
      </Modal>}
    </Section>
  );
}

export function TimetableProgressMonitor({ semesterId, onSemesterChange: setSemesterId }: SemesterSelectionProps) {
  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const subjects = useApi<Subject[]>('/subjects');
  const activeYear = years.data?.find((item) => item.status === 'ACTIVE');
  const activeSemesters = useMemo(
    () => (semesters.data || []).filter((item) => item.academicYearId === activeYear?.id).sort((a, b) => a.sequence - b.sequence),
    [semesters.data, activeYear?.id],
  );
  const progressSubjects = useMemo(() => (subjects.data || []).filter((item) => {
    const normalized = `${item.id} ${item.code || ''} ${item.name}`.toLocaleLowerCase('vi');
    return !normalized.includes('chao co') && !normalized.includes('chào cờ')
      && !normalized.includes('sinh hoat lop') && !normalized.includes('sinh hoạt lớp')
      && !normalized.includes('sj-flag') && !normalized.includes('sj-homeroom');
  }), [subjects.data]);
  const [grade, setGrade] = useState('K10');
  const [subjectId, setSubjectId] = useState('');
  useEffect(() => {
    if (activeSemesters.length && !activeSemesters.some((item) => item.id === semesterId)) {
      setSemesterId(activeSemesters[0].id);
    }
  }, [activeSemesters, semesterId, setSemesterId]);
  useEffect(() => {
    if (!progressSubjects.some((item) => item.id === subjectId)) setSubjectId(progressSubjects[0]?.id || '');
  }, [subjectId, progressSubjects]);
  const comparison = useApi<ProgressComparison>(activeYear && semesterId && subjectId
    ? `/academic/progress/comparison?academicYearId=${activeYear.id}&semesterId=${semesterId}&gradeLevel=${grade}&subjectId=${subjectId}` : null);
  const selectedSemester = activeSemesters.find((item) => item.id === semesterId);
  const semesterNotStarted = Boolean(selectedSemester?.startDate && new Date().toISOString().slice(0, 10) < selectedSemester.startDate);
  const hasProgressData = Boolean(comparison.data?.classes.some((row) => row.completedPeriods > 0 || row.completedLessons > 0 || row.latestLessonDate));
  const progressHeadline = semesterNotStarted ? 'Học kỳ chưa bắt đầu'
    : !hasProgressData ? 'Giáo viên chưa cập nhật tiến độ'
      : comparison.data?.balanced ? 'Tiến độ trong ngưỡng' : 'Có lớp chậm tiến độ';
  return <Section title="Tiến độ giảng dạy cùng khối" subtitle="Đo theo ngày học, số tiết và bài học thực tế đã hoàn thành" wide>
    <div className="live-toolbar"><select value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>{activeSemesters.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><select value={grade} onChange={(event) => setGrade(event.target.value)}><option value="K10">Khối 10</option><option value="K11">Khối 11</option><option value="K12">Khối 12</option></select><select className="grow" value={subjectId} onChange={(event) => setSubjectId(event.target.value)}>{progressSubjects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button className="live-btn ghost" onClick={comparison.reload}><RefreshCw size={15} /> Tính lại</button></div>
    <Async state={comparison} allowEmpty empty="Chưa có dữ liệu tiến độ">
      {(data) => <><div className={`progress-balance-strip ${!semesterNotStarted && hasProgressData && data.balanced ? 'balanced' : 'delayed'} ${semesterNotStarted || !hasProgressData ? 'no-data' : ''}`}><span>{!semesterNotStarted && hasProgressData && data.balanced ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</span><div><strong>{progressHeadline}</strong><small>{semesterNotStarted ? `Học kỳ bắt đầu ngày ${fmtDate(selectedSemester?.startDate || '')}. Hệ thống chưa đánh giá sớm hay chậm.` : !hasProgressData ? 'Học kỳ đã bắt đầu nhưng chưa có bài học thực tế. Hệ thống chưa đánh giá là đúng tiến độ.' : `Lệch tối đa ${data.maxTeachingDayGap}/${data.allowedDayGap} ngày học · ${data.maxPeriodGap}/${data.allowedPeriodGap} tiết · ${data.maxLessonGap}/${data.allowedLessonGap} bài${data.sourcePlanVersion ? ` · kế hoạch nguồn v${data.sourcePlanVersion}` : ''}`}</small></div></div><div className="live-table-scroll"><table className="live-table progress-monitor-table"><thead><tr><th>Lớp</th><th>Tiết hoàn thành</th><th>Bài hoàn thành</th><th>Bài gần nhất</th><th>Độ trễ</th><th>Trạng thái</th></tr></thead><tbody>{data.classes.map((row) => { const rowHasData = row.completedPeriods > 0 || row.completedLessons > 0 || Boolean(row.latestLessonDate); const status = semesterNotStarted ? 'NOT_STARTED' : !rowHasData ? 'NO_DATA' : row.delayed ? 'DELAYED' : 'ON_TRACK'; return <tr key={row.classId}><td><strong>{row.classCode}</strong></td><td>{row.completedPeriods}</td><td>{row.completedLessons}</td><td>{row.latestLessonTitle || 'Chưa cập nhật'}<small>{row.latestLessonDate ? fmtDate(row.latestLessonDate) : '—'}</small></td><td>{rowHasData ? `${row.dayLag} ngày · ${row.periodLag} tiết · ${row.lessonLag} bài` : 'Chưa đánh giá'}</td><td><StatusPill value={status} /></td></tr>; })}</tbody></table></div></>}
    </Async>
  </Section>;
}

export function TeacherLessonProgress() {
  const assignments = useApi<TeachingAssignment[]>('/me/teaching-assignments');
  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const toast = useToast();
  const [assignmentId, setAssignmentId] = useState('');
  const activeYear = years.data?.find((item) => item.status === 'ACTIVE');
  const activeSemesterIds = useMemo(() => new Set((semesters.data || [])
    .filter((item) => item.academicYearId === activeYear?.id)
    .map((item) => item.id)), [semesters.data, activeYear?.id]);
  const availableAssignments = useMemo(() => (assignments.data || [])
    .filter((item) => activeSemesterIds.has(item.semesterId)), [assignments.data, activeSemesterIds]);
  const selected = availableAssignments.find((item) => item.id === assignmentId);
  useEffect(() => {
    if (!availableAssignments.some((item) => item.id === assignmentId)) {
      setAssignmentId(availableAssignments[0]?.id || '');
    }
  }, [assignmentId, availableAssignments]);
  const curriculumList = useApi<AcademicCurriculumItem[]>(selected ? `/academic/progress/curriculum?classId=${selected.classId}&semesterId=${selected.semesterId}&subjectId=${selected.subjectId}` : null);
  const existing = useApi<ClassLessonProgress[]>(selected ? `/academic/progress/class?classId=${selected.classId}&semesterId=${selected.semesterId}` : null);
  const [form, setForm] = useState({ curriculumItemId: '', lessonDate: new Date().toISOString().slice(0, 10), plannedPeriods: 1, completedPeriods: 1, status: 'COMPLETED', notes: '' });
  useEffect(() => { if (!curriculumList.data?.some((item) => item.id === form.curriculumItemId)) setForm((current) => ({ ...current, curriculumItemId: curriculumList.data?.[0]?.id || '' })); }, [curriculumList.data, form.curriculumItemId]);
  useEffect(() => {
    const lesson = curriculumList.data?.find((item) => item.id === form.curriculumItemId);
    if (lesson) setForm((current) => ({ ...current, plannedPeriods: lesson.plannedPeriods, completedPeriods: lesson.plannedPeriods, status: 'COMPLETED' }));
  }, [curriculumList.data, form.curriculumItemId]);
  useEffect(() => {
    const semester = semesters.data?.find((item) => item.id === selected?.semesterId);
    if (!semester?.startDate || !semester?.endDate) return;
    const startDate = semester.startDate;
    const endDate = semester.endDate;
    setForm((current) => current.lessonDate >= startDate && current.lessonDate <= endDate
      ? current
      : { ...current, lessonDate: startDate });
  }, [selected?.semesterId, semesters.data]);
  const save = async () => {
    if (!selected || !form.curriculumItemId) return toast.show('err', 'Kế hoạch đã công bố chưa có bài học để cập nhật.');
    try { await api.post('/academic/progress', { ...form, classId: selected.classId, semesterId: selected.semesterId, subjectId: selected.subjectId }); toast.show('ok', 'Đã cập nhật tiến độ bài học thực tế.'); existing.reload(); }
    catch (error) { toast.show('err', err(error)); }
  };
  return <Section title="Cập nhật tiến độ bài học" subtitle="Dữ liệu thực tế dùng để so sánh các lớp cùng khối và đề xuất dạy bù" wide>{toast.node}<div className="lesson-progress-form"><select value={assignmentId} onChange={(event) => setAssignmentId(event.target.value)}><option value="">Chọn lớp và môn trong năm học đang mở</option>{availableAssignments.map((item) => <option key={item.id} value={item.id}>{item.classCode} · {item.subjectName} · {item.semesterId}</option>)}</select><select className="grow" value={form.curriculumItemId} onChange={(event) => setForm({ ...form, curriculumItemId: event.target.value })}><option value="">Chọn bài học</option>{(curriculumList.data || []).map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title} · {item.plannedPeriods} tiết</option>)}</select><input type="date" value={form.lessonDate} onChange={(event) => setForm({ ...form, lessonDate: event.target.value })} /><input type="number" min={0} max={form.plannedPeriods} title="Số tiết hoàn thành" value={form.completedPeriods} onChange={(event) => setForm({ ...form, completedPeriods: Number(event.target.value), status: Number(event.target.value) === form.plannedPeriods ? 'COMPLETED' : Number(event.target.value) === 0 ? 'PLANNED' : 'PARTIAL' })} /><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="COMPLETED">Đã hoàn thành</option><option value="PARTIAL">Dạy một phần</option><option value="PLANNED">Chưa hoàn thành</option><option value="CANCELLED">Hủy buổi học</option></select><input className="grow" placeholder="Ghi chú thực tế (không bắt buộc)" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /><button className="live-btn" disabled={!selected || !form.curriculumItemId} onClick={save}><Rocket size={15} /> Lưu tiến độ</button></div><Async state={existing} allowEmpty empty="Chưa cập nhật bài học nào">{(items) => <table className="live-table"><thead><tr><th>Ngày</th><th>Bài học</th><th>Tiết</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead><tbody>{items.filter((item) => !selected || item.subjectId === selected.subjectId).map((item) => <tr key={item.id}><td>{fmtDate(item.lessonDate)}</td><td>{curriculumList.data?.find((lesson) => lesson.id === item.curriculumItemId)?.title || item.curriculumItemId}</td><td>{item.completedPeriods}/{item.plannedPeriods}</td><td><StatusPill value={progressStatusLabel(item.status)} /></td><td>{item.notes || '—'}</td></tr>)}</tbody></table>}</Async></Section>;
}

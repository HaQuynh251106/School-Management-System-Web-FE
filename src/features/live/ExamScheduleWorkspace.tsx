import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import {
  AlertTriangle, Ban, BookOpenCheck, CalendarClock, CalendarPlus, CheckCircle2, ChevronDown,
  ChevronRight, ClipboardCheck, GitCompareArrows, History, Pencil, Plus, RefreshCw, Rocket, RotateCcw,
  Save, Send, ShieldCheck, Trash2, UserRoundX, Users,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicTrainingPlan, AcademicYear, ApiUser, EducationProgram, ExamPeriod, ExamRoomAssignment, ExamScheduleVersion,
  ExamAssessmentSource, ExamAssessmentSourceReadiness, ExamSession,
  ExamVersionDetail, ExamVersionDiff, Room, SchoolHoliday, Semester,
} from '../../api/types';
import { FunctionTabs, Section } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, PaginatedData, useToast } from './common';
import { Field, FormValidationSummary, Modal } from './Modal';

const EXAM_TYPE_LABEL: Record<string, string> = {
  MIDTERM: 'Giữa học kỳ', FINAL: 'Cuối học kỳ', MAKEUP: 'Thi lại',
  PLACEMENT: 'Khảo sát đầu vào', OTHER: 'Khác',
};
const PLANNED_EXAM_TYPES = ['MIDTERM', 'FINAL', 'MAKEUP'];
const UNAVAILABILITY_LABELS: Record<string, string> = {
  LEAVE: 'Nghỉ phép', BUSINESS_TRIP: 'Công tác', PROFESSIONAL: 'Bận chuyên môn',
  SICK: 'Nghỉ ốm', NO_INVIGILATION: 'Không tham gia coi thi', OTHER: 'Khác',
};

const GRADES = ['K10', 'K11', 'K12'];
const DEFAULT_TIMES = ['07:30', '13:30'];

type PeriodForm = {
  code: string; name: string; academicYearId: string; semesterId: string;
  examType: string; gradeLevels: string[]; allowSubjectTeacherProctor: boolean;
  startDate: string; endDate: string;
};

export function ExamScheduleWorkspace() {
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const programs = useApi<EducationProgram[]>('/academic/education-planning/programs');
  const rooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const activeYear = years.data?.find((item) => item.status === 'ACTIVE') || years.data?.[0];
  const [yearId, setYearId] = useState('');
  const effectiveYearId = yearId || activeYear?.id || '';
  const holidays = useApi<SchoolHoliday[]>(effectiveYearId
    ? `/school-holidays?academicYearId=${encodeURIComponent(effectiveYearId)}` : null);
  const periods = useApi<ExamPeriod[]>(effectiveYearId
    ? `/exam-periods?academicYearId=${encodeURIComponent(effectiveYearId)}` : null);
  const trainingPlans = useApi<AcademicTrainingPlan[]>(effectiveYearId
    ? `/academic/training-plans?academicYearId=${encodeURIComponent(effectiveYearId)}` : null);
  const [periodId, setPeriodId] = useState('');
  const selectedPeriod = periods.data?.find((item) => item.id === periodId);
  const versions = useApi<ExamScheduleVersion[]>(
    periodId ? `/exam-periods/${periodId}/versions` : null,
    { suppressErrorStatuses: [404] },
  );
  const [versionId, setVersionId] = useState('');
  const selectedVersionId = versionId;
  const selectedVersion = versions.data?.find((item) => item.id === versionId && item.examPeriodId === periodId);
  const detail = useApi<ExamVersionDetail>(
    periodId && selectedVersion ? `/exam-periods/${periodId}/versions/${versionId}` : null,
    { suppressErrorStatuses: [404] },
  );
  const reloadPeriods = periods.reload;
  const reloadVersions = versions.reload;
  const setVersionsData = versions.setData;
  const setDetailData = detail.setData;
  const [busy, setBusy] = useState(false);
  const [periodModal, setPeriodModal] = useState(false);
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [versionModal, setVersionModal] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmRegenerate, setConfirmRegenerate] = useState(false);
  const [confirmDeletePeriod, setConfirmDeletePeriod] = useState(false);
  const [periodStatusAction, setPeriodStatusAction] = useState<'CLOSED' | 'CANCELLED' | null>(null);
  const [periodStatusReason, setPeriodStatusReason] = useState('');
  const [recallModal, setRecallModal] = useState(false);
  const [recallReason, setRecallReason] = useState('Điều chỉnh lại lịch thi đã phát hành');
  const [manualSessionOpen, setManualSessionOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<ExamSession | null>(null);
  const [sessionEdit, setSessionEdit] = useState<ExamSession | null>(null);
  const [roomEdit, setRoomEdit] = useState<ExamRoomAssignment | null>(null);
  const [editingAwayId, setEditingAwayId] = useState<string | null>(null);
  const [awayToDelete, setAwayToDelete] = useState<import('../../api/types').ExamTeacherUnavailability | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [versionReason, setVersionReason] = useState('Điều chỉnh lịch thi');
  const [periodForm, setPeriodForm] = useState<PeriodForm>({
    code: '', name: '', academicYearId: '', semesterId: '', examType: 'FINAL',
    gradeLevels: [...GRADES], allowSubjectTeacherProctor: false, startDate: '', endDate: '',
  });
  const [awayForm, setAwayForm] = useState({ teacherId: '', unavailableDate: '', endDate: '', allDay: true, startTime: '', endTime: '', unavailabilityType: 'LEAVE', reason: '' });
  const formSourceReadiness = useApi<ExamAssessmentSourceReadiness>(
    periodModal && periodForm.academicYearId && periodForm.semesterId
      && periodForm.examType && periodForm.gradeLevels.length
      ? assessmentSourceUrl(periodForm.academicYearId, periodForm.semesterId,
        periodForm.examType, periodForm.gradeLevels)
      : null,
  );
  const sourceReadiness = useApi<ExamAssessmentSourceReadiness>(
    selectedPeriod
      ? assessmentSourceUrl(selectedPeriod.academicYearId, selectedPeriod.semesterId,
        selectedPeriod.examType, selectedPeriod.gradeLevels)
      : null,
  );

  const yearSemesters = useMemo(
    () => (semesters.data || []).filter((item) => item.academicYearId === effectiveYearId)
      .sort((a, b) => a.sequence - b.sequence),
    [semesters.data, effectiveYearId],
  );
  const activeTeachers = useMemo(
    () => (teachers.data || []).filter((item) => item.status === 'ACTIVE')
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
    [teachers.data],
  );
  const activeExamRooms = useMemo(
    () => (rooms.data || []).filter((room) => room.active !== false
      && (room.capacity || 0) > 0 && room.roomType?.toUpperCase() !== 'GYM'),
    [rooms.data],
  );
  const activeProgram = programs.data?.find((item) => item.status === 'ACTIVE');
  const currentSourcePlans = useMemo(() => {
    const candidates = (trainingPlans.data || [])
      .filter((item) => ['PUBLISHED', 'LOCKED'].includes(item.status)
        && (!activeProgram || item.programId === activeProgram.id))
      .sort((a, b) => b.versionNumber - a.versionNumber);
    const latestByGrade = new Map<string, AcademicTrainingPlan>();
    candidates.forEach((item) => {
      if (!latestByGrade.has(item.gradeLevel)) latestByGrade.set(item.gradeLevel, item);
    });
    return [...latestByGrade.values()]
      .sort((a, b) => a.gradeLevel.localeCompare(b.gradeLevel, 'vi'));
  }, [trainingPlans.data, activeProgram]);
  const formSemester = yearSemesters.find((item) => item.id === periodForm.semesterId);
  const periodDatePreview = useMemo(
    () => availableExamDates(periodForm.startDate, periodForm.endDate, holidays.data || []),
    [periodForm.startDate, periodForm.endDate, holidays.data],
  );
  const periodFormIssues = useMemo(() => {
    const issues: FormIssue[] = [];
    if (!periodForm.code.trim()) issues.push({ field: 'code', message: 'Nhập mã đợt thi.' });
    if (!periodForm.name.trim()) issues.push({ field: 'name', message: 'Nhập tên đợt thi.' });
    if (!periodForm.semesterId || !formSemester) issues.push({ field: 'semesterId', message: 'Chọn học kỳ hợp lệ.' });
    if (!periodForm.startDate) issues.push({ field: 'startDate', message: 'Chọn ngày bắt đầu.' });
    if (!periodForm.endDate) issues.push({ field: 'endDate', message: 'Chọn ngày kết thúc.' });
    if (periodForm.startDate && periodForm.endDate && periodForm.endDate < periodForm.startDate) {
      issues.push({ field: 'endDate', message: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' });
    }
    if (formSemester?.startDate && periodForm.startDate && periodForm.startDate < formSemester.startDate) {
      issues.push({ field: 'startDate', message: `Ngày bắt đầu phải từ ${fmtDate(formSemester.startDate)}.` });
    }
    if (formSemester?.endDate && periodForm.endDate && periodForm.endDate > formSemester.endDate) {
      issues.push({ field: 'endDate', message: `Ngày kết thúc không được sau ${fmtDate(formSemester.endDate)}.` });
    }
    if (periodForm.gradeLevels.length === 0) issues.push({ field: 'gradeLevels', message: 'Chọn ít nhất một khối thi.' });
    if (holidays.loading) issues.push({ field: 'dates', message: 'Đang kiểm tra ngày nghỉ của trường.' });
    if (holidays.error) issues.push({ field: 'dates', message: 'Không tải được ngày nghỉ để kiểm tra đợt thi.' });
    if (!holidays.loading && !holidays.error && periodForm.startDate && periodForm.endDate
      && periodForm.endDate >= periodForm.startDate && periodDatePreview.length === 0) {
      issues.push({ field: 'dates', message: 'Khoảng thời gian không có ngày thi khả dụng (Thứ 2 đến Thứ 7, không trùng ngày nghỉ).' });
    }
    if (!rooms.loading && !rooms.error && rooms.data && activeExamRooms.length === 0) {
      issues.push({ field: 'resources', message: 'Chưa có phòng thi đang hoạt động và có sức chứa.' });
    }
    if (!teachers.loading && !teachers.error && teachers.data && activeTeachers.length < 2) {
      issues.push({ field: 'resources', message: 'Cần ít nhất hai giáo viên đang hoạt động để xếp giám thị.' });
    }
    if (formSourceReadiness.loading) {
      issues.push({ field: 'sources', message: 'Đang kiểm tra kế hoạch kiểm tra đã công bố ở GĐ3.' });
    }
    if (formSourceReadiness.error) {
      issues.push({ field: 'sources', message: 'Không tải được đầu vào kế hoạch kiểm tra từ GĐ3.' });
    }
    if (formSourceReadiness.data && !formSourceReadiness.data.ready) {
      formSourceReadiness.data.issues.forEach((message) => issues.push({ field: 'sources', message }));
    }
    if (formSourceReadiness.data?.ready
      && periodDatePreview.length < formSourceReadiness.data.requiredDays) {
      issues.push({ field: 'dates', message: `Khoảng đã chọn chỉ có ${periodDatePreview.length} ngày thi hợp lệ. ${formSourceReadiness.data.subjectCount} môn cần tối thiểu ${formSourceReadiness.data.requiredDays} ngày.` });
    }
    if (formSourceReadiness.data?.ready && periodForm.startDate && periodForm.endDate) {
      const outside = formSourceReadiness.data.sources.filter((source) =>
        periodForm.endDate < source.plannedStartDate || periodForm.startDate > source.plannedEndDate);
      if (outside.length > 0) {
        issues.push({ field: 'dates', message: `Khoảng đã chọn không giao với tuần GĐ3 của ${outside.slice(0, 3).map((source) => `${source.subjectName} ${gradeLabel(source.gradeLevel)}`).join(', ')}${outside.length > 3 ? ` và ${outside.length - 3} kế hoạch khác` : ''}.` });
      }
    }
    return issues;
  }, [periodForm, formSemester, holidays.loading, holidays.error, periodDatePreview,
    formSourceReadiness.loading, formSourceReadiness.error, formSourceReadiness.data,
    rooms.loading, rooms.error, rooms.data, activeExamRooms.length,
    teachers.loading, teachers.error, teachers.data, activeTeachers.length,
  ]);
  const periodWarnings = useMemo(() => {
    if (!periodForm.startDate || !periodForm.endDate) return [];
    const blocked = holidaysInRange(periodForm.startDate, periodForm.endDate, holidays.data || []);
    const warnings: string[] = [];
    if (blocked.length) warnings.push(`${blocked.length} ngày nghỉ nằm trong khoảng đã chọn và sẽ không được dùng để xếp lịch.`);
    const suggestion = formSourceReadiness.data;
    if (suggestion?.suggestedStartDate && suggestion.suggestedEndDate
      && (periodForm.startDate !== suggestion.suggestedStartDate
        || periodForm.endDate !== suggestion.suggestedEndDate)) {
      warnings.push(`GĐ3 đề xuất ${fmtDate(suggestion.suggestedStartDate)} – ${fmtDate(suggestion.suggestedEndDate)} theo tuần kiểm tra đã công bố.`);
    }
    return warnings;
  }, [periodForm.startDate, periodForm.endDate, holidays.data, formSourceReadiness.data]);
  const selectedPeriodDates = useMemo(
    () => selectedPeriod
      ? availableExamDates(selectedPeriod.startDate, selectedPeriod.endDate, holidays.data || [])
      : [],
    [selectedPeriod, holidays.data],
  );
  const generationIssues = useMemo(() => {
    const issues: string[] = [];
    if (!versionId || selectedVersion?.status !== 'DRAFT') issues.push('Chọn một phiên bản nháp để tạo lịch.');
    if (sourceReadiness.loading) issues.push('Đang tải kế hoạch kiểm tra nguồn từ GĐ3.');
    if (sourceReadiness.error) issues.push('Không tải được kế hoạch kiểm tra nguồn từ GĐ3.');
    if (sourceReadiness.data && !sourceReadiness.data.ready) issues.push(...sourceReadiness.data.issues);
    const sourceSubjectCount = new Set(
      (sourceReadiness.data?.sources || []).map((row) => `${row.subjectId}|${row.weekNumber}`),
    ).size;
    if (sourceReadiness.data?.ready && sourceReadiness.data.sourceCount === 0) {
      issues.push('GĐ3 chưa có kế hoạch kiểm tra phù hợp.');
    }
    if (holidays.loading) issues.push('Đang kiểm tra ngày nghỉ của trường.');
    if (holidays.error) issues.push('Không tải được ngày nghỉ của trường.');
    if (!holidays.loading && selectedPeriodDates.length * DEFAULT_TIMES.length < sourceSubjectCount) {
      issues.push(`Chỉ có ${selectedPeriodDates.length * DEFAULT_TIMES.length} ca hợp lệ cho ${sourceSubjectCount} môn từ GĐ3.`);
    }
    const uncovered = (sourceReadiness.data?.sources || []).filter((source) =>
      !selectedPeriodDates.some((date) => date >= source.plannedStartDate && date <= source.plannedEndDate));
    if (uncovered.length > 0) {
      issues.push(`Đợt thi chưa có ngày phù hợp tuần GĐ3 của ${uncovered.slice(0, 3).map((source) => `${source.subjectName} ${gradeLabel(source.gradeLevel)}`).join(', ')}${uncovered.length > 3 ? ` và ${uncovered.length - 3} kế hoạch khác` : ''}.`);
    }
    if (!rooms.loading && rooms.data && activeExamRooms.length === 0) issues.push('Chưa có phòng thi phù hợp.');
    if (!teachers.loading && teachers.data && activeTeachers.length < 2) issues.push('Cần ít nhất hai giáo viên hoạt động để xếp giám thị.');
    return issues;
  }, [versionId, selectedVersion?.status, sourceReadiness.loading, sourceReadiness.error,
    sourceReadiness.data, holidays.loading, holidays.error,
    selectedPeriodDates, rooms.loading, rooms.data, activeExamRooms.length,
    teachers.loading, teachers.data, activeTeachers.length]);

  useEffect(() => { if (!yearId && activeYear) setYearId(activeYear.id); }, [yearId, activeYear]);
  useEffect(() => {
    if (versions.errorStatus !== 404) return;
    setPeriodId('');
    setVersionId('');
    setVersionsData(null);
    setDetailData(null);
    reloadPeriods();
  }, [versions.errorStatus, setVersionsData, setDetailData, reloadPeriods]);
  useEffect(() => {
    if (detail.errorStatus !== 404) return;
    setVersionId('');
    setDetailData(null);
    reloadVersions();
  }, [detail.errorStatus, setDetailData, reloadVersions]);
  useEffect(() => {
    if (periods.data && !periods.data.some((item) => item.id === periodId)) {
      setPeriodId(periods.data[0]?.id || '');
      setVersionId('');
      versions.setData(null);
      detail.setData(null);
    }
  }, [periods.data, periodId, versions, detail]);
  useEffect(() => {
    if (versions.data && !versions.data.some((item) => item.id === versionId)) {
      setVersionId(versions.data.find((item) => item.status === 'DRAFT')?.id
        || versions.data.find((item) => item.status === 'PUBLISHED')?.id
        || versions.data[0]?.id || '');
    }
  }, [versions.data, versionId]);
  const selectPeriod = (nextPeriodId: string) => {
    setPeriodId(nextPeriodId);
    setVersionId('');
    versions.setData(null);
    detail.setData(null);
    setExpandedSessions(new Set());
    setExpandedRooms(new Set());
    setSessionEdit(null);
    setRoomEdit(null);
    setManualSessionOpen(false);
    setSessionToDelete(null);
  };

  const reload = () => {
    periods.reload(); versions.reload(); detail.reload(); sourceReadiness.reload();
    programs.reload(); trainingPlans.reload();
  };

  const openCreatePeriod = () => {
    const semester = yearSemesters.find((item) => item.status === 'ACTIVE') || yearSemesters[0];
    setPeriodForm({
      code: '', name: '', academicYearId: effectiveYearId, semesterId: semester?.id || '',
      examType: 'FINAL', gradeLevels: [...GRADES], allowSubjectTeacherProctor: false,
      startDate: semester?.endDate ? addDays(semester.endDate, -13) : '',
      endDate: semester?.endDate || '',
    });
    setEditingPeriodId(null);
    setPeriodModal(true);
  };

  const openEditPeriod = () => {
    if (!selectedPeriod) return;
    setPeriodForm({
      code: selectedPeriod.code, name: selectedPeriod.name,
      academicYearId: selectedPeriod.academicYearId, semesterId: selectedPeriod.semesterId,
      examType: selectedPeriod.examType, gradeLevels: [...selectedPeriod.gradeLevels],
      allowSubjectTeacherProctor: selectedPeriod.allowSubjectTeacherProctor,
      startDate: selectedPeriod.startDate, endDate: selectedPeriod.endDate,
    });
    setEditingPeriodId(selectedPeriod.id);
    setPeriodModal(true);
  };

  const savePeriod = async () => {
    if (periodFormIssues.length > 0) return;
    setBusy(true);
    try {
      const saved = editingPeriodId
        ? await api.put<ExamPeriod>(`/exam-periods/${editingPeriodId}`, periodForm)
        : await api.post<ExamPeriod>('/exam-periods', periodForm);
      toast.show('ok', editingPeriodId
        ? 'Đã cập nhật thông tin đợt thi.'
        : 'Đã tạo đợt thi và phiên bản nháp đầu tiên.');
      setPeriodModal(false); setEditingPeriodId(null); periods.reload(); selectPeriod(saved.id);
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const applySuggestedPeriodDates = () => {
    const suggestion = formSourceReadiness.data;
    if (!suggestion?.suggestedStartDate || !suggestion.suggestedEndDate) return;
    setPeriodForm((current) => ({
      ...current,
      startDate: suggestion.suggestedStartDate || current.startDate,
      endDate: suggestion.suggestedEndDate || current.endDate,
    }));
  };

  const requestGenerate = () => {
    if ((detail.data?.sessions.length || 0) > 0) setConfirmRegenerate(true);
    else generate();
  };

  const generate = async () => {
    if (!selectedPeriod || generationIssues.length > 0) return;
    setBusy(true);
    try {
      await api.post(`/exam-periods/${periodId}/versions/${versionId}/generate`, {
        examDates: selectedPeriodDates, startTimes: DEFAULT_TIMES,
      });
      toast.show('ok', 'Đã tạo lịch mới, đánh lại SBD liên tục và xếp lại phòng, học sinh, giám thị.');
      setConfirmRegenerate(false);
      detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const validate = async () => {
    setBusy(true);
    try {
      const result = await api.get<ExamVersionDetail['validation']>(
        `/exam-periods/${periodId}/versions/${versionId}/validate`);
      toast.show(result.valid ? 'ok' : 'err', result.valid
        ? 'Lịch thi không còn lỗi bắt buộc và đã sẵn sàng phát hành.'
        : `Còn ${result.errorCount} lỗi bắt buộc cần xử lý.`);
      detail.reload(); versions.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await api.post(`/exam-periods/${periodId}/versions/${versionId}/publish`);
      toast.show('ok', 'Đã phát hành lịch thi cho giáo viên, học sinh và phụ huynh.');
      setConfirmPublish(false); reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const createVersion = async () => {
    if (!versionReason.trim()) return toast.show('err', 'Nhập lý do tạo phiên bản mới.');
    setBusy(true);
    try {
      const created = await api.post<ExamScheduleVersion>(`/exam-periods/${periodId}/versions`, { reason: versionReason });
      toast.show('ok', `Đã tạo bản nháp phiên bản ${created.versionNo}.`);
      setVersionModal(false); versions.reload(); setVersionId(created.id);
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const recallPublished = async () => {
    if (!recallReason.trim()) return toast.show('err', 'Nhập lý do thu hồi lịch thi.');
    setBusy(true);
    try {
      const recalled = await api.post<ExamVersionDetail>(`/exam-periods/${periodId}/recall`, { reason: recallReason.trim() });
      toast.show('ok', `Đã thu hồi lịch và tạo bản nháp phiên bản ${recalled.version.versionNo}.`);
      setRecallModal(false);
      setVersionId(recalled.version.id);
      detail.setData(recalled);
      periods.reload();
      versions.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const deletePeriod = async () => {
    setBusy(true);
    try {
      await api.del(`/exam-periods/${periodId}`);
      toast.show('ok', 'Đã xóa đợt thi và toàn bộ lịch liên quan.');
      setConfirmDeletePeriod(false);
      selectPeriod('');
      periods.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const changePeriodStatus = async () => {
    if (!periodStatusAction || !periodStatusReason.trim()) return;
    setBusy(true);
    try {
      const updated = await api.post<ExamPeriod>(`/exam-periods/${periodId}/status`, {
        status: periodStatusAction,
        reason: periodStatusReason.trim(),
      });
      toast.show('ok', periodStatusAction === 'CLOSED'
        ? 'Đã đóng đợt thi. Lịch sử và bản đã phát hành vẫn được giữ nguyên.'
        : 'Đã hủy đợt thi. Người dùng cuối sẽ không còn thấy lịch này.');
      setPeriodStatusAction(null);
      setPeriodStatusReason('');
      periods.reload();
      versions.reload();
      setPeriodId(updated.id);
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const createManualSession = async (form: SessionEditForm) => {
    setBusy(true);
    try {
      await api.post(`/exam-periods/${periodId}/versions/${versionId}/sessions`, form);
      toast.show('ok', 'Đã thêm ca thi, chia phòng và xếp giám thị ban đầu.');
      setManualSessionOpen(false);
      detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const deleteSession = async () => {
    if (!sessionToDelete) return;
    setBusy(true);
    try {
      await api.del(`/exam-periods/${periodId}/versions/${versionId}/sessions/${sessionToDelete.id}`);
      toast.show('ok', 'Đã xóa ca thi khỏi bản nháp.');
      setSessionToDelete(null);
      detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const saveSession = async (form: SessionEditForm) => {
    if (!sessionEdit) return;
    setBusy(true);
    try {
      await api.put(`/exam-periods/${periodId}/versions/${versionId}/sessions/${sessionEdit.id}`, form);
      toast.show('ok', 'Đã cập nhật ca thi. Hãy kiểm tra lại trước khi phát hành.');
      setSessionEdit(null); detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const saveRoom = async (form: RoomEditForm) => {
    if (!roomEdit) return;
    setBusy(true);
    try {
      await api.put(`/exam-periods/${periodId}/versions/${versionId}/rooms/${roomEdit.id}`, form);
      toast.show('ok', 'Đã đổi phòng và phân công giám thị.');
      setRoomEdit(null); detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const addAway = async () => {
    if (awayIssues.length > 0) return;
    setBusy(true);
    try {
      const payload = {
        teacherId: awayForm.teacherId, unavailableDate: awayForm.unavailableDate,
        endDate: awayForm.endDate || awayForm.unavailableDate,
        startTime: awayForm.allDay ? null : awayForm.startTime || null,
        endTime: awayForm.allDay ? null : awayForm.endTime || null,
        unavailabilityType: awayForm.unavailabilityType,
        reason: awayForm.reason,
      };
      const saved = editingAwayId
        ? await api.put<import('../../api/types').ExamTeacherUnavailability>(`/exam-periods/${periodId}/teacher-unavailability/${editingAwayId}`, payload)
        : await api.post<import('../../api/types').ExamTeacherUnavailability>(`/exam-periods/${periodId}/teacher-unavailability`, payload);
      toast.show(saved.affectedSessionCount > 0 ? 'err' : 'ok', saved.affectedSessionCount > 0
        ? `Lịch bận này ảnh hưởng ${saved.affectedSessionCount} ca hiện tại. Hãy kiểm tra hoặc tạo lại phân công giám thị.`
        : editingAwayId ? 'Đã cập nhật lịch bận/nghỉ của giáo viên.' : 'Đã ghi nhận lịch bận/nghỉ của giáo viên.');
      setEditingAwayId(null);
      setAwayForm({ teacherId: '', unavailableDate: '', endDate: '', allDay: true, startTime: '', endTime: '', unavailabilityType: 'LEAVE', reason: '' });
      detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const removeAway = async (id: string) => {
    setBusy(true);
    try {
      await api.del(`/exam-periods/${periodId}/teacher-unavailability/${id}`);
      toast.show('ok', 'Đã xóa lịch bận/nghỉ. Hãy kiểm tra lại lịch trước khi phát hành.');
      setAwayToDelete(null); detail.reload();
    } catch (error) { toast.show('err', message(error)); }
    finally { setBusy(false); }
  };

  const editAway = (row: import('../../api/types').ExamTeacherUnavailability) => {
    setEditingAwayId(row.id);
    setAwayForm({
      teacherId: row.teacherId, unavailableDate: row.unavailableDate,
      endDate: row.endDate || row.unavailableDate,
      allDay: !row.startTime, startTime: row.startTime || '', endTime: row.endTime || '',
      unavailabilityType: row.unavailabilityType || 'OTHER', reason: row.reason,
    });
  };

  const canEdit = selectedVersion?.status === 'DRAFT';
  const canRecall = ['PUBLISHED', 'CLOSED'].includes(selectedPeriod?.status || '')
    && Boolean(selectedPeriod?.publishedVersionId);
  const awayIssues = validateAwayForm(awayForm, selectedPeriod);

  return <div className="exam-workspace">
    {toast.node}
    <Section title="Đợt thi" subtitle="Tạo, điều chỉnh và theo dõi phiên bản lịch thi" wide
      action={<div className="exam-period-actions">
        {selectedPeriod?.status === 'DRAFT' && <button className="live-btn exam-secondary" onClick={openEditPeriod}><Pencil size={15} /> Sửa</button>}
        {selectedPeriod?.canDelete && <button className="live-btn exam-ghost-danger" onClick={() => setConfirmDeletePeriod(true)}><Trash2 size={15} /> Xóa đợt thi</button>}
        {selectedPeriod?.status === 'PUBLISHED' && <button className="live-btn exam-secondary" onClick={() => { setPeriodStatusReason('Kết thúc vận hành đợt thi'); setPeriodStatusAction('CLOSED'); }}><ShieldCheck size={15} /> Đóng đợt thi</button>}
        {selectedPeriod && !['CLOSED', 'CANCELLED'].includes(selectedPeriod.status) && !selectedPeriod.canDelete && <button className="live-btn exam-ghost-danger" onClick={() => { setPeriodStatusReason('Hủy đợt thi'); setPeriodStatusAction('CANCELLED'); }}><Ban size={15} /> Hủy đợt thi</button>}
        <button className="live-btn" onClick={openCreatePeriod}><Plus size={15} /> Tạo đợt thi</button>
      </div>}>
      <div className="exam-period-toolbar">
        <select value={effectiveYearId} onChange={(event) => { setYearId(event.target.value); selectPeriod(''); }}>
          {(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name}</option>)}
        </select>
        <select className="grow" value={periodId} onChange={(event) => selectPeriod(event.target.value)}>
          <option value="">Chọn đợt thi</option>
          {(periods.data || []).map((period) => <option key={period.id} value={period.id}>
            {period.name} — {EXAM_TYPE_LABEL[period.examType] || period.examType} ({period.semesterName})
          </option>)}
        </select>
        <button className="live-btn exam-secondary" onClick={reload}><RefreshCw size={15} /> Làm mới</button>
      </div>
      <div className={`exam-program-source ${activeProgram ? '' : 'is-missing'}`}>
        <BookOpenCheck size={22} />
        <div>
          <small>Chương trình đang áp dụng</small>
          <strong>{activeProgram ? `${activeProgram.name} (${activeProgram.code})` : 'Chưa có chương trình ACTIVE'}</strong>
          <span>{currentSourcePlans.length > 0
            ? `Nguồn GĐ3: ${currentSourcePlans.map((plan) => `${gradeLabel(plan.gradeLevel)} v${plan.versionNumber}`).join(' · ')}`
            : 'Chưa có kế hoạch GĐ3 đã công bố hoặc khóa cho năm học này.'}</span>
        </div>
      </div>
      {selectedPeriod && <div className="exam-period-summary">
        <article><small>Mã đợt thi</small><strong>{selectedPeriod.code}</strong></article>
        <article><small>Học kỳ</small><strong>{selectedPeriod.semesterName}</strong></article>
        <article><small>Loại kỳ thi</small><strong>{EXAM_TYPE_LABEL[selectedPeriod.examType] || selectedPeriod.examType}</strong></article>
        <article><small>Thời gian</small><strong>{fmtDate(selectedPeriod.startDate)} – {fmtDate(selectedPeriod.endDate)}</strong></article>
        <article><small>Phạm vi</small><strong>{selectedPeriod.gradeLevels.map(gradeLabel).join(', ')}</strong></article>
        <article><small>Trạng thái</small><ExamStatusChip value={selectedPeriod.status} /></article>
        <article><small>Người tạo</small><strong>{selectedPeriod.createdByName}</strong><span>{fmtDateTime(selectedPeriod.createdAt)}</span></article>
      </div>}
      {!periods.loading && !periods.error && (periods.data || []).length === 0 && <div className="exam-empty-periods">
        <CalendarPlus size={28} />
        <div>
          <strong>Chưa có đợt thi trong năm học này</strong>
          <span>Tạo đợt thi mới; môn, khối và thời lượng sẽ được lấy trực tiếp từ kế hoạch kiểm tra GĐ3 đã công bố.</span>
        </div>
        <button className="live-btn" onClick={openCreatePeriod}><Plus size={15} /> Tạo đợt thi đầu tiên</button>
      </div>}
    </Section>

    {selectedPeriod && <Section title="Phiên bản lịch thi" subtitle="Bản đã phát hành được giữ nguyên; mọi điều chỉnh thực hiện trên bản nháp mới" wide
      action={selectedPeriod.publishedVersionId
        ? <div className="exam-period-actions">
          {!versions.data?.some((item) => item.status === 'DRAFT') && <button className="live-btn exam-secondary" onClick={() => setVersionModal(true)}><History size={15} /> Tạo bản điều chỉnh</button>}
          {canRecall && <button className="live-btn exam-warning" title="Thu hồi bản đang phát hành và tạo bản nháp có thể chỉnh sửa" onClick={() => setRecallModal(true)}><RotateCcw size={15} /> {selectedPeriod.status === 'CLOSED' ? 'Mở lại để chỉnh sửa' : 'Thu hồi về nháp'}</button>}
        </div> : undefined}>
      <div className="exam-version-toolbar">
        <select value={versionId} onChange={(event) => setVersionId(event.target.value)}>
          {(versions.data || []).map((version) => <option key={version.id} value={version.id}>
            {versionOptionLabel(version)}
          </option>)}
        </select>
        {selectedVersion && <span className="exam-version-author"><ExamStatusChip value={selectedVersion.status} /> {selectedVersion.createdByName} · {selectedVersion.changeReason}</span>}
        <button className="live-btn exam-secondary" disabled={!versionId || busy} onClick={validate}><ClipboardCheck size={15} /> Kiểm tra</button>
        {canEdit && <button className="live-btn" disabled={busy || !detail.data?.validation.valid || !detail.data?.version.validationCurrent} onClick={() => setConfirmPublish(true)}><Send size={15} /> Phát hành</button>}
      </div>
      {detail.data?.version.status === 'DRAFT' && <div className={`exam-validation-freshness ${detail.data.version.validationCurrent ? 'current' : 'stale'}`}>
        {detail.data.version.validationCurrent
          ? <><CheckCircle2 size={16} /><span>Đã kiểm tra bản hiện tại lúc {fmtDateTime(detail.data.version.lastValidatedAt)}.</span></>
          : <><AlertTriangle size={16} /><span>Lịch đã thay đổi hoặc chưa được kiểm tra. Bấm <strong>Kiểm tra</strong> trước khi phát hành.</span></>}
      </div>}
    </Section>}

    {detail.data?.versionDiff.comparisonAvailable
      && <ExamVersionDiffPanel diff={detail.data.versionDiff} versionNo={detail.data.version.versionNo} />}

    {selectedPeriod && versionId && <FunctionTabs tabs={[
      { id: 'schedule', label: 'Lịch thi', Icon: CalendarClock, content: <>
        {canEdit && <Section title="Lập lịch thi" subtitle="Tạo toàn bộ lịch tự động hoặc thêm từng ca thi thủ công" wide
          action={<button className="live-btn exam-secondary" onClick={() => setManualSessionOpen(true)}><CalendarPlus size={15} /> Thêm ca thi thủ công</button>}>
          <div className="exam-generator">
            <div className="exam-generator-toolbar">
              <div><strong>Tạo lịch tự động</strong><small>Môn, khối và thời lượng được lấy từ kế hoạch kiểm tra GĐ3; hệ thống chỉ xếp ngày giờ, phòng, học sinh và giám thị.</small></div>
              <span><strong>{sourceReadiness.data?.sourceCount || 0}</strong> kế hoạch nguồn</span>
              <button className="live-btn" disabled={busy || generationIssues.length > 0} onClick={requestGenerate}><Rocket size={15} /> {detail.data?.sessions.length ? 'Tạo lại lịch tự động' : 'Tạo lịch tự động'}</button>
            </div>
            <FormValidationSummary errors={generationIssues}
              warnings={selectedPeriod && holidaysInRange(selectedPeriod.startDate, selectedPeriod.endDate, holidays.data || []).length > 0
                ? ['Ngày nghỉ của trường đã được tự động loại khỏi lịch thi.'] : []}
              success={`Sẵn sàng xếp ${sourceReadiness.data?.sourceCount || 0} kế hoạch kiểm tra từ GĐ3.`} />
            <fieldset className="exam-subject-picker">
              <legend>Đầu vào đã công bố từ GĐ3</legend>
              {sortExamSources(sourceReadiness.data?.sources || []).map((source, index) =>
                <div key={source.assessmentPlanId} className="exam-subject-tile selected">
                  <span className="exam-subject-choice"><CheckCircle2 size={17} />
                    <span><strong>{source.subjectName} · {gradeLabel(source.gradeLevel)}</strong>
                      <small>Thứ tự {index + 1} · {source.assessmentName} · {assessmentTypeLabel(source.assessmentType)}</small>
                      <small>Tuần {source.weekNumber}: {fmtDate(source.plannedStartDate)} – {fmtDate(source.plannedEndDate)}</small>
                      <small>Nguồn: {source.planName} · phiên bản {source.planVersion}</small></span>
                  </span>
                  <span className="exam-duration-field"><span>Thời lượng GĐ3</span>
                    <strong>{source.durationMinutes}</strong><small>phút</small>
                  </span>
                </div>)}
            </fieldset>
          </div>
        </Section>}
        {detail.data?.sessions.some((session) => session.sourceSyncStatus === 'SOURCE_CHANGED') && <div className="exam-source-changed-notice">
          <AlertTriangle size={20} /><div><strong>Kế hoạch nguồn GĐ3 đã thay đổi</strong><span>Bản lịch hiện tại vẫn giữ snapshot cũ và không bị ghi đè. Với bản nháp, hãy xem thay đổi rồi dùng “Tạo lại lịch tự động” để đồng bộ nguồn mới.</span></div>
        </div>}
        <ExamValidationStrip detail={detail.data} />
        <Section title="Lịch thi và phòng thi" subtitle="Mở từng môn để xem phòng, giám thị và danh sách học sinh" wide>
          <Async state={detail} empty="Phiên bản chưa có lịch thi">
            {(data) => <PaginatedData items={data.sessions} itemLabel="ca thi" resetKey={selectedVersionId}>{(pageSessions) => <div className="exam-session-list">{pageSessions.map((session) => {
              const expanded = expandedSessions.has(session.id);
              return <article key={session.id} id={`exam-session-${session.id}`} className={`exam-session-row source-${session.sourceSyncStatus.toLowerCase()}`}>
                <div className="exam-session-main">
                  <button className="exam-expand-button" title={expanded ? 'Thu gọn ca thi' : 'Mở chi tiết ca thi'} onClick={() => toggleSet(setExpandedSessions, session.id)}>
                  {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <span><strong>{session.subjectName} · {gradeLabel(session.gradeLevel)}</strong><small>{fmtDate(session.examDate)} · {session.startTime}–{session.endTime} · {session.durationMinutes} phút</small><small>{session.assessmentName} · tuần {session.assessmentWeek} ({fmtDate(session.plannedStartDate)} – {fmtDate(session.plannedEndDate)})</small><small>Nguồn: {session.sourcePlanName || 'Dữ liệu cũ'} · v{session.sourcePlanVersion || 'cũ'} <SourceSyncChip status={session.sourceSyncStatus} /></small>{session.scheduleDeviationReason && <small className="exam-deviation-reason">Lý do lệch tuần: {session.scheduleDeviationReason}</small>}</span>
                  <span><b>{session.rooms.length}</b> phòng<small>{session.studentCount} học sinh</small></span>
                  {canEdit && <div className="exam-session-actions">
                    <button className="icon-action" title="Điều chỉnh ca thi" onClick={() => setSessionEdit(session)}><Pencil size={15} /></button>
                    <button className="icon-action danger" title="Xóa ca thi" onClick={() => setSessionToDelete(session)}><Trash2 size={15} /></button>
                  </div>}
                </div>
                {expanded && <div className="exam-room-list">{session.rooms.map((room) => {
                  const roomOpen = expandedRooms.has(room.id);
                  return <div key={room.id} className="exam-room-row">
                    <div className="exam-room-main">
                      <button className="exam-expand-button" title={roomOpen ? 'Thu gọn phòng thi' : 'Mở danh sách học sinh'} onClick={() => toggleSet(setExpandedRooms, room.id)}>
                      {roomOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <strong>{room.roomCode}</strong><span>{room.students.length}/{room.capacity} học sinh</span>
                      <span>Chính: {room.primaryProctorName}</span><span>Dự phòng: {room.backupProctorName}</span>
                      {canEdit && <button className="icon-action" title="Đổi phòng hoặc giám thị" onClick={() => setRoomEdit(room)}><Save size={14} /></button>}
                    </div>
                    {roomOpen && <PaginatedData items={room.students} pageSize={20} itemLabel="học sinh" resetKey={room.id}>{(pageStudents) => <table className="live-table compact"><thead><tr><th>SBD</th><th>Mã học sinh</th><th>Họ tên</th><th>Lớp</th></tr></thead>
                      <tbody>{pageStudents.map((student) => <tr key={student.studentId}><td>{String(student.seatNo).padStart(3, '0')}</td><td>{student.studentCode}</td><td><strong>{student.studentName}</strong></td><td>{student.classCode}</td></tr>)}</tbody></table>}</PaginatedData>}
                  </div>;
                })}</div>}
              </article>;
            })}</div>}</PaginatedData>}
          </Async>
        </Section>
      </> },
      { id: 'unavailable', label: 'GV bận/nghỉ', Icon: UserRoundX, content: <Section title="Lịch bận của giáo viên" subtitle="Bộ xếp tự động loại giáo viên khỏi ca thi tương ứng" wide>
        {!canEdit && <div className="exam-inline-notice"><History size={17} /><span>Tạo bản điều chỉnh hoặc thu hồi lịch về nháp trước khi thay đổi lịch bận/nghỉ.</span></div>}
        {canEdit && <><FormValidationSummary errors={awayIssues} success="Thông tin lịch bận/nghỉ hợp lệ." /><div className="exam-away-form">
          <Field label="Giáo viên"><select value={awayForm.teacherId} onChange={(event) => setAwayForm({ ...awayForm, teacherId: event.target.value })}><option value="">Chọn giáo viên</option>{activeTeachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} ({teacher.teacherCode})</option>)}</select></Field>
          <Field label="Loại bận/nghỉ"><select value={awayForm.unavailabilityType} onChange={(event) => setAwayForm({ ...awayForm, unavailabilityType: event.target.value })}>{Object.entries(UNAVAILABILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field>
          <Field label="Từ ngày"><input type="date" min={selectedPeriod.startDate} max={selectedPeriod.endDate} value={awayForm.unavailableDate} onChange={(event) => setAwayForm({ ...awayForm, unavailableDate: event.target.value, endDate: awayForm.endDate && awayForm.endDate >= event.target.value ? awayForm.endDate : event.target.value })} /></Field>
          <Field label="Đến ngày"><input type="date" min={awayForm.unavailableDate || selectedPeriod.startDate} max={selectedPeriod.endDate} value={awayForm.endDate} onChange={(event) => setAwayForm({ ...awayForm, endDate: event.target.value })} /></Field>
          <label className="exam-all-day"><input type="checkbox" checked={awayForm.allDay} onChange={(event) => setAwayForm({ ...awayForm, allDay: event.target.checked, startTime: '', endTime: '' })} /><span>Nghỉ cả ngày</span></label>
          <Field label="Từ giờ"><input type="time" disabled={awayForm.allDay} value={awayForm.startTime} onChange={(event) => setAwayForm({ ...awayForm, startTime: event.target.value })} /></Field>
          <Field label="Đến giờ"><input type="time" disabled={awayForm.allDay} value={awayForm.endTime} onChange={(event) => setAwayForm({ ...awayForm, endTime: event.target.value })} /></Field>
          <Field label="Lý do"><input placeholder="Ví dụ: nghỉ phép, công tác" value={awayForm.reason} onChange={(event) => setAwayForm({ ...awayForm, reason: event.target.value })} /></Field>
          <button className="live-btn" disabled={busy || awayIssues.length > 0} onClick={addAway}>{editingAwayId ? <Save size={15} /> : <Plus size={15} />} {editingAwayId ? 'Lưu thay đổi' : 'Ghi nhận'}</button>
          {editingAwayId && <button className="live-btn ghost" onClick={() => { setEditingAwayId(null); setAwayForm({ teacherId: '', unavailableDate: '', endDate: '', allDay: true, startTime: '', endTime: '', unavailabilityType: 'LEAVE', reason: '' }); }}>Hủy sửa</button>}
        </div></>}
        <Async state={detail} allowEmpty>{(data) => <PaginatedData items={data.teacherUnavailability} itemLabel="lịch bận/nghỉ" resetKey={selectedVersionId}>{(pageRows) => <table className="live-table"><thead><tr><th>Giáo viên</th><th>Loại</th><th>Khoảng ngày</th><th>Khoảng giờ</th><th>Lý do</th><th>Ảnh hưởng</th><th /></tr></thead>
          <tbody>{pageRows.map((row) => <tr key={row.id}><td><strong>{row.teacherName}</strong><small>{row.createdByName} · {fmtDateTime(row.createdAt)}</small></td><td>{UNAVAILABILITY_LABELS[row.unavailabilityType] || row.unavailabilityType}</td><td>{row.unavailableDate === row.endDate ? fmtDate(row.unavailableDate) : `${fmtDate(row.unavailableDate)} – ${fmtDate(row.endDate)}`}</td><td>{row.startTime ? `${row.startTime}–${row.endTime}` : 'Cả ngày'}</td><td>{row.reason}</td><td>{row.affectedSessionCount > 0 ? <span className="exam-impact-warning">{row.affectedSessionCount} ca</span> : 'Không'}</td><td>{canEdit && <div className="exam-session-actions"><button className="icon-action" title="Chỉnh sửa lịch bận/nghỉ" onClick={() => editAway(row)}><Pencil size={14} /></button><button className="icon-action danger" title="Xóa lịch bận/nghỉ" onClick={() => setAwayToDelete(row)}><Trash2 size={14} /></button></div>}</td></tr>)}</tbody></table>}</PaginatedData>}</Async>
      </Section> },
      { id: 'history', label: 'Lịch sử phiên bản', Icon: History, content: <Section title="Lịch sử phiên bản" subtitle="Mọi lần phát hành và điều chỉnh đều được giữ lại" wide>
        <Async paginate state={versions} empty="Chưa có phiên bản" itemLabel="phiên bản lịch thi">{(items) => <table className="live-table"><thead><tr><th>Phiên bản</th><th>Trạng thái</th><th>Lý do</th><th>Người tạo</th><th>Lần kiểm tra cuối</th><th>Phát hành</th></tr></thead>
          <tbody>{items.map((version) => <tr key={version.id}><td><strong>v{version.versionNo}</strong></td><td><ExamStatusChip value={version.status} /></td><td>{version.changeReason}</td><td>{version.createdByName}<small>{fmtDateTime(version.createdAt)}</small></td><td>{version.lastValidatedAt ? <>{fmtDateTime(version.lastValidatedAt)}<small>{version.validationCurrent ? 'Còn hiệu lực' : 'Đã hết hiệu lực'} · {version.lastValidationErrorCount || 0} lỗi · {version.lastValidationWarningCount || 0} cảnh báo</small></> : 'Chưa kiểm tra'}</td><td>{version.publishedByName || '—'}<small>{fmtDateTime(version.publishedAt)}</small></td></tr>)}</tbody></table>}</Async>
      </Section> },
    ]} />}

    {periodModal && <Modal title={editingPeriodId ? 'Sửa đợt thi' : 'Tạo đợt thi'} onClose={() => setPeriodModal(false)} footer={<><button className="live-btn ghost" onClick={() => setPeriodModal(false)}>Hủy</button><button className="live-btn" disabled={busy || periodFormIssues.length > 0} onClick={savePeriod}><Save size={15} /> {editingPeriodId ? 'Lưu thay đổi' : 'Tạo đợt thi'}</button></>}>
      <FormValidationSummary errors={periodFormIssues.map((item) => item.message)} warnings={periodWarnings}
        success={`Đợt thi hợp lệ, có ${periodDatePreview.length} ngày có thể xếp lịch.`} />
      {formSourceReadiness.data?.ready && formSourceReadiness.data.suggestedStartDate && formSourceReadiness.data.suggestedEndDate && <div className="exam-date-suggestion">
        <CalendarClock size={20} />
        <div><strong>Thời gian gợi ý từ kế hoạch GĐ3</strong><span>{fmtDate(formSourceReadiness.data.suggestedStartDate)} – {fmtDate(formSourceReadiness.data.suggestedEndDate)} · {formSourceReadiness.data.subjectCount} môn · tối thiểu {formSourceReadiness.data.requiredDays} ngày</span><small>Được tính theo tuần kiểm tra đã công bố; Chủ nhật và ngày nghỉ của trường đã được loại bỏ.</small></div>
        <button className="live-btn exam-secondary" type="button" onClick={applySuggestedPeriodDates}>Dùng thời gian gợi ý</button>
      </div>}
      <div className="modal-grid two"><Field label="Mã đợt thi" error={fieldIssue(periodFormIssues, 'code')}><input value={periodForm.code} onChange={(event) => setPeriodForm({ ...periodForm, code: event.target.value })} placeholder="CK1-2027" /></Field>
        <Field label="Tên đợt thi" error={fieldIssue(periodFormIssues, 'name')}><input value={periodForm.name} onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })} placeholder="Thi cuối học kỳ 1" /></Field>
        <Field label="Học kỳ" error={fieldIssue(periodFormIssues, 'semesterId')}><select value={periodForm.semesterId} onChange={(event) => setPeriodForm({ ...periodForm, semesterId: event.target.value })}>{yearSemesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}</select></Field>
        <Field label="Loại kỳ thi"><select value={periodForm.examType} onChange={(event) => setPeriodForm({ ...periodForm, examType: event.target.value })}>{PLANNED_EXAM_TYPES.map((value) => <option key={value} value={value}>{EXAM_TYPE_LABEL[value]}</option>)}</select></Field>
        <Field label="Ngày bắt đầu" error={fieldIssue(periodFormIssues, 'startDate')}><input type="date" min={formSemester?.startDate} max={formSemester?.endDate} value={periodForm.startDate} onChange={(event) => setPeriodForm({ ...periodForm, startDate: event.target.value })} /></Field>
        <Field label="Ngày kết thúc" error={fieldIssue(periodFormIssues, 'endDate')}><input type="date" min={formSemester?.startDate} max={formSemester?.endDate} value={periodForm.endDate} onChange={(event) => setPeriodForm({ ...periodForm, endDate: event.target.value })} /></Field></div>
      <div className="exam-grade-picker">{GRADES.map((grade) => <label key={grade}><input type="checkbox" checked={periodForm.gradeLevels.includes(grade)} onChange={(event) => setPeriodForm({ ...periodForm, gradeLevels: event.target.checked ? [...periodForm.gradeLevels, grade] : periodForm.gradeLevels.filter((item) => item !== grade) })} /> {gradeLabel(grade)}</label>)}</div>
      <label className="academic-check"><input type="checkbox" checked={periodForm.allowSubjectTeacherProctor} onChange={(event) => setPeriodForm({ ...periodForm, allowSubjectTeacherProctor: event.target.checked })} /> Cho phép giáo viên coi môn mình đang dạy</label>
    </Modal>}

    {versionModal && <Modal title="Tạo bản điều chỉnh" onClose={() => setVersionModal(false)} footer={<><button className="live-btn ghost" onClick={() => setVersionModal(false)}>Hủy</button><button className="live-btn" onClick={createVersion}><History size={15} /> Tạo bản nháp</button></>}>
      <Field label="Lý do điều chỉnh"><textarea rows={4} value={versionReason} onChange={(event) => setVersionReason(event.target.value)} /></Field>
    </Modal>}

    {confirmPublish && <Modal title="Phát hành lịch thi" onClose={() => setConfirmPublish(false)} footer={<><button className="live-btn ghost" onClick={() => setConfirmPublish(false)}>Quay lại</button><button className="live-btn" disabled={busy} onClick={publish}><Send size={15} /> Xác nhận phát hành</button></>}>
      <div className="exam-publish-confirm"><ShieldCheck size={28} /><div><strong>Lịch sẽ hiển thị ngay cho người dùng cuối</strong><p>{detail.data?.versionDiff.comparisonAvailable
        ? `V${detail.data.version.versionNo} có ${detail.data.versionDiff.totalChanges} nhóm thay đổi so với V${detail.data.versionDiff.baseVersionNo}. `
        : ''}Học sinh và phụ huynh xem ngày, môn, giờ, phòng; giáo viên xem ca coi thi chính hoặc dự phòng.</p></div></div>
    </Modal>}

    {confirmRegenerate && <Modal title="Tạo lại lịch thi tự động" onClose={() => setConfirmRegenerate(false)} footer={<><button className="live-btn ghost" onClick={() => setConfirmRegenerate(false)}>Giữ lịch hiện tại</button><button className="live-btn" disabled={busy} onClick={generate}><RefreshCw size={15} /> Xếp lại toàn bộ</button></>}>
      <div className="exam-publish-confirm"><RefreshCw size={28} /><div><strong>Lịch trong bản nháp sẽ được thay thế</strong><p>Hệ thống sẽ xóa cách xếp hiện tại rồi tính lại ngày giờ, phòng, SBD và giám thị. Lịch bận/nghỉ mới cùng các đợt thi đã phát hành sẽ được kiểm tra lại.</p></div></div>
    </Modal>}

    {confirmDeletePeriod && selectedPeriod && <Modal title="Xóa đợt thi" onClose={() => setConfirmDeletePeriod(false)} footer={<><button className="live-btn ghost" onClick={() => setConfirmDeletePeriod(false)}>Giữ lại</button><button className="live-btn danger" disabled={busy} onClick={deletePeriod}><Trash2 size={15} /> Xóa vĩnh viễn</button></>}>
      <div className="exam-danger-confirm"><AlertTriangle size={26} /><div><strong>Xóa “{selectedPeriod.name}”?</strong><p>Toàn bộ phiên bản, ca thi, phòng thi, danh sách học sinh, phân công giám thị và lịch giáo viên bận/nghỉ sẽ bị xóa. Nếu lịch đã phát hành, học sinh, phụ huynh và giáo viên sẽ không còn nhìn thấy lịch này. Audit thao tác xóa vẫn được giữ lại.</p></div></div>
    </Modal>}

    {periodStatusAction && selectedPeriod && <Modal title={periodStatusAction === 'CLOSED' ? 'Đóng đợt thi' : 'Hủy đợt thi'} onClose={() => setPeriodStatusAction(null)} footer={<><button className="live-btn ghost" onClick={() => setPeriodStatusAction(null)}>Quay lại</button><button className={periodStatusAction === 'CLOSED' ? 'live-btn' : 'live-btn danger'} disabled={busy || !periodStatusReason.trim()} onClick={changePeriodStatus}>{periodStatusAction === 'CLOSED' ? <ShieldCheck size={15} /> : <Ban size={15} />} Xác nhận</button></>}>
      <div className={periodStatusAction === 'CLOSED' ? 'exam-publish-confirm' : 'exam-danger-confirm'}>
        {periodStatusAction === 'CLOSED' ? <ShieldCheck size={26} /> : <AlertTriangle size={26} />}
        <div><strong>{periodStatusAction === 'CLOSED' ? 'Khóa vận hành nhưng giữ nguyên lịch sử' : 'Ẩn lịch khỏi người dùng cuối'}</strong><p>{periodStatusAction === 'CLOSED' ? 'Bản đã phát hành, phòng thi, số báo danh và phân công giám thị vẫn được lưu để tra cứu và audit.' : 'Đợt thi đã hủy không thể phát hành tiếp. Các phiên bản cũ vẫn được giữ để truy vết.'}</p></div>
      </div>
      <Field label="Lý do bắt buộc"><textarea rows={3} value={periodStatusReason} onChange={(event) => setPeriodStatusReason(event.target.value)} /></Field>
    </Modal>}

    {recallModal && selectedPeriod && <Modal title="Thu hồi lịch thi về nháp" onClose={() => setRecallModal(false)} footer={<><button className="live-btn ghost" onClick={() => setRecallModal(false)}>Hủy</button><button className="live-btn exam-warning" disabled={busy || !recallReason.trim()} onClick={recallPublished}><RotateCcw size={15} /> Thu hồi và tạo bản nháp</button></>}>
      <div className="exam-danger-confirm warning"><RotateCcw size={26} /><div><strong>Lịch sẽ tạm ẩn khỏi người dùng cuối</strong><p>Bản đã phát hành vẫn được giữ trong lịch sử. Hệ thống tạo một bản nháp mới để Admin chỉnh sửa và phát hành lại.</p></div></div>
      <Field label="Lý do thu hồi"><textarea rows={4} value={recallReason} onChange={(event) => setRecallReason(event.target.value)} placeholder="Nhập lý do bắt buộc" /></Field>
    </Modal>}

    {manualSessionOpen && selectedPeriod && <ManualSessionModal
      sources={(sourceReadiness.data?.sources || []).filter((source) =>
        !detail.data?.sessions.some((session) => session.sourceAssessmentPlanId === source.assessmentPlanId))}
      startDate={selectedPeriod.startDate} endDate={selectedPeriod.endDate}
      holidays={holidays.data || []} busy={busy} onClose={() => setManualSessionOpen(false)} onSave={createManualSession} />}

    {sessionToDelete && <Modal title="Xóa ca thi" onClose={() => setSessionToDelete(null)} footer={<><button className="live-btn ghost" onClick={() => setSessionToDelete(null)}>Giữ lại</button><button className="live-btn danger" disabled={busy} onClick={deleteSession}><Trash2 size={15} /> Xóa ca thi</button></>}>
      <div className="exam-danger-confirm"><AlertTriangle size={26} /><div><strong>{sessionToDelete.subjectName} · {gradeLabel(sessionToDelete.gradeLevel)}</strong><p>Phòng thi, danh sách học sinh và phân công giám thị của ca này cũng sẽ bị xóa.</p></div></div>
    </Modal>}

    {awayToDelete && <Modal title="Xóa lịch bận/nghỉ" onClose={() => setAwayToDelete(null)} footer={<><button className="live-btn ghost" onClick={() => setAwayToDelete(null)}>Giữ lại</button><button className="live-btn danger" disabled={busy} onClick={() => removeAway(awayToDelete.id)}><Trash2 size={15} /> Xóa lịch</button></>}>
      <div className="exam-danger-confirm"><AlertTriangle size={26} /><div><strong>{awayToDelete.teacherName} · {fmtDate(awayToDelete.unavailableDate)} – {fmtDate(awayToDelete.endDate)}</strong><p>{awayToDelete.affectedSessionCount > 0 ? `Lịch này đang ảnh hưởng ${awayToDelete.affectedSessionCount} ca thi. Sau khi xóa, bạn vẫn phải kiểm tra lại bản nháp trước khi phát hành.` : 'Sau khi xóa, kết quả kiểm tra cũ của bản nháp sẽ hết hiệu lực.'}</p></div></div>
    </Modal>}

    {sessionEdit && selectedPeriod && <SessionEditModal session={sessionEdit}
      startDate={selectedPeriod.startDate} endDate={selectedPeriod.endDate} holidays={holidays.data || []}
      busy={busy} onClose={() => setSessionEdit(null)} onSave={saveSession} />}
    {roomEdit && <RoomEditModal assignment={roomEdit} rooms={rooms.data || []} teachers={activeTeachers} busy={busy} onClose={() => setRoomEdit(null)} onSave={saveRoom} />}
  </div>;
}

function ExamValidationStrip({ detail }: { detail: ExamVersionDetail | null }) {
  if (!detail) return null;
  const validation = detail.validation;
  const checked = detail.version.status !== 'DRAFT' || detail.version.validationCurrent;
  const ready = validation.valid && checked;
  const grouped = Object.entries(validation.issues.reduce<Record<string, typeof validation.issues>>((result, issue) => {
    (result[issue.code] ||= []).push(issue); return result;
  }, {}));
  return <section className={`exam-validation ${ready ? 'valid' : 'invalid'}`}>
    {ready ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
    <div><strong>{ready ? 'Đủ điều kiện phát hành' : !checked ? 'Cần kiểm tra lại sau thay đổi' : `${validation.errorCount} lỗi cần xử lý`}</strong>
      <span>{validation.sessionCount} môn/khối · {validation.roomCount} phòng · {validation.studentCount} lượt học sinh</span></div>
    {validation.issues.length > 0 && <details className="exam-issue-details" open={!validation.valid}>
      <summary>{validation.errorCount} lỗi bắt buộc · {validation.warningCount} cảnh báo</summary>
      <PaginatedData items={grouped} itemLabel="nhóm lỗi lịch thi" pageSize={5} resetKey={detail.version.id}>{(pageGroups) => <div className="exam-issue-groups">{pageGroups.map(([code, issues]) => <details key={code} open={issues.some((issue) => issue.severity === 'ERROR')}>
        <summary>{issueCodeLabel(code)} · {issues.length}</summary>
        <div className="exam-issue-list">{issues.map((issue, index) => <span key={`${issue.code}-${index}`}>
          <span><b>{issue.severity === 'ERROR' ? 'Lỗi' : 'Cảnh báo'}:</b> {issue.message}</span>
          {issue.sessionId && <button type="button" onClick={() => document.getElementById(`exam-session-${issue.sessionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}>Đi tới ca thi</button>}
        </span>)}</div>
      </details>)}</div>}</PaginatedData>
    </details>}
  </section>;
}

function ExamVersionDiffPanel({ diff, versionNo }: { diff: ExamVersionDiff; versionNo: number }) {
  return <section className={`exam-version-diff ${diff.hasChanges ? 'changed' : 'unchanged'}`}>
    <header>
      <GitCompareArrows size={21} />
      <div><strong>So sánh V{versionNo} với V{diff.baseVersionNo}</strong>
        <small>{diff.hasChanges
          ? `Đã phát hiện ${diff.totalChanges} nhóm thay đổi thực chất.`
          : 'Hai phiên bản đang có cùng nội dung lịch thi.'}</small></div>
      <span className={`exam-diff-status ${diff.hasChanges ? 'changed' : 'unchanged'}`}>
        {diff.hasChanges ? 'Đã chỉnh sửa' : 'Chưa thay đổi'}
      </span>
    </header>
    {!diff.hasChanges
      ? <p>Hãy đổi ít nhất một ca thi, thời lượng, ghi chú, phòng, giám thị hoặc danh sách xếp phòng trước khi phát hành.</p>
      : <>
        <div className="exam-diff-metrics">
          <span><b>{diff.addedSessions}</b> ca thêm</span>
          <span><b>{diff.removedSessions}</b> ca xóa</span>
          <span><b>{diff.changedSessions}</b> ca đổi</span>
          <span><b>{diff.changedRooms}</b> phòng đổi</span>
          <span><b>{diff.changedProctors}</b> giám thị đổi</span>
          <span><b>{diff.changedStudents}</b> chỗ ngồi đổi</span>
        </div>
        <details className="exam-diff-details" open>
          <summary>Xem nội dung thay đổi</summary>
          <div>{diff.changes.map((change, index) => <article key={`${change.type}-${change.label}-${index}`}>
            <strong>{change.label}</strong>
            <span><small>Trước</small>{change.beforeValue}</span>
            <span><small>Sau</small>{change.afterValue}</span>
          </article>)}</div>
        </details>
      </>}
  </section>;
}

type SessionEditForm = { sourceAssessmentPlanId: string; examDate: string; startTime: string; scheduleDeviationReason: string; notes: string };
function ManualSessionModal({ sources, startDate, endDate, holidays, busy, onClose, onSave }: {
  sources: ExamAssessmentSource[]; startDate: string; endDate: string;
  holidays: SchoolHoliday[];
  busy: boolean; onClose: () => void;
  onSave: (form: SessionEditForm) => void;
}) {
  const initialSource = sources[0];
  const [form, setForm] = useState<SessionEditForm>({
    sourceAssessmentPlanId: initialSource?.assessmentPlanId || '',
    examDate: initialSource && initialSource.plannedStartDate >= startDate && initialSource.plannedStartDate <= endDate
      ? initialSource.plannedStartDate : startDate,
    startTime: '07:30', scheduleDeviationReason: '', notes: '',
  });
  const selectedSource = sources.find((source) => source.assessmentPlanId === form.sourceAssessmentPlanId);
  const outsidePlannedWeek = Boolean(selectedSource && form.examDate
    && (form.examDate < selectedSource.plannedStartDate || form.examDate > selectedSource.plannedEndDate));
  const issues = validateSessionForm(form, startDate, endDate, holidays, selectedSource);
  return <Modal title="Thêm ca thi thủ công" onClose={onClose} footer={<><button className="live-btn ghost" onClick={onClose}>Hủy</button><button className="live-btn" disabled={busy || issues.length > 0} onClick={() => onSave(form)}><CalendarPlus size={15} /> Thêm và chia phòng</button></>}>
    <div className="exam-manual-note"><Users size={20} /><span>Bạn chọn thời gian thi. Hệ thống chỉ tự chia phòng, học sinh và giám thị ban đầu; sau đó có thể đổi từng phòng và giám thị bằng tay.</span></div>
    <FormValidationSummary errors={issues} success="Ca thi hợp lệ và sẵn sàng chia phòng." />
    <div className="modal-grid two"><Field label="Kế hoạch kiểm tra nguồn"><select value={form.sourceAssessmentPlanId} onChange={(event) => {
      const next = sources.find((source) => source.assessmentPlanId === event.target.value);
      setForm({ ...form, sourceAssessmentPlanId: event.target.value,
        examDate: next && next.plannedStartDate >= startDate && next.plannedStartDate <= endDate ? next.plannedStartDate : form.examDate,
        scheduleDeviationReason: '' });
    }}>
      <option value="">Chọn kế hoạch từ GĐ3</option>{sources.map((source) => <option key={source.assessmentPlanId} value={source.assessmentPlanId}>{source.subjectName} · {gradeLabel(source.gradeLevel)} · {source.durationMinutes} phút</option>)}</select></Field>
      <Field label="Ngày thi"><input type="date" min={startDate} max={endDate} value={form.examDate} onChange={(event) => setForm({ ...form, examDate: event.target.value })} />{selectedSource && <small>Tuần GĐ3: {fmtDate(selectedSource.plannedStartDate)} – {fmtDate(selectedSource.plannedEndDate)}</small>}</Field>
      <Field label="Giờ bắt đầu"><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
      {outsidePlannedWeek && <Field label="Lý do điều chỉnh tuần thi"><textarea rows={3} value={form.scheduleDeviationReason} onChange={(event) => setForm({ ...form, scheduleDeviationReason: event.target.value })} placeholder="Bắt buộc khi ngày thi khác tuần kế hoạch GĐ3" /></Field>}
      <Field label="Ghi chú (không bắt buộc)"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="Ví dụ: mang máy tính cầm tay" /></Field></div>
  </Modal>;
}

function SessionEditModal({ session, startDate, endDate, holidays, busy, onClose, onSave }: {
  session: ExamSession; startDate: string; endDate: string;
  holidays: SchoolHoliday[]; busy: boolean; onClose: () => void;
  onSave: (form: SessionEditForm) => void;
}) {
  const [form, setForm] = useState<SessionEditForm>({ sourceAssessmentPlanId: session.sourceAssessmentPlanId || '', examDate: session.examDate, startTime: session.startTime, scheduleDeviationReason: session.scheduleDeviationReason || '', notes: session.notes || '' });
  const source = session.plannedStartDate && session.plannedEndDate ? {
    plannedStartDate: session.plannedStartDate, plannedEndDate: session.plannedEndDate,
  } as ExamAssessmentSource : undefined;
  const outsidePlannedWeek = Boolean(source && (form.examDate < source.plannedStartDate || form.examDate > source.plannedEndDate));
  const issues = validateSessionForm(form, startDate, endDate, holidays, source);
  return <Modal title="Điều chỉnh ca thi" onClose={onClose} footer={<><button className="live-btn ghost" onClick={onClose}>Hủy</button><button className="live-btn" disabled={busy || issues.length > 0} onClick={() => onSave(form)}><Save size={15} /> Lưu thay đổi</button></>}>
    <FormValidationSummary errors={issues} success="Ca thi hợp lệ và có thể lưu." />
    <div className="modal-grid two"><Field label="Môn và khối từ GĐ3"><input disabled value={`${session.subjectName} · ${gradeLabel(session.gradeLevel)}`} /></Field>
      <Field label="Thời lượng từ GĐ3"><input disabled value={`${session.durationMinutes} phút`} /></Field>
      <Field label="Ngày thi"><input type="date" min={startDate} max={endDate} value={form.examDate} onChange={(event) => setForm({ ...form, examDate: event.target.value })} />{source && <small>Tuần GĐ3: {fmtDate(source.plannedStartDate)} – {fmtDate(source.plannedEndDate)}</small>}</Field>
      <Field label="Giờ bắt đầu"><input type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} /></Field>
      {outsidePlannedWeek && <Field label="Lý do điều chỉnh tuần thi"><textarea rows={3} value={form.scheduleDeviationReason} onChange={(event) => setForm({ ...form, scheduleDeviationReason: event.target.value })} placeholder="Bắt buộc khi ngày thi khác tuần kế hoạch GĐ3" /></Field>}
      <Field label="Ghi chú"><input value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></Field></div>
  </Modal>;
}

type RoomEditForm = { roomId: string; primaryProctorId: string; backupProctorId: string };
function RoomEditModal({ assignment, rooms, teachers, busy, onClose, onSave }: { assignment: ExamRoomAssignment; rooms: Room[]; teachers: ApiUser[]; busy: boolean; onClose: () => void; onSave: (form: RoomEditForm) => void }) {
  const [form, setForm] = useState<RoomEditForm>({ roomId: assignment.roomId, primaryProctorId: assignment.primaryProctorId, backupProctorId: assignment.backupProctorId });
  const issues = validateRoomForm(form);
  return <Modal title={`Phòng ${assignment.roomCode}`} onClose={onClose} footer={<><button className="live-btn ghost" onClick={onClose}>Hủy</button><button className="live-btn" disabled={busy || issues.length > 0} onClick={() => onSave(form)}><Save size={15} /> Lưu phân công</button></>}>
    <FormValidationSummary errors={issues} success="Phòng và hai giám thị đã hợp lệ." />
    <Field label="Phòng thi"><select value={form.roomId} onChange={(event) => setForm({ ...form, roomId: event.target.value })}>{rooms.filter((room) => room.active !== false && (room.capacity || 0) >= assignment.students.length).map((room) => <option key={room.id} value={room.id}>{room.code} · {room.capacity} chỗ</option>)}</select></Field>
    <Field label="Giám thị chính"><select value={form.primaryProctorId} onChange={(event) => setForm({ ...form, primaryProctorId: event.target.value })}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} · {teacher.mainSubject}</option>)}</select></Field>
    <Field label="Giám thị dự phòng"><select value={form.backupProctorId} onChange={(event) => setForm({ ...form, backupProctorId: event.target.value })}>{teachers.map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName} · {teacher.mainSubject}</option>)}</select></Field>
  </Modal>;
}

export function PublishedExamSchedule({ path, teacher = false }: { path: string; teacher?: boolean }) {
  const schedule = useApi<import('../../api/types').PublishedExamView[]>(path);
  return <Section title={teacher ? 'Lịch coi thi' : 'Lịch thi'} subtitle={teacher ? 'Các ca được phân công coi thi chính hoặc dự phòng' : 'Ngày thi, môn thi, phòng thi và thời gian'} wide>
    <Async paginate state={schedule} empty={teacher ? 'Chưa có lịch coi thi được phát hành' : 'Chưa có lịch thi được phát hành'} itemLabel={teacher ? 'ca coi thi' : 'ca thi'}>
      {(rows) => <div className="published-exam-list">{rows.map((row, index) => <article key={`${row.periodId}-${row.subjectId}-${row.examDate}-${index}`}>
        <div className="published-exam-date"><strong>{fmtDate(row.examDate)}</strong><span>{row.startTime}–{row.endTime}</span></div>
        <div><small>{row.periodName} · {row.semesterName}</small><strong>{row.subjectName}</strong><span>{gradeLabel(row.gradeLevel)} · {row.durationMinutes} phút</span></div>
        <div><small>Phòng thi</small><strong>{row.roomCode}</strong>{row.seatNo > 0 && <span>Số báo danh {row.seatNo}</span>}</div>
        <div><small>{teacher ? 'Nhiệm vụ' : 'Giám thị'}</small><strong>{teacher ? (row.dutyRole === 'PRIMARY' ? 'Giám thị chính' : 'Giám thị dự phòng') : row.primaryProctorName}</strong><span>{teacher ? row.roomCode : `Dự phòng: ${row.backupProctorName}`}</span></div>
      </article>)}</div>}
    </Async>
  </Section>;
}

function toggleSet(setter: Dispatch<SetStateAction<Set<string>>>, id: string) {
  setter((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
}

function ExamStatusChip({ value }: { value: string }) {
  const normalized = value.toUpperCase();
  const labels: Record<string, string> = {
    DRAFT: 'Bản nháp', PUBLISHED: 'Đã phát hành', RECALLED: 'Đã thu hồi',
    ARCHIVED: 'Đã lưu trữ', CLOSED: 'Đã đóng', CANCELLED: 'Đã hủy',
  };
  return <span className={`exam-status-chip status-${normalized.toLowerCase()}`}>{labels[normalized] || value}</span>;
}

function SourceSyncChip({ status }: { status: ExamSession['sourceSyncStatus'] }) {
  const labels = { CURRENT: 'Nguồn hiện hành', SOURCE_CHANGED: 'Nguồn đã thay đổi', LEGACY: 'Dữ liệu cũ' };
  return <span className={`exam-source-chip status-${status.toLowerCase()}`}>{labels[status]}</span>;
}

function assessmentTypeLabel(value: string) {
  return EXAM_TYPE_LABEL[value] || value;
}

function issueCodeLabel(code: string) {
  const labels: Record<string, string> = {
    MISSING_G3_ASSESSMENT: 'Chưa có ca thi', NO_ROOM: 'Thiếu phòng',
    MISSING_PROCTOR: 'Thiếu giám thị', DUPLICATE_STUDENT: 'Học sinh trùng ca',
    ROOM_OVERLAP: 'Phòng trùng ca', PROCTOR_OVERLAP: 'Giám thị trùng ca',
    PROCTOR_UNAVAILABLE: 'Giám thị bận/nghỉ', ASSESSMENT_WEEK_MISMATCH: 'Lệch tuần kế hoạch',
    ASSESSMENT_WEEK_OVERRIDDEN: 'Đã xác nhận lệch tuần', G3_SOURCE_UPDATED: 'Nguồn GĐ3 đã thay đổi',
    STALE_G3_SOURCE: 'Nguồn GĐ3 không còn hiện hành', NO_VERSION_CHANGES: 'Phiên bản chưa thay đổi',
  };
  return labels[code] || 'Kiểm tra lịch thi';
}

function versionOptionLabel(version: ExamScheduleVersion) {
  const labels: Record<string, string> = {
    DRAFT: 'Bản nháp đang chỉnh sửa', PUBLISHED: 'Bản đang phát hành', RECALLED: 'Bản đã thu hồi',
    ARCHIVED: 'Bản lưu trữ',
  };
  return `${labels[version.status] || 'Phiên bản'} (v${version.versionNo}) — ${fmtDateTime(version.createdAt)}`;
}

function assessmentSourceUrl(
  academicYearId: string, semesterId: string,
  examType: string, gradeLevels: string[],
) {
  const params = new URLSearchParams({ academicYearId, semesterId, examType });
  gradeLevels.forEach((grade) => params.append('gradeLevels', grade));
  return `/exam-periods/assessment-sources?${params.toString()}`;
}

function gradeLabel(grade: string) { return `Khối ${grade.replace(/^K/, '')}`; }
function sortExamSources(sources: ExamAssessmentSource[]) {
  const priorities = ['NGU VAN', 'TOAN', 'TIENG ANH', 'VAT LY', 'HOA HOC', 'SINH HOC', 'LICH SU', 'DIA LY', 'GDKT', 'TIN HOC'];
  const priority = (name: string) => {
    const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const index = priorities.findIndex((value) => normalized.includes(value));
    return index < 0 ? priorities.length : index;
  };
  return [...sources].sort((left, right) => left.weekNumber - right.weekNumber
    || priority(left.subjectName) - priority(right.subjectName)
    || left.subjectName.localeCompare(right.subjectName, 'vi')
    || left.gradeLevel.localeCompare(right.gradeLevel));
}
function message(error: unknown) { return error instanceof Error ? error.message : 'Không thể hoàn thành thao tác.'; }
type FormIssue = { field: string; message: string };
function fieldIssue(issues: FormIssue[], field: string) { return issues.find((item) => item.field === field)?.message; }
function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
function formatLocalDate(value: Date) {
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}
function addDays(value: string, amount: number) {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return formatLocalDate(date);
}
function calendarDatesBetween(start: string, end: string) {
  if (!start || !end || end < start) return [];
  const rows: string[] = [];
  const current = parseLocalDate(start);
  const last = parseLocalDate(end);
  while (current <= last) {
    rows.push(formatLocalDate(current));
    current.setDate(current.getDate() + 1);
  }
  return rows;
}
function holidaysInRange(start: string, end: string, holidays: SchoolHoliday[]) {
  const dates = new Set(calendarDatesBetween(start, end));
  const blocked = new Set<string>();
  holidays.forEach((holiday) => calendarDatesBetween(holiday.date, holiday.endDate || holiday.date)
    .forEach((date) => { if (dates.has(date)) blocked.add(date); }));
  return [...blocked].sort();
}
function availableExamDates(start: string, end: string, holidays: SchoolHoliday[]) {
  const blocked = new Set(holidaysInRange(start, end, holidays));
  return calendarDatesBetween(start, end).filter((value) => {
    const day = parseLocalDate(value).getDay();
    return day >= 1 && day <= 6 && !blocked.has(value);
  });
}
function validateSessionForm(form: SessionEditForm, startDate: string, endDate: string, holidays: SchoolHoliday[], source?: Pick<ExamAssessmentSource, 'plannedStartDate' | 'plannedEndDate'>) {
  const issues: string[] = [];
  if (!form.sourceAssessmentPlanId) issues.push('Chọn kế hoạch kiểm tra nguồn từ GĐ3.');
  if (!form.examDate) issues.push('Chọn ngày thi.');
  if (form.examDate && (form.examDate < startDate || form.examDate > endDate)) issues.push('Ngày thi phải nằm trong đợt thi.');
  if (form.examDate && parseLocalDate(form.examDate).getDay() === 0) issues.push('Không thể xếp thi vào Chủ nhật.');
  if (form.examDate && holidaysInRange(form.examDate, form.examDate, holidays).length > 0) issues.push('Ngày đã chọn là ngày nghỉ của trường.');
  if (form.examDate && source && (form.examDate < source.plannedStartDate || form.examDate > source.plannedEndDate)
    && !form.scheduleDeviationReason.trim()) issues.push('Nhập lý do khi ngày thi nằm ngoài tuần kế hoạch GĐ3.');
  if (!form.startTime) issues.push('Nhập giờ bắt đầu.');
  return issues;
}
function validateRoomForm(form: RoomEditForm) {
  const issues: string[] = [];
  if (!form.roomId) issues.push('Chọn phòng thi.');
  if (!form.primaryProctorId) issues.push('Chọn giám thị chính.');
  if (!form.backupProctorId) issues.push('Chọn giám thị dự phòng.');
  if (form.primaryProctorId && form.primaryProctorId === form.backupProctorId) issues.push('Giám thị chính và dự phòng phải là hai giáo viên khác nhau.');
  return issues;
}
function validateAwayForm(form: { teacherId: string; unavailableDate: string; endDate: string; allDay: boolean; startTime: string; endTime: string; reason: string }, period?: ExamPeriod) {
  const issues: string[] = [];
  if (!form.teacherId) issues.push('Chọn giáo viên.');
  if (!form.unavailableDate) issues.push('Chọn ngày bắt đầu bận/nghỉ.');
  if (!form.endDate) issues.push('Chọn ngày kết thúc bận/nghỉ.');
  if (form.unavailableDate && form.endDate && form.endDate < form.unavailableDate) issues.push('Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.');
  if (period && form.unavailableDate && (form.unavailableDate < period.startDate || form.unavailableDate > period.endDate)) issues.push('Ngày bắt đầu phải nằm trong đợt thi.');
  if (period && form.endDate && (form.endDate < period.startDate || form.endDate > period.endDate)) issues.push('Ngày kết thúc phải nằm trong đợt thi.');
  if (!form.reason.trim()) issues.push('Nhập lý do bận/nghỉ.');
  if (!form.allDay && (!form.startTime || !form.endTime)) issues.push('Nhập đủ giờ bắt đầu và kết thúc.');
  if (!form.allDay && form.startTime && form.endTime && form.endTime <= form.startTime) issues.push('Giờ kết thúc phải sau giờ bắt đầu.');
  return issues;
}

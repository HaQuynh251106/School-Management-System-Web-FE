import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ClipboardCheck, Copy, Download, FileSpreadsheet,
  Pencil, Plus, RotateCcw, Send, Sparkles, Trash2, X,
} from 'lucide-react';
import { useAuth } from '../../api/auth';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicAssessmentPlan, AcademicCurriculumDistribution, AcademicPlanApprovalHistory,
  AcademicPlanDetail, AcademicPlanValidationIssue, AcademicPlanValidationReport,
  AcademicTrainingPlan, AcademicTrainingPlanSubject, AnnualSubjectSummary,
  ApiUser, SchoolClass, Semester, Subject,
} from '../../api/types';
import { StatusPill } from '../../components/ui';
import { useConfirm } from '../../app/ConfirmDialog';
import { Async, PaginatedData } from './common';
import { normalizeResponsibleTeacherIds } from './workflowHelpers';

type Notify = (type: 'ok' | 'err', message: string) => void;
type ValidationFilter = 'ALL' | 'ERROR' | 'WARNING';
type PlanSection = 'overview' | 'curriculum' | 'distribution' | 'assessment' | 'approval';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể hoàn thành thao tác.';
}

const CONTENT_LABELS: Record<string, string> = {
  THEORY: 'Lý thuyết', PRACTICE: 'Thực hành', REVIEW: 'Ôn tập',
  ASSESSMENT: 'Kiểm tra', PROJECT: 'Dự án', EXPERIENCE: 'Trải nghiệm', BUFFER: 'Dự phòng',
};
const ASSESSMENT_LABELS: Record<string, string> = {
  REGULAR: 'Thường xuyên', MIDTERM: 'Giữa kỳ', FINAL: 'Cuối kỳ',
  MAKEUP: 'Kiểm tra bù', PRACTICE: 'Thực hành', PROJECT: 'Dự án',
};
const ASSESSMENT_FORM_LABELS: Record<string, string> = {
  WRITTEN: 'Kiểm tra viết', MULTIPLE_CHOICE: 'Trắc nghiệm', ESSAY: 'Tự luận',
  MIXED: 'Trắc nghiệm kết hợp tự luận', COMPUTER: 'Kiểm tra trên máy tính',
  PRACTICAL: 'Thực hành', PRESENTATION: 'Thuyết trình', PROJECT: 'Dự án',
  PRODUCT: 'Sản phẩm học tập', COMMENT: 'Nhận xét',
};
const RESULT_LABELS: Record<string, string> = {
  SCORE: 'Ghi điểm', COMMENT: 'Nhận xét', BOTH: 'Điểm và nhận xét',
};
const SUBJECT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: 'Bắt buộc', OPTIONAL: 'Lựa chọn', SPECIALIZED: 'Chuyên đề',
  EDUCATIONAL_ACTIVITY: 'Hoạt động giáo dục',
};
const ACTION_LABELS: Record<string, string> = {
  SUBMIT: 'Gửi duyệt', REVIEW: 'Rà soát', REQUEST_REVISION: 'Yêu cầu chỉnh sửa',
  APPROVE: 'Phê duyệt', PUBLISH: 'Công bố', ARCHIVE: 'Lưu trữ',
};
const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp', SUBMITTED: 'Đã gửi duyệt', REVISION_REQUIRED: 'Yêu cầu chỉnh sửa',
  APPROVED: 'Đã phê duyệt', PUBLISHED: 'Đã công bố', ARCHIVED: 'Đã lưu trữ', LOCKED: 'Đã khóa',
};
const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Ban giám hiệu', TEACHER: 'Giáo viên', STUDENT: 'Học sinh', PARENT: 'Phụ huynh',
};
const BLANK_DISTRIBUTION = {
  curriculumItemId: '', weekNumber: 1, contentType: 'THEORY', title: '', periods: 1, notes: '',
};
const blankAssessment = (semesterId = '') => ({
  semesterId, classId: '', subjectId: '', assessmentType: 'MIDTERM',
  name: '', assessmentForm: 'WRITTEN', curriculumItemIds: [] as string[],
  resultMethod: 'SCORE', weekNumber: 8, durationMinutes: 45, teacherIds: [] as string[], notes: '',
});

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}

function weeksBetween(start?: string, end?: string) {
  if (!start || !end) return 1;
  return Math.max(1, Math.min(30, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 604800000) + 1));
}

function issueStep(code: string) {
  if (['PROGRAM', 'SEMESTERS', 'REQUIRED_SUBJECT', 'PERIOD_TOTAL', 'OUTSIDE_PROGRAM', 'CLASS_COMBINATION', 'TEACHER_ASSIGNMENT', 'WEEKLY_RATE'].includes(code)) return 1;
  if (['STAGE_PERIODS', 'LESSON_PERIODS', 'BUFFER_WEEK'].includes(code)) return 2;
  if (code === 'WEEKLY_DISTRIBUTION') return 3;
  if (code.startsWith('ASSESSMENT')) return 4;
  return 5;
}

export function EducationPlanCompletionPanel({ plan, planSubjects, semesters, subjects,
  classes, teachers, section, notify, onChanged, onNavigate }: {
  plan: AcademicTrainingPlan; planSubjects: AcademicTrainingPlanSubject[];
  semesters: Semester[]; subjects: Subject[]; classes: SchoolClass[]; teachers: ApiUser[];
  section: 'overview' | 'distribution' | 'assessment' | 'approval';
  notify: Notify; onChanged: () => void; onNavigate?: (section: PlanSection) => void;
}) {
  const { user } = useAuth();
  const confirmAction = useConfirm();
  const permissions = new Set(user?.permissions || []);
  const admin = user?.role === 'ADMIN';
  const canInitialize = admin || permissions.has('ACADEMIC_PLAN_MANAGE');
  const canManage = canInitialize || permissions.has('ACADEMIC_PLAN_CONTENT_MANAGE');
  const canSubmit = admin || permissions.has('ACADEMIC_PLAN_SUBMIT');
  const canReview = admin || permissions.has('ACADEMIC_PLAN_REVIEW');
  const canApprove = admin || permissions.has('ACADEMIC_PLAN_APPROVE');
  const editable = ['DRAFT', 'REVISION_REQUIRED'].includes(plan.status);
  const summaries = useApi<AnnualSubjectSummary[]>(`/academic/training-plans/${plan.id}/annual-summary`);
  const validation = useApi<AcademicPlanValidationReport>(`/academic/training-plans/${plan.id}/validation`);
  const assessments = useApi<AcademicAssessmentPlan[]>(`/academic/training-plans/${plan.id}/assessments`);
  const history = useApi<AcademicPlanApprovalHistory[]>(`/academic/training-plans/${plan.id}/approval-history`);
  const planDetail = useApi<AcademicPlanDetail>(`/academic/training-plans/${plan.id}/details`);
  const currentPlanSubjects = useMemo(() => planSubjects.filter((item) => item.planId === plan.id), [plan.id, planSubjects]);
  const [planSubjectId, setPlanSubjectId] = useState('');
  const [distributionForm, setDistributionForm] = useState({ ...BLANK_DISTRIBUTION });
  const [editingDistributionId, setEditingDistributionId] = useState('');
  const [distributionWeekFilter, setDistributionWeekFilter] = useState(0);
  const [distributionTypeFilter, setDistributionTypeFilter] = useState('');
  const distributionFilter = { semesterId: planSubjectId, subjectId: distributionWeekFilter, contentType: distributionTypeFilter };
  const [assessmentForm, setAssessmentForm] = useState(blankAssessment(semesters[0]?.id));
  const [assessmentTeacherSearch, setAssessmentTeacherSearch] = useState('');
  const [editingAssessmentId, setEditingAssessmentId] = useState('');
  const [workflowComment, setWorkflowComment] = useState('Đã kiểm tra đầy đủ nội dung kế hoạch.');
  const [validationFilter, setValidationFilter] = useState<ValidationFilter>('ALL');
  const distributionEditorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!currentPlanSubjects.some((item) => item.id === planSubjectId)) setPlanSubjectId(currentPlanSubjects[0]?.id || '');
  }, [currentPlanSubjects, planSubjectId]);
  useEffect(() => {
    if (!assessmentForm.semesterId && semesters[0]) setAssessmentForm(blankAssessment(semesters[0].id));
  }, [assessmentForm.semesterId, semesters]);
  useEffect(() => {
    setDistributionForm({ ...BLANK_DISTRIBUTION });
    setEditingDistributionId('');
  }, [planSubjectId]);

  const distributions = useApi<AcademicCurriculumDistribution[]>(planSubjectId
    ? `/academic/training-plans/${plan.id}/subjects/${planSubjectId}/distributions` : null);
  const selectedPlanSubject = currentPlanSubjects.find((item) => item.id === planSubjectId);
  const selectedPlanSubjectDetail = planDetail.data?.subjects.find((item) => item.subject.id === planSubjectId);
  const lessonOptions = selectedPlanSubjectDetail?.curriculum.filter((item) => item.itemType === 'LESSON') || [];
  const allCurriculum = planDetail.data?.subjects.flatMap((row) => row.curriculum) || [];
  const assessmentSubjects = currentPlanSubjects.filter((item) => item.semesterId === assessmentForm.semesterId);
  const assessmentPlanSubject = assessmentSubjects.find((item) => item.subjectId === assessmentForm.subjectId);
  const assessmentLessons = planDetail.data?.subjects.find((row) => row.subject.id === assessmentPlanSubject?.id)
    ?.curriculum.filter((item) => ['TOPIC', 'LESSON'].includes(item.itemType)) || [];
  const scopedClasses = classes.filter((item) => item.academicYearId === plan.academicYearId && item.gradeLevel === plan.gradeLevel);
  const assessmentTeachers = teachers.filter((item) => item.role === 'TEACHER' && item.status === 'ACTIVE'
    && (!assessmentTeacherSearch.trim()
      || `${item.teacherCode || ''} ${item.fullName} ${item.mainSubject || ''}`.toLocaleLowerCase('vi')
        .includes(assessmentTeacherSearch.trim().toLocaleLowerCase('vi'))));
  const allowedWeeks = Array.from({ length: weeksBetween(assessmentPlanSubject?.startDate, assessmentPlanSubject?.endDate) }, (_, index) => index + 1);
  const filteredDistributions = (distributions.data || []).filter((item) =>
    (!distributionWeekFilter || item.weekNumber === distributionWeekFilter)
    && (!distributionTypeFilter || item.contentType === distributionTypeFilter));

  const refresh = () => {
    summaries.reload(); validation.reload(); assessments.reload(); history.reload();
    distributions.reload(); planDetail.reload(); onChanged();
  };

  const saveDistribution = async () => {
    if (!planSubjectId) return notify('err', 'Hãy chọn môn học cần phân phối.');
    if (!distributionForm.title.trim()) return notify('err', 'Hãy nhập tên nội dung của tuần học.');
    try {
      if (editingDistributionId) await api.put(`/academic/training-plans/${plan.id}/distributions/${editingDistributionId}`, distributionForm);
      else await api.post(`/academic/training-plans/${plan.id}/subjects/${planSubjectId}/distributions`, distributionForm);
      const wasEditing = !!editingDistributionId;
      setDistributionForm({ ...BLANK_DISTRIBUTION }); setEditingDistributionId(''); refresh();
      notify('ok', wasEditing ? 'Đã cập nhật nội dung phân phối.' : 'Đã thêm nội dung phân phối theo tuần.');
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const editDistribution = (item: AcademicCurriculumDistribution, nextWeek = item.weekNumber) => {
    setEditingDistributionId(nextWeek === item.weekNumber ? item.id : '');
    setDistributionForm({ curriculumItemId: item.curriculumItemId || '', weekNumber: nextWeek,
      contentType: item.contentType, title: item.title, periods: item.periods, notes: item.notes || '' });
    requestAnimationFrame(() => distributionEditorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const deleteDistribution = async (id: string) => {
    if (!(await confirmAction({ title: 'Xóa nội dung phân phối', message: 'Nội dung đã chọn sẽ bị xóa khỏi bản nháp kế hoạch.', confirmLabel: 'Xóa nội dung', tone: 'danger' }))) return;
    try { await api.del(`/academic/training-plans/${plan.id}/distributions/${id}`); refresh(); notify('ok', 'Đã xóa nội dung phân phối.'); }
    catch (error) { notify('err', errorMessage(error)); }
  };

  const saveAssessment = async () => {
    if (!assessmentForm.semesterId || !assessmentForm.subjectId || !assessmentForm.name.trim()) {
      return notify('err', 'Nhập đủ học kỳ, môn học và tên bài đánh giá.');
    }
    try {
      const teacherIds = normalizeResponsibleTeacherIds(assessmentForm.teacherIds);
      const payload = {
        ...assessmentForm,
        classId: assessmentForm.classId || null,
        teacherIds,
        teacherId: teacherIds[0] || null,
      };
      if (editingAssessmentId) await api.put(`/academic/training-plans/${plan.id}/assessments/${editingAssessmentId}`, payload);
      else await api.post(`/academic/training-plans/${plan.id}/assessments`, payload);
      const wasEditing = !!editingAssessmentId;
      setAssessmentForm(blankAssessment(assessmentForm.semesterId)); setEditingAssessmentId(''); refresh();
      notify('ok', wasEditing ? 'Đã cập nhật kế hoạch đánh giá.' : 'Đã thêm kế hoạch đánh giá và đồng bộ tuần kiểm tra.');
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const editAssessment = (item: AcademicAssessmentPlan, duplicate = false) => {
    setEditingAssessmentId(duplicate ? '' : item.id);
    setAssessmentForm({ semesterId: item.semesterId, classId: item.classId || '', subjectId: item.subjectId,
      assessmentType: item.assessmentType, name: duplicate ? `${item.name} (bản sao)` : item.name,
      assessmentForm: item.assessmentForm || 'WRITTEN',
      curriculumItemIds: item.curriculumItemIds?.split(',').filter(Boolean) || [],
      resultMethod: item.resultMethod || 'SCORE', weekNumber: item.weekNumber,
      durationMinutes: item.durationMinutes,
      teacherIds: normalizeResponsibleTeacherIds(item.teacherIds, item.teacherId),
      notes: item.notes || '' });
  };
  const deleteAssessment = async (id: string) => {
    if (!(await confirmAction({ title: 'Xóa kế hoạch đánh giá', message: 'Kế hoạch đánh giá và tuần kiểm tra tự động liên quan sẽ được cập nhật.', confirmLabel: 'Xóa kế hoạch', tone: 'danger' }))) return;
    try { await api.del(`/academic/training-plans/${plan.id}/assessments/${id}`); refresh(); notify('ok', 'Đã xóa kế hoạch đánh giá.'); }
    catch (error) { notify('err', errorMessage(error)); }
  };

  const workflow = async (action: string, success: string) => {
    if (!workflowComment.trim()) return notify('err', 'Nhập nhận xét hoặc lý do thực hiện.');
    try { await api.post(`/academic/training-plans/${plan.id}/${action}`, { comment: workflowComment }); refresh(); notify('ok', success); }
    catch (error) { notify('err', errorMessage(error)); }
  };
  const publish = async () => {
    if (!validation.data?.valid) return notify('err', 'Kế hoạch còn lỗi bắt buộc và chưa thể công bố.');
    try { await api.post(`/academic/training-plans/${plan.id}/publish`); refresh(); notify('ok', 'Đã công bố kế hoạch cho giáo viên, học sinh và phụ huynh.'); }
    catch (error) { notify('err', errorMessage(error)); }
  };
  const initializeFromProgram = async () => {
    if (!(await confirmAction({ title: 'Đồng bộ từ chương trình', message: 'Môn học và số tiết sẽ được đồng bộ từ chương trình đang áp dụng. Dữ liệu nội dung đã nhập vẫn được giữ nguyên.', confirmLabel: 'Đồng bộ', tone: 'warning' }))) return;
    try {
      const result = await api.post<{ subjectRowsCreated: number; subjectRowsUpdated: number; distributionsCreated: number; assessmentsCreated: number }>(`/academic/training-plans/${plan.id}/initialize-from-program`);
      refresh();
      notify('ok', `Đã thêm ${result.subjectRowsCreated}, cập nhật ${result.subjectRowsUpdated} dòng môn; tạo ${result.distributionsCreated} phân phối và ${result.assessmentsCreated} kế hoạch đánh giá.`);
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const download = async (format: 'xlsx' | 'pdf') => {
    try {
      const result = await api.download(`/academic/training-plans/${plan.id}/export.${format}`);
      const url = URL.createObjectURL(result.blob); const link = document.createElement('a');
      link.href = url; link.download = result.filename || `education-plan.${format}`; link.click(); URL.revokeObjectURL(url);
      notify('ok', `Đã xuất báo cáo ${format.toUpperCase()}.`);
    } catch (error) { notify('err', errorMessage(error)); }
  };

  const assessmentCoverage = currentPlanSubjects.filter((row) => row.examRequired).map((row) => {
    const items = (assessments.data || []).filter((item) => item.semesterId === row.semesterId && item.subjectId === row.subjectId);
    return { row, regular: items.filter((item) => item.assessmentType === 'REGULAR').length,
      midterm: items.some((item) => item.assessmentType === 'MIDTERM'), final: items.some((item) => item.assessmentType === 'FINAL') };
  });
  const groupedIssues = useMemo(() => {
    const filtered = (validation.data?.issues || []).filter((item) => validationFilter === 'ALL' || item.level === validationFilter);
    return Object.entries(filtered.reduce<Record<string, AcademicPlanValidationIssue[]>>((groups, item) => {
      const key = `${item.level}|${item.code}`; (groups[key] ||= []).push(item); return groups;
    }, {}));
  }, [validation.data?.issues, validationFilter]);
  const sectionForIssue = (code: string): PlanSection => {
    const step = issueStep(code);
    return (['overview', 'overview', 'curriculum', 'distribution', 'assessment', 'approval'] as PlanSection[])[step];
  };

  return <div className="planning-completion">
    {section === 'overview' && <>
      <div className="planning-section-heading"><div><h3>Tổng hợp số tiết cả năm</h3><p>HK1 + HK2 phải khớp cấu hình chương trình giáo dục</p></div><div className="live-toolbar">{editable && canInitialize && <button className="live-btn secondary" onClick={initializeFromProgram}><Sparkles size={15} /> Đồng bộ từ chương trình</button>}<button className="live-btn ghost" onClick={() => download('xlsx')}><FileSpreadsheet size={15} /> Excel</button><button className="live-btn ghost" onClick={() => download('pdf')}><Download size={15} /> PDF</button></div></div>
      {!editable && <div className="academic-readiness"><AlertTriangle size={17} /><span>Phiên bản này chỉ đọc. Hãy tạo phiên bản điều chỉnh để cập nhật theo chương trình mới.</span></div>}
      <Async paginate state={summaries} allowEmpty empty="Chưa có môn trong kế hoạch" itemLabel="môn tổng hợp">{(items) => <table className="live-table"><thead><tr><th>Môn</th><th>Loại</th><th>HK1</th><th>HK2</th><th>Cả năm</th><th>Chuẩn</th><th>Kết quả</th></tr></thead><tbody>{items.map((item) => <tr key={item.subjectId}><td><strong>{item.subjectName}</strong></td><td>{SUBJECT_TYPE_LABELS[item.subjectType] || item.subjectType}</td><td>{item.semester1Periods}</td><td>{item.semester2Periods}</td><td>{item.annualPeriods}</td><td>{item.configuredAnnualPeriods}</td><td><span className={`semantic-chip ${item.periodsMatch ? 'success' : 'danger'}`}>{item.periodsMatch ? 'Đã khớp' : 'Lệch số tiết'}</span></td></tr>)}</tbody></table>}</Async>
    </>}

    {section === 'distribution' && <>
      <div className="planning-section-heading"><div><h3>Phân phối chương trình theo tuần</h3><p>Một tuần có thể có nhiều nội dung; liên kết bài học là thông tin không bắt buộc</p></div></div>
      <div className="live-toolbar academic-filter-bar"><label className="field-stack grow"><span>Môn học và học kỳ</span><select className="live-select" value={planSubjectId} onChange={(e) => setPlanSubjectId(e.target.value)}>{currentPlanSubjects.map((row) => <option key={row.id} value={row.id}>{semesters.find((item) => item.id === row.semesterId)?.code} · {subjects.find((item) => item.id === row.subjectId)?.name}</option>)}</select></label><label className="field-stack"><span>Lọc tuần</span><select className="live-select" value={distributionWeekFilter} onChange={(e) => setDistributionWeekFilter(Number(e.target.value))}><option value={0}>Tất cả</option>{Array.from({ length: weeksBetween(selectedPlanSubject?.startDate, selectedPlanSubject?.endDate) }, (_, index) => <option key={index + 1} value={index + 1}>Tuần {index + 1}</option>)}</select></label><label className="field-stack"><span>Loại nội dung</span><select className="live-select" value={distributionTypeFilter} onChange={(e) => setDistributionTypeFilter(e.target.value)}><option value="">Tất cả</option>{Object.entries(CONTENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span className="semantic-chip info">Đã phân phối {(distributions.data || []).reduce((sum, item) => sum + item.periods, 0)}/{selectedPlanSubject?.totalPeriods || 0} tiết</span></div>
      {editable && canManage && <div ref={distributionEditorRef} className="planning-editor labeled-form-grid"><label className="field-stack"><span>Tuần học</span><input className="live-input" type="number" min={1} max={30} value={distributionForm.weekNumber} onChange={(e) => setDistributionForm({ ...distributionForm, weekNumber: Number(e.target.value) })} /></label><label className="field-stack grow"><span>Bài học liên kết (không bắt buộc)</span><select className="live-select" value={distributionForm.curriculumItemId} onChange={(e) => { const lesson = lessonOptions.find((item) => item.id === e.target.value); setDistributionForm({ ...distributionForm, curriculumItemId: e.target.value, title: lesson?.title || distributionForm.title }); }}><option value="">Không liên kết bài học</option>{lessonOptions.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title} · {item.plannedPeriods} tiết</option>)}</select></label><label className="field-stack"><span>Loại nội dung</span><select className="live-select" value={distributionForm.contentType} onChange={(e) => setDistributionForm({ ...distributionForm, contentType: e.target.value })}>{Object.entries(CONTENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-stack grow"><span>Nội dung</span><input className="live-input" value={distributionForm.title} onChange={(e) => setDistributionForm({ ...distributionForm, title: e.target.value })} /></label><label className="field-stack"><span>Số tiết</span><input className="live-input" type="number" min={1} max={20} value={distributionForm.periods} onChange={(e) => setDistributionForm({ ...distributionForm, periods: Number(e.target.value) })} /></label><label className="field-stack grow"><span>Ghi chú</span><input className="live-input" value={distributionForm.notes} onChange={(e) => setDistributionForm({ ...distributionForm, notes: e.target.value })} /></label><div className="live-toolbar form-actions"><button className="live-btn" onClick={saveDistribution}>{editingDistributionId ? <Pencil size={15} /> : <Plus size={15} />} {editingDistributionId ? 'Lưu chỉnh sửa' : 'Thêm nội dung'}</button>{editingDistributionId && <button className="live-btn ghost" onClick={() => { setEditingDistributionId(''); setDistributionForm({ ...BLANK_DISTRIBUTION }); }}><X size={15} /> Hủy sửa</button>}</div></div>}
      <Async state={distributions} allowEmpty empty="Chưa có nội dung phân phối. Chọn “Thêm nội dung” để bắt đầu.">{() => <PaginatedData items={filteredDistributions} itemLabel="nội dung phân phối" resetKey={`${distributionFilter.semesterId}|${distributionFilter.subjectId}|${distributionFilter.contentType}`}>{(pageItems) => <table className="live-table"><thead><tr><th>Tuần</th><th>Loại</th><th>Bài học liên kết</th><th>Nội dung</th><th>Số tiết</th><th>Ghi chú</th><th /></tr></thead><tbody>{pageItems.map((item) => <tr key={item.id}><td><strong>Tuần {item.weekNumber}</strong><small>{(distributions.data || []).filter((row) => row.weekNumber === item.weekNumber).reduce((sum, row) => sum + row.periods, 0)} tiết trong tuần</small></td><td>{CONTENT_LABELS[item.contentType] || item.contentType}</td><td>{allCurriculum.find((lesson) => lesson.id === item.curriculumItemId)?.title || 'Không liên kết'}</td><td>{item.title}</td><td>{item.periods}</td><td>{item.notes || '—'}</td><td>{editable && canManage && <div className="table-row-actions"><button className="icon-action" title="Sửa toàn bộ nội dung" onClick={() => editDistribution(item)}><Pencil size={15} /></button><button className="icon-action" title="Sao chép sang tuần kế tiếp" onClick={() => editDistribution(item, Math.min(30, item.weekNumber + 1))}><Copy size={15} /></button><button className="icon-action danger" title="Xóa" onClick={() => deleteDistribution(item.id)}><Trash2 size={15} /></button></div>}</td></tr>)}</tbody></table>}</PaginatedData>}</Async>
    </>}

    {section === 'assessment' && <>
      <div className="planning-section-heading"><div><h3>Kế hoạch kiểm tra và đánh giá</h3><p>Chỉ lập theo tuần dự kiến. Phòng thi, giám thị và quản lý điểm không thuộc phạm vi chức năng này.</p></div></div>
      <div className="assessment-coverage"><strong>Mức độ đầy đủ</strong><span>Tổng {assessmentCoverage.length} môn/học kỳ</span><span>Đủ giữa kỳ và cuối kỳ: {assessmentCoverage.filter((item) => !item.row.examRequired || (item.midterm && item.final)).length}</span><span>Còn thiếu: {assessmentCoverage.filter((item) => item.row.examRequired && (!item.midterm || !item.final)).length}</span></div>
      {editable && canManage && <div className="planning-editor labeled-form-grid assessment-form"><label className="field-stack"><span>Học kỳ</span><select className="live-select" value={assessmentForm.semesterId} onChange={(e) => setAssessmentForm(blankAssessment(e.target.value))}>{semesters.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-stack grow"><span>Môn học</span><select className="live-select" value={assessmentForm.subjectId} onChange={(e) => setAssessmentForm({ ...assessmentForm, subjectId: e.target.value, curriculumItemIds: [], teacherIds: [] })}><option value="">Chọn môn</option>{assessmentSubjects.map((row) => <option key={row.id} value={row.subjectId}>{subjects.find((item) => item.id === row.subjectId)?.name}</option>)}</select></label><label className="field-stack"><span>Loại đánh giá</span><select className="live-select" value={assessmentForm.assessmentType} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessmentType: e.target.value })}>{Object.entries(ASSESSMENT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-stack grow"><span>Tên bài đánh giá</span><input className="live-input" value={assessmentForm.name} onChange={(e) => setAssessmentForm({ ...assessmentForm, name: e.target.value })} /></label><label className="field-stack grow"><span>Hình thức đánh giá</span><select className="live-select" value={assessmentForm.assessmentForm} onChange={(e) => setAssessmentForm({ ...assessmentForm, assessmentForm: e.target.value })}>{Object.entries(ASSESSMENT_FORM_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-stack"><span>Tuần dự kiến</span><select className="live-select" value={assessmentForm.weekNumber} onChange={(e) => setAssessmentForm({ ...assessmentForm, weekNumber: Number(e.target.value) })}>{allowedWeeks.map((week) => <option key={week} value={week}>Tuần {week}</option>)}</select></label><label className="field-stack"><span>Thời lượng (phút)</span><input className="live-input" type="number" min={15} max={300} value={assessmentForm.durationMinutes} onChange={(e) => setAssessmentForm({ ...assessmentForm, durationMinutes: Number(e.target.value) })} /></label><label className="field-stack"><span>Phạm vi áp dụng</span><select className="live-select" value={assessmentForm.classId} onChange={(e) => setAssessmentForm({ ...assessmentForm, classId: e.target.value })}><option value="">Toàn khối</option>{scopedClasses.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select></label><label className="field-stack"><span>Ghi nhận kết quả</span><select className="live-select" value={assessmentForm.resultMethod} onChange={(e) => setAssessmentForm({ ...assessmentForm, resultMethod: e.target.value })}>{Object.entries(RESULT_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="field-stack grow"><span>Ghi chú</span><input className="live-input" value={assessmentForm.notes} onChange={(e) => setAssessmentForm({ ...assessmentForm, notes: e.target.value })} /></label><fieldset className="assessment-teacher-picker"><legend>Người phụ trách</legend><input className="live-input" placeholder="Tìm theo mã, tên hoặc chuyên môn" value={assessmentTeacherSearch} onChange={(e) => setAssessmentTeacherSearch(e.target.value)} /><small>Chọn một hoặc nhiều giáo viên đúng chuyên môn. Nếu để trống, tổ chuyên môn phụ trách.</small><div>{assessmentTeachers.map((item) => { const checked = assessmentForm.teacherIds.includes(item.id); return <label key={item.id} className={checked ? 'selected' : ''}><input type="checkbox" checked={checked} onChange={(e) => setAssessmentForm({ ...assessmentForm, teacherIds: e.target.checked ? [...assessmentForm.teacherIds, item.id] : assessmentForm.teacherIds.filter((id) => id !== item.id) })} /><span><strong>{item.teacherCode || 'GV'}</strong> · {item.fullName}<small>{item.mainSubject || 'Chuyên môn đã cấu hình'}</small></span></label>; })}</div></fieldset><fieldset className="assessment-content-picker"><legend>Chủ đề hoặc bài học được đánh giá</legend>{assessmentLessons.length ? assessmentLessons.map((item) => <label key={item.id} className={assessmentForm.curriculumItemIds.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={assessmentForm.curriculumItemIds.includes(item.id)} onChange={(e) => setAssessmentForm({ ...assessmentForm, curriculumItemIds: e.target.checked ? [...assessmentForm.curriculumItemIds, item.id] : assessmentForm.curriculumItemIds.filter((id) => id !== item.id) })} /> {item.code} · {item.title}</label>) : <span>Chọn môn đã khai báo nội dung ở bước 2.</span>}</fieldset><div className="live-toolbar form-actions"><button className="live-btn" onClick={saveAssessment}>{editingAssessmentId ? <Pencil size={15} /> : <Plus size={15} />} {editingAssessmentId ? 'Lưu chỉnh sửa' : 'Thêm kế hoạch'}</button>{editingAssessmentId && <button className="live-btn ghost" onClick={() => { setEditingAssessmentId(''); setAssessmentForm(blankAssessment(assessmentForm.semesterId)); }}><X size={15} /> Hủy sửa</button>}</div></div>}
      <Async paginate state={assessments} allowEmpty empty="Chưa có kế hoạch đánh giá. Chọn “Thêm kế hoạch” để bắt đầu." itemLabel="kế hoạch đánh giá">{(items) => <table className="live-table"><thead><tr><th>Học kỳ</th><th>Môn và bài đánh giá</th><th>Phạm vi</th><th>Loại/Hình thức</th><th>Tuần</th><th>Thời lượng</th><th>Người phụ trách</th><th /></tr></thead><tbody>{items.map((item) => { const responsibleIds = item.teacherIds?.length ? item.teacherIds : item.teacherId ? [item.teacherId] : []; return <tr key={item.id}><td>{semesters.find((row) => row.id === item.semesterId)?.code}</td><td><strong>{subjects.find((row) => row.id === item.subjectId)?.name}</strong><small>{item.name}</small></td><td>{item.classId ? classes.find((row) => row.id === item.classId)?.code : 'Toàn khối'}</td><td>{ASSESSMENT_LABELS[item.assessmentType]}<small>{ASSESSMENT_FORM_LABELS[item.assessmentForm] || item.assessmentForm}</small></td><td>Tuần {item.weekNumber}</td><td>{item.durationMinutes} phút</td><td>{responsibleIds.length ? responsibleIds.map((id) => teachers.find((teacher) => teacher.id === id)?.fullName || id).join(', ') : 'Tổ chuyên môn'}</td><td>{editable && canManage && <div className="table-row-actions"><button className="icon-action" title="Chỉnh sửa" onClick={() => editAssessment(item)}><Pencil size={15} /></button><button className="icon-action" title="Nhân bản" onClick={() => editAssessment(item, true)}><Copy size={15} /></button><button className="icon-action danger" title="Xóa" onClick={() => deleteAssessment(item.id)}><Trash2 size={15} /></button></div>}</td></tr>; })}</tbody></table>}</Async>
    </>}

    {section === 'approval' && <>
      <div className="planning-section-heading"><div><h3>Kiểm tra và công bố</h3><p>{admin ? 'Admin là cấp quản trị cao nhất: kế hoạch hợp lệ được công bố trực tiếp, không cần gửi vòng duyệt nội bộ.' : 'Lỗi bắt buộc phải được xử lý trước khi gửi duyệt hoặc công bố.'}</p></div><StatusPill value={plan.status} /></div>
      <Async state={validation}>{(report) => <div className={`planning-validation ${report.valid ? 'success' : 'danger'}`}><div className="planning-validation-summary">{report.valid ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}<strong>{report.valid ? (admin ? 'Đủ điều kiện công bố' : 'Đủ điều kiện gửi duyệt') : `${report.errorCount} lỗi bắt buộc`}</strong><span>{report.warningCount} cảnh báo</span></div><div className="validation-filters"><button className={validationFilter === 'ALL' ? 'active' : ''} onClick={() => setValidationFilter('ALL')}>Tất cả ({report.issues.length})</button><button className={validationFilter === 'ERROR' ? 'active' : ''} onClick={() => setValidationFilter('ERROR')}>Lỗi ({report.errorCount})</button><button className={validationFilter === 'WARNING' ? 'active' : ''} onClick={() => setValidationFilter('WARNING')}>Cảnh báo ({report.warningCount})</button></div>{groupedIssues.length > 0 && <PaginatedData items={groupedIssues} itemLabel="nhóm lỗi và cảnh báo" pageSize={5} resetKey={validationFilter}>{(pageGroups) => <div className="planning-issue-groups">{pageGroups.map(([key, items]) => <details key={key} open={items[0].level === 'ERROR'}><summary className={items[0].level === 'ERROR' ? 'error' : 'warning'}><strong>{items[0].level === 'ERROR' ? 'Lỗi bắt buộc' : 'Cảnh báo'}</strong><span>Bước {issueStep(items[0].code)} · {items[0].code}</span><b>{items.length}</b></summary><div>{items.map((issue, index) => <p key={`${issue.referenceId}-${index}`}>{issue.message}</p>)}{onNavigate && <button className="live-btn small ghost" onClick={() => onNavigate(sectionForIssue(items[0].code))}>Đi tới bước {issueStep(items[0].code)} để xử lý</button>}</div></details>)}</div>}</PaginatedData>}</div>}</Async>
      <div className="planning-workflow">{!admin && <label className="field-stack grow"><span>Nhận xét hoặc lý do xử lý</span><textarea className="live-input" rows={2} value={workflowComment} onChange={(e) => setWorkflowComment(e.target.value)} /></label>}<div className="live-toolbar">{admin && ['DRAFT', 'REVISION_REQUIRED', 'SUBMITTED', 'APPROVED'].includes(plan.status) && <button className="live-btn" disabled={!validation.data?.valid} onClick={publish}><Send size={15} /> Kiểm tra và công bố</button>}{!admin && editable && canSubmit && <button className="live-btn" disabled={!validation.data?.valid} onClick={() => workflow('submit', 'Đã gửi kế hoạch để rà soát.')}><Send size={15} /> Gửi duyệt</button>}{!admin && plan.status === 'SUBMITTED' && canReview && !plan.reviewedAt && <button className="live-btn secondary" onClick={() => workflow('review', 'Đã hoàn thành bước rà soát.')}><ClipboardCheck size={15} /> Xác nhận rà soát</button>}{!admin && plan.status === 'SUBMITTED' && canReview && <button className="live-btn ghost" onClick={() => workflow('request-revision', 'Đã trả kế hoạch để chỉnh sửa.')}><RotateCcw size={15} /> Yêu cầu chỉnh sửa</button>}{!admin && plan.status === 'SUBMITTED' && canApprove && plan.reviewedAt && <button className="live-btn" disabled={!validation.data?.valid} onClick={() => workflow('approve', 'Đã phê duyệt kế hoạch.')}><CheckCircle2 size={15} /> Phê duyệt</button>}{!admin && plan.status === 'APPROVED' && canApprove && <button className="live-btn" disabled={!validation.data?.valid} onClick={publish}><Send size={15} /> Công bố</button>}{plan.status === 'PUBLISHED' && canApprove && <button className="live-btn ghost" onClick={() => workflow('archive', 'Đã lưu trữ phiên bản kế hoạch.')}><CheckCircle2 size={15} /> Lưu trữ</button>}</div></div>
      <details className="planning-disclosure"><summary>Lịch sử phê duyệt ({history.data?.length || 0})</summary><Async paginate state={history} allowEmpty empty="Chưa có lịch sử phê duyệt" itemLabel="lượt phê duyệt">{(items) => <table className="live-table"><thead><tr><th>Thời gian</th><th>Hành động</th><th>Trạng thái</th><th>Người thực hiện</th><th>Nhận xét</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{formatDateTime(item.createdAt)}</td><td>{ACTION_LABELS[item.action] || item.action}</td><td>{item.fromStatus ? STATUS_LABELS[item.fromStatus] : '—'} → {STATUS_LABELS[item.toStatus] || item.toStatus}</td><td><strong>{item.actorName || teachers.find((teacher) => teacher.id === item.actorId)?.fullName || item.actorId}</strong><small>{ROLE_LABELS[item.actorRole || ''] || item.actorRole || 'Người xử lý'}</small></td><td>{item.comment || '—'}</td></tr>)}</tbody></table>}</Async></details>
    </>}
  </div>;
}

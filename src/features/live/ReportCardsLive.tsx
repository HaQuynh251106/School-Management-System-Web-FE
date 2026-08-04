import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, Archive, ArrowLeft, BookOpenCheck, CheckCircle2, ChevronRight,
  ClipboardCheck, Clock3, Download, FileCheck2, FileText, GraduationCap, History,
  Layers3, LockKeyhole, School, Search, Send, ShieldCheck, Sparkles, Unlock, UserCheck, Users,
} from 'lucide-react';
import { api } from '../../api/client';
import { AcademicScopeOptions } from '../../components/AcademicScopeOptions';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import { useHashNumber, useHashString } from '../../api/urlState';
import type {
  AcademicYear, ApiUser, Cohort, ConductRuleSet, PageResponse, ReportCardClassSummary, ReportCardListItem,
  ReportCardScopeOverview, ReportCardStatus, ReportCardView, SchoolClass, Semester,
} from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, fmtDateTime, ServerPagination, useToast } from './common';
import { canOpenReportCardRevision, REPORT_CARD_STATUSES } from './reportCardWorkflow';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Nháp', HOMEROOM_SUBMITTED: 'GVCN đã gửi', APPROVED: 'Đã duyệt',
  LOCKED: 'Đã khóa', PUBLISHED: 'Đã phát hành',
};
const CONDUCT_LABEL: Record<string, string> = { GOOD: 'Tốt', FAIR: 'Khá', AVERAGE: 'Trung bình', WEAK: 'Yếu' };
const PROMOTION_LABEL: Record<string, string> = {
  READY: 'Đủ điều kiện tổng kết', PROMOTED: 'Được lên lớp', PROMOTED_PENDING_CLASS: 'Lên lớp, chờ xếp lớp',
  RETAINED: 'Ở lại lớp', RETAINED_PENDING_CLASS: 'Ở lại lớp, chờ xếp lớp', GRADUATED: 'Tốt nghiệp', INCOMPLETE: 'Chưa hoàn thiện',
};
const CONDUCT_OPTIONS = [['GOOD', 'Tốt'], ['FAIR', 'Khá'], ['AVERAGE', 'Trung bình'], ['WEAK', 'Yếu']];

function score(value?: number | null) { return value == null ? '—' : value.toFixed(2); }
function statusTone(status: string): 'blue' | 'green' | 'orange' | 'red' | 'violet' {
  return status === 'PUBLISHED' ? 'green' : status === 'LOCKED' ? 'blue' : status === 'APPROVED' ? 'violet' : status === 'HOMEROOM_SUBMITTED' ? 'orange' : 'blue';
}
function yearStart(year: AcademicYear) { return Number(year.code.match(/\d{4}/)?.[0] || 0); }
function yearBelongsToCohort(year: AcademicYear, cohort?: Cohort) {
  if (!cohort) return true;
  const start = yearStart(year);
  return start >= cohort.entryYear && start < cohort.graduationYear;
}
function yearState(year: AcademicYear) {
  return year.status === 'CLOSED' ? 'Đã đóng' : year.status === 'ACTIVE' ? 'Đang hoạt động' : 'Sắp diễn ra';
}

function useReportCardYears() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const options = useMemo(() => (years.data || []).slice().sort((a, b) => b.code.localeCompare(a.code)), [years.data]);
  const [yearId, setYearId] = useHashString('nam-hoc', '');
  useEffect(() => {
    if (options.length && !options.some((item) => item.id === yearId)) {
      setYearId(options.find((item) => item.status === 'ACTIVE')?.id || options[0].id);
    }
  }, [options, setYearId, yearId]);
  return { years, options, yearId, setYearId, selectedYear: options.find((item) => item.id === yearId) };
}

function ReportCardStatusBadge({ status }: { status: string }) {
  return <Badge tone={statusTone(status)}>{STATUS_LABEL[status] || status}</Badge>;
}

function WorkflowSteps({ status }: { status: ReportCardStatus }) {
  const current = REPORT_CARD_STATUSES.indexOf(status);
  return <ol className="report-card-workflow" aria-label="Tiến độ học bạ">
    {REPORT_CARD_STATUSES.map((item, index) => <li key={item} className={index < current ? 'done' : index === current ? 'active' : ''}>
      <span>{index < current ? <CheckCircle2 size={15} /> : index + 1}</span><strong>{STATUS_LABEL[item]}</strong>
    </li>)}
  </ol>;
}

export function ConductEvaluationPanel({ card }: { card: ReportCardView }) {
  const evaluation = card.conductEvaluation;
  const ready = evaluation.readiness === 'READY';
  return <section className="conduct-evaluation-panel">
    <header>
      <div><span className="conduct-evaluation-icon"><Sparkles size={21} /></span><div><small>ĐỀ XUẤT CÓ GIẢI THÍCH</small><h4>Đánh giá rèn luyện minh bạch</h4><p>Phiên bản tiêu chí {evaluation.ruleSet.versionNo} · Hệ thống chỉ đề xuất, GVCN quyết định cuối cùng.</p></div></div>
      <div className={`conduct-evaluation-result ${ready ? 'ready' : 'missing'}`}>
        <small>{ready ? 'Hệ thống đề xuất' : 'Trạng thái dữ liệu'}</small>
        <strong>{ready ? `${CONDUCT_LABEL[evaluation.suggestedGrade || ''] || '—'} · ${evaluation.suggestedScore?.toFixed(1)}/100` : 'Chưa đủ căn cứ'}</strong>
        {evaluation.finalGrade && <span>GVCN quyết định: {CONDUCT_LABEL[evaluation.finalGrade] || evaluation.finalGrade}</span>}
      </div>
    </header>
    {!ready && <div className="conduct-missing-data"><AlertTriangle size={17} /><div><strong>Cần bổ sung dữ liệu trước khi dùng đề xuất</strong><ul>{evaluation.missingData.map((item) => <li key={item}>{item}</li>)}</ul></div></div>}
    <div className="conduct-criteria-grid">{evaluation.criteria.map((criterion) => <article key={criterion.code} className={!criterion.sufficient ? 'insufficient' : ''}>
      <header><div><strong>{criterion.label}</strong><small>Trọng số {criterion.weight}%</small></div><b>{criterion.rawScore == null ? '—' : criterion.rawScore.toFixed(1)}</b></header>
      <div className="conduct-score-track"><span style={{ width: `${Math.max(0, Math.min(100, criterion.rawScore || 0))}%` }} /></div>
      <p>{criterion.summary}</p>
      {criterion.evidence.length > 0 && <details><summary>{criterion.evidence.length} minh chứng</summary><ul>{criterion.evidence.map((item) => <li key={item.id}><span><b>{item.title}</b><small>{item.occurredOn} · {item.teacherName || 'Hệ thống'}</small></span><em className={item.impactPoints > 0 ? 'positive' : item.impactPoints < 0 ? 'negative' : ''}>{item.impactPoints > 0 ? '+' : ''}{item.impactPoints}</em>{item.description && <p>{item.description}</p>}</li>)}</ul></details>}
    </article>)}</div>
    {evaluation.overrideReason && <div className="conduct-override-reason"><History size={16} /><span><strong>Lý do GVCN điều chỉnh khác đề xuất</strong><p>{evaluation.overrideReason}</p></span></div>}
  </section>;
}

function ReportCardDocument({ card, onDownload }: { card: ReportCardView; onDownload: () => void }) {
  const missingItems = (card.missingRequirements || '').split(';').map((item) => item.trim()).filter(Boolean);
  return <div className="report-card-document">
    <header className="report-card-document-head">
      <div><span className="report-card-seal"><GraduationCap size={28} /></span><div><small>HỌC BẠ ĐIỆN TỬ</small><h3>Năm học {card.academicYearCode}</h3><p>{card.studentName} · {card.studentCode || 'Chưa có mã'} · Lớp {card.classCode}</p></div></div>
      <div className="report-card-document-actions"><ReportCardStatusBadge status={card.status} />
        {card.status === 'PUBLISHED' && <button className="live-btn primary" onClick={onDownload}><Download size={16} /> Tải PDF có xác nhận</button>}
      </div>
    </header>
    <WorkflowSteps status={card.status} />
    <div className="report-card-summary-grid">
      <article><span>Trung bình HKI</span><strong>{score(card.semesterOneAverage)}</strong></article>
      <article><span>Trung bình HKII</span><strong>{score(card.semesterTwoAverage)}</strong></article>
      <article className="primary"><span>Trung bình cả năm</span><strong>{score(card.annualAverage)}</strong></article>
      <article><span>Hạnh kiểm</span><strong>{CONDUCT_LABEL[card.conductGrade || ''] || 'Chưa đánh giá'}</strong></article>
      <article><span>Kết quả</span><strong>{PROMOTION_LABEL[card.promotionStatus || ''] || 'Đang tổng hợp'}</strong></article>
      <article><span>Số môn</span><strong>{card.subjectCount}/12</strong></article>
    </div>
    <ConductEvaluationPanel card={card} />
    {missingItems.length > 0 && <div className="report-card-warning"><AlertTriangle size={18} /><div><strong>Hồ sơ còn {missingItems.length} hạng mục cần hoàn thiện</strong><ul>{missingItems.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul>{missingItems.length > 4 && <span>Và {missingItems.length - 4} hạng mục khác. Xem trạng thái từng môn trong bảng bên dưới.</span>}</div></div>}
    <div className="report-card-table-wrap"><table className="live-table report-card-subject-table"><thead><tr><th>STT</th><th>Môn học</th><th>HKI</th><th>HKII</th><th>Cả năm</th><th>Trạng thái</th></tr></thead><tbody>
      {card.subjects.map((item, index) => <tr key={item.subjectId}><td>{index + 1}</td><td><strong>{item.subjectName}</strong></td><td>{score(item.semesterOneAverage)}</td><td>{score(item.semesterTwoAverage)}</td><td className="annual-score">{score(item.annualAverage)}</td><td>{item.complete ? <span className="report-card-complete"><CheckCircle2 size={14} /> Đủ điểm</span> : <span className="report-card-incomplete"><Clock3 size={14} /> Chưa đủ</span>}</td></tr>)}
    </tbody></table></div>
    <div className="report-card-detail-grid">
      <article><header><UserCheck size={18} /><strong>Nhận xét giáo viên chủ nhiệm</strong></header><p>{card.homeroomComment || 'GVCN chưa nhập nhận xét.'}</p><small>{card.homeroomTeacherName || 'Chưa phân công GVCN'}</small></article>
      <article><header><ClipboardCheck size={18} /><strong>Chuyên cần cả năm</strong></header><dl><div><dt>Có mặt</dt><dd>{card.attendance.present}</dd></div><div><dt>Vắng có phép</dt><dd>{card.attendance.excusedAbsence}</dd></div><div><dt>Vắng không phép</dt><dd>{card.attendance.unexcusedAbsence}</dd></div><div><dt>Đi muộn</dt><dd>{card.attendance.late}</dd></div></dl></article>
    </div>
    <footer className="report-card-verification"><ShieldCheck size={17} /><span><strong>Mã xác nhận: {card.verificationCode}</strong><small>Dùng mã này để đối chiếu bản PDF do nhà trường phát hành.</small></span></footer>
    {card.audits.length > 0 && <details className="report-card-audits"><summary><History size={16} /> Lịch sử xử lý ({card.audits.length})</summary><ul>{card.audits.map((item) => <li key={item.id}><span><strong>{STATUS_LABEL[item.toStatus || ''] || item.action}</strong><small>{item.actorName || item.actorId} · {fmtDateTime(item.createdAt)}</small></span>{item.note && <p>{item.note}</p>}</li>)}</ul></details>}
  </div>;
}

function useDownloadReportCard(card?: ReportCardView | null) {
  const toast = useToast();
  const download = async () => {
    if (!card) return;
    try {
      const result = await api.download(`/exam-reports/report-card?academicYearId=${encodeURIComponent(card.academicYearId)}&studentId=${encodeURIComponent(card.studentId)}`);
      const url = URL.createObjectURL(result.blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.filename || `hoc-ba-${card.studentCode || card.studentId}-${card.academicYearCode}.pdf`; anchor.click(); URL.revokeObjectURL(url);
    } catch (error: any) { toast.show('err', error.message); }
  };
  return { download, toast };
}

function ScopeBreadcrumb({ cohort, year, schoolClass, student, onClasses, onStudents }: {
  cohort?: Cohort; year?: AcademicYear; schoolClass?: ReportCardClassSummary; student?: ReportCardView | null;
  onClasses: () => void; onStudents: () => void;
}) {
  return <nav className="report-hierarchy-breadcrumb" aria-label="Đường dẫn học bạ">
    <button type="button" onClick={onClasses}><Layers3 size={15} /> {cohort?.name || 'Niên khóa'}</button>
    <ChevronRight size={14} /><button type="button" onClick={onClasses}>{year?.code || 'Năm học'}</button>
    {schoolClass && <><ChevronRight size={14} /><button type="button" onClick={onStudents}>Lớp {schoolClass.classCode}</button></>}
    {student && <><ChevronRight size={14} /><span>{student.studentName}</span></>}
  </nav>;
}

function ScopeKpis({ overview }: { overview: ReportCardScopeOverview }) {
  return <div className="report-scope-kpis">
    <article><span className="icon"><School size={19} /></span><div><small>Lớp trong phạm vi</small><strong>{overview.classCount}</strong></div></article>
    <article><span className="icon"><Users size={19} /></span><div><small>Tổng học sinh</small><strong>{overview.studentCount}</strong></div></article>
    <article className={overview.incompleteCount ? 'warning' : 'success'}><span className="icon"><AlertTriangle size={19} /></span><div><small>Cần hoàn thiện</small><strong>{overview.incompleteCount}</strong></div></article>
    <article className="success"><span className="icon"><FileCheck2 size={19} /></span><div><small>Đã phát hành</small><strong>{overview.publishedCount}</strong><em>{overview.publishedPercent}%</em></div></article>
  </div>;
}

function ClassDirectory({ rows, onOpen }: { rows: ReportCardClassSummary[]; onOpen: (id: string) => void }) {
  return <div className="report-class-grid">
    {rows.map((item) => <article key={item.classId} className={item.incompleteCount ? 'needs-work' : ''}>
      <header><span className="report-class-avatar"><School size={20} /></span><div><h3>Lớp {item.classCode}</h3><p>{item.gradeLevel} · {item.studentCount} học sinh</p></div><Badge tone={item.incompleteCount ? 'orange' : 'green'}>{item.incompleteCount ? `${item.incompleteCount} cần xử lý` : 'Đủ dữ liệu'}</Badge></header>
      <dl><div><dt>Giáo viên chủ nhiệm</dt><dd>{item.homeroomTeacherName || 'Chưa phân công'}</dd></div><div><dt>Đã gửi duyệt</dt><dd>{item.submittedCount + item.approvedCount + item.lockedCount + item.publishedCount}/{item.studentCount}</dd></div><div><dt>Đã phát hành</dt><dd>{item.publishedCount}/{item.studentCount}</dd></div></dl>
      <div className="report-class-progress"><span><i style={{ width: `${item.completionPercent}%` }} /></span><small>{item.completionPercent}% hồ sơ đủ dữ liệu</small></div>
      <footer><span>{item.draftCount} nháp · {item.approvedCount + item.lockedCount} đã duyệt/khóa</span><button type="button" className="live-btn primary" onClick={() => onOpen(item.classId)}>Mở danh sách lớp <ChevronRight size={16} /></button></footer>
    </article>)}
  </div>;
}

function StudentDirectory({ data, selectedClass, status, query, onStatus, onQuery, onOpen, onPage, onPageSize }: {
  data: PageResponse<ReportCardListItem>; selectedClass: ReportCardClassSummary; status: string; query: string;
  onStatus: (value: string) => void; onQuery: (value: string) => void; onOpen: (id: string) => void;
  onPage: (value: number) => void; onPageSize: (value: number) => void;
}) {
  return <>
    <header className="report-student-directory-head"><div><span className="report-class-avatar"><Users size={20} /></span><div><h3>Danh sách học sinh lớp {selectedClass.classCode}</h3><p>{selectedClass.studentCount} học sinh · GVCN {selectedClass.homeroomTeacherName || 'chưa phân công'}</p></div></div><div className="report-directory-progress"><strong>{selectedClass.completionPercent}%</strong><span>đủ dữ liệu học bạ</span></div></header>
    <div className="report-student-toolbar">
      <label className="report-card-search"><span>Tìm trong lớp</span><div><Search size={16} /><input value={query} placeholder="Tên hoặc mã học sinh" onChange={(event) => onQuery(event.target.value)} /></div></label>
      <label><span>Trạng thái học bạ</span><select value={status} onChange={(event) => onStatus(event.target.value)}><option value="">Tất cả trạng thái</option>{Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
    </div>
    {data.items.length === 0 ? <div className="report-card-empty"><Users size={28} /><strong>Không tìm thấy học sinh phù hợp</strong></div> : <div className="report-student-table"><table className="live-table"><thead><tr><th>Học sinh</th><th>Trạng thái</th><th>TB cả năm</th><th>Hạnh kiểm</th><th>Kiểm tra dữ liệu</th><th>Thao tác</th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}><td><strong>{item.studentName}</strong><small>{item.studentCode || item.studentId}</small></td><td><ReportCardStatusBadge status={item.status} /></td><td><strong>{score(item.annualAverage)}</strong></td><td>{CONDUCT_LABEL[item.conductGrade || ''] || 'Chưa đánh giá'}</td><td>{item.missingRequirements ? <span className="report-card-incomplete" title={item.missingRequirements}><AlertTriangle size={14} /> Còn thiếu</span> : <span className="report-card-complete"><CheckCircle2 size={14} /> Đủ dữ liệu</span>}</td><td><button type="button" className="live-btn subtle" onClick={() => onOpen(item.studentId)}>Xem học bạ <ChevronRight size={15} /></button></td></tr>)}</tbody></table></div>}
    <ServerPagination data={data} itemLabel="học sinh" pageSizes={[10, 20, 50]} onPageChange={(next) => onPage(next + 1)} onPageSizeChange={onPageSize} />
  </>;
}

function ConductRuleSettings({ academicYearId }: { academicYearId: string }) {
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>(academicYearId ? `/semesters?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const [scope, setScope] = useState('ANNUAL');
  const suffix = scope === 'ANNUAL' ? '' : `&semesterId=${encodeURIComponent(scope)}`;
  const rules = useApi<ConductRuleSet>(academicYearId ? `/conduct/rules?academicYearId=${encodeURIComponent(academicYearId)}${suffix}` : null);
  const [form, setForm] = useState({ attendanceWeight: 35, disciplineWeight: 30, responsibilityWeight: 20,
    participationWeight: 15, goodMin: 85, fairMin: 70, averageMin: 50,
    minAttendanceRecords: 10, minParticipationEvidence: 0 });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!rules.data) return;
    setForm({ attendanceWeight: rules.data.attendanceWeight, disciplineWeight: rules.data.disciplineWeight,
      responsibilityWeight: rules.data.responsibilityWeight, participationWeight: rules.data.participationWeight,
      goodMin: rules.data.goodMin, fairMin: rules.data.fairMin, averageMin: rules.data.averageMin,
      minAttendanceRecords: rules.data.minAttendanceRecords,
      minParticipationEvidence: rules.data.minParticipationEvidence });
  }, [rules.data]);
  const weightTotal = form.attendanceWeight + form.disciplineWeight + form.responsibilityWeight + form.participationWeight;
  const change = (key: keyof typeof form, value: number) => setForm((current) => ({ ...current, [key]: Number.isFinite(value) ? value : 0 }));
  const save = async () => {
    if (Math.abs(weightTotal - 100) > 0.01) return toast.show('err', 'Tổng trọng số phải bằng 100%');
    setSaving(true);
    try {
      await api.put(`/conduct/rules?academicYearId=${encodeURIComponent(academicYearId)}`, { ...form, semesterId: scope === 'ANNUAL' ? null : scope });
      toast.show('ok', 'Đã kích hoạt phiên bản tiêu chí mới'); await rules.reload();
    } catch (error: any) { toast.show('err', error.message); } finally { setSaving(false); }
  };
  return <details className="conduct-rule-settings">{toast.node}<summary><span><ShieldCheck size={18} /><b>Cấu hình bộ tiêu chí rèn luyện</b><small>Phiên bản hóa theo năm học hoặc học kỳ</small></span><Badge tone={Math.abs(weightTotal - 100) < .01 ? 'green' : 'red'}>{weightTotal}%</Badge></summary>
    <div className="conduct-rule-settings-body">
      <header><label><span>Phạm vi áp dụng</span><select value={scope} onChange={(event) => setScope(event.target.value)}><option value="ANNUAL">Cả năm học</option><AcademicScopeOptions semesters={semesters.data || []} academicYears={years.data || []} /></select></label><div><small>Phiên bản đang dùng</small><strong>v{rules.data?.versionNo || 1}</strong></div></header>
      <div className="conduct-rule-grid">
        {([['attendanceWeight', 'Chuyên cần'], ['disciplineWeight', 'Ý thức và kỷ luật'], ['responsibilityWeight', 'Trách nhiệm học tập'], ['participationWeight', 'Tham gia và đóng góp']] as const).map(([key, label]) => <label key={key}><span>{label}</span><div><input type="number" min="0" max="100" value={form[key]} onChange={(event) => change(key, Number(event.target.value))} /><em>%</em></div></label>)}
      </div>
      <div className="conduct-threshold-grid">
        <label><span>Tốt từ</span><input type="number" min="0" max="100" value={form.goodMin} onChange={(event) => change('goodMin', Number(event.target.value))} /></label>
        <label><span>Khá từ</span><input type="number" min="0" max="100" value={form.fairMin} onChange={(event) => change('fairMin', Number(event.target.value))} /></label>
        <label><span>Trung bình từ</span><input type="number" min="0" max="100" value={form.averageMin} onChange={(event) => change('averageMin', Number(event.target.value))} /></label>
        <label><span>Tối thiểu lượt điểm danh</span><input type="number" min="0" value={form.minAttendanceRecords} onChange={(event) => change('minAttendanceRecords', Number(event.target.value))} /></label>
        <label><span>Tối thiểu minh chứng tham gia</span><input type="number" min="0" value={form.minParticipationEvidence} onChange={(event) => change('minParticipationEvidence', Number(event.target.value))} /></label>
      </div>
      <footer><p>Mỗi lần lưu tạo một phiên bản mới; hồ sơ đã khóa vẫn giữ nguyên quyết định và lịch sử.</p><button className="live-btn primary" disabled={saving || Math.abs(weightTotal - 100) > .01} onClick={save}><FileCheck2 size={15} /> {saving ? 'Đang lưu…' : 'Kích hoạt phiên bản mới'}</button></footer>
    </div>
  </details>;
}

function ManagedReportCards({ mode }: { mode: 'staff' | 'teacher' }) {
  const staff = mode === 'staff';
  const { options, yearId, setYearId, selectedYear } = useReportCardYears();
  const historicalScope = ['CLOSED', 'COMPLETED', 'ARCHIVED'].includes(String(selectedYear?.status || '').toUpperCase());
  const cohorts = useApi<Cohort[]>('/cohorts');
  const profile = useApi<ApiUser>(staff ? null : '/me');
  const cohortOptions = useMemo(() => (cohorts.data || []).slice().sort((a, b) => b.entryYear - a.entryYear), [cohorts.data]);
  const [cohortId, setCohortId] = useHashString('nien-khoa', '');
  const [classId, setClassId] = useHashString('lop', '');
  const [studentId, setStudentId] = useHashString('hoc-sinh', '');
  const [status, setStatus] = useHashString('trang-thai', '');
  const [query, setQuery] = useHashString('tim-kiem', '');
  const [page, setPage] = useHashNumber('trang', 1);
  const [pageSize, setPageSize] = useHashNumber('so-dong', 10, 5);
  const [conduct, setConduct] = useState(''); const [comment, setComment] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (cohortOptions.length && !cohortOptions.some((item) => item.id === cohortId)) {
      setCohortId(cohortOptions.find((item) => item.status === 'ACTIVE')?.id || cohortOptions[0].id);
    }
  }, [cohortId, cohortOptions, setCohortId]);
  const selectedCohort = cohortOptions.find((item) => item.id === cohortId);
  const scopedYears = useMemo(() => options.filter((year) => yearBelongsToCohort(year, selectedCohort)), [options, selectedCohort]);
  const selectedYearClasses = useApi<SchoolClass[]>(!staff && yearId ? `/classes?academicYearId=${encodeURIComponent(yearId)}` : null);
  useEffect(() => {
    if (selectedCohort && scopedYears.length && !scopedYears.some((item) => item.id === yearId)) {
      setYearId(scopedYears.find((item) => item.status === 'ACTIVE')?.id || scopedYears[0].id);
    }
  }, [scopedYears, selectedCohort, setYearId, yearId]);

  const scopeQuery = yearId && cohortId ? `academicYearId=${encodeURIComponent(yearId)}&cohortId=${encodeURIComponent(cohortId)}` : '';
  const overview = useApi<ReportCardScopeOverview>(scopeQuery ? `/report-cards/overview?${scopeQuery}` : null);
  const classSummaries = useApi<ReportCardClassSummary[]>(scopeQuery ? `/report-cards/classes?${scopeQuery}` : null);
  const selectedClass = classSummaries.data?.find((item) => item.classId === classId);
  const studentParams = new URLSearchParams({ academicYearId: yearId, classId, page: String(page - 1), size: String(pageSize) });
  if (status) studentParams.set('status', status); if (query) studentParams.set('q', query);
  const students = useApi<PageResponse<ReportCardListItem>>(yearId && classId ? `/report-cards/students?${studentParams}` : null);
  const detail = useApi<ReportCardView>(yearId && studentId ? `/report-cards/${studentId}?academicYearId=${encodeURIComponent(yearId)}` : null);
  const { download, toast: downloadToast } = useDownloadReportCard(detail.data);
  useEffect(() => { if (detail.data) {
    setConduct(detail.data.conductGrade || detail.data.conductEvaluation.suggestedGrade || '');
    setComment(detail.data.homeroomComment || '');
    setOverrideReason(detail.data.conductEvaluation.overrideReason || '');
  } }, [detail.data]);
  useEffect(() => {
    if (staff || classId || studentId || classSummaries.loading || classSummaries.data?.length) return;
    const ownedClass = selectedYearClasses.data?.find((item) => item.homeroomTeacherId === profile.data?.id && item.cohortId);
    if (!ownedClass || ownedClass.cohortId === cohortId) return;
    setCohortId(ownedClass.cohortId || '', 'replace');
  }, [classId, classSummaries.data, classSummaries.loading, cohortId, profile.data?.id, selectedYearClasses.data, setCohortId, staff, studentId]);

  const clearToClasses = () => { setClassId(''); setStudentId(''); setStatus(''); setQuery(''); setPage(1); };
  const clearToStudents = () => { setStudentId(''); setReason(''); };
  const reloadScope = async () => Promise.all([overview.reload(), classSummaries.reload(), students.reload(), detail.reload()]);
  const changeCohort = (value: string) => { setCohortId(value, 'push'); clearToClasses(); };
  const changeYear = (value: string) => { setYearId(value, 'push'); clearToClasses(); };

  const transition = async (action: 'approve' | 'lock' | 'publish' | 'reopen') => {
    if (historicalScope) return toast.show('err', 'Năm học đã đóng. Học bạ lịch sử chỉ được phép xem và tải xuống.');
    if (!studentId) return;
    if (action === 'reopen' && !reason.trim()) { toast.show('err', 'Vui lòng nhập lý do mở lại học bạ'); return; }
    setBusy(true);
    try {
      await api.post(`/report-cards/${studentId}/${action}?academicYearId=${encodeURIComponent(yearId)}`, action === 'reopen' ? { reason: reason.trim() } : { note: reason.trim() || null });
      toast.show('ok', action === 'approve' ? 'Đã duyệt học bạ' : action === 'lock' ? 'Đã khóa học bạ' : action === 'publish' ? 'Đã phát hành học bạ' : 'Đã mở lại học bạ');
      setReason(''); await reloadScope();
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };
  const saveHomeroom = async () => {
    if (historicalScope) return toast.show('err', 'Năm học đã đóng. Không thể thay đổi học bạ lịch sử.');
    if (!studentId || !conduct || !comment.trim()) { toast.show('err', 'Vui lòng chọn hạnh kiểm và nhập nhận xét'); return; }
    const suggestion = detail.data?.conductEvaluation.suggestedGrade;
    if ((!suggestion || suggestion !== conduct) && !overrideReason.trim()) {
      toast.show('err', 'Vui lòng ghi rõ lý do khi quyết định khác đề xuất hoặc khi hệ thống chưa đủ căn cứ'); return;
    }
    setBusy(true);
    try { await api.put(`/report-cards/${studentId}/homeroom?academicYearId=${encodeURIComponent(yearId)}`, { conductGrade: conduct, homeroomComment: comment.trim(), overrideReason: overrideReason.trim() || null }); toast.show('ok', 'Đã lưu quyết định rèn luyện và nhận xét của GVCN'); await reloadScope(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };
  const submit = async () => {
    if (historicalScope) return toast.show('err', 'Năm học đã đóng. Không thể gửi lại học bạ lịch sử.');
    if (!studentId) return;
    setBusy(true);
    try { await api.post(`/report-cards/${studentId}/submit?academicYearId=${encodeURIComponent(yearId)}`, {}); toast.show('ok', 'Đã gửi học bạ cho Giáo vụ duyệt'); await reloadScope(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const currentStep = studentId ? 3 : classId ? 2 : 1;
  return <div className={`report-card-page report-card-managed ${mode}`}>{toast.node}{downloadToast.node}
    <header className={`report-card-hero ${staff ? '' : 'teacher'}`}><div><span>{staff ? <FileCheck2 size={16} /> : <UserCheck size={16} />} {staff ? 'TRUNG TÂM HỌC BẠ' : 'KHÔNG GIAN GVCN'}</span><h2>{staff ? 'Học bạ điện tử toàn trường' : 'Học bạ lớp chủ nhiệm'}</h2><p>{staff ? 'Chọn đúng niên khóa và năm học, mở từng lớp rồi mới kiểm tra hồ sơ học sinh.' : 'Theo dõi từng lớp chủ nhiệm, hoàn thiện nhận xét và gửi Giáo vụ duyệt.'}</p></div><div className="report-card-hero-mark"><BookOpenCheck size={31} /><strong>{overview.data?.publishedCount || 0}/{overview.data?.studentCount || 0}</strong><small>học bạ đã phát hành</small></div></header>
    {staff && yearId && !historicalScope && <ConductRuleSettings academicYearId={yearId} />}
    {historicalScope && <div className="report-history-readonly" role="status"><LockKeyhole size={18} /><div><strong>Lịch sử — chỉ xem</strong><span>Năm học đã đóng; dữ liệu học bạ được bảo toàn và không thể chỉnh sửa.</span></div></div>}
    <div className="report-hierarchy-steps" aria-label="Các bước tra cứu"><span className={currentStep === 1 ? 'active' : 'done'}><i>1</i><b>Chọn lớp</b><small>Theo niên khóa và năm học</small></span><ChevronRight size={18} /><span className={currentStep === 2 ? 'active' : currentStep > 2 ? 'done' : ''}><i>2</i><b>Chọn học sinh</b><small>Trong đúng lớp đã chọn</small></span><ChevronRight size={18} /><span className={currentStep === 3 ? 'active' : ''}><i>3</i><b>Xem học bạ</b><small>Chi tiết và quy trình xử lý</small></span></div>
    <Section title="Phạm vi dữ liệu" subtitle="Hệ thống chỉ thống kê các lớp thuộc đúng niên khóa và năm học đã chọn" wide>
      <div className="report-scope-selector"><label><span>1. Niên khóa</span><select value={cohortId} onChange={(event) => changeCohort(event.target.value)}>{cohortOptions.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.entryYear}–{item.graduationYear}) · {item.status === 'COMPLETED' ? 'Đã kết thúc' : 'Đang theo học'}</option>)}</select></label><label><span>2. Năm học trong niên khóa</span><select value={yearId} onChange={(event) => changeYear(event.target.value)}>{scopedYears.map((item) => <option key={item.id} value={item.id}>{item.code} · {yearState(item)}</option>)}</select></label><div className="report-scope-note"><ShieldCheck size={18} /><span><strong>Phạm vi hiện tại</strong><small>{selectedCohort?.name || 'Chưa chọn niên khóa'} · {selectedYear?.code || 'Chưa chọn năm học'}</small></span></div></div>
      <Async state={overview}>{(data) => <ScopeKpis overview={data} />}</Async>
    </Section>
    <Section title={currentStep === 1 ? 'Danh sách lớp' : currentStep === 2 ? `Học sinh lớp ${selectedClass?.classCode || ''}` : 'Chi tiết học bạ'} subtitle={currentStep === 1 ? 'Chọn một lớp để mở danh sách học sinh; hệ thống không tải trộn học sinh toàn trường' : currentStep === 2 ? 'Chọn một học sinh để xem học bạ chi tiết' : 'Kiểm tra điểm, hạnh kiểm, chuyên cần và lịch sử xử lý'} wide>
      <ScopeBreadcrumb cohort={selectedCohort} year={selectedYear} schoolClass={selectedClass} student={detail.data} onClasses={clearToClasses} onStudents={clearToStudents} />
      {currentStep === 1 && <Async state={classSummaries} empty={staff ? 'Không có lớp thuộc phạm vi đã chọn' : 'Bạn không chủ nhiệm lớp nào trong phạm vi đã chọn'}>{(rows) => <ClassDirectory rows={rows} onOpen={(id) => { setClassId(id, 'push'); setPage(1); }} />}</Async>}
      {currentStep === 2 && selectedClass && <Async state={students} allowEmpty>{(data) => <StudentDirectory data={data} selectedClass={selectedClass} status={status} query={query} onStatus={(value) => { setStatus(value, 'push'); setPage(1); }} onQuery={(value) => { setQuery(value); setPage(1); }} onOpen={(id) => setStudentId(id, 'push')} onPage={(value) => setPage(value, 'push')} onPageSize={(value) => { setPageSize(value); setPage(1); }} />}</Async>}
      {currentStep === 3 && <div className="report-card-detail-page"><button type="button" className="live-btn subtle report-back-button" onClick={clearToStudents}><ArrowLeft size={16} /> Trở lại danh sách lớp {selectedClass?.classCode}</button><Async state={detail}>{(card) => <><div className="report-card-review-panel"><ReportCardDocument card={card} onDownload={download} /></div>{historicalScope ? <div className="gradebook-readonly-card"><LockKeyhole size={18} /><div><strong>Hồ sơ lịch sử chỉ xem</strong><small>Bạn vẫn có thể tải học bạ nhưng không thể duyệt, mở lại hoặc sửa nhận xét.</small></div></div> : staff ? <div className="report-card-review-actions"><label><span>Ghi chú xử lý / lý do mở lại</span><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ghi rõ nội dung để lưu vào lịch sử" /></label><div>{card.status === 'HOMEROOM_SUBMITTED' && <button className="live-btn primary" disabled={busy} onClick={() => transition('approve')}><UserCheck size={16} /> Duyệt học bạ</button>}{card.status === 'APPROVED' && <button className="live-btn primary" disabled={busy} onClick={() => transition('lock')}><LockKeyhole size={16} /> Khóa học bạ</button>}{card.status === 'LOCKED' && <button className="live-btn primary" disabled={busy} onClick={() => transition('publish')}><Send size={16} /> Phát hành</button>}{canOpenReportCardRevision(card.status) && <button className="live-btn subtle danger" disabled={busy} onClick={() => transition('reopen')}><Unlock size={16} /> {card.status === 'PUBLISHED' ? 'Tạo bản điều chỉnh' : 'Mở lại'}</button>}</div></div> : card.editableByHomeroom && <div className="homeroom-report-editor"><h4><ClipboardCheck size={18} /> Hoàn thiện phần của giáo viên chủ nhiệm</h4><div className="homeroom-conduct-fields"><label><span>Mức GVCN quyết định</span><select value={conduct} onChange={(event) => setConduct(event.target.value)}><option value="">Chọn mức rèn luyện</option>{CONDUCT_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small>Đề xuất hệ thống: {CONDUCT_LABEL[card.conductEvaluation.suggestedGrade || ''] || 'Chưa đủ căn cứ'}</small></label><label><span>Nhận xét cuối năm</span><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Nhận xét về học tập, rèn luyện và hướng phát triển của học sinh" /></label>{(!card.conductEvaluation.suggestedGrade || conduct !== card.conductEvaluation.suggestedGrade) && <label className="conduct-override-field"><span>Lý do quyết định khác đề xuất *</span><textarea value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} placeholder="Nêu căn cứ chuyên môn và minh chứng GVCN đã xem xét" /></label>}</div><footer><button className="live-btn subtle" disabled={busy} onClick={saveHomeroom}><FileText size={16} /> Lưu quyết định và nhận xét</button>{card.status === 'DRAFT' && <button className="live-btn primary" disabled={busy || Boolean(card.missingRequirements)} onClick={submit}><Send size={16} /> Gửi Giáo vụ duyệt</button>}</footer></div>}</>}</Async></div>}
    </Section>
  </div>;
}

export function AcademicStaffReportCardsLive() { return <ManagedReportCards mode="staff" />; }
export function TeacherReportCardsLive() { return <ManagedReportCards mode="teacher" />; }

function PersonalReportCard({ actor }: { actor: 'student' | 'parent' }) {
  const { childId, setChildId } = useActiveChild();
  const { years, options, yearId, setYearId } = useReportCardYears();
  const me = useApi<ApiUser>('/me'); const children = useApi<ApiUser[]>(actor === 'parent' ? '/me/children' : null);
  useEffect(() => { if (actor === 'parent' && children.data?.length && (!childId || !children.data.some((item) => item.id === childId))) setChildId(children.data[0].id); }, [actor, childId, children.data, setChildId]);
  const studentId = actor === 'student' ? me.data?.id : childId;
  const card = useApi<ReportCardView>(yearId && studentId ? `/report-cards/${studentId}?academicYearId=${encodeURIComponent(yearId)}` : null);
  const { download, toast } = useDownloadReportCard(card.data);
  const child = children.data?.find((item) => item.id === childId);
  return <div className="report-card-page personal-report-card">{toast.node}<header className={`report-card-hero ${actor}`}><div><span><GraduationCap size={16} /> HỒ SƠ HỌC TẬP CHÍNH THỨC</span><h2>{actor === 'student' ? 'Học bạ điện tử của tôi' : 'Học bạ điện tử của con'}</h2><p>Chỉ học bạ đã được Giáo vụ duyệt, khóa và phát hành mới xuất hiện tại đây.</p></div><div className="report-card-hero-mark"><ShieldCheck size={31} /><strong>{card.data?.status === 'PUBLISHED' ? 'Đã xác nhận' : 'Chưa phát hành'}</strong><small>Nguồn dữ liệu nhà trường</small></div></header>
    <Section title="Chọn hồ sơ" subtitle="Tra cứu học bạ chính thức theo từng năm học" wide>
      <div className="report-card-filters compact">{actor === 'parent' && <label><span>Học sinh</span><select value={childId || ''} onChange={(event) => setChildId(event.target.value || null)}>{(children.data || []).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.className}</option>)}</select></label>}<label><span>Năm học</span><select value={yearId} onChange={(event) => setYearId(event.target.value)}>{options.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></label>{actor === 'parent' && child && <div className="report-card-child"><GraduationCap size={18} /><span><strong>{child.fullName}</strong><small>{child.studentCode} · {child.className}</small></span></div>}</div>
      <Async state={years}>{() => card.error ? <div className="report-card-unpublished"><Archive size={30} /><strong>Học bạ năm học này chưa được phát hành</strong><span>Nhà trường sẽ gửi thông báo ngay khi Giáo vụ hoàn tất kiểm tra và công bố học bạ.</span></div> : <Async state={card} empty="Chưa có học bạ được phát hành">{(data) => <ReportCardDocument card={data} onDownload={download} />}</Async>}</Async>
    </Section>
  </div>;
}

export function StudentReportCardLive() { return <PersonalReportCard actor="student" />; }
export function ParentReportCardLive() { return <PersonalReportCard actor="parent" />; }

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CalendarCheck, CheckCircle2, ClipboardCheck, GraduationCap,
  LockKeyhole, Pencil, RefreshCw, RotateCcw, Save, Settings2, ShieldCheck, UsersRound,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, ConductGrade, PromotionPolicy, SchoolClass,
  YearReview, YearReviewResult, YearReviewStudent,
} from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { Async, fmtDateTime, PaginatedData, useToast } from './common';
import { Field, Modal } from './Modal';

const BASE_RESULTS: Array<{ value: YearReviewResult; label: string }> = [
  { value: 'PROMOTED', label: 'Lên lớp' },
  { value: 'RETAINED', label: 'Lưu ban' },
  { value: 'INCOMPLETE', label: 'Chưa hoàn tất' },
  { value: 'PENDING_REVIEW', label: 'Chờ xét' },
];
const CONDUCTS: Array<{ value: ConductGrade; label: string }> = [
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Khá' },
  { value: 'PASS', label: 'Đạt' },
  { value: 'FAIL', label: 'Chưa đạt' },
];

export function YearReviewWorkspace() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const years = useApi<AcademicYear[]>('/academicYears');
  const [academicYearId, setAcademicYearId] = useState('');
  const [classId, setClassId] = useState('');
  const [decisionTarget, setDecisionTarget] = useState<YearReviewStudent | null>(null);
  const [result, setResult] = useState<YearReviewResult>('PENDING_REVIEW');
  const [conductGrade, setConductGrade] = useState<ConductGrade>('GOOD');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyDraft, setPolicyDraft] = useState<PromotionPolicy | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusConfirmed, setStatusConfirmed] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [reopenConfirmed, setReopenConfirmed] = useState(false);
  const toast = useToast();

  const classes = useApi<SchoolClass[]>(academicYearId
    ? `/classes?academicYearId=${encodeURIComponent(academicYearId)}` : null);

  useEffect(() => {
    if (academicYearId || !years.data?.length) return;
    setAcademicYearId((years.data.find((year) => year.status === 'ACTIVE') || years.data[0]).id);
  }, [academicYearId, years.data]);
  useEffect(() => setClassId(''), [academicYearId]);

  const selectedYear = useMemo(
    () => years.data?.find((year) => year.id === academicYearId),
    [academicYearId, years.data],
  );
  const availableClasses = useMemo(() => {
    const rows = classes.data || [];
    return isAdmin ? rows : rows.filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id);
  }, [classes.data, isAdmin, user?.id]);

  const review = useApi<YearReview>(academicYearId && classId
    ? `/academic-year-summaries/preview?academicYearId=${encodeURIComponent(academicYearId)}&classId=${encodeURIComponent(classId)}`
    : null);

  const resultOptions = useMemo(() => {
    if (review.data?.gradeLevel === 'K12') {
      return [
        { value: 'ELIGIBLE_FOR_GRADUATION' as const, label: 'Đủ điều kiện xét tốt nghiệp' },
        ...BASE_RESULTS.filter((option) => option.value !== 'PROMOTED'),
      ];
    }
    return BASE_RESULTS;
  }, [review.data?.gradeLevel]);

  const openDecision = (student: YearReviewStudent) => {
    setDecisionTarget(student);
    setResult(student.result);
    setConductGrade(student.conductGrade || 'GOOD');
    setReason(student.reason || '');
  };

  const saveDecision = async () => {
    if (!decisionTarget) return;
    const reasonRequired = result === 'RETAINED'
      || result === 'INCOMPLETE'
      || result !== decisionTarget.suggestedResult
      || decisionTarget.decisionStatus === 'FINALIZED';
    if (reasonRequired && !reason.trim()) {
      toast.show('err', 'Cần nhập lý do cho kết quả này.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.put<YearReview>(
        `/academic-year-summaries/${encodeURIComponent(academicYearId)}/classes/${encodeURIComponent(classId)}/students/${encodeURIComponent(decisionTarget.studentId)}`,
        { result, conductGrade, reason: reason.trim() || null },
      );
      review.setData(updated);
      setDecisionTarget(null);
      toast.show('ok', 'Đã lưu hạnh kiểm và kết quả xét của học sinh.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const finalizeClass = async () => {
    if (!confirmed) {
      toast.show('err', 'Hãy xác nhận đã kiểm tra toàn bộ kết quả.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.post<YearReview>(
        `/academic-year-summaries/${encodeURIComponent(academicYearId)}/classes/${encodeURIComponent(classId)}/finalize`,
        { confirmed: true },
      );
      review.setData(updated);
      setFinalizeOpen(false);
      setConfirmed(false);
      toast.show('ok', 'Đã chốt kết quả và khóa sửa điểm của lớp.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const reopenClass = async () => {
    if (!reopenReason.trim() || !reopenConfirmed) {
      toast.show('err', 'Cần nhập lý do và xác nhận mở lại lớp.');
      return;
    }
    setSaving(true);
    try {
      const updated = await api.post<YearReview>(
        `/academic-year-summaries/${encodeURIComponent(academicYearId)}/classes/${encodeURIComponent(classId)}/reopen`,
        { reason: reopenReason.trim(), confirmed: true },
      );
      review.setData(updated);
      setReopenOpen(false);
      setReopenReason('');
      setReopenConfirmed(false);
      toast.show('ok', 'Đã mở lại kết quả lớp. Giáo viên có thể bổ sung điểm.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const openPolicy = () => {
    if (!review.data) return;
    setPolicyDraft({ ...review.data.policy });
    setPolicyOpen(true);
  };

  const savePolicy = async () => {
    if (!policyDraft) return;
    setSaving(true);
    try {
      await api.put(
        `/academic-year-summaries/${encodeURIComponent(academicYearId)}/policy`,
        policyDraft,
      );
      await review.reload();
      setPolicyOpen(false);
      toast.show('ok', 'Đã cập nhật quy tắc xét lên lớp.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  const changeYearStatus = async () => {
    if (!selectedYear || !statusReason.trim() || !statusConfirmed) {
      toast.show('err', 'Cần nhập lý do và xác nhận thay đổi trạng thái năm học.');
      return;
    }
    const status = selectedYear.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE';
    setSaving(true);
    try {
      await api.put(`/academic-year-summaries/${encodeURIComponent(academicYearId)}/status`, {
        status, reason: statusReason.trim(), confirmed: true,
      });
      await years.reload();
      await review.reload();
      setStatusOpen(false);
      setStatusReason('');
      setStatusConfirmed(false);
      toast.show('ok', status === 'CLOSED'
        ? 'Đã đóng năm học.'
        : selectedYear.status === 'PLANNED'
          ? 'Đã kích hoạt năm học.'
          : 'Đã mở lại năm học.');
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section
      title="Xét và chốt kết quả năm học"
      subtitle="Một luồng thống nhất cho hạnh kiểm, kết quả cả năm và khóa dữ liệu"
      wide
      action={review.data ? (
        <div className="year-review-heading-actions">
          {isAdmin && <button className="live-btn ghost" type="button" onClick={openPolicy}><Settings2 size={15} /> Quy tắc</button>}
          <button className="live-btn ghost" type="button" onClick={review.reload}><RefreshCw size={15} /> Tải lại</button>
        </div>
      ) : undefined}
    >
      {toast.node}
      <div className="year-review-filters">
        <label><span>Năm học</span><select className="live-select" value={academicYearId} onChange={(event) => setAcademicYearId(event.target.value)}>
          <option value="">Chọn năm học</option>
          {(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code} · {yearStatusLabel(year.status)}</option>)}
        </select></label>
        <label><span>Lớp</span><select className="live-select" value={classId} onChange={(event) => setClassId(event.target.value)} disabled={!academicYearId}>
          <option value="">Chọn lớp</option>
          {availableClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
        </select></label>
        {isAdmin && selectedYear && (
          <button className="live-btn subtle year-review-year-status-btn" type="button" onClick={() => setStatusOpen(true)}>
            {selectedYear.status === 'ACTIVE' ? <CalendarCheck size={15} /> : <RotateCcw size={15} />}
            {yearStatusActionLabel(selectedYear.status)}
          </button>
        )}
      </div>

      {!academicYearId || !classId ? (
        <div className="year-summary-empty"><ClipboardCheck size={30} /><strong>Chọn năm học và lớp cần xét</strong><span>GVCN nhập hạnh kiểm và lưu kết quả; Admin kiểm tra trước khi chốt.</span></div>
      ) : (
        <Async state={review} empty="Không có học sinh để xét kết quả">
          {(data) => (
            <div className="year-review-results">
              <div className="year-summary-context">
                <div><GraduationCap size={19} /><span><strong>{data.className}</strong><small>{data.academicYearName} · {gradeLabel(data.gradeLevel)}</small></span></div>
                <Badge tone={data.finalized ? 'green' : data.yearClosed ? 'orange' : 'blue'}>{data.finalized ? 'Đã chốt' : data.yearClosed ? 'Chờ chốt' : 'Đang chuẩn bị'}</Badge>
                <small>Cập nhật {fmtDateTime(data.generatedAt)}</small>
              </div>

              <div className="year-review-rule-summary">
                <strong>Công thức: {data.yearlyAverageFormula}</strong>
                <span>TB tối thiểu {score(data.policy.minimumYearlyAverage)}</span>
                <span>Hạnh kiểm từ {conductLabel(data.policy.minimumConductGrade)}</span>
                <span>Tối đa {data.policy.maximumSubjectsBelowMinimum} môn dưới {score(data.policy.subjectMinimumScore)}</span>
                <span>{data.policy.minimumAttendanceRate == null ? 'Không đặt ngưỡng chuyên cần' : `Chuyên cần từ ${percent(data.policy.minimumAttendanceRate)}`}</span>
              </div>

              <div className="year-review-metrics">
                <ReviewMetric icon={UsersRound} label="Học sinh" value={data.metrics.totalStudents} />
                <ReviewMetric icon={CheckCircle2} label="Đủ dữ liệu" value={data.metrics.academicallyReady} tone="green" />
                <ReviewMetric icon={ClipboardCheck} label="Đã có hạnh kiểm" value={data.metrics.conductCompleted} />
                <ReviewMetric icon={Save} label="Đã lưu xét" value={data.metrics.decisionsSaved} />
                <ReviewMetric icon={GraduationCap} label={data.gradeLevel === 'K12' ? 'Đủ điều kiện xét TN' : 'Được lên lớp'} value={data.gradeLevel === 'K12' ? data.metrics.eligibleForGraduation : data.metrics.promoted} tone="green" />
                <ReviewMetric icon={AlertTriangle} label="Chưa hoàn tất" value={data.metrics.incomplete} tone={data.metrics.incomplete ? 'red' : 'green'} />
              </div>

              {data.finalizeBlockers.length > 0 && !data.finalized && (
                <div className="year-review-blockers"><AlertTriangle size={18} /><div><strong>Chưa thể chốt kết quả</strong>{data.finalizeBlockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div></div>
              )}
              {data.finalized && (
                <div className="year-review-finalized"><LockKeyhole size={18} /><div><strong>Kết quả đã chốt</strong><span>Điểm của hai học kỳ đã khóa. Admin phải mở lại lớp và ghi lý do trước khi chỉnh sửa.</span></div></div>
              )}

              <PaginatedData items={data.students} pageSize={10} itemLabel="học sinh" resetKey={`${data.academicYearId}|${data.classId}`}>
                {(students) => <div className="year-review-table-wrap"><table className="live-table year-review-table">
                  <thead><tr><th>Học sinh</th><th>HK1 / HK2</th><th>TB năm</th><th>Hạnh kiểm</th><th>Môn dưới ngưỡng</th><th>Kết quả xét</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>{students.map((student) => <tr key={student.studentId}>
                    <td><strong>{student.studentName}</strong><small>{student.studentCode || 'Chưa có mã'}</small></td>
                    <td><div className="year-review-semesters">{student.semesters.map((semester) => <span key={semester.semesterId}><b>{semester.semesterName}</b><strong>{score(semester.average)}</strong><small>{semester.ready ? 'Đủ dữ liệu' : 'Chưa đủ dữ liệu'}</small></span>)}</div></td>
                    <td><strong className="year-summary-score">{score(student.yearlyAverage)}</strong><small>{percent(student.attendanceRate)} chuyên cần</small></td>
                    <td><Badge tone={conductTone(student.conductGrade)}>{student.conductGrade ? conductLabel(student.conductGrade) : 'Chưa nhập'}</Badge></td>
                    <td><strong title={subjectBreakdown(student)}>{student.subjectsBelowMinimum}</strong><small>ngưỡng {score(data.policy.subjectMinimumScore)}</small></td>
                    <td><Badge tone={resultTone(student.result)}>{resultLabel(student.result)}</Badge>{student.reason && <small className="year-review-reason">{student.reason}</small>}</td>
                    <td><Badge tone={student.decisionStatus === 'FINALIZED' ? 'green' : student.decisionStatus === 'DRAFT' ? 'orange' : 'blue'}>{decisionStatusLabel(student.decisionStatus)}</Badge>{student.reviewedByName && <small>{student.reviewedByName}</small>}</td>
                    <td><button className="icon-inline-btn" type="button" title={data.finalized && !isAdmin ? 'Chỉ Admin được sửa kết quả đã chốt' : 'Xét kết quả'} disabled={data.finalized && !isAdmin} onClick={() => openDecision(student)}><Pencil size={15} /></button></td>
                  </tr>)}</tbody>
                </table></div>}
              </PaginatedData>

              {isAdmin && (
                <div className="year-review-actions">
                  {data.finalized ? (
                    <button className="live-btn subtle" type="button" onClick={() => setReopenOpen(true)}><RotateCcw size={16} /> Mở lại kết quả lớp</button>
                  ) : (
                    <button className="live-btn primary" type="button" disabled={!data.canFinalize} title={data.finalizeBlockers.join('; ')} onClick={() => setFinalizeOpen(true)}>
                      <ShieldCheck size={16} /> Chốt kết quả và khóa điểm
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </Async>
      )}

      {decisionTarget && (
        <Modal
          title={`Xét kết quả · ${decisionTarget.studentName}`}
          onClose={() => setDecisionTarget(null)}
          footer={<><button className="live-btn subtle" type="button" onClick={() => setDecisionTarget(null)}>Hủy</button><button className="live-btn primary" type="button" disabled={saving} onClick={saveDecision}><Save size={15} /> Lưu kết quả</button></>}
        >
          <div className="year-review-decision-summary">
            <span>Điểm trung bình năm <strong>{score(decisionTarget.yearlyAverage)}</strong></span>
            <span>Chuyên cần <strong>{percent(decisionTarget.attendanceRate)}</strong></span>
            <span>Môn dưới ngưỡng <strong>{decisionTarget.subjectsBelowMinimum}</strong></span>
            <span>Gợi ý hiện tại <strong>{resultLabel(decisionTarget.suggestedResult)}</strong></span>
          </div>
          <Field label="Hạnh kiểm">
            <select className="live-select" value={conductGrade} onChange={(event) => setConductGrade(event.target.value as ConductGrade)}>
              {CONDUCTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label="Kết quả xét">
            <select className="live-select" value={result} onChange={(event) => setResult(event.target.value as YearReviewResult)}>
              {resultOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </Field>
          <Field label={`Lý do${decisionReasonRequired(decisionTarget, result) ? ' (bắt buộc)' : ''}`}>
            <textarea className="live-input year-review-reason-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ghi rõ căn cứ xét hoặc lý do điều chỉnh kết quả" />
          </Field>
          {decisionTarget.decisionStatus === 'FINALIZED' && <div className="year-summary-notice"><LockKeyhole size={16} /> Mọi thay đổi sau khi chốt đều được lưu vào lịch sử hệ thống.</div>}
        </Modal>
      )}

      {finalizeOpen && (
        <ConfirmModal
          title="Chốt kết quả năm học"
          message="Sau khi chốt, điểm của lớp trong cả hai học kỳ sẽ bị khóa."
          checked={confirmed}
          onChecked={setConfirmed}
          onClose={() => setFinalizeOpen(false)}
          onConfirm={finalizeClass}
          saving={saving}
          confirmLabel="Chốt và khóa điểm"
        />
      )}

      {reopenOpen && (
        <ReasonConfirmModal
          title="Mở lại kết quả lớp"
          message="Kết quả chuyển về bản nháp và khóa điểm của lớp được gỡ. Thao tác này được ghi audit."
          reason={reopenReason}
          onReason={setReopenReason}
          checked={reopenConfirmed}
          onChecked={setReopenConfirmed}
          onClose={() => setReopenOpen(false)}
          onConfirm={reopenClass}
          saving={saving}
          confirmLabel="Mở lại lớp"
        />
      )}

      {statusOpen && selectedYear && (
        <ReasonConfirmModal
          title={yearStatusActionLabel(selectedYear.status)}
          message={selectedYear.status === 'ACTIVE'
            ? 'Đóng năm học cho phép Admin bắt đầu chốt kết quả từng lớp.'
            : selectedYear.status === 'PLANNED'
              ? 'Chỉ kích hoạt khi năm học cũ đã đóng. Hệ thống chỉ cho phép một năm học đang hoạt động.'
              : 'Mở lại trạng thái năm học không tự gỡ khóa các lớp đã chốt.'}
          reason={statusReason}
          onReason={setStatusReason}
          checked={statusConfirmed}
          onChecked={setStatusConfirmed}
          onClose={() => setStatusOpen(false)}
          onConfirm={changeYearStatus}
          saving={saving}
          confirmLabel={yearStatusActionLabel(selectedYear.status)}
        />
      )}

      {policyOpen && policyDraft && (
        <Modal
          title="Quy tắc xét kết quả"
          onClose={() => setPolicyOpen(false)}
          footer={<><button className="live-btn subtle" type="button" onClick={() => setPolicyOpen(false)}>Hủy</button><button className="live-btn primary" type="button" disabled={saving} onClick={savePolicy}><Save size={15} /> Lưu quy tắc</button></>}
        >
          <div className="year-summary-notice"><Settings2 size={16} /> Quy tắc áp dụng cho toàn bộ lớp trong năm học đã chọn. Không thể đổi sau khi có lớp được chốt.</div>
          <div className="year-review-policy-grid">
            <Field label="Điểm TB năm tối thiểu"><input className="live-input" type="number" min="0" max="10" step="0.1" value={policyDraft.minimumYearlyAverage} onChange={(event) => setPolicyDraft({ ...policyDraft, minimumYearlyAverage: Number(event.target.value) })} /></Field>
            <Field label="Hạnh kiểm tối thiểu"><select className="live-select" value={policyDraft.minimumConductGrade} onChange={(event) => setPolicyDraft({ ...policyDraft, minimumConductGrade: event.target.value as ConductGrade })}>{CONDUCTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></Field>
            <Field label="Ngưỡng điểm từng môn"><input className="live-input" type="number" min="0" max="10" step="0.1" value={policyDraft.subjectMinimumScore} onChange={(event) => setPolicyDraft({ ...policyDraft, subjectMinimumScore: Number(event.target.value) })} /></Field>
            <Field label="Số môn dưới ngưỡng tối đa"><input className="live-input" type="number" min="0" max="20" step="1" value={policyDraft.maximumSubjectsBelowMinimum} onChange={(event) => setPolicyDraft({ ...policyDraft, maximumSubjectsBelowMinimum: Number(event.target.value) })} /></Field>
            <Field label="Chuyên cần tối thiểu (%)"><input className="live-input" type="number" min="0" max="100" step="0.1" value={policyDraft.minimumAttendanceRate ?? ''} placeholder="Để trống nếu không áp dụng" onChange={(event) => setPolicyDraft({ ...policyDraft, minimumAttendanceRate: event.target.value === '' ? null : Number(event.target.value) })} /></Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

function ConfirmModal({ title, message, checked, onChecked, onClose, onConfirm, saving, confirmLabel }: {
  title: string; message: string; checked: boolean; onChecked: (value: boolean) => void;
  onClose: () => void; onConfirm: () => void; saving: boolean; confirmLabel: string;
}) {
  return <Modal title={title} onClose={onClose} footer={<><button className="live-btn subtle" type="button" onClick={onClose}>Hủy</button><button className="live-btn primary" type="button" disabled={!checked || saving} onClick={onConfirm}><LockKeyhole size={15} /> {confirmLabel}</button></>}>
    <div className="year-review-finalize-warning"><AlertTriangle size={20} /><div><strong>Hành động quan trọng</strong><span>{message}</span></div></div>
    <label className="year-review-confirm"><input type="checkbox" checked={checked} onChange={(event) => onChecked(event.target.checked)} /><span>Tôi đã kiểm tra và xác nhận thực hiện.</span></label>
  </Modal>;
}

function ReasonConfirmModal(props: {
  title: string; message: string; reason: string; onReason: (value: string) => void;
  checked: boolean; onChecked: (value: boolean) => void; onClose: () => void;
  onConfirm: () => void; saving: boolean; confirmLabel: string;
}) {
  return <Modal title={props.title} onClose={props.onClose} footer={<><button className="live-btn subtle" type="button" onClick={props.onClose}>Hủy</button><button className="live-btn primary" type="button" disabled={!props.checked || !props.reason.trim() || props.saving} onClick={props.onConfirm}><RotateCcw size={15} /> {props.confirmLabel}</button></>}>
    <div className="year-review-finalize-warning"><AlertTriangle size={20} /><div><strong>Thao tác được lưu vào lịch sử</strong><span>{props.message}</span></div></div>
    <Field label="Lý do (bắt buộc)"><textarea className="live-input year-review-reason-input" value={props.reason} onChange={(event) => props.onReason(event.target.value)} placeholder="Nhập lý do cụ thể" /></Field>
    <label className="year-review-confirm"><input type="checkbox" checked={props.checked} onChange={(event) => props.onChecked(event.target.checked)} /><span>Tôi xác nhận thực hiện thao tác này.</span></label>
  </Modal>;
}

function ReviewMetric({ icon: Icon, label, value, tone = 'blue' }: { icon: typeof UsersRound; label: string; value: number; tone?: 'blue' | 'green' | 'red' }) {
  return <div className={`year-review-metric ${tone}`}><Icon size={17} /><span><small>{label}</small><strong>{value}</strong></span></div>;
}
function score(value?: number | null) {
  return value == null ? '—' : value.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
function percent(value?: number | null) {
  return value == null ? '—' : `${value.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}
function resultLabel(result: YearReviewResult) {
  if (result === 'ELIGIBLE_FOR_GRADUATION') return 'Đủ điều kiện xét tốt nghiệp';
  return BASE_RESULTS.find((option) => option.value === result)?.label || result;
}
function resultTone(result: YearReviewResult): 'green' | 'red' | 'orange' | 'blue' {
  if (result === 'PROMOTED' || result === 'ELIGIBLE_FOR_GRADUATION') return 'green';
  if (result === 'RETAINED' || result === 'INCOMPLETE') return 'red';
  return 'orange';
}
function conductLabel(value: ConductGrade) {
  return CONDUCTS.find((option) => option.value === value)?.label || value;
}
function conductTone(value?: ConductGrade | null): 'green' | 'red' | 'orange' | 'blue' {
  if (value === 'GOOD' || value === 'FAIR') return 'green';
  if (value === 'FAIL') return 'red';
  return value === 'PASS' ? 'orange' : 'blue';
}
function decisionStatusLabel(status: YearReviewStudent['decisionStatus']) {
  if (status === 'FINALIZED') return 'Đã chốt';
  if (status === 'DRAFT') return 'Bản nháp';
  return 'Chưa lưu';
}
function decisionReasonRequired(student: YearReviewStudent, result: YearReviewResult) {
  return result === 'RETAINED' || result === 'INCOMPLETE'
    || result !== student.suggestedResult || student.decisionStatus === 'FINALIZED';
}
function yearStatusLabel(status: string) {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'CLOSED') return 'Đã đóng';
  return 'Dự kiến';
}
function yearStatusActionLabel(status: string) {
  if (status === 'ACTIVE') return 'Đóng năm học';
  if (status === 'PLANNED') return 'Kích hoạt năm học';
  return 'Mở lại năm học';
}
function gradeLabel(gradeLevel: string) {
  return gradeLevel.replace(/^K/, 'Khối ');
}
function subjectBreakdown(student: YearReviewStudent) {
  const rows = student.annualSubjects.filter((subject) => subject.belowMinimum);
  return rows.length
    ? rows.map((subject) => `${subject.subjectName}: ${score(subject.yearlyAverage)}`).join(', ')
    : 'Không có môn dưới ngưỡng';
}

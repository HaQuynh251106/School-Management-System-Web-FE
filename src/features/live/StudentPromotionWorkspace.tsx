import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRight, CheckCircle2, GraduationCap,
  PlayCircle, RefreshCw, Undo2, UserRoundCheck, UsersRound,
} from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, PromotionExecution, PromotionPreview,
  PromotionStudent, PromotionUndo, SchoolClass, YearReviewResult,
} from '../../api/types';
import { Badge, Section } from '../../components/ui';
import { PaginatedData, useToast } from './common';
import { Modal } from './Modal';

export function StudentPromotionWorkspace() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [sourceAcademicYearId, setSourceAcademicYearId] = useState('');
  const [targetAcademicYearId, setTargetAcademicYearId] = useState('');
  const [sourceClassId, setSourceClassId] = useState('');
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<PromotionPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);
  const [undoConfirmed, setUndoConfirmed] = useState(false);
  const [undoReason, setUndoReason] = useState('');
  const toast = useToast();
  const sourceClasses = useApi<SchoolClass[]>(sourceAcademicYearId
    ? `/classes?academicYearId=${encodeURIComponent(sourceAcademicYearId)}` : null);

  useEffect(() => {
    if (sourceAcademicYearId || !years.data?.length) return;
    const closed = years.data.find((year) => year.status === 'CLOSED');
    if (closed) setSourceAcademicYearId(closed.id);
  }, [sourceAcademicYearId, years.data]);
  useEffect(() => {
    setSourceClassId('');
    setPreview(null);
    setPlacements({});
  }, [sourceAcademicYearId]);
  useEffect(() => {
    setPreview(null);
    setPlacements({});
  }, [targetAcademicYearId, sourceClassId]);

  const targetYears = useMemo(
    () => (years.data || []).filter((year) => year.id !== sourceAcademicYearId),
    [sourceAcademicYearId, years.data],
  );
  const requestBody = (placementState = placements) => ({
    sourceAcademicYearId,
    targetAcademicYearId,
    sourceClassId,
    placements: Object.entries(placementState).map(([studentId, targetClassId]) => ({
      studentId, targetClassId: targetClassId || null,
    })),
  });

  const loadPreview = async (placementState = placements) => {
    if (!sourceAcademicYearId || !targetAcademicYearId || !sourceClassId) {
      toast.show('err', 'Chọn đủ năm nguồn, năm đích và lớp nguồn.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<PromotionPreview>(
        '/student-promotions/preview', requestBody(placementState),
      );
      setPreview(data);
      setPlacements(Object.fromEntries(data.students
        .filter((student) => student.targetClassId)
        .map((student) => [student.studentId, student.targetClassId as string])));
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const chooseTarget = async (studentId: string, targetClassId: string) => {
    const next = { ...placements, [studentId]: targetClassId };
    setPlacements(next);
    await loadPreview(next);
  };

  const execute = async () => {
    if (!confirmed) {
      toast.show('err', 'Hãy xác nhận danh sách chuyển lớp.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post<PromotionExecution>('/student-promotions/execute', {
        ...requestBody(), confirmed: true,
      });
      setPreview(result.preview);
      setConfirmOpen(false);
      setConfirmed(false);
      toast.show('ok', `Đã ghi danh ${result.enrolled} học sinh; hoàn tất THPT ${result.completedSchool}; bỏ qua ${result.skipped}.`);
      sourceClasses.reload();
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const undo = async () => {
    if (!undoConfirmed || undoReason.trim().length < 10) {
      toast.show('err', 'Nhập lý do hoàn tác có ít nhất 10 ký tự và xác nhận thao tác.');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post<PromotionUndo>('/student-promotions/undo', {
        sourceAcademicYearId,
        targetAcademicYearId,
        sourceClassId,
        reason: undoReason.trim(),
        confirmed: true,
      });
      setPreview(result.preview);
      setUndoOpen(false);
      setUndoConfirmed(false);
      setUndoReason('');
      toast.show('ok', `Đã hoàn tác ${result.revertedEnrollments} ghi danh và khôi phục ${result.restoredCompletedStudents} học sinh cuối cấp.`);
      sourceClasses.reload();
    } catch (error) {
      toast.show('err', error instanceof ApiError ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section
      title="Chuyển lớp sang năm học mới"
      subtitle="Dùng kết quả đã chốt để ghi danh; chạy lại không tạo dữ liệu trùng"
      wide
      action={preview ? <button className="live-btn ghost" type="button" disabled={loading} onClick={() => loadPreview()}><RefreshCw size={15} /> Tính lại</button> : undefined}
    >
      {toast.node}
      <div className="promotion-filters">
        <label><span>Năm học nguồn</span><select className="live-select" value={sourceAcademicYearId} onChange={(event) => setSourceAcademicYearId(event.target.value)}>
          <option value="">Chọn năm đã đóng</option>
          {(years.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code} · {statusLabel(year.status)}</option>)}
        </select></label>
        <ArrowRight className="promotion-arrow" size={18} />
        <label><span>Năm học đích</span><select className="live-select" value={targetAcademicYearId} onChange={(event) => setTargetAcademicYearId(event.target.value)}>
          <option value="">Chọn năm đang hoạt động</option>
          {targetYears.map((year) => <option key={year.id} value={year.id}>{year.name || year.code} · {statusLabel(year.status)}</option>)}
        </select></label>
        <label><span>Lớp nguồn</span><select className="live-select" value={sourceClassId} disabled={!sourceAcademicYearId} onChange={(event) => setSourceClassId(event.target.value)}>
          <option value="">Chọn lớp đã chốt</option>
          {(sourceClasses.data || []).map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
        </select></label>
        <button className="live-btn primary" type="button" disabled={loading || !sourceAcademicYearId || !targetAcademicYearId || !sourceClassId} onClick={() => loadPreview()}>
          <PlayCircle size={16} /> Xem trước
        </button>
      </div>

      {(years.data?.length || 0) < 2 && (
        <div className="promotion-empty">
          <GraduationCap size={26} />
          <div><strong>Chưa có năm học kế tiếp</strong><span>Tạo năm học mới và các lớp tương ứng trong Cơ cấu đào tạo trước khi chuyển lớp.</span></div>
        </div>
      )}

      {preview && (
        <div className="promotion-results">
          <div className="promotion-context">
            <span><strong>{preview.sourceClassCode}</strong><small>{preview.sourceAcademicYearName}</small></span>
            <ArrowRight size={18} />
            <span><strong>{preview.targetAcademicYearName}</strong><small>Ghi danh năm học mới</small></span>
            <Badge tone={preview.canExecute ? 'green' : 'orange'}>{preview.canExecute ? 'Sẵn sàng' : 'Cần bổ sung'}</Badge>
          </div>
          <div className="promotion-metrics">
            <PromotionMetric icon={UsersRound} label="Tổng học sinh" value={preview.metrics.totalStudents} />
            <PromotionMetric icon={CheckCircle2} label="Sẵn sàng" value={preview.metrics.ready} tone="green" />
            <PromotionMetric icon={UserRoundCheck} label="Đã xử lý" value={preview.metrics.alreadyProcessed} />
            <PromotionMetric icon={GraduationCap} label="Hoàn tất THPT" value={preview.metrics.completingSchool} />
            <PromotionMetric icon={AlertTriangle} label="Thiếu lớp đích" value={preview.metrics.needsPlacement} tone={preview.metrics.needsPlacement ? 'red' : 'green'} />
          </div>

          {preview.blockers.length > 0 && (
            <div className="promotion-blockers"><AlertTriangle size={18} /><div><strong>Chưa thể thực hiện</strong>{preview.blockers.map((blocker) => <span key={blocker}>{blocker}</span>)}</div></div>
          )}

          <PaginatedData items={preview.students} pageSize={10} itemLabel="học sinh" resetKey={`${preview.sourceAcademicYearId}|${preview.targetAcademicYearId}|${preview.sourceClassId}`}>
            {(students) => <div className="promotion-table-wrap"><table className="live-table promotion-table">
              <thead><tr><th>Học sinh</th><th>Kết quả đã chốt</th><th>Xử lý</th><th>Lớp đích</th><th>Trạng thái</th></tr></thead>
              <tbody>{students.map((student) => <tr key={student.studentId}>
                <td><strong>{student.studentName}</strong><small>{student.studentCode || 'Chưa có mã'}</small></td>
                <td><Badge tone={resultTone(student.result)}>{resultLabel(student.result)}</Badge></td>
                <td><strong>{actionLabel(student.action)}</strong><small>{student.message}</small></td>
                <td>{student.action === 'COMPLETE_SCHOOL' ? <span>Không ghi danh lớp mới</span> : student.status === 'ALREADY_PROCESSED' ? <strong>{student.targetClassCode || 'Đã xử lý'}</strong> : (
                  <select className="live-select" value={student.targetClassId || ''} disabled={loading || student.status === 'BLOCKED'} onChange={(event) => chooseTarget(student.studentId, event.target.value)}>
                    <option value="">Chọn lớp khối {gradeNumber(student.requiredTargetGradeLevel)}</option>
                    {preview.targetClasses.filter((target) => target.gradeLevel === student.requiredTargetGradeLevel).map((target) => <option key={target.id} value={target.id}>{target.code} · {target.studentCount} học sinh</option>)}
                  </select>
                )}</td>
                <td><Badge tone={promotionStatusTone(student.status)}>{promotionStatusLabel(student.status)}</Badge></td>
              </tr>)}</tbody>
            </table></div>}
          </PaginatedData>

          <div className="promotion-actions">
            {preview.metrics.alreadyProcessed > 0 && (
              <button className="live-btn danger" type="button" disabled={loading} title="Thu hồi kết quả cuối năm trước nếu lớp đã được công bố" onClick={() => setUndoOpen(true)}>
                <Undo2 size={16} /> Hoàn tác chuyển lớp
              </button>
            )}
            <button className="live-btn primary" type="button" disabled={!preview.canExecute || loading} title={preview.blockers.join('; ')} onClick={() => setConfirmOpen(true)}>
              <UserRoundCheck size={16} /> Thực hiện chuyển lớp
            </button>
          </div>
        </div>
      )}

      {confirmOpen && preview && (
        <Modal
          title="Xác nhận chuyển lớp"
          onClose={() => setConfirmOpen(false)}
          footer={<><button className="live-btn subtle" type="button" onClick={() => setConfirmOpen(false)}>Hủy</button><button className="live-btn primary" type="button" disabled={!confirmed || loading} onClick={execute}><UserRoundCheck size={15} /> Xác nhận ghi danh</button></>}
        >
          <div className="promotion-confirm"><AlertTriangle size={20} /><div><strong>Kiểm tra kỹ lớp đích</strong><span>Hệ thống sẽ cập nhật lớp hiện tại của học sinh và lưu enrollment theo năm học. Chạy lại cùng danh sách sẽ chỉ bỏ qua bản ghi đã xử lý.</span></div></div>
          <label className="year-review-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Tôi đã kiểm tra {preview.metrics.totalStudents} học sinh và xác nhận chuyển lớp.</span></label>
        </Modal>
      )}

      {undoOpen && preview && (
        <Modal
          title={`Hoàn tác chuyển lớp ${preview.sourceClassCode}`}
          onClose={() => setUndoOpen(false)}
          footer={<>
            <button className="live-btn subtle" type="button" onClick={() => setUndoOpen(false)}>Hủy</button>
            <button className="live-btn danger" type="button" disabled={!undoConfirmed || undoReason.trim().length < 10 || loading} onClick={undo}><Undo2 size={15} /> Xác nhận hoàn tác</button>
          </>}
        >
          <div className="promotion-confirm">
            <AlertTriangle size={20} />
            <div><strong>Học sinh sẽ được đưa về lớp nguồn {preview.sourceClassCode}</strong><span>Enrollment năm học đích được chuyển sang trạng thái đã hoàn tác. Nếu kết quả cuối năm đang công bố, hãy thu hồi kết quả trước rồi mới thực hiện.</span></div>
          </div>
          <label className="year-publication-reason">
            <span>Lý do hoàn tác <small>(bắt buộc, ít nhất 10 ký tự)</small></span>
            <textarea className="live-input year-review-reason-input" maxLength={1000} value={undoReason} onChange={(event) => setUndoReason(event.target.value)} placeholder="Ví dụ: Xếp nhầm lớp đích, cần điều chỉnh lại danh sách" />
          </label>
          <label className="year-review-confirm"><input type="checkbox" checked={undoConfirmed} onChange={(event) => setUndoConfirmed(event.target.checked)} /><span>Tôi đã kiểm tra dữ liệu và xác nhận đưa học sinh về lớp nguồn.</span></label>
        </Modal>
      )}
    </Section>
  );
}

function PromotionMetric({ icon: Icon, label, value, tone = 'blue' }: { icon: typeof UsersRound; label: string; value: number; tone?: 'blue' | 'green' | 'red' }) {
  return <div className={`promotion-metric ${tone}`}><Icon size={17} /><span><small>{label}</small><strong>{value}</strong></span></div>;
}
function statusLabel(status: string) {
  if (status === 'ACTIVE') return 'Đang hoạt động';
  if (status === 'CLOSED') return 'Đã đóng';
  return 'Dự kiến';
}
function resultLabel(result: YearReviewResult) {
  if (result === 'PROMOTED') return 'Lên lớp';
  if (result === 'RETAINED') return 'Lưu ban';
  if (result === 'ELIGIBLE_FOR_GRADUATION') return 'Đủ điều kiện xét tốt nghiệp';
  if (result === 'INCOMPLETE') return 'Chưa hoàn tất';
  return 'Chờ xét';
}
function resultTone(result: YearReviewResult): 'green' | 'red' | 'orange' {
  if (result === 'PROMOTED' || result === 'ELIGIBLE_FOR_GRADUATION') return 'green';
  if (result === 'RETAINED' || result === 'INCOMPLETE') return 'red';
  return 'orange';
}
function actionLabel(action: PromotionStudent['action']) {
  if (action === 'PROMOTE') return 'Lên khối tiếp theo';
  if (action === 'RETAIN') return 'Học lại cùng khối';
  if (action === 'COMPLETE_SCHOOL') return 'Hoàn tất THPT';
  return 'Chưa thể xử lý';
}
function promotionStatusLabel(status: PromotionStudent['status']) {
  if (status === 'READY') return 'Sẵn sàng';
  if (status === 'NEEDS_PLACEMENT') return 'Chọn lớp đích';
  if (status === 'ALREADY_PROCESSED') return 'Đã xử lý';
  return 'Bị chặn';
}
function promotionStatusTone(status: PromotionStudent['status']): 'green' | 'red' | 'orange' | 'blue' {
  if (status === 'READY' || status === 'ALREADY_PROCESSED') return 'green';
  if (status === 'BLOCKED') return 'red';
  return 'orange';
}
function gradeNumber(gradeLevel?: string | null) {
  return gradeLevel?.replace(/^K/, '') || '—';
}

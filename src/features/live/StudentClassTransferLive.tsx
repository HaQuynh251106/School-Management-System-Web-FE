import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole, RefreshCw, RotateCcw, ShieldCheck, UserRoundCheck, UsersRound } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { AcademicYear, ApiUser, PageResponse, SchoolClass, StudentClassTransfer, StudentClassTransferWindow } from '../../api/types';
import { Section } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, ServerPagination, useToast } from './common';
import { Field, Modal } from './Modal';
import { useHashNumber, useHashString } from '../../api/urlState';
import { operationalAcademicYears } from './academicYearSelection';

export function StudentClassTransferLive({ years, classes, onChanged }: {
  years: AcademicYear[]; classes: SchoolClass[]; onChanged: () => void;
}) {
  const { user } = useAuth();
  const allowed = user?.role === 'ACADEMIC_STAFF';
  const activeYears = operationalAcademicYears(years).filter((item) => item.status === 'ACTIVE');
  const [yearId, setYearId] = useHashString('transfer_year', activeYears[0]?.id || '');
  const yearClasses = useMemo(() => classes.filter((item) => item.academicYearId === yearId)
    .sort((a, b) => a.code.localeCompare(b.code, 'vi')), [classes, yearId]);
  const [sourceClassId, setSourceClassId] = useHashString('transfer_source', '');
  const sourceClass = yearClasses.find((item) => item.id === sourceClassId);
  const students = useApi<ApiUser[]>(allowed && sourceClassId ? `/classes/${encodeURIComponent(sourceClassId)}/students` : null);
  const [studentId, setStudentId] = useHashString('transfer_student', '');
  const student = students.data?.find((item) => item.id === studentId);
  const [targetClassId, setTargetClassId] = useHashString('transfer_target', '');
  const targetClass = yearClasses.find((item) => item.id === targetClassId);
  const targetClasses = yearClasses.filter((item) => item.id !== sourceClassId
    && (!sourceClass || item.gradeLevel === sourceClass.gradeLevel));
  const windowState = useApi<StudentClassTransferWindow>(allowed && yearId
    ? `/student-class-transfers/window?academicYearId=${encodeURIComponent(yearId)}` : null);
  const [effectiveDate, setEffectiveDate] = useState('');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const [historyPage, setHistoryPage] = useHashNumber('transfer_page', 1);
  const [historySize, setHistorySize] = useHashNumber('transfer_size', 10);
  const [historyStatus, setHistoryStatus] = useHashString('transfer_status', 'ALL');
  const history = useApi<PageResponse<StudentClassTransfer>>(allowed && yearId
    ? `/student-class-transfers?academicYearId=${encodeURIComponent(yearId)}&status=${historyStatus}&page=${historyPage - 1}&size=${historySize}` : null);
  const [undoing, setUndoing] = useState<StudentClassTransfer | null>(null);
  const [undoReason, setUndoReason] = useState('');

  useEffect(() => {
    if (!yearId && activeYears[0]) setYearId(activeYears[0].id);
  }, [activeYears, setYearId, yearId]);
  useEffect(() => {
    setEffectiveDate(windowState.data?.defaultEffectiveDate || '');
  }, [windowState.data?.defaultEffectiveDate]);
  useEffect(() => {
    if (sourceClassId && !yearClasses.some((item) => item.id === sourceClassId)) setSourceClassId('');
    if (targetClassId && !yearClasses.some((item) => item.id === targetClassId)) setTargetClassId('');
  }, [sourceClassId, setSourceClassId, setTargetClassId, targetClassId, yearClasses]);

  const chooseSource = (value: string) => {
    setSourceClassId(value); setStudentId(''); setTargetClassId(''); setConfirmed(false);
  };
  const transfer = async () => {
    if (!studentId || !targetClassId || reason.trim().length < 10 || !effectiveDate || !confirmed) return;
    setSaving(true);
    try {
      await api.post('/student-class-transfers', { studentId, targetClassId, effectiveDate, reason: reason.trim() });
      toast.show('ok', `Đã chuyển ${student?.fullName || 'học sinh'} sang lớp ${targetClass?.code}`);
      setStudentId(''); setTargetClassId(''); setReason(''); setConfirmed(false);
      students.reload(); history.reload(); windowState.reload(); onChanged();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSaving(false); }
  };
  const undo = async () => {
    if (!undoing || undoReason.trim().length < 10) return;
    setSaving(true);
    try {
      await api.post(`/student-class-transfers/${undoing.id}/undo`, { reason: undoReason.trim() });
      toast.show('ok', `Đã hoàn tác chuyển lớp của ${undoing.studentName}`);
      setUndoing(null); setUndoReason(''); history.reload(); students.reload(); onChanged();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSaving(false); }
  };

  if (!allowed) return <Section title="Chuyển lớp cuối học kỳ" subtitle="Nghiệp vụ chuyên trách của Giáo vụ" wide>
    <div className="class-transfer-access-note"><LockKeyhole size={22} /><div><strong>Chỉ Giáo vụ được chuyển lớp</strong><span>Admin quản lý tài khoản nhưng không thay đổi lớp học của học sinh.</span></div></div>
  </Section>;

  const transferReady = Boolean(windowState.data?.eligible && studentId && targetClassId && effectiveDate
    && reason.trim().length >= 10 && confirmed && targetClass && targetClass.studentCount < targetClass.capacity);

  return <div className="class-transfer-workspace">{toast.node}
    <Section title="Chuyển lớp cuối học kỳ" subtitle="Chỉ mở khi học kỳ đã đóng; mọi thay đổi đều được lưu lịch sử và thông báo" wide>
      <div className="class-transfer-policy">
        <span><ShieldCheck size={20} /></span><div><strong>Quy tắc bảo vệ dữ liệu học tập</strong><p>Không chuyển lớp khi học kỳ đang diễn ra. Cuối năm, việc lên lớp hoặc lưu ban vẫn do quy trình Tổng kết năm xử lý tự động.</p></div>
      </div>
      <div className="class-transfer-steps" aria-label="Quy trình chuyển lớp">
        <div className={yearId ? 'done' : ''}><i>1</i><span><strong>Kiểm tra thời điểm</strong><small>Học kỳ phải được đóng</small></span></div>
        <ArrowRight size={17} /><div className={studentId ? 'done' : ''}><i>2</i><span><strong>Chọn học sinh</strong><small>Trong lớp hiện tại</small></span></div>
        <ArrowRight size={17} /><div className={targetClassId ? 'done' : ''}><i>3</i><span><strong>Chọn lớp mới</strong><small>Cùng khối và còn chỗ</small></span></div>
        <ArrowRight size={17} /><div className={confirmed ? 'done' : ''}><i>4</i><span><strong>Xác nhận</strong><small>Lưu lịch sử và thông báo</small></span></div>
      </div>

      <div className="class-transfer-scope">
        <label><span>Năm học đang xử lý</span><select value={yearId} onChange={(event) => { setYearId(event.target.value); chooseSource(''); }}>
          <option value="">Chọn năm học</option>{activeYears.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </select></label>
        <Async state={windowState}>{(windowInfo) => <div className={`class-transfer-window ${windowInfo.eligible ? 'open' : 'closed'}`}>
          {windowInfo.eligible ? <CheckCircle2 size={22} /> : <LockKeyhole size={22} />}
          <div><strong>{windowInfo.eligible ? 'Đang mở cửa sổ chuyển lớp' : 'Chưa được phép chuyển lớp'}</strong><span>{windowInfo.reason}</span>
            {windowInfo.latestClosedSemesterName && <small>{windowInfo.latestClosedSemesterName} kết thúc ngày {fmtDate(windowInfo.latestClosedSemesterEndDate)}</small>}</div>
        </div>}</Async>
      </div>

      <div className={`class-transfer-form ${windowState.data?.eligible ? '' : 'disabled'}`}>
        <div className="class-transfer-selection-grid">
          <Field label="1. Lớp hiện tại"><select value={sourceClassId} disabled={!windowState.data?.eligible} onChange={(event) => chooseSource(event.target.value)}><option value="">Chọn lớp hiện tại</option>{yearClasses.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.studentCount}/{item.capacity} học sinh</option>)}</select></Field>
          <Field label="2. Học sinh"><select value={studentId} disabled={!sourceClassId || students.loading} onChange={(event) => { setStudentId(event.target.value); setConfirmed(false); }}><option value="">{students.loading ? 'Đang tải học sinh…' : 'Chọn học sinh'}</option>{(students.data || []).map((item) => <option key={item.id} value={item.id}>{item.studentCode} · {item.fullName}</option>)}</select></Field>
          <Field label="3. Lớp tiếp nhận"><select value={targetClassId} disabled={!studentId} onChange={(event) => { setTargetClassId(event.target.value); setConfirmed(false); }}><option value="">Chọn lớp cùng khối</option>{targetClasses.map((item) => <option key={item.id} value={item.id} disabled={item.studentCount >= item.capacity}>{item.code} · {item.studentCount}/{item.capacity}{item.studentCount >= item.capacity ? ' · Đã đủ sĩ số' : ''}</option>)}</select></Field>
        </div>
        {student && sourceClass && targetClass && <div className="class-transfer-preview">
          <article><span><UsersRound size={19} /></span><div><small>Học sinh</small><strong>{student.fullName}</strong><em>{student.studentCode}</em></div></article>
          <ArrowRight size={22} /><article><div><small>Lớp hiện tại</small><strong>{sourceClass.code}</strong><em>{sourceClass.homeroomTeacherName || 'Chưa có GVCN'}</em></div></article>
          <ArrowRight size={22} /><article className="target"><div><small>Lớp tiếp nhận</small><strong>{targetClass.code}</strong><em>Còn {Math.max(0, targetClass.capacity - targetClass.studentCount)} chỗ</em></div></article>
        </div>}
        <div className="class-transfer-detail-grid">
          <Field label="Ngày hiệu lực"><input type="date" value={effectiveDate} disabled={!studentId} max={windowState.data?.defaultEffectiveDate} min={windowState.data?.latestClosedSemesterEndDate || undefined} onChange={(event) => setEffectiveDate(event.target.value)} /></Field>
          <Field label="Lý do chuyển lớp"><textarea rows={3} maxLength={1000} value={reason} disabled={!studentId} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do hoặc căn cứ phê duyệt, tối thiểu 10 ký tự" /></Field>
        </div>
        <label className="class-transfer-confirm"><input type="checkbox" checked={confirmed} disabled={!studentId || !targetClassId || reason.trim().length < 10} onChange={(event) => setConfirmed(event.target.checked)} /><span><strong>Tôi đã kiểm tra lớp, sĩ số và thông tin học sinh</strong><small>Hệ thống sẽ cập nhật sĩ số, lưu lịch sử và gửi thông báo cho các bên liên quan.</small></span></label>
        <div className="class-transfer-actions"><button type="button" className="live-btn primary" disabled={!transferReady || saving} onClick={transfer}><UserRoundCheck size={17} /> {saving ? 'Đang xử lý…' : 'Xác nhận chuyển lớp'}</button></div>
      </div>
    </Section>

    <Section title="Lịch sử chuyển lớp" subtitle="Tra cứu người thực hiện, lý do và trạng thái hoàn tác" wide action={<button className="live-btn ghost" onClick={() => history.reload()}><RefreshCw size={15} /> Làm mới</button>}>
      <div className="class-transfer-history-filter"><label><span>Trạng thái</span><select value={historyStatus} onChange={(event) => { setHistoryStatus(event.target.value); setHistoryPage(1); }}><option value="ALL">Tất cả</option><option value="APPLIED">Đã chuyển</option><option value="ROLLED_BACK">Đã hoàn tác</option></select></label></div>
      <Async state={history} empty="Chưa có lần chuyển lớp nào">{(data) => <>
        <div className="class-transfer-history-table"><table className="live-table"><thead><tr><th>Thời gian</th><th>Học sinh</th><th>Điều chuyển</th><th>Lý do</th><th>Người thực hiện</th><th>Trạng thái</th><th></th></tr></thead><tbody>{data.items.map((item) => <tr key={item.id}>
          <td><strong>{fmtDate(item.effectiveDate)}</strong><small>{fmtDateTime(item.createdAt)}</small></td><td><strong>{item.studentName}</strong></td><td><span className="class-transfer-route"><b>{item.sourceClassCode}</b><ArrowRight size={14} /><b>{item.targetClassCode}</b></span></td><td><span className="class-transfer-reason">{item.reason}</span>{item.rollbackReason && <small>Hoàn tác: {item.rollbackReason}</small>}</td><td>{item.createdByName || item.createdBy}</td><td><span className={`class-transfer-status ${item.status.toLowerCase()}`}>{item.status === 'APPLIED' ? 'Đã chuyển' : 'Đã hoàn tác'}</span></td><td>{item.status === 'APPLIED' && windowState.data?.eligible && <button className="academic-action" type="button" title="Hoàn tác an toàn" onClick={() => { setUndoing(item); setUndoReason(''); }}><RotateCcw size={15} /></button>}</td>
        </tr>)}</tbody></table></div>
        <ServerPagination data={data} itemLabel="lần chuyển lớp" onPageChange={(page) => setHistoryPage(page + 1)} onPageSizeChange={(size) => { setHistorySize(size); setHistoryPage(1); }} />
      </>}</Async>
    </Section>
    {undoing && <Modal title="Hoàn tác chuyển lớp" onClose={() => setUndoing(null)} footer={<><button className="live-btn ghost" onClick={() => setUndoing(null)}>Hủy</button><button className="live-btn" disabled={saving || undoReason.trim().length < 10} onClick={undo}><RotateCcw size={16} /> Hoàn tác an toàn</button></>}>
      <div className="class-transfer-undo"><AlertTriangle size={24} /><div><strong>{undoing.studentName}: {undoing.targetClassCode} → {undoing.sourceClassCode}</strong><p>Chỉ hoàn tác được khi chưa phát sinh điểm, điểm danh, bài nộp hoặc đơn nghỉ sau lần chuyển.</p></div></div>
      <Field label="Lý do hoàn tác"><textarea rows={4} maxLength={1000} value={undoReason} onChange={(event) => setUndoReason(event.target.value)} placeholder="Nhập lý do tối thiểu 10 ký tự" /></Field>
    </Modal>}
  </div>;
}

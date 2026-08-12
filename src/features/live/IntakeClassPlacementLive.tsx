import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRightLeft, CheckCircle2, GraduationCap, LockKeyhole,
  RotateCcw, Sparkles, UsersRound,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, IntakePlacementCandidate, IntakePlacementPreview, IntakePlacementRun,
} from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';
import {
  closedAcademicYears, operationalAcademicYears, operationalYearLabel,
  resolveOperationalAcademicYearId,
} from './academicYearSelection';
import { confirmAction } from '../../components/confirmAction';

const genderLabel = (gender?: string | null) => gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác';

export function IntakeClassPlacementLive({ onApplied }: { onApplied?: () => void } = {}) {
  const years = useApi<AcademicYear[]>('/academicYears');
  const toast = useToast();
  const [academicYearId, setAcademicYearId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('K10');
  const [maxStudents, setMaxStudents] = useState(40);
  const [desiredClasses, setDesiredClasses] = useState(0);
  const [autoCreate, setAutoCreate] = useState(true);
  const [balanceGender, setBalanceGender] = useState(true);
  const [studyShift, setStudyShift] = useState('MORNING');
  const [locks, setLocks] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<IntakePlacementPreview | null>(null);
  const [previewStale, setPreviewStale] = useState(false);
  const [busy, setBusy] = useState(false);
  const workingYears = useMemo(() => operationalAcademicYears(years.data ?? []), [years.data]);
  const archivedYears = useMemo(() => closedAcademicYears(years.data ?? []), [years.data]);
  const selectedYear = workingYears.find((year) => year.id === academicYearId);

  useEffect(() => {
    if (!years.data) return;
    const nextId = resolveOperationalAcademicYearId(years.data, academicYearId);
    if (nextId === academicYearId) return;
    setAcademicYearId(nextId);
    setPreview(null);
    setLocks({});
  }, [academicYearId, years.data]);

  const candidates = useApi<IntakePlacementCandidate[]>(selectedYear
    ? `/intake-class-placement/candidates?academicYearId=${encodeURIComponent(academicYearId)}&gradeLevel=${encodeURIComponent(gradeLevel)}` : null);
  const history = useApi<IntakePlacementRun[]>(selectedYear
    ? `/intake-class-placement/history?academicYearId=${encodeURIComponent(academicYearId)}&gradeLevel=${encodeURIComponent(gradeLevel)}` : null);
  const lockedPlacements = useMemo(() => Object.entries(locks).map(([studentId, classCode]) => ({ studentId, classCode })), [locks]);
  const payload = () => ({ academicYearId, gradeLevel, maxStudentsPerClass: maxStudents,
    desiredClassCount: desiredClasses, autoCreateClasses: autoCreate, balanceGender,
    defaultStudyShift: studyShift, lockedPlacements });

  const createPreview = async () => {
    if (!academicYearId) return;
    setBusy(true);
    try {
      const result = await api.post<IntakePlacementPreview>('/intake-class-placement/preview', payload());
      setPreview(result);
      setPreviewStale(false);
      if (result.candidateCount === 0) toast.show('err', 'Chưa có học sinh đầu cấp đang chờ phân lớp');
      else toast.show('ok', `Đã tạo phương án cho ${result.assignedCount}/${result.candidateCount} học sinh`);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const moveStudent = (studentId: string, classCode: string) => {
    setLocks((current) => ({ ...current, [studentId]: classCode }));
    setPreviewStale(true);
  };

  const apply = async () => {
    if (!preview || preview.unassignedCount > 0) return;
    if (!await confirmAction({ title: `Phân lớp ${preview.assignedCount} học sinh?`, description: 'Hệ thống sẽ cập nhật hồ sơ, lớp hiện tại và lịch sử nhập học theo phương án đang xem.', confirmLabel: 'Xác nhận phân lớp' })) return;
    setBusy(true);
    try {
      const result = await api.post<{ assignedCount: number; createdClassCount: number }>('/intake-class-placement/apply', payload());
      toast.show('ok', `Đã phân lớp ${result.assignedCount} học sinh${result.createdClassCount ? ` và tạo ${result.createdClassCount} lớp mới` : ''}`);
      setPreview(null); setLocks({}); candidates.reload(); history.reload(); onApplied?.();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const undo = async () => {
    if (!await confirmAction({ title: 'Hoàn tác lần phân lớp gần nhất?', description: 'Học sinh sẽ trở về lớp trước đó hoặc trạng thái chưa phân lớp; các lớp tự tạo trong lần chạy này có thể bị gỡ.', confirmLabel: 'Hoàn tác', tone: 'warning' })) return;
    setBusy(true);
    try {
      const result = await api.post<{ restoredStudents: number; removedClasses: number }>('/intake-class-placement/undo-last', { academicYearId, gradeLevel });
      toast.show('ok', `Đã hoàn tác ${result.restoredStudents} học sinh và gỡ ${result.removedClasses} lớp tự tạo`);
      setPreview(null); setLocks({}); candidates.reload(); history.reload(); onApplied?.();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const activeRun = history.data?.find((run) => run.status === 'APPLIED');

  return <Section title="Phân lớp đầu cấp" subtitle="Tự động cân bằng học sinh mới vào lớp 10, luôn xem trước khi lưu" wide>
    {toast.node}
    <div className="intake-flow-head">
      <div><span>1</span><strong>Chọn danh sách</strong><small>Niên khóa và khối đầu cấp</small></div>
      <div className={preview ? 'done' : ''}><span>2</span><strong>Tạo phương án</strong><small>Cân bằng sĩ số và giới tính</small></div>
      <div className={activeRun ? 'done' : ''}><span>3</span><strong>Xác nhận</strong><small>Lưu lớp và lịch sử phân lớp</small></div>
    </div>

    <div className="intake-config-card">
      <div className="intake-config-title"><GraduationCap size={23} /><div><strong>Thiết lập phân lớp</strong><small>Hệ thống chỉ lấy học sinh chưa được xếp lớp trong năm học đã chọn</small></div></div>
      {archivedYears.length > 0 && <div className="intake-archived-year-note"><LockKeyhole size={18} /><div><strong>Năm học đã đóng được chuyển sang kho lưu trữ</strong><span>{archivedYears.map((year) => year.code).join(', ')} chỉ dùng để tra cứu, không xuất hiện trong biểu mẫu phân lớp.</span></div></div>}
      <div className="intake-config-grid">
        <label><span>Năm học đang thao tác</span><select value={academicYearId} disabled={!workingYears.length} onChange={(event) => { setAcademicYearId(event.target.value); setPreview(null); setLocks({}); }}>
          {!workingYears.length && <option value="">Chưa có năm học khả dụng</option>}
          {workingYears.map((year) => <option key={year.id} value={year.id}>{operationalYearLabel(year)}</option>)}
        </select></label>
        <label><span>Khối cần phân lớp</span><select value={gradeLevel} onChange={(event) => { setGradeLevel(event.target.value); setPreview(null); setLocks({}); }}><option value="K10">Khối 10 (đầu cấp)</option><option value="K11">Khối 11</option><option value="K12">Khối 12</option></select></label>
        <label><span>Sĩ số tối đa/lớp</span><input type="number" min={20} max={60} value={maxStudents} onChange={(event) => { setMaxStudents(Number(event.target.value)); setPreview(null); }} /></label>
        <label><span>Số lớp mong muốn</span><input type="number" min={0} max={30} value={desiredClasses} onChange={(event) => { setDesiredClasses(Number(event.target.value)); setPreview(null); }} /><small>Nhập 0 để hệ thống tự tính</small></label>
        <label><span>Ca mặc định cho lớp mới</span><select value={studyShift} onChange={(event) => setStudyShift(event.target.value)}><option value="MORNING">Ca sáng</option><option value="AFTERNOON">Ca chiều</option></select></label>
      </div>
      <div className="intake-options">
        <label><input type="checkbox" checked={autoCreate} onChange={(event) => { setAutoCreate(event.target.checked); setPreview(null); }} /><span><strong>Tự tạo lớp còn thiếu</strong><small>Dùng mã 10A1, 10A2… theo thứ tự chưa sử dụng</small></span></label>
        <label><input type="checkbox" checked={balanceGender} onChange={(event) => { setBalanceGender(event.target.checked); setPreview(null); }} /><span><strong>Cân bằng giới tính</strong><small>Giảm chênh lệch nam/nữ giữa các lớp</small></span></label>
      </div>
      <div className="intake-config-actions">
        <div><UsersRound size={18} /><strong>{!selectedYear ? 'Chưa có năm học để thao tác' : candidates.loading ? 'Đang kiểm tra…' : `${candidates.data?.length ?? 0} học sinh chờ phân lớp`}</strong></div>
        <button className="live-btn primary" disabled={busy || !selectedYear} onClick={createPreview}><Sparkles size={17} /> {busy ? 'Đang tính toán…' : preview ? 'Tính lại phương án' : 'Tạo bản xem trước'}</button>
      </div>
    </div>

    {preview && <>
      <div className="intake-summary-grid">
        <article><small>Học sinh đầu vào</small><strong>{preview.candidateCount}</strong><span>Chưa thuộc lớp trong năm học</span></article>
        <article><small>Số lớp cần dùng</small><strong>{preview.requiredClassCount}</strong><span>{preview.newClassCount ? `Tạo mới ${preview.newClassCount} lớp` : 'Dùng lớp hiện có'}</span></article>
        <article className={preview.unassignedCount ? 'warning' : 'success'}><small>Kết quả dự kiến</small><strong>{preview.assignedCount}/{preview.candidateCount}</strong><span>{preview.unassignedCount ? `${preview.unassignedCount} em cần xử lý` : 'Tất cả đã có lớp'}</span></article>
      </div>
      {preview.warnings.length > 0 && <div className="intake-warning"><AlertTriangle size={20} /><div>{preview.warnings.map((warning) => <span key={warning}>{warning}</span>)}</div></div>}
      <div className="intake-plan-heading"><div><strong>Phương án phân lớp</strong><span>Có thể đổi lớp từng học sinh; sau khi đổi, hãy cập nhật phương án trước khi xác nhận.</span></div><button className={`live-btn ${previewStale ? 'primary' : 'subtle'}`} onClick={createPreview} disabled={busy}><ArrowRightLeft size={16} /> {previewStale ? 'Áp dụng điều chỉnh lớp' : 'Tính lại phương án'}</button></div>
      <div className="intake-class-grid">
        {preview.classes.map((classPlan) => <article key={classPlan.classId} className="intake-class-card">
          <header><div><span>{classPlan.newClass ? 'Lớp sẽ tạo mới' : 'Lớp hiện có'}</span><strong>{classPlan.classCode}</strong></div><b>{classPlan.existingStudents + classPlan.assignedStudents}/{classPlan.capacity}</b></header>
          <div className="intake-balance"><span>Nam <b>{classPlan.maleCount}</b></span><span>Nữ <b>{classPlan.femaleCount}</b></span><span>Khác <b>{classPlan.otherCount}</b></span></div>
          <div className="intake-capacity"><i style={{ width: `${Math.min(100, ((classPlan.existingStudents + classPlan.assignedStudents) / classPlan.capacity) * 100)}%` }} /></div>
          <div className="intake-student-list">
            {classPlan.students.map((student) => <div key={student.id}><span className="intake-student-avatar">{student.fullName?.trim().slice(-1) || 'H'}</span><div><strong>{student.fullName}</strong><small>{student.studentCode || 'Chưa có mã'} · {genderLabel(student.gender)}</small></div>
              <select aria-label={`Chọn lớp cho ${student.fullName}`} value={locks[student.id] || classPlan.classCode} onChange={(event) => moveStudent(student.id, event.target.value)}>
                {preview.classes.map((target) => <option key={target.classCode} value={target.classCode}>{target.classCode}</option>)}
              </select>{(student.locked || locks[student.id]) && <LockKeyhole size={14} />}</div>)}
            {classPlan.students.length === 0 && <p>Chưa có học sinh mới trong lớp này.</p>}
          </div>
        </article>)}
      </div>
      <div className={`intake-confirm-bar ${previewStale ? 'needs-update' : ''}`}><div>{previewStale ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}<span><strong>{previewStale ? 'Có thay đổi chưa cập nhật' : 'Kiểm tra lần cuối trước khi lưu'}</strong>{previewStale ? 'Hãy nhấn “Áp dụng điều chỉnh lớp” để hệ thống kiểm tra lại sĩ số.' : preview.unassignedCount ? 'Cần xử lý hết học sinh chưa có lớp.' : 'Phương án hợp lệ và có thể xác nhận.'}</span></div><button className="live-btn primary" disabled={busy || previewStale || preview.unassignedCount > 0 || preview.assignedCount === 0} onClick={apply}><CheckCircle2 size={17} /> Xác nhận phân lớp</button></div>
    </>}

    <div className="intake-history">
      <div><strong>Lịch sử thực hiện</strong><span>Mỗi lần xác nhận đều được lưu để kiểm tra và hoàn tác.</span></div>
      <Async state={history} allowEmpty>{(rows) => rows.length ? <div className="intake-history-list">{rows.map((run) => <article key={run.id}><div><strong>{run.assignedCount} học sinh</strong><small>{new Date(run.createdAt).toLocaleString('vi-VN')}</small></div><StatusPill value={run.status} /></article>)}</div> : <small>Chưa có lần phân lớp nào.</small>}</Async>
      {activeRun && <button className="live-btn subtle danger" disabled={busy} onClick={undo}><RotateCcw size={16} /> Hoàn tác lần gần nhất</button>}
    </div>
  </Section>;
}

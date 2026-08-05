import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, CheckCircle2, Clock3, FileText, History, Send, ShieldCheck, Undo2, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { useHashString } from '../../api/urlState';
import type { AcademicYear, Semester, TeacherLoadRegistration, TeacherScheduleRestriction } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, useToast } from './common';
import { Field, Modal } from './Modal';

const DAYS = [['MON', 'Thứ 2'], ['TUE', 'Thứ 3'], ['WED', 'Thứ 4'], ['THU', 'Thứ 5'], ['FRI', 'Thứ 6']] as const;
const SHIFTS = [['MORNING', 'Ca sáng'], ['AFTERNOON', 'Ca chiều']] as const;

function useSemesterScope() {
  const semesters = useApi<Semester[]>('/semesters');
  const years = useApi<AcademicYear[]>('/academicYears');
  const [semesterId, setSemesterId] = useHashString('hoc_ky', '');
  const options = useMemo(() => (semesters.data || []).filter((semester) => semester.status !== 'CLOSED'
    && (years.data || []).some((year) => year.id === semester.academicYearId && ['ACTIVE', 'PLANNED'].includes(year.status))), [semesters.data, years.data]);
  useEffect(() => {
    if (options.some((item) => item.id === semesterId)) return;
    const preferred = options.find((item) => item.status === 'ACTIVE') || options[0];
    if (preferred) setSemesterId(preferred.id);
  }, [options, semesterId, setSemesterId]);
  const label = (semester: Semester) => {
    const year = years.data?.find((item) => item.id === semester.academicYearId);
    return `${year?.code || 'Năm học'} · ${semester.name} · ${semester.status === 'ACTIVE' ? 'Đang hoạt động' : 'Sắp diễn ra'}`;
  };
  return { options, semesterId, setSemesterId, label, selected: options.find((item) => item.id === semesterId) };
}

function slotLabel(slot: string) {
  const [shift, day, period] = slot.split(':');
  return `${SHIFTS.find(([value]) => value === shift)?.[1] || shift} · ${DAYS.find(([value]) => value === day)?.[1] || day} · Tiết ${period}`;
}

function restrictionTone(status: string): 'green' | 'red' | 'blue' | 'orange' {
  if (status === 'APPROVED') return 'green';
  if (['REJECTED', 'REVOKED'].includes(status)) return 'red';
  if (status === 'NEEDS_INFO') return 'orange';
  return 'blue';
}

export function TeacherScheduleRestrictionLive() {
  const scope = useSemesterScope();
  const load = useApi<TeacherLoadRegistration>(scope.semesterId ? `/me/teacher-load-registration?semesterId=${encodeURIComponent(scope.semesterId)}` : null);
  const requests = useApi<TeacherScheduleRestriction[]>(scope.semesterId ? `/me/schedule-restriction-requests?semesterId=${encodeURIComponent(scope.semesterId)}` : null);
  const toast = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<TeacherScheduleRestriction | null>(null);
  const [shift, setShift] = useState<'MORNING' | 'AFTERNOON'>('MORNING');
  const [slots, setSlots] = useState<string[]>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const openForm = (item?: TeacherScheduleRestriction) => {
    setEditing(item || null);
    setSlots(item?.restrictedSlots || []);
    setFrom(item?.effectiveFrom || scope.selected?.startDate || '');
    setTo(item?.effectiveTo || scope.selected?.endDate || '');
    setReason(item?.reason || '');
    setEvidenceUrl(item?.evidenceUrl || '');
    setShowForm(true);
  };
  const toggleSlot = (value: string) => setSlots((current) => current.includes(value)
    ? current.filter((item) => item !== value) : [...current, value]);
  const save = async () => {
    if (!scope.semesterId || !from || !to || !slots.length || reason.trim().length < 10) return;
    setBusy(true);
    try {
      const body = { semesterId: scope.semesterId, restrictedSlots: slots, effectiveFrom: from, effectiveTo: to, reason: reason.trim(), evidenceUrl: evidenceUrl.trim() || null };
      if (editing) await api.put(`/me/schedule-restriction-requests/${editing.id}`, body);
      else await api.post('/me/schedule-restriction-requests', body);
      toast.show('ok', editing ? 'Đã cập nhật và gửi lại đề nghị' : 'Đã gửi đề nghị để Giáo vụ xem xét');
      setShowForm(false);
      await requests.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể gửi đề nghị'); }
    finally { setBusy(false); }
  };
  const withdraw = async (item: TeacherScheduleRestriction) => {
    setBusy(true);
    try {
      await api.post(`/me/schedule-restriction-requests/${item.id}/withdraw`);
      toast.show('ok', 'Đã rút đề nghị');
      await requests.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể rút đề nghị'); }
    finally { setBusy(false); }
  };

  return <div className="schedule-restriction-page">
    <Section title="Đề nghị hạn chế lịch dạy" subtitle="Chỉ dùng khi có khung giờ thực sự không thể giảng dạy; Giáo vụ phải duyệt trước khi hệ thống áp dụng" wide
      action={<button className="live-btn primary" type="button" onClick={() => openForm()}><Send size={16} /> Tạo đề nghị</button>}>
      <div className="restriction-rule-banner"><ShieldCheck size={24} /><div><strong>Định mức do hệ thống quản lý, không phải nội dung đăng ký</strong><span>Giáo viên toàn thời gian được xem là sẵn sàng trong giờ làm việc. Chỉ ngoại lệ đã duyệt mới khóa khung giờ khi phân công và xếp lịch.</span></div></div>
      <label className="restriction-semester"><span>Phạm vi học kỳ</span><select value={scope.semesterId} onChange={(event) => scope.setSemesterId(event.target.value)}>{scope.options.map((item) => <option key={item.id} value={item.id}>{scope.label(item)}</option>)}</select></label>
      {load.data && <div className="restriction-load-summary">
        <div><span>Định mức cơ sở</span><strong>{load.data.baseWeeklyPeriods} tiết/tuần</strong></div>
        <div><span>Chỉ tiêu đứng lớp</span><strong>{load.data.targetDirectWeeklyPeriods} tiết/tuần</strong></div>
        <div><span>Đã phân công</span><strong>{load.data.assignedWeeklyPeriods} tiết/tuần</strong></div>
        <div><span>Cân đối</span><strong>{load.data.targetBalancePeriods < 0 ? `Thiếu ${Math.abs(load.data.targetBalancePeriods)}` : load.data.targetBalancePeriods === 0 ? 'Đủ chỉ tiêu' : `Vượt ${load.data.targetBalancePeriods}`}</strong></div>
      </div>}
      <Async state={requests} empty="Chưa có đề nghị hạn chế lịch dạy trong học kỳ này" allowEmpty>
        {(rows) => rows.length ? <div className="restriction-list">{rows.map((item) => <article key={item.id}>
          <header><div><Clock3 size={19} /><span><strong>{item.restrictedSlots.length} khung giờ đề nghị hạn chế</strong><small>{fmtDate(item.effectiveFrom)} – {fmtDate(item.effectiveTo)} · gửi {fmtDateTime(item.submittedAt)}</small></span></div><Badge tone={restrictionTone(item.status)}><StatusPill value={item.status} /></Badge></header>
          <p>{item.reason}</p><div className="restriction-slot-chips">{item.restrictedSlots.map((value) => <span key={value}>{slotLabel(value)}</span>)}</div>
          {item.decisionNote && <div className="restriction-decision"><FileText size={16} /><span><strong>Phản hồi của Giáo vụ</strong>{item.decisionNote}</span></div>}
          {item.revokeReason && <div className="restriction-decision is-warning"><AlertTriangle size={16} /><span><strong>Lý do thu hồi</strong>{item.revokeReason}</span></div>}
          <footer>{['PENDING', 'NEEDS_INFO'].includes(item.status) && <><button className="live-btn subtle" disabled={busy} onClick={() => openForm(item)}>Chỉnh sửa</button><button className="live-btn ghost" disabled={busy} onClick={() => withdraw(item)}><Undo2 size={15} /> Rút đề nghị</button></>}</footer>
        </article>)}</div> : <div className="restriction-empty"><CalendarRange size={28} /><strong>Không có ngoại lệ lịch dạy</strong><span>Hệ thống đang xem bạn sẵn sàng trong toàn bộ khung làm việc của học kỳ.</span></div>}
      </Async>
    </Section>
    {showForm && <Modal title={editing ? 'Bổ sung đề nghị hạn chế lịch dạy' : 'Tạo đề nghị hạn chế lịch dạy'} size="wide" onClose={() => !busy && setShowForm(false)} footer={<><button className="live-btn ghost" disabled={busy} onClick={() => setShowForm(false)}>Hủy</button><button className="live-btn primary" disabled={busy || !slots.length || !from || !to || reason.trim().length < 10} onClick={save}><Send size={15} /> {busy ? 'Đang gửi…' : 'Gửi Giáo vụ duyệt'}</button></>}>
      <div className="restriction-form-note"><AlertTriangle size={19} /><span><strong>Đây là yêu cầu ngoại lệ</strong>Không dùng để chọn ngày nghỉ theo sở thích. Hãy ghi đúng khoảng thời gian, lý do và minh chứng nếu có.</span></div>
      <div className="restriction-date-grid"><Field label="Hiệu lực từ *"><input type="date" value={from} min={scope.selected?.startDate} max={scope.selected?.endDate} onChange={(event) => setFrom(event.target.value)} /></Field><Field label="Hiệu lực đến *"><input type="date" value={to} min={scope.selected?.startDate} max={scope.selected?.endDate} onChange={(event) => setTo(event.target.value)} /></Field></div>
      <div className="restriction-shift-tabs">{SHIFTS.map(([value, label]) => <button type="button" key={value} className={shift === value ? 'active' : ''} onClick={() => setShift(value)}>{label}</button>)}</div>
      <div className="restriction-slot-grid"><span />{[1, 2, 3, 4, 5].map((period) => <strong key={period}>Tiết {period}</strong>)}{DAYS.map(([day, label]) => [<b key={`${day}-label`}>{label}</b>, ...[1, 2, 3, 4, 5].map((period) => { const value = `${shift}:${day}:${period}`; return <button type="button" key={value} className={slots.includes(value) ? 'selected' : ''} onClick={() => toggleSlot(value)}>{slots.includes(value) ? 'Không thể dạy' : 'Có thể dạy'}</button>; })])}</div>
      <Field label="Lý do cụ thể *"><textarea minLength={10} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ví dụ: điều trị y tế định kỳ theo lịch bệnh viện…" /></Field>
      <Field label="Liên kết minh chứng (nếu có)"><input type="url" value={evidenceUrl} onChange={(event) => setEvidenceUrl(event.target.value)} placeholder="https://…" /></Field>
    </Modal>}
  </div>;
}

export function AcademicScheduleRestrictionPanel({ semesterId }: { semesterId: string }) {
  const [status, setStatus] = useState('PENDING');
  const requests = useApi<TeacherScheduleRestriction[]>(semesterId ? `/schedule-restriction-requests?semesterId=${encodeURIComponent(semesterId)}${status ? `&status=${status}` : ''}` : null);
  const toast = useToast();
  const [target, setTarget] = useState<TeacherScheduleRestriction | null>(null);
  const [action, setAction] = useState<'APPROVED' | 'REJECTED' | 'NEEDS_INFO' | 'REVOKED'>('APPROVED');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const decide = async () => {
    if (!target) return;
    setBusy(true);
    try {
      if (action === 'REVOKED') await api.post(`/schedule-restriction-requests/${target.id}/revoke`, { reason: note.trim() });
      else await api.put(`/schedule-restriction-requests/${target.id}/review`, { action, decisionNote: note.trim() || null });
      toast.show('ok', action === 'APPROVED' ? 'Đã duyệt ngoại lệ lịch dạy' : action === 'REVOKED' ? 'Đã thu hồi ngoại lệ' : 'Đã gửi phản hồi cho giáo viên');
      setTarget(null); setNote(''); await requests.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể xử lý đề nghị'); }
    finally { setBusy(false); }
  };
  const open = (item: TeacherScheduleRestriction, next: typeof action) => { setTarget(item); setAction(next); setNote(''); };
  return <div className="academic-restriction-panel">
    <header><div><ShieldCheck size={21} /><span><strong>Ngoại lệ lịch dạy cần xử lý</strong><small>Chỉ yêu cầu đã duyệt mới trở thành ràng buộc cứng của thời khóa biểu.</small></span></div><label><span>Trạng thái</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="PENDING">Chờ duyệt</option><option value="NEEDS_INFO">Cần bổ sung</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Đã từ chối</option><option value="REVOKED">Đã thu hồi</option><option value="">Tất cả</option></select></label></header>
    <Async state={requests} empty="Không có đề nghị ở trạng thái đã chọn" allowEmpty>{(rows) => rows.length ? <div className="academic-restriction-list">{rows.map((item) => <article key={item.id}><div><strong>{item.teacherName}</strong><small>{item.teacherCode || 'Giáo viên'} · {item.restrictedSlots.length} khung · {fmtDate(item.effectiveFrom)}–{fmtDate(item.effectiveTo)}</small><p>{item.reason}</p></div><div className="restriction-review-actions"><StatusPill value={item.status} />{item.status === 'PENDING' && <><button className="icon-btn success" title="Duyệt" aria-label={`Duyệt đề nghị của ${item.teacherName}`} onClick={() => open(item, 'APPROVED')}><CheckCircle2 size={17} /></button><button className="icon-btn" title="Yêu cầu bổ sung" aria-label={`Yêu cầu ${item.teacherName} bổ sung`} onClick={() => open(item, 'NEEDS_INFO')}><History size={17} /></button><button className="icon-btn danger" title="Từ chối" aria-label={`Từ chối đề nghị của ${item.teacherName}`} onClick={() => open(item, 'REJECTED')}><XCircle size={17} /></button></>}{item.status === 'APPROVED' && <button className="live-btn subtle" onClick={() => open(item, 'REVOKED')}>Thu hồi</button>}</div></article>)}</div> : <div className="restriction-empty"><CheckCircle2 size={26} /><strong>Không có việc cần xử lý</strong><span>Hãy đổi bộ lọc để xem lịch sử đề nghị.</span></div>}</Async>
    {target && <Modal title={action === 'APPROVED' ? 'Duyệt ngoại lệ lịch dạy' : action === 'REVOKED' ? 'Thu hồi ngoại lệ lịch dạy' : action === 'NEEDS_INFO' ? 'Yêu cầu bổ sung thông tin' : 'Từ chối đề nghị'} onClose={() => !busy && setTarget(null)} footer={<><button className="live-btn ghost" disabled={busy} onClick={() => setTarget(null)}>Hủy</button><button className={`live-btn ${action === 'REJECTED' || action === 'REVOKED' ? 'danger' : 'primary'}`} disabled={busy || (action !== 'APPROVED' && note.trim().length < 5)} onClick={decide}>Xác nhận</button></>}><div className="restriction-review-context"><strong>{target.teacherName}</strong><span>{target.restrictedSlots.length} khung giờ · {fmtDate(target.effectiveFrom)}–{fmtDate(target.effectiveTo)}</span><p>{target.reason}</p></div><Field label={action === 'APPROVED' ? 'Ghi chú quyết định (không bắt buộc)' : 'Phản hồi/lý do *'}><textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} placeholder="Ghi rõ căn cứ xử lý…" /></Field></Modal>}
  </div>;
}

import { useState } from 'react';
import { CalendarCheck2, CheckCircle2, CircleX, Clock3, Plus, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { LeaveRequest } from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, useToast } from './common';

export function LeaveRequestsLive({ actor }: { actor: 'student' | 'parent' | 'teacher' }) {
  const requests = useApi<LeaveRequest[]>('/leave-requests');
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ startDate: today, endDate: today, reason: '' });

  const create = async () => {
    if (!form.reason.trim()) return toast.show('err', 'Vui lòng nhập lý do xin nghỉ');
    setBusy(true);
    try {
      await api.post('/leave-requests', form);
      setForm({ startDate: today, endDate: today, reason: '' });
      toast.show('ok', 'Đã gửi đơn để phụ huynh xác nhận');
      requests.reload();
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const decide = async (id: string, action: string, success: string) => {
    setBusy(true);
    try {
      await api.post(`/leave-requests/${id}/${action}`, { note: notes[id] || null });
      toast.show('ok', success);
      requests.reload();
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const title = actor === 'student' ? 'Xin nghỉ học' : actor === 'parent' ? 'Xác nhận đơn xin nghỉ' : 'Duyệt đơn xin nghỉ';
  const subtitle = actor === 'student'
    ? 'Tạo đơn và theo dõi đủ hai bước xác nhận của phụ huynh, giáo viên chủ nhiệm'
    : actor === 'parent' ? 'Kiểm tra lý do và xác nhận trước khi chuyển giáo viên chủ nhiệm'
      : 'Chỉ xử lý đơn của lớp chủ nhiệm đã được phụ huynh xác nhận';
  const actionable = (item: LeaveRequest) => actor === 'parent' ? item.status === 'PENDING_PARENT'
    : actor === 'teacher' ? item.status === 'PENDING_HOMEROOM' : ['PENDING_PARENT', 'PENDING_HOMEROOM'].includes(item.status);

  return <Section title={title} subtitle={subtitle} wide>
    {toast.node}
    {actor === 'student' && <div className="leave-composer">
      <div className="leave-composer-title"><span><Plus size={18} /></span><div><strong>Tạo đơn xin nghỉ</strong><small>Đơn chỉ có hiệu lực sau khi GVCN phê duyệt</small></div></div>
      <label><span>Từ ngày</span><input className="live-input" type="date" min={today} value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value, endDate: event.target.value > form.endDate ? event.target.value : form.endDate })} /></label>
      <label><span>Đến ngày</span><input className="live-input" type="date" min={form.startDate} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></label>
      <label className="leave-reason"><span>Lý do</span><textarea className="live-input" placeholder="Trình bày rõ lý do và thông tin cần thiết..." value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
      <button className="live-btn" disabled={busy} onClick={create}><CalendarCheck2 size={15} /> Gửi đơn</button>
    </div>}

    <Async paginate state={requests} empty="Chưa có đơn xin nghỉ" itemLabel="đơn xin nghỉ">
      {(items) => <div className="leave-request-list">{items.map((item) => <article className="leave-request-card" key={item.id}>
        <div className="leave-request-main">
          <div className="leave-request-date"><CalendarCheck2 size={19} /><strong>{fmtDate(item.startDate)}</strong><span>{item.startDate === item.endDate ? 'Một ngày' : `đến ${fmtDate(item.endDate)}`}</span></div>
          <div className="leave-request-info"><div><strong>{item.studentName}</strong><small>{item.classCode}</small><StatusPill value={item.status} /></div><p>{item.reason}</p>
            <small><Clock3 size={13} /> Gửi lúc {fmtDateTime(item.createdAt)}{item.parentName ? ` · Phụ huynh: ${item.parentName}` : ''}{item.homeroomTeacherName ? ` · GVCN: ${item.homeroomTeacherName}` : ''}</small>
            {item.decisionNote && <em>Phản hồi: {item.decisionNote}</em>}
          </div>
        </div>
        {actionable(item) && <div className="leave-request-actions">
          {actor !== 'student' && <input className="live-input" placeholder="Ghi chú phản hồi (không bắt buộc)" value={notes[item.id] || ''} onChange={(event) => setNotes({ ...notes, [item.id]: event.target.value })} />}
          {actor === 'parent' && <><button className="live-btn" disabled={busy} onClick={() => decide(item.id, 'parent-confirm', 'Đã xác nhận và chuyển đơn tới GVCN')}><CheckCircle2 size={14} /> Xác nhận</button><button className="live-btn danger" disabled={busy} onClick={() => decide(item.id, 'parent-reject', 'Đã từ chối xác nhận')}><CircleX size={14} /> Từ chối</button></>}
          {actor === 'teacher' && <><button className="live-btn" disabled={busy} onClick={() => decide(item.id, 'approve', 'Đã duyệt đơn xin nghỉ')}><CheckCircle2 size={14} /> Duyệt</button><button className="live-btn danger" disabled={busy} onClick={() => decide(item.id, 'reject', 'Đã từ chối đơn xin nghỉ')}><CircleX size={14} /> Từ chối</button></>}
          {actor === 'student' && <button className="live-btn danger" disabled={busy} onClick={() => decide(item.id, 'cancel', 'Đã hủy đơn')}><X size={14} /> Hủy đơn</button>}
        </div>}
      </article>)}</div>}
    </Async>
  </Section>;
}

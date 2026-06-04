import { useState } from 'react';
import { Plus, Trash2, AlertTriangle, CalendarDays, CalendarOff } from 'lucide-react';
import { api, ApiError } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { TimetableSlot, SchoolClass, Subject, Room, ApiUser } from '../../api/types';
import { Section, FunctionTabs } from '../../components/ui';
import { Async, useToast, fmtDate, DAYS, DAY_LABEL } from './common';
import { Modal, Field } from './Modal';

const PERIODS = [1, 2, 3, 4, 5, 6];
const PERIOD_TIME: Record<number, [string, string]> = {
  1: ['07:00', '07:45'], 2: ['07:50', '08:35'], 3: ['08:45', '09:30'],
  4: ['09:35', '10:20'], 5: ['10:25', '11:10'], 6: ['13:30', '14:15'],
};

/* ===== A3: Xếp thời khóa biểu (editor) ===== */
function TimetableEditor() {
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const rooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const toast = useToast();

  const [classId, setClassId] = useState('');
  const slots = useApi<TimetableSlot[]>(classId ? `/timetableSlots?classId=${classId}` : null);

  const [show, setShow] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blank = { dayOfWeek: 'MON', periodNo: 1, subjectId: '', teacherId: '', roomCode: '', startTime: '07:00', endTime: '07:45' };
  const [form, setForm] = useState({ ...blank });

  const cellOf = (day: string, p: number) => (slots.data ?? []).find((s) => s.dayOfWeek === day && s.periodNo === p);

  const openAdd = (day: string, period: number) => {
    const [st, en] = PERIOD_TIME[period] ?? ['', ''];
    setForm({ ...blank, dayOfWeek: day, periodNo: period, startTime: st, endTime: en });
    setConflict(null);
    setShow(true);
  };
  const setF = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.subjectId || !form.teacherId) { setConflict('Vui lòng chọn môn và giáo viên.'); return; }
    setBusy(true); setConflict(null);
    try {
      await api.post('/timetableSlots', { ...form, classId });
      toast.show('ok', 'Đã thêm tiết vào TKB');
      setShow(false);
      slots.reload();
    } catch (e: any) {
      // Xung đột (409) → giữ popup, hiển thị để admin đổi GV/phòng/tiết và thử lại
      if (e instanceof ApiError && e.status === 409) setConflict(e.message);
      else setConflict(e.message || 'Lỗi không xác định');
    } finally { setBusy(false); }
  };

  const removeSlot = async (s: TimetableSlot) => {
    if (!confirm(`Xóa tiết ${s.subjectName} (${DAY_LABEL[s.dayOfWeek]} tiết ${s.periodNo})?`)) return;
    try { await api.del(`/timetableSlots/${s.id}`); toast.show('ok', 'Đã xóa tiết'); slots.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Xếp thời khóa biểu (A3)" subtitle="Chọn lớp → bấm ô trống để thêm tiết · trùng GV/phòng/lớp sẽ cảnh báo để xử lý ngay" wide>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select grow" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Chọn lớp để xếp TKB —</option>
          {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
        </select>
      </div>

      {!classId ? (
        <div className="live-loading">Chọn một lớp để bắt đầu xếp thời khóa biểu.</div>
      ) : (
        <Async state={slots} empty="">
          {() => (
            <div className="timetable" role="table" style={{ display: 'grid', gridTemplateColumns: '70px repeat(6, minmax(0, 1fr))', gap: 6 }}>
              <div className="time-head" />
              {DAYS.map((d) => <div key={d} className="time-head">{DAY_LABEL[d]}</div>)}
              {PERIODS.map((p) => [
                <div key={`p${p}`} className="time-period">Tiết {p}</div>,
                ...DAYS.map((d) => {
                  const s = cellOf(d, p);
                  return (
                    <div key={`${d}${p}`} className="time-cell" style={{ cursor: s ? 'default' : 'pointer', minHeight: 56, position: 'relative' }}
                      onClick={() => { if (!s) openAdd(d, p); }}>
                      {s ? (
                        <>
                          <strong>{s.subjectName}</strong>
                          <small>{s.roomCode} · {s.teacherName}</small>
                          <button title="Xóa tiết" onClick={(e) => { e.stopPropagation(); removeSlot(s); }}
                            style={{ position: 'absolute', top: 2, right: 2, border: 'none', background: 'transparent', color: 'var(--red)', cursor: 'pointer' }}>
                            <Trash2 size={13} />
                          </button>
                        </>
                      ) : (
                        <span style={{ color: 'var(--muted)', fontSize: 18 }}>＋</span>
                      )}
                    </div>
                  );
                }),
              ])}
            </div>
          )}
        </Async>
      )}

      {show && (
        <Modal title={`Thêm tiết — ${DAY_LABEL[form.dayOfWeek]} tiết ${form.periodNo}`} onClose={() => setShow(false)}
          footer={<>
            <button className="live-btn ghost" onClick={() => setShow(false)}>Hủy</button>
            <button className="live-btn" disabled={busy} onClick={submit}><Plus size={15} /> {busy ? 'Đang lưu...' : 'Thêm tiết'}</button>
          </>}>
          {conflict && <div className="conflict-box"><AlertTriangle size={16} /><span>{conflict} — hãy đổi giáo viên / phòng / tiết rồi thử lại, hoặc xóa tiết trùng trên lưới.</span></div>}
          <div className="modal-grid2">
            <Field label="Thứ">
              <select value={form.dayOfWeek} onChange={(e) => setF('dayOfWeek', e.target.value)}>
                {DAYS.map((d) => <option key={d} value={d}>{DAY_LABEL[d]}</option>)}
              </select>
            </Field>
            <Field label="Tiết">
              <select value={form.periodNo} onChange={(e) => { const p = Number(e.target.value); const [st, en] = PERIOD_TIME[p] ?? ['', '']; setForm((f) => ({ ...f, periodNo: p, startTime: st, endTime: en })); }}>
                {PERIODS.map((p) => <option key={p} value={p}>Tiết {p}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Môn học">
            <select value={form.subjectId} onChange={(e) => setF('subjectId', e.target.value)}>
              <option value="">— Chọn môn —</option>
              {(subjects.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Giáo viên">
            <select value={form.teacherId} onChange={(e) => setF('teacherId', e.target.value)}>
              <option value="">— Chọn GV —</option>
              {(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}{t.mainSubject ? ` (${t.mainSubject})` : ''}</option>)}
            </select>
          </Field>
          <div className="modal-grid2">
            <Field label="Phòng">
              <select value={form.roomCode} onChange={(e) => setF('roomCode', e.target.value)}>
                <option value="">— Chọn phòng —</option>
                {(rooms.data ?? []).map((r) => <option key={r.id} value={r.code}>{r.code}{r.name ? ` — ${r.name}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Giờ (bắt đầu – kết thúc)">
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={form.startTime} onChange={(e) => setF('startTime', e.target.value)} placeholder="07:00" />
                <input value={form.endTime} onChange={(e) => setF('endTime', e.target.value)} placeholder="07:45" />
              </div>
            </Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

/* ===== Ngày nghỉ (cập nhật khi mưa bão / sự kiện) ===== */
interface Holiday { id: string; date: string; name: string; description?: string; }
function HolidayManager() {
  const holidays = useApi<Holiday[]>('/school-holidays');
  const toast = useToast();
  const [f, setF] = useState({ date: '', name: '' });

  const add = async () => {
    if (!f.date || !f.name) return toast.show('err', 'Nhập ngày + tên');
    try { await api.post('/school-holidays', f); toast.show('ok', 'Đã thêm ngày nghỉ'); setF({ date: '', name: '' }); holidays.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const remove = async (h: Holiday) => {
    if (!confirm(`Xóa ngày nghỉ "${h.name}" (${fmtDate(h.date)})?`)) return;
    try { await api.del(`/school-holidays/${h.id}`); toast.show('ok', 'Đã xóa'); holidays.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Ngày nghỉ / sự kiện" subtitle="Cập nhật ngày nghỉ đột xuất (mưa bão, sự kiện trường) · thêm & xóa" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input" type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
        <input className="live-input grow" placeholder="Lý do (vd: Nghỉ bão Yagi)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <button className="live-btn" onClick={add}><Plus size={15} /> Thêm ngày nghỉ</button>
      </div>
      <Async state={holidays} empty="Chưa có ngày nghỉ">
        {(l) => (
          <table className="live-table"><thead><tr><th>Ngày</th><th>Lý do</th><th></th></tr></thead>
            <tbody>{l.map((h) => (
              <tr key={h.id}><td><strong>{fmtDate(h.date)}</strong></td><td>{h.name}</td>
                <td><button className="live-btn danger" onClick={() => remove(h)}><Trash2 size={14} /> Xóa</button></td></tr>
            ))}</tbody></table>
        )}
      </Async>
    </Section>
  );
}

export function AdminTimetableLive() {
  return (
    <FunctionTabs tabs={[
      { id: 'tkb', label: 'Xếp TKB', Icon: CalendarDays, content: <TimetableEditor /> },
      { id: 'holiday', label: 'Ngày nghỉ', Icon: CalendarOff, content: <HolidayManager /> },
    ]} />
  );
}

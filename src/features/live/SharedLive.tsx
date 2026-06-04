import { useMemo, useState } from 'react';
import { Send, Plus, CheckCircle2, Upload, Bell, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { TimetableSlot, Assignment, Submission, Club, ClubRegistration, Notification, SchoolClass, Subject } from '../../api/types';
import { Section, Badge, StatusPill } from '../../components/ui';
import { Async, useToast, DAYS, DAY_LABEL, fmtDateTime, money } from './common';

/* ===== TKB tuần (B2/C2) ===== */
export function WeeklyTimetable({ path }: { path: string }) {
  const slots = useApi<TimetableSlot[]>(path);
  const maxPeriod = useMemo(() => Math.max(5, ...((slots.data || []).map((s) => s.periodNo))), [slots.data]);
  const cell = (day: string, p: number) => (slots.data || []).find((s) => s.dayOfWeek === day && s.periodNo === p);

  return (
    <Async state={slots} empty="Chưa có thời khóa biểu">
      {() => (
        <div className="timetable" role="table">
          <div className="time-head empty-cell" />
          {DAYS.map((d) => <div key={d} className="time-head">{DAY_LABEL[d]}</div>)}
          {Array.from({ length: maxPeriod }, (_, i) => i + 1).map((p) => [
            <div key={`p${p}`} className="time-period">Tiết {p}</div>,
            ...DAYS.map((d) => {
              const s = cell(d, p);
              return (
                <div key={`${d}${p}`} className="time-cell">
                  {s && <><strong>{s.subjectName}</strong><small>{s.roomCode} · {s.teacherName}</small></>}
                </div>
              );
            }),
          ])}
        </div>
      )}
    </Async>
  );
}

/* ===== B2 — TKB cá nhân của giáo viên ===== */
export function MyTimetableLive() {
  return (
    <Section title="TKB cá nhân (B2)" subtitle="Lịch dạy theo tuần · /me/timetable" wide>
      <WeeklyTimetable path="/me/timetable" />
    </Section>
  );
}

/* ===== Bài tập (B5 + C4) ===== */
export function AssignmentsLive({ actor }: { actor: 'teacher' | 'student' }) {
  const toast = useToast();
  const list = useApi<Assignment[]>(actor === 'teacher' ? '/assignments' : '/me/assignments');
  const classes = useApi<SchoolClass[]>(actor === 'teacher' ? '/classes' : null);
  const subjects = useApi<Subject[]>(actor === 'teacher' ? '/subjects' : null);
  const [sel, setSel] = useState<string | null>(null);
  const subs = useApi<Submission[]>(actor === 'teacher' && sel ? `/assignments/${sel}/submissions` : null);
  const [f, setF] = useState({ classId: '', subjectId: '', title: '', deadline: '' });

  const create = async () => {
    if (!f.classId || !f.subjectId || !f.title) return toast.show('err', 'Chọn lớp, môn và nhập tiêu đề');
    try {
      await api.post('/assignments', { ...f, deadline: f.deadline ? new Date(f.deadline).toISOString() : null, publishNow: true });
      toast.show('ok', 'Đã tạo & phát hành bài tập (HS được thông báo)');
      setF({ classId: '', subjectId: '', title: '', deadline: '' });
      list.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };
  const submit = async (id: string) => {
    try { await api.post(`/assignments/${id}/submit`, { content: 'Bài làm của em (demo)' }); toast.show('ok', 'Đã nộp bài'); list.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const grade = async (s: Submission) => {
    const v = prompt(`Chấm điểm cho ${s.studentName} (0-10):`, s.score != null ? String(s.score) : '8');
    if (v == null) return;
    try { await api.post(`/submissions/${s.id}/grade`, { score: Number(v), feedback: 'Tốt' }); toast.show('ok', 'Đã chấm'); subs.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title={actor === 'teacher' ? 'Quản lý bài tập (B5)' : 'Bài tập của tôi (C4)'} subtitle="assignments + submissions" wide>
      {toast.node}
      {actor === 'teacher' && (
        <div className="live-toolbar">
          <select className="live-select" value={f.classId} onChange={(e) => setF({ ...f, classId: e.target.value })}>
            <option value="">— Lớp —</option>{(classes.data || []).map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
          </select>
          <select className="live-select" value={f.subjectId} onChange={(e) => setF({ ...f, subjectId: e.target.value })}>
            <option value="">— Môn —</option>{(subjects.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input className="live-input grow" placeholder="Tiêu đề bài tập" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
          <input className="live-input" type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
          <button className="live-btn" onClick={create}><Plus size={15} /> Giao bài</button>
        </div>
      )}
      <Async state={list} empty="Chưa có bài tập">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Tiêu đề</th><th>Môn</th><th>Hạn nộp</th><th>Trạng thái</th><th></th></tr></thead>
            <tbody>{l.map((a) => (
              <tr key={a.id} style={{ background: sel === a.id ? '#f1f5fd' : undefined }}>
                <td><strong>{a.title}</strong></td><td>{a.subjectName}</td><td>{fmtDateTime(a.deadline)}</td>
                <td><StatusPill value={a.status} /></td>
                <td>
                  {actor === 'teacher'
                    ? <button className="live-btn subtle" onClick={() => setSel(a.id)}>Bài nộp</button>
                    : <button className="live-btn" onClick={() => submit(a.id)}><Upload size={14} /> Nộp</button>}
                </td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
      {actor === 'teacher' && sel && (
        <div style={{ marginTop: 14 }}>
          <Async state={subs} empty="Chưa có bài nộp">
            {(l) => (
              <table className="live-table"><thead><tr><th>Học sinh</th><th>Trạng thái</th><th>Điểm</th><th></th></tr></thead>
                <tbody>{l.map((s) => (
                  <tr key={s.id}><td>{s.studentName}</td><td><StatusPill value={s.status} /></td><td>{s.score ?? '—'}</td>
                    <td><button className="live-btn subtle" onClick={() => grade(s)}><CheckCircle2 size={14} /> Chấm</button></td></tr>
                ))}</tbody></table>
            )}
          </Async>
        </div>
      )}
    </Section>
  );
}

/* ===== Ngoại khóa (C6 + D5) ===== */
export function ExtracurricularLive({ actor, childId }: { actor: 'student' | 'parent'; childId?: string | null }) {
  const toast = useToast();
  const clubs = useApi<Club[]>('/clubs');
  const regsPath = actor === 'student' ? '/me/club-registrations' : childId ? `/me/club-registrations?studentId=${childId}` : null;
  const myRegs = useApi<ClubRegistration[]>(regsPath);

  const register = async (clubId: string) => {
    if (actor === 'parent' && !childId) return toast.show('err', 'Chọn con ở tab Switch Profile trước');
    try {
      await api.post(`/clubs/${clubId}/register`, actor === 'parent' ? { studentId: childId } : {});
      toast.show('ok', 'Đăng ký thành công');
      myRegs.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const joined = new Set((myRegs.data || []).filter((r) => r.status === 'REGISTERED').map((r) => r.clubId));

  return (
    <Section title={actor === 'student' ? 'Đăng ký ngoại khóa (C6)' : 'Đăng ký ngoại khóa cho con (D5)'} subtitle="clubs + club_registrations" wide>
      {toast.node}
      <Async state={clubs} empty="Chưa có CLB nào">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>CLB</th><th>Lịch</th><th>Sức chứa</th><th>Phí</th><th></th></tr></thead>
            <tbody>{l.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td><td>{c.schedule || '—'}</td><td>{c.capacity}</td><td>{money(c.fee)}</td>
                <td>{joined.has(c.id)
                  ? <Badge tone="green">Đã đăng ký</Badge>
                  : <button className="live-btn" onClick={() => register(c.id)}><Plus size={14} /> Đăng ký</button>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}

/* ===== Thông báo in-app (C5) ===== */
export function NotificationsLive() {
  const inbox = useApi<Notification[]>('/notifications');
  const toast = useToast();
  const markRead = async (id: string) => { try { await api.post(`/notifications/${id}/read`); inbox.reload(); } catch (e: any) { toast.show('err', e.message); } };
  const markAll = async () => { try { await api.post('/notifications/read-all'); toast.show('ok', 'Đã đánh dấu tất cả đã đọc'); inbox.reload(); } catch (e: any) { toast.show('err', e.message); } };

  return (
    <Section title="Thông báo (C5)" subtitle="Hộp thư in-app · notifications" wide
      action={<button className="live-btn ghost" onClick={markAll}><CheckCircle2 size={14} /> Đọc hết</button>}>
      {toast.node}
      <Async state={inbox} empty="Không có thông báo">
        {(l) => (
          <div>
            {l.map((n) => (
              <div key={n.id} className={`noti-item ${n.read ? '' : 'unread'}`}>
                <Bell size={18} />
                <div className="noti-body">
                  <strong>{n.title} <Badge tone="blue">{n.type}</Badge></strong>
                  <span>{n.body}</span><br /><small>{fmtDateTime(n.createdAt)}</small>
                </div>
                {!n.read && <button className="live-btn subtle" onClick={() => markRead(n.id)}>Đã đọc</button>}
              </div>
            ))}
          </div>
        )}
      </Async>
    </Section>
  );
}

import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Bell, BellRing, BookOpen, CalendarClock, CalendarPlus, CheckCircle2, Clock3, Download, FileText, Inbox, Lock, MailOpen, MapPin, Paperclip, Pencil, Plus, RefreshCw, RotateCcw, Search, School, Send, Settings2, Trash2, Upload, Users, X } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { TimetableSlot, TeachingAssignment, Assignment, Submission, StoredFile, Notification, NotificationPreference } from '../../api/types';
import { Section, Badge, StatusPill } from '../../components/ui';
import { Async, useToast, DAYS, DAY_LABEL, fmtDateTime } from './common';
import { filterNotifications, notificationSummary, NOTIFICATION_TYPE_LABEL, type NotificationPriorityFilter, type NotificationReadFilter } from './notifications';

/* ===== TKB tuần (B2/C2) ===== */
const SUBJECT_COLORS = ['#2563eb', '#7c3aed', '#0f766e', '#d97706', '#db2777', '#0891b2'];

function classLabel(value: string) {
  return value.replace(/^c-/i, '').replace(/-/g, ' ').toUpperCase();
}

function timeLabel(slot: TimetableSlot) {
  if (!slot.startTime && !slot.endTime) return `Tiết ${slot.periodNo}`;
  return [slot.startTime?.slice(0, 5), slot.endTime?.slice(0, 5)].filter(Boolean).join(' – ');
}

export function WeeklyTimetable({ path, teacherView = false }: { path: string; teacherView?: boolean }) {
  const slots = useApi<TimetableSlot[]>(path);
  const maxPeriod = useMemo(() => Math.max(5, ...((slots.data || []).map((slot) => slot.periodNo))), [slots.data]);
  const cell = (day: string, period: number) => (slots.data || []).find((slot) => slot.dayOfWeek === day && slot.periodNo === period);
  const today = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][new Date().getDay()];

  const summary = useMemo(() => {
    const data = slots.data || [];
    const classes = new Set(data.map((slot) => slot.classId));
    const subjects = new Set(data.map((slot) => slot.subjectId || slot.subjectName));
    const byDay = DAYS.map((day) => ({ day, count: data.filter((slot) => slot.dayOfWeek === day).length }));
    const busiest = byDay.reduce((best, item) => item.count > best.count ? item : best, byDay[0]);
    const todaySlots = data.filter((slot) => slot.dayOfWeek === today).sort((a, b) => a.periodNo - b.periodNo);
    const now = new Date().toTimeString().slice(0, 5);
    const next = todaySlots.find((slot) => !slot.startTime || slot.startTime.slice(0, 5) >= now);
    return { slots: data.length, classes: classes.size, subjects: subjects.size, busiest, next };
  }, [slots.data, today]);

  return (
    <Async state={slots} empty="Chưa có thời khóa biểu">
      {() => (
        <div className={teacherView ? 'teacher-schedule' : 'weekly-schedule'}>
          {teacherView && (
            <div className="teacher-schedule-summary" aria-label="Tóm tắt lịch dạy trong tuần">
              <div className="schedule-summary-primary">
                <span className="schedule-summary-icon"><CalendarClock size={21} /></span>
                <div><small>Lịch tuần này</small><strong>{summary.slots} tiết giảng dạy</strong><span>{summary.classes} lớp · {summary.subjects} môn</span></div>
              </div>
              <div className="schedule-summary-tile">
                <span>Ngày bận nhất</span>
                <strong>{summary.busiest.count ? DAY_LABEL[summary.busiest.day] : '—'}</strong>
                <small>{summary.busiest.count} tiết</small>
              </div>
              <div className="schedule-summary-tile next-slot">
                <span>Tiết tiếp theo hôm nay</span>
                <strong>{summary.next?.subjectName || 'Đã hoàn tất'}</strong>
                <small>{summary.next ? `${classLabel(summary.next.classId)} · ${timeLabel(summary.next)}` : 'Không còn lịch dạy'}</small>
              </div>
            </div>
          )}

          <div className="schedule-legend" aria-hidden="true">
            <span><i className="legend-dot occupied" /> Có lịch dạy</span>
            <span><i className="legend-dot current" /> Ngày hiện tại</span>
            <span className="schedule-hint">Cuộn ngang để xem đầy đủ trên màn hình nhỏ</span>
          </div>

          <div className="teacher-timetable-scroll">
            <div className="teacher-timetable-grid" role="table" aria-label={teacherView ? 'Thời khóa biểu giảng dạy cá nhân' : 'Thời khóa biểu tuần'}>
              <div className="teacher-time-corner"><Clock3 size={16} /><span>Tiết</span></div>
              {DAYS.map((day) => (
                <div key={day} className={`teacher-day-head ${day === today ? 'is-today' : ''}`} role="columnheader">
                  <span>{DAY_LABEL[day]}</span>
                  <small>{day === today ? 'Hôm nay' : 'Trong tuần'}</small>
                </div>
              ))}

              {Array.from({ length: maxPeriod }, (_, index) => index + 1).map((period) => (
                <Fragment key={period}>
                  <div className="teacher-period" role="rowheader"><strong>{period}</strong><span>Tiết {period}</span></div>
                  {DAYS.map((day) => {
                    const slot = cell(day, period);
                    const colorIndex = slot ? Math.abs(slot.subjectName.split('').reduce((total, char) => total + char.charCodeAt(0), 0)) % SUBJECT_COLORS.length : 0;
                    return (
                      <div key={`${day}-${period}`} className={`teacher-slot ${day === today ? 'is-today' : ''} ${slot ? 'has-class' : 'is-empty'}`} role="cell">
                        {slot ? (
                          <article className="teacher-class-card" style={{ '--slot-color': SUBJECT_COLORS[colorIndex] } as CSSProperties}>
                            <div className="teacher-class-topline"><span><School size={13} /> {classLabel(slot.classId)}</span><small>{timeLabel(slot)}</small></div>
                            <strong><BookOpen size={16} /> {slot.subjectName}</strong>
                            <div className="teacher-class-meta"><span><MapPin size={13} /> {slot.roomCode || 'Chưa xếp phòng'}</span></div>
                          </article>
                        ) : <span className="teacher-empty-label">Trống</span>}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      )}
    </Async>
  );
}

/* ===== B2 — TKB cá nhân của giáo viên ===== */
export function MyTimetableLive() {
  return (
    <Section
      title="Lịch giảng dạy"
      subtitle="Theo dõi lớp, môn học, phòng và thời gian trong một tuần"
      action={<span className="schedule-status"><i /> Đang áp dụng</span>}
      wide
    >
      <WeeklyTimetable path="/me/timetable" teacherView />
    </Section>
  );
}

/* ===== Bài tập (B5 + C4) ===== */
export function AssignmentsLive({ actor }: { actor: 'teacher' | 'student' }) {
  const toast = useToast();
  const list = useApi<Assignment[]>(actor === 'teacher' ? '/assignments' : '/me/assignments');
  const teachingAssignments = useApi<TeachingAssignment[]>(actor === 'teacher' ? '/me/teaching-assignments' : null);
  const mySubmissions = useApi<Submission[]>(actor === 'student' ? '/me/submissions' : null);
  const reloadMySubmissions = mySubmissions.reload;
  const [sel, setSel] = useState<string | null>(null);
  const subs = useApi<Submission[]>(actor === 'teacher' && sel ? `/assignments/${sel}/submissions` : null);
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deadlineDrafts, setDeadlineDrafts] = useState<Record<string, string>>({});
  const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [grading, setGrading] = useState<Record<string, { score: string; feedback: string }>>({});
  const [f, setF] = useState({ classId: '', subjectId: '', title: '', description: '', deadline: '', allowLate: false });
  const [submissionDraft, setSubmissionDraft] = useState({ content: '', attachmentFileId: '' });

  const teachingOptions = useMemo(() => {
    const unique = new Map<string, TeachingAssignment>();
    (teachingAssignments.data || []).forEach((assignment) => unique.set(`${assignment.classId}:${assignment.subjectId}`, assignment));
    return [...unique.values()];
  }, [teachingAssignments.data]);
  const selectedAssignment = (list.data || []).find((assignment) => assignment.id === sel);
  const submissionMap = useMemo(() => new Map((mySubmissions.data || []).map((item) => [item.assignmentId, item])), [mySubmissions.data]);
  const published = (list.data || []).filter((item) => item.status === 'PUBLISHED').length;
  const totalSubmissions = (list.data || []).reduce((total, item) => total + (item.submissionCount || 0), 0);

  useEffect(() => {
    if (actor !== 'student') return;
    const refreshResults = () => reloadMySubmissions();
    const timer = window.setInterval(refreshResults, 30_000);
    window.addEventListener('focus', refreshResults);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshResults);
    };
  }, [actor, reloadMySubmissions]);

  const upload = async (file: File | null) => {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) throw new Error('Tệp không được vượt quá 10 MB');
    return api.upload<StoredFile>('/files', file);
  };

  const create = async (publishNow: boolean) => {
    if (!f.classId || !f.subjectId || !f.title.trim()) return toast.show('err', 'Chọn lớp, môn và nhập tiêu đề');
    setBusy(true);
    try {
      const stored = await upload(assignmentFile);
      if (editingId) {
        await api.put(`/assignments/${editingId}`, {
          title: f.title,
          description: f.description,
          deadline: f.deadline ? new Date(f.deadline).toISOString() : undefined,
          allowLate: f.allowLate,
          attachmentFileId: stored?.id,
        });
        toast.show('ok', 'Đã cập nhật bài tập và thông báo thay đổi');
      } else {
        await api.post('/assignments', {
          ...f,
          deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
          attachmentFileId: stored?.id || null,
          publishNow,
        });
        toast.show('ok', publishNow ? 'Đã giao bài và thông báo cho học sinh' : 'Đã lưu bản nháp');
      }
      setF({ classId: '', subjectId: '', title: '', description: '', deadline: '', allowLate: false });
      setEditingId(null);
      setAssignmentFile(null);
      list.reload();
    } catch (e: any) { toast.show('err', e.message); } finally { setBusy(false); }
  };

  const openSubmission = (assignment: Assignment) => {
    const current = submissionMap.get(assignment.id);
    setSel(assignment.id);
    setSubmissionDraft({ content: current?.content || '', attachmentFileId: current?.attachmentFileId || '' });
    setSubmissionFile(null);
  };

  const submit = async () => {
    if (!sel) return;
    setBusy(true);
    try {
      const stored = await upload(submissionFile);
      await api.post(`/assignments/${sel}/submit`, {
        content: submissionDraft.content,
        attachmentFileId: stored?.id || submissionDraft.attachmentFileId || null,
      });
      toast.show('ok', 'Đã nộp bài thành công');
      setSel(null);
      setSubmissionFile(null);
      list.reload();
      mySubmissions.reload();
    } catch (e: any) { toast.show('err', e.message); } finally { setBusy(false); }
  };

  const publish = async (id: string) => {
    setBusy(true);
    try { await api.post(`/assignments/${id}/publish`); toast.show('ok', 'Đã phát hành bài tập'); list.reload(); }
    catch (e: any) { toast.show('err', e.message); } finally { setBusy(false); }
  };

  const startEdit = (assignment: Assignment) => {
    setEditingId(assignment.id);
    setF({
      classId: assignment.classId, subjectId: assignment.subjectId, title: assignment.title,
      description: assignment.description || '',
      deadline: assignment.deadline ? new Date(assignment.deadline).toISOString().slice(0, 16) : '',
      allowLate: assignment.allowLate,
    });
    setAssignmentFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (assignment: Assignment) => {
    if (!window.confirm(`Xóa bài tập “${assignment.title}”?`)) return;
    setBusy(true);
    try { await api.del(`/assignments/${assignment.id}`); toast.show('ok', 'Đã xóa bài tập'); list.reload(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const transition = async (assignment: Assignment, action: 'close' | 'reopen') => {
    setBusy(true);
    try { await api.post(`/assignments/${assignment.id}/${action}`); toast.show('ok', action === 'close' ? 'Đã đóng bài tập' : 'Đã mở lại bài tập'); list.reload(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const extend = async (assignment: Assignment) => {
    const value = deadlineDrafts[assignment.id];
    if (!value) return toast.show('err', 'Chọn hạn nộp mới');
    setBusy(true);
    try {
      await api.post(`/assignments/${assignment.id}/extend`, { deadline: new Date(value).toISOString() });
      toast.show('ok', 'Đã gia hạn và thông báo cho học sinh, phụ huynh');
      setDeadlineDrafts({ ...deadlineDrafts, [assignment.id]: '' });
      list.reload();
    } catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const allowResubmit = async (submission: Submission) => {
    setBusy(true);
    try { await api.post(`/submissions/${submission.id}/allow-resubmit`); toast.show('ok', `Đã cho ${submission.studentName} nộp lại`); subs.reload(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };

  const grade = async (s: Submission) => {
    const draft = grading[s.id] || { score: s.score == null ? '' : String(s.score), feedback: s.feedback || '' };
    if (draft.score === '' || Number(draft.score) < 0 || Number(draft.score) > 10) return toast.show('err', 'Nhập điểm từ 0 đến 10');
    setBusy(true);
    try { await api.post(`/submissions/${s.id}/grade`, { score: Number(draft.score), feedback: draft.feedback }); toast.show('ok', 'Đã lưu điểm và phản hồi'); subs.reload(); list.reload(); }
    catch (e: any) { toast.show('err', e.message); } finally { setBusy(false); }
  };

  const downloadFile = async (fileId?: string | null, fallback?: string | null) => {
    if (!fileId) return;
    try {
      const result = await api.download(`/files/${fileId}/content`);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename || fallback || 'tep-dinh-kem';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title={actor === 'teacher' ? 'Trung tâm giao bài' : 'Bài tập của tôi'} subtitle={actor === 'teacher' ? 'Tạo đề, đính kèm tài liệu và theo dõi tiến độ nộp bài' : 'Xem yêu cầu, tải đề và nộp bài trực tuyến'} wide>
      {toast.node}
      {actor === 'teacher' && (
        <div className="assignment-composer">
          <div className="assignment-composer-head"><span>{editingId ? <Pencil size={18} /> : <Plus size={18} />}</span><div><strong>{editingId ? 'Chỉnh sửa bài tập' : 'Tạo bài tập mới'}</strong><small>{editingId ? 'Các thay đổi của bài đã phát hành sẽ được thông báo tự động' : 'Thiết lập yêu cầu và tài liệu cho học sinh'}</small></div></div>
          <div className="assignment-form-grid">
            <label><span>Lớp và môn giảng dạy</span><select className="live-select" disabled={Boolean(editingId)} value={`${f.classId}:${f.subjectId}`} onChange={(e) => { const [classId, subjectId] = e.target.value.split(':'); setF({ ...f, classId: classId || '', subjectId: subjectId || '' }); }}>
              <option value=":">— Chọn phân công —</option>{teachingOptions.map((slot) => <option key={`${slot.classId}:${slot.subjectId}`} value={`${slot.classId}:${slot.subjectId}`}>{classLabel(slot.classId)} · {slot.subjectName}</option>)}
            </select></label>
            <label className="assignment-title-field"><span>Tiêu đề bài tập</span><input className="live-input" placeholder="Ví dụ: Ôn tập chương Hàm số" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label><span>Hạn nộp</span><input className="live-input" type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
            <label className="assignment-description-field"><span>Yêu cầu chi tiết</span><textarea className="live-input assignment-textarea" placeholder="Mô tả nội dung, yêu cầu trình bày và tiêu chí hoàn thành..." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label className="assignment-file-field"><span>Tệp đề bài</span><input className="assignment-file-input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)} /><small><Paperclip size={13} /> {assignmentFile?.name || 'PDF, Word, Excel hoặc hình ảnh · tối đa 10 MB'}</small></label>
            <label className="assignment-late-toggle"><input type="checkbox" checked={f.allowLate} onChange={(e) => setF({ ...f, allowLate: e.target.checked })} /><span>Cho phép nộp muộn</span></label>
          </div>
          <div className="assignment-composer-actions">{editingId ? <><button className="live-btn subtle" disabled={busy} onClick={() => { setEditingId(null); setF({ classId: '', subjectId: '', title: '', description: '', deadline: '', allowLate: false }); }}><X size={14} /> Hủy sửa</button><button className="live-btn" disabled={busy} onClick={() => create(false)}><CheckCircle2 size={15} /> {busy ? 'Đang lưu…' : 'Lưu thay đổi'}</button></> : <><button className="live-btn subtle" disabled={busy} onClick={() => create(false)}>Lưu nháp</button><button className="live-btn" disabled={busy} onClick={() => create(true)}><Send size={15} /> {busy ? 'Đang xử lý…' : 'Giao bài ngay'}</button></>}</div>
        </div>
      )}
      <div className="assignment-summary">
        <article><span><BookOpen size={18} /></span><div><small>Tổng bài tập</small><strong>{list.data?.length || 0}</strong></div></article>
        <article><span><Send size={18} /></span><div><small>Đang phát hành</small><strong>{published}</strong></div></article>
        <article><span><Users size={18} /></span><div><small>{actor === 'teacher' ? 'Bài đã nộp' : 'Đã hoàn thành'}</small><strong>{actor === 'teacher' ? totalSubmissions : mySubmissions.data?.length || 0}</strong></div></article>
      </div>
      <Async paginate state={list} empty="Chưa có bài tập" itemLabel="bài tập">
        {(l) => (
          <div className="assignment-grid">{l.map((assignment) => {
            const submission = submissionMap.get(assignment.id);
            const percent = assignment.studentCount ? Math.round(((assignment.submissionCount || 0) / assignment.studentCount) * 100) : 0;
            return <article className={`assignment-card ${sel === assignment.id ? 'selected' : ''}`} key={assignment.id}>
              <div className="assignment-card-top"><span className="assignment-subject-icon"><FileText size={19} /></span><div><small>{assignment.subjectName} · {classLabel(assignment.classId)}</small><strong>{assignment.title}</strong></div><StatusPill value={submission?.status || assignment.status} /></div>
              <p>{assignment.description || 'Không có mô tả bổ sung.'}</p>
              <div className="assignment-meta"><span><CalendarClock size={14} /> {assignment.deadline ? fmtDateTime(assignment.deadline) : 'Không giới hạn hạn nộp'}</span>{assignment.allowLate && <span><Clock3 size={14} /> Cho phép nộp muộn</span>}</div>
              {assignment.attachmentFileId && <button className="assignment-attachment" onClick={() => downloadFile(assignment.attachmentFileId, assignment.attachmentName)}><Download size={15} /><span>{assignment.attachmentName}</span><small>Tải đề</small></button>}
              {actor === 'teacher' ? <>
                <div className="assignment-progress"><div><span>Tiến độ nộp bài</span><strong>{assignment.submissionCount || 0}/{assignment.studentCount || 0}</strong></div><i><b style={{ width: `${percent}%` }} /></i></div>
                <div className="assignment-deadline-editor"><input className="live-input" type="datetime-local" aria-label={`Hạn mới của ${assignment.title}`} min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)} value={deadlineDrafts[assignment.id] || ''} onChange={(event) => setDeadlineDrafts({ ...deadlineDrafts, [assignment.id]: event.target.value })} /><button className="live-btn subtle" disabled={busy} onClick={() => extend(assignment)}><CalendarPlus size={14} /> Gia hạn</button></div>
                <div className="assignment-card-actions lifecycle-actions">
                  {assignment.status === 'DRAFT' && <button className="live-btn" disabled={busy} onClick={() => publish(assignment.id)}><Send size={14} /> Phát hành</button>}
                  {assignment.status === 'PUBLISHED' && <button className="live-btn subtle" disabled={busy} onClick={() => transition(assignment, 'close')}><Lock size={14} /> Đóng</button>}
                  {assignment.status === 'CLOSED' && <button className="live-btn" disabled={busy} onClick={() => transition(assignment, 'reopen')}><RotateCcw size={14} /> Mở lại</button>}
                  <button className="live-btn subtle" disabled={busy || assignment.status === 'CLOSED'} onClick={() => startEdit(assignment)}><Pencil size={14} /> Sửa</button>
                  <button className="live-btn danger" disabled={busy} onClick={() => remove(assignment)}><Trash2 size={14} /> Xóa</button>
                  <button className="live-btn subtle" onClick={() => setSel(assignment.id)}><Users size={14} /> Bài nộp</button>
                </div>
              </> : <>
                {(submission?.status === 'GRADED' || submission?.score != null) && <div className="assignment-grade-result">
                  <div className="assignment-grade-score"><span>Điểm bài làm</span><strong>{submission.score?.toFixed(1) ?? '—'}</strong><small>/ 10</small></div>
                  <div className="assignment-grade-feedback">
                    <div><CheckCircle2 size={17} /><strong>Giáo viên đã chấm bài</strong></div>
                    <p>{submission.feedback || 'Giáo viên chưa để lại nhận xét.'}</p>
                    {submission.gradedAt && <small>Chấm lúc {fmtDateTime(submission.gradedAt)}</small>}
                  </div>
                </div>}
                <div className="assignment-card-actions"><span className="assignment-submission-state">{submission ? `Lần ${submission.attemptNumber || 1} · ${fmtDateTime(submission.submittedAt)}` : 'Chưa nộp bài'}</span>{(submission?.status !== 'GRADED' || submission?.resubmissionAllowed) && assignment.status === 'PUBLISHED' && <button className="live-btn" onClick={() => openSubmission(assignment)}><Upload size={14} /> {submission ? 'Nộp lại' : 'Nộp bài'}</button>}</div>
              </>}
            </article>;
          })}</div>
        )}
      </Async>
      {actor === 'teacher' && sel && <div className="submission-panel">
          <div className="submission-panel-head"><div><small>Bài tập đang xem</small><strong>{selectedAssignment?.title}</strong></div><button className="live-btn subtle" onClick={() => setSel(null)}>Đóng</button></div>
          <Async paginate state={subs} empty="Chưa có bài nộp" itemLabel="bài nộp">
            {(l) => (
              <table className="live-table assignment-submission-table"><thead><tr><th>Học sinh</th><th>Bài làm</th><th>Trạng thái</th><th>Điểm và phản hồi</th><th></th></tr></thead>
                <tbody>{l.map((s) => (
                  <tr key={s.id}><td><strong>{s.studentName}</strong><small>{fmtDateTime(s.submittedAt)}</small></td><td><p>{s.content || 'Chỉ gửi tệp đính kèm'}</p>{s.attachmentFileId && <button className="assignment-file-link" onClick={() => downloadFile(s.attachmentFileId, s.attachmentName)}><Download size={13} /> {s.attachmentName}</button>}</td><td><StatusPill value={s.status} /></td><td><input className="gradebook-score-input" aria-label={`Điểm của ${s.studentName}`} type="number" min={0} max={10} step="0.1" value={grading[s.id]?.score ?? (s.score == null ? '' : String(s.score))} onChange={(e) => setGrading({ ...grading, [s.id]: { score: e.target.value, feedback: grading[s.id]?.feedback ?? s.feedback ?? '' } })} /><input className="live-input assignment-feedback" aria-label={`Phản hồi cho ${s.studentName}`} placeholder="Nhận xét" value={grading[s.id]?.feedback ?? s.feedback ?? ''} onChange={(e) => setGrading({ ...grading, [s.id]: { score: grading[s.id]?.score ?? (s.score == null ? '' : String(s.score)), feedback: e.target.value } })} /></td>
                    <td><div className="submission-actions"><button className="live-btn subtle" disabled={busy} onClick={() => grade(s)}><CheckCircle2 size={14} /> Lưu chấm</button>{s.status === 'GRADED' && !s.resubmissionAllowed && <button className="live-btn subtle" disabled={busy || selectedAssignment?.status !== 'PUBLISHED'} onClick={() => allowResubmit(s)}><RotateCcw size={14} /> Cho nộp lại</button>}</div></td></tr>
                ))}</tbody></table>
            )}
          </Async>
        </div>}
      {actor === 'student' && sel && selectedAssignment && <div className="submission-panel student-submit-panel">
        <div className="submission-panel-head"><div><small>Nộp bài cho</small><strong>{selectedAssignment.title}</strong></div><button className="live-btn subtle" onClick={() => setSel(null)}>Đóng</button></div>
        <label><span>Nội dung bài làm</span><textarea className="live-input assignment-textarea" placeholder="Nhập câu trả lời, ghi chú hoặc đường dẫn liên quan..." value={submissionDraft.content} onChange={(e) => setSubmissionDraft({ ...submissionDraft, content: e.target.value })} /></label>
        <label className="assignment-file-field"><span>Tệp bài làm</span><input className="assignment-file-input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)} /><small><Paperclip size={13} /> {submissionFile?.name || submissionMap.get(sel)?.attachmentName || 'Chọn tệp tối đa 10 MB'}</small></label>
        <div className="assignment-composer-actions"><button className="live-btn" disabled={busy} onClick={submit}><Upload size={15} /> {busy ? 'Đang tải lên…' : 'Xác nhận nộp bài'}</button></div>
      </div>}
    </Section>
  );
}

/* ===== Hộp thư thông báo dùng chung (B7/C5/D5) ===== */
export function NotificationsLive({ audience = 'student' }: { audience?: 'teacher' | 'student' | 'parent' }) {
  const inbox = useApi<Notification[]>('/notifications');
  const preferences = useApi<NotificationPreference[]>('/notification-preferences');
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [readFilter, setReadFilter] = useState<NotificationReadFilter>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<NotificationPriorityFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [showPreferences, setShowPreferences] = useState(false);
  const items = useMemo(() => inbox.data || [], [inbox.data]);
  const summary = useMemo(() => notificationSummary(items), [items]);
  const visibleNotifications = useMemo(() => filterNotifications(items, {
    query, read: readFilter, priority: priorityFilter, type: typeFilter,
  }), [items, priorityFilter, query, readFilter, typeFilter]);
  const availableTypes = useMemo(() => Array.from(new Set(items.map((item) => item.type))).sort(), [items]);
  const ownerLabel = audience === 'teacher' ? 'giáo viên' : audience === 'parent' ? 'phụ huynh' : 'học sinh';

  const refresh = () => { inbox.reload(); preferences.reload(); };
  const markRead = async (id: string) => {
    try { await api.post(`/notifications/${id}/read`); inbox.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const markUnread = async (id: string) => {
    try { await api.post(`/notifications/${id}/unread`); inbox.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const markAll = async () => {
    try { await api.post('/notifications/read-all'); toast.show('ok', 'Đã đánh dấu tất cả thông báo là đã đọc'); inbox.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const togglePreference = async (preference: NotificationPreference) => {
    try {
      await api.put('/notification-preferences', { channel: preference.channel, enabled: !preference.enabled });
      toast.show('ok', 'Đã cập nhật kênh nhận thông báo'); preferences.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <div className={`notification-page-grid notification-inbox notification-inbox--${audience}`}>
      {toast.node}
      <section className="notification-inbox-hero">
        <div className="notification-inbox-hero-copy">
          <span className="notification-inbox-icon"><Inbox size={25} /></span>
          <div><small>Trung tâm cập nhật dành cho {ownerLabel}</small><h2>Hộp thư thông báo</h2><p>Thông tin từ nhà trường và các nghiệp vụ liên quan được tập trung tại một nơi.</p></div>
        </div>
        <div className="notification-inbox-actions">
          <button type="button" className="live-btn ghost" onClick={() => setShowPreferences((value) => !value)}><Settings2 size={15} /> Kênh nhận</button>
          <button type="button" className="live-btn ghost" onClick={refresh}><RefreshCw size={15} /> Cập nhật</button>
          <button type="button" className="live-btn" onClick={markAll} disabled={!summary.unread}><CheckCircle2 size={15} /> Đọc tất cả</button>
        </div>
      </section>

      <div className="notification-inbox-summary" aria-label="Tổng quan hộp thư">
        <article><span className="blue"><Bell size={18} /></span><div><small>Tất cả</small><strong>{summary.total}</strong></div></article>
        <article className={summary.unread ? 'highlight' : ''}><span className="violet"><MailOpen size={18} /></span><div><small>Chưa đọc</small><strong>{summary.unread}</strong></div></article>
        <article><span className="orange"><BellRing size={18} /></span><div><small>Quan trọng</small><strong>{summary.important}</strong></div></article>
        <article><span className="green"><Clock3 size={18} /></span><div><small>Hôm nay</small><strong>{summary.today}</strong></div></article>
      </div>

      {showPreferences && <Section title="Kênh nhận thông báo" subtitle="Chủ động bật hoặc tắt từng kênh liên lạc" wide>
        <Async state={preferences} empty="Chưa có tùy chọn thông báo">
          {(channelPreferences) => <div className="notification-preferences">{channelPreferences.map((preference) => (
            <label key={preference.id}>
              <span><strong>{{ IN_APP: 'Trong ứng dụng', PUSH: 'Thông báo đẩy', EMAIL: 'Email' }[preference.channel]}</strong>
                <small>{preference.channel === 'IN_APP' ? 'Hiển thị trong hộp thư của hệ thống' : preference.channel === 'PUSH' ? 'Gửi tới thiết bị đã đăng ký' : 'Gửi tới email trong hồ sơ'}</small></span>
              <input type="checkbox" checked={preference.enabled} onChange={() => togglePreference(preference)} />
            </label>
          ))}</div>}
        </Async>
      </Section>}

      <Section title="Danh sách thông báo" subtitle={`${visibleNotifications.length} thông báo phù hợp với bộ lọc hiện tại`} wide>
        <div className="notification-inbox-toolbar">
          <label className="notification-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm theo tiêu đề hoặc nội dung…" /></label>
          <div className="notification-read-filter" role="group" aria-label="Lọc trạng thái đọc">
            {([['ALL', 'Tất cả'], ['UNREAD', `Chưa đọc (${summary.unread})`], ['READ', 'Đã đọc']] as const).map(([value, label]) => <button type="button" key={value} className={readFilter === value ? 'active' : ''} onClick={() => setReadFilter(value)}>{label}</button>)}
          </div>
          <select className="live-select" aria-label="Lọc loại thông báo" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="ALL">Tất cả loại</option>{availableTypes.map((type) => <option key={type} value={type}>{NOTIFICATION_TYPE_LABEL[type] || type}</option>)}</select>
          <select className="live-select" aria-label="Lọc mức độ thông báo" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as NotificationPriorityFilter)}><option value="ALL">Tất cả mức độ</option><option value="URGENT">Khẩn cấp</option><option value="IMPORTANT">Quan trọng</option><option value="NORMAL">Thông thường</option></select>
        </div>

        <Async paginate pageSize={5} resetKey={`${query}:${readFilter}:${priorityFilter}:${typeFilter}`} state={{ ...inbox, data: visibleNotifications }} empty="Không có thông báo phù hợp" itemLabel="thông báo">
          {(pageItems) => <div className="notification-inbox-list">{pageItems.map((notification) => {
            const priority = notification.priority || 'NORMAL';
            return <article key={notification.id} className={`notification-inbox-item ${notification.read ? 'read' : 'unread'} priority-${priority.toLowerCase()}`}>
              <span className="notification-item-icon">{notification.read ? <MailOpen size={19} /> : <Bell size={19} />}</span>
              <div className="notification-item-content">
                <header><div><Badge tone="blue">{NOTIFICATION_TYPE_LABEL[notification.type] || notification.type}</Badge>{priority !== 'NORMAL' && <Badge tone={priority === 'URGENT' ? 'red' : 'orange'}>{priority === 'URGENT' ? 'Khẩn cấp' : 'Quan trọng'}</Badge>}</div><time>{fmtDateTime(notification.createdAt)}</time></header>
                <strong>{notification.title}</strong><p>{notification.body}</p>
                <footer><span>{notification.refType === 'ANNOUNCEMENT' ? 'Từ Ban quản trị nhà trường' : 'Cập nhật tự động từ hệ thống'}</span><button type="button" onClick={() => notification.read ? markUnread(notification.id) : markRead(notification.id)}>{notification.read ? 'Đánh dấu chưa đọc' : 'Đánh dấu đã đọc'}</button></footer>
              </div>
            </article>;
          })}</div>}
        </Async>
      </Section>
    </div>
  );
}

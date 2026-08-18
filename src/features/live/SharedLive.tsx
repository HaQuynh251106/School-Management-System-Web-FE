import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { BellRing, BookOpen, CalendarClock, CheckCircle2, Clock3, Download, Eye, FileText, MapPin, Paperclip, Plus, School, Send, Smartphone, Upload, Users } from 'lucide-react';
import { api } from '../../api/client';
import { listenForForegroundPush, pushRegistrationState, registerBrowserPush, type PushRegistrationState } from '../../api/push';
import { useApi } from '../../api/useApi';
import type { TimetableSlot, TeachingAssignment, Assignment, Submission, StoredFile, Club, ClubRegistration, Notification, NotificationPreference } from '../../api/types';
import { Section, Badge, StatusPill } from '../../components/ui';
import { NotificationDetailDialog } from '../../components/NotificationDetailDialog';
import { Async, useToast, DAYS, DAY_LABEL, fmtDateTime, money } from './common';
import { TeacherLessonProgress } from './AutomaticTimetableWorkspace';

/* ===== TKB tuần (B2/C2) ===== */
const SUBJECT_COLORS = ['#2563eb', '#7c3aed', '#0f766e', '#d97706', '#db2777', '#0891b2'];

const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  SYSTEM: 'Hệ thống', LOGIN: 'Đăng nhập', PASSWORD_RESET: 'Mật khẩu',
  GENERAL: 'Thông báo chung', HOLIDAY: 'Nghỉ lễ', GRADE: 'Điểm số', GRADE_PUBLISHED: 'Điểm số',
  EVENT: 'Sự kiện', STUDENT_STATUS: 'Tình hình học sinh', ATTENDANCE: 'Điểm danh',
  ATTENDANCE_ALERT: 'Chuyên cần', PARENT_MEETING: 'Họp phụ huynh', ASSIGNMENT: 'Bài tập',
  FEE: 'Khoản thu', INVOICE: 'Hóa đơn', PAYMENT: 'Thanh toán', ANNOUNCEMENT: 'Thông báo chung', EXTRACURRICULAR: 'Ngoại khóa',
  EXAM: 'Lịch thi', EXAM_SCHEDULE: 'Lịch thi', TIMETABLE: 'Thời khóa biểu',
  YEAR_RESULT: 'Kết quả năm học', SUBMISSION: 'Bài nộp', PAYMENT_PROOF: 'Biên lai thanh toán',
};

function classLabel(value: string) {
  return value.replace(/^c-/i, '').replace(/-/g, ' ').toUpperCase();
}

function timeLabel(slot: TimetableSlot) {
  if (!slot.startTime && !slot.endTime) return `Tiết ${slot.periodNo}`;
  return [slot.startTime?.slice(0, 5), slot.endTime?.slice(0, 5)].filter(Boolean).join(' – ');
}

const PERIOD_RANGE: Record<number, string> = {
  1: '07:00 - 07:45', 2: '07:50 - 08:35', 3: '08:45 - 09:30',
  4: '09:35 - 10:20', 5: '10:25 - 11:10', 6: '13:30 - 14:15',
  7: '14:20 - 15:05', 8: '15:15 - 16:00', 9: '16:05 - 16:50',
  10: '17:00 - 17:45',
};

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
                  <div className={`teacher-period ${period === 6 ? 'session-start' : ''}`} role="rowheader"><strong>{period <= 5 ? 'Sáng' : 'Chiều'} · {period}</strong><span>{PERIOD_RANGE[period] || `Tiết ${period}`}</span></div>
                  {DAYS.map((day) => {
                    const slot = cell(day, period);
                    const colorIndex = slot ? Math.abs(slot.subjectName.split('').reduce((total, char) => total + char.charCodeAt(0), 0)) % SUBJECT_COLORS.length : 0;
                    return (
                      <div key={`${day}-${period}`} className={`teacher-slot ${period === 6 ? 'session-start' : ''} ${day === today ? 'is-today' : ''} ${slot ? 'has-class' : 'is-empty'}`} role="cell">
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
    <>
      <Section
        title="Lịch giảng dạy"
        subtitle="Theo dõi lớp, môn học, phòng và thời gian trong một tuần"
        action={<span className="schedule-status"><i /> Đang áp dụng</span>}
        wide
      >
        <WeeklyTimetable path="/me/timetable" teacherView />
      </Section>
      <TeacherLessonProgress />
    </>
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
      await api.post('/assignments', {
        ...f,
        deadline: f.deadline ? new Date(f.deadline).toISOString() : null,
        attachmentFileId: stored?.id || null,
        publishNow,
      });
      toast.show('ok', publishNow ? 'Đã giao bài và thông báo cho học sinh' : 'Đã lưu bản nháp');
      setF({ classId: '', subjectId: '', title: '', description: '', deadline: '', allowLate: false });
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
          <div className="assignment-composer-head"><span><Plus size={18} /></span><div><strong>Tạo bài tập mới</strong><small>Thiết lập yêu cầu và tài liệu cho học sinh</small></div></div>
          <div className="assignment-form-grid">
            <label><span>Lớp và môn giảng dạy</span><select className="live-select" value={`${f.classId}:${f.subjectId}`} onChange={(e) => { const [classId, subjectId] = e.target.value.split(':'); setF({ ...f, classId: classId || '', subjectId: subjectId || '' }); }}>
              <option value=":">— Chọn phân công —</option>{teachingOptions.map((slot) => <option key={`${slot.classId}:${slot.subjectId}`} value={`${slot.classId}:${slot.subjectId}`}>{classLabel(slot.classId)} · {slot.subjectName}</option>)}
            </select></label>
            <label className="assignment-title-field"><span>Tiêu đề bài tập</span><input className="live-input" placeholder="Ví dụ: Ôn tập chương Hàm số" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></label>
            <label><span>Hạn nộp</span><input className="live-input" type="datetime-local" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} /></label>
            <label className="assignment-description-field"><span>Yêu cầu chi tiết</span><textarea className="live-input assignment-textarea" placeholder="Mô tả nội dung, yêu cầu trình bày và tiêu chí hoàn thành..." value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></label>
            <label className="assignment-file-field"><span>Tệp đề bài</span><input className="assignment-file-input" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={(e) => setAssignmentFile(e.target.files?.[0] || null)} /><small><Paperclip size={13} /> {assignmentFile?.name || 'PDF, Word, Excel hoặc hình ảnh · tối đa 10 MB'}</small></label>
            <label className="assignment-late-toggle"><input type="checkbox" checked={f.allowLate} onChange={(e) => setF({ ...f, allowLate: e.target.checked })} /><span>Cho phép nộp muộn</span></label>
          </div>
          <div className="assignment-composer-actions"><button className="live-btn subtle" disabled={busy} onClick={() => create(false)}>Lưu nháp</button><button className="live-btn" disabled={busy} onClick={() => create(true)}><Send size={15} /> {busy ? 'Đang xử lý…' : 'Giao bài ngay'}</button></div>
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
                <div className="assignment-card-actions">{assignment.status === 'DRAFT' && <button className="live-btn" disabled={busy} onClick={() => publish(assignment.id)}><Send size={14} /> Phát hành</button>}<button className="live-btn subtle" onClick={() => setSel(assignment.id)}><Users size={14} /> Xem bài nộp</button></div>
              </> : <>
                {(submission?.status === 'GRADED' || submission?.score != null) && <div className="assignment-grade-result">
                  <div className="assignment-grade-score"><span>Điểm bài làm</span><strong>{submission.score?.toFixed(1) ?? '—'}</strong><small>/ 10</small></div>
                  <div className="assignment-grade-feedback">
                    <div><CheckCircle2 size={17} /><strong>Giáo viên đã chấm bài</strong></div>
                    <p>{submission.feedback || 'Giáo viên chưa để lại nhận xét.'}</p>
                    {submission.gradedAt && <small>Chấm lúc {fmtDateTime(submission.gradedAt)}</small>}
                  </div>
                </div>}
                <div className="assignment-card-actions"><span className="assignment-submission-state">{submission ? `Đã nộp ${fmtDateTime(submission.submittedAt)}` : 'Chưa nộp bài'}</span>{submission?.status !== 'GRADED' && <button className="live-btn" onClick={() => openSubmission(assignment)}><Upload size={14} /> {submission ? 'Nộp lại' : 'Nộp bài'}</button>}</div>
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
                    <td><button className="live-btn subtle" disabled={busy} onClick={() => grade(s)}><CheckCircle2 size={14} /> Lưu chấm</button></td></tr>
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

/* ===== Ngoại khóa (C6 + D5) ===== */
export function ExtracurricularLive({ actor, childId }: { actor: 'student' | 'parent'; childId?: string | null }) {
  const toast = useToast();
  const clubs = useApi<Club[]>('/clubs');
  const regsPath = actor === 'student' ? '/me/club-registrations' : childId ? `/me/club-registrations?studentId=${childId}` : null;
  const myRegs = useApi<ClubRegistration[]>(regsPath);

  const register = async (clubId: string) => {
    if (actor === 'parent' && !childId) return toast.show('err', 'Vui lòng chọn học sinh trước');
    try {
      await api.post(`/clubs/${clubId}/register`, actor === 'parent' ? { studentId: childId } : {});
      toast.show('ok', 'Đăng ký thành công');
      myRegs.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const cancelRegistration = async (registration: ClubRegistration) => {
    try {
      await api.post(`/club-registrations/${registration.id}/cancel`);
      toast.show('ok', 'Đã hủy đăng ký và hủy hóa đơn chưa thanh toán (nếu có)');
      myRegs.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const joined = new Set((myRegs.data || []).filter((r) => r.status === 'REGISTERED').map((r) => r.clubId));

  return (
    <Section title={actor === 'student' ? 'Đăng ký ngoại khóa' : 'Đăng ký ngoại khóa cho con'} subtitle="Chọn hoạt động phù hợp và còn chỗ" wide>
      {toast.node}
      <Async paginate state={clubs} empty="Chưa có CLB nào" itemLabel="câu lạc bộ">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>CLB</th><th>Lịch</th><th>Sức chứa</th><th>Phí</th><th></th></tr></thead>
            <tbody>{l.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td><td>{c.schedule || '—'}</td><td>{c.capacity}</td><td>{money(c.fee)}</td>
                <td>{joined.has(c.id)
                  ? <div className="club-registration-actions"><Badge tone="green">Đã đăng ký</Badge>{myRegs.data?.find((item) => item.clubId === c.id && item.status === 'REGISTERED')?.invoiceId && <small>Đã sinh hóa đơn trong mục Học phí</small>}<button className="live-btn ghost" onClick={() => cancelRegistration(myRegs.data!.find((item) => item.clubId === c.id && item.status === 'REGISTERED')!)}>Hủy đăng ký</button></div>
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
  const preferences = useApi<NotificationPreference[]>('/me/notification-preferences');
  const toast = useToast();
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [pushState, setPushState] = useState<PushRegistrationState>('INACTIVE');
  const [registeringPush, setRegisteringPush] = useState(false);
  const reloadInbox = inbox.reload;
  const notifyChanged = () => window.dispatchEvent(new Event('sse:notifications-changed'));
  useEffect(() => {
    let dispose: () => void = () => {};
    void pushRegistrationState().then(setPushState);
    void listenForForegroundPush(() => { reloadInbox(); window.dispatchEvent(new Event('sse:notifications-changed')); }).then((listener) => { dispose = listener; });
    return () => dispose();
  }, [reloadInbox]);
  const markRead = async (id: string) => { try { await api.post(`/notifications/${id}/read`); inbox.reload(); notifyChanged(); } catch (e: any) { toast.show('err', e.message); } };
  const markAll = async () => { try { await api.post('/notifications/read-all'); toast.show('ok', 'Đã đánh dấu tất cả đã đọc'); inbox.reload(); notifyChanged(); } catch (e: any) { toast.show('err', e.message); } };
  const openDetail = async (notification: Notification) => {
    setSelectedNotification(notification);
    if (!notification.read) await markRead(notification.id);
  };
  const channels: NotificationPreference[] = (['IN_APP', 'EMAIL', 'PUSH'] as const).map((channel) =>
    (preferences.data || []).find((item) => item.channel === channel) || {
      id: `default-${channel}`, userId: '', channel, enabled: channel === 'IN_APP', updatedAt: '',
    });
  const togglePreference = async (preference: NotificationPreference) => {
    try {
      if (preference.channel === 'PUSH' && !preference.enabled) {
        setRegisteringPush(true);
        await registerBrowserPush();
        setPushState('READY');
      }
      await api.put('/me/notification-preferences', { notificationType: 'ALL', channel: preference.channel, enabled: !preference.enabled });
      toast.show('ok', 'Đã cập nhật tùy chọn thông báo'); preferences.reload();
    } catch (e: any) { toast.show('err', e.message); }
    finally { setRegisteringPush(false); }
  };

  return (
    <div className="notification-page-grid">
      {toast.node}
      <Section title="Kênh nhận thông báo" subtitle="Chủ động bật hoặc tắt từng kênh liên lạc" wide>
        <div className={`push-readiness push-${pushState.toLowerCase()}`}>
          <span>{pushState === 'READY' ? <BellRing size={18} /> : <Smartphone size={18} />}</span>
          <div><strong>{pushState === 'READY' ? 'Thiết bị đã sẵn sàng nhận push' : 'Thông báo đẩy trên thiết bị này'}</strong>
            <small>{{
              READY: 'Firebase đã cấp token và liên kết với tài khoản hiện tại.',
              INACTIVE: 'Bật kênh Thông báo đẩy để trình duyệt xin quyền và đăng ký thiết bị.',
              DENIED: 'Trình duyệt đang chặn thông báo. Hãy cấp lại quyền trong cài đặt trang web.',
              NOT_CONFIGURED: 'Môi trường chưa có Firebase Web/VAPID key.',
              UNSUPPORTED: 'Trình duyệt này không hỗ trợ Web Push.',
            }[pushState]}</small></div>
        </div>
        {preferences.loading ? <div className="live-loading">Đang tải tùy chọn…</div> : preferences.error ? <div className="live-error">{preferences.error}</div> :
          <div className="notification-preferences">{channels.map((preference) => (
            <label key={preference.id}>
              <span><strong>{{ IN_APP: 'Trong ứng dụng', PUSH: 'Thông báo đẩy', EMAIL: 'Email' }[preference.channel]}</strong>
                <small>{preference.channel === 'IN_APP' ? 'Hiển thị trong hộp thư của hệ thống' : preference.channel === 'PUSH' ? 'Gửi tới thiết bị đã đăng ký' : 'Gửi tới email trong hồ sơ'}</small></span>
              <input type="checkbox" checked={preference.enabled} disabled={registeringPush || (preference.channel === 'PUSH' && ['DENIED', 'NOT_CONFIGURED', 'UNSUPPORTED'].includes(pushState))} onChange={() => togglePreference(preference)} />
            </label>
          ))}</div>}
      </Section>
      <Section title="Thông báo" subtitle="Cập nhật mới từ nhà trường" wide
        action={<button className="live-btn ghost" onClick={markAll}><CheckCircle2 size={14} /> Đọc hết</button>}>
        <Async paginate state={inbox} empty="Không có thông báo" itemLabel="thông báo">
          {(l) => (
            <div className="notification-list">
              <div className="notification-list-head" aria-hidden="true">
                <span>Thời gian</span><span>Loại</span><span>Nội dung</span><span>Mức độ</span><span>Trạng thái</span><span>Thao tác</span>
              </div>
              {l.map((n) => (
                <article key={n.id} className={`notification-list-row${n.read ? '' : ' is-unread'}`}>
                  <time dateTime={n.createdAt}>{fmtDateTime(n.createdAt)}</time>
                  <div><Badge tone="blue">{NOTIFICATION_TYPE_LABEL[n.type] || n.type}</Badge></div>
                  <div className="notification-list-content"><strong>{n.title}</strong><small>{n.body}</small></div>
                  <div>{n.priority && n.priority !== 'NORMAL' ? <Badge tone={n.priority === 'URGENT' ? 'red' : 'orange'}>{n.priority === 'URGENT' ? 'Khẩn cấp' : 'Quan trọng'}</Badge> : <Badge tone="green">Thông thường</Badge>}</div>
                  <div><StatusPill value={n.read ? 'READ' : 'UNREAD'} /></div>
                  <div className="notification-row-actions"><button className="live-btn subtle" onClick={() => void openDetail(n)}><Eye size={14} /> Xem chi tiết</button>{!n.read && <button className="live-btn ghost" onClick={() => markRead(n.id)}>Đánh dấu đã đọc</button>}</div>
                </article>
              ))}
            </div>
          )}
        </Async>
      </Section>
      {selectedNotification && <NotificationDetailDialog notification={selectedNotification} onClose={() => setSelectedNotification(null)} />}
    </div>
  );
}

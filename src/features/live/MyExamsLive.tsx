import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, CalendarClock, CheckCircle2, ClipboardPenLine, Clock3, DoorOpen,
  GraduationCap, History, MapPin, RefreshCw, Save, Send, ShieldCheck, UserCheck, Users,
} from 'lucide-react';
import { api } from '../../api/client';
import { useActiveChild } from '../../api/activeChild';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, ExamAgendaItem, ExamReviewRequest, StudentExamResultView, TeacherGradingTask,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, fmtDateTime, useToast } from './common';
import { useHashString } from '../../api/urlState';

type Actor = 'teacher' | 'student' | 'parent';
type Filter = 'ALL' | ExamAgendaItem['taskType'];

const taskMeta = {
  CANDIDATE: { label: 'Lịch dự thi', Icon: GraduationCap },
  PROCTOR: { label: 'Nhiệm vụ coi thi', Icon: UserCheck },
  GRADING: { label: 'Nhiệm vụ chấm thi', Icon: ClipboardPenLine },
  GRADE_ENTRY: { label: 'Nhiệm vụ nhập điểm', Icon: ClipboardPenLine },
} as const;

const statusLabels: Record<ExamAgendaItem['status'], string> = {
  UPCOMING: 'Sắp diễn ra', TODAY: 'Hôm nay', COMPLETED: 'Đã diễn ra', NOT_STARTED: 'Chưa đến hạn',
  PENDING: 'Chờ nhập điểm', IN_PROGRESS: 'Đang nhập điểm', LOCKED: 'Đã khóa',
};

export function MyExamsLive({ actor }: { actor: Actor }) {
  const { childId, setChildId } = useActiveChild();
  const children = useApi<ApiUser[]>(actor === 'parent' ? '/me/children' : null);
  const query = actor === 'parent' && childId ? `?childId=${encodeURIComponent(childId)}` : '';
  const agenda = useApi<ExamAgendaItem[]>(`/me/exam-agenda${query}`);
  const [filterValue, setFilterValue] = useHashString('task', 'ALL');
  const filter = filterValue as Filter;
  const rows = useMemo(() => (agenda.data || []).filter((item) => filter === 'ALL' || item.taskType === filter), [agenda.data, filter]);
  const upcoming = (agenda.data || []).filter((item) => ['UPCOMING', 'TODAY', 'NOT_STARTED', 'PENDING', 'IN_PROGRESS'].includes(item.status)).length;
  const todayCount = (agenda.data || []).filter((item) => item.status === 'TODAY').length;
  const revisions = Math.max(0, ...(agenda.data || []).map((item) => item.scheduleRevision));
  const filters: Filter[] = actor === 'teacher' ? ['ALL', 'PROCTOR', 'GRADING', 'GRADE_ENTRY'] : ['ALL'];

  const scheduleContent = <Section title="Lịch và công việc" subtitle="Dữ liệu được cập nhật trực tiếp sau khi quản trị viên công bố lịch" wide>
    <div className="my-exams-toolbar">
      {actor === 'parent' && <label><span>Học sinh</span><select className="live-select" value={childId || ''} onChange={(event) => setChildId(event.target.value || null)}>
        <option value="">Tất cả học sinh</option>{(children.data || []).map((child) => <option key={child.id} value={child.id}>{child.fullName} · {child.className || 'Chưa xếp lớp'}</option>)}
      </select></label>}
      <div className="my-exams-filters">{filters.map((value) => <button type="button" key={value} className={filter === value ? 'active' : ''} onClick={() => setFilterValue(value)}>
        {value === 'ALL' ? 'Tất cả' : taskMeta[value].label}
      </button>)}</div>
      <button type="button" className="live-btn ghost compact" onClick={agenda.reload}><RefreshCw size={15} /> Làm mới</button>
    </div>
    <Async state={agenda} allowEmpty empty="Chưa có lịch thi nào được công bố cho tài khoản này">
      {() => rows.length === 0 ? <div className="empty-state"><strong>Không có công việc phù hợp bộ lọc</strong></div> : <div className="exam-agenda-list">
        {rows.map((item) => <ExamAgendaCard key={item.id} item={item} actor={actor} />)}
      </div>}
    </Async>
  </Section>;

  const tabs = actor === 'teacher' ? [
    { id: 'schedule', label: 'Lịch & nhiệm vụ', Icon: CalendarClock, content: scheduleContent },
    { id: 'grading', label: 'Nhập điểm thi', Icon: ClipboardPenLine, content: <TeacherGradingWorkspace /> },
    { id: 'reviews', label: 'Xử lý phúc khảo', Icon: History, content: <TeacherReviewWorkspace /> },
  ] : actor === 'student' ? [
    { id: 'schedule', label: 'Lịch thi', Icon: CalendarClock, content: scheduleContent },
    { id: 'results', label: 'Kết quả & phúc khảo', Icon: GraduationCap, content: <StudentResultWorkspace actor="student" /> },
  ] : [
    { id: 'schedule', label: 'Lịch thi', Icon: CalendarClock, content: scheduleContent },
    { id: 'results', label: 'Kết quả của con', Icon: GraduationCap, content: <StudentResultWorkspace actor="parent" childId={childId} /> },
  ];

  return <div className="my-exams-page">
    <section className="my-exams-hero">
      <div><span><CalendarClock size={16} /> Lịch khảo thí đã công bố</span>
        <h2>{actor === 'teacher' ? 'Khảo thí và nhiệm vụ của tôi' : actor === 'parent' ? 'Lịch thi của con' : 'Lịch thi và kết quả của tôi'}</h2>
        <p>{actor === 'teacher'
          ? 'Theo dõi lịch, nhập điểm đúng lớp phụ trách và xử lý yêu cầu phúc khảo trên một quy trình thống nhất.'
          : 'Thông tin chính thức về thời gian, phòng thi, số báo danh, kết quả và trạng thái phúc khảo.'}</p></div>
      <div className="my-exams-summary"><article><strong>{upcoming}</strong><span>Việc sắp tới</span></article><article><strong>{todayCount}</strong><span>Trong hôm nay</span></article><article><strong>{revisions || '—'}</strong><span>Phiên bản lịch</span></article></div>
    </section>
    {tabs.length ? <FunctionTabs tabs={tabs} /> : scheduleContent}
  </div>;
}

function TeacherGradingWorkspace() {
  const toast = useToast();
  const tasks = useApi<TeacherGradingTask[]>('/me/exam-grading');
  const [taskKey, setTaskKey] = useState('');
  const [draft, setDraft] = useState<Record<string, { score: string; note: string }>>({});
  const [busy, setBusy] = useState(false);
  const selected = (tasks.data || []).find((task) => `${task.scheduleId}:${task.classId}` === taskKey);
  const scoreEntryTime = selected ? fmtDateTime(selected.scoreEntryOpensAt) : '';
  useEffect(() => {
    if (!taskKey && tasks.data?.length) setTaskKey(`${tasks.data[0].scheduleId}:${tasks.data[0].classId}`);
  }, [taskKey, tasks.data]);
  useEffect(() => {
    const next: Record<string, { score: string; note: string }> = {};
    for (const candidate of selected?.candidates || []) next[candidate.studentId] = {
      score: candidate.score == null ? '' : String(candidate.score), note: candidate.note || '',
    };
    setDraft(next);
  }, [selected]);
  const save = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await api.put(`/exam-periods/${selected.examPeriodId}/results`, {
        scheduleId: selected.scheduleId,
        entries: selected.candidates.map((candidate) => ({
          studentId: candidate.studentId,
          score: draft[candidate.studentId]?.score === '' ? null : Number(draft[candidate.studentId]?.score),
          note: draft[candidate.studentId]?.note || null,
          expectedVersion: candidate.version ?? null,
        })),
      });
      toast.show('ok', 'Đã lưu điểm thi của lớp'); tasks.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };
  return <Section title="Nhập điểm theo phân công chấm thi" subtitle="Chỉ giáo viên đúng chuyên môn được quản trị viên giao chấm lớp này mới có quyền cập nhật điểm" wide>
    {toast.node}<div className="exam-grading-toolbar"><select className="live-select" value={taskKey} onChange={(event) => setTaskKey(event.target.value)}><option value="">Chọn môn và lớp được phân công</option>{(tasks.data || []).map((task) => <option key={`${task.scheduleId}:${task.classId}`} value={`${task.scheduleId}:${task.classId}`}>{task.examPeriodName} · {task.subjectName} · {task.classCode}</option>)}</select><button className="live-btn" disabled={!selected || selected.scoreEntryLocked || busy || !selected.candidates.length} onClick={save}><Save size={15} /> Lưu bảng điểm</button></div>
    <Async state={tasks} allowEmpty empty="Chưa có lớp nào được phân công chấm thi">{() => selected ? <>
      <div className="exam-grading-context"><div><small>Kỳ thi</small><strong>{selected.examPeriodName}</strong></div><div><small>Môn · lớp</small><strong>{selected.subjectName} · {selected.classCode}</strong></div><div><small>Ngày thi</small><strong>{fmtDate(selected.examDate)} · {selected.startTime}</strong></div><StatusPill value={!selected.scoreEntryAvailable ? 'NOT_STARTED' : selected.scoreEntryLocked ? 'LOCKED' : 'OPEN'} /></div>
      <div className={`exam-score-unlock-notice ${!selected.scoreEntryAvailable ? 'waiting' : selected.scoreEntryLocked ? 'locked' : 'open'}`}>
        {!selected.scoreEntryAvailable ? <Clock3 size={18} /> : <ShieldCheck size={18} />}
        <div>
          <strong>{!selected.scoreEntryAvailable ? 'Chưa đến thời gian nhập điểm' : selected.scoreEntryLocked ? 'Bảng điểm đang bị khóa' : 'Đã mở nhập điểm thi'}</strong>
          <span>{!selected.scoreEntryAvailable
            ? `Hệ thống tự mở và gửi thông báo nhập điểm lúc ${scoreEntryTime}, sau khi ca thi kết thúc đủ 7 ngày.`
            : selected.scoreEntryLocked
              ? 'Kỳ thi đang khóa kết quả; liên hệ quản trị viên nếu cần cập nhật.'
              : 'Bạn có thể nhập và lưu điểm cho đúng lớp được phân công chấm thi.'}</span>
        </div>
      </div>
      <div className="exam-table-wrap"><table className="live-table"><thead><tr><th>SBD</th><th>Học sinh</th><th>Phòng</th><th>Chỗ</th><th>Điểm</th><th>Nhận xét</th><th>Trạng thái</th></tr></thead><tbody>{selected.candidates.map((candidate) => <tr key={candidate.candidateId}><td><strong className="candidate-number">{candidate.candidateNo}</strong></td><td><strong>{candidate.studentName}</strong><small className="table-subline">{candidate.studentCode}</small></td><td>{candidate.roomCode || '—'}</td><td>{candidate.seatNo ?? '—'}</td><td><input className="exam-score-input" type="number" min="0" max="10" step="0.1" disabled={selected.scoreEntryLocked || !selected.scoreEntryAvailable} value={draft[candidate.studentId]?.score ?? ''} onChange={(event) => setDraft({ ...draft, [candidate.studentId]: { score: event.target.value, note: draft[candidate.studentId]?.note || '' } })} /></td><td><input className="live-input exam-note-input" disabled={selected.scoreEntryLocked || !selected.scoreEntryAvailable} value={draft[candidate.studentId]?.note ?? ''} onChange={(event) => setDraft({ ...draft, [candidate.studentId]: { score: draft[candidate.studentId]?.score || '', note: event.target.value } })} placeholder="Nhận xét (không bắt buộc)" /></td><td><StatusPill value={candidate.resultStatus} /></td></tr>)}</tbody></table></div>
    </> : <div className="empty-state"><strong>Chọn môn và lớp để nhập điểm</strong></div>}</Async>
  </Section>;
}

function TeacherReviewWorkspace() {
  const toast = useToast();
  const reviews = useApi<ExamReviewRequest[]>('/me/exam-reviews');
  const [draft, setDraft] = useState<Record<string, { score: string; resolution: string }>>({});
  const [busyId, setBusyId] = useState('');
  const resolve = async (review: ExamReviewRequest, status: 'APPROVED' | 'REJECTED') => {
    const values = draft[review.id] || { score: String(review.originalScore ?? ''), resolution: '' };
    if (values.resolution.trim().length < 5) return toast.show('err', 'Kết luận phải có ít nhất 5 ký tự');
    if (status === 'APPROVED' && (values.score === '' || Number(values.score) < 0 || Number(values.score) > 10)) return toast.show('err', 'Điểm sau phúc khảo phải từ 0 đến 10');
    setBusyId(review.id);
    try {
      await api.put(`/exam-reviews/${review.id}/resolve`, { status, resolution: values.resolution.trim(), resolvedScore: status === 'APPROVED' ? Number(values.score) : null });
      toast.show('ok', 'Đã xử lý yêu cầu và cập nhật kết quả'); reviews.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusyId(''); }
  };
  return <Section title="Yêu cầu phúc khảo được giao" subtitle="Giáo viên chỉ thấy yêu cầu thuộc môn và lớp mình phụ trách" wide>{toast.node}
    <Async state={reviews} allowEmpty empty="Chưa có yêu cầu phúc khảo nào">{(rows) => <div className="teacher-review-grid">{rows.map((review) => {
      const values = draft[review.id] || { score: String(review.originalScore ?? ''), resolution: '' };
      return <article key={review.id}><div className="teacher-review-head"><div><small>{review.subjectName}</small><strong>{review.studentName}</strong><span>{fmtDateTime(review.requestedAt)}</span></div><StatusPill value={review.status} /></div><div className="teacher-review-score"><span>Điểm hiện tại</span><strong>{review.originalScore ?? '—'}</strong></div><p><b>Lý do học sinh:</b> {review.reason}</p>{review.status === 'PENDING' ? <><div className="teacher-review-form"><label><span>Điểm sau phúc khảo</span><input className="live-input" type="number" min="0" max="10" step="0.1" value={values.score} onChange={(event) => setDraft({ ...draft, [review.id]: { ...values, score: event.target.value } })} /></label><label><span>Kết luận xử lý</span><textarea className="live-input" value={values.resolution} onChange={(event) => setDraft({ ...draft, [review.id]: { ...values, resolution: event.target.value } })} placeholder="Nêu kết quả chấm lại và lý do điều chỉnh" /></label></div><div className="teacher-review-actions"><button className="live-btn" disabled={busyId === review.id} onClick={() => resolve(review, 'APPROVED')}><CheckCircle2 size={15} /> Chấp nhận & cập nhật điểm</button><button className="live-btn ghost" disabled={busyId === review.id} onClick={() => resolve(review, 'REJECTED')}>Giữ nguyên điểm</button></div></> : <div className="review-resolution"><strong>Kết luận</strong><p>{review.resolution}</p>{review.resolvedScore != null && <span>Điểm sau xử lý: <b>{review.resolvedScore}</b></span>}</div>}</article>;
    })}</div>}</Async>
  </Section>;
}

function StudentResultWorkspace({ actor, childId }: { actor: 'student' | 'parent'; childId?: string | null }) {
  const toast = useToast();
  const results = useApi<StudentExamResultView[]>(actor === 'student' ? '/me/exam-results' : childId ? `/children/${childId}/exam-results` : null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState('');
  const requestReview = async (result: StudentExamResultView) => {
    const reason = reasons[result.resultId]?.trim() || '';
    if (reason.length < 10) return toast.show('err', 'Lý do phúc khảo phải có ít nhất 10 ký tự');
    setBusyId(result.resultId);
    try {
      await api.post(`/exam-periods/${result.examPeriodId}/reviews`, { resultId: result.resultId, reason });
      toast.show('ok', 'Đã gửi yêu cầu đến giáo viên phụ trách'); setReasons({ ...reasons, [result.resultId]: '' }); results.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusyId(''); }
  };
  return <Section title={actor === 'parent' ? 'Kết quả thi của con' : 'Kết quả thi và phúc khảo'} subtitle={actor === 'parent' ? 'Theo dõi điểm và trạng thái phúc khảo do học sinh đã gửi' : 'Điểm chỉ hiển thị sau khi nhà trường công bố; yêu cầu được chuyển trực tiếp đến giáo viên phụ trách'} wide>{toast.node}
    <Async state={results} allowEmpty empty="Chưa có kết quả thi nào được công bố">{(rows) => <div className="student-result-grid">{rows.map((result) => <article key={result.resultId}><div className="student-result-main"><div><small>{result.examPeriodName}</small><h3>{result.subjectName}</h3>{result.note && <p>{result.note}</p>}</div><div className="student-result-score"><span>Điểm thi</span><strong>{result.score ?? '—'}</strong></div></div>{result.reviewId ? <div className={`student-review-status status-${(result.reviewStatus || '').toLowerCase()}`}><div><History size={17} /><strong>Phúc khảo: <StatusPill value={result.reviewStatus || 'PENDING'} /></strong></div><p>{result.reviewReason}</p>{result.reviewResolution && <><span>Kết luận của giáo viên</span><p>{result.reviewResolution}</p>{result.resolvedScore != null && <b>Điểm sau xử lý: {result.resolvedScore}</b>}</>}</div> : actor === 'student' ? <div className="student-review-form"><label><span>Đề nghị phúc khảo</span><textarea className="live-input" placeholder="Mô tả lý do cần kiểm tra lại bài thi (ít nhất 10 ký tự)" value={reasons[result.resultId] || ''} onChange={(event) => setReasons({ ...reasons, [result.resultId]: event.target.value })} /></label><button className="live-btn ghost" disabled={busyId === result.resultId} onClick={() => requestReview(result)}><Send size={15} /> Gửi yêu cầu</button></div> : <p className="table-subline">Học sinh chưa gửi yêu cầu phúc khảo.</p>}</article>)}</div>}</Async>
  </Section>;
}

function ExamAgendaCard({ item, actor }: { item: ExamAgendaItem; actor: Actor }) {
  const { Icon, label } = taskMeta[item.taskType];
  const isToday = item.status === 'TODAY';
  const isDone = ['COMPLETED', 'LOCKED'].includes(item.status);
  return <article className={`exam-agenda-card ${isToday ? 'today' : ''} ${isDone ? 'done' : ''}`}>
    <div className="exam-agenda-date"><strong>{new Date(`${item.examDate}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit' })}</strong><span>{new Date(`${item.examDate}T00:00:00`).toLocaleDateString('vi-VN', { month: 'short' })}</span></div>
    <div className="exam-agenda-main">
      <div className="exam-agenda-title"><span className={`exam-task-icon ${item.taskType.toLowerCase()}`}><Icon size={18} /></span><div><small>{label} · {item.examPeriodName}</small><h3>{item.subjectName}</h3></div><span className={`exam-agenda-status status-${item.status.toLowerCase()}`}>{isDone ? <CheckCircle2 size={14} /> : isToday ? <AlertCircle size={14} /> : <Clock3 size={14} />}{statusLabels[item.status]}</span></div>
      <div className="exam-agenda-details">
        <span><CalendarClock size={16} /><b>{fmtDate(item.examDate)}</b></span><span><Clock3 size={16} /><b>{item.startTime}</b> · {item.durationMinutes} phút</span>
        {item.roomCode && <span><DoorOpen size={16} />Phòng <b>{item.roomCode}</b></span>}
        {item.classCode && <span><Users size={16} />Lớp <b>{item.classCode}</b></span>}
      </div>
      {item.taskType === 'CANDIDATE' && <div className="exam-candidate-ticket"><span><ShieldCheck size={16} /> Số báo danh <b className="candidate-number">{item.candidateNo}</b></span><span><MapPin size={16} /> Chỗ ngồi <b>{item.seatNo}</b></span>{actor === 'parent' && item.studentName && <span><GraduationCap size={16} /> <b>{item.studentName}</b></span>}</div>}
      {item.proctorNames && <p className="exam-agenda-note"><UserCheck size={15} /> Giám thị: {item.proctorNames}</p>}
      {item.notes && <p className="exam-agenda-note">Lưu ý: {item.notes}</p>}
    </div>
    <span className="exam-revision">Lịch v{item.scheduleRevision}</span>
  </article>;
}

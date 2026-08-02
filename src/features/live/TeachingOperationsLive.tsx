import { useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRightLeft, BookOpenCheck, CalendarClock, CalendarDays,
  CheckCircle2, FilePenLine, MapPin, RefreshCw, Search, Send,
  Sparkles, UserRoundCheck, UsersRound,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type {
  LessonDiary, SubstituteCandidate, TeachingLessonOccurrence,
  TeachingOperationsWorkspace, TimetableChangeRequestView,
} from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, EmptyState, PaginatedData, useToast } from './common';
import { Field, Modal } from './Modal';
import { useHashString } from '../../api/urlState';

const DAY = 24 * 60 * 60 * 1000;

function isoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function viDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('vi-VN', {
    weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function changeTypeLabel(value: string) {
  if (value === 'SUBSTITUTE') return 'Dạy thay';
  if (value === 'RESCHEDULE') return 'Đổi tiết';
  if (value === 'SUBSTITUTE_AND_RESCHEDULE') return 'Dạy thay & đổi tiết';
  return value;
}

function assignmentLabel(value: string) {
  if (value === 'SUBSTITUTE') return 'Tiết dạy thay';
  if (value === 'RESCHEDULE') return 'Tiết đã đổi lịch';
  if (value === 'SUBSTITUTE_AND_RESCHEDULE') return 'Dạy thay theo lịch mới';
  return 'Tiết theo TKB';
}

type DiaryForm = {
  topic: string;
  lessonContent: string;
  homework: string;
  classNote: string;
  attendanceSummary: string;
};

const emptyDiary: DiaryForm = {
  topic: '', lessonContent: '', homework: '', classNote: '', attendanceSummary: '',
};

type ChangeForm = {
  requestType: 'SUBSTITUTE' | 'RESCHEDULE';
  substituteTeacherId: string;
  proposedDate: string;
  proposedPeriodNo: string;
  proposedStartTime: string;
  proposedEndTime: string;
  proposedRoomCode: string;
  reason: string;
};

const emptyChange: ChangeForm = {
  requestType: 'SUBSTITUTE', substituteTeacherId: '', proposedDate: '', proposedPeriodNo: '',
  proposedStartTime: '', proposedEndTime: '', proposedRoomCode: '', reason: '',
};

export function TeachingOperationsLive() {
  const { user } = useAuth();
  const today = useMemo(() => isoDate(new Date()), []);
  const defaultRange = useMemo(() => {
    const now = new Date();
    return {
      from: isoDate(new Date(now.getTime() - 7 * DAY)),
      to: isoDate(new Date(now.getTime() + 21 * DAY)),
    };
  }, []);
  const [from, setFrom] = useHashString('from', defaultRange.from);
  const [to, setTo] = useHashString('to', defaultRange.to);
  const [tabValue, setTabValue] = useHashString('tab', 'lessons');
  const tab: 'lessons' | 'changes' = tabValue === 'changes' ? 'changes' : 'lessons';
  const setTab = (value: 'lessons' | 'changes') => setTabValue(value, 'push');
  const [query, setQuery] = useHashString('q', '');
  const [lessonStatus, setLessonStatus] = useHashString('diary', 'ALL');
  const [changeStatus, setChangeStatus] = useHashString('status', 'ALL');
  const workspace = useApi<TeachingOperationsWorkspace>(
    `/me/teaching-operations?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
  );
  const toast = useToast();
  const [diaryLesson, setDiaryLesson] = useState<TeachingLessonOccurrence | null>(null);
  const [diaryForm, setDiaryForm] = useState<DiaryForm>(emptyDiary);
  const [diaryLoading, setDiaryLoading] = useState(false);
  const [savingDiary, setSavingDiary] = useState(false);
  const [changeLesson, setChangeLesson] = useState<TeachingLessonOccurrence | null>(null);
  const [changeForm, setChangeForm] = useState<ChangeForm>(emptyChange);
  const [savingChange, setSavingChange] = useState(false);
  const candidates = useApi<SubstituteCandidate[]>(changeLesson && changeForm.requestType === 'SUBSTITUTE'
    ? `/me/teaching-operations/substitute-candidates?slotId=${encodeURIComponent(changeLesson.slotId)}&date=${encodeURIComponent(changeLesson.date)}`
    : null);

  const lessons = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return (workspace.data?.lessons || []).filter((lesson) => {
      const matchesQuery = !normalized
        || lesson.classCode.toLocaleLowerCase('vi').includes(normalized)
        || lesson.subjectName.toLocaleLowerCase('vi').includes(normalized)
        || (lesson.roomCode || '').toLocaleLowerCase('vi').includes(normalized);
      const matchesStatus = lessonStatus === 'ALL'
        || lesson.diaryStatus === lessonStatus
        || (lessonStatus === 'MISSING' && lesson.date <= today && lesson.effectiveTeacherId === user?.id && lesson.diaryStatus !== 'SUBMITTED');
      return matchesQuery && matchesStatus;
    });
  }, [lessonStatus, query, today, user?.id, workspace.data?.lessons]);

  const groupedLessons = useMemo(() => {
    const groups = new Map<string, TeachingLessonOccurrence[]>();
    lessons.forEach((lesson) => groups.set(lesson.date, [...(groups.get(lesson.date) || []), lesson]));
    return [...groups.entries()];
  }, [lessons]);

  const allChanges = useMemo(() => workspace.data?.changes || [], [workspace.data?.changes]);
  const changes = useMemo(() => allChanges.filter((change) => changeStatus === 'ALL' || change.status === changeStatus), [allChanges, changeStatus]);
  const completedDiaries = (workspace.data?.lessons || []).filter((lesson) => lesson.diaryStatus === 'SUBMITTED').length;
  const missingDiaries = (workspace.data?.lessons || []).filter((lesson) => lesson.date <= today
    && lesson.effectiveTeacherId === user?.id && lesson.diaryStatus !== 'SUBMITTED').length;
  const pendingChanges = allChanges.filter((change) => change.status === 'PENDING').length;

  const openDiary = async (lesson: TeachingLessonOccurrence) => {
    setDiaryLesson(lesson);
    setDiaryForm(emptyDiary);
    setDiaryLoading(true);
    try {
      const current = await api.get<LessonDiary | null>(
        `/me/lesson-diaries/${encodeURIComponent(lesson.slotId)}/${encodeURIComponent(lesson.date)}`,
      );
      if (current) setDiaryForm({
        topic: current.topic || '', lessonContent: current.lessonContent || '', homework: current.homework || '',
        classNote: current.classNote || '', attendanceSummary: current.attendanceSummary || '',
      });
    } catch (error: any) {
      toast.show('err', error.message);
      setDiaryLesson(null);
    } finally { setDiaryLoading(false); }
  };

  const saveDiary = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (!diaryLesson) return;
    setSavingDiary(true);
    try {
      await api.put(`/me/lesson-diaries/${encodeURIComponent(diaryLesson.slotId)}/${encodeURIComponent(diaryLesson.date)}`, {
        ...diaryForm, status,
      });
      toast.show('ok', status === 'SUBMITTED' ? 'Đã hoàn tất sổ đầu bài' : 'Đã lưu bản nháp');
      setDiaryLesson(null);
      workspace.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSavingDiary(false); }
  };

  const openChange = (lesson: TeachingLessonOccurrence) => {
    setChangeLesson(lesson);
    setChangeForm({ ...emptyChange, proposedDate: lesson.date, proposedPeriodNo: String(lesson.periodNo),
      proposedStartTime: lesson.startTime, proposedEndTime: lesson.endTime, proposedRoomCode: lesson.roomCode || '' });
  };

  const createChange = async () => {
    if (!changeLesson) return;
    if (!changeForm.reason.trim()) return toast.show('err', 'Vui lòng nhập lý do điều chỉnh');
    setSavingChange(true);
    try {
      await api.post('/me/timetable-change-requests', {
        slotId: changeLesson.slotId,
        occurrenceDate: changeLesson.date,
        requestType: changeForm.requestType,
        substituteTeacherId: changeForm.requestType === 'SUBSTITUTE' ? changeForm.substituteTeacherId : null,
        proposedDate: changeForm.requestType === 'RESCHEDULE' ? changeForm.proposedDate : null,
        proposedPeriodNo: changeForm.requestType === 'RESCHEDULE' ? Number(changeForm.proposedPeriodNo) : null,
        proposedStartTime: changeForm.requestType === 'RESCHEDULE' ? changeForm.proposedStartTime : null,
        proposedEndTime: changeForm.requestType === 'RESCHEDULE' ? changeForm.proposedEndTime : null,
        proposedRoomCode: changeForm.requestType === 'RESCHEDULE' ? changeForm.proposedRoomCode : null,
        reason: changeForm.reason,
      });
      toast.show('ok', 'Đã gửi yêu cầu tới Giáo vụ');
      setChangeLesson(null);
      workspace.reload();
      setTab('changes');
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSavingChange(false); }
  };

  const cancelChange = async (request: TimetableChangeRequestView) => {
    if (!confirm(`Hủy yêu cầu ${changeTypeLabel(request.requestType).toLocaleLowerCase('vi')} môn ${request.subjectName}?`)) return;
    try {
      await api.post(`/me/timetable-change-requests/${encodeURIComponent(request.id)}/cancel`);
      toast.show('ok', 'Đã hủy yêu cầu');
      workspace.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  return <div className="teaching-operations-page">
    {toast.node}
    <header className="teaching-operations-hero">
      <div>
        <span><Sparkles size={15} /> Không gian vận hành tiết dạy</span>
        <h2>Sổ đầu bài và điều chỉnh lịch</h2>
        <p>Mỗi tiết học có một nhật ký rõ ràng. Yêu cầu dạy thay hoặc đổi tiết được Giáo vụ duyệt trước khi áp dụng.</p>
      </div>
      <button type="button" className="live-btn ghost" onClick={() => workspace.reload()}><RefreshCw size={16} /> Làm mới</button>
    </header>

    <section className="teaching-operations-kpis" aria-label="Tổng quan công việc">
      <article><span><CalendarDays size={20} /></span><div><small>Tiết trong phạm vi</small><strong>{workspace.data?.lessons.length || 0}</strong><p>{viDate(from)} – {viDate(to)}</p></div></article>
      <article className={missingDiaries ? 'attention' : ''}><span><FilePenLine size={20} /></span><div><small>Sổ cần hoàn tất</small><strong>{missingDiaries}</strong><p>Các tiết đã diễn ra do thầy/cô phụ trách</p></div></article>
      <article><span><CheckCircle2 size={20} /></span><div><small>Đã hoàn tất</small><strong>{completedDiaries}</strong><p>Sổ đầu bài đã gửi chính thức</p></div></article>
      <article className={pendingChanges ? 'waiting' : ''}><span><ArrowRightLeft size={20} /></span><div><small>Chờ Giáo vụ</small><strong>{pendingChanges}</strong><p>Yêu cầu điều chỉnh đang xét duyệt</p></div></article>
    </section>

    <section className="teaching-operations-toolbar">
      <div className="teaching-operations-tabs" role="tablist">
        <button type="button" className={tab === 'lessons' ? 'active' : ''} onClick={() => setTab('lessons')}><BookOpenCheck size={17} /> Nhật ký tiết dạy</button>
        <button type="button" className={tab === 'changes' ? 'active' : ''} onClick={() => setTab('changes')}><ArrowRightLeft size={17} /> Yêu cầu điều chỉnh <b>{pendingChanges || ''}</b></button>
      </div>
      <div className="teaching-operations-filters">
        <label><span>Từ ngày</span><input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
        <label><span>Đến ngày</span><input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
        {tab === 'lessons' ? <><label className="operations-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lớp, môn hoặc phòng" /></label><label><span>Trạng thái sổ</span><select value={lessonStatus} onChange={(event) => setLessonStatus(event.target.value)}><option value="ALL">Tất cả</option><option value="MISSING">Cần hoàn tất</option><option value="DRAFT">Bản nháp</option><option value="SUBMITTED">Đã hoàn tất</option></select></label></> : <label><span>Trạng thái yêu cầu</span><select value={changeStatus} onChange={(event) => setChangeStatus(event.target.value)}><option value="ALL">Tất cả</option><option value="PENDING">Chờ duyệt</option><option value="APPROVED">Đã duyệt</option><option value="REJECTED">Từ chối</option><option value="CANCELLED">Đã hủy</option></select></label>}
      </div>
    </section>

    {tab === 'lessons' ? <Async state={workspace} empty="Không có tiết dạy trong khoảng ngày đã chọn">
      {() => groupedLessons.length ? <PaginatedData items={groupedLessons} pageSize={5} itemLabel="ngày dạy" resetKey={`${from}:${to}:${query}:${lessonStatus}`} urlStateKey="teaching_days">{(pagedDays) => <div className="teaching-day-list">{pagedDays.map(([date, dayLessons]) => <section key={date} className={`teaching-day-card ${date === today ? 'today' : ''}`}>
        <header><div><CalendarClock size={19} /><span><strong>{date === today ? 'Hôm nay' : viDate(date)}</strong><small>{dayLessons.length} tiết dạy</small></span></div>{date === today && <Badge tone="blue">Đang theo dõi</Badge>}</header>
        <div className="teaching-lesson-list">{dayLessons.map((lesson) => {
          const isEffectiveTeacher = lesson.effectiveTeacherId === user?.id;
          const isOriginalTeacher = lesson.originalTeacherId === user?.id;
          const canRequest = isOriginalTeacher && !lesson.changeRequestId && lesson.date >= today;
          return <article key={lesson.occurrenceKey} className={`${lesson.diaryStatus === 'SUBMITTED' ? 'complete' : ''} ${!isEffectiveTeacher ? 'delegated' : ''}`}>
            <div className="lesson-time"><strong>Tiết {lesson.periodNo}</strong><span>{lesson.startTime}–{lesson.endTime}</span></div>
            <div className="lesson-main"><div><strong>{lesson.subjectName}</strong><Badge tone={lesson.assignmentState === 'ORIGINAL' ? 'blue' : 'violet'}>{assignmentLabel(lesson.assignmentState)}</Badge></div><p><UsersRound size={14} /> Lớp {lesson.classCode}<span><MapPin size={14} /> {lesson.roomCode || 'Chưa có phòng'}</span></p>{lesson.assignmentState !== 'ORIGINAL' && <small>{isEffectiveTeacher ? `Thầy/cô dạy thay cho ${lesson.originalTeacherName}` : `Giáo viên thực hiện: ${lesson.effectiveTeacherName}`}</small>}</div>
            <div className="lesson-diary-state">{lesson.diaryStatus === 'SUBMITTED' ? <><CheckCircle2 size={17} /><span><strong>Đã hoàn tất</strong><small>Sổ đầu bài đã gửi</small></span></> : lesson.diaryStatus === 'DRAFT' ? <><FilePenLine size={17} /><span><strong>Bản nháp</strong><small>Chưa gửi chính thức</small></span></> : <><AlertTriangle size={17} /><span><strong>Chưa ghi sổ</strong><small>{lesson.date > today ? 'Có thể chuẩn bị trước' : 'Cần bổ sung'}</small></span></>}</div>
            <div className="lesson-actions">{isEffectiveTeacher && <button type="button" className="live-btn subtle" onClick={() => openDiary(lesson)}><FilePenLine size={15} /> {lesson.diaryId ? 'Mở sổ' : 'Ghi sổ'}</button>}{canRequest && <button type="button" className="live-btn ghost" onClick={() => openChange(lesson)}><ArrowRightLeft size={15} /> Điều chỉnh</button>}</div>
          </article>;
        })}</div>
      </section>)}</div>}</PaginatedData> : <EmptyState label="Không có tiết dạy phù hợp với bộ lọc" />}
    </Async> : <Section title="Lịch sử yêu cầu" subtitle="Theo dõi một nơi duy nhất từ lúc gửi đến khi Giáo vụ phản hồi" wide>
      {changes.length ? <PaginatedData items={changes} pageSize={10} itemLabel="yêu cầu điều chỉnh" resetKey={changeStatus} urlStateKey="teaching_changes">{(pagedChanges) => <div className="change-request-list">{pagedChanges.map((request) => <article key={request.id}>
        <div className="change-request-icon"><ArrowRightLeft size={18} /></div>
        <div className="change-request-main"><header><strong>{changeTypeLabel(request.requestType)} · {request.subjectName} · Lớp {request.classCode}</strong><StatusPill value={request.status} /></header><p>{viDate(request.occurrenceDate)}{request.proposedDate ? ` → ${viDate(request.proposedDate)}, tiết ${request.proposedPeriodNo}` : ''}{request.substituteTeacherName ? ` · Dạy thay: ${request.substituteTeacherName}` : ''}</p><small>Lý do: {request.reason}</small>{request.reviewNote && <blockquote>Phản hồi Giáo vụ: {request.reviewNote}</blockquote>}</div>
        {request.status === 'PENDING' && <button type="button" className="live-btn ghost" onClick={() => cancelChange(request)}>Hủy yêu cầu</button>}
      </article>)}</div>}</PaginatedData> : <div className="operations-empty"><CheckCircle2 size={25} /><strong>{changeStatus === 'ALL' ? 'Chưa có yêu cầu điều chỉnh' : 'Không có yêu cầu ở trạng thái đã chọn'}</strong><span>{changeStatus === 'ALL' ? 'Lịch dạy hiện được thực hiện đúng theo thời khóa biểu đã phát hành.' : 'Hãy chọn trạng thái khác để xem các yêu cầu còn lại.'}</span></div>}
    </Section>}

    {diaryLesson && <Modal title={`Sổ đầu bài · ${diaryLesson.subjectName} · Lớp ${diaryLesson.classCode}`} size="wide" onClose={() => setDiaryLesson(null)} footer={<><button type="button" className="live-btn ghost" onClick={() => setDiaryLesson(null)}>Đóng</button><button type="button" className="live-btn subtle" disabled={savingDiary || diaryLoading} onClick={() => saveDiary('DRAFT')}>Lưu nháp</button><button type="button" className="live-btn" disabled={savingDiary || diaryLoading} onClick={() => saveDiary('SUBMITTED')}><Send size={15} /> Hoàn tất sổ</button></>}>
      <div className="diary-context"><CalendarDays size={18} /><div><strong>{viDate(diaryLesson.date)} · Tiết {diaryLesson.periodNo}</strong><span>{diaryLesson.startTime}–{diaryLesson.endTime} · Phòng {diaryLesson.roomCode || '—'} · Giáo viên thực hiện: {diaryLesson.effectiveTeacherName}</span></div></div>
      {diaryLoading ? <div className="operations-loading">Đang tải sổ đầu bài…</div> : <div className="lesson-diary-form">
        <Field label="Chủ đề / tên bài"><input value={diaryForm.topic} maxLength={500} onChange={(event) => setDiaryForm({ ...diaryForm, topic: event.target.value })} placeholder="Ví dụ: Hàm số bậc hai – tiết 1" /></Field>
        <Field label="Nội dung đã thực hiện"><textarea rows={5} value={diaryForm.lessonContent} maxLength={4000} onChange={(event) => setDiaryForm({ ...diaryForm, lessonContent: event.target.value })} placeholder="Nội dung trọng tâm, tiến độ thực tế…" /></Field>
        <div className="diary-form-grid"><Field label="Bài tập / chuẩn bị tiết sau"><textarea rows={3} value={diaryForm.homework} maxLength={2000} onChange={(event) => setDiaryForm({ ...diaryForm, homework: event.target.value })} /></Field><Field label="Tình hình lớp"><textarea rows={3} value={diaryForm.classNote} maxLength={2000} onChange={(event) => setDiaryForm({ ...diaryForm, classNote: event.target.value })} /></Field></div>
        <Field label="Tóm tắt chuyên cần"><input value={diaryForm.attendanceSummary} maxLength={1000} onChange={(event) => setDiaryForm({ ...diaryForm, attendanceSummary: event.target.value })} placeholder="Ví dụ: 38/40 có mặt, 2 học sinh nghỉ có phép" /></Field>
      </div>}
    </Modal>}

    {changeLesson && <Modal title={`Điều chỉnh tiết ${changeLesson.subjectName} · Lớp ${changeLesson.classCode}`} size="wide" onClose={() => setChangeLesson(null)} footer={<><button type="button" className="live-btn ghost" onClick={() => setChangeLesson(null)}>Đóng</button><button type="button" className="live-btn" disabled={savingChange || (changeForm.requestType === 'SUBSTITUTE' && !changeForm.substituteTeacherId)} onClick={createChange}><Send size={15} /> Gửi Giáo vụ duyệt</button></>}>
      <div className="change-workflow-note"><UserRoundCheck size={19} /><div><strong>Lịch chỉ thay đổi sau khi được duyệt</strong><span>Hệ thống sẽ kiểm tra đúng chuyên môn, trùng lịch giáo viên, lớp và phòng trước khi áp dụng.</span></div></div>
      <div className="change-type-picker"><button type="button" className={changeForm.requestType === 'SUBSTITUTE' ? 'active' : ''} onClick={() => setChangeForm({ ...changeForm, requestType: 'SUBSTITUTE', substituteTeacherId: '' })}><UserRoundCheck size={20} /><span><strong>Nhờ giáo viên dạy thay</strong><small>Giữ nguyên ngày, tiết và phòng</small></span></button><button type="button" className={changeForm.requestType === 'RESCHEDULE' ? 'active' : ''} onClick={() => setChangeForm({ ...changeForm, requestType: 'RESCHEDULE', substituteTeacherId: '' })}><CalendarClock size={20} /><span><strong>Đổi sang tiết khác</strong><small>Thầy/cô vẫn trực tiếp giảng dạy</small></span></button></div>
      {changeForm.requestType === 'SUBSTITUTE' ? <Field label="Giáo viên đúng chuyên môn và còn trống"><select value={changeForm.substituteTeacherId} onChange={(event) => setChangeForm({ ...changeForm, substituteTeacherId: event.target.value })}><option value="">Chọn giáo viên dạy thay</option>{(candidates.data || []).map((candidate) => <option key={candidate.id} value={candidate.id} disabled={!candidate.available}>{candidate.fullName} · {candidate.available ? 'Còn trống' : 'Trùng lịch'}</option>)}</select>{candidates.loading && <small>Đang kiểm tra lịch giáo viên…</small>}{candidates.error && <small className="field-help error">{candidates.error}</small>}{!candidates.loading && !candidates.error && candidates.data?.length === 0 && <small className="field-help error">Chưa có giáo viên khác cùng chuyên môn. Hãy chọn đổi tiết hoặc liên hệ Giáo vụ để bổ sung nhân sự.</small>}</Field> : <div className="reschedule-grid"><Field label="Ngày dạy bù"><input type="date" value={changeForm.proposedDate} onChange={(event) => setChangeForm({ ...changeForm, proposedDate: event.target.value })} /></Field><Field label="Tiết"><input type="number" min="1" max="12" value={changeForm.proposedPeriodNo} onChange={(event) => setChangeForm({ ...changeForm, proposedPeriodNo: event.target.value })} /></Field><Field label="Bắt đầu"><input type="time" value={changeForm.proposedStartTime} onChange={(event) => setChangeForm({ ...changeForm, proposedStartTime: event.target.value })} /></Field><Field label="Kết thúc"><input type="time" value={changeForm.proposedEndTime} onChange={(event) => setChangeForm({ ...changeForm, proposedEndTime: event.target.value })} /></Field><Field label="Phòng"><input value={changeForm.proposedRoomCode} onChange={(event) => setChangeForm({ ...changeForm, proposedRoomCode: event.target.value })} placeholder="Ví dụ: A101" /></Field></div>}
      <Field label="Lý do điều chỉnh"><textarea rows={4} maxLength={2000} value={changeForm.reason} onChange={(event) => setChangeForm({ ...changeForm, reason: event.target.value })} placeholder="Mô tả rõ lý do để Giáo vụ có đủ thông tin xét duyệt" /></Field>
    </Modal>}
  </div>;
}

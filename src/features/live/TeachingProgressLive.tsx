import { useEffect, useState } from 'react';
import { CheckCircle2, RefreshCw, Save, XCircle } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { ProgressBalanceResponse, SchoolClass, Semester, Subject, TeachingProgress, TimetableSlot } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';

function useSemesterSelection() {
  const semesters = useApi<Semester[]>('/semesters');
  const [semesterId, setSemesterId] = useState('');
  useEffect(() => {
    if (!semesterId && semesters.data?.length) {
      setSemesterId(semesters.data.find((item) => item.status === 'ACTIVE')?.id || semesters.data[0].id);
    }
  }, [semesterId, semesters.data]);
  return { semesters, semesterId, setSemesterId };
}

export function TeacherTeachingProgressLive() {
  const { semesters, semesterId, setSemesterId } = useSemesterSelection();
  const slots = useApi<TimetableSlot[]>(semesterId ? `/me/timetable?semesterId=${encodeURIComponent(semesterId)}` : null);
  const progress = useApi<TeachingProgress[]>(semesterId ? `/teaching-progress?semesterId=${encodeURIComponent(semesterId)}` : null);
  const [slotId, setSlotId] = useState('');
  const [lessonDate, setLessonDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [completedPeriods, setCompletedPeriods] = useState(1);
  const [topic, setTopic] = useState('');
  const [status, setStatus] = useState<'COMPLETED' | 'CANCELLED'>('COMPLETED');
  const [reason, setReason] = useState('');
  const [makeupDate, setMakeupDate] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const save = async () => {
    if (!slotId || !topic.trim()) return toast.show('err', 'Chọn tiết học và nhập nội dung đã dạy');
    if (status === 'CANCELLED' && reason.trim().length < 5) return toast.show('err', 'Tiết nghỉ cần ghi lý do ít nhất 5 ký tự');
    setBusy(true);
    try {
      await api.put('/teaching-progress', {
        timetableSlotId: slotId, lessonDate, completedPeriods: status === 'COMPLETED' ? completedPeriods : 0,
        topic: topic.trim(), status, reason: reason.trim() || null, makeupDate: makeupDate || null,
      });
      toast.show('ok', makeupDate ? 'Đã lưu và gửi đề xuất lịch bù' : 'Đã cập nhật tiến độ thực dạy');
      setTopic(''); setReason(''); setMakeupDate(''); await progress.reload();
    } catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể lưu tiến độ'); }
    finally { setBusy(false); }
  };
  return <div>{toast.node}<Section title="Cập nhật tiến độ thực dạy" subtitle="Ghi đúng tiết đã công bố; nếu nghỉ, đề xuất ngày học bù để quản trị viên duyệt" wide>
    <div className="live-filter-row"><label><span>Học kỳ</span><select className="live-select" value={semesterId} onChange={(event) => { setSemesterId(event.target.value); setSlotId(''); }}>{(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label><span>Tiết được phân công</span><select className="live-select" value={slotId} onChange={(event) => setSlotId(event.target.value)}><option value="">Chọn tiết học</option>{(slots.data || []).map((slot) => <option key={slot.id} value={slot.id}>{slot.classCode} · {slot.subjectName} · {slot.dayOfWeek} tiết {slot.periodNo}</option>)}</select></label><label><span>Ngày thực dạy</span><input className="live-input" type="date" value={lessonDate} onChange={(event) => setLessonDate(event.target.value)} /></label></div>
    <div className="live-form-grid"><label><span>Trạng thái</span><select className="live-select" value={status} onChange={(event) => setStatus(event.target.value as 'COMPLETED' | 'CANCELLED')}><option value="COMPLETED">Đã dạy</option><option value="CANCELLED">Nghỉ / hoãn</option></select></label><label><span>Số tiết hoàn thành</span><input className="live-input" type="number" min="1" max="6" disabled={status === 'CANCELLED'} value={completedPeriods} onChange={(event) => setCompletedPeriods(Number(event.target.value))} /></label><label><span>Ngày học bù (nếu có)</span><input className="live-input" type="date" min={lessonDate} value={makeupDate} onChange={(event) => setMakeupDate(event.target.value)} /></label><label className="span-2"><span>Nội dung/chủ đề</span><input className="live-input" value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="Nội dung kiến thức đã dạy hoặc dự kiến bù" /></label><label className="span-2"><span>Lý do nghỉ/điều chỉnh</span><input className="live-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Bắt buộc khi tiết bị nghỉ" /></label></div>
    <button className="live-btn" disabled={busy} onClick={save}><Save size={15} /> Lưu tiến độ</button>
  </Section>
  <Section title="Nhật ký của tôi" subtitle="Các đề xuất học bù sẽ hiển thị trạng thái duyệt tại đây" wide><Async state={progress} allowEmpty empty="Chưa có nhật ký tiến độ trong học kỳ này">{(rows) => <div className="live-table-wrap"><table className="live-table"><thead><tr><th>Ngày</th><th>Lớp · môn</th><th>Nội dung</th><th>Tiến độ</th><th>Học bù</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{fmtDate(item.lessonDate)}</td><td><strong>{item.classCode}</strong><small className="table-subline">{item.subjectName}</small></td><td>{item.topic}<small className="table-subline">{item.reason || 'Không có ghi chú'}</small></td><td><StatusPill value={item.status} /> · {item.completedPeriods} tiết</td><td>{item.makeupDate ? <><span>{fmtDate(item.makeupDate)}</span><small className="table-subline"><StatusPill value={item.makeupStatus} /> {item.reviewNote}</small></> : '—'}</td></tr>)}</tbody></table></div>}</Async></Section></div>;
}

export function AdminTeachingProgressLive() {
  const { semesters, semesterId, setSemesterId } = useSemesterSelection();
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const [classId, setClassId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const query = new URLSearchParams({ semesterId });
  if (classId) query.set('classId', classId);
  if (subjectId) query.set('subjectId', subjectId);
  const progress = useApi<TeachingProgress[]>(semesterId ? `/teaching-progress?${query}` : null);
  const balanceQuery = new URLSearchParams({ semesterId });
  if (subjectId) balanceQuery.set('subjectId', subjectId);
  const balance = useApi<ProgressBalanceResponse>(semesterId ? `/teaching-progress/balance?${balanceQuery}` : null);
  const [busyId, setBusyId] = useState('');
  const toast = useToast();
  const review = async (item: TeachingProgress, status: 'APPROVED' | 'REJECTED') => {
    setBusyId(item.id);
    try { await api.put(`/teaching-progress/${item.id}/makeup`, { status, reviewNote: status === 'APPROVED' ? 'Đã duyệt theo kế hoạch nhà trường' : 'Cần đề xuất thời gian khác' }); toast.show('ok', status === 'APPROVED' ? 'Đã duyệt lịch bù' : 'Đã từ chối đề xuất'); await Promise.all([progress.reload(), balance.reload()]); }
    catch (error) { toast.show('err', error instanceof Error ? error.message : 'Không thể duyệt đề xuất'); }
    finally { setBusyId(''); }
  };
  return <div>{toast.node}<Section title="Theo dõi tiến độ và lịch bù" subtitle="Lọc theo học kỳ, khối lớp hoặc môn; duyệt đúng các đề xuất đang chờ" wide
    action={<button className="live-btn ghost" onClick={progress.reload}><RefreshCw size={15} /> Làm mới</button>}>
    <div className="live-filter-row"><select className="live-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>{(semesters.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select className="live-select" value={classId} onChange={(e) => setClassId(e.target.value)}><option value="">Tất cả lớp</option>{(classes.data || []).map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</select><select className="live-select" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}><option value="">Tất cả môn</option>{(subjects.data || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    <Async state={progress} allowEmpty empty="Chưa có giáo viên cập nhật tiến độ">{(rows) => <div className="live-table-wrap"><table className="live-table"><thead><tr><th>Ngày</th><th>Giáo viên</th><th>Lớp · môn</th><th>Nội dung</th><th>Lịch bù</th><th>Xử lý</th></tr></thead><tbody>{rows.map((item) => <tr key={item.id}><td>{fmtDate(item.lessonDate)}</td><td>{item.teacherName}</td><td><strong>{item.classCode}</strong><small className="table-subline">{item.subjectName}</small></td><td>{item.topic}<small className="table-subline">{item.completedPeriods} tiết · {item.status}</small></td><td>{item.makeupDate ? <>{fmtDate(item.makeupDate)}<small className="table-subline"><StatusPill value={item.makeupStatus} /></small></> : '—'}</td><td>{item.makeupStatus === 'PROPOSED' ? <div className="finance-row-actions"><button className="live-btn" disabled={busyId === item.id} onClick={() => review(item, 'APPROVED')}><CheckCircle2 size={14} /> Duyệt</button><button className="live-btn subtle" disabled={busyId === item.id} onClick={() => review(item, 'REJECTED')}><XCircle size={14} /> Từ chối</button></div> : '—'}</td></tr>)}</tbody></table></div>}</Async>
  </Section><Section title="Cân bằng tiến độ giữa các lớp" subtitle="Backend áp dụng cùng một quy tắc cho Web và Mobile: chênh tối đa 2 ngày và 1 tiết" wide><Async state={balance} allowEmpty>{(data) => data.rows.length ? <div className="live-table-wrap"><table className="live-table"><thead><tr><th>Môn</th><th>Lớp</th><th>Ngày gần nhất</th><th>Đã hoàn thành</th><th>Độ lệch</th><th>Kết quả</th></tr></thead><tbody>{data.rows.map((item) => <tr key={`${item.classId}:${item.subjectId}`}><td>{item.subjectName}</td><td><strong>{item.classCode}</strong></td><td>{fmtDate(item.lastLessonDate)}<small className="table-subline">{item.latestTopic}</small></td><td>{item.completedPeriods} tiết</td><td>{item.dayGapFromLeader} ngày · {item.periodGapFromLeader} tiết</td><td><Badge tone={item.withinTolerance ? 'green' : 'red'}>{item.withinTolerance ? 'Đồng đều' : 'Cần cân bằng'}</Badge></td></tr>)}</tbody></table></div> : <div className="empty-state">Chưa đủ dữ liệu để so sánh</div>}</Async></Section></div>;
}

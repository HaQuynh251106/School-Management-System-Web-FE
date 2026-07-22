import { useEffect, useMemo, useState } from 'react';
import {
  BookOpenCheck, CalendarClock, DoorOpen, Lock, Megaphone, Pencil, Plus, RefreshCw,
  Save, ShieldCheck, Trash2,
  Unlock, UsersRound, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, ApiUser, ExamCandidate, ExamPeriod, ExamPeriodSummary, ExamRoom,
  ExamSchedule, Room, SchoolClass, Semester, Subject,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';
import { AdminExamCategoriesLive } from './AdminLive';

const today = new Date().toISOString().slice(0, 10);
const blankSchedule = (date = today) => ({ subjectId: '', classIds: [] as string[], examDate: date, startTime: '07:30', durationMinutes: 90, notes: '' });

function toMinutes(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function schedulesOverlap(first: Pick<ExamSchedule, 'examDate' | 'startTime' | 'durationMinutes'>, second: Pick<ExamSchedule, 'examDate' | 'startTime' | 'durationMinutes'>) {
  if (first.examDate !== second.examDate) return false;
  const firstStart = toMinutes(first.startTime);
  const secondStart = toMinutes(second.startTime);
  return firstStart < secondStart + second.durationMinutes && secondStart < firstStart + first.durationMinutes;
}

export function AdminExamsLive() {
  const toast = useToast();
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const schoolRooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const periods = useApi<ExamPeriodSummary[]>('/exam-periods');
  const [periodId, setPeriodId] = useState('');
  const [scheduleId, setScheduleId] = useState('');
  const schedules = useApi<ExamSchedule[]>(periodId ? `/exam-periods/${periodId}/schedules` : null);
  const rooms = useApi<ExamRoom[]>(scheduleId ? `/exam-schedules/${scheduleId}/rooms` : null);
  const candidates = useApi<ExamCandidate[]>(periodId
    ? `/exam-periods/${periodId}/candidates${scheduleId ? `?scheduleId=${scheduleId}` : ''}` : null);

  const selectedSummary = periods.data?.find((item) => item.period.id === periodId);
  const selectedPeriod = selectedSummary?.period;
  const selectedSchedule = schedules.data?.find((item) => item.id === scheduleId);
  const [periodForm, setPeriodForm] = useState({ code: '', name: '', academicYearId: '', semesterId: '', gradeLevel: '', startDate: today, endDate: today });
  const [editingPeriodId, setEditingPeriodId] = useState('');
  const [scheduleForm, setScheduleForm] = useState(blankSchedule());
  const [editingScheduleId, setEditingScheduleId] = useState('');
  const [roomForm, setRoomForm] = useState({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
  const [editingRoomId, setEditingRoomId] = useState('');
  const [allocationClassId, setAllocationClassId] = useState('');
  const [allocationRoomId, setAllocationRoomId] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!periodId && periods.data?.length) setPeriodId(periods.data[0].period.id);
  }, [periodId, periods.data]);
  useEffect(() => {
    if (scheduleId && !schedules.data?.some((item) => item.id === scheduleId)) setScheduleId('');
  }, [scheduleId, schedules.data]);
  useEffect(() => {
    setEditingRoomId('');
    setAllocationRoomId('');
    setAllocationClassId('');
    setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
  }, [scheduleId]);
  useEffect(() => {
    setEditingScheduleId('');
    setScheduleForm(blankSchedule(selectedPeriod?.startDate || today));
  }, [periodId, selectedPeriod?.startDate]);

  const semesterOptions = (semesters.data || []).filter((item) => !periodForm.academicYearId || item.academicYearId === periodForm.academicYearId);
  const gradeOptions = useMemo(() => [...new Set((classes.data || []).map((item) => item.gradeLevel).filter(Boolean))].sort(), [classes.data]);
  const eligibleClasses = useMemo(() => (classes.data || []).filter((item) => !selectedPeriod?.gradeLevel || item.gradeLevel === selectedPeriod.gradeLevel), [classes.data, selectedPeriod]);
  const classById = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item])), [classes.data]);
  const scheduleConflicts = useMemo(() => (schedules.data || []).filter((item) => {
    if (item.id === editingScheduleId) return false;
    const sharedClass = (item.classIds || []).some((classId) => scheduleForm.classIds.includes(classId));
    return sharedClass && schedulesOverlap(item, scheduleForm);
  }), [editingScheduleId, scheduleForm, schedules.data]);
  const conflictingScheduleIds = useMemo(() => {
    const ids = new Set<string>();
    const rows = schedules.data || [];
    rows.forEach((first, index) => rows.slice(index + 1).forEach((second) => {
      if (!(first.classIds || []).some((id) => (second.classIds || []).includes(id)) || !schedulesOverlap(first, second)) return;
      ids.add(first.id); ids.add(second.id);
    }));
    return ids;
  }, [schedules.data]);

  const refreshExam = () => {
    periods.reload(); schedules.reload(); rooms.reload(); candidates.reload();
  };
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try { await action(); toast.show('ok', success); refreshExam(); }
    catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const resetPeriodForm = () => {
    setEditingPeriodId('');
    setPeriodForm({ code: '', name: '', academicYearId: '', semesterId: '', gradeLevel: '', startDate: today, endDate: today });
  };

  const savePeriod = () => run(async () => {
    const created = editingPeriodId
      ? await api.put<ExamPeriod>(`/exam-periods/${editingPeriodId}`, periodForm)
      : await api.post<ExamPeriod>('/exam-periods', periodForm);
    setPeriodId(created.id);
    resetPeriodForm();
  }, editingPeriodId ? 'Đã cập nhật kỳ thi' : 'Đã tạo kỳ thi');

  const editPeriod = (period: ExamPeriod) => {
    setEditingPeriodId(period.id);
    setPeriodId(period.id);
    setPeriodForm({ code: period.code, name: period.name, academicYearId: period.academicYearId,
      semesterId: period.semesterId, gradeLevel: period.gradeLevel || '', startDate: period.startDate, endDate: period.endDate });
  };

  const deletePeriod = (period: ExamPeriod) => {
    if (!window.confirm(`Xóa kỳ thi “${period.name}” cùng toàn bộ lịch, phòng và danh sách dự thi?`)) return;
    run(async () => {
      await api.del(`/exam-periods/${period.id}`);
      if (periodId === period.id) { setPeriodId(''); setScheduleId(''); }
      if (editingPeriodId === period.id) resetPeriodForm();
    }, 'Đã xóa kỳ thi và dữ liệu liên quan');
  };

  const resetScheduleForm = () => {
    setEditingScheduleId('');
    setScheduleForm(blankSchedule(selectedPeriod?.startDate || today));
  };

  const saveSchedule = () => periodId && run(async () => {
    const created = editingScheduleId
      ? await api.put<ExamSchedule>(`/exam-schedules/${editingScheduleId}`, scheduleForm)
      : await api.post<ExamSchedule>(`/exam-periods/${periodId}/schedules`, scheduleForm);
    setScheduleId(created.id);
    resetScheduleForm();
  }, editingScheduleId ? 'Đã cập nhật lịch thi' : 'Đã thêm lịch thi');

  const editSchedule = (schedule: ExamSchedule) => {
    setScheduleId(schedule.id);
    setEditingScheduleId(schedule.id);
    setScheduleForm({ subjectId: schedule.subjectId, classIds: [...(schedule.classIds || [])], examDate: schedule.examDate, startTime: schedule.startTime, durationMinutes: schedule.durationMinutes, notes: schedule.notes || '' });
  };

  const deleteSchedule = (schedule: ExamSchedule) => {
    if (!window.confirm(`Xóa lịch thi môn ${schedule.subjectName}? Phòng thi và danh sách dự thi của ca này cũng sẽ bị xóa.`)) return;
    run(async () => {
      await api.del(`/exam-schedules/${schedule.id}`);
      if (scheduleId === schedule.id) setScheduleId('');
      if (editingScheduleId === schedule.id) resetScheduleForm();
    }, 'Đã xóa lịch thi');
  };

  const toggleScheduleClass = (classId: string) => setScheduleForm((current) => ({
    ...current,
    classIds: current.classIds.includes(classId) ? current.classIds.filter((id) => id !== classId) : [...current.classIds, classId],
  }));

  const saveRoom = () => scheduleId && run(async () => {
    const created = await api.post<ExamRoom>(`/exam-schedules/${scheduleId}/rooms`, { ...roomForm, id: editingRoomId || undefined });
    setAllocationRoomId(created.id);
    setEditingRoomId('');
    setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
  }, editingRoomId ? 'Đã cập nhật phòng thi' : 'Đã phân phòng và giám thị');

  const editRoom = (room: ExamRoom) => {
    setEditingRoomId(room.id);
    setAllocationRoomId(room.id);
    setRoomForm({ roomCode: room.roomCode, capacity: room.capacity, proctorOneId: room.proctorOneId || '', proctorTwoId: room.proctorTwoId || '' });
  };

  const deleteRoom = (room: ExamRoom) => {
    if (!window.confirm(`Xóa phòng thi ${room.roomCode}?`)) return;
    run(async () => {
      await api.del(`/exam-rooms/${room.id}`);
      if (allocationRoomId === room.id) setAllocationRoomId('');
      if (editingRoomId === room.id) {
        setEditingRoomId('');
        setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' });
      }
    }, 'Đã xóa phòng thi');
  };

  const allocate = () => allocationRoomId && allocationClassId && run(
    () => api.post(`/exam-rooms/${allocationRoomId}/allocate`, { classId: allocationClassId }),
    'Đã cấp số báo danh và xếp chỗ cho lớp',
  );

  const changeLock = (locked: boolean) => periodId && run(
    () => api.post(`/exam-periods/${periodId}/${locked ? 'lock-scores' : 'unlock-scores'}`),
    locked ? 'Đã khóa nhập điểm và công bố kết quả' : 'Đã mở lại quyền nhập điểm',
  );

  const publishSchedule = () => periodId && run(
    () => api.post(`/exam-periods/${periodId}/publish-schedule`),
    selectedPeriod?.scheduleRevision ? 'Đã công bố lại lịch và gửi thông báo cập nhật' : 'Đã công bố lịch và gửi thông báo',
  );

  const confirmPeriod = () => periodId && run(
    () => api.post(`/exam-periods/${periodId}/confirm`), 'Đã xác nhận kỳ thi và báo cáo',
  );

  const contextBar = (
    <div className="exam-context-bar">
      <label><span>Kỳ thi đang thao tác</span><select className="live-select" value={periodId} onChange={(event) => { setPeriodId(event.target.value); setScheduleId(''); }}>
        <option value="">Chọn kỳ thi</option>{(periods.data || []).map(({ period }) => <option key={period.id} value={period.id}>{period.code} · {period.name}</option>)}
      </select></label>
      {selectedPeriod && <><div><small>Thời gian</small><strong>{fmtDate(selectedPeriod.startDate)} – {fmtDate(selectedPeriod.endDate)}</strong></div>
        <div><small>Trạng thái</small><StatusPill value={selectedPeriod.status} /></div>
        <div><small>Lịch người dùng</small><strong className={selectedPeriod.schedulePublished ? 'exam-published' : 'exam-unpublished'}>{selectedPeriod.schedulePublished ? `Đã công bố · v${selectedPeriod.scheduleRevision}` : selectedPeriod.scheduleRevision ? 'Có thay đổi · cần công bố lại' : 'Chưa công bố'}</strong></div></>}
      <button className="live-btn ghost compact" onClick={refreshExam}><RefreshCw size={15} /> Làm mới</button>
    </div>
  );

  return <div className="exam-workspace">
    {toast.node}
    <section className="exam-hero">
      <div><span className="exam-eyebrow"><ShieldCheck size={15} /> Trung tâm khảo thí số</span>
        <h2>Quản lý toàn bộ vòng đời kỳ thi</h2>
        <p>Tạo kỳ thi, lập lịch, phân phòng, cấp số báo danh tự động và điều phối công tác tổ chức trên một quy trình.</p></div>
      <div className="exam-kpis">
        <div><strong>{periods.data?.length || 0}</strong><span>Kỳ thi</span></div>
        <div><strong>{selectedSummary?.scheduleCount || 0}</strong><span>Môn thi</span></div>
        <div><strong>{selectedSummary?.candidateCount || 0}</strong><span>Thí sinh</span></div>
        <div><strong>{selectedSummary?.roomCount || 0}</strong><span>Phòng thi</span></div>
      </div>
    </section>
    {contextBar}
    <FunctionTabs tabs={[
      { id: 'periods', label: 'Kỳ thi', Icon: CalendarClock, content: <Section title="Kỳ thi và trạng thái" subtitle="Tạo kỳ thi, kiểm soát nhập điểm và xác nhận kết quả" wide>
        <div className="exam-form-grid period">
          <input className="live-input" placeholder="Mã kỳ thi" value={periodForm.code} onChange={(e) => setPeriodForm({ ...periodForm, code: e.target.value })} />
          <input className="live-input" placeholder="Tên kỳ thi" value={periodForm.name} onChange={(e) => setPeriodForm({ ...periodForm, name: e.target.value })} />
          <select className="live-select" value={periodForm.academicYearId} onChange={(e) => setPeriodForm({ ...periodForm, academicYearId: e.target.value, semesterId: '' })}><option value="">Năm học</option>{(years.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="live-select" value={periodForm.semesterId} onChange={(e) => setPeriodForm({ ...periodForm, semesterId: e.target.value })}><option value="">Học kỳ</option>{semesterOptions.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select className="live-select" value={periodForm.gradeLevel} onChange={(e) => setPeriodForm({ ...periodForm, gradeLevel: e.target.value })}><option value="">Toàn trường</option>{gradeOptions.map((x) => <option key={x} value={x}>Khối {x}</option>)}</select>
          <input className="live-input" type="date" value={periodForm.startDate} onChange={(e) => setPeriodForm({ ...periodForm, startDate: e.target.value })} />
          <input className="live-input" type="date" value={periodForm.endDate} onChange={(e) => setPeriodForm({ ...periodForm, endDate: e.target.value })} />
          {editingPeriodId && <button className="live-btn ghost" disabled={busy} onClick={resetPeriodForm}><X size={15} /> Hủy sửa</button>}
          <button className="live-btn" disabled={busy || !periodForm.code.trim() || !periodForm.name.trim() || !periodForm.academicYearId || !periodForm.semesterId} onClick={savePeriod}>{editingPeriodId ? <Save size={16} /> : <Plus size={16} />} {editingPeriodId ? 'Lưu kỳ thi' : 'Tạo kỳ thi'}</button>
        </div>
        <Async state={periods} allowEmpty empty="Chưa có kỳ thi">{(rows) => <div className="exam-period-list">{rows.map((item) => <article key={item.period.id} className={item.period.id === periodId ? 'active' : ''}>
          <button type="button" className="exam-period-select" onClick={() => setPeriodId(item.period.id)}><div><strong>{item.period.name}</strong><span>{item.period.code} · {fmtDate(item.period.startDate)} – {fmtDate(item.period.endDate)}</span></div><StatusPill value={item.period.status} /><small>{item.scheduleCount} môn · {item.candidateCount} thí sinh · {item.period.schedulePublished ? `Đã công bố v${item.period.scheduleRevision}` : item.period.scheduleRevision ? 'Cần công bố lại' : 'Chưa công bố'}</small></button>
          <div className="exam-row-actions"><button title="Sửa kỳ thi" disabled={item.period.status === 'CONFIRMED'} onClick={() => editPeriod(item.period)}><Pencil size={15} /></button><button className="danger" title="Xóa kỳ thi" disabled={item.period.status !== 'DRAFT'} onClick={() => deletePeriod(item.period)}><Trash2 size={15} /></button></div>
        </article>)}</div>}</Async>
        {selectedPeriod && <div className="exam-action-strip"><span><Megaphone size={17} /> {selectedPeriod.schedulePublished ? <><strong>Lịch chính thức</strong> đang hiển thị cho người dùng</> : <><strong>Lịch chưa phát hành</strong> nên giáo viên, học sinh và phụ huynh chưa thấy</>}</span>
          <button className="live-btn publish" disabled={busy || selectedPeriod.schedulePublished} onClick={publishSchedule}><Megaphone size={15} /> {selectedPeriod.scheduleRevision ? 'Công bố lại lịch' : 'Công bố lịch thi'}</button>
          <button className="live-btn ghost" disabled={busy || selectedPeriod.status === 'CONFIRMED'} onClick={() => changeLock(!selectedPeriod.scoreEntryLocked)}>{selectedPeriod.scoreEntryLocked ? <Unlock size={15} /> : <Lock size={15} />}{selectedPeriod.scoreEntryLocked ? 'Mở nhập điểm' : 'Khóa nhập điểm'}</button>
          <button className="live-btn" disabled={busy || !selectedPeriod.scoreEntryLocked || selectedPeriod.status === 'CONFIRMED'} onClick={confirmPeriod}><ShieldCheck size={15} /> Xác nhận kỳ thi</button>
        </div>}
      </Section> },
      { id: 'schedule', label: 'Lịch & phòng', Icon: DoorOpen, content: <Section title="Lịch thi, phòng thi và giám thị" subtitle="Chọn rõ lớp áp dụng; hệ thống ngăn trùng giờ, phòng và giám thị" wide>
        {!periodId ? <div className="empty-state"><strong>Chọn kỳ thi để lập lịch</strong></div> : <>
          <div className={`exam-schedule-editor ${editingScheduleId ? 'editing' : ''}`}>
            <div className="exam-editor-heading"><div><strong>{editingScheduleId ? 'Chỉnh sửa ca thi' : 'Tạo ca thi mới'}</strong><span>{editingScheduleId ? 'Thay đổi được kiểm tra xung đột trước khi lưu' : 'Mỗi ca thi phải chọn ít nhất một lớp áp dụng'}</span></div>{editingScheduleId && <button className="icon-action" title="Hủy chỉnh sửa" onClick={resetScheduleForm}><X size={17} /></button>}</div>
            <div className="exam-form-grid schedule">
            <select className="live-select" value={scheduleForm.subjectId} onChange={(e) => setScheduleForm({ ...scheduleForm, subjectId: e.target.value })}><option value="">Chọn môn thi</option>{(subjects.data || []).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            <input className="live-input" type="date" value={scheduleForm.examDate} onChange={(e) => setScheduleForm({ ...scheduleForm, examDate: e.target.value })} />
            <input className="live-input" type="time" value={scheduleForm.startTime} onChange={(e) => setScheduleForm({ ...scheduleForm, startTime: e.target.value })} />
            <input className="live-input" type="number" min="15" max="480" value={scheduleForm.durationMinutes} onChange={(e) => setScheduleForm({ ...scheduleForm, durationMinutes: Number(e.target.value) })} />
            <input className="live-input" placeholder="Ghi chú" value={scheduleForm.notes} onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })} />
            <button className="live-btn" disabled={busy || !!selectedPeriod?.scoreEntryLocked || !scheduleForm.subjectId || !scheduleForm.classIds.length || !scheduleForm.examDate || !scheduleForm.startTime || scheduleForm.durationMinutes < 15 || scheduleForm.durationMinutes > 480 || !!scheduleConflicts.length} onClick={saveSchedule}>{editingScheduleId ? <Save size={15} /> : <Plus size={15} />} {editingScheduleId ? 'Lưu thay đổi' : 'Thêm lịch thi'}</button>
            </div>
            <div className="exam-class-scope"><div><strong>Lớp áp dụng</strong><button type="button" onClick={() => setScheduleForm((current) => ({ ...current, classIds: current.classIds.length === eligibleClasses.length ? [] : eligibleClasses.map((item) => item.id) }))}>{scheduleForm.classIds.length === eligibleClasses.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}</button></div><div className="exam-class-options">{eligibleClasses.map((item) => <label key={item.id} className={scheduleForm.classIds.includes(item.id) ? 'selected' : ''}><input type="checkbox" checked={scheduleForm.classIds.includes(item.id)} onChange={() => toggleScheduleClass(item.id)} /><span>{item.code}</span></label>)}</div></div>
            {!!scheduleConflicts.length && <div className="exam-conflict-alert"><CalendarClock size={18} /><div><strong>Không thể lưu vì trùng lịch</strong>{scheduleConflicts.map((item) => <span key={item.id}>{item.subjectName} · {fmtDate(item.examDate)} {item.startTime} · {(item.classIds || []).filter((id) => scheduleForm.classIds.includes(id)).map((id) => classById.get(id)?.code).filter(Boolean).join(', ')}</span>)}</div></div>}
          </div>
          <div className="exam-split"><div><div className="exam-list-heading"><h3>Danh sách ca thi</h3>{!!conflictingScheduleIds.size && <span>{conflictingScheduleIds.size} ca cần xử lý</span>}</div><Async state={schedules} allowEmpty empty="Chưa có lịch thi">{(rows) => <div className="exam-schedule-list">{rows.map((item) => <article key={item.id} className={`${item.id === scheduleId ? 'active' : ''} ${conflictingScheduleIds.has(item.id) ? 'conflict' : ''}`}><button type="button" className="exam-schedule-select" onClick={() => setScheduleId(item.id)}><CalendarClock size={18} /><span><strong>{item.subjectName}</strong><small>{fmtDate(item.examDate)} · {item.startTime} · {item.durationMinutes} phút</small><em>{(item.classIds || []).map((id) => classById.get(id)?.code).filter(Boolean).join(' · ') || 'Chưa chọn lớp'}</em></span></button><div className="exam-row-actions"><button title="Sửa ca thi" onClick={() => editSchedule(item)}><Pencil size={15} /></button><button className="danger" title="Xóa ca thi" onClick={() => deleteSchedule(item)}><Trash2 size={15} /></button></div>{conflictingScheduleIds.has(item.id) && <small className="exam-conflict-tag">Trùng giờ của lớp</small>}</article>)}</div>}</Async></div>
            <div><h3>Phòng và giám thị {selectedSchedule && `· ${selectedSchedule.subjectName}`}</h3>{scheduleId ? <>
              <div className="exam-form-grid room"><select className="live-select" value={roomForm.roomCode} onChange={(e) => setRoomForm({ ...roomForm, roomCode: e.target.value })}><option value="">Phòng</option>{(schoolRooms.data || []).map((x) => <option key={x.id} value={x.code}>{x.code}</option>)}</select>
                <input className="live-input" type="number" min="1" value={roomForm.capacity} onChange={(e) => setRoomForm({ ...roomForm, capacity: Number(e.target.value) })} />
                <select className="live-select" value={roomForm.proctorOneId} onChange={(e) => setRoomForm({ ...roomForm, proctorOneId: e.target.value })}><option value="">Giám thị 1</option>{(teachers.data || []).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select>
                <select className="live-select" value={roomForm.proctorTwoId} onChange={(e) => setRoomForm({ ...roomForm, proctorTwoId: e.target.value })}><option value="">Giám thị 2</option>{(teachers.data || []).map((x) => <option key={x.id} value={x.id}>{x.fullName}</option>)}</select>
                <button className="live-btn" disabled={busy || !!selectedPeriod?.scoreEntryLocked} onClick={saveRoom}>{editingRoomId ? <Save size={15} /> : <Plus size={15} />} {editingRoomId ? 'Lưu phòng' : 'Phân phòng'}</button>{editingRoomId && <button className="live-btn ghost" onClick={() => { setEditingRoomId(''); setRoomForm({ roomCode: '', capacity: 30, proctorOneId: '', proctorTwoId: '' }); }}><X size={15} /> Hủy</button>}</div>
              <Async state={rooms} allowEmpty empty="Chưa phân phòng">{(rows) => <div className="exam-room-grid">{rows.map((room) => <article key={room.id} className={room.id === allocationRoomId ? 'active' : ''} onClick={() => setAllocationRoomId(room.id)}><DoorOpen size={20} /><div><strong>{room.roomCode}</strong><span>{room.capacity} chỗ</span><small>{room.proctorOneName || 'Chưa có GT1'} · {room.proctorTwoName || 'Chưa có GT2'}</small></div><div className="exam-row-actions"><button title="Sửa phòng" onClick={(event) => { event.stopPropagation(); editRoom(room); }}><Pencil size={14} /></button><button className="danger" title="Xóa phòng" onClick={(event) => { event.stopPropagation(); deleteRoom(room); }}><Trash2 size={14} /></button></div></article>)}</div>}</Async>
              <div className="exam-allocation"><select className="live-select" value={allocationClassId} onChange={(e) => setAllocationClassId(e.target.value)}><option value="">Chọn lớp cần xếp phòng</option>{eligibleClasses.filter((item) => (selectedSchedule?.classIds || []).includes(item.id)).map((x) => <option key={x.id} value={x.id}>{x.code}</option>)}</select><button className="live-btn" disabled={busy || !allocationRoomId || !allocationClassId} onClick={allocate}><UsersRound size={15} /> Cấp SBD & xếp chỗ</button></div>
            </> : <div className="empty-state"><strong>Chọn ca thi để phân phòng</strong></div>}</div></div>
        </>}
      </Section> },
      { id: 'categories', label: 'Cấu hình đầu điểm', Icon: BookOpenCheck, content: <AdminExamCategoriesLive /> },
    ]} />
  </div>;
}

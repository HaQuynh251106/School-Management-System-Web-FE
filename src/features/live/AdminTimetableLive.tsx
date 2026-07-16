import { useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, CalendarDays, CalendarOff, CheckCircle2,
  Clock3, Pencil, Plus, Trash2, UserRoundCheck, UsersRound,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, Room, SchoolClass, Semester, TeacherWorkload, TeachingAssignment, TimetableSlot, Subject,
} from '../../api/types';
import { FunctionTabs, Section } from '../../components/ui';
import { Async, DAY_LABEL, DAYS, fmtDate, useToast } from './common';
import { Field, Modal } from './Modal';

const PERIODS = [1, 2, 3, 4, 5, 6];
const PERIOD_TIME: Record<number, [string, string]> = {
  1: ['07:00', '07:45'], 2: ['07:50', '08:35'], 3: ['08:45', '09:30'],
  4: ['09:35', '10:20'], 5: ['10:25', '11:10'], 6: ['13:30', '14:15'],
};

const assignmentQuery = (classId: string, semesterId: string, day?: string, period?: number) => {
  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);
  if (semesterId) params.set('semesterId', semesterId);
  if (day && period) {
    params.set('dayOfWeek', day);
    params.set('periodNo', String(period));
  }
  return `/teaching-assignments?${params.toString()}`;
};

const workloadQuery = (semesterId: string) => {
  const params = new URLSearchParams();
  if (semesterId) params.set('semesterId', semesterId);
  return `/teaching-assignments/workloads?${params.toString()}`;
};

function matchesSpecialty(teacher: ApiUser, subject?: Subject) {
  if (!subject || !teacher.mainSubject) return false;
  const specialty = teacher.mainSubject.trim().toLocaleLowerCase('vi');
  const subjectId = subject.id.toLocaleLowerCase('vi');
  const subjectName = subject.name.trim().toLocaleLowerCase('vi');
  return specialty === subjectId || specialty === subjectName
    || (specialty.length >= 3 && subjectName.includes(specialty))
    || (subjectName.length >= 3 && specialty.includes(subjectName));
}

type AssignmentForm = {
  classId: string;
  semesterId: string;
  subjectId: string;
  teacherId: string;
  weeklyPeriods: number;
};

const emptyAssignment: AssignmentForm = {
  classId: '', semesterId: '', subjectId: '', teacherId: '', weeklyPeriods: 2,
};

function TeachingAssignmentManager() {
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const semesters = useApi<Semester[]>('/semesters');
  const toast = useToast();
  const [classFilter, setClassFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('');
  const assignments = useApi<TeachingAssignment[]>(assignmentQuery(classFilter, semesterFilter));
  const workloads = useApi<TeacherWorkload[]>(workloadQuery(semesterFilter));
  const [editing, setEditing] = useState<TeachingAssignment | null>(null);
  const [form, setForm] = useState<AssignmentForm>(emptyAssignment);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSubject = subjects.data?.find((subject) => subject.id === form.subjectId);
  const selectableTeachers = [...(teachers.data ?? [])]
    .filter((teacher) => teacher.status === 'ACTIVE')
    .sort((left, right) => {
      const specialtyOrder = Number(matchesSpecialty(right, selectedSubject))
        - Number(matchesSpecialty(left, selectedSubject));
      return specialtyOrder || left.fullName.localeCompare(right.fullName, 'vi');
    });
  const selectedTeacherWorkload = workloads.data?.find((item) => item.teacherId === form.teacherId);
  const totalPlanned = (assignments.data ?? []).reduce((sum, item) => sum + item.weeklyPeriods, 0);
  const totalScheduled = (assignments.data ?? []).reduce((sum, item) => sum + item.scheduledPeriods, 0);
  const completed = (assignments.data ?? []).filter((item) => item.fullyScheduled).length;
  const assignedTeachers = (workloads.data ?? []).filter((item) => item.classCount > 0).length;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyAssignment, classId: classFilter, semesterId: semesterFilter });
    setError(null);
    setShow(true);
  };

  const openEdit = (item: TeachingAssignment) => {
    setEditing(item);
    setForm({
      classId: item.classId,
      semesterId: item.semesterId,
      subjectId: item.subjectId,
      teacherId: item.teacherId,
      weeklyPeriods: item.weeklyPeriods,
    });
    setError(null);
    setShow(true);
  };

  const openCreateForTeacher = (teacherId: string) => {
    setEditing(null);
    setForm({ ...emptyAssignment, classId: classFilter, semesterId: semesterFilter, teacherId });
    setError(null);
    setShow(true);
  };

  const save = async () => {
    if (!form.classId || !form.semesterId || !form.subjectId || !form.teacherId) {
      setError('Vui lòng chọn đầy đủ lớp, học kỳ, môn học và giáo viên.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) await api.put(`/teaching-assignments/${editing.id}`, form);
      else await api.post('/teaching-assignments', form);
      toast.show('ok', editing ? 'Đã cập nhật phân công giảng dạy' : 'Đã phân công giáo viên bộ môn');
      setShow(false);
      assignments.reload();
      workloads.reload();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu phân công.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (item: TeachingAssignment) => {
    if (!confirm(`Xóa phân công ${item.subjectName} của lớp ${item.classCode}?`)) return;
    try {
      await api.del(`/teaching-assignments/${item.id}`);
      toast.show('ok', 'Đã xóa phân công');
      assignments.reload();
      workloads.reload();
    } catch (caught: unknown) {
      toast.show('err', caught instanceof Error ? caught.message : 'Không thể xóa phân công.');
    }
  };

  return (
    <Section
      title="Phân công giáo viên bộ môn"
      subtitle="Mỗi môn của một lớp được giao cho một giáo viên theo từng học kỳ"
      action={<button className="live-btn" onClick={openCreate}><Plus size={16} /> Thêm phân công</button>}
      wide
    >
      {toast.node}
      <div className="assignment-summary-grid">
        <article><BookOpenCheck size={19} /><div><small>Tổng phân công</small><strong>{assignments.data?.length ?? 0}</strong></div></article>
        <article><Clock3 size={19} /><div><small>Tiến độ xếp lịch</small><strong>{totalScheduled}/{totalPlanned} tiết</strong></div></article>
        <article><CheckCircle2 size={19} /><div><small>Đã xếp đủ</small><strong>{completed} môn</strong></div></article>
        <article><UsersRound size={19} /><div><small>Giáo viên đã phân công</small><strong>{assignedTeachers}/{workloads.data?.length ?? 0}</strong></div></article>
      </div>
      <div className="live-toolbar assignment-filter-bar">
        <select className="live-select grow" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
          <option value="">Tất cả lớp</option>
          {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
        </select>
        <select className="live-select grow" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
          <option value="">Tất cả học kỳ</option>
          {(semesters.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select>
      </div>
      <div className="teacher-workload-panel">
        <div className="teacher-workload-head">
          <div><strong>Giáo viên và lớp đang phụ trách</strong><small>Theo dõi môn, lớp và số tiết của từng giáo viên trong học kỳ đã chọn.</small></div>
        </div>
        <Async state={workloads} empty="Chưa có hồ sơ giáo viên để phân công.">
          {(items) => (
            <div className="live-table-wrap">
              <table className="live-table teacher-workload-table">
                <thead><tr><th>Giáo viên bộ môn</th><th>Chuyên môn hồ sơ</th><th>Lớp đang dạy</th><th>Môn phụ trách</th><th>Tiết/tuần</th><th /></tr></thead>
                <tbody>{items.map((item) => (
                  <tr key={item.teacherId}>
                    <td><div className="assignment-teacher-cell"><span>{item.teacherName.slice(0, 1)}</span><div><strong>{item.teacherName}</strong><small>{item.teacherCode || 'Chưa có mã giáo viên'}</small></div></div></td>
                    <td><span className="teacher-specialty-pill">{item.mainSubject || 'Chưa cập nhật'}</span></td>
                    <td>{item.classCodes.length > 0 ? <div className="teacher-class-chips">{item.classCodes.map((code) => <span key={code}>{code}</span>)}</div> : <span className="assignment-unassigned">Chưa phụ trách lớp</span>}</td>
                    <td>{item.subjectNames.length > 0 ? item.subjectNames.join(', ') : '—'}</td>
                    <td><strong>{item.scheduledPeriods}/{item.weeklyPeriods}</strong></td>
                    <td><button className="live-btn compact" onClick={() => openCreateForTeacher(item.teacherId)}><Plus size={14} /> Phân công lớp</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Async>
      </div>
      <Async state={assignments} empty="Chưa có phân công giáo viên bộ môn phù hợp với bộ lọc.">
        {(items) => (
          <div className="live-table-wrap assignment-table-wrap">
            <table className="live-table assignment-table">
              <thead><tr><th>Lớp</th><th>Môn học</th><th>Giáo viên phụ trách</th><th>Học kỳ</th><th>Tiến độ TKB</th><th>Trạng thái</th><th /></tr></thead>
              <tbody>{items.map((item) => {
                const semester = semesters.data?.find((entry) => entry.id === item.semesterId);
                const percent = Math.min(100, Math.round(item.scheduledPeriods * 100 / Math.max(1, item.weeklyPeriods)));
                return (
                  <tr key={item.id}>
                    <td><strong className="assignment-class-code">{item.classCode}</strong></td>
                    <td><strong>{item.subjectName}</strong></td>
                    <td><div className="assignment-teacher-cell"><span>{item.teacherName.slice(0, 1)}</span><div><strong>{item.teacherName}</strong><small>{item.teacherClassCount} lớp · {item.teacherScheduledPeriods}/{item.teacherWeeklyPeriods} tiết/tuần</small></div></div></td>
                    <td>{semester?.name ?? item.semesterId}</td>
                    <td><div className="assignment-progress"><div><span style={{ width: `${percent}%` }} /></div><small>{item.scheduledPeriods}/{item.weeklyPeriods} tiết/tuần</small></div></td>
                    <td><span className={`assignment-status ${item.fullyScheduled ? 'complete' : 'pending'}`}>{item.fullyScheduled ? 'Đủ tiết lớp này' : `Còn ${item.remainingPeriods} tiết`}</span></td>
                    <td><div className="assignment-actions"><button title="Sửa phân công" onClick={() => openEdit(item)}><Pencil size={15} /></button><button className="danger" title="Xóa phân công" onClick={() => remove(item)}><Trash2 size={15} /></button></div></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </Async>

      {show && (
        <Modal
          title={editing ? 'Cập nhật phân công' : 'Phân công giáo viên bộ môn'}
          onClose={() => setShow(false)}
          footer={<><button className="live-btn ghost" onClick={() => setShow(false)}>Hủy</button><button className="live-btn" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : 'Lưu phân công'}</button></>}
        >
          {error && <div className="conflict-box"><AlertTriangle size={17} /><span>{error}</span></div>}
          <div className="modal-grid2">
            <Field label="Lớp học">
              <select value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
                <option value="">— Chọn lớp —</option>
                {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
              </select>
            </Field>
            <Field label="Học kỳ">
              <select value={form.semesterId} onChange={(event) => setForm((current) => ({ ...current, semesterId: event.target.value }))}>
                <option value="">— Chọn học kỳ —</option>
                {(semesters.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Môn học">
            <select value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}>
              <option value="">— Chọn môn học —</option>
              {(subjects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Giáo viên bộ môn">
            <select value={form.teacherId} onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}>
              <option value="">— Chọn giáo viên —</option>
              {selectableTeachers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.mainSubject || 'Chưa cập nhật chuyên môn'}{matchesSpecialty(item, selectedSubject) ? ' · Phù hợp chuyên môn' : ''}</option>)}
            </select>
            <small className="field-help">Giáo viên phù hợp chuyên môn được ưu tiên đầu danh sách; phân công này quyết định môn và lớp giáo viên thực tế phụ trách.</small>
            {selectedTeacherWorkload && <div className="selected-teacher-workload"><strong>{selectedTeacherWorkload.classCount} lớp đang phụ trách</strong><span>{selectedTeacherWorkload.classCodes.join(', ') || 'Chưa có lớp'} · {selectedTeacherWorkload.scheduledPeriods}/{selectedTeacherWorkload.weeklyPeriods} tiết/tuần</span></div>}
          </Field>
          <Field label="Số tiết mỗi tuần">
            <input type="number" min={1} max={20} value={form.weeklyPeriods} onChange={(event) => setForm((current) => ({ ...current, weeklyPeriods: Number(event.target.value) }))} />
            <small className="field-help">Thời khóa biểu sẽ không cho xếp vượt quá số tiết đã giao.</small>
          </Field>
        </Modal>
      )}
    </Section>
  );
}

function TimetableEditor() {
  const classes = useApi<SchoolClass[]>('/classes');
  const rooms = useApi<Room[]>('/rooms');
  const semesters = useApi<Semester[]>('/semesters');
  const toast = useToast();
  const [classId, setClassId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const slots = useApi<TimetableSlot[]>(classId && semesterId ? `/timetableSlots?classId=${classId}&semesterId=${semesterId}` : null);
  const assignmentSummary = useApi<TeachingAssignment[]>(classId && semesterId ? assignmentQuery(classId, semesterId) : null);
  const [show, setShow] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blank = { assignmentId: '', dayOfWeek: 'MON', periodNo: 1, subjectId: '', teacherId: '', roomCode: '', startTime: '07:00', endTime: '07:45' };
  const [form, setForm] = useState({ ...blank });
  const availability = useApi<TeachingAssignment[]>(show && classId && semesterId
    ? assignmentQuery(classId, semesterId, form.dayOfWeek, form.periodNo) : null);
  const selectedAssignment = availability.data?.find((item) => item.id === form.assignmentId);

  const cellOf = (day: string, period: number) => (slots.data ?? []).find((slot) => slot.dayOfWeek === day && slot.periodNo === period);
  const progress = useMemo(() => {
    const items = assignmentSummary.data ?? [];
    return {
      total: items.reduce((sum, item) => sum + item.weeklyPeriods, 0),
      scheduled: items.reduce((sum, item) => sum + item.scheduledPeriods, 0),
      completed: items.filter((item) => item.fullyScheduled).length,
      count: items.length,
    };
  }, [assignmentSummary.data]);

  const openAdd = (day: string, period: number) => {
    const [startTime, endTime] = PERIOD_TIME[period] ?? ['', ''];
    setForm({ ...blank, dayOfWeek: day, periodNo: period, startTime, endTime });
    setConflict(null);
    setShow(true);
  };

  const selectAssignment = (id: string) => {
    const selected = availability.data?.find((item) => item.id === id);
    setForm((current) => ({
      ...current,
      assignmentId: id,
      subjectId: selected?.subjectId ?? '',
      teacherId: selected?.teacherId ?? '',
    }));
    setConflict(selected?.availabilityMessage ?? null);
  };

  const changePeriod = (period: number) => {
    const [startTime, endTime] = PERIOD_TIME[period] ?? ['', ''];
    setForm((current) => ({ ...current, assignmentId: '', subjectId: '', teacherId: '', periodNo: period, startTime, endTime }));
    setConflict(null);
  };

  const changeDay = (dayOfWeek: string) => {
    setForm((current) => ({ ...current, assignmentId: '', subjectId: '', teacherId: '', dayOfWeek }));
    setConflict(null);
  };

  const submit = async () => {
    if (!selectedAssignment) {
      setConflict('Vui lòng chọn một phân công giảng dạy còn lịch trống.');
      return;
    }
    if (!selectedAssignment.canSchedule) {
      setConflict(selectedAssignment.availabilityMessage || 'Giáo viên không còn lịch trống ở tiết đã chọn.');
      return;
    }
    setBusy(true);
    setConflict(null);
    try {
      await api.post('/timetableSlots', {
        classId,
        semesterId,
        subjectId: form.subjectId,
        teacherId: form.teacherId,
        roomCode: form.roomCode,
        dayOfWeek: form.dayOfWeek,
        periodNo: form.periodNo,
        startTime: form.startTime,
        endTime: form.endTime,
      });
      toast.show('ok', 'Đã thêm tiết vào thời khóa biểu');
      setShow(false);
      slots.reload();
      assignmentSummary.reload();
    } catch (caught: unknown) {
      setConflict(caught instanceof Error ? caught.message : 'Không thể xếp tiết học.');
    } finally {
      setBusy(false);
    }
  };

  const removeSlot = async (slot: TimetableSlot) => {
    if (!confirm(`Xóa tiết ${slot.subjectName} (${DAY_LABEL[slot.dayOfWeek]} tiết ${slot.periodNo})?`)) return;
    try {
      await api.del(`/timetableSlots/${slot.id}`);
      toast.show('ok', 'Đã xóa tiết');
      slots.reload();
      assignmentSummary.reload();
    } catch (caught: unknown) {
      toast.show('err', caught instanceof Error ? caught.message : 'Không thể xóa tiết.');
    }
  };

  return (
    <Section title="Xếp thời khóa biểu" subtitle="Chỉ xếp lịch từ các phân công giáo viên bộ môn đã được duyệt" wide>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select grow" value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">— Chọn lớp để xếp thời khóa biểu —</option>
          {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
        </select>
        <select className="live-select grow" value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>
          <option value="">— Chọn học kỳ —</option>
          {(semesters.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
        </select>
      </div>

      {classId && semesterId && (
        <div className="schedule-assignment-strip">
          <div><small>Phân công</small><strong>{progress.count} môn</strong></div>
          <div><small>Tiến độ</small><strong>{progress.scheduled}/{progress.total} tiết</strong></div>
          <div><small>Đã xếp đủ</small><strong>{progress.completed}/{progress.count} môn</strong></div>
          {progress.count === 0 && <p><AlertTriangle size={16} /> Lớp chưa có phân công bộ môn trong học kỳ này. Hãy tạo phân công trước khi xếp lịch.</p>}
        </div>
      )}

      {!classId || !semesterId ? (
        <div className="live-loading">Chọn lớp và học kỳ để bắt đầu xếp thời khóa biểu.</div>
      ) : (
        <Async state={slots} allowEmpty>
          {() => (
            <div className="timetable admin-timetable-grid" role="table">
              <div className="time-head" />
              {DAYS.map((day) => <div key={day} className="time-head">{DAY_LABEL[day]}</div>)}
              {PERIODS.map((period) => [
                <div key={`p${period}`} className="time-period">Tiết {period}</div>,
                ...DAYS.map((day) => {
                  const slot = cellOf(day, period);
                  return (
                    <div key={`${day}${period}`} className={`time-cell ${slot ? 'has-slot' : 'is-open'}`}
                      onClick={() => { if (!slot) openAdd(day, period); }}>
                      {slot ? <>
                        <strong>{slot.subjectName}</strong>
                        <small>{slot.roomCode || 'Chưa có phòng'} · {slot.teacherName}</small>
                        <button title="Xóa tiết" onClick={(event) => { event.stopPropagation(); removeSlot(slot); }}><Trash2 size={13} /></button>
                      </> : <span className="add-slot-mark"><Plus size={16} /></span>}
                    </div>
                  );
                }),
              ])}
            </div>
          )}
        </Async>
      )}

      {show && (
        <Modal
          title={`Xếp tiết — ${DAY_LABEL[form.dayOfWeek]} · tiết ${form.periodNo}`}
          onClose={() => setShow(false)}
          footer={<><button className="live-btn ghost" onClick={() => setShow(false)}>Hủy</button><button className="live-btn" disabled={busy || !selectedAssignment?.canSchedule} onClick={submit}><Plus size={15} /> {busy ? 'Đang lưu…' : 'Thêm tiết'}</button></>}
        >
          {conflict && <div className="conflict-box"><AlertTriangle size={17} /><span>{conflict}</span></div>}
          <div className="modal-grid2">
            <Field label="Thứ">
              <select value={form.dayOfWeek} onChange={(event) => changeDay(event.target.value)}>{DAYS.map((day) => <option key={day} value={day}>{DAY_LABEL[day]}</option>)}</select>
            </Field>
            <Field label="Tiết">
              <select value={form.periodNo} onChange={(event) => changePeriod(Number(event.target.value))}>{PERIODS.map((period) => <option key={period} value={period}>Tiết {period}</option>)}</select>
            </Field>
          </div>
          <Field label="Phân công giảng dạy">
            <select value={form.assignmentId} onChange={(event) => selectAssignment(event.target.value)}>
              <option value="">— Chọn môn và giáo viên đã phân công —</option>
              {(availability.data ?? []).map((item) => (
                <option key={item.id} value={item.id} disabled={!item.canSchedule}>
                  {item.subjectName} · {item.teacherName} · lớp này {item.scheduledPeriods}/{item.weeklyPeriods} tiết · tổng {item.teacherClassCount} lớp{item.availabilityMessage ? ` — ${item.availabilityMessage}` : ''}
                </option>
              ))}
            </select>
            {availability.loading && <small className="field-help">Đang kiểm tra lịch giáo viên…</small>}
            {!availability.loading && availability.data?.length === 0 && <small className="field-help error">Chưa có phân công nào. Admin cần phân công giáo viên bộ môn trước.</small>}
          </Field>
          <div className="assignment-availability-list">
            {(availability.data ?? []).map((item) => (
              <article key={item.id} className={item.canSchedule ? 'available' : 'unavailable'}>
                <span>{item.canSchedule ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span>
                <div><strong>{item.subjectName} · {item.teacherName}</strong><small>{item.availabilityMessage || `Còn ${item.remainingPeriods} tiết cho lớp này · đang phụ trách ${item.teacherClassCount} lớp`}</small></div>
              </article>
            ))}
          </div>
          <div className="modal-grid2">
            <Field label="Phòng học">
              <select value={form.roomCode} onChange={(event) => setForm((current) => ({ ...current, roomCode: event.target.value }))}>
                <option value="">— Chọn phòng —</option>
                {(rooms.data ?? []).map((item) => <option key={item.id} value={item.code}>{item.code}{item.name ? ` — ${item.name}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Khung giờ">
              <div className="slot-time-pair"><input value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, startTime: event.target.value }))} /><span>—</span><input value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, endTime: event.target.value }))} /></div>
            </Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

interface Holiday { id: string; date: string; name: string; description?: string; }

function HolidayManager() {
  const holidays = useApi<Holiday[]>('/school-holidays');
  const toast = useToast();
  const [form, setForm] = useState({ date: '', name: '' });

  const add = async () => {
    if (!form.date || !form.name) return toast.show('err', 'Vui lòng nhập ngày và lý do nghỉ.');
    try {
      await api.post('/school-holidays', form);
      toast.show('ok', 'Đã thêm ngày nghỉ');
      setForm({ date: '', name: '' });
      holidays.reload();
    } catch (caught: unknown) {
      toast.show('err', caught instanceof Error ? caught.message : 'Không thể thêm ngày nghỉ.');
    }
  };

  const remove = async (holiday: Holiday) => {
    if (!confirm(`Xóa ngày nghỉ “${holiday.name}” (${fmtDate(holiday.date)})?`)) return;
    try {
      await api.del(`/school-holidays/${holiday.id}`);
      toast.show('ok', 'Đã xóa ngày nghỉ');
      holidays.reload();
    } catch (caught: unknown) {
      toast.show('err', caught instanceof Error ? caught.message : 'Không thể xóa ngày nghỉ.');
    }
  };

  return (
    <Section title="Ngày nghỉ và sự kiện" subtitle="Quản lý các ngày không tổ chức học" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} />
        <input className="live-input grow" placeholder="Lý do nghỉ" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <button className="live-btn" onClick={add}><Plus size={15} /> Thêm ngày nghỉ</button>
      </div>
      <Async state={holidays} empty="Chưa có ngày nghỉ">
        {(items) => <table className="live-table"><thead><tr><th>Ngày</th><th>Lý do</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{fmtDate(item.date)}</strong></td><td>{item.name}</td><td><button className="live-btn danger" onClick={() => remove(item)}><Trash2 size={14} /> Xóa</button></td></tr>)}</tbody></table>}
      </Async>
    </Section>
  );
}

export function AdminTimetableLive() {
  return <FunctionTabs tabs={[
    { id: 'assignments', label: 'Phân công bộ môn', Icon: UserRoundCheck, content: <TeachingAssignmentManager /> },
    { id: 'timetable', label: 'Xếp thời khóa biểu', Icon: CalendarDays, content: <TimetableEditor /> },
    { id: 'holiday', label: 'Ngày nghỉ', Icon: CalendarOff, content: <HolidayManager /> },
  ]} />;
}

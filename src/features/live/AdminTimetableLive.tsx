import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpenCheck, CalendarDays, CalendarOff, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Pencil, Plus, RotateCcw, Search,
  Trash2, UserRoundCheck, UsersRound, X,
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

const teacherAssignmentQuery = (teacherId: string, semesterId: string) => {
  const params = new URLSearchParams({ teacherId });
  if (semesterId) params.set('semesterId', semesterId);
  return `/teaching-assignments?${params.toString()}`;
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

function normalizeSearch(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/Đ/g, 'D').toLocaleLowerCase('vi');
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
  const [teacherSearch, setTeacherSearch] = useState('');
  const assignments = useApi<TeachingAssignment[]>(assignmentQuery(classFilter, semesterFilter));
  const workloads = useApi<TeacherWorkload[]>(workloadQuery(semesterFilter));
  const [editing, setEditing] = useState<TeachingAssignment | null>(null);
  const [managedTeacher, setManagedTeacher] = useState<TeacherWorkload | null>(null);
  const managedAssignments = useApi<TeachingAssignment[]>(managedTeacher
    ? teacherAssignmentQuery(managedTeacher.teacherId, semesterFilter) : null);
  const [form, setForm] = useState<AssignmentForm>(emptyAssignment);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeachingAssignment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workloadPage, setWorkloadPage] = useState(1);
  const [workloadPageSize, setWorkloadPageSize] = useState(5);

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
  const assignedTeachers = new Set((assignments.data ?? []).map((item) => item.teacherId)).size;
  const visibleWorkloads = useMemo(() => {
    const query = normalizeSearch(teacherSearch.trim());
    return (workloads.data ?? []).map((item) => {
      const details = (item.assignments ?? []).filter((assignment) => !classFilter || assignment.classId === classFilter);
      const searchable = [
        item.teacherName, item.teacherCode, item.mainSubject,
        ...details.flatMap((assignment) => [assignment.classCode, assignment.subjectName]),
      ].filter(Boolean).join(' ');
      const normalizedSearchable = normalizeSearch(searchable);
      if ((classFilter && details.length === 0) || (query && !normalizedSearchable.includes(query))) return null;
      const classCodes = [...new Set(details.map((assignment) => assignment.classCode))];
      const subjectNames = [...new Set(details.map((assignment) => assignment.subjectName))];
      return {
        ...item,
        assignments: details,
        classCodes,
        subjectNames,
        classCount: classCodes.length,
        subjectCount: subjectNames.length,
        weeklyPeriods: details.reduce((sum, assignment) => sum + assignment.weeklyPeriods, 0),
        scheduledPeriods: details.reduce((sum, assignment) => sum + assignment.scheduledPeriods, 0),
      };
    }).filter((item): item is TeacherWorkload => item !== null);
  }, [workloads.data, classFilter, teacherSearch]);
  const workloadPageCount = Math.max(1, Math.ceil(visibleWorkloads.length / workloadPageSize));
  const pagedWorkloads = useMemo(() => {
    const start = (workloadPage - 1) * workloadPageSize;
    return visibleWorkloads.slice(start, start + workloadPageSize);
  }, [visibleWorkloads, workloadPage, workloadPageSize]);
  const workloadPageNumbers = useMemo(() => {
    const visiblePageCount = 5;
    const start = Math.max(1, Math.min(workloadPage - 2, workloadPageCount - visiblePageCount + 1));
    const end = Math.min(workloadPageCount, start + visiblePageCount - 1);
    return Array.from({ length: end - start + 1 }, (_, index) => start + index);
  }, [workloadPage, workloadPageCount]);
  const workloadRangeStart = visibleWorkloads.length === 0 ? 0 : (workloadPage - 1) * workloadPageSize + 1;
  const workloadRangeEnd = Math.min(workloadPage * workloadPageSize, visibleWorkloads.length);
  const hasAssignmentFilters = Boolean(teacherSearch || classFilter || semesterFilter);
  const editingHasSchedule = Boolean(editing && editing.scheduledPeriods > 0);

  useEffect(() => {
    setWorkloadPage(1);
  }, [teacherSearch, classFilter, semesterFilter, workloadPageSize]);

  useEffect(() => {
    setWorkloadPage((current) => Math.min(current, workloadPageCount));
  }, [workloadPageCount]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyAssignment, classId: classFilter, semesterId: semesterFilter });
    setError(null);
    setShow(true);
  };

  const openCreateForTeacher = (teacherId: string) => {
    setEditing(null);
    setManagedTeacher(null);
    setForm({ ...emptyAssignment, classId: classFilter, semesterId: semesterFilter, teacherId });
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
    setManagedTeacher(null);
    setError(null);
    setShow(true);
  };

  const requestDelete = (item: TeachingAssignment) => {
    setDeleteError(null);
    setPendingDelete(item);
  };

  const removeAssignment = async () => {
    if (!pendingDelete) return;
    const item = pendingDelete;
    setDeletingId(item.id);
    setDeleteError(null);
    try {
      await api.del(`/teaching-assignments/${item.id}`);
      toast.show('ok', 'Đã xóa phân công giảng dạy');
      setPendingDelete(null);
      assignments.reload();
      managedAssignments.reload();
      workloads.reload();
    } catch (caught: unknown) {
      setDeleteError(caught instanceof Error ? caught.message : 'Không thể xóa phân công.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetAssignmentFilters = () => {
    setTeacherSearch('');
    setClassFilter('');
    setSemesterFilter('');
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
      setEditing(null);
      assignments.reload();
      managedAssignments.reload();
      workloads.reload();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'Không thể lưu phân công.');
    } finally {
      setBusy(false);
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
      <div className="assignment-control-panel">
        <div className="assignment-search-field">
          <Search size={18} />
          <input value={teacherSearch} onChange={(event) => setTeacherSearch(event.target.value)} aria-label="Tìm kiếm phân công" placeholder="Tìm theo tên, mã giáo viên, lớp hoặc môn…" />
          {teacherSearch && <button type="button" onClick={() => setTeacherSearch('')} aria-label="Xóa nội dung tìm kiếm"><X size={16} /></button>}
        </div>
        <div className="assignment-filter-fields">
          <label><span>Lớp học</span><select className="live-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="">Tất cả lớp</option>
            {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </select></label>
          <label><span>Học kỳ</span><select className="live-select" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
            <option value="">Tất cả học kỳ</option>
            {(semesters.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
          </select></label>
          <button type="button" className="assignment-reset-button" disabled={!hasAssignmentFilters} onClick={resetAssignmentFilters}><RotateCcw size={15} /> Đặt lại</button>
        </div>
      </div>
      <div className="teacher-workload-panel">
        <div className="teacher-workload-head">
          <div><strong>Giáo viên và lớp đang phụ trách</strong><small>Mỗi dòng chi tiết thể hiện đúng lớp, môn học và số tiết dạy trong một tuần.</small></div>
          <span className="teacher-workload-count">{visibleWorkloads.length} giáo viên</span>
        </div>
        <Async state={{ data: pagedWorkloads, loading: workloads.loading, error: workloads.error }} empty="Không có giáo viên hoặc phân công phù hợp với bộ lọc.">
          {(items) => (
            <div className="live-table-wrap">
              <table className="live-table teacher-workload-table">
                <thead><tr><th>Giáo viên bộ môn</th><th>Chuyên môn hồ sơ</th><th>Lớp đang dạy</th><th>Môn học phụ trách</th><th>Số tiết/tuần</th><th>Thao tác</th></tr></thead>
                <tbody>{items.map((item) => (
                  <tr key={item.teacherId}>
                    <td><div className="assignment-teacher-cell"><span>{item.teacherName.slice(0, 1)}</span><div><strong>{item.teacherName}</strong><small>{item.teacherCode || 'Chưa có mã giáo viên'}</small></div></div></td>
                    <td><span className="teacher-specialty-pill">{item.mainSubject || 'Chưa cập nhật'}</span></td>
                    <td>{item.assignments.length > 0 ? <div className="teacher-assignment-stack">{item.assignments.map((assignment) => <div className="teacher-assignment-row" key={assignment.id}><span className="teacher-class-code">{assignment.classCode}</span></div>)}</div> : <span className="assignment-unassigned">Chưa phụ trách lớp</span>}</td>
                    <td>{item.assignments.length > 0 ? <div className="teacher-assignment-stack">{item.assignments.map((assignment) => <div className="teacher-assignment-row" key={assignment.id}><strong>{assignment.subjectName}</strong></div>)}</div> : '—'}</td>
                    <td>{item.assignments.length > 0 ? <div className="teacher-assignment-stack teacher-period-stack">{item.assignments.map((assignment) => <div className="teacher-assignment-row" key={assignment.id}><strong>{assignment.weeklyPeriods} tiết</strong><small>Đã xếp {assignment.scheduledPeriods}/{assignment.weeklyPeriods}</small></div>)}<div className="teacher-period-total"><span>Tổng tải tuần</span><strong>{item.weeklyPeriods} tiết</strong></div></div> : <strong>0 tiết</strong>}</td>
                    <td><div className="teacher-workload-actions"><button className="live-btn compact" onClick={() => openCreateForTeacher(item.teacherId)}><Plus size={14} /> Thêm lớp dạy</button><button className="live-btn compact ghost" disabled={item.classCount === 0} onClick={() => setManagedTeacher(item)}><Pencil size={14} /> Quản lý phân công</button></div></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Async>
        {visibleWorkloads.length > 0 && <div className="assignment-pagination">
          <div className="assignment-pagination-summary">Hiển thị <strong>{workloadRangeStart}–{workloadRangeEnd}</strong> trong <strong>{visibleWorkloads.length}</strong> giáo viên</div>
          <label className="assignment-page-size"><span>Số dòng</span><select value={workloadPageSize} onChange={(event) => setWorkloadPageSize(Number(event.target.value))}><option value={2}>2</option><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
          <nav className="assignment-page-nav" aria-label="Phân trang danh sách giáo viên">
            <button type="button" aria-label="Trang trước" disabled={workloadPage === 1} onClick={() => setWorkloadPage((page) => Math.max(1, page - 1))}><ChevronLeft size={16} /></button>
            {workloadPageNumbers.map((page) => <button type="button" key={page} className={page === workloadPage ? 'active' : ''} aria-current={page === workloadPage ? 'page' : undefined} onClick={() => setWorkloadPage(page)}>{page}</button>)}
            <button type="button" aria-label="Trang sau" disabled={workloadPage === workloadPageCount} onClick={() => setWorkloadPage((page) => Math.min(workloadPageCount, page + 1))}><ChevronRight size={16} /></button>
          </nav>
        </div>}
      </div>
      {managedTeacher && (
        <Modal
          title="Quản lý phân công giảng dạy"
          size="wide"
          onClose={() => setManagedTeacher(null)}
          footer={<><button className="live-btn ghost" onClick={() => setManagedTeacher(null)}>Đóng</button><button className="live-btn" onClick={() => openCreateForTeacher(managedTeacher.teacherId)}><Plus size={15} /> Thêm lớp dạy</button></>}
        >
          <div className="assignment-manage-profile"><span>{managedTeacher.teacherName.slice(0, 1)}</span><div><strong>{managedTeacher.teacherName}</strong><small>{managedTeacher.teacherCode || 'Chưa có mã giáo viên'} · {managedTeacher.mainSubject || 'Chưa cập nhật chuyên môn'}</small></div><div><strong>{managedTeacher.classCount} lớp</strong><small>{managedTeacher.weeklyPeriods} tiết/tuần</small></div></div>
          <div className="assignment-manage-intro"><strong>Chọn phân công cần thay đổi</strong><span>Sửa để cập nhật lớp, môn hoặc số tiết. Chỉ có thể xóa phân công chưa có tiết trong thời khóa biểu.</span></div>
          <Async paginate pageSize={5} state={managedAssignments} empty="Giáo viên chưa có phân công trong học kỳ đã chọn." itemLabel="phân công">
            {(items) => (
              <div className="live-table-wrap">
                <table className="live-table assignment-manage-table">
                  <thead><tr><th>Lớp</th><th>Môn học</th><th>Học kỳ</th><th>Tải giảng dạy</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>{items.map((item) => {
                    const semester = semesters.data?.find((entry) => entry.id === item.semesterId);
                    return <tr key={item.id}>
                      <td><span className="teacher-class-code">{item.classCode}</span></td>
                      <td><strong>{item.subjectName}</strong></td>
                      <td>{semester?.name ?? item.semesterId}</td>
                      <td><div className="assignment-manage-load"><strong>{item.weeklyPeriods} tiết/tuần</strong><small>Đã xếp {item.scheduledPeriods}/{item.weeklyPeriods}</small></div></td>
                      <td><span className={`assignment-manage-status ${item.scheduledPeriods > 0 ? 'scheduled' : 'open'}`}>{item.scheduledPeriods > 0 ? 'Đã có lịch' : 'Có thể xóa'}</span></td>
                      <td><div className="assignment-manage-actions"><button className="assignment-row-action edit" onClick={() => openEdit(item)} title="Sửa phân công"><Pencil size={15} /><span>Sửa</span></button><button className="assignment-row-action delete" title={item.scheduledPeriods > 0 ? 'Xóa các tiết trong thời khóa biểu trước' : 'Xóa phân công'} disabled={item.scheduledPeriods > 0 || deletingId === item.id} onClick={() => requestDelete(item)}><Trash2 size={15} /><span>Xóa</span></button></div></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
            )}
          </Async>
        </Modal>
      )}
      {pendingDelete && (
        <Modal
          title="Xác nhận xóa phân công"
          onClose={() => { if (!deletingId) setPendingDelete(null); }}
          footer={<><button className="live-btn ghost" disabled={Boolean(deletingId)} onClick={() => setPendingDelete(null)}>Hủy</button><button className="live-btn danger" disabled={Boolean(deletingId)} onClick={removeAssignment}><Trash2 size={15} />{deletingId ? 'Đang xóa…' : 'Xóa phân công'}</button></>}
        >
          <div className="assignment-delete-confirm"><span><Trash2 size={22} /></span><div><strong>{pendingDelete.subjectName} · Lớp {pendingDelete.classCode}</strong><small>{pendingDelete.teacherName} · {pendingDelete.weeklyPeriods} tiết/tuần</small></div></div>
          <p className="assignment-delete-warning">Phân công sẽ bị xóa khỏi hệ thống. Thao tác này không thể hoàn tác.</p>
          {deleteError && <div className="live-msg err">{deleteError}</div>}
        </Modal>
      )}
      {show && (
        <Modal
          title={editing ? 'Cập nhật phân công giảng dạy' : 'Phân công giáo viên bộ môn'}
          onClose={() => { setShow(false); setEditing(null); }}
          footer={<><button className="live-btn ghost" onClick={() => { setShow(false); setEditing(null); }}>Hủy</button><button className="live-btn" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu phân công'}</button></>}
        >
          {error && <div className="conflict-box"><AlertTriangle size={17} /><span>{error}</span></div>}
          {editing && <div className="assignment-edit-context"><Pencil size={17} /><div><strong>{editing.subjectName} · Lớp {editing.classCode}</strong><span>{editing.teacherName} · {editing.weeklyPeriods} tiết/tuần</span></div></div>}
          {editingHasSchedule && <div className="assignment-edit-lock"><AlertTriangle size={17} /><span>Phân công đã có {editing?.scheduledPeriods} tiết trong thời khóa biểu. Bạn chỉ có thể thay đổi số tiết/tuần và không được nhỏ hơn số tiết đã xếp.</span></div>}
          <div className="modal-grid2">
            <Field label="Lớp học">
              <select disabled={editingHasSchedule} value={form.classId} onChange={(event) => setForm((current) => ({ ...current, classId: event.target.value }))}>
                <option value="">— Chọn lớp —</option>
                {(classes.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
              </select>
            </Field>
            <Field label="Học kỳ">
              <select disabled={editingHasSchedule} value={form.semesterId} onChange={(event) => setForm((current) => ({ ...current, semesterId: event.target.value }))}>
                <option value="">— Chọn học kỳ —</option>
                {(semesters.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Môn học">
            <select disabled={editingHasSchedule} value={form.subjectId} onChange={(event) => setForm((current) => ({ ...current, subjectId: event.target.value }))}>
              <option value="">— Chọn môn học —</option>
              {(subjects.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </Field>
          <Field label="Giáo viên bộ môn">
            <select disabled={editingHasSchedule} value={form.teacherId} onChange={(event) => setForm((current) => ({ ...current, teacherId: event.target.value }))}>
              <option value="">— Chọn giáo viên —</option>
              {selectableTeachers.map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.mainSubject || 'Chưa cập nhật chuyên môn'}{matchesSpecialty(item, selectedSubject) ? ' · Phù hợp chuyên môn' : ''}</option>)}
            </select>
            <small className="field-help">Giáo viên phù hợp chuyên môn được ưu tiên đầu danh sách; phân công này quyết định môn và lớp giáo viên thực tế phụ trách.</small>
            {selectedTeacherWorkload && <div className="selected-teacher-workload"><strong>{selectedTeacherWorkload.classCount} lớp đang phụ trách</strong><span>{selectedTeacherWorkload.classCodes.join(', ') || 'Chưa có lớp'} · {selectedTeacherWorkload.scheduledPeriods}/{selectedTeacherWorkload.weeklyPeriods} tiết/tuần</span></div>}
          </Field>
          <Field label="Số tiết mỗi tuần">
            <input type="number" min={Math.max(1, editing?.scheduledPeriods ?? 1)} max={20} value={form.weeklyPeriods} onChange={(event) => setForm((current) => ({ ...current, weeklyPeriods: Number(event.target.value) }))} />
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
      <Async paginate state={holidays} empty="Chưa có ngày nghỉ" itemLabel="ngày nghỉ">
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

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowRightLeft, BookOpenCheck, CalendarDays, CheckCircle2,
  ChevronLeft, ChevronRight, Clock3, Pencil, Plus, RotateCcw, Search,
  Trash2, UserRoundCheck, UsersRound, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, ApiUser, Room, SchoolClass, Semester, TeacherWorkload, TeachingAssignment, TimetableSlot, Subject,
  TimetableChangeRequestView,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { confirmAction } from '../../components/confirmAction';
import { Async, DAY_LABEL, DAYS, useToast } from './common';
import { Field, Modal } from './Modal';
import { useHashNumber, useHashString } from '../../api/urlState';
import { AdminAutoTimetableLive, AdminWorkloadPlanningLive } from './WorkloadPlanningLive';
import {
  operationalAcademicYears, operationalYearLabel, resolveOperationalAcademicYearId,
  sameAcademicYearSelection,
} from './academicYearSelection';

const PERIODS = [1, 2, 3, 4, 5, 6];
const PERIOD_TIME: Record<'MORNING' | 'AFTERNOON', Record<number, [string, string]>> = {
  MORNING: {
    1: ['07:00', '07:45'], 2: ['07:50', '08:35'], 3: ['08:50', '09:35'],
    4: ['09:40', '10:25'], 5: ['10:35', '11:20'], 6: ['11:25', '12:10'],
  },
  AFTERNOON: {
    1: ['13:00', '13:45'], 2: ['13:50', '14:35'], 3: ['14:50', '15:35'],
    4: ['15:40', '16:25'], 5: ['16:35', '17:20'], 6: ['17:25', '18:10'],
  },
};

const assignmentQuery = (classId: string, semesterId: string, day?: string, period?: number, startTime?: string, endTime?: string) => {
  const params = new URLSearchParams();
  if (classId) params.set('classId', classId);
  if (semesterId) params.set('semesterId', semesterId);
  if (day && period) {
    params.set('dayOfWeek', day);
    params.set('periodNo', String(period));
    if (startTime) params.set('startTime', startTime);
    if (endTime) params.set('endTime', endTime);
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

function groupAssignmentsBySubject(assignments: TeacherWorkload['assignments']) {
  const groups = new Map<string, {
    subjectId: string;
    subjectName: string;
    weeklyPeriods: number;
    scheduledPeriods: number;
    assignments: TeacherWorkload['assignments'];
  }>();
  assignments.forEach((assignment) => {
    const current = groups.get(assignment.subjectId) ?? {
      subjectId: assignment.subjectId,
      subjectName: assignment.subjectName,
      weeklyPeriods: 0,
      scheduledPeriods: 0,
      assignments: [],
    };
    current.weeklyPeriods += assignment.weeklyPeriods;
    current.scheduledPeriods += assignment.scheduledPeriods;
    current.assignments.push(assignment);
    groups.set(assignment.subjectId, current);
  });
  return [...groups.values()].sort((left, right) => left.subjectName.localeCompare(right.subjectName, 'vi'));
}

type AssignmentForm = {
  classIds: string[];
  classWeeklyPeriods: Record<string, number>;
  semesterId: string;
  subjectId: string;
  teacherId: string;
  weeklyPeriods: number;
};

const emptyAssignment: AssignmentForm = {
  classIds: [], classWeeklyPeriods: {}, semesterId: '', subjectId: '', teacherId: '', weeklyPeriods: 2,
};

function TeachingAssignmentManager() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [academicYearId, setAcademicYearId] = useHashString('ta_year', '');
  const [gradeFilter, setGradeFilter] = useHashString('ta_grade', '');
  const classes = useApi<SchoolClass[]>(academicYearId
    ? `/classes?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const subjects = useApi<Subject[]>('/subjects');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const semesters = useApi<Semester[]>(academicYearId
    ? `/semesters?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const toast = useToast();
  const [classFilter, setClassFilter] = useHashString('ta_class', '');
  const [semesterFilter, setSemesterFilter] = useHashString('ta_semester', '');
  const [teacherSearch, setTeacherSearch] = useHashString('ta_q', '');
  const assignments = useApi<TeachingAssignment[]>(assignmentQuery(classFilter, semesterFilter));
  const workloads = useApi<TeacherWorkload[]>(workloadQuery(semesterFilter));
  const [editing, setEditing] = useState<TeachingAssignment | null>(null);
  const [managedTeacher, setManagedTeacher] = useState<TeacherWorkload | null>(null);
  const managedAssignments = useApi<TeachingAssignment[]>(managedTeacher
    ? teacherAssignmentQuery(managedTeacher.teacherId, semesterFilter) : null);
  const [form, setForm] = useState<AssignmentForm>(emptyAssignment);
  const [classSearch, setClassSearch] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<TeachingAssignment | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [workloadPage, setWorkloadPage] = useHashNumber('ta_page', 1);
  const [workloadPageSize, setWorkloadPageSize] = useHashNumber('ta_size', 5);

  const yearOptions = useMemo(() => operationalAcademicYears(years.data ?? []), [years.data]);
  const classOptions = useMemo(() => (classes.data ?? [])
    .filter((item) => !gradeFilter || item.gradeLevel === gradeFilter)
    .slice().sort((left, right) => left.code.localeCompare(right.code, 'vi')), [classes.data, gradeFilter]);
  const gradeOptions = useMemo(() => [...new Set((classes.data ?? [])
    .map((item) => item.gradeLevel).filter(Boolean) as string[])].sort(), [classes.data]);
  const semesterOptions = useMemo(() => (semesters.data ?? [])
    .filter((item) => item.status !== 'CLOSED'), [semesters.data]);

  useEffect(() => {
    if (!years.data) return;
    const next = resolveOperationalAcademicYearId(years.data, academicYearId);
    if (next !== academicYearId) setAcademicYearId(next);
  }, [academicYearId, setAcademicYearId, years.data]);

  useEffect(() => {
    if (gradeFilter && !gradeOptions.includes(gradeFilter)) setGradeFilter('');
    if (classFilter && !classOptions.some((item) => item.id === classFilter)) setClassFilter('');
  }, [classFilter, classOptions, gradeFilter, gradeOptions, setClassFilter, setGradeFilter]);

  useEffect(() => {
    if (semesterFilter && !semesterOptions.some((item) => item.id === semesterFilter)) setSemesterFilter('');
  }, [semesterFilter, semesterOptions, setSemesterFilter]);

  const selectedSubject = subjects.data?.find((subject) => subject.id === form.subjectId);
  const selectedSemester = semesters.data?.find((semester) => semester.id === form.semesterId);
  const batchAssignments = useApi<TeachingAssignment[]>(show && !editing && form.semesterId && form.subjectId
    ? `/teaching-assignments?semesterId=${encodeURIComponent(form.semesterId)}&subjectId=${encodeURIComponent(form.subjectId)}`
    : null);
  const teacherContextAssignments = useApi<TeachingAssignment[]>(show && !editing && form.teacherId
    ? teacherAssignmentQuery(form.teacherId, form.semesterId)
    : null);
  const existingTeacherAssignments = teacherContextAssignments.data ?? [];
  const assignmentByClassId = new Map((batchAssignments.data ?? []).map((item) => [item.classId, item]));
  const occupiedClassIds = new Set((batchAssignments.data ?? []).map((item) => item.classId));
  const visibleBatchClasses = (classes.data ?? []).filter((item) => {
    const sameYear = !selectedSemester?.academicYearId || !item.academicYearId
      || selectedSemester.academicYearId === item.academicYearId;
    const query = normalizeSearch(classSearch.trim());
    return sameYear && (!query || normalizeSearch(`${item.code} ${item.name}`).includes(query));
  });
  const selectedClassDetails = (classes.data ?? []).filter((item) => form.classIds.includes(item.id));
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
  const hasAssignmentFilters = Boolean(teacherSearch || gradeFilter || classFilter || semesterFilter);
  const editingHasSchedule = Boolean(editing && editing.scheduledPeriods > 0);

  useEffect(() => {
    setWorkloadPage(1);
  }, [teacherSearch, classFilter, semesterFilter, workloadPageSize, setWorkloadPage]);

  useEffect(() => {
    setWorkloadPage((current) => Math.min(current, workloadPageCount));
  }, [workloadPageCount, setWorkloadPage]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyAssignment,
      classIds: classFilter ? [classFilter] : [],
      classWeeklyPeriods: classFilter ? { [classFilter]: emptyAssignment.weeklyPeriods } : {},
      semesterId: semesterFilter,
    });
    setClassSearch('');
    setError(null);
    setShow(true);
  };

  const openCreateForTeacher = (teacherId: string) => {
    const teacher = teachers.data?.find((item) => item.id === teacherId);
    const specialtySubject = teacher
      ? subjects.data?.find((subject) => matchesSpecialty(teacher, subject))
      : undefined;
    setEditing(null);
    setManagedTeacher(null);
    setForm({
      ...emptyAssignment,
      classIds: classFilter ? [classFilter] : [],
      classWeeklyPeriods: classFilter ? { [classFilter]: emptyAssignment.weeklyPeriods } : {},
      semesterId: semesterFilter,
      subjectId: specialtySubject?.id ?? '',
      teacherId,
    });
    setClassSearch('');
    setError(null);
    setShow(true);
  };

  const openEdit = (item: TeachingAssignment) => {
    setEditing(item);
    setForm({
      classIds: [item.classId],
      classWeeklyPeriods: { [item.classId]: item.weeklyPeriods },
      semesterId: item.semesterId,
      subjectId: item.subjectId,
      teacherId: item.teacherId,
      weeklyPeriods: item.weeklyPeriods,
    });
    setClassSearch('');
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
    setGradeFilter('');
    setClassFilter('');
    setSemesterFilter('');
  };

  const save = async () => {
    if (form.classIds.length === 0 || !form.semesterId || !form.subjectId || !form.teacherId) {
      setError('Vui lòng chọn ít nhất một lớp, học kỳ, môn học và giáo viên.');
      return;
    }
    const invalidClassId = !editing && form.classIds.find((classId) => {
      const weeklyPeriods = form.classWeeklyPeriods[classId];
      return !Number.isInteger(weeklyPeriods) || weeklyPeriods < 1 || weeklyPeriods > 20;
    });
    if (invalidClassId) {
      const schoolClass = classes.data?.find((item) => item.id === invalidClassId);
      setError(`Số tiết/tuần của lớp ${schoolClass?.code ?? invalidClassId} phải từ 1 đến 20.`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/teaching-assignments/${editing.id}`, {
          classId: form.classIds[0],
          semesterId: form.semesterId,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
          weeklyPeriods: form.weeklyPeriods,
        });
      } else {
        await api.post('/teaching-assignments/batch', {
          assignments: form.classIds.map((classId) => ({
            classId,
            weeklyPeriods: form.classWeeklyPeriods[classId],
          })),
          semesterId: form.semesterId,
          subjectId: form.subjectId,
          teacherId: form.teacherId,
        });
      }
      toast.show('ok', editing
        ? 'Đã cập nhật phân công giảng dạy'
        : `Đã phân công giáo viên cho ${form.classIds.length} lớp`);
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

  const toggleClass = (classId: string) => {
    setForm((current) => {
      const selected = current.classIds.includes(classId);
      const classWeeklyPeriods = { ...current.classWeeklyPeriods };
      if (selected) delete classWeeklyPeriods[classId];
      else classWeeklyPeriods[classId] = emptyAssignment.weeklyPeriods;
      return {
        ...current,
        classIds: selected
          ? current.classIds.filter((id) => id !== classId)
          : [...current.classIds, classId],
        classWeeklyPeriods,
      };
    });
  };

  const selectAllAvailableClasses = () => {
    const availableIds = visibleBatchClasses.filter((item) => !occupiedClassIds.has(item.id)).map((item) => item.id);
    setForm((current) => {
      const classWeeklyPeriods = { ...current.classWeeklyPeriods };
      availableIds.forEach((classId) => {
        if (!classWeeklyPeriods[classId]) classWeeklyPeriods[classId] = emptyAssignment.weeklyPeriods;
      });
      return {
        ...current,
        classIds: [...new Set([...current.classIds, ...availableIds])],
        classWeeklyPeriods,
      };
    });
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
          <label><span>Năm học</span><select className="live-select" value={academicYearId} onChange={(event) => {
            setAcademicYearId(event.target.value); setGradeFilter(''); setClassFilter('');
            setSemesterFilter(''); setForm({ ...emptyAssignment }); setShow(false);
          }}>
            <option value="">— Chọn năm học —</option>
            {yearOptions.map((item) => <option key={item.id} value={item.id}>{operationalYearLabel(item)}</option>)}
          </select></label>
          <label><span>Khối</span><select className="live-select" value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)}>
            <option value="">Tất cả khối</option>
            {gradeOptions.map((grade) => <option key={grade} value={grade}>Khối {grade.replace(/^K/i, '')}</option>)}
          </select></label>
          <label><span>Lớp học</span><select className="live-select" value={classFilter} onChange={(event) => setClassFilter(event.target.value)}>
            <option value="">Tất cả lớp</option>
            {classOptions.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
          </select></label>
          <label><span>Học kỳ</span><select className="live-select" value={semesterFilter} onChange={(event) => setSemesterFilter(event.target.value)}>
            <option value="">Tất cả học kỳ</option>
            {semesterOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
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
                <thead><tr><th>Giáo viên bộ môn</th><th>Chuyên môn</th><th>Phân công hiện tại</th><th>Tổng tải tuần</th><th>Thao tác</th></tr></thead>
                <tbody>{items.map((item) => {
                  const subjectGroups = groupAssignmentsBySubject(item.assignments);
                  return <tr key={item.teacherId}>
                    <td><div className="assignment-teacher-cell"><span>{item.teacherName.slice(0, 1)}</span><div><strong>{item.teacherName}</strong><small>{item.teacherCode || 'Chưa có mã giáo viên'}</small></div></div></td>
                    <td><span className="teacher-specialty-pill">{item.mainSubject || 'Chưa cập nhật'}</span></td>
                    <td>{subjectGroups.length > 0 ? <div className="teacher-subject-groups">{subjectGroups.map((group) => (
                      <section key={group.subjectId} className="teacher-subject-group">
                        <header><div><BookOpenCheck size={15} /><strong>{group.subjectName}</strong></div><span>{group.assignments.length} lớp · {group.weeklyPeriods} tiết</span></header>
                        <div>{group.assignments.map((assignment) => (
                          <article key={assignment.id}>
                            <span className="teacher-class-code">{assignment.classCode}</span>
                            <strong>{assignment.weeklyPeriods} tiết/tuần</strong>
                            <small><progress max={Math.max(assignment.weeklyPeriods, 1)} value={assignment.scheduledPeriods} />Đã xếp {assignment.scheduledPeriods}/{assignment.weeklyPeriods}</small>
                          </article>
                        ))}</div>
                      </section>
                    ))}</div> : <span className="assignment-unassigned">Chưa có lớp và môn phụ trách</span>}</td>
                    <td><div className="teacher-load-summary"><strong>{item.weeklyPeriods} tiết</strong><span>{item.classCount} lớp · {item.subjectCount} môn</span><progress max={Math.max(item.weeklyPeriods, 1)} value={item.scheduledPeriods} /><small>Đã xếp {item.scheduledPeriods}/{item.weeklyPeriods} tiết</small></div></td>
                    <td><div className="teacher-workload-actions"><button className="live-btn compact" onClick={() => openCreateForTeacher(item.teacherId)}><Plus size={14} /> Thêm lớp dạy</button><button className="live-btn compact ghost" disabled={item.classCount === 0} onClick={() => setManagedTeacher(item)}><Pencil size={14} /> Quản lý phân công</button></div></td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
        </Async>
        {visibleWorkloads.length > 0 && <div className="assignment-pagination">
          <div className="assignment-pagination-summary">Hiển thị <strong>{workloadRangeStart}–{workloadRangeEnd}</strong> trong <strong>{visibleWorkloads.length}</strong> giáo viên</div>
          <label className="assignment-page-size"><span>Số dòng</span><select value={workloadPageSize} onChange={(event) => setWorkloadPageSize(Number(event.target.value))}><option value={2}>2</option><option value={5}>5</option><option value={10}>10</option><option value={20}>20</option></select></label>
          <nav className="assignment-page-nav" aria-label="Phân trang danh sách giáo viên">
            <button type="button" aria-label="Trang trước" disabled={workloadPage === 1} onClick={() => setWorkloadPage((page) => Math.max(1, page - 1), 'push')}><ChevronLeft size={16} /></button>
            {workloadPageNumbers.map((page) => <button type="button" key={page} className={page === workloadPage ? 'active' : ''} aria-current={page === workloadPage ? 'page' : undefined} onClick={() => setWorkloadPage(page, 'push')}>{page}</button>)}
            <button type="button" aria-label="Trang sau" disabled={workloadPage === workloadPageCount} onClick={() => setWorkloadPage((page) => Math.min(workloadPageCount, page + 1), 'push')}><ChevronRight size={16} /></button>
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
          size={editing ? undefined : 'wide'}
          onClose={() => { setShow(false); setEditing(null); setClassSearch(''); }}
          footer={<><button className="live-btn ghost" onClick={() => { setShow(false); setEditing(null); }}>Hủy</button><button className="live-btn" disabled={busy} onClick={save}>{busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Lưu phân công'}</button></>}
        >
          {error && <div className="conflict-box"><AlertTriangle size={17} /><span>{error}</span></div>}
          {editing && <div className="assignment-edit-context"><Pencil size={17} /><div><strong>{editing.subjectName} · Lớp {editing.classCode}</strong><span>{editing.teacherName} · {editing.weeklyPeriods} tiết/tuần</span></div></div>}
          {editingHasSchedule && <div className="assignment-edit-lock"><AlertTriangle size={17} /><span>Phân công đã có {editing?.scheduledPeriods} tiết trong thời khóa biểu. Bạn chỉ có thể thay đổi số tiết/tuần và không được nhỏ hơn số tiết đã xếp.</span></div>}
          <div className={editing ? 'modal-grid2' : undefined}>
            {editing && <Field label="Lớp học">
              <select disabled={editingHasSchedule} value={form.classIds[0] ?? ''} onChange={(event) => setForm((current) => ({ ...current, classIds: event.target.value ? [event.target.value] : [] }))}>
                <option value="">— Chọn lớp —</option>
                {classOptions.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
              </select>
            </Field>}
            <Field label="Học kỳ">
              <select disabled={editingHasSchedule} value={form.semesterId} onChange={(event) => setForm((current) => ({ ...current, semesterId: event.target.value }))}>
                <option value="">— Chọn học kỳ —</option>
                {semesterOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}</option>)}
              </select>
            </Field>
          </div>
          {!editing && <Field label={`Lớp học · ${existingTeacherAssignments.length} đã phân công · ${form.classIds.length} chọn thêm`}>
            <div className="assignment-multi-class-picker">
              {form.teacherId && <div className="assignment-existing-overview">
                <div>
                  <strong>Lớp đã phân công trước đó</strong>
                  <small>{form.semesterId ? 'Trong học kỳ đang chọn' : 'Trong tất cả học kỳ'} · chỉ hiển thị để đối chiếu, không tạo lại</small>
                </div>
                {teacherContextAssignments.loading ? <span className="assignment-existing-loading">Đang tải…</span> : <b>{existingTeacherAssignments.length} phân công</b>}
                {!teacherContextAssignments.loading && existingTeacherAssignments.length > 0 && <div className="assignment-existing-list">
                  {existingTeacherAssignments.map((item) => <span key={item.id}><CheckCircle2 size={13} /><strong>{item.classCode}</strong><small>{item.subjectName} · {item.weeklyPeriods} tiết/tuần</small></span>)}
                </div>}
                {!teacherContextAssignments.loading && existingTeacherAssignments.length === 0 && <p>Giáo viên chưa có lớp được phân công trong phạm vi này.</p>}
              </div>}
              <div className="assignment-multi-class-toolbar">
                <div className="assignment-class-search"><Search size={16} /><input value={classSearch} onChange={(event) => setClassSearch(event.target.value)} placeholder="Tìm mã hoặc tên lớp…" aria-label="Tìm lớp để phân công" /></div>
                <button type="button" onClick={selectAllAvailableClasses}>Chọn tất cả kết quả</button>
                <button type="button" disabled={form.classIds.length === 0} onClick={() => setForm((current) => ({ ...current, classIds: [], classWeeklyPeriods: {} }))}>Bỏ lớp chọn thêm</button>
              </div>
              {selectedClassDetails.length > 0 && <div className="assignment-selected-class-config">
                <div className="assignment-selected-class-heading">
                  <div><strong>Cấu hình riêng cho từng lớp</strong><small>Mỗi lớp có thể có số tiết dạy trong tuần khác nhau.</small></div>
                  <b>{selectedClassDetails.length} lớp đã chọn</b>
                </div>
                <div className="assignment-selected-class-list">
                  {selectedClassDetails.map((item) => <article key={item.id}>
                    <div><strong>{item.code}</strong><small>{item.name}</small></div>
                    <label>
                      <span>Số tiết/tuần</span>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={form.classWeeklyPeriods[item.id] ?? emptyAssignment.weeklyPeriods}
                        onChange={(event) => setForm((current) => ({
                          ...current,
                          classWeeklyPeriods: {
                            ...current.classWeeklyPeriods,
                            [item.id]: Number(event.target.value),
                          },
                        }))}
                        aria-label={`Số tiết mỗi tuần của lớp ${item.code}`}
                      />
                    </label>
                    <button type="button" onClick={() => toggleClass(item.id)} aria-label={`Bỏ chọn lớp ${item.code}`}><X size={15} /></button>
                  </article>)}
                </div>
              </div>}
              <div className="assignment-multi-class-grid">
                {visibleBatchClasses.map((item) => {
                  const existingAssignment = assignmentByClassId.get(item.id);
                  const occupied = Boolean(existingAssignment);
                  const assignedToSelectedTeacher = existingAssignment?.teacherId === form.teacherId;
                  const checked = form.classIds.includes(item.id);
                  return <label key={item.id} className={`${checked || assignedToSelectedTeacher ? 'selected' : ''} ${assignedToSelectedTeacher ? 'existing' : ''} ${occupied ? 'disabled' : ''}`}>
                    <input type="checkbox" checked={checked || assignedToSelectedTeacher} disabled={occupied} onChange={() => toggleClass(item.id)} />
                    <span><strong>{item.code}</strong><small>{item.name}</small></span>
                    <em>{assignedToSelectedTeacher
                      ? `Đang dạy · ${existingAssignment?.weeklyPeriods} tiết/tuần`
                      : occupied
                        ? `Đã giao cho ${existingAssignment?.teacherName}`
                        : checked ? 'Sẽ thêm mới' : 'Có thể chọn'}</em>
                  </label>;
                })}
              </div>
              {batchAssignments.loading && <small className="field-help">Đang kiểm tra các lớp đã có giáo viên phụ trách…</small>}
              {!batchAssignments.loading && visibleBatchClasses.length === 0 && <div className="assignment-class-empty">Không có lớp phù hợp với học kỳ hoặc từ khóa tìm kiếm.</div>}
            </div>
            <small className="field-help">Mỗi lớp được tạo thành một phân công riêng nhưng được lưu đồng thời. Nếu có lớp không hợp lệ, hệ thống sẽ không lưu dở dang.</small>
          </Field>}
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
          {editing && <Field label="Số tiết mỗi tuần">
            <input type="number" min={Math.max(1, editing?.scheduledPeriods ?? 1)} max={20} value={form.weeklyPeriods} onChange={(event) => setForm((current) => ({ ...current, weeklyPeriods: Number(event.target.value) }))} />
            <small className="field-help">Thời khóa biểu sẽ không cho xếp vượt quá số tiết đã giao.</small>
          </Field>}
        </Modal>
      )}
    </Section>
  );
}

function TimetableEditor() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const [academicYearId, setAcademicYearId] = useHashString('tt_year', '');
  const [gradeFilter, setGradeFilter] = useHashString('tt_grade', '');
  const [classId, setClassId] = useHashString('tt_class', '');
  const [semesterId, setSemesterId] = useHashString('tt_semester', '');
  const classes = useApi<SchoolClass[]>(academicYearId
    ? `/classes?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const rooms = useApi<Room[]>('/rooms');
  const semesters = useApi<Semester[]>(academicYearId
    ? `/semesters?academicYearId=${encodeURIComponent(academicYearId)}` : null);
  const toast = useToast();
  const yearOptions = useMemo(() => operationalAcademicYears(years.data ?? []), [years.data]);
  const gradeOptions = useMemo(() => [...new Set((classes.data ?? [])
    .map((item) => item.gradeLevel).filter(Boolean) as string[])].sort(), [classes.data]);
  const classOptions = useMemo(() => (classes.data ?? [])
    .filter((item) => !gradeFilter || item.gradeLevel === gradeFilter)
    .slice().sort((left, right) => left.code.localeCompare(right.code, 'vi')), [classes.data, gradeFilter]);
  const semesterOptions = useMemo(() => (semesters.data ?? [])
    .filter((item) => item.status !== 'CLOSED'), [semesters.data]);

  useEffect(() => {
    if (!years.data) return;
    const next = resolveOperationalAcademicYearId(years.data, academicYearId);
    if (next !== academicYearId) setAcademicYearId(next);
  }, [academicYearId, setAcademicYearId, years.data]);
  useEffect(() => {
    if (gradeFilter && !gradeOptions.includes(gradeFilter)) setGradeFilter('');
  }, [gradeFilter, gradeOptions, setGradeFilter]);
  useEffect(() => {
    if (!classOptions.length) {
      if (classId) setClassId('');
      return;
    }
    if (!classOptions.some((item) => item.id === classId)) {
      setClassId(classOptions[0].id);
    }
  }, [classId, classOptions, setClassId]);
  useEffect(() => {
    if (!semesterOptions.length) {
      if (semesterId) setSemesterId('');
      return;
    }
    if (semesterOptions.some((item) => item.id === semesterId)) return;
    const preferred = semesterOptions.find((item) => item.status === 'ACTIVE')
      ?? semesterOptions.find((item) => item.status === 'PLANNED')
      ?? semesterOptions[0];
    setSemesterId(preferred.id);
  }, [semesterId, semesterOptions, setSemesterId]);
  const selectedClass = classOptions.find((item) => item.id === classId);
  const selectedSemester = semesterOptions.find((item) => item.id === semesterId);
  const scopeValid = sameAcademicYearSelection(selectedClass, selectedSemester)
    && selectedClass?.academicYearId === academicYearId;
  const slots = useApi<TimetableSlot[]>(scopeValid ? `/timetableSlots?classId=${encodeURIComponent(classId)}&semesterId=${encodeURIComponent(semesterId)}` : null);
  const assignmentSummary = useApi<TeachingAssignment[]>(scopeValid ? assignmentQuery(classId, semesterId) : null);
  const [show, setShow] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const blank = { assignmentId: '', dayOfWeek: 'MON', periodNo: 1, subjectId: '', teacherId: '', roomCode: '', startTime: '07:00', endTime: '07:45' };
  const [form, setForm] = useState({ ...blank });
  const studyShift = selectedClass?.studyShift || 'MORNING';
  const shiftLabel = studyShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng';
  const periodTimes = PERIOD_TIME[studyShift];
  const roomStatus = (room: Room) => {
    const supportsShift = studyShift === 'AFTERNOON'
      ? room.supportsAfternoon !== false
      : room.supportsMorning !== false;
    const assignedClass = (classes.data ?? []).find((item) => item.id !== classId
      && item.roomId === room.id
      && item.academicYearId === selectedClass?.academicYearId
      && (item.studyShift || 'MORNING') === studyShift);
    return { available: supportsShift && !assignedClass, assignedClass };
  };
  const availability = useApi<TeachingAssignment[]>(show && scopeValid
    ? assignmentQuery(classId, semesterId, form.dayOfWeek, form.periodNo, form.startTime, form.endTime) : null);
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
    const [startTime, endTime] = periodTimes[period] ?? ['', ''];
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
    const [startTime, endTime] = periodTimes[period] ?? ['', ''];
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
    if (!await confirmAction({
      title: `Xóa tiết ${slot.subjectName}?`,
      description: `${DAY_LABEL[slot.dayOfWeek]}, tiết ${slot.periodNo}. Thao tác này không thể hoàn tác.`,
      confirmLabel: 'Xóa tiết',
      tone: 'danger',
    })) return;
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
        <select className="live-select" aria-label="Năm học xếp thời khóa biểu" value={academicYearId} onChange={(event) => {
          setAcademicYearId(event.target.value); setGradeFilter(''); setClassId(''); setSemesterId(''); setShow(false);
        }}>
          <option value="">— Chọn năm học —</option>
          {yearOptions.map((item) => <option key={item.id} value={item.id}>{operationalYearLabel(item)}</option>)}
        </select>
        <select className="live-select" aria-label="Khối xếp thời khóa biểu" value={gradeFilter} onChange={(event) => { setGradeFilter(event.target.value); setClassId(''); setShow(false); }}>
          <option value="">Tất cả khối</option>
          {gradeOptions.map((grade) => <option key={grade} value={grade}>Khối {grade.replace(/^K/i, '')}</option>)}
        </select>
        <select className="live-select grow" aria-label="Lớp xếp thời khóa biểu" value={classId} onChange={(event) => setClassId(event.target.value)}>
          <option value="">— Chọn lớp để xếp thời khóa biểu —</option>
          {classOptions.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name} · {item.studyShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng'}</option>)}
        </select>
        <select className="live-select grow" aria-label="Học kỳ xếp thời khóa biểu" value={semesterId} onChange={(event) => setSemesterId(event.target.value)}>
          <option value="">— Chọn học kỳ —</option>
          {semesterOptions.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.code}{item.status === 'ACTIVE' ? ' · Đang hoạt động' : item.status === 'PLANNED' ? ' · Sắp diễn ra' : ''}</option>)}
        </select>
      </div>

      {classId && semesterId && !scopeValid && <div className="live-msg err">Lớp và học kỳ phải thuộc cùng một năm học đang vận hành.</div>}

      {classId && semesterId && (
        <><div className={`schedule-shift-callout ${studyShift.toLowerCase()}`}>
          <Clock3 size={21} />
          <div><small>Ca học của lớp {selectedClass?.code}</small><strong>{shiftLabel}</strong><span>{periodTimes[1][0]}–{periodTimes[6][1]} · Tiết 1–6 được tính riêng theo ca</span></div>
        </div><div className="schedule-assignment-strip">
          <div><small>Phân công</small><strong>{progress.count} môn</strong></div>
          <div><small>Tiến độ</small><strong>{progress.scheduled}/{progress.total} tiết</strong></div>
          <div><small>Đã xếp đủ</small><strong>{progress.completed}/{progress.count} môn</strong></div>
          {progress.count === 0 && <p><AlertTriangle size={16} /> Lớp chưa có phân công bộ môn trong học kỳ này. Hãy tạo phân công trước khi xếp lịch.</p>}
        </div></>
      )}

      {!scopeValid ? (
        <div className="live-loading">Chọn lớp và học kỳ để bắt đầu xếp thời khóa biểu.</div>
      ) : (
        <Async state={slots} allowEmpty>
          {() => (
            <div className="timetable admin-timetable-grid" role="table">
              <div className="time-head" />
              {DAYS.map((day) => <div key={day} className="time-head">{DAY_LABEL[day]}</div>)}
              {PERIODS.map((period) => [
                <div key={`p${period}`} className="time-period"><strong>Tiết {period}</strong><small>{periodTimes[period][0]}–{periodTimes[period][1]}</small></div>,
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
          title={`Xếp tiết — ${DAY_LABEL[form.dayOfWeek]} · tiết ${form.periodNo} · ${shiftLabel}`}
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
            {!availability.loading && availability.data?.length === 0 && <small className="field-help error">Chưa có phân công nào. Giáo vụ cần hoàn thành bước phân công giáo viên bộ môn trước.</small>}
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
                {(rooms.data ?? []).map((item) => {
                  const status = roomStatus(item);
                  const isClassRoom = selectedClass?.roomId === item.id;
                  return <option key={item.id} value={item.code} disabled={!status.available && !isClassRoom}>
                    {item.code}{item.name ? ` — ${item.name}` : ''}{isClassRoom ? ' · Phòng của lớp' : status.assignedClass ? ` · Đã giao lớp ${status.assignedClass.code} cùng ca` : !status.available ? ` · Không phục vụ ${shiftLabel.toLowerCase()}` : ''}
                  </option>;
                })}
              </select>
            </Field>
            <Field label="Khung giờ">
              <div className="slot-time-pair"><input type="time" value={form.startTime} onChange={(event) => setForm((current) => ({ ...current, assignmentId: '', subjectId: '', teacherId: '', startTime: event.target.value }))} /><span>—</span><input type="time" value={form.endTime} onChange={(event) => setForm((current) => ({ ...current, assignmentId: '', subjectId: '', teacherId: '', endTime: event.target.value }))} /></div>
            </Field>
          </div>
        </Modal>
      )}
    </Section>
  );
}

function TimetableChangeApprovalPanel() {
  const requests = useApi<TimetableChangeRequestView[]>('/academic/timetable-change-requests');
  const toast = useToast();
  const [query, setQuery] = useHashString('change_q', '');
  const [selected, setSelected] = useState<TimetableChangeRequestView | null>(null);
  const [decision, setDecision] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const filtered = useMemo(() => {
    const normalized = normalizeSearch(query.trim());
    return (requests.data || []).filter((item) => !normalized || normalizeSearch([
      item.classCode, item.subjectName, item.originalTeacherName, item.substituteTeacherName,
      item.reason, item.requestType,
    ].filter(Boolean).join(' ')).includes(normalized));
  }, [query, requests.data]);

  const openDecision = (request: TimetableChangeRequestView, nextDecision: 'APPROVE' | 'REJECT') => {
    setSelected(request);
    setDecision(nextDecision);
    setNote('');
  };

  const submit = async () => {
    if (!selected) return;
    if (decision === 'REJECT' && !note.trim()) {
      toast.show('err', 'Cần nhập lý do từ chối để giáo viên biết cách xử lý');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/academic/timetable-change-requests/${encodeURIComponent(selected.id)}/decision`, {
        approved: decision === 'APPROVE', note,
      });
      toast.show('ok', decision === 'APPROVE' ? 'Đã duyệt và cập nhật lịch hiệu lực' : 'Đã gửi phản hồi từ chối');
      setSelected(null);
      requests.reload();
    } catch (caught: unknown) {
      toast.show('err', caught instanceof Error ? caught.message : 'Không thể xử lý yêu cầu');
    } finally { setBusy(false); }
  };

  return <div className="academic-change-approval">
    {toast.node}
    <header className="academic-change-hero">
      <div><span><ArrowRightLeft size={15} /> Điều phối thay đổi sau phát hành</span><h2>Duyệt dạy thay và đổi tiết</h2><p>Hệ thống kiểm tra chuyên môn, trùng lịch giáo viên, lớp và phòng một lần nữa khi Giáo vụ phê duyệt.</p></div>
      <strong>{filtered.length}<small>yêu cầu chờ xử lý</small></strong>
    </header>
    <div className="academic-change-toolbar"><label><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm lớp, môn, giáo viên hoặc lý do" /></label><button className="live-btn ghost" type="button" onClick={() => requests.reload()}><RotateCcw size={15} /> Làm mới</button></div>
    <Async state={{ ...requests, data: filtered }} empty="Không có yêu cầu dạy thay hoặc đổi tiết đang chờ duyệt">
      {(items) => <div className="academic-change-list">{items.map((request) => <article key={request.id}>
        <div className="academic-change-date"><strong>{new Date(`${request.occurrenceDate}T00:00:00`).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</strong><span>Tiết gốc</span></div>
        <div className="academic-change-main"><header><strong>{request.requestType === 'SUBSTITUTE' ? 'Dạy thay' : request.requestType === 'RESCHEDULE' ? 'Đổi tiết' : 'Dạy thay & đổi tiết'} · {request.subjectName} · Lớp {request.classCode}</strong><StatusPill value={request.status} /></header><p>{request.originalTeacherName}{request.substituteTeacherName ? ` → ${request.substituteTeacherName}` : ''}{request.proposedDate ? ` · Chuyển tới ${new Date(`${request.proposedDate}T00:00:00`).toLocaleDateString('vi-VN')} · tiết ${request.proposedPeriodNo}` : ''}</p><blockquote>{request.reason}</blockquote></div>
        <div className="academic-change-actions"><button className="live-btn subtle" type="button" onClick={() => openDecision(request, 'APPROVE')}><CheckCircle2 size={15} /> Duyệt</button><button className="live-btn ghost danger" type="button" onClick={() => openDecision(request, 'REJECT')}><X size={15} /> Từ chối</button></div>
      </article>)}</div>}
    </Async>
    {selected && <Modal title={`${decision === 'APPROVE' ? 'Duyệt' : 'Từ chối'} yêu cầu · ${selected.subjectName} · Lớp ${selected.classCode}`} onClose={() => setSelected(null)} footer={<><button className="live-btn ghost" type="button" onClick={() => setSelected(null)}>Đóng</button><button className={`live-btn ${decision === 'REJECT' ? 'danger' : ''}`} type="button" disabled={busy} onClick={submit}>{decision === 'APPROVE' ? <CheckCircle2 size={15} /> : <X size={15} />} {busy ? 'Đang xử lý…' : decision === 'APPROVE' ? 'Xác nhận duyệt' : 'Xác nhận từ chối'}</button></>}>
      <div className="change-review-summary"><strong>{selected.originalTeacherName}</strong><span>{selected.requestType === 'SUBSTITUTE' ? `Nhờ ${selected.substituteTeacherName || '—'} dạy thay` : `Đổi từ ${selected.occurrenceDate} sang ${selected.proposedDate}, tiết ${selected.proposedPeriodNo}`}</span><p>{selected.reason}</p></div>
      <Field label={decision === 'APPROVE' ? 'Ghi chú phản hồi (không bắt buộc)' : 'Lý do từ chối'}><textarea rows={4} value={note} onChange={(event) => setNote(event.target.value)} placeholder={decision === 'APPROVE' ? 'Nhập lưu ý cho giáo viên nếu cần' : 'Nêu rõ lý do và hướng xử lý phù hợp'} /></Field>
    </Modal>}
  </div>;
}

export function AdminTimetableLive() {
  return <div className="academic-scheduling-workspace">
    <div className="academic-scheduling-principle">
      <BookOpenCheck size={19} />
      <div><strong>Tự động trước, điều chỉnh sau</strong><span>Chọn đúng học kỳ; hệ thống sẽ giữ riêng phân công và thời khóa biểu của từng học kỳ.</span></div>
      <span className="academic-scheduling-scope">Theo học kỳ</span>
    </div>
    <FunctionTabs tabs={[
      {
        id: 'planning', label: 'Phân công tự động', Icon: BookOpenCheck,
        description: 'Thiết lập số tiết, duyệt tải dạy và xác nhận giáo viên phụ trách',
        content: <AdminWorkloadPlanningLive />,
      },
      {
        id: 'automatic', label: 'Tạo lịch tự động', Icon: CalendarDays,
        description: 'Xếp thứ, tiết và phòng; lưu bản nháp rồi kiểm tra trước khi phát hành',
        content: <AdminAutoTimetableLive />,
      },
      {
        id: 'assignments', label: 'Sửa phân công', Icon: UserRoundCheck,
        description: 'Chỉ dùng khi cần thay giáo viên, lớp, môn hoặc số tiết',
        content: <TeachingAssignmentManager />,
      },
      {
        id: 'timetable', label: 'Sửa thời khóa biểu', Icon: CalendarDays,
        description: 'Điều chỉnh riêng từng ô lịch sau khi đã có phương án tự động',
        content: <TimetableEditor />,
      },
      {
        id: 'changes', label: 'Dạy thay & đổi tiết', Icon: ArrowRightLeft,
        description: 'Duyệt các yêu cầu phát sinh trong quá trình vận hành lịch',
        content: <TimetableChangeApprovalPanel />,
      },
    ]} />
  </div>;
}

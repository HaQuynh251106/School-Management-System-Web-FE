import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BookOpen, CalendarDays, CheckCircle2, Circle, ClipboardList, DoorOpen,
  Layers3, Pencil, Plus, RotateCcw, Save, School, Search,
  Trash2, UserPlus, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type {
  AcademicEnrollment, AcademicPlanReadiness,
  AcademicStudentCandidate, AcademicTrainingPlan, AcademicPlanValidationReport,
  AcademicTrainingPlanSubject, AcademicYear, ApiUser, GradeLevel,
  EducationProgram, Room, SchoolClass, Semester, Subject,
} from '../../api/types';
import { FunctionTabs, Section, StatusPill } from '../../components/ui';
import { Async, fmtDate, PaginatedData, useToast } from './common';
import { TrainingPlanCurriculum } from './TrainingPlanCurriculum';
import { EducationPlanningCatalogWorkspace } from './EducationPlanningCatalogWorkspace';
import { EducationPlanCompletionPanel } from './EducationPlanCompletionPanel';
import { useConfirm } from '../../app/ConfirmDialog';

const GRADES = ['K10', 'K11', 'K12'] as const;
type PlanSection = 'overview' | 'curriculum' | 'distribution' | 'assessment' | 'approval';

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể hoàn thành thao tác.';
}

export function AcademicStructureWorkspace({ initialTabId = 'years' }: {
  initialTabId?: string;
}) {
  const { user } = useAuth();
  const permissions = new Set(user?.permissions || []);
  const canManageStructure = user?.role === 'ADMIN'
    || permissions.has('ACADEMIC_STRUCTURE_MANAGE');
  const canManageEnrollment = user?.role === 'ADMIN'
    || permissions.has('ACADEMIC_ENROLLMENT_MANAGE');
  const canManagePlan = user?.role === 'ADMIN';
  const canManagePlanContent = canManagePlan
    || permissions.has('ACADEMIC_PLAN_CONTENT_MANAGE');
  const canManageExam = user?.role === 'ADMIN'
    || permissions.has('ACADEMIC_EXAM_PLAN_MANAGE');
  const canManageProgram = user?.role === 'ADMIN'
    || permissions.has('ACADEMIC_PROGRAM_MANAGE');

  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const grades = useApi<GradeLevel[]>('/grade-levels');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const rooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/academic/teachers');
  const plans = useApi<AcademicTrainingPlan[]>('/academic/training-plans');
  const toast = useToast();

  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('K10');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [classSearch, setClassSearch] = useState('');
  const [candidateSearch, setCandidateSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrollmentReason, setEnrollmentReason] = useState('Phân lớp đầu năm học');
  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    if (selectedYearId || !years.data?.length) return;
    setSelectedYearId(
      years.data.find((year) => year.status === 'ACTIVE')?.id
      || years.data[0].id,
    );
  }, [selectedYearId, years.data]);

  useEffect(() => {
    const first = (classes.data || []).find((item) => (
      item.academicYearId === selectedYearId
      && item.gradeLevel === selectedGrade
    ));
    if (!selectedClassId || !(classes.data || []).some((item) => item.id === selectedClassId)) {
      setSelectedClassId(first?.id || '');
    }
  }, [classes.data, selectedClassId, selectedGrade, selectedYearId]);

  useEffect(() => {
    const matching = (plans.data || []).find((plan) => (
      plan.academicYearId === selectedYearId
      && plan.gradeLevel === selectedGrade
    ));
    setSelectedPlanId(matching?.id || '');
  }, [plans.data, selectedGrade, selectedYearId]);

  const enrollments = useApi<AcademicEnrollment[]>(
    selectedYearId && selectedClassId
      ? `/academic/enrollments?academicYearId=${encodeURIComponent(selectedYearId)}&classId=${encodeURIComponent(selectedClassId)}`
      : null,
  );
  const candidates = useApi<AcademicStudentCandidate[]>(
    canManageEnrollment && selectedYearId
      ? `/academic/enrollments/unassigned?academicYearId=${encodeURIComponent(selectedYearId)}&keyword=${encodeURIComponent(candidateSearch)}`
      : null,
  );
  const planSubjects = useApi<AcademicTrainingPlanSubject[]>(
    selectedPlanId ? `/academic/training-plans/${selectedPlanId}/subjects` : null,
  );
  const readiness = useApi<AcademicPlanReadiness>(
    selectedPlanId ? `/academic/training-plans/${selectedPlanId}/readiness` : null,
  );

  const refreshStructure = () => {
    years.reload();
    semesters.reload();
    classes.reload();
    subjects.reload();
    rooms.reload();
  };
  const refreshPlan = () => {
    plans.reload();
    planSubjects.reload();
    readiness.reload();
  };

  return (
    <>
      {toast.node}
      <FunctionTabs initialTabId={initialTabId} tabs={[
        {
          id: 'years', label: 'Năm học', Icon: CalendarDays,
          content: <YearsTab state={years} semesters={semesters.data || []} selectedYearId={selectedYearId} setSelectedYearId={setSelectedYearId} canManage={canManageStructure} onChanged={refreshStructure} notify={toast.show} />,
        },
        {
          id: 'grades', label: 'Khối', Icon: Layers3,
          content: <GradesTab state={grades} classes={classes.data || []} years={years.data || []} selectedYearId={selectedYearId} setSelectedYearId={setSelectedYearId} />,
        },
        {
          id: 'classes', label: 'Lớp & phân lớp', Icon: School,
          content: (
            <ClassesTab
              years={years.data || []}
              classes={classes.data || []}
              teachers={teachers.data || []}
              rooms={rooms.data || []}
              selectedYearId={selectedYearId}
              setSelectedYearId={setSelectedYearId}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              selectedClassId={selectedClassId}
              setSelectedClassId={setSelectedClassId}
              classSearch={classSearch}
              setClassSearch={setClassSearch}
              enrollments={enrollments}
              candidates={candidates}
              candidateSearch={candidateSearch}
              setCandidateSearch={setCandidateSearch}
              selectedStudents={selectedStudents}
              setSelectedStudents={setSelectedStudents}
              enrollmentReason={enrollmentReason}
              setEnrollmentReason={setEnrollmentReason}
              canManageStructure={canManageStructure}
              canManageEnrollment={canManageEnrollment}
              onChanged={() => {
                classes.reload(); rooms.reload(); enrollments.reload(); candidates.reload();
                setSelectedStudents([]);
              }}
              notify={toast.show}
            />
          ),
        },
        {
          id: 'subjects', label: 'Môn học', Icon: BookOpen,
          content: <SubjectsTab state={subjects} canManage={canManageStructure} onChanged={subjects.reload} notify={toast.show} />,
        },
        {
          id: 'programs', label: 'Chương trình', Icon: BookOpen,
          content: <EducationPlanningCatalogWorkspace mode="programs" years={years.data || []} classes={classes.data || []} subjects={subjects.data || []} teachers={teachers.data || []} canManage={canManageProgram} notify={toast.show} onChanged={refreshStructure} />,
        },
        {
          id: 'combinations', label: 'Tổ hợp môn', Icon: Layers3,
          content: <EducationPlanningCatalogWorkspace mode="combinations" years={years.data || []} classes={classes.data || []} subjects={subjects.data || []} teachers={teachers.data || []} canManage={canManageProgram} notify={toast.show} onChanged={refreshStructure} />,
        },
        {
          id: 'teacher-subjects', label: 'Chuyên môn GV', Icon: UserPlus,
          content: <EducationPlanningCatalogWorkspace mode="teacher-subjects" years={years.data || []} classes={classes.data || []} subjects={subjects.data || []} teachers={teachers.data || []} canManage={canManageProgram} notify={toast.show} onChanged={refreshStructure} />,
        },
        {
          id: 'plans', label: 'Kế hoạch giáo dục năm học', Icon: ClipboardList,
          content: (
            <PlansTab
              years={years.data || []}
              semesters={semesters.data || []}
              subjects={subjects.data || []}
              classes={classes.data || []}
              rooms={rooms.data || []}
              teachers={teachers.data || []}
              plans={plans.data || []}
              planSubjects={planSubjects}
              readiness={readiness}
              selectedYearId={selectedYearId}
              setSelectedYearId={setSelectedYearId}
              selectedGrade={selectedGrade}
              setSelectedGrade={setSelectedGrade}
              selectedPlanId={selectedPlanId}
              setSelectedPlanId={setSelectedPlanId}
              canManagePlan={canManagePlan}
              canManagePlanContent={canManagePlanContent}
              canManageExam={canManageExam}
              onChanged={refreshPlan}
              notify={toast.show}
            />
          ),
        },
        {
          id: 'rooms', label: 'Phòng học', Icon: DoorOpen,
          content: <RoomsTab state={rooms} canManage={canManageStructure} onChanged={rooms.reload} notify={toast.show} />,
        },
      ]} />
    </>
  );
}

type Notify = (type: 'ok' | 'err', message: string) => void;

function YearsTab({ state, semesters, selectedYearId, setSelectedYearId, canManage, onChanged, notify }: {
  state: ReturnType<typeof useApi<AcademicYear[]>>;
  semesters: Semester[];
  selectedYearId: string;
  setSelectedYearId: (id: string) => void;
  canManage: boolean; onChanged: () => void; notify: Notify;
}) {
  const [form, setForm] = useState({ code: '', name: '' });
  const submit = async () => {
    if (!form.code) return notify('err', 'Nhập mã năm học theo dạng 2028-2029.');
    try {
      await api.post('/academic-years', { ...form, name: form.name || `Năm học ${form.code}`, status: 'PLANNED' });
      setForm({ code: '', name: '' });
      notify('ok', 'Đã tạo năm học cùng Học kỳ 1 và Học kỳ 2, mỗi kỳ 5 tháng.');
      onChanged();
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const changeStatus = async (year: AcademicYear, status: string) => {
    try {
      await api.put(`/academic-years/${year.id}`, { ...year, status });
      notify('ok', status === 'ACTIVE' ? 'Đã kích hoạt năm học.' : 'Đã đóng năm học.');
      onChanged();
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const selectedYear = (state.data || []).find((year) => year.id === selectedYearId)
    || (state.data || []).find((year) => year.status === 'ACTIVE')
    || state.data?.[0];
  const selectedSemesters = semesters
    .filter((semester) => semester.academicYearId === selectedYear?.id)
    .sort((left, right) => left.sequence - right.sequence);
  return (
    <Section title="Năm học" subtitle="Tạo năm học sẽ tự sinh Học kỳ 1 và Học kỳ 2, mỗi kỳ 5 tháng" wide>
      {canManage && <div className="live-toolbar academic-create-bar">
        <input className="live-input" placeholder="2027-2028" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        <input className="live-input grow" placeholder="Tên năm học" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <button className="live-btn" onClick={submit}><Plus size={15} /> Tạo năm học</button>
      </div>}
      <Async paginate state={state} empty="Chưa có năm học" itemLabel="năm học">{(items) => (
        <table className="live-table academic-year-table"><thead><tr><th>Mã</th><th>Tên</th><th>Thời gian</th><th>Trạng thái</th><th /></tr></thead>
          <tbody>{items.map((year) => <tr key={year.id} className={selectedYear?.id === year.id ? 'is-selected' : ''}>
            <td><button className="academic-year-link" onClick={() => setSelectedYearId(year.id)}>{year.code}</button></td><td>{year.name}</td>
            <td>{fmtDate(year.startDate)} đến {fmtDate(year.endDate)}</td>
            <td><StatusPill value={year.status} /></td>
            <td className="academic-actions">{canManage && year.status !== 'ACTIVE' && <button className="live-btn small" onClick={() => changeStatus(year, 'ACTIVE')}>{year.status === 'CLOSED' ? 'Mở lại' : 'Kích hoạt'}</button>}{canManage && year.status === 'ACTIVE' && <button className="live-btn small ghost" onClick={() => changeStatus(year, 'CLOSED')}>Đóng năm học</button>}</td>
          </tr>)}</tbody>
        </table>
      )}</Async>
      {selectedYear && <div className="academic-semester-inline">
        <div className="academic-semester-inline-head">
          <div><strong>Hai học kỳ của {selectedYear.code}</strong><small>Bấm vào mã năm học phía trên để xem đúng hai học kỳ tương ứng.</small></div>
          <StatusPill value={selectedYear.status} />
        </div>
        <div className="academic-semester-cards">
          {selectedSemesters.map((semester) => <article key={semester.id}>
            <span>{semester.code}</span>
            <div><strong>{semester.name}</strong><small>{fmtDate(semester.startDate)} đến {fmtDate(semester.endDate)}</small></div>
            <StatusPill value={semester.status} />
          </article>)}
        </div>
      </div>}
    </Section>
  );
}

function GradesTab({ state, classes, years, selectedYearId, setSelectedYearId }: {
  state: ReturnType<typeof useApi<GradeLevel[]>>; classes: SchoolClass[];
  years: AcademicYear[]; selectedYearId: string; setSelectedYearId: (id: string) => void;
}) {
  return (
    <Section title="Khối học" subtitle="Ba khối THPT cố định, dùng chung cho lớp, kế hoạch và báo cáo" wide>
      <div className="live-toolbar"><select className="live-select" value={selectedYearId} onChange={(event) => setSelectedYearId(event.target.value)}>{years.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></div>
      <Async state={state} empty="Chưa có dữ liệu khối">{(items) => (
        <div className="academic-grade-grid">{items.map((grade) => {
          const gradeClasses = classes.filter((item) => item.academicYearId === selectedYearId && item.gradeLevel === grade.code);
          return <article key={grade.code}><span>{grade.code}</span><strong>{grade.name}</strong><small>{gradeClasses.length} lớp · {gradeClasses.reduce((sum, item) => sum + item.studentCount, 0)} học sinh</small></article>;
        })}</div>
      )}</Async>
    </Section>
  );
}

function ClassesTab(props: {
  years: AcademicYear[]; classes: SchoolClass[]; teachers: ApiUser[]; rooms: Room[];
  selectedYearId: string; setSelectedYearId: (id: string) => void;
  selectedGrade: string; setSelectedGrade: (grade: string) => void;
  selectedClassId: string; setSelectedClassId: (id: string) => void;
  classSearch: string; setClassSearch: (value: string) => void;
  enrollments: ReturnType<typeof useApi<AcademicEnrollment[]>>;
  candidates: ReturnType<typeof useApi<AcademicStudentCandidate[]>>;
  candidateSearch: string; setCandidateSearch: (value: string) => void;
  selectedStudents: string[]; setSelectedStudents: (ids: string[]) => void;
  enrollmentReason: string; setEnrollmentReason: (value: string) => void;
  canManageStructure: boolean; canManageEnrollment: boolean;
  onChanged: () => void; notify: Notify;
}) {
  const [form, setForm] = useState({ code: '', name: '', maxStudents: 45, homeroomTeacherId: '', homeRoomId: '' });
  const filtered = useMemo(() => props.classes.filter((item) => (
    item.academicYearId === props.selectedYearId
    && item.gradeLevel === props.selectedGrade
    && (!props.classSearch || `${item.code} ${item.name}`.toLowerCase().includes(props.classSearch.toLowerCase()))
  )), [props.classes, props.selectedYearId, props.selectedGrade, props.classSearch]);
  const selectedClass = props.classes.find((item) => item.id === props.selectedClassId);
  const createClass = async () => {
    if (!form.code || !props.selectedYearId) return props.notify('err', 'Nhập mã lớp và chọn năm học.');
    try {
      await api.post('/classes', {
        ...form, name: form.name || `Lớp ${form.code}`,
        gradeLevel: props.selectedGrade, academicYearId: props.selectedYearId,
        homeroomTeacherId: form.homeroomTeacherId || null,
        homeRoomId: form.homeRoomId || null,
      });
      setForm({ code: '', name: '', maxStudents: 45, homeroomTeacherId: '', homeRoomId: '' });
      props.notify('ok', 'Đã tạo lớp học.'); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const ensureDefaults = async () => {
    try {
      const result = await api.post<{ createdClasses: number }>(`/academic/high-school-defaults/ensure?academicYearId=${encodeURIComponent(props.selectedYearId)}`);
      props.notify('ok', `Đã bổ sung ${result.createdClasses} lớp còn thiếu.`); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const assignHomeroom = async (classId: string, teacherId: string) => {
    try {
      await api.put(`/classes/${classId}/homeroom-teacher`, { homeroomTeacherId: teacherId || null });
      props.notify('ok', 'Đã cập nhật giáo viên chủ nhiệm.'); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const assignHomeRoom = async (classId: string, homeRoomId: string) => {
    try {
      await api.put(`/classes/${classId}/home-room`, { homeRoomId });
      props.notify('ok', 'Đã cập nhật phòng học cố định của lớp.'); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const updateClassCapacity = async (schoolClass: SchoolClass, maxStudents: number) => {
    if (maxStudents < schoolClass.studentCount) {
      return props.notify('err', `Sĩ số tối đa không thể nhỏ hơn ${schoolClass.studentCount} học sinh đang có.`);
    }
    try {
      await api.put(`/classes/${schoolClass.id}`, {
        code: schoolClass.code, name: schoolClass.name, gradeLevel: schoolClass.gradeLevel,
        homeroomTeacherId: schoolClass.homeroomTeacherId || null,
        homeRoomId: schoolClass.homeRoomId || null, maxStudents,
      });
      props.notify('ok', `Đã cập nhật sĩ số tối đa lớp ${schoolClass.code}.`); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const availableHomeRooms = (classId?: string, requiredCapacity = 1) => props.rooms.filter((room) => (
    room.active !== false
    && (room.roomType || 'GENERAL').toUpperCase() === 'GENERAL'
    && (room.capacity || 0) >= requiredCapacity
    && !props.classes.some((schoolClass) => schoolClass.id !== classId && schoolClass.homeRoomId === room.id)
  ));
  const teacherConflict = (teacherId: string, classId?: string) => props.classes.find((schoolClass) => (
    schoolClass.academicYearId === props.selectedYearId
    && schoolClass.homeroomTeacherId === teacherId && schoolClass.id !== classId
  ));
  const assignStudents = async () => {
    if (!props.selectedStudents.length) return props.notify('err', 'Chọn ít nhất một học sinh.');
    if (props.enrollmentReason.trim().length < 5) return props.notify('err', 'Nhập lý do phân lớp ít nhất 5 ký tự.');
    try {
      await api.post('/academic/enrollments/bulk', {
        academicYearId: props.selectedYearId,
        classId: props.selectedClassId,
        studentIds: props.selectedStudents,
        reason: props.enrollmentReason,
      });
      props.notify('ok', `Đã phân lớp ${props.selectedStudents.length} học sinh.`); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const removeEnrollment = async (id: string) => {
    if (props.enrollmentReason.trim().length < 5) return props.notify('err', 'Nhập lý do bỏ phân lớp ít nhất 5 ký tự.');
    try {
      await api.del(`/academic/enrollments/${id}`, { reason: props.enrollmentReason });
      props.notify('ok', 'Đã bỏ học sinh khỏi lớp.'); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  return (
    <Section title="Lớp và phân lớp" subtitle="Lọc theo năm/khối, gán GVCN và quản lý danh sách học sinh" wide>
      <div className="live-toolbar academic-filter-bar">
        <select className="live-select" value={props.selectedYearId} onChange={(event) => props.setSelectedYearId(event.target.value)}>{props.years.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select>
        <select className="live-select" value={props.selectedGrade} onChange={(event) => props.setSelectedGrade(event.target.value)}>{GRADES.map((grade) => <option key={grade} value={grade}>Khối {grade.slice(1)}</option>)}</select>
        <label className="academic-search"><Search size={15} /><input value={props.classSearch} onChange={(event) => props.setClassSearch(event.target.value)} placeholder="Tìm mã hoặc tên lớp" /></label>
        {props.canManageStructure && <button className="live-btn ghost" onClick={ensureDefaults}><RotateCcw size={15} /> Bổ sung đủ 30 lớp</button>}
      </div>
      {props.canManageStructure && <div className="live-toolbar academic-create-bar">
        <input className="live-input" placeholder="10A1" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} />
        <input className="live-input grow" placeholder="Tên lớp" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <label className="field-stack"><span>Sĩ số tối đa</span><input className="live-input" type="number" min={1} max={100} value={form.maxStudents} onChange={(event) => setForm({ ...form, maxStudents: Number(event.target.value) })} /></label>
        <select className="live-select" value={form.homeroomTeacherId} onChange={(event) => setForm({ ...form, homeroomTeacherId: event.target.value })}><option value="">Chưa gán GVCN</option>{props.teachers.filter((teacher) => teacher.status === 'ACTIVE').map((teacher) => { const conflict = teacherConflict(teacher.id); return <option key={teacher.id} value={teacher.id} disabled={!!conflict}>{teacher.fullName}{conflict ? ` · đang chủ nhiệm ${conflict.code}` : ''}</option>; })}</select>
        <select className="live-select" value={form.homeRoomId} onChange={(event) => { const room = props.rooms.find((item) => item.id === event.target.value); setForm({ ...form, homeRoomId: event.target.value, maxStudents: room?.capacity || form.maxStudents }); }}><option value="">Tự tạo phòng đúng sức chứa lớp</option>{availableHomeRooms(undefined, form.maxStudents).map((room) => <option key={room.id} value={room.id}>{room.code} · {room.capacity} chỗ</option>)}</select>
        <button className="live-btn" onClick={createClass}><Plus size={15} /> Tạo lớp</button>
      </div>}
      <div className="academic-class-layout">
        <div className="academic-class-list">
          <PaginatedData items={filtered} itemLabel="lớp học" resetKey={`${props.selectedYearId}|${props.selectedGrade}|${props.classSearch}`}>
          {(pageItems) => <table className="live-table"><thead><tr><th>Lớp</th><th>Sĩ số</th><th>Phòng cố định</th><th>GVCN</th></tr></thead><tbody>
            {pageItems.map((item) => <tr key={item.id} className={props.selectedClassId === item.id ? 'selected' : ''} onClick={() => props.setSelectedClassId(item.id)}>
              <td><strong>{item.code}</strong><small>{item.name}</small></td>
              <td>{props.canManageStructure ? <span className="inline-capacity"><strong>{item.studentCount}/</strong><input aria-label={`Sĩ số tối đa lớp ${item.code}`} className="coefficient-input" type="number" min={item.studentCount || 1} max={100} defaultValue={item.maxStudents || item.studentCount} onClick={(event) => event.stopPropagation()} onBlur={(event) => { const value = Number(event.target.value); if (value !== item.maxStudents) updateClassCapacity(item, value); }} /></span> : `${item.studentCount}/${item.maxStudents || '—'}`}</td>
              <td>{props.canManageStructure ? <select className="live-select" value={item.homeRoomId || ''} onClick={(event) => event.stopPropagation()} onChange={(event) => assignHomeRoom(item.id, event.target.value)}>{availableHomeRooms(item.id, item.studentCount).map((room) => <option key={room.id} value={room.id}>{room.code} · {room.capacity} chỗ</option>)}</select> : props.rooms.find((room) => room.id === item.homeRoomId)?.code || 'Chưa gán'}</td>
              <td>{props.canManageStructure ? <select className="live-select" value={item.homeroomTeacherId || ''} onClick={(event) => event.stopPropagation()} onChange={(event) => assignHomeroom(item.id, event.target.value)}><option value="">Chưa gán</option>{props.teachers.filter((teacher) => teacher.status === 'ACTIVE').map((teacher) => { const conflict = teacherConflict(teacher.id, item.id); return <option key={teacher.id} value={teacher.id} disabled={!!conflict}>{teacher.fullName}{conflict ? ` · đang chủ nhiệm ${conflict.code}` : ''}</option>; })}</select> : props.teachers.find((teacher) => teacher.id === item.homeroomTeacherId)?.fullName || 'Chưa gán'}</td>
            </tr>)}
          </tbody></table>}
          </PaginatedData>
        </div>
        <div className="academic-roster">
          <header><div><strong>{selectedClass?.code || 'Chọn lớp'}</strong><small>{props.enrollments.data?.length || 0} học sinh đang học</small></div></header>
          <Async paginate state={props.enrollments} allowEmpty empty="Lớp chưa có học sinh" itemLabel="học sinh" resetKey={props.selectedClassId}>{(items) => (
            items.length ? <table className="live-table"><thead><tr><th>Học sinh</th><th>Mã</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{item.studentName}</td><td>{item.studentCode || '—'}</td><td>{props.canManageEnrollment && <button className="icon-action danger" title="Bỏ khỏi lớp" onClick={() => removeEnrollment(item.id)}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table> : <div className="empty-state"><strong>Lớp chưa có học sinh</strong></div>
          )}</Async>
          {props.canManageEnrollment && selectedClass && <div className="academic-enrollment-picker">
            <label className="academic-search"><Search size={15} /><input value={props.candidateSearch} onChange={(event) => props.setCandidateSearch(event.target.value)} placeholder="Tìm học sinh chưa phân lớp" /></label>
            <PaginatedData items={props.candidates.data || []} itemLabel="học sinh chưa phân lớp" resetKey={`${props.selectedClassId}|${props.candidateSearch}`}>{(pageItems) => <div className="academic-candidates">{pageItems.map((student) => <label key={student.id}><input type="checkbox" checked={props.selectedStudents.includes(student.id)} onChange={() => props.setSelectedStudents(props.selectedStudents.includes(student.id) ? props.selectedStudents.filter((id) => id !== student.id) : [...props.selectedStudents, student.id])} /><span>{student.fullName}<small>{student.studentCode || 'Chưa có mã'}</small></span></label>)}</div>}</PaginatedData>
            <div className="live-toolbar"><input className="live-input grow" value={props.enrollmentReason} onChange={(event) => props.setEnrollmentReason(event.target.value)} placeholder="Lý do phân lớp" /><button className="live-btn" onClick={assignStudents}><UserPlus size={15} /> Phân lớp ({props.selectedStudents.length})</button></div>
          </div>}
        </div>
      </div>
    </Section>
  );
}

function SubjectsTab({ state, canManage, onChanged, notify }: {
  state: ReturnType<typeof useApi<Subject[]>>; canManage: boolean;
  onChanged: () => void; notify: Notify;
}) {
  const [form, setForm] = useState({ code: '', name: '', coefficient: 1, requiredRoomType: 'GENERAL', subjectType: 'MANDATORY', departmentName: '', assessmentMethod: 'SCORE', facilityNote: '' });
  const submit = async () => {
    if (!form.code || !form.name) return notify('err', 'Nhập mã và tên môn học.');
    try {
      await api.post('/subjects', { ...form, active: true });
      setForm({ code: '', name: '', coefficient: 1, requiredRoomType: 'GENERAL', subjectType: 'MANDATORY', departmentName: '', assessmentMethod: 'SCORE', facilityNote: '' }); notify('ok', 'Đã thêm môn học.'); onChanged();
    } catch (error) { notify('err', errorMessage(error)); }
  };
  const update = async (subject: Subject, patch: Partial<Subject>) => {
    try {
      await api.put(`/subjects/${subject.id}`, { ...subject, ...patch });
      notify('ok', 'Đã cập nhật môn học.'); onChanged();
    } catch (error) { notify('err', errorMessage(error)); }
  };
  return (
    <Section title="Môn học" subtitle="Danh mục môn dùng cho phân công, kế hoạch, lịch và kết quả" wide>
      {canManage && <div className="live-toolbar"><input className="live-input" placeholder="MATH" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><input className="live-input grow" placeholder="Tên môn" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><select className="live-select" value={form.subjectType} onChange={(event) => setForm({ ...form, subjectType: event.target.value })}><option value="MANDATORY">Bắt buộc</option><option value="OPTIONAL">Lựa chọn</option><option value="SPECIALIZED">Chuyên đề</option><option value="EDUCATIONAL_ACTIVITY">Hoạt động</option></select><input className="live-input" placeholder="Tổ chuyên môn" value={form.departmentName} onChange={(event) => setForm({ ...form, departmentName: event.target.value })} /><select className="live-select" value={form.requiredRoomType} onChange={(event) => setForm({ ...form, requiredRoomType: event.target.value })}><option value="GENERAL">Phòng thường</option><option value="LAB">Phòng thí nghiệm</option><option value="COMPUTER">Phòng máy tính</option><option value="GYM">Nhà thể chất</option></select><button className="live-btn" onClick={submit}><Plus size={15} /> Thêm môn</button></div>}
      <Async paginate state={state} empty="Chưa có môn học" itemLabel="môn học">{(items) => <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Loại môn</th><th>Tổ chuyên môn</th><th>Đánh giá</th><th>Loại phòng</th><th>Trạng thái</th><th /></tr></thead><tbody>{items.map((subject) => <tr key={subject.id}><td><strong>{subject.code}</strong></td><td>{subject.name}</td><td>{canManage ? <select className="live-select" value={subject.subjectType || 'MANDATORY'} onChange={(event) => update(subject, { subjectType: event.target.value as Subject['subjectType'] })}><option value="MANDATORY">Bắt buộc</option><option value="OPTIONAL">Lựa chọn</option><option value="SPECIALIZED">Chuyên đề</option><option value="EDUCATIONAL_ACTIVITY">Hoạt động</option></select> : subject.subjectType}</td><td>{canManage ? <input className="live-input" defaultValue={subject.departmentName || ''} onBlur={(event) => update(subject, { departmentName: event.target.value })} /> : subject.departmentName || '—'}</td><td>{subject.assessmentMethod === 'COMMENT' ? 'Nhận xét' : 'Điểm số'}</td><td>{canManage ? <select className="live-select" value={subject.requiredRoomType || 'GENERAL'} onChange={(event) => update(subject, { requiredRoomType: event.target.value })}><option value="GENERAL">Phòng thường</option><option value="LAB">Phòng thí nghiệm</option><option value="COMPUTER">Phòng máy tính</option><option value="GYM">Nhà thể chất</option></select> : subject.requiredRoomType || 'GENERAL'}</td><td>{subject.active ? 'Đang dùng' : 'Ngừng dùng'}</td><td>{canManage && <button className="live-btn small ghost" onClick={() => update(subject, { active: !subject.active })}>{subject.active ? 'Ngừng dùng' : 'Kích hoạt'}</button>}</td></tr>)}</tbody></table>}</Async>
    </Section>
  );
}

function PlansTab(props: {
  years: AcademicYear[]; semesters: Semester[]; subjects: Subject[]; classes: SchoolClass[]; rooms: Room[];
  teachers: ApiUser[]; plans: AcademicTrainingPlan[];
  planSubjects: ReturnType<typeof useApi<AcademicTrainingPlanSubject[]>>;
  readiness: ReturnType<typeof useApi<AcademicPlanReadiness>>;
  selectedYearId: string; setSelectedYearId: (id: string) => void;
  selectedGrade: string; setSelectedGrade: (grade: string) => void;
  selectedPlanId: string; setSelectedPlanId: (id: string) => void;
  canManagePlan: boolean; canManagePlanContent: boolean; canManageExam: boolean;
  onChanged: () => void; notify: Notify;
}) {
  const confirmAction = useConfirm();
  const programs = useApi<EducationProgram[]>('/academic/education-planning/programs');
  const currentPlan = props.plans.find((item) => item.id === props.selectedPlanId);
  const planValidation = useApi<AcademicPlanValidationReport>(currentPlan
    ? `/academic/training-plans/${currentPlan.id}/validation` : null);
  const editablePlan = currentPlan?.status === 'DRAFT' || currentPlan?.status === 'REVISION_REQUIRED';
  const planVersions = props.plans
    .filter((item) => item.academicYearId === props.selectedYearId
      && item.gradeLevel === props.selectedGrade)
    .sort((left, right) => right.versionNumber - left.versionNumber);
  const planSemesters = props.semesters.filter((item) => item.academicYearId === props.selectedYearId).sort((a, b) => a.sequence - b.sequence);
  const [planName, setPlanName] = useState('');
  const [programId, setProgramId] = useState('');
  const [description, setDescription] = useState('');
  const [maxGap, setMaxGap] = useState(2);
  const [subjectForm, setSubjectForm] = useState({ semesterId: '', subjectId: '', weeklyPeriods: 2, totalPeriods: 35, startDate: '', endDate: '', examRequired: true });
  const [editingSubjectId, setEditingSubjectId] = useState('');
  const [planSection, setPlanSection] = useState<PlanSection>('overview');
  const currentPlanSubjects = (props.planSubjects.data || []).filter(
    (item) => item.planId === currentPlan?.id,
  );
  const instructionalPlanSubjects = currentPlanSubjects.filter((row) =>
    props.subjects.find((subject) => subject.id === row.subjectId)?.subjectType !== 'EDUCATIONAL_ACTIVITY');
  const instructionalSubjectCount = new Set(
    instructionalPlanSubjects.map((row) => row.subjectId),
  ).size;
  useEffect(() => setPlanSection('overview'), [currentPlan?.id]);
  useEffect(() => {
    if (currentPlan) {
      setPlanName(currentPlan.name);
      setMaxGap(currentPlan.maxProgressGapDays);
      setProgramId(currentPlan.programId || '');
      setDescription(currentPlan.description || '');
    } else if (!programId && programs.data?.length) {
      setProgramId(programs.data.find((item) => item.status === 'ACTIVE')?.id || programs.data[0].id);
    }
  }, [currentPlan, programId, programs.data]);
  useEffect(() => {
    if (currentPlan) return;
    setPlanName(`Kế hoạch ${props.selectedGrade}`);
    setDescription('');
    setMaxGap(2);
  }, [currentPlan, props.selectedGrade, props.selectedYearId]);
  useEffect(() => {
    const semester = planSemesters[0];
    if (!semester) return;
    setSubjectForm((current) => current.semesterId ? current : ({ ...current, semesterId: semester.id, startDate: semester.startDate || '', endDate: semester.endDate || '' }));
  }, [planSemesters]);
  const createPlan = async () => {
    const selectedProgram = programs.data?.find((item) => item.id === programId);
    if (!selectedProgram || selectedProgram.status !== 'ACTIVE') {
      return props.notify('err', 'Chọn chương trình ở trạng thái Đang áp dụng. Chương trình bản nháp vẫn hiển thị để bạn biết cần hoàn thiện và áp dụng trước.');
    }
    try {
      await api.post('/academic/training-plans', { academicYearId: props.selectedYearId, gradeLevel: props.selectedGrade, name: planName || `Kế hoạch ${props.selectedGrade}`, maxProgressGapDays: maxGap, programId, description });
      props.notify('ok', 'Đã tạo kế hoạch giáo dục năm học ở trạng thái nháp.'); props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const savePlan = async () => {
    if (!currentPlan) return;
    try { await api.put(`/academic/training-plans/${currentPlan.id}`, { name: planName, maxProgressGapDays: maxGap, programId, description }); props.notify('ok', 'Đã lưu kế hoạch.'); props.onChanged(); }
    catch (error) { props.notify('err', errorMessage(error)); }
  };
  const createVersion = async () => {
    if (!currentPlan) return;
    try {
      const created = await api.post<AcademicTrainingPlan>(
        `/academic/training-plans/${currentPlan.id}/versions`,
        { name: currentPlan.name },
      );
      props.notify('ok', `Đã tạo phiên bản ${created.versionNumber} ở trạng thái nháp.`);
      props.setSelectedPlanId(created.id);
      props.onChanged();
    } catch (error) { props.notify('err', errorMessage(error)); }
  };
  const addPlanSubject = async () => {
    if (!currentPlan || !subjectForm.semesterId || !subjectForm.subjectId || !subjectForm.startDate || !subjectForm.endDate) return props.notify('err', 'Nhập đủ học kỳ, môn và thời gian môn học.');
    try {
      if (editingSubjectId) await api.put(`/academic/training-plans/${currentPlan.id}/subjects/${editingSubjectId}`, subjectForm);
      else await api.post(`/academic/training-plans/${currentPlan.id}/subjects`, subjectForm);
      props.notify('ok', editingSubjectId ? 'Đã cập nhật môn trong kế hoạch.' : 'Đã thêm môn vào kế hoạch.');
      setEditingSubjectId(''); planValidation.reload(); props.onChanged();
    }
    catch (error) { props.notify('err', errorMessage(error)); }
  };
  const editPlanSubject = (row: AcademicTrainingPlanSubject) => {
    setEditingSubjectId(row.id);
    setSubjectForm({ semesterId: row.semesterId, subjectId: row.subjectId,
      weeklyPeriods: row.weeklyPeriods, totalPeriods: row.totalPeriods,
      startDate: row.startDate, endDate: row.endDate, examRequired: row.examRequired });
  };
  const deletePlanSubject = async (id: string) => {
    if (!currentPlan) return;
    if (!(await confirmAction({ title: 'Xóa môn khỏi kế hoạch', message: 'Toàn bộ giai đoạn, bài học, phân phối tuần và kế hoạch đánh giá liên quan cũng sẽ bị xóa.', confirmLabel: 'Xóa môn', tone: 'danger' }))) return;
    try { await api.del(`/academic/training-plans/${currentPlan.id}/subjects/${id}`); props.notify('ok', 'Đã xóa môn khỏi kế hoạch.'); planValidation.reload(); props.onChanged(); }
    catch (error) { props.notify('err', errorMessage(error)); }
  };
  const stepStatus = (step: number) => {
    const codes: Record<number, string[]> = {
      1: ['PROGRAM', 'SEMESTERS', 'REQUIRED_SUBJECT', 'PERIOD_TOTAL', 'OUTSIDE_PROGRAM', 'CLASS_COMBINATION', 'TEACHER_ASSIGNMENT', 'ASSIGNMENT_PERIODS', 'TEACHER_CAPABILITY', 'CLASSES', 'WEEKLY_RATE'],
      2: ['STAGE_PERIODS', 'LESSON_PERIODS', 'BUFFER_WEEK'],
      3: ['WEEKLY_DISTRIBUTION'],
      4: ['ASSESSMENT', 'ASSESSMENT_CONTENT', 'ASSESSMENT_SEQUENCE'],
      5: [],
    };
    const issues = (planValidation.data?.issues || []).filter((item) => step === 5
      ? false : codes[step].includes(item.code));
    if (issues.some((item) => item.level === 'ERROR')) return { kind: 'error', label: 'Có lỗi bắt buộc', icon: <AlertTriangle size={14} /> };
    if (issues.length) return { kind: 'warning', label: 'Còn cảnh báo', icon: <AlertTriangle size={14} /> };
    if (step === 5 && !planValidation.data?.valid) return { kind: 'pending', label: 'Chưa thể gửi duyệt', icon: <Circle size={14} /> };
    if (step === 1 && !instructionalPlanSubjects.length) return { kind: 'pending', label: 'Chưa thực hiện', icon: <Circle size={14} /> };
    return { kind: 'complete', label: 'Đã hoàn thành', icon: <CheckCircle2 size={14} /> };
  };
  return (
    <Section title="Kế hoạch giáo dục năm học" subtitle="Chương trình, môn học, số tiết, phân phối theo tuần và quy trình phê duyệt" wide>
      <div className="live-toolbar academic-filter-bar">
        <select className="live-select" value={props.selectedYearId} onChange={(event) => props.setSelectedYearId(event.target.value)}>{props.years.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select>
        <select className="live-select" value={props.selectedGrade} onChange={(event) => props.setSelectedGrade(event.target.value)}>{GRADES.map((grade) => <option key={grade} value={grade}>Khối {grade.slice(1)}</option>)}</select>
        <select className="live-select grow" value={programId} disabled={!editablePlan && !!currentPlan} onChange={(event) => setProgramId(event.target.value)}><option value="">Chọn chương trình</option>{(programs.data || []).map((item) => <option key={item.id} value={item.id} disabled={!currentPlan && item.status !== 'ACTIVE'}>{item.code} · {item.name} · {item.status === 'ACTIVE' ? 'Đang áp dụng' : item.status === 'DRAFT' ? 'Bản nháp — cần áp dụng trước' : 'Đã lưu trữ'}</option>)}</select>
        {!!planVersions.length && <select className="live-select" value={props.selectedPlanId} onChange={(event) => { setPlanSection('overview'); props.setSelectedPlanId(event.target.value); }}>
          {planVersions.map((plan) => <option key={plan.id} value={plan.id}>Phiên bản {plan.versionNumber} · {{ DRAFT: 'Nháp', SUBMITTED: 'Chờ kiểm tra', REVISION_REQUIRED: 'Yêu cầu sửa', APPROVED: 'Đã phê duyệt', PUBLISHED: 'Đang áp dụng', ARCHIVED: 'Đã lưu trữ', LOCKED: 'Đã khóa' }[plan.status]}</option>)}
        </select>}
        <input className="live-input grow" value={planName} onChange={(event) => setPlanName(event.target.value)} placeholder={`Kế hoạch ${props.selectedGrade}`} />
        {!currentPlan && props.canManagePlan && <button className="live-btn" onClick={createPlan}><Plus size={15} /> Tạo kế hoạch</button>}
        {editablePlan && props.canManagePlan && <button className="live-btn ghost" onClick={savePlan}><Save size={15} /> Lưu thông tin</button>}
        {currentPlan && ['PUBLISHED', 'ARCHIVED', 'LOCKED'].includes(currentPlan.status) && props.canManagePlan && <button className="live-btn ghost" onClick={createVersion}><Plus size={15} /> Tạo phiên bản điều chỉnh</button>}
      </div>
      {(!currentPlan || editablePlan) && <textarea className="live-input planning-description" rows={2} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả mục tiêu, phạm vi và lưu ý của kế hoạch" />}
      {!currentPlan ? <div className="empty-state"><strong>Khối này chưa có kế hoạch giáo dục năm học</strong></div> : <>
        <div className="academic-readiness">
          <StatusPill value={currentPlan.status} />
          <strong>Phiên bản {currentPlan.versionNumber}</strong>
          <span>{['PUBLISHED', 'LOCKED', 'ARCHIVED'].includes(currentPlan.status)
            ? 'Phiên bản này chỉ đọc; tạo phiên bản điều chỉnh để thay đổi.'
            : 'Kết luận đủ điều kiện được hiển thị tại mục Kiểm tra và phê duyệt bên dưới.'}</span>
        </div>
        <div className="plan-step-tabs" role="tablist" aria-label="Các bước lập kế hoạch giáo dục năm học">
          {([['overview', 'Tổng quan và môn học', <BookOpen size={16} />], ['curriculum', 'Nội dung môn học', <Layers3 size={16} />], ['distribution', 'Phân phối theo tuần', <CalendarDays size={16} />], ['assessment', 'Kiểm tra và đánh giá', <ClipboardList size={16} />], ['approval', 'Duyệt và công bố', <CheckCircle2 size={16} />]] as const).map(([key, label, icon], index) => { const state = stepStatus(index + 1); return <button key={key} className={`${planSection === key ? 'active' : ''} step-${state.kind}`} onClick={() => setPlanSection(key)}>{icon}<span><small>Bước {index + 1}</small>{label}<em>{state.icon}{state.label}</em></span>{index === 0 && <b>{instructionalSubjectCount} môn</b>}</button>; })}
        </div>
        {planSection === 'overview' && <>
        <h3 className="academic-subheading">Môn học và thời lượng</h3>
        {editablePlan && props.canManagePlanContent && <div className="planning-editor labeled-form-grid">
          <label className="field-stack"><span>Học kỳ</span><select className="live-select" value={subjectForm.semesterId} onChange={(event) => {
            const semester = planSemesters.find((item) => item.id === event.target.value);
            setSubjectForm({ ...subjectForm, semesterId: event.target.value, startDate: semester?.startDate || '', endDate: semester?.endDate || '' });
          }}>{planSemesters.map((semester) => <option key={semester.id} value={semester.id}>{semester.code}</option>)}</select></label>
          <label className="field-stack grow"><span>Môn học</span><select className="live-select" value={subjectForm.subjectId} onChange={(event) => setSubjectForm({ ...subjectForm, subjectId: event.target.value })}><option value="">Chọn môn</option>{props.subjects.filter((item) => item.active && item.subjectType !== 'EDUCATIONAL_ACTIVITY').map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}</select></label>
          <label className="field-stack"><span>Số tiết mỗi tuần</span><input className="live-input" type="number" min={1} max={20} value={subjectForm.weeklyPeriods} onChange={(event) => setSubjectForm({ ...subjectForm, weeklyPeriods: Number(event.target.value) })} /></label>
          <label className="field-stack"><span>Tổng số tiết học kỳ</span><input className="live-input" type="number" min={1} max={300} value={subjectForm.totalPeriods} onChange={(event) => setSubjectForm({ ...subjectForm, totalPeriods: Number(event.target.value) })} /></label>
          <label className="field-stack"><span>Ngày bắt đầu</span><input className="live-input" type="date" value={subjectForm.startDate} onChange={(event) => setSubjectForm({ ...subjectForm, startDate: event.target.value })} /><small>{subjectForm.startDate ? fmtDate(subjectForm.startDate) : 'dd/MM/yyyy'}</small></label>
          <label className="field-stack"><span>Ngày kết thúc</span><input className="live-input" type="date" value={subjectForm.endDate} onChange={(event) => setSubjectForm({ ...subjectForm, endDate: event.target.value })} /><small>{subjectForm.endDate ? fmtDate(subjectForm.endDate) : 'dd/MM/yyyy'}</small></label>
          <label className="academic-check"><input type="checkbox" checked={subjectForm.examRequired} onChange={(event) => setSubjectForm({ ...subjectForm, examRequired: event.target.checked })} /> Có đánh giá định kỳ</label>
          <div className="live-toolbar form-actions"><button className="live-btn" onClick={addPlanSubject}>{editingSubjectId ? <Save size={15} /> : <Plus size={15} />} {editingSubjectId ? 'Lưu chỉnh sửa' : 'Thêm môn'}</button>{editingSubjectId && <button className="live-btn ghost" onClick={() => setEditingSubjectId('')}><X size={15} /> Hủy sửa</button>}</div>
        </div>}
        {instructionalPlanSubjects.length ? <PaginatedData items={instructionalPlanSubjects} itemLabel="môn trong kế hoạch" resetKey={currentPlan?.id}>{(items) => <table className="live-table"><thead><tr><th>Học kỳ</th><th>Môn</th><th>Tiết/tuần</th><th>Tổng tiết</th><th>Thời gian</th><th>Đánh giá định kỳ</th><th /></tr></thead><tbody>{items.map((row) => <tr key={row.id}><td>{planSemesters.find((semester) => semester.id === row.semesterId)?.code}</td><td><strong>{props.subjects.find((subject) => subject.id === row.subjectId)?.name || row.subjectId}</strong></td><td>{row.weeklyPeriods}</td><td>{row.totalPeriods}</td><td>{fmtDate(row.startDate)} đến {fmtDate(row.endDate)}</td><td>{row.examRequired ? 'Có' : 'Không'}</td><td>{editablePlan && props.canManagePlanContent && <div className="table-row-actions"><button className="icon-action" title="Chỉnh sửa" onClick={() => editPlanSubject(row)}><Pencil size={15} /></button><button className="icon-action danger" title="Xóa khỏi kế hoạch" onClick={() => deletePlanSubject(row.id)}><Trash2 size={15} /></button></div>}</td></tr>)}</tbody></table>}</PaginatedData> : <div className="empty-state"><strong>Chưa cấu hình môn học</strong><span>Bấm “Đồng bộ từ chương trình” bên dưới để tạo đủ môn cho cả hai học kỳ.</span></div>}
        <EducationPlanCompletionPanel plan={currentPlan} planSubjects={instructionalPlanSubjects}
          section="overview"
          semesters={planSemesters} subjects={props.subjects} classes={props.classes}
          teachers={props.teachers} notify={props.notify} onNavigate={setPlanSection}
          onChanged={() => { planValidation.reload(); props.onChanged(); }} />
        </>}
        {planSection === 'curriculum' && (instructionalPlanSubjects.length
          ? <TrainingPlanCurriculum plan={currentPlan} semesters={planSemesters} subjects={props.subjects} canManage={props.canManagePlanContent} notify={props.notify} onChanged={props.onChanged} />
          : <div className="empty-state"><strong>Chưa có môn để nhập nội dung</strong><span>Hoàn thành bước 1 trước.</span></div>)}
        {(['distribution', 'assessment', 'approval'] as PlanSection[]).includes(planSection) && <EducationPlanCompletionPanel plan={currentPlan} planSubjects={instructionalPlanSubjects}
          section={planSection as 'distribution' | 'assessment' | 'approval'}
          semesters={planSemesters} subjects={props.subjects} classes={props.classes}
          teachers={props.teachers} notify={props.notify} onNavigate={setPlanSection}
          onChanged={() => { planValidation.reload(); props.onChanged(); }} />}
      </>}
    </Section>
  );
}

function RoomsTab({ state, canManage, onChanged, notify }: {
  state: ReturnType<typeof useApi<Room[]>>; canManage: boolean;
  onChanged: () => void; notify: Notify;
}) {
  const [form, setForm] = useState({ code: '', name: '', capacity: 45, roomType: 'GENERAL' });
  const submit = async () => {
    if (!form.code) return notify('err', 'Nhập mã phòng học.');
    try { await api.post('/rooms', { ...form, active: true }); setForm({ code: '', name: '', capacity: 45, roomType: 'GENERAL' }); notify('ok', 'Đã thêm phòng học.'); onChanged(); }
    catch (error) { notify('err', errorMessage(error)); }
  };
  const toggle = async (room: Room & { active?: boolean }) => {
    try { await api.put(`/rooms/${room.id}`, { ...room, active: room.active === false }); notify('ok', 'Đã cập nhật trạng thái phòng.'); onChanged(); }
    catch (error) { notify('err', errorMessage(error)); }
  };
  const updateCapacity = async (room: Room, capacity: number) => {
    try { await api.put(`/rooms/${room.id}`, { ...room, capacity }); notify('ok', `Đã cập nhật sức chứa phòng ${room.code}.`); onChanged(); }
    catch (error) { notify('err', errorMessage(error)); }
  };
  return (
    <Section title="Phòng học" subtitle="Phòng dùng cho thời khóa biểu và lịch thi" wide>
      {canManage && <div className="live-toolbar"><input className="live-input" placeholder="P201" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} /><input className="live-input grow" placeholder="Tên phòng" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><label className="field-stack"><span>Sức chứa tối đa</span><input className="live-input" type="number" min={1} max={500} value={form.capacity} onChange={(event) => setForm({ ...form, capacity: Number(event.target.value) })} /></label><select className="live-select" value={form.roomType} onChange={(event) => setForm({ ...form, roomType: event.target.value })}><option value="GENERAL">Phòng thường</option><option value="LAB">Phòng thí nghiệm</option><option value="COMPUTER">Phòng máy tính</option><option value="GYM">Nhà thể chất</option><option value="MUSIC">Phòng âm nhạc</option><option value="ART">Phòng mỹ thuật</option></select><button className="live-btn" onClick={submit}><Plus size={15} /> Thêm phòng</button></div>}
      <Async paginate state={state} empty="Chưa có phòng học" itemLabel="phòng học">{(items) => <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Loại phòng</th><th>Sức chứa tối đa</th><th>Trạng thái</th><th /></tr></thead><tbody>{items.map((room) => <tr key={room.id}><td><strong>{room.code}</strong></td><td>{room.name}</td><td>{room.roomType || 'GENERAL'}</td><td>{canManage ? <input aria-label={`Sức chứa phòng ${room.code}`} className="coefficient-input" type="number" min={1} max={500} defaultValue={room.capacity || 1} onBlur={(event) => { const value = Number(event.target.value); if (value !== room.capacity) updateCapacity(room, value); }} /> : room.capacity || '—'}</td><td>{(room as Room & { active?: boolean }).active === false ? 'Ngừng dùng' : 'Đang dùng'}</td><td>{canManage && <button className="live-btn small ghost" onClick={() => toggle(room)}>{(room as Room & { active?: boolean }).active === false ? 'Kích hoạt' : 'Ngừng dùng'}</button>}</td></tr>)}</tbody></table>}</Async>
    </Section>
  );
}

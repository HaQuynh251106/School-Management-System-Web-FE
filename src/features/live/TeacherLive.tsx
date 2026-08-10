import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, BellRing, CalendarCheck2, CalendarDays, CheckCircle2, Clock3, Eye, GraduationCap, IdCard, LockKeyhole, Mail, MapPin, Megaphone, Phone, RefreshCw, RotateCcw, Search, Send, ShieldCheck, Trophy, UserCheck, UserRound, Users, UsersRound, UserX } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { AcademicTrainingPlan, AcademicYear, Announcement, AnnualSubjectSummary, ApiUser, AttendanceRecord, SchoolClass, Semester, ExamCategory, GradeConfiguration, TimetableSlot, Grade, TeacherAnnouncementScope, TeachingAssignment } from '../../api/types';
import { AttendanceExcusePanel } from './AttendanceExcusePanel';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, useToast, DAY_LABEL, fmtDate, fmtDateTime, PaginatedData } from './common';
import { Modal } from './Modal';
import { formatScore, gradeColumns, gradeKey, scoreTone, weightedAverage } from './gradebook';
import { YearSummaryPreviewWorkspace } from './YearSummaryPreviewWorkspace';
import { YearReviewWorkspace } from './YearReviewWorkspace';
import { useConfirm } from '../../app/ConfirmDialog';

const TODAY = new Date().toISOString().slice(0, 10);
const ATT_STATES = ['PRESENT', 'LATE', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED'];

/* ===== B1 — Lớp được phân công ===== */
export function TeacherClassesLive() {
  const { user } = useAuth();
  const teachingAssignments = useApi<TeachingAssignment[]>('/me/teacher-class-subjects');
  const classesApi = useApi<SchoolClass[]>('/classes');
  const trainingPlans = useApi<AcademicTrainingPlan[]>('/academic/training-plans');
  const [classId, setClassId] = useState('');
  const [profileTarget, setProfileTarget] = useState<{ classId: string; studentId: string } | null>(null);
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);
  const studentProfile = useApi<ApiUser>(profileTarget
    ? `/classes/${encodeURIComponent(profileTarget.classId)}/students/${encodeURIComponent(profileTarget.studentId)}/profile`
    : null);

  const classMap = useMemo(() => {
    const m: Record<string, SchoolClass> = {};
    (classesApi.data || []).forEach((c) => (m[c.id] = c));
    return m;
  }, [classesApi.data]);

  const groups = useMemo(() => {
    const g: Record<string, { classId: string; subjects: Set<string>; count: number }> = {};
    (teachingAssignments.data || []).forEach((assignment) => {
      g[assignment.classId] = g[assignment.classId] || { classId: assignment.classId, subjects: new Set(), count: 0 };
      g[assignment.classId].subjects.add(assignment.subjectName || assignment.subjectId);
      g[assignment.classId].count += assignment.weeklyPeriods ?? 1;
    });
    (classesApi.data || [])
      .filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id)
      .forEach((schoolClass) => {
        g[schoolClass.id] = g[schoolClass.id] || { classId: schoolClass.id, subjects: new Set(), count: 0 };
      });
    return Object.values(g).sort((a, b) => (classMap[a.classId]?.code || a.classId).localeCompare(classMap[b.classId]?.code || b.classId, 'vi'));
  }, [classMap, classesApi.data, teachingAssignments.data, user?.id]);

  const homeroomClasses = useMemo(
    () => (classesApi.data || []).filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id),
    [classesApi.data, user?.id],
  );
  const selectedClass = classId ? classMap[classId] : undefined;
  const selectedTrainingPlan = useMemo(() => (trainingPlans.data || [])
    .filter((plan) => plan.academicYearId === selectedClass?.academicYearId
      && plan.gradeLevel === selectedClass?.gradeLevel
      && ['PUBLISHED', 'LOCKED'].includes(plan.status))
    .sort((left, right) => right.versionNumber - left.versionNumber)[0],
  [selectedClass?.academicYearId, selectedClass?.gradeLevel, trainingPlans.data]);
  const trainingPlanSummary = useApi<AnnualSubjectSummary[]>(selectedTrainingPlan
    ? `/academic/training-plans/${selectedTrainingPlan.id}/annual-summary` : null);
  const assignedSubjectIds = useMemo(() => new Set((teachingAssignments.data || [])
    .filter((assignment) => assignment.classId === classId)
    .map((assignment) => assignment.subjectId)), [classId, teachingAssignments.data]);
  const selectedIsHomeroom = selectedClass?.homeroomTeacherId === user?.id;
  const profileClass = profileTarget ? classMap[profileTarget.classId] : undefined;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
    <YearSummaryPreviewWorkspace teacherId={user?.id} />
    <YearReviewWorkspace />
    <Section title="Lớp giảng dạy và chủ nhiệm" subtitle="Theo dõi lớp phụ trách, danh sách học sinh và hồ sơ lớp chủ nhiệm" wide>
      {homeroomClasses.length > 0 && (
        <div className="homeroom-overview">
          <div className="homeroom-overview-head">
            <span className="homeroom-overview-icon"><ShieldCheck size={21} /></span>
            <div><strong>Lớp chủ nhiệm</strong><small>Thầy cô có quyền xem hồ sơ chi tiết của học sinh trong các lớp này.</small></div>
            <span className="homeroom-count">{homeroomClasses.length} lớp</span>
          </div>
          <div className="homeroom-class-grid">
            {homeroomClasses.map((schoolClass) => (
              <button
                type="button"
                key={schoolClass.id}
                className={`homeroom-class-option ${classId === schoolClass.id ? 'active' : ''}`}
                onClick={() => setClassId(schoolClass.id)}
              >
                <span><GraduationCap size={20} /></span>
                <div><strong>{schoolClass.code}</strong><small>{schoolClass.name || `Lớp ${schoolClass.code}`}</small></div>
                <b>{schoolClass.studentCount || 0} học sinh</b>
              </button>
            ))}
          </div>
        </div>
      )}
      <Async paginate state={{ data: groups, loading: teachingAssignments.loading || classesApi.loading, error: teachingAssignments.error || classesApi.error }} empty="Chưa được phân công lớp nào" itemLabel="lớp phụ trách">
        {(assignedGroups) => (
          <div className="teacher-class-table-wrap">
            <table className="live-table">
              <thead><tr><th>Lớp</th><th>Vai trò</th><th>Môn dạy</th><th>Số tiết/tuần</th><th></th></tr></thead>
              <tbody>
                {assignedGroups.map((g) => {
                  const isHomeroom = classMap[g.classId]?.homeroomTeacherId === user?.id;
                  return (
                    <tr key={g.classId} className={classId === g.classId ? 'teacher-class-row-active' : ''}>
                      <td><strong>{classMap[g.classId]?.code || g.classId}</strong></td>
                      <td><span className={`teacher-class-role ${isHomeroom ? 'homeroom' : ''}`}>{isHomeroom ? 'Giáo viên chủ nhiệm' : 'Giáo viên bộ môn'}</span></td>
                      <td>{[...g.subjects].join(', ') || '—'}</td>
                      <td>{g.count || '—'}</td>
                      <td><button className="live-btn subtle" onClick={() => setClassId(g.classId)}><Users size={14} /> Xem học sinh</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Async>
      {classId && (
        <div className="teacher-student-list">
          <div className="teacher-student-list-head">
            <div><span>Danh sách học sinh</span><strong>Lớp {selectedClass?.code || classId}</strong></div>
            {selectedIsHomeroom
              ? <p><ShieldCheck size={16} /> Lớp chủ nhiệm · Được xem hồ sơ chi tiết</p>
              : <p className="limited"><LockKeyhole size={16} /> Lớp bộ môn · Chỉ xem danh sách cơ bản</p>}
          </div>
          <Async paginate state={students} empty="Lớp chưa có học sinh" itemLabel="học sinh">
            {(l) => (
              <div className="teacher-class-table-wrap">
                <table className="live-table"><thead><tr><th>STT</th><th>Mã học sinh</th><th>Họ và tên</th><th>Lớp</th><th></th></tr></thead>
                  <tbody>{l.map((student, index) => <tr key={student.id}>
                    <td>{index + 1}</td><td>{student.studentCode || '—'}</td><td><strong>{student.fullName}</strong></td><td>{student.className || selectedClass?.code || '—'}</td>
                    <td>{selectedIsHomeroom
                      ? <button className="live-btn subtle" onClick={() => setProfileTarget({ classId, studentId: student.id })}><Eye size={15} /> Xem hồ sơ</button>
                      : <span className="teacher-profile-locked"><LockKeyhole size={14} /> Chỉ giáo viên chủ nhiệm</span>}</td>
                  </tr>)}</tbody></table>
              </div>
            )}
          </Async>
        </div>
      )}
      {classId && <div className="teacher-published-plan">
        <div className="teacher-published-plan-head">
          <div><span>Kế hoạch giáo dục đã công bố</span><strong>{selectedTrainingPlan?.name || `Lớp ${selectedClass?.code || classId}`}</strong></div>
          {selectedTrainingPlan && <StatusPill value={selectedTrainingPlan.status} />}
        </div>
        {!selectedTrainingPlan
          ? <div className="empty-state"><strong>Khối này chưa có kế hoạch được công bố</strong></div>
          : <Async state={trainingPlanSummary} allowEmpty empty="Kế hoạch chưa có môn học">{(rows) => {
            const visibleRows = rows.filter((row) => assignedSubjectIds.has(row.subjectId));
            return visibleRows.length ? <div className="teacher-plan-subject-grid">{visibleRows.map((row) => <article key={row.subjectId}><div><strong>{row.subjectName}</strong><small>Phiên bản {selectedTrainingPlan.versionNumber}</small></div><span>HK1 <b>{row.semester1Periods}</b></span><span>HK2 <b>{row.semester2Periods}</b></span><span>Cả năm <b>{row.annualPeriods} tiết</b></span></article>)}</div> : <div className="empty-state"><strong>Kế hoạch chưa có môn thầy cô được phân công ở lớp này</strong></div>;
          }}</Async>}
      </div>}
      {profileTarget && (
        <Modal
          title="Hồ sơ học sinh"
          onClose={() => setProfileTarget(null)}
          footer={<button className="live-btn subtle" onClick={() => setProfileTarget(null)}>Đóng</button>}
        >
          <Async state={studentProfile} empty="Không tìm thấy hồ sơ học sinh">
            {(student) => <HomeroomStudentProfile student={student} schoolClass={profileClass} />}
          </Async>
        </Modal>
      )}
    </Section>
    </div>
  );
}

function HomeroomStudentProfile({ student, schoolClass }: { student: ApiUser; schoolClass?: SchoolClass }) {
  const initials = student.fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase();
  const profileGroups = [
    {
      title: 'Thông tin học tập', Icon: GraduationCap, items: [
        ['Mã học sinh', homeroomProfileValue(student.studentCode)],
        ['Lớp hiện tại', homeroomProfileValue(student.className || schoolClass?.code)],
        ['Khối học', homeroomProfileValue(schoolClass?.gradeLevel)],
        ['Ngày nhập học', homeroomProfileDate(student.enrollmentDate)],
      ],
    },
    {
      title: 'Thông tin cá nhân', Icon: UserRound, items: [
        ['Ngày sinh', homeroomProfileDate(student.dateOfBirth)],
        ['Giới tính', homeroomGenderLabel(student.gender)],
        ['Nơi sinh', homeroomProfileValue(student.placeOfBirth)],
        ['Dân tộc / Quốc tịch', `${homeroomProfileValue(student.ethnicity)} / ${homeroomProfileValue(student.nationality)}`],
      ],
    },
    {
      title: 'Liên hệ', Icon: MapPin, items: [
        ['Email', homeroomProfileValue(student.email)],
        ['Số điện thoại', homeroomProfileValue(student.phone)],
        ['Địa chỉ thường trú', homeroomProfileValue(student.address)],
      ],
    },
    {
      title: 'Người giám hộ', Icon: UsersRound, items: [
        ['Họ và tên', homeroomProfileValue(student.guardianName)],
        ['Số điện thoại', homeroomProfileValue(student.guardianPhone)],
      ],
    },
  ];

  return (
    <div className="homeroom-student-profile">
      <header className="homeroom-profile-hero">
        <div className="homeroom-profile-avatar">
          {student.avatarUrl ? <img src={student.avatarUrl} alt={`Ảnh đại diện của ${student.fullName}`} /> : <span>{initials || 'HS'}</span>}
        </div>
        <div className="homeroom-profile-identity">
          <span>Hồ sơ lớp chủ nhiệm</span>
          <h3>{student.fullName}</h3>
          <div><b><IdCard size={15} /> {homeroomProfileValue(student.studentCode)}</b><b><GraduationCap size={15} /> Lớp {homeroomProfileValue(student.className || schoolClass?.code)}</b></div>
        </div>
        <StatusPill value={student.status} />
      </header>

      <div className="homeroom-profile-highlights">
        <span><CalendarDays size={17} /><small>Ngày sinh</small><strong>{homeroomProfileDate(student.dateOfBirth)}</strong></span>
        <span><Mail size={17} /><small>Email</small><strong>{homeroomProfileValue(student.email)}</strong></span>
        <span><Phone size={17} /><small>Liên hệ giám hộ</small><strong>{homeroomProfileValue(student.guardianPhone)}</strong></span>
      </div>

      <div className="homeroom-profile-grid">
        {profileGroups.map(({ title, Icon, items }) => (
          <section key={title} className="homeroom-profile-card">
            <header><span><Icon size={17} /></span><h4>{title}</h4></header>
            <dl>{items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className={value === 'Chưa cập nhật' ? 'empty' : ''}>{value}</dd></div>)}</dl>
          </section>
        ))}
      </div>
      <footer className="homeroom-profile-note"><ShieldCheck size={17} /><span>Thông tin chi tiết chỉ dành cho giáo viên chủ nhiệm và bộ phận quản trị nhà trường.</span></footer>
    </div>
  );
}

function homeroomProfileValue(value?: string | null) {
  return value?.trim() || 'Chưa cập nhật';
}

function homeroomProfileDate(value?: string | null) {
  return value ? fmtDate(value) : 'Chưa cập nhật';
}

function homeroomGenderLabel(value?: string | null) {
  if (!value) return 'Chưa cập nhật';
  const labels: Record<string, string> = { MALE: 'Nam', FEMALE: 'Nữ', OTHER: 'Khác' };
  return labels[value.toUpperCase()] || value;
}

/* ===== B3 — Sổ điểm danh ===== */
export function TeacherAttendanceLive() {
  const confirmAction = useConfirm();
  const { user } = useAuth();
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const [slotId, setSlotId] = useState('');
  const [date, setDate] = useState(TODAY);
  const toast = useToast();
  const attendanceSlots = useMemo(() => {
    const mainSubject = user?.mainSubject?.trim().toLocaleLowerCase('vi');
    if (!mainSubject) return [];
    return (slots.data || []).filter((item) => (
      item.subjectId.trim().toLocaleLowerCase('vi') === mainSubject
      || item.subjectName.trim().toLocaleLowerCase('vi') === mainSubject
    ));
  }, [slots.data, user?.mainSubject]);
  const slot = attendanceSlots.find((item) => item.id === slotId);
  const students = useApi<ApiUser[]>(slot ? `/classes/${slot.classId}/students` : null);
  const attendance = useApi<AttendanceRecord[]>(slot
    ? `/attendance?slotId=${encodeURIComponent(slot.id)}&date=${encodeURIComponent(date)}`
    : null);
  const [marks, setMarks] = useState<Record<string, { status: string; note: string }>>({});
  const [baseline, setBaseline] = useState<Record<string, { status: string; note: string }>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [hasSavedRegister, setHasSavedRegister] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');

  useEffect(() => {
    if (!slot || !students.data || attendance.loading) return;
    const existing = new Map((attendance.data || [])
      .filter((record) => record.slotId === slot.id && record.date === date)
      .map((record) => [record.studentId, record]));
    const next = Object.fromEntries(students.data.map((student) => {
      const record = existing.get(student.id);
      return [student.id, { status: record?.status || 'PRESENT', note: record?.note || '' }];
    }));
    setMarks(next);
    setBaseline(next);
    setHasSavedRegister(existing.size > 0);
    setLastSavedAt(existing.size ? 'Đã tải dữ liệu đã lưu' : 'Chưa có dữ liệu cho tiết này');
  }, [attendance.data, attendance.loading, date, slot, students.data]);

  const dirty = useMemo(() => JSON.stringify(marks) !== JSON.stringify(baseline), [baseline, marks]);
  const saveRequired = !hasSavedRegister || dirty;

  useEffect(() => {
    const warnBeforeLeave = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warnBeforeLeave);
    return () => window.removeEventListener('beforeunload', warnBeforeLeave);
  }, [dirty]);

  const confirmDiscard = async () => !dirty || confirmAction({ title: 'Bỏ thay đổi điểm danh?', message: 'Các thay đổi điểm danh chưa được lưu sẽ bị mất.', confirmLabel: 'Bỏ thay đổi', tone: 'warning' });

  const changeSlot = async (nextSlotId: string) => {
    if (!(await confirmDiscard())) return;
    setSlotId(nextSlotId);
    setSearch('');
    setStatusFilter('ALL');
  };

  const changeDate = async (nextDate: string) => {
    if (!(await confirmDiscard())) return;
    setDate(nextDate);
  };

  const updateStatus = (studentId: string, status: string) => {
    setMarks((current) => ({
      ...current,
      [studentId]: { status, note: status === 'PRESENT' ? '' : current[studentId]?.note || '' },
    }));
  };

  const updateNote = (studentId: string, note: string) => {
    setMarks((current) => ({ ...current, [studentId]: { ...(current[studentId] || { status: 'PRESENT' }), note } }));
  };

  const markAll = (status: string) => {
    setMarks((current) => Object.fromEntries((students.data || []).map((student) => [
      student.id,
      { status, note: status === 'PRESENT' ? '' : current[student.id]?.note || '' },
    ])));
  };

  const resetChanges = () => setMarks(structuredClone(baseline));

  const submit = async () => {
    if (!slot) return toast.show('err', 'Vui lòng chọn tiết học');
    const missingNotes = (students.data || []).filter((student) => {
      const mark = marks[student.id];
      return mark && mark.status !== 'PRESENT' && !mark.note.trim();
    });
    if (missingNotes.length) {
      return toast.show('err', `Vui lòng nhập ghi chú cho ${missingNotes.length} học sinh vắng hoặc đi muộn`);
    }
    setSaving(true);
    try {
      const body = {
        slotId,
        date,
        marks: (students.data || []).map((student) => ({
          studentId: student.id,
          status: marks[student.id]?.status || 'PRESENT',
          note: marks[student.id]?.note.trim() || null,
        })),
      };
      const saved = await api.post<AttendanceRecord[]>('/attendance/bulk', body);
      const savedMap = new Map(saved.map((record) => [record.studentId, record]));
      const next = Object.fromEntries((students.data || []).map((student) => {
        const record = savedMap.get(student.id);
        return [student.id, { status: record?.status || 'PRESENT', note: record?.note || '' }];
      }));
      setMarks(next);
      setBaseline(next);
      setHasSavedRegister(true);
      setLastSavedAt(`Lưu lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`);
      toast.show('ok', `Đã lưu điểm danh ${saved.length} học sinh. Mọi trạng thái thay đổi đã được tự động thông báo tới học sinh và phụ huynh.`);
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setSaving(false);
    }
  };

  const summary = useMemo(() => {
    const values = (students.data || []).map((student) => marks[student.id]?.status || 'PRESENT');
    return {
      total: values.length,
      present: values.filter((status) => status === 'PRESENT').length,
      late: values.filter((status) => status === 'LATE').length,
      absentExcused: values.filter((status) => status === 'ABSENT_EXCUSED').length,
      absentUnexcused: values.filter((status) => status === 'ABSENT_UNEXCUSED').length,
    };
  }, [marks, students.data]);

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('vi');
    return (students.data || []).filter((student) => {
      const matchesSearch = !needle
        || student.fullName.toLocaleLowerCase('vi').includes(needle)
        || (student.studentCode || '').toLocaleLowerCase('vi').includes(needle);
      const matchesStatus = statusFilter === 'ALL' || (marks[student.id]?.status || 'PRESENT') === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [marks, search, statusFilter, students.data]);

  return (
    <>
    <Section title="Sổ điểm danh điện tử" subtitle="Chỉ điểm danh các tiết đúng môn chuyên ngành được phân công" wide
      action={<button className="live-btn" onClick={submit} disabled={!slot || saving || !saveRequired}><Send size={15} /> {saving ? 'Đang lưu…' : 'Lưu điểm danh'}</button>}>
      {toast.node}
      <div className="attendance-register-shell">
        <div className="attendance-session-panel">
          <div className={`attendance-subject-scope ${user?.mainSubject ? '' : 'missing'}`}>
            <span><GraduationCap size={18} /></span>
            <div><small>Môn được phép điểm danh</small><strong>{user?.mainSubject || 'Chưa cấu hình chuyên ngành'}</strong></div>
            <b>{attendanceSlots.length} tiết phù hợp</b>
          </div>
          <div className="attendance-session-fields">
            <label><span>Tiết học phụ trách</span><select className="live-select" value={slotId} onChange={(event) => changeSlot(event.target.value)}>
              <option value="">{attendanceSlots.length ? '— Chọn tiết học —' : '— Chưa có tiết đúng môn chuyên ngành —'}</option>
              {attendanceSlots.map((item) => (
                <option key={item.id} value={item.id}>{DAY_LABEL[item.dayOfWeek]} · Tiết {item.periodNo} · {item.subjectName} · {item.classId}</option>
              ))}
            </select></label>
            <label><span>Ngày điểm danh</span><input className="live-input" type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
          </div>
          {slot && <div className="attendance-session-context">
            <div><span><CalendarCheck2 size={19} /></span><p><small>Môn học</small><strong>{slot.subjectName}</strong></p></div>
            <div><span><Users size={19} /></span><p><small>Lớp</small><strong>{slot.classId}</strong></p></div>
            <div><span><Clock3 size={19} /></span><p><small>Thời gian</small><strong>Tiết {slot.periodNo} · {slot.startTime || '—'}–{slot.endTime || '—'}</strong></p></div>
            <div><span><MapPin size={19} /></span><p><small>Phòng học</small><strong>{slot.roomCode || 'Chưa xếp phòng'}</strong></p></div>
          </div>}
          {slot && <div className={`attendance-save-state ${dirty || !hasSavedRegister ? 'dirty' : 'saved'}`}>
            {dirty || !hasSavedRegister ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{dirty ? 'Có thay đổi chưa lưu' : lastSavedAt}</span>
          </div>}
        </div>

        {!slot ? <div className="attendance-empty"><CalendarCheck2 size={34} /><strong>{attendanceSlots.length ? 'Chọn tiết học để bắt đầu' : 'Chưa có tiết học phù hợp'}</strong><span>{attendanceSlots.length ? 'Sổ điểm danh sẽ tự tải dữ liệu đã lưu theo ngày và tiết học.' : `Chỉ các tiết môn ${user?.mainSubject || 'chuyên ngành'} do thầy cô phụ trách mới được hiển thị tại đây.`}</span></div> : (
          <Async state={{ data: students.data, loading: students.loading || attendance.loading, error: students.error || attendance.error }} empty="Lớp chưa có học sinh">
            {() => <>
              <div className="attendance-summary-grid">
                <article className="total"><span><Users size={19} /></span><div><small>Sĩ số lớp</small><strong>{summary.total}</strong></div></article>
                <article className="present"><span><UserCheck size={19} /></span><div><small>Có mặt</small><strong>{summary.present}</strong></div></article>
                <article className="late"><span><Clock3 size={19} /></span><div><small>Đi muộn</small><strong>{summary.late}</strong></div></article>
                <article className="excused"><span><UserX size={19} /></span><div><small>Vắng có phép</small><strong>{summary.absentExcused}</strong></div></article>
                <article className="unexcused"><span><AlertTriangle size={19} /></span><div><small>Vắng không phép</small><strong>{summary.absentUnexcused}</strong></div></article>
              </div>

              <div className="attendance-actionbar">
                <div className="attendance-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã học sinh…" /></div>
                <select className="live-select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Lọc trạng thái điểm danh">
                  <option value="ALL">Tất cả trạng thái</option>
                  {ATT_STATES.map((status) => <option key={status} value={status}>{ATTENDANCE_STATUS_LABELS[status]}</option>)}
                </select>
                <div className="attendance-quick-actions">
                  <button type="button" onClick={() => markAll('PRESENT')}><UserCheck size={15} /> Tất cả có mặt</button>
                  <button type="button" onClick={resetChanges} disabled={!dirty}><RotateCcw size={15} /> Hoàn tác</button>
                </div>
              </div>

              <PaginatedData items={filteredStudents} itemLabel="học sinh">
                {(pagedStudents) => <div className="attendance-table-wrap">
                <table className="attendance-table">
                  <thead><tr><th>STT</th><th>Học sinh</th><th>Trạng thái chuyên cần</th><th>Ghi chú</th></tr></thead>
                  <tbody>{pagedStudents.map((student) => {
                    const mark = marks[student.id] || { status: 'PRESENT', note: '' };
                    return <tr key={student.id} data-status={mark.status}>
                      <td>{(students.data || []).findIndex((item) => item.id === student.id) + 1}</td>
                      <td><div className="attendance-student"><span>{student.fullName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span><p><strong>{student.fullName}</strong><small>{student.studentCode || 'Chưa có mã học sinh'}</small></p></div></td>
                      <td><div className="attendance-status-options">{ATT_STATES.map((status) => <button
                        type="button"
                        key={status}
                        className={mark.status === status ? `active ${attendanceStatusTone(status)}` : ''}
                        aria-pressed={mark.status === status}
                        onClick={() => updateStatus(student.id, status)}
                      ><i />{ATTENDANCE_STATUS_LABELS[status]}</button>)}</div></td>
                      <td><input
                        className="attendance-note-input"
                        maxLength={255}
                        value={mark.note}
                        disabled={mark.status === 'PRESENT'}
                        onChange={(event) => updateNote(student.id, event.target.value)}
                        placeholder={mark.status === 'PRESENT' ? 'Không cần ghi chú' : 'Nhập lý do hoặc ghi chú…'}
                        aria-label={`Ghi chú điểm danh của ${student.fullName}`}
                      /></td>
                    </tr>;
                  })}</tbody>
                </table>
                {!filteredStudents.length && <div className="attendance-filter-empty"><Search size={24} /><span>Không tìm thấy học sinh phù hợp bộ lọc.</span></div>}
              </div>}
              </PaginatedData>
              <footer className="attendance-register-footer">
                <span>Hiển thị {filteredStudents.length}/{summary.total} học sinh</span>
                <p><ShieldCheck size={15} /> Trạng thái thay đổi được tự động gửi tới học sinh và phụ huynh; dữ liệu không đổi sẽ không tạo thông báo trùng.</p>
              </footer>
            </>}
          </Async>
        )}
      </div>
    </Section>
    <AttendanceExcusePanel mode="review" />
    </>
  );
}

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Có mặt',
  LATE: 'Đi muộn',
  ABSENT_EXCUSED: 'Vắng có phép',
  ABSENT_UNEXCUSED: 'Vắng không phép',
};

function attendanceStatusTone(status: string) {
  if (status === 'PRESENT') return 'present';
  if (status === 'LATE') return 'late';
  if (status === 'ABSENT_EXCUSED') return 'excused';
  return 'unexcused';
}

/* ===== B4 — Bảng điểm ===== */
export function TeacherGradesLive() {
  const { user } = useAuth();
  const teachingAssignments = useApi<TeachingAssignment[]>('/me/teacher-class-subjects');
  const classes = useApi<SchoolClass[]>('/classes');
  const years = useApi<AcademicYear[]>('/academic-years');
  const semesters = useApi<Semester[]>('/semesters');
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();
  const [classId, setClassId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [reason, setReason] = useState('');

  const activeYearId = years.data?.find((year) => year.status === 'ACTIVE')?.id || '';
  const semesterOptions = useMemo(() => (semesters.data || [])
    .filter((semester) => !activeYearId || semester.academicYearId === activeYearId)
    .filter((semester) => (teachingAssignments.data || []).some((assignment) => assignment.semesterId === semester.id)
      || (classes.data || []).some((schoolClass) => schoolClass.academicYearId === semester.academicYearId && schoolClass.homeroomTeacherId === user?.id))
    .sort((left, right) => left.sequence - right.sequence),
  [activeYearId, classes.data, semesters.data, teachingAssignments.data, user?.id]);

  const classOpts = useMemo(() => {
    const m: Record<string, true> = {};
    const selectedSemester = semesterOptions.find((semester) => semester.id === semesterId);
    (teachingAssignments.data || [])
      .filter((assignment) => !semesterId || assignment.semesterId === semesterId)
      .forEach((assignment) => (m[assignment.classId] = true));
    (classes.data || [])
      .filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id
        && (!selectedSemester || schoolClass.academicYearId === selectedSemester.academicYearId))
      .forEach((schoolClass) => (m[schoolClass.id] = true));
    const classMap = new Map((classes.data || []).map((item) => [item.id, item.code]));
    return Object.keys(m).sort((left, right) => (classMap.get(left) || left).localeCompare(classMap.get(right) || right, 'vi'));
  }, [classes.data, semesterId, semesterOptions, teachingAssignments.data, user?.id]);

  useEffect(() => {
    if (!classOpts.includes(classId)) setClassId(classOpts[0] || '');
  }, [classId, classOpts]);

  useEffect(() => {
    if (!semesterOptions.some((semester) => semester.id === semesterId)) {
      setSemesterId(semesterOptions.find((semester) => semester.status === 'ACTIVE')?.id || semesterOptions[0]?.id || '');
    }
  }, [semesterId, semesterOptions]);

  const contextSubjects = useMemo(() => {
    const unique = new Map<string, { subjectId: string; subjectName: string; teacherName: string; editable: boolean }>();
    (teachingAssignments.data || [])
      .filter((assignment) => assignment.classId === classId && assignment.semesterId === semesterId)
      .forEach((assignment) => unique.set(assignment.subjectId, {
        subjectId: assignment.subjectId,
        subjectName: assignment.subjectName,
        teacherName: assignment.teacherName,
        editable: true,
      }));
    return [...unique.values()];
  }, [classId, semesterId, teachingAssignments.data]);
  const selectedIsHomeroom = classes.data?.find((schoolClass) => schoolClass.id === classId)?.homeroomTeacherId === user?.id;

  useEffect(() => {
    const currentIsAvailable = contextSubjects.some((subject) => subject.subjectId === selectedSubjectId);
    if (!currentIsAvailable) setSelectedSubjectId(contextSubjects[0]?.subjectId || '');
  }, [contextSubjects, selectedSubjectId]);

  const selectedSubject = contextSubjects.find((subject) => subject.subjectId === selectedSubjectId);
  const subjectId = selectedSubject?.subjectId || '';
  const canEdit = Boolean(selectedSubject?.editable);
  const gradeConfigs = useApi<GradeConfiguration[]>(subjectId && semesterId
    ? `/grade-configurations?subjectId=${encodeURIComponent(subjectId)}&semesterId=${encodeURIComponent(semesterId)}`
    : null);
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);
  const existing = useApi<Grade[]>(
    classId && subjectId && semesterId
      ? `/grades?classId=${encodeURIComponent(classId)}&semesterId=${encodeURIComponent(semesterId)}&subjectId=${encodeURIComponent(subjectId)}`
      : null,
  );
  const [scores, setScores] = useState<Record<string, string>>({});
  const effectiveCategories = useMemo<ExamCategory[]>(() => {
    if (!(gradeConfigs.data || []).length) return cats.data || [];
    const defaults = new Map((cats.data || []).map((category) => [category.code, category]));
    return (gradeConfigs.data || []).filter((config) => config.active).map((config) => ({
      id: defaults.get(config.categoryCode)?.id || config.id,
      code: config.categoryCode,
      name: config.categoryName || defaults.get(config.categoryCode)?.name || config.categoryCode,
      weight: config.weight,
      requiredCount: config.requiredCount,
    }));
  }, [cats.data, gradeConfigs.data]);

  useEffect(() => {
    const m: Record<string, string> = {};
    (existing.data || []).forEach((grade) => (m[gradeKey(grade.studentId, grade.category, grade.assessmentIndex ?? 1)] = String(grade.score)));
    setScores(m);
  }, [existing.data]);

  const ready = Boolean(classId && semesterId && subjectId && effectiveCategories.length);
  const classMap = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item.code])), [classes.data]);
  const subjectName = selectedSubject?.subjectName || '';
  const columns = useMemo(() => gradeColumns(effectiveCategories), [effectiveCategories]);
  const gradeVersions = useMemo(() => new Map((existing.data || []).map((grade) => [
    gradeKey(grade.studentId, grade.category, grade.assessmentIndex ?? 1),
    grade.version,
  ])), [existing.data]);

  const gradeRows = useMemo(() => (students.data || []).map((student) => {
    const values = columns.flatMap((column) => {
      const value = scores[gradeKey(student.id, column.category.code, column.assessmentIndex)];
      return value === undefined || value === '' ? [] : [{
        category: column.category.code,
        assessmentIndex: column.assessmentIndex,
        score: Number(value),
      }];
    });
    return { student, values, average: weightedAverage(values, effectiveCategories) };
  }), [students.data, effectiveCategories, columns, scores]);

  const averages = gradeRows.map((row) => row.average).filter((score): score is number => score != null);
  const classAverage = averages.length
    ? Math.round((averages.reduce((total, score) => total + score, 0) / averages.length) * 10) / 10
    : null;
  const highest = averages.length ? Math.max(...averages) : null;
  const totalCells = gradeRows.length * columns.length;
  const completedCells = gradeRows.reduce((total, row) => total + row.values.length, 0);
  const completion = totalCells ? Math.round((completedCells / totalCells) * 100) : 0;

  const submit = async () => {
    if (!ready) return toast.show('err', 'Chọn đủ Lớp / Học kỳ để hệ thống xác định môn mặc định');
    if (!canEdit) return toast.show('err', 'Bạn chỉ được xem điểm môn ngoài chuyên ngành, không thể thay đổi dữ liệu');
    const invalid = Object.values(scores).some((value) => value !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0 || Number(value) > 10));
    if (invalid) return toast.show('err', 'Điểm phải nằm trong khoảng 0 đến 10');

    const batches = columns.map((column) => ({
      column,
      entries: (students.data || [])
        .filter((student) => scores[gradeKey(student.id, column.category.code, column.assessmentIndex)] !== undefined && scores[gradeKey(student.id, column.category.code, column.assessmentIndex)] !== '')
        .map((student) => {
          const key = gradeKey(student.id, column.category.code, column.assessmentIndex);
          return { studentId: student.id, score: Number(scores[key]), expectedVersion: gradeVersions.get(key) };
        }),
    })).filter((batch) => batch.entries.length);
    const entryCount = batches.reduce((total, batch) => total + batch.entries.length, 0);
    if (!entryCount) return toast.show('err', 'Chưa nhập đầu điểm nào');

    try {
      await Promise.all(batches.map((batch) => api.post('/grades/bulk', {
        classId,
        subjectId,
        semesterId,
        category: batch.column.category.code,
        assessmentIndex: batch.column.assessmentIndex,
        reason,
        entries: batch.entries,
      })));
      toast.show('ok', `Đã lưu ${entryCount} đầu điểm. Điểm mới hoặc điểm thay đổi đã được tự động thông báo tới học sinh và phụ huynh.`);
      existing.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Sổ điểm học kỳ" subtitle="Nhập điểm theo từng đầu điểm và tự động tính tổng kết theo hệ số" wide
      action={<button className="live-btn gradebook-save" onClick={submit} disabled={!ready || !canEdit}>{canEdit ? <Send size={15} /> : <LockKeyhole size={15} />} {canEdit ? 'Lưu sổ điểm' : 'Chỉ xem'}</button>}>
      {toast.node}
      <div className="gradebook-filterbar">
        <label><span>Học kỳ</span><select className="live-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">— Chọn học kỳ —</option>{semesterOptions.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
        </select></label>
        <label><span>Lớp giảng dạy</span><select className="live-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Chọn lớp —</option>{classOpts.map((id) => <option key={id} value={id}>{classMap.get(id) || id}</option>)}
        </select></label>
        {selectedIsHomeroom && contextSubjects.length > 1 ? (
          <label><span>Môn học của lớp chủ nhiệm</span><select className="live-select" value={subjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
            {contextSubjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}{subject.editable ? ' · Có thể chỉnh sửa' : ' · Chỉ xem'}</option>)}
          </select></label>
        ) : (
          <div className="gradebook-auto-subject"><span>Môn chuyên ngành</span><strong>{subjectName || '—'}</strong><small>Tự động theo phân công giảng dạy</small></div>
        )}
        {canEdit ? (
          <label className="gradebook-reason"><span>Lý do điều chỉnh (nếu có)</span><input className="live-input" placeholder="Ví dụ: cập nhật sau phúc khảo" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        ) : (
          <div className="gradebook-readonly-card"><Eye size={18} /><div><strong>Chế độ chỉ xem</strong><small>Điểm do giáo viên bộ môn {selectedSubject?.teacherName || 'phụ trách'} quản lý</small></div></div>
        )}
      </div>

      {ready && selectedIsHomeroom && (
        <div className={`gradebook-access-notice ${canEdit ? 'editable' : 'readonly'}`}>
          {canEdit ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
          <span>{canEdit
            ? `Bạn là giáo viên chủ nhiệm và có thể cập nhật môn ${subjectName} thuộc chuyên ngành của mình.`
            : `Bạn là giáo viên chủ nhiệm nên được xem môn ${subjectName}, nhưng không thể thay đổi điểm ngoài chuyên ngành.`}</span>
        </div>
      )}

      {!ready ? <div className="gradebook-onboarding"><BarChart3 size={26} /><strong>Chọn lớp và học kỳ</strong><span>{contextSubjects.length ? 'Môn học sẽ được hệ thống tự động xác định theo phân công.' : 'Bạn chưa được phân công môn cho lớp trong học kỳ này.'}</span></div> : existing.loading ? <div className="live-loading">Đang tải sổ điểm…</div> : (
        <Async paginate state={{ data: gradeRows, loading: students.loading, error: students.error }} empty="Lớp chưa có học sinh" itemLabel="học sinh">
          {(pagedGradeRows) => (
            <div className="gradebook-shell">
              <div className="gradebook-context"><div><small>Đang xem</small><strong>{classMap.get(classId) || classId} · {subjectName}</strong></div><span>{canEdit ? 'Có quyền chỉnh sửa' : 'Chỉ xem'} · {columns.length} đầu điểm</span></div>

              <div className="gradebook-summary">
                <article className="gradebook-stat primary"><span><BarChart3 size={19} /></span><div><small>Trung bình lớp</small><strong>{formatScore(classAverage)}</strong><p>{averages.length}/{gradeRows.length} học sinh có điểm</p></div></article>
                <article className="gradebook-stat"><span><Trophy size={19} /></span><div><small>Điểm cao nhất</small><strong>{formatScore(highest)}</strong><p>Theo tổng kết hiện tại</p></div></article>
                <article className="gradebook-stat"><span><CheckCircle2 size={19} /></span><div><small>Tiến độ nhập</small><strong>{completion}%</strong><p>{completedCells}/{totalCells} đầu điểm</p></div></article>
              </div>

              <div className="gradebook-table-wrap">
                <table className="gradebook-table teacher-gradebook-table">
                  <thead><tr>
                    <th className="gradebook-sticky-col">Học sinh</th>
                    {columns.map((column) => <th key={`${column.category.code}-${column.assessmentIndex}`}><span>{column.label}</span><small>Hệ số {column.category.weight}</small></th>)}
                    <th className="gradebook-total-head">Tổng kết</th>
                    <th>Trạng thái</th>
                  </tr></thead>
                  <tbody>{pagedGradeRows.map((row) => {
                    const missing = columns.length - row.values.length;
                    return <tr key={row.student.id}>
                      <td className="gradebook-sticky-col"><strong>{row.student.fullName}</strong><small>{row.student.studentCode || row.student.username}</small></td>
                      {columns.map((column) => {
                        const key = gradeKey(row.student.id, column.category.code, column.assessmentIndex);
                        return <td key={`${column.category.code}-${column.assessmentIndex}`}><input className={`gradebook-score-input ${!canEdit ? 'locked' : ''} ${scoreTone(scores[key] === undefined || scores[key] === '' ? null : Number(scores[key]))}`} aria-label={`${column.label} của ${row.student.fullName}`} aria-readonly={!canEdit} readOnly={!canEdit} type="number" min={0} max={10} step="0.1" placeholder="—" value={scores[key] ?? ''} onChange={(event) => canEdit && setScores({ ...scores, [key]: event.target.value })} /></td>;
                      })}
                      <td className="gradebook-total-cell"><strong className={`grade-total ${scoreTone(row.average)}`}>{row.average == null ? '' : formatScore(row.average)}</strong><small>{row.average == null ? 'Chưa đủ điểm' : 'Thang 10'}</small></td>
                      <td><span className={`gradebook-completion ${missing ? 'incomplete' : 'complete'}`}>{missing ? `Thiếu ${missing}` : 'Đủ điểm'}</span></td>
                    </tr>;
                  })}</tbody>
                </table>
              </div>
              <p className="gradebook-note">Tổng kết chỉ được tính khi đủ điểm miệng, điểm 15 phút, điểm giữa kỳ và cuối kỳ. Nếu thiếu bất kỳ đầu điểm nào, tổng kết để trống.</p>
            </div>
          )}
        </Async>
      )}
    </Section>
  );
}

const TEACHER_NOTIFICATION_CATEGORIES = [
  { value: 'STUDENT_STATUS', label: 'Tình hình lớp học', hint: 'Nề nếp, học tập và hoạt động trên lớp', title: 'Thông báo tình hình học sinh tại lớp', body: 'Kính gửi quý phụ huynh và các em học sinh,\n\nGiáo viên gửi thông tin cập nhật về tình hình học tập và nề nếp tại lớp:' },
];

const TEACHER_NOTIFICATION_TARGETS = [
  { value: 'CLASS_ALL', label: 'Học sinh & phụ huynh', hint: 'Gửi đồng thời tới cả hai nhóm', Icon: UsersRound },
  { value: 'CLASS_STUDENTS', label: 'Học sinh', hint: 'Chỉ học sinh của lớp đã chọn', Icon: GraduationCap },
  { value: 'CLASS_PARENTS', label: 'Phụ huynh', hint: 'Toàn bộ phụ huynh liên kết với lớp', Icon: UserRound },
];

const TEACHER_NOTIFICATION_CATEGORY_LABEL: Record<string, string> = {
  GRADE: 'Điểm số', ATTENDANCE: 'Điểm danh', STUDENT_STATUS: 'Tình hình lớp học',
};
const TEACHER_NOTIFICATION_PRIORITY_LABEL: Record<string, string> = {
  NORMAL: 'Thông thường', IMPORTANT: 'Quan trọng', URGENT: 'Khẩn cấp',
};

/* ===== B7 — Thông báo lớp học ===== */
export function TeacherNotificationsLive() {
  const scopes = useApi<TeacherAnnouncementScope[]>('/teacher/announcements/scopes');
  const announcements = useApi<Announcement[]>('/teacher/announcements');
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ classId: '', target: 'CLASS_ALL', category: 'STUDENT_STATUS', priority: 'NORMAL', title: '', body: '' });

  useEffect(() => {
    if (!form.classId && scopes.data?.length) setForm((current) => ({ ...current, classId: scopes.data![0].classId }));
  }, [form.classId, scopes.data]);

  const selectedScope = (scopes.data || []).find((scope) => scope.classId === form.classId);
  const selectedCategory = TEACHER_NOTIFICATION_CATEGORIES.find((category) => category.value === form.category) || TEACHER_NOTIFICATION_CATEGORIES[0];
  const targetCount = form.target === 'CLASS_STUDENTS'
    ? selectedScope?.studentCount || 0
    : form.target === 'CLASS_PARENTS'
      ? selectedScope?.parentCount || 0
      : (selectedScope?.studentCount || 0) + (selectedScope?.parentCount || 0);
  const selectedTarget = TEACHER_NOTIFICATION_TARGETS.find((target) => target.value === form.target) || TEACHER_NOTIFICATION_TARGETS[0];

  const countForTarget = (target: string) => target === 'CLASS_STUDENTS'
    ? selectedScope?.studentCount || 0
    : target === 'CLASS_PARENTS'
      ? selectedScope?.parentCount || 0
      : (selectedScope?.studentCount || 0) + (selectedScope?.parentCount || 0);

  const applyCategory = (category: typeof TEACHER_NOTIFICATION_CATEGORIES[number]) => {
    const classSuffix = selectedScope ? ` - lớp ${selectedScope.classCode}` : '';
    setForm((current) => ({ ...current, category: category.value, title: `${category.title}${classSuffix}`, body: category.body }));
  };

  const sendAnnouncement = async () => {
    if (!form.classId) return toast.show('err', 'Vui lòng chọn lớp nhận thông báo');
    if (!form.title.trim() || !form.body.trim()) return toast.show('err', 'Vui lòng nhập tiêu đề và nội dung thông báo');
    if (!targetCount) return toast.show('err', 'Nhóm đã chọn hiện không có người nhận');
    setSending(true);
    try {
      const sent = await api.post<Announcement>('/announcements', {
        audience: `${form.target}:${form.classId}`,
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      toast.show('ok', `Đã gửi thông báo tới ${sent.recipientCount ?? targetCount} người nhận`);
      setForm((current) => ({ ...current, title: '', body: '', priority: 'NORMAL' }));
      announcements.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSending(false);
    }
  };

  const historyAudience = (audience: string) => {
    const separator = audience.indexOf(':');
    if (separator < 0) return audience;
    const target = TEACHER_NOTIFICATION_TARGETS.find((item) => item.value === audience.slice(0, separator));
    const scope = (scopes.data || []).find((item) => item.classId === audience.slice(separator + 1));
    return `${target?.label || 'Lớp học'} · ${scope?.classCode || audience.slice(separator + 1)}`;
  };

  return (
    <div className="admin-notification-center teacher-notification-center">
      {toast.node}
      <Section title="Thông báo tự động" subtitle="Điểm số và trạng thái điểm danh được gửi ngay khi giáo viên lưu thay đổi" wide
        action={<button className="live-btn ghost" onClick={() => { scopes.reload(); announcements.reload(); }}><RefreshCw size={14} /> Cập nhật dữ liệu</button>}>
        <div className="teacher-notification-automation">
          <article><span><BarChart3 size={20} /></span><div><strong>Điểm số · Tự động</strong><small>Điểm mới hoặc điểm điều chỉnh được gửi ngay tới học sinh và phụ huynh.</small></div><Badge tone="green">Đang bật</Badge></article>
          <article><span><CalendarCheck2 size={20} /></span><div><strong>Điểm danh · Tự động</strong><small>Mọi thay đổi có mặt, đi muộn hoặc vắng đều được thông báo; lưu lại không đổi sẽ không gửi trùng.</small></div><Badge tone="green">Đang bật</Badge></article>
        </div>
        <div className="teacher-notification-scope-note"><ShieldCheck size={20} /><div><strong>Phạm vi gửi được bảo vệ theo phân công</strong><small>Chỉ các lớp đang giảng dạy hoặc chủ nhiệm mới xuất hiện. Hệ thống tự xác định học sinh và phụ huynh liên kết.</small></div></div>

        <div className="announcement-audience-summary">
          <article className="active"><span><GraduationCap size={18} /></span><div><small>Lớp phụ trách</small><strong>{scopes.data?.length ?? '—'}</strong><p>lớp học</p></div></article>
          <article><span><Users size={18} /></span><div><small>Học sinh lớp chọn</small><strong>{selectedScope?.studentCount ?? '—'}</strong><p>người nhận</p></div></article>
          <article><span><UserRound size={18} /></span><div><small>Phụ huynh lớp chọn</small><strong>{selectedScope?.parentCount ?? '—'}</strong><p>người nhận</p></div></article>
        </div>

        <div className="announcement-compose-layout">
          <div className="announcement-compose-form">
            <div className="announcement-compose-heading"><span><Megaphone size={19} /></span><div><strong>Trao đổi tình hình lớp học</strong><small>Chỉ dùng khi giáo viên cần chủ động thông báo về nề nếp hoặc hoạt động tại lớp</small></div></div>

            <div className="teacher-notification-class-picker">
              <label><span>Lớp phụ trách</span><select value={form.classId} onChange={(event) => setForm({ ...form, classId: event.target.value })}>
                {!scopes.data?.length && <option value="">Chưa có lớp được phân công</option>}
                {(scopes.data || []).map((scope) => <option key={scope.classId} value={scope.classId}>{scope.classCode} · {scope.homeroom ? 'Chủ nhiệm' : scope.subjects.join(', ') || 'Giảng dạy'}</option>)}
              </select></label>
              {selectedScope && <div><strong>{selectedScope.classCode}</strong><span>{selectedScope.homeroom ? 'Giáo viên chủ nhiệm' : `Giảng dạy: ${selectedScope.subjects.join(', ')}`}</span></div>}
            </div>

            <div className="teacher-manual-status-note"><Megaphone size={17} /><div><strong>Tình hình lớp học</strong><small>{selectedCategory.hint}</small></div><button type="button" onClick={() => applyCategory(selectedCategory)}>Dùng nội dung mẫu</button></div>

            <div className="announcement-field-group">
              <label>Người nhận</label>
              <div className="announcement-audience-grid teacher-audience-grid">
                {TEACHER_NOTIFICATION_TARGETS.map(({ value, label, hint, Icon }) => {
                  const count = countForTarget(value);
                  return <button type="button" key={value} disabled={!count} className={form.target === value ? 'active' : ''} onClick={() => setForm({ ...form, target: value })}><span><Icon size={17} /></span><div><strong>{label}</strong><small>{hint}</small></div><b>{count}</b></button>;
                })}
              </div>
            </div>

            <div className="announcement-form-grid">
              <label className="wide"><span>Tiêu đề</span><input maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nhập tiêu đề rõ ràng, dễ hiểu" /></label>
              <label><span>Mức độ</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="NORMAL">Thông thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn cấp</option></select></label>
              <label className="wide"><span>Nội dung</span><textarea maxLength={4000} rows={7} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Nhập nội dung giáo viên cần trao đổi…" /><small>{form.body.length}/4000 ký tự</small></label>
            </div>
          </div>

          <aside className="announcement-preview">
            <div className="announcement-preview-heading"><BellRing size={18} /><div><strong>Xem trước thông báo</strong><small>Nội dung học sinh và phụ huynh sẽ nhìn thấy</small></div></div>
            <div className={`announcement-preview-card priority-${form.priority.toLowerCase()}`}>
              <header><Badge tone={form.priority === 'URGENT' ? 'red' : 'blue'}>{selectedCategory.label}</Badge><span>{TEACHER_NOTIFICATION_PRIORITY_LABEL[form.priority]}</span></header>
              <strong>{form.title || 'Tiêu đề thông báo'}</strong><p>{form.body || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p><small>Vừa xong · Từ giáo viên phụ trách lớp {selectedScope?.classCode || '—'}</small>
            </div>
            <div className="announcement-send-summary"><span>Đối tượng</span><strong>{selectedTarget.label}</strong><span>Lớp nhận</span><strong>{selectedScope?.classCode || '—'}</strong><span>Dự kiến nhận</span><strong>{targetCount} người</strong></div>
            <p className="announcement-send-note">Thông báo chỉ được gửi tới tài khoản đang hoạt động thuộc lớp giáo viên phụ trách.</p>
            <button type="button" className="live-btn announcement-send-button" disabled={sending || !targetCount || !form.title.trim() || !form.body.trim()} onClick={sendAnnouncement}><Send size={16} /> {sending ? 'Đang gửi…' : `Gửi tới ${targetCount} người`}</button>
          </aside>
        </div>
      </Section>

      <Section title="Lịch sử thông báo lớp học" subtitle="Theo dõi nội dung đã gửi tới từng lớp và nhóm người nhận" wide>
        <Async paginate state={announcements} empty="Chưa có thông báo lớp học nào được gửi" itemLabel="thông báo">
          {(items) => <div className="admin-table-scroll"><table className="live-table announcement-history-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Lớp và người nhận</th><th>Nội dung</th><th>Mức độ</th><th>Người nhận</th><th>Trạng thái</th></tr></thead><tbody>
            {items.map((item) => <tr key={item.id}><td>{fmtDateTime(item.createdAt)}</td><td><Badge tone="blue">{TEACHER_NOTIFICATION_CATEGORY_LABEL[item.category || ''] || item.category}</Badge></td><td><strong>{historyAudience(item.audience)}</strong></td><td><strong>{item.title}</strong><small>{item.body}</small></td><td><span className={`announcement-priority priority-${(item.priority || 'NORMAL').toLowerCase()}`}>{TEACHER_NOTIFICATION_PRIORITY_LABEL[item.priority || 'NORMAL']}</span></td><td><strong>{item.recipientCount || '—'}</strong></td><td><StatusPill value={item.status === 'SENT' ? 'Đã gửi' : item.status || 'Đã gửi'} /></td></tr>)}
          </tbody></table></div>}
        </Async>
      </Section>
    </div>
  );
}

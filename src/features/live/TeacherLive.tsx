import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, BellRing, CalendarCheck2, CalendarDays, CheckCircle2, Clock3, Eye, GraduationCap, IdCard, Inbox, LockKeyhole, Mail, MapPin, Megaphone, Phone, ReceiptText, RefreshCw, RotateCcw, Search, Send, ShieldCheck, SlidersHorizontal, TrendingUp, Trophy, UserCheck, UserRound, Users, UsersRound, UserX, WalletCards } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { Announcement, ApiUser, AttendanceDayStatus, AttendanceRecord, AttendanceSessionStatus, SchoolClass, Semester, ExamCategory, TimetableSlot, Grade, TeacherAnnouncementScope, TeacherGradebookContext, TeachingAssignment, FeePeriod, Invoice, FinanceClassSummary, ClassReminderResult, LeaveRequest } from '../../api/types';
import { Badge, Section, StatusPill } from '../../components/ui';
import { Async, useToast, DAY_LABEL, fmtDate, fmtDateTime, money, PaginatedData } from './common';
import { Modal } from './Modal';
import { formatScore, gradeColumns, gradeKey, scoreTone, weightedAverage } from './gradebook';
import { NotificationsLive } from './SharedLive';
import { useHashString } from '../../api/urlState';

const TODAY = new Date().toISOString().slice(0, 10);
const ATT_STATES = ['PRESENT', 'LATE', 'ABSENT_UNEXCUSED', 'ABSENT_EXCUSED'];

/* ===== B1 — Lớp được phân công ===== */
export function TeacherClassesLive() {
  const { user } = useAuth();
  const teachingAssignments = useApi<TeachingAssignment[]>('/me/teaching-assignments');
  const classesApi = useApi<SchoolClass[]>('/classes');
  const [classId, setClassId] = useHashString('class', '');
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
      g[assignment.classId].subjects.add(assignment.subjectName);
      g[assignment.classId].count += assignment.weeklyPeriods;
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
  const selectedIsHomeroom = selectedClass?.homeroomTeacherId === user?.id;
  const profileClass = profileTarget ? classMap[profileTarget.classId] : undefined;

  return (
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
  const { user } = useAuth();
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const classes = useApi<SchoolClass[]>('/classes');
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
  const classMap = useMemo(
    () => new Map((classes.data || []).map((schoolClass) => [schoolClass.id, schoolClass.code || schoolClass.name])),
    [classes.data],
  );
  const classLabel = (classId: string) => classMap.get(classId) || 'Lớp chưa xác định';
  const slot = attendanceSlots.find((item) => item.id === slotId);
  const dayStatus = useApi<AttendanceDayStatus>(slot
    ? `/attendance/day-status?date=${encodeURIComponent(date)}`
    : null);
  const sessionStatus = useApi<AttendanceSessionStatus>(slot
    ? `/attendance/session-status?slotId=${encodeURIComponent(slot.id)}&date=${encodeURIComponent(date)}`
    : null);
  const students = useApi<ApiUser[]>(slot ? `/classes/${slot.classId}/students` : null);
  const attendance = useApi<AttendanceRecord[]>(slot
    ? `/attendance?slotId=${encodeURIComponent(slot.id)}&date=${encodeURIComponent(date)}`
    : null);
  const approvedLeaves = useApi<LeaveRequest[]>(slot
    ? `/attendance/approved-leaves?slotId=${encodeURIComponent(slot.id)}&date=${encodeURIComponent(date)}`
    : null);
  const approvedLeaveStudentIds = useMemo(
    () => new Set((approvedLeaves.data || []).map((request) => request.studentId)),
    [approvedLeaves.data],
  );
  const [marks, setMarks] = useState<Record<string, { status: string; note: string }>>({});
  const [baseline, setBaseline] = useState<Record<string, { status: string; note: string }>>({});
  const [search, setSearch] = useHashString('q', '');
  const [statusFilter, setStatusFilter] = useHashString('status', 'ALL');
  const [saving, setSaving] = useState(false);
  const [hasSavedRegister, setHasSavedRegister] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState('');
  const [unlockReason, setUnlockReason] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (!slot || !students.data || attendance.loading) return;
    const existing = new Map((attendance.data || [])
      .filter((record) => record.slotId === slot.id && record.date === date)
      .map((record) => [record.studentId, record]));
    const next = Object.fromEntries(students.data.map((student) => {
      const record = existing.get(student.id);
      const approved = approvedLeaveStudentIds.has(student.id);
      return [student.id, {
        status: record?.status || (approved ? 'ABSENT_EXCUSED' : 'PRESENT'),
        note: record?.note || (approved ? 'Đơn xin nghỉ đã được GVCN duyệt' : ''),
      }];
    }));
    setMarks(next);
    setBaseline(next);
    setHasSavedRegister(existing.size > 0);
    setLastSavedAt(existing.size ? 'Đã tải dữ liệu đã lưu' : 'Chưa có dữ liệu cho tiết này');
  }, [approvedLeaveStudentIds, attendance.data, attendance.loading, date, slot, students.data]);

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

  const confirmDiscard = () => !dirty || window.confirm('Các thay đổi điểm danh chưa được lưu. Bạn có muốn bỏ thay đổi?');

  const changeSlot = (nextSlotId: string) => {
    if (!confirmDiscard()) return;
    setSlotId(nextSlotId);
    setSearch('');
    setStatusFilter('ALL');
    setUnlockReason('');
  };

  const changeDate = (nextDate: string) => {
    if (!confirmDiscard()) return;
    setDate(nextDate);
    setUnlockReason('');
  };

  const updateStatus = (studentId: string, status: string) => {
    const resolvedStatus = approvedLeaveStudentIds.has(studentId) && status.startsWith('ABSENT')
      ? 'ABSENT_EXCUSED'
      : status;
    setMarks((current) => ({
      ...current,
      [studentId]: {
        status: resolvedStatus,
        note: resolvedStatus === 'PRESENT'
          ? ''
          : approvedLeaveStudentIds.has(studentId) && resolvedStatus === 'ABSENT_EXCUSED'
            ? 'Đơn xin nghỉ đã được GVCN duyệt'
            : current[studentId]?.note || '',
      },
    }));
  };

  const updateNote = (studentId: string, note: string) => {
    setMarks((current) => ({ ...current, [studentId]: { ...(current[studentId] || { status: 'PRESENT' }), note } }));
  };

  const markAll = (status: string) => {
    setMarks((current) => Object.fromEntries((students.data || []).map((student) => [
      student.id,
      approvedLeaveStudentIds.has(student.id) && status === 'PRESENT'
        ? { status: 'ABSENT_EXCUSED', note: 'Đơn xin nghỉ đã được GVCN duyệt' }
        : { status, note: status === 'PRESENT' ? '' : current[student.id]?.note || '' },
    ])));
  };

  const resetChanges = () => setMarks(structuredClone(baseline));

  const submit = async () => {
    if (!slot) return toast.show('err', 'Vui lòng chọn tiết học');
    if (dayStatus.data?.attendanceRequired === false) return toast.show('err', `Không cần điểm danh ngày nghỉ: ${dayStatus.data.title || 'Theo thông báo của nhà trường'}`);
    if (!sessionStatus.data?.canMark) return toast.show('err', sessionStatus.data?.message || 'Sổ điểm danh hiện chưa được mở');
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
      sessionStatus.reload();
      toast.show('ok', `Đã lưu điểm danh ${saved.length} học sinh. Hệ thống chỉ gửi cảnh báo cho trường hợp cần phụ huynh chú ý; học sinh có đơn nghỉ đã duyệt không nhận thông báo trùng.`);
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setSaving(false);
    }
  };

  const unlockLateAttendance = async () => {
    if (!slot) return;
    if (unlockReason.trim().length < 10) return toast.show('err', 'Vui lòng ghi lý do cụ thể, tối thiểu 10 ký tự');
    setUnlocking(true);
    try {
      const result = await api.post<AttendanceSessionStatus>('/attendance/unlock', {
        slotId: slot.id,
        date,
        reason: unlockReason.trim(),
      });
      toast.show('ok', result.message || 'Đã mở khóa điểm danh muộn');
      sessionStatus.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setUnlocking(false);
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
    <Section title="Sổ điểm danh điện tử" subtitle="Chỉ điểm danh các tiết đúng môn chuyên ngành được phân công" wide
      action={<button className="live-btn" onClick={submit} disabled={!slot || saving || !saveRequired || dayStatus.loading || sessionStatus.loading || !sessionStatus.data?.canMark}><Send size={15} /> {dayStatus.data?.attendanceRequired === false ? 'Ngày nghỉ · Không cần lưu' : sessionStatus.data?.requiresUnlockReason ? 'Đã khóa · Cần lý do' : saving ? 'Đang lưu…' : 'Lưu điểm danh'}</button>}>
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
                <option key={item.id} value={item.id}>{DAY_LABEL[item.dayOfWeek]} · Tiết {item.periodNo} · {item.subjectName} · {classLabel(item.classId)}</option>
              ))}
            </select></label>
            <label><span>Ngày điểm danh</span><input className="live-input" type="date" value={date} onChange={(event) => changeDate(event.target.value)} /></label>
          </div>
          {slot && <div className="attendance-session-context">
            <div><span><CalendarCheck2 size={19} /></span><p><small>Môn học</small><strong>{slot.subjectName}</strong></p></div>
            <div><span><Users size={19} /></span><p><small>Lớp</small><strong>{classLabel(slot.classId)}</strong></p></div>
            <div><span><Clock3 size={19} /></span><p><small>Thời gian</small><strong>Tiết {slot.periodNo} · {slot.startTime || '—'}–{slot.endTime || '—'}</strong></p></div>
            <div><span><MapPin size={19} /></span><p><small>Phòng học</small><strong>{slot.roomCode || 'Chưa xếp phòng'}</strong></p></div>
          </div>}
          {slot && <div className={`attendance-save-state ${dirty || !hasSavedRegister ? 'dirty' : 'saved'}`}>
            {dirty || !hasSavedRegister ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{dirty ? 'Có thay đổi chưa lưu' : lastSavedAt}</span>
          </div>}
          {slot && sessionStatus.data && <div className={`attendance-session-policy state-${sessionStatus.data.state.toLowerCase()}`}>
            {sessionStatus.data.canMark ? <CheckCircle2 size={16} /> : <LockKeyhole size={16} />}
            <div><strong>{attendanceSessionLabel(sessionStatus.data.state)}</strong><small>{sessionStatus.data.message}</small></div>
            <span>{sessionStatus.data.startTime || '—'}–{sessionStatus.data.endTime || '—'}</span>
          </div>}
          {slot && (approvedLeaves.data?.length || 0) > 0 && <div className="attendance-save-state saved">
            <ShieldCheck size={15} />
            <span>{approvedLeaves.data!.length} học sinh có đơn nghỉ đã duyệt; hệ thống đã tự điền “Vắng có phép”.</span>
          </div>}
        </div>

        {!slot ? <div className="attendance-empty"><CalendarCheck2 size={34} /><strong>{attendanceSlots.length ? 'Chọn tiết học để bắt đầu' : 'Chưa có tiết học phù hợp'}</strong><span>{attendanceSlots.length ? 'Sổ điểm danh sẽ tự tải dữ liệu đã lưu theo ngày và tiết học.' : `Chỉ các tiết môn ${user?.mainSubject || 'chuyên ngành'} do thầy cô phụ trách mới được hiển thị tại đây.`}</span></div> : dayStatus.data?.attendanceRequired === false ? (
          <div className="attendance-holiday-state">
            <span><CalendarDays size={38} /></span>
            <div><small>Thông báo nghỉ từ nhà trường</small><strong>{dayStatus.data.title || 'Ngày nghỉ toàn trường'}</strong><p>{dayStatus.data.reason || 'Giáo viên không cần thực hiện điểm danh trong ngày này.'}</p><b>Thời gian nghỉ: {fmtDate(dayStatus.data.holidayStartDate || date)} → {fmtDate(dayStatus.data.holidayEndDate || date)}</b></div>
            <Badge tone="green">Đã miễn điểm danh</Badge>
          </div>
        ) : sessionStatus.data?.requiresUnlockReason ? (
          <div className="attendance-late-unlock">
            <div className="attendance-late-unlock-icon"><LockKeyhole size={34} /></div>
            <div className="attendance-late-unlock-copy"><small>Tiết học đã kết thúc</small><strong>Điểm danh muộn cần được ghi nhận lý do</strong><p>Để bảo đảm tính minh bạch của sổ chuyên cần, thầy/cô vui lòng mô tả cụ thể nguyên nhân chưa điểm danh trong thời gian tiết học.</p></div>
            <label><span>Lý do quên điểm danh <b>*</b></span><textarea rows={4} maxLength={1000} value={unlockReason} onChange={(event) => setUnlockReason(event.target.value)} placeholder="Ví dụ: Thiết bị lớp học mất kết nối mạng trong suốt tiết học…" /><small>{unlockReason.trim().length}/1000 ký tự · Tối thiểu 10 ký tự</small></label>
            <div className="attendance-late-unlock-note"><ShieldCheck size={17} /><span>Lý do và thời điểm mở khóa sẽ được lưu vào lịch sử hệ thống, đồng thời thông báo tới quản trị viên.</span></div>
            <button type="button" className="live-btn attendance-unlock-button" disabled={unlocking || unlockReason.trim().length < 10} onClick={unlockLateAttendance}><LockKeyhole size={16} /> {unlocking ? 'Đang mở khóa…' : 'Gửi lý do và mở khóa điểm danh'}</button>
          </div>
        ) : sessionStatus.data && !sessionStatus.data.canMark ? (
          <div className="attendance-locked-state">
            <span><Clock3 size={34} /></span><strong>{attendanceSessionLabel(sessionStatus.data.state)}</strong><p>{sessionStatus.data.message}</p><small>Thời gian tiết học: {sessionStatus.data.startTime || '—'}–{sessionStatus.data.endTime || '—'}</small>
          </div>
        ) : (
          <Async state={{ data: students.data, loading: students.loading || attendance.loading || approvedLeaves.loading || dayStatus.loading || sessionStatus.loading, error: students.error || attendance.error || approvedLeaves.error || dayStatus.error || sessionStatus.error }} empty="Lớp chưa có học sinh">
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
                    const hasApprovedLeave = approvedLeaveStudentIds.has(student.id);
                    return <tr key={student.id} data-status={mark.status}>
                      <td>{(students.data || []).findIndex((item) => item.id === student.id) + 1}</td>
                      <td><div className="attendance-student"><span>{student.fullName.split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase()}</span><p><strong>{student.fullName}</strong><small>{student.studentCode || 'Chưa có mã học sinh'}</small>{hasApprovedLeave && <b className="attendance-approved-leave"><ShieldCheck size={12} /> Đơn nghỉ đã duyệt</b>}</p></div></td>
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
                <p><ShieldCheck size={15} /> {sessionStatus.data?.state === 'LATE_UNLOCKED' || sessionStatus.data?.state === 'COMPLETED_LATE' ? `Điểm danh muộn · Lý do: ${sessionStatus.data.unlockReason}` : 'Cảnh báo chỉ gửi khi cần chú ý; vắng có phép từ đơn đã duyệt không tạo thông báo điểm danh trùng.'}</p>
              </footer>
            </>}
          </Async>
        )}
      </div>
    </Section>
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

function attendanceSessionLabel(state: AttendanceSessionStatus['state']) {
  return ({
    HOLIDAY: 'Ngày nghỉ',
    INVALID: 'Không đúng lịch học',
    UPCOMING: 'Tiết học chưa bắt đầu',
    OPEN: 'Đang trong thời gian điểm danh',
    LOCKED_REASON_REQUIRED: 'Đã khóa điểm danh',
    LATE_UNLOCKED: 'Đã mở khóa điểm danh muộn',
    COMPLETED: 'Đã hoàn tất điểm danh',
    COMPLETED_LATE: 'Đã hoàn tất điểm danh muộn',
  } as Record<AttendanceSessionStatus['state'], string>)[state];
}

/* ===== B4 — Bảng điểm ===== */
export function TeacherGradesLive() {
  const { user } = useAuth();
  const slots = useApi<TimetableSlot[]>('/me/timetable');
  const classes = useApi<SchoolClass[]>('/classes');
  const semesters = useApi<Semester[]>('/semesters');
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();

  const classOpts = useMemo(() => {
    const m: Record<string, true> = {};
    const mainSubject = user?.mainSubject?.trim().toLocaleLowerCase('vi');
    (slots.data || [])
      .filter((slot) => Boolean(mainSubject) && (
        slot.subjectId.trim().toLocaleLowerCase('vi') === mainSubject
        || slot.subjectName.trim().toLocaleLowerCase('vi') === mainSubject)
      )
      .forEach((slot) => (m[slot.classId] = true));
    (classes.data || [])
      .filter((schoolClass) => schoolClass.homeroomTeacherId === user?.id)
      .forEach((schoolClass) => (m[schoolClass.id] = true));
    return Object.keys(m);
  }, [classes.data, slots.data, user?.id, user?.mainSubject]);

  const [classId, setClassId] = useHashString('class', '');
  const [semesterId, setSemesterId] = useHashString('semester', '');
  const [selectedSubjectId, setSelectedSubjectId] = useHashString('subject', '');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!classId && classOpts.length) setClassId(classOpts[0]);
  }, [classId, classOpts, setClassId]);

  useEffect(() => {
    if (!semesterId && semesters.data?.length) {
      setSemesterId(semesters.data.find((semester) => semester.status === 'ACTIVE')?.id || semesters.data[0].id);
    }
  }, [semesterId, semesters.data, setSemesterId]);

  const gradebookContext = useApi<TeacherGradebookContext>(classId && semesterId
    ? `/me/gradebook-context?classId=${encodeURIComponent(classId)}&semesterId=${encodeURIComponent(semesterId)}`
    : null);
  const contextMatches = gradebookContext.data?.classId === classId && gradebookContext.data?.semesterId === semesterId;
  const contextSubjects = contextMatches ? gradebookContext.data?.subjects || [] : [];

  useEffect(() => {
    if (!contextMatches || !gradebookContext.data) return;
    const currentIsAvailable = gradebookContext.data.subjects.some((subject) => subject.subjectId === selectedSubjectId);
    if (!currentIsAvailable) setSelectedSubjectId(gradebookContext.data.subjectId);
  }, [contextMatches, gradebookContext.data, selectedSubjectId, setSelectedSubjectId]);

  const selectedSubject = contextSubjects.find((subject) => subject.subjectId === selectedSubjectId);
  const subjectId = selectedSubject?.subjectId || '';
  const canEdit = Boolean(selectedSubject?.editable);
  const students = useApi<ApiUser[]>(classId ? `/classes/${classId}/students` : null);
  const existing = useApi<Grade[]>(
    classId && subjectId && semesterId
      ? `/grades?classId=${encodeURIComponent(classId)}&semesterId=${encodeURIComponent(semesterId)}&subjectId=${encodeURIComponent(subjectId)}`
      : null,
  );
  const [scores, setScores] = useState<Record<string, string>>({});

  useEffect(() => {
    const m: Record<string, string> = {};
    (existing.data || []).forEach((grade) => (m[gradeKey(grade.studentId, grade.category, grade.assessmentIndex ?? 1)] = String(grade.score)));
    setScores(m);
  }, [existing.data]);

  const ready = Boolean(classId && semesterId && subjectId && cats.data?.length);
  const classMap = useMemo(() => new Map((classes.data || []).map((item) => [item.id, item.code])), [classes.data]);
  const subjectName = selectedSubject?.subjectName || '';
  const columns = useMemo(() => gradeColumns(cats.data || []), [cats.data]);
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
    return { student, values, average: weightedAverage(values, cats.data || []) };
  }), [students.data, cats.data, columns, scores]);

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
        <label><span>Lớp giảng dạy</span><select className="live-select" value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">— Chọn lớp —</option>{classOpts.map((id) => <option key={id} value={id}>{classMap.get(id) || id}</option>)}
        </select></label>
        <label><span>Học kỳ</span><select className="live-select" value={semesterId} onChange={(e) => setSemesterId(e.target.value)}>
          <option value="">— Chọn học kỳ —</option>{(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
        </select></label>
        {contextMatches && gradebookContext.data?.homeroomTeacher ? (
          <label><span>Môn học của lớp chủ nhiệm</span><select className="live-select" value={subjectId} onChange={(event) => setSelectedSubjectId(event.target.value)}>
            {contextSubjects.map((subject) => <option key={subject.subjectId} value={subject.subjectId}>{subject.subjectName}{subject.editable ? ' · Có thể chỉnh sửa' : ' · Chỉ xem'}</option>)}
          </select></label>
        ) : (
          <div className="gradebook-auto-subject"><span>Môn chuyên ngành</span><strong>{gradebookContext.loading ? 'Đang xác định…' : subjectName || '—'}</strong><small>Tự động theo phân công giảng dạy</small></div>
        )}
        {canEdit ? (
          <label className="gradebook-reason"><span>Lý do điều chỉnh (nếu có)</span><input className="live-input" placeholder="Ví dụ: cập nhật sau phúc khảo" value={reason} onChange={(e) => setReason(e.target.value)} /></label>
        ) : (
          <div className="gradebook-readonly-card"><Eye size={18} /><div><strong>Chế độ chỉ xem</strong><small>Điểm do giáo viên bộ môn {selectedSubject?.teacherName || 'phụ trách'} quản lý</small></div></div>
        )}
      </div>

      {ready && gradebookContext.data?.homeroomTeacher && (
        <div className={`gradebook-access-notice ${canEdit ? 'editable' : 'readonly'}`}>
          {canEdit ? <ShieldCheck size={18} /> : <LockKeyhole size={18} />}
          <span>{canEdit
            ? `Bạn là giáo viên chủ nhiệm và có thể cập nhật môn ${subjectName} thuộc chuyên ngành của mình.`
            : `Bạn là giáo viên chủ nhiệm nên được xem môn ${subjectName}, nhưng không thể thay đổi điểm ngoài chuyên ngành.`}</span>
        </div>
      )}

      {!ready ? <div className="gradebook-onboarding"><BarChart3 size={26} /><strong>Chọn lớp và học kỳ</strong><span>{gradebookContext.error || 'Môn học sẽ được hệ thống tự động xác định theo hồ sơ và phân công của giáo viên.'}</span></div> : existing.loading ? <div className="live-loading">Đang tải sổ điểm…</div> : (
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
  const [workspaceTab, setWorkspaceTab] = useState<'inbox' | 'compose'>('inbox');
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
      <div className="notification-workspace-tabs" role="tablist" aria-label="Không gian thông báo giáo viên">
        <button type="button" role="tab" aria-selected={workspaceTab === 'inbox'} className={workspaceTab === 'inbox' ? 'active' : ''} onClick={() => setWorkspaceTab('inbox')}><Inbox size={17} /><span>Hộp thư của tôi</span></button>
        <button type="button" role="tab" aria-selected={workspaceTab === 'compose'} className={workspaceTab === 'compose' ? 'active' : ''} onClick={() => setWorkspaceTab('compose')}><Megaphone size={17} /><span>Gửi thông báo lớp</span></button>
      </div>

      {workspaceTab === 'inbox' ? <NotificationsLive audience="teacher" /> : <>
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
      </>}
    </div>
  );
}

/* ===== B8 — Công nợ lớp chủ nhiệm ===== */
function teacherInvoiceStatus(invoice: Invoice) {
  if (invoice.status !== 'PAID' && invoice.dueDate && new Date(`${invoice.dueDate}T23:59:59`) < new Date()) return 'OVERDUE';
  return invoice.status;
}

export function TeacherFinanceLive() {
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const [periodId, setPeriodId] = useHashString('period', '');
  const summaries = useApi<FinanceClassSummary[]>(periodId
    ? `/finance/classes?periodId=${encodeURIComponent(periodId)}`
    : '/finance/classes');
  const [classId, setClassId] = useHashString('class', '');
  const [query, setQuery] = useHashString('q', '');
  const [status, setStatus] = useHashString('status', 'ALL');
  const [sending, setSending] = useState(false);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const toast = useToast();
  const invoiceUrl = classId
    ? `/invoices?classId=${encodeURIComponent(classId)}${periodId ? `&periodId=${encodeURIComponent(periodId)}` : ''}`
    : null;
  const invoices = useApi<Invoice[]>(invoiceUrl);

  useEffect(() => {
    if (!periodId && periods.data?.length) {
      const active = periods.data.find((item) => item.status === 'OPEN') || periods.data[0];
      setPeriodId(active.id);
    }
  }, [periodId, periods.data, setPeriodId]);

  useEffect(() => {
    const rows = summaries.data || [];
    if (!rows.length) {
      setClassId('');
      return;
    }
    if (!rows.some((item) => item.classId === classId)) setClassId(rows[0].classId);
  }, [classId, summaries.data, setClassId]);

  const selected = (summaries.data || []).find((item) => item.classId === classId);
  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('vi');
    return (invoices.data || []).filter((invoice) => {
      const matchesQuery = !normalized || invoice.code.toLocaleLowerCase('vi').includes(normalized)
        || invoice.studentName.toLocaleLowerCase('vi').includes(normalized);
      return matchesQuery && (status === 'ALL' || teacherInvoiceStatus(invoice) === status);
    });
  }, [invoices.data, query, status]);
  const total = (summaries.data || []).reduce((sum, item) => sum + item.totalAmount, 0);
  const paid = (summaries.data || []).reduce((sum, item) => sum + item.paidAmount, 0);
  const outstanding = total - paid;
  const overdue = (summaries.data || []).reduce((sum, item) => sum + item.overdueCount, 0);
  const selectedPeriod = (periods.data || []).find((item) => item.id === periodId);
  const activeFilterCount = (periodId ? 1 : 0) + (classId ? 1 : 0) + (query.trim() ? 1 : 0) + (status !== 'ALL' ? 1 : 0);

  const remindClass = async () => {
    if (!selected) return;
    if (!confirm(`Gửi nhắc hạn tới phụ huynh của các học sinh còn công nợ lớp ${selected.classCode}?`)) return;
    setSending(true);
    try {
      const suffix = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
      const result = await api.post<ClassReminderResult>(`/finance/homeroom/classes/${selected.classId}/remind${suffix}`);
      toast.show('ok', `Đã gửi ${result.invoiceCount} nhắc hạn tới ${result.recipientCount} phụ huynh`);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSending(false); }
  };

  const remindInvoice = async (invoice: Invoice) => {
    if (!confirm(`Gửi nhắc thanh toán tới phụ huynh của học sinh ${invoice.studentName}?`)) return;
    setSendingInvoiceId(invoice.id);
    try {
      const result = await api.post<ClassReminderResult>(`/finance/homeroom/invoices/${invoice.id}/remind`);
      toast.show('ok', `Đã gửi nhắc tới ${result.recipientCount} phụ huynh`);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSendingInvoiceId(null); }
  };

  const refresh = () => {
    periods.reload();
    summaries.reload();
    invoices.reload();
  };

  const resetFilters = () => {
    const activePeriod = (periods.data || []).find((item) => item.status === 'OPEN') || periods.data?.[0];
    setPeriodId(activePeriod?.id || '');
    setClassId('');
    setQuery('');
    setStatus('ALL');
  };

  return (
    <div className="finance-page teacher-finance-page">
      {toast.node}
      <header className="finance-hero teacher-finance-hero">
        <div><span className="finance-eyebrow"><ShieldCheck size={15} /> Không gian tài chính lớp chủ nhiệm</span><h2>Đồng hành cùng phụ huynh, giảm tải cho nhà trường</h2><p>Theo dõi tiến độ khoản thu của đúng lớp chủ nhiệm và gửi nhắc hạn tập trung tới phụ huynh còn công nợ.</p></div>
      </header>

      <section className="teacher-finance-controls" aria-label="Bộ lọc công nợ">
        <header>
          <div className="teacher-filter-heading"><span><SlidersHorizontal size={20} /></span><div><h3>Bộ lọc và phạm vi theo dõi</h3><p>Chọn đợt thu, lớp và trạng thái để tìm đúng học sinh cần xử lý.</p></div></div>
          <strong className="teacher-filter-count">{activeFilterCount} điều kiện đang áp dụng</strong>
        </header>
        <div className="teacher-finance-filter-grid">
          <label><span>Đợt thu</span><select className="live-input" value={periodId} onChange={(event) => { setPeriodId(event.target.value); setClassId(''); }}>
            <option value="">Tất cả đợt thu</option>{(periods.data || []).map((period) => <option key={period.id} value={period.id}>{period.name || period.code} · {period.status === 'OPEN' ? 'Đang thu' : period.status === 'CLOSED' ? 'Đã đóng' : 'Bản nháp'}</option>)}
          </select></label>
          <label><span>Lớp chủ nhiệm</span><select className="live-input" value={classId} onChange={(event) => setClassId(event.target.value)}>
            {(summaries.data || []).length === 0 && <option value="">Chưa có lớp phù hợp</option>}
            {(summaries.data || []).map((summary) => <option key={summary.classId} value={summary.classId}>Lớp {summary.classCode} · {summary.invoiceCount} hóa đơn</option>)}
          </select></label>
          <label className="teacher-filter-search"><span>Tìm trong danh sách</span><div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên học sinh hoặc mã hóa đơn" /></div></label>
          <label><span>Trạng thái công nợ</span><select className="live-input" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="ALL">Tất cả trạng thái</option><option value="PENDING">Chưa thanh toán</option><option value="PARTIAL">Đã thu một phần</option><option value="PAID">Đã thanh toán</option><option value="OVERDUE">Quá hạn</option>
          </select></label>
        </div>
        <footer>
          <div className="teacher-filter-context"><UsersRound size={16} /><span><b>{selectedPeriod?.name || 'Tất cả đợt thu'}</b>{selected ? ` · Lớp ${selected.classCode}` : ''} · Hiển thị <b>{filtered.length} hóa đơn</b></span></div>
          <div><button className="live-btn ghost" type="button" onClick={resetFilters}><RotateCcw size={15} /> Đặt lại</button><button className="live-btn" type="button" onClick={refresh}><RefreshCw size={15} /> Đồng bộ dữ liệu</button></div>
        </footer>
      </section>

      {selected && <div className="teacher-debt-primary"><Section title={`Công nợ lớp ${selected.classCode}`} subtitle={`${selected.paidCount}/${selected.invoiceCount} học sinh đã hoàn thành · Còn ${money(selected.outstanding)}`} wide
        action={!selected.completed ? <button className="live-btn" type="button" disabled={sending} onClick={remindClass}><BellRing size={15} /> {sending ? 'Đang gửi…' : 'Nhắc phụ huynh còn nợ'}</button> : <Badge tone="green">Lớp đã hoàn thành</Badge>}>
        <div className="teacher-active-list-filter"><SlidersHorizontal size={16} /><span>Danh sách đang áp dụng bộ lọc phía trên</span><strong>{filtered.length} hóa đơn</strong></div>
        <Async state={{ ...invoices, data: filtered }} empty="Không có hóa đơn phù hợp">
          {(rows) => <PaginatedData items={rows} pageSize={10} itemLabel="hóa đơn" resetKey={`${classId}-${periodId}-${query}-${status}`}>{(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table teacher-finance-table"><thead><tr><th>Học sinh</th><th>Hóa đơn</th><th>Phải thu</th><th>Đã thu</th><th>Còn lại</th><th>Hạn thanh toán</th><th>Trạng thái</th><th>Nhắc phụ huynh</th></tr></thead><tbody>{pageRows.map((invoice) => { const invoiceStatus = teacherInvoiceStatus(invoice); return <tr key={invoice.id}><td><strong>{invoice.studentName}</strong></td><td><strong>{invoice.code}</strong><small>{fmtDateTime(invoice.issuedAt)}</small></td><td>{money(invoice.totalAmount)}</td><td className="finance-paid-value">{money(invoice.paidAmount)}</td><td><strong>{money(invoice.totalAmount - invoice.paidAmount)}</strong></td><td>{fmtDate(invoice.dueDate)}</td><td><StatusPill value={invoiceStatus} /></td><td>{invoiceStatus === 'PAID' ? <span className="finance-complete-label"><CheckCircle2 size={14} /> Đã xong</span> : <button className="live-btn subtle" type="button" disabled={sendingInvoiceId === invoice.id} onClick={() => remindInvoice(invoice)}><BellRing size={14} /> {sendingInvoiceId === invoice.id ? 'Đang gửi…' : 'Nhắc riêng'}</button>}</td></tr>; })}</tbody></table></div>}</PaginatedData>}
        </Async>
        <div className="finance-guidance"><ReceiptText size={18} /><p>Giáo viên chủ nhiệm chỉ theo dõi và gửi nhắc hạn. Mọi thao tác tạo khoản thu, phát hành hóa đơn và ghi nhận thanh toán vẫn do Admin thực hiện để bảo đảm đối soát.</p></div>
      </Section></div>}

      <section className="finance-kpi-grid" aria-label="Tổng quan công nợ lớp chủ nhiệm">
        <article className="finance-kpi-card primary"><span><TrendingUp size={20} /></span><div><small>Đã thu</small><strong>{money(paid)}</strong><p>{total ? (paid * 100 / total).toFixed(1) : 0}% tổng phải thu</p></div></article>
        <article className="finance-kpi-card"><span><WalletCards size={20} /></span><div><small>Còn phải thu</small><strong>{money(outstanding)}</strong><p>{(summaries.data || []).length} lớp chủ nhiệm có dữ liệu</p></div></article>
        <article className="finance-kpi-card success"><span><CheckCircle2 size={20} /></span><div><small>Lớp hoàn thành</small><strong>{(summaries.data || []).filter((item) => item.completed).length}</strong><p>Đã đạt 100% yêu cầu tài chính</p></div></article>
        <article className={`finance-kpi-card ${overdue ? 'danger' : ''}`}><span><AlertTriangle size={20} /></span><div><small>Hóa đơn quá hạn</small><strong>{overdue}</strong><p>Cần chủ động trao đổi với phụ huynh</p></div></article>
      </section>

      <div className="teacher-finance-list-section"><Section title={`Danh sách lớp chủ nhiệm (${(summaries.data || []).length})`} subtitle="Chọn một lớp để mở danh sách công nợ và thực hiện nhắc hạn" wide
        action={<span className="teacher-list-hint"><GraduationCap size={15} /> Chọn lớp cần theo dõi</span>}>
        <Async state={summaries} empty="Chưa có khoản thu nào được phát hành cho lớp chủ nhiệm">
          {(rows) => <div className="finance-class-grid teacher-class-finance-grid">{rows.map((summary) => <button type="button" key={summary.classId} className={`teacher-finance-class ${classId === summary.classId ? 'selected' : ''} ${summary.completed ? 'complete' : ''}`} onClick={() => setClassId(summary.classId)}>
            <header><span><GraduationCap size={17} /></span><div><strong>Lớp {summary.classCode}</strong><small>{summary.gradeLevel || 'Chưa xác định khối'} · {summary.invoiceCount} học sinh</small></div><StatusPill value={summary.completed ? 'Đã hoàn thành' : summary.overdueCount ? 'Có quá hạn' : 'Đang thu'} /></header>
            <div className="finance-mini-progress"><span style={{ width: `${Math.min(100, summary.collectionRate)}%` }} /></div>
            <footer><span>{summary.collectionRate.toFixed(1)}% đã thu</span><strong>Còn {money(summary.outstanding)}</strong></footer>
          </button>)}</div>}
        </Async>
      </Section></div>

    </div>
  );
}

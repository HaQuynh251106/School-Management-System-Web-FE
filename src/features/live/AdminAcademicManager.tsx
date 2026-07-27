import { useState } from 'react';
import type { ReactNode } from 'react';
import { Archive, BookOpen, CalendarDays, DoorOpen, GraduationCap, Pencil, PlayCircle, Plus, Save, School, Search, Trash2 } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type { AcademicYear, ApiUser, Room, SchoolClass, Semester, Subject } from '../../api/types';
import { Badge, FunctionTabs, Section, StatusPill, viLabel } from '../../components/ui';
import { Async, fmtDate, useToast } from './common';
import { Field, Modal } from './Modal';
import { YearEndManager } from './AdminLive';
import { useHashString } from '../../api/urlState';

type EditorKind = 'year' | 'semester' | 'class' | 'subject' | 'room';
type EditorState = { kind: EditorKind; id: string; data: Record<string, string | number> };

function SearchBox({ value, onChange, placeholder = 'Tìm kiếm...' }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return <label className="academic-search"><Search size={16} /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} /></label>;
}

function ActionButton({ label, tone = 'default', disabled, onClick, children }: {
  label: string; tone?: 'default' | 'success' | 'danger'; disabled?: boolean; onClick: () => void; children: ReactNode;
}) {
  return <button type="button" className={`academic-action ${tone}`} title={label} aria-label={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

function textMatches(query: string, ...values: Array<string | number | null | undefined>) {
  const needle = query.trim().toLocaleLowerCase('vi-VN');
  return !needle || values.some((value) => String(value ?? '').toLocaleLowerCase('vi-VN').includes(needle));
}

export function AdminAcademicLive() {
  const years = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const subjects = useApi<Subject[]>('/subjects');
  const rooms = useApi<Room[]>('/rooms');
  const teachers = useApi<ApiUser[]>('/users?role=TEACHER');
  const toast = useToast();

  const [yf, setYf] = useState({ code: '', name: '', startDate: '', endDate: '' });
  const [sf, setSf] = useState({ academicYearId: '', code: '', name: '', sequence: 1, startDate: '', endDate: '' });
  const [cf, setCf] = useState({ code: '', name: '', gradeLevel: 'K10', studyShift: 'MORNING', academicYearId: '', roomId: '', homeroomTeacherId: '', capacity: 45 });
  const [sj, setSj] = useState({ code: '', name: '', coefficient: 1 });
  const [rm, setRm] = useState({ code: '', name: '', capacity: 45, shiftMode: 'BOTH' });
  const [yearQuery, setYearQuery] = useHashString('q_years', '');
  const [semesterQuery, setSemesterQuery] = useHashString('q_semesters', '');
  const [classQuery, setClassQuery] = useHashString('q_classes', '');
  const [subjectQuery, setSubjectQuery] = useHashString('q_subjects', '');
  const [roomQuery, setRoomQuery] = useHashString('q_rooms', '');
  const query = { years: yearQuery, semesters: semesterQuery, classes: classQuery, subjects: subjectQuery, rooms: roomQuery };
  const [yearStatus, setYearStatus] = useHashString('year_status', '');
  const [semesterYear, setSemesterYear] = useHashString('semester_year', '');
  const [classYear, setClassYear] = useHashString('class_year', '');
  const [assigningClassId, setAssigningClassId] = useState('');
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);

  const activeYears = (years.data ?? []).filter((year) => year.status !== 'CLOSED');
  const yearName = (id?: string) => (years.data ?? []).find((year) => year.id === id)?.code || '—';
  const selectedSemesterYear = (years.data ?? []).find((year) => year.id === sf.academicYearId);
  const roomSupportsShift = (room: Room, shift: string) => shift === 'AFTERNOON'
    ? room.supportsAfternoon !== false
    : room.supportsMorning !== false;
  const roomAssignment = (roomId: string, academicYearId: string, studyShift: string, excludeClassId = '') =>
    (classes.data ?? []).find((item) => item.id !== excludeClassId
      && item.roomId === roomId
      && item.academicYearId === academicYearId
      && (item.studyShift || 'MORNING') === studyShift);

  const run = async (task: () => Promise<unknown>, success: string, reloads: Array<() => void>) => {
    setBusy(true);
    try {
      await task();
      reloads.forEach((reload) => reload());
      toast.show('ok', success);
      return true;
    } catch (error: any) {
      toast.show('err', error.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const addYear = async () => {
    if (!yf.code || !yf.startDate || !yf.endDate) return toast.show('err', 'Nhập mã và đầy đủ thời gian năm học');
    if (await run(() => api.post('/academicYears', { ...yf, name: yf.name || yf.code }), 'Đã tạo năm học ở trạng thái dự kiến', [years.reload])) {
      setYf({ code: '', name: '', startDate: '', endDate: '' });
    }
  };

  const addSemester = async () => {
    if (!sf.academicYearId || !sf.code || !sf.startDate || !sf.endDate) return toast.show('err', 'Chọn năm học và nhập đầy đủ thông tin học kỳ');
    if (await run(() => api.post('/semesters', { ...sf, name: sf.name || sf.code }), 'Đã tạo học kỳ ở trạng thái dự kiến', [semesters.reload])) {
      setSf({ academicYearId: sf.academicYearId, code: '', name: '', sequence: sf.sequence + 1, startDate: '', endDate: '' });
    }
  };

  const addClass = async () => {
    if (!cf.code || !cf.academicYearId) return toast.show('err', 'Nhập mã lớp và chọn năm học');
    if (await run(() => api.post('/classes', { ...cf, name: cf.name || `Lớp ${cf.code}`, homeroomTeacherId: cf.homeroomTeacherId || null }), 'Đã tạo lớp học', [classes.reload])) {
      setCf({ code: '', name: '', gradeLevel: cf.gradeLevel, studyShift: cf.studyShift, academicYearId: cf.academicYearId, roomId: '', homeroomTeacherId: '', capacity: 45 });
    }
  };

  const addSubject = async () => {
    if (!sj.code || !sj.name) return toast.show('err', 'Nhập mã và tên môn học');
    if (await run(() => api.post('/subjects', sj), 'Đã thêm môn học', [subjects.reload])) setSj({ code: '', name: '', coefficient: 1 });
  };

  const addRoom = async () => {
    if (!rm.code || rm.capacity < 1) return toast.show('err', 'Nhập mã và sức chứa phòng');
    const payload = { code: rm.code, name: rm.name, capacity: rm.capacity,
      supportsMorning: rm.shiftMode !== 'AFTERNOON', supportsAfternoon: rm.shiftMode !== 'MORNING' };
    if (await run(() => api.post('/rooms', payload), 'Đã thêm phòng học', [rooms.reload])) setRm({ code: '', name: '', capacity: 45, shiftMode: rm.shiftMode });
  };

  const assignHomeroomTeacher = async (classId: string, teacherId: string) => {
    setAssigningClassId(classId);
    await run(
      () => teacherId ? api.put(`/classes/${classId}/homeroom-teacher`, { teacherId }) : api.del(`/classes/${classId}/homeroom-teacher`),
      teacherId ? 'Đã phân công giáo viên chủ nhiệm' : 'Đã bỏ phân công giáo viên chủ nhiệm',
      [classes.reload],
    );
    setAssigningClassId('');
  };

  const changeStatus = async (kind: 'year' | 'semester', item: AcademicYear | Semester, status: 'ACTIVE' | 'CLOSED') => {
    const noun = kind === 'year' ? 'năm học' : 'học kỳ';
    if (!window.confirm(`${status === 'ACTIVE' ? 'Kích hoạt' : 'Đóng'} ${noun} ${item.name}?`)) return;
    const base = kind === 'year' ? '/academicYears' : '/semesters';
    await run(() => api.put(`${base}/${item.id}/status`, { status }), `Đã chuyển ${noun} sang ${viLabel(status).toLowerCase()}`, [years.reload, semesters.reload]);
  };

  const remove = async (kind: EditorKind, id: string, label: string) => {
    if (!window.confirm(`Xóa ${label}? Dữ liệu đang được sử dụng sẽ được hệ thống bảo vệ và không cho xóa.`)) return;
    const routes: Record<EditorKind, string> = { year: 'academicYears', semester: 'semesters', class: 'classes', subject: 'subjects', room: 'rooms' };
    const reloads: Record<EditorKind, Array<() => void>> = {
      year: [years.reload], semester: [semesters.reload], class: [classes.reload], subject: [subjects.reload], room: [rooms.reload],
    };
    await run(() => api.del(`/${routes[kind]}/${id}`), `Đã xóa ${label}`, reloads[kind]);
  };

  const openEditor = (kind: EditorKind, item: AcademicYear | Semester | SchoolClass | Subject | Room) => {
    if (kind === 'year') {
      const value = item as AcademicYear;
      setEditor({ kind, id: value.id, data: { code: value.code, name: value.name, startDate: value.startDate || '', endDate: value.endDate || '' } });
    } else if (kind === 'semester') {
      const value = item as Semester;
      setEditor({ kind, id: value.id, data: { academicYearId: value.academicYearId, code: value.code, name: value.name, sequence: value.sequence, startDate: value.startDate || '', endDate: value.endDate || '' } });
    } else if (kind === 'class') {
      const value = item as SchoolClass;
      setEditor({ kind, id: value.id, data: { code: value.code, name: value.name, gradeLevel: value.gradeLevel, studyShift: value.studyShift || 'MORNING', academicYearId: value.academicYearId || '', roomId: value.roomId || '', capacity: value.capacity || 45 } });
    } else if (kind === 'subject') {
      const value = item as Subject;
      setEditor({ kind, id: value.id, data: { code: value.code, name: value.name, coefficient: value.coefficient || 1 } });
    } else {
      const value = item as Room;
      setEditor({ kind, id: value.id, data: { code: value.code, name: value.name || '', capacity: value.capacity || 45,
        shiftMode: value.supportsMorning !== false && value.supportsAfternoon !== false ? 'BOTH' : value.supportsAfternoon !== false ? 'AFTERNOON' : 'MORNING' } });
    }
  };

  const saveEditor = async () => {
    if (!editor) return;
    const routes: Record<EditorKind, string> = { year: 'academicYears', semester: 'semesters', class: 'classes', subject: 'subjects', room: 'rooms' };
    const reloads: Record<EditorKind, Array<() => void>> = {
      year: [years.reload], semester: [semesters.reload], class: [classes.reload], subject: [subjects.reload], room: [rooms.reload],
    };
    const { shiftMode, ...roomData } = editor.data;
    const payload = editor.kind === 'room'
      ? { ...roomData, supportsMorning: shiftMode !== 'AFTERNOON', supportsAfternoon: shiftMode !== 'MORNING' }
      : editor.data;
    if (await run(() => api.put(`/${routes[editor.kind]}/${editor.id}`, payload), 'Đã lưu thay đổi', reloads[editor.kind])) setEditor(null);
  };

  const editField = (key: string, value: string | number) => setEditor((current) => current ? ({ ...current, data: { ...current.data, [key]: value } }) : current);
  const filteredYears = (years.data ?? []).filter((year) => (!yearStatus || year.status === yearStatus) && textMatches(query.years, year.code, year.name));
  const filteredSemesters = (semesters.data ?? []).filter((semester) => (!semesterYear || semester.academicYearId === semesterYear) && textMatches(query.semesters, semester.code, semester.name, yearName(semester.academicYearId)));
  const filteredClasses = (classes.data ?? []).filter((schoolClass) => (!classYear || schoolClass.academicYearId === classYear) && textMatches(query.classes, schoolClass.code, schoolClass.name, schoolClass.gradeLevel, schoolClass.homeroomTeacherName));
  const filteredSubjects = (subjects.data ?? []).filter((subject) => textMatches(query.subjects, subject.code, subject.name));
  const filteredRooms = (rooms.data ?? []).filter((room) => textMatches(query.rooms, room.code, room.name, room.capacity,
    room.supportsMorning !== false ? 'ca sáng' : '', room.supportsAfternoon !== false ? 'ca chiều' : ''));

  const tableActions = (kind: EditorKind, item: AcademicYear | Semester | SchoolClass | Subject | Room, editable = true, deletable = true) => (
    <div className="academic-row-actions">
      {editable && <ActionButton label="Sửa" disabled={busy} onClick={() => openEditor(kind, item)}><Pencil size={15} /></ActionButton>}
      {deletable && <ActionButton label="Xóa" tone="danger" disabled={busy} onClick={() => remove(kind, item.id, 'name' in item && item.name ? item.name : item.id)}><Trash2 size={15} /></ActionButton>}
    </div>
  );

  return (
    <>
      {toast.node}
      <div className="academic-lifecycle-note"><CalendarDays size={20} /><div><strong>Quy trình năm học an toàn</strong><span>Năm học đầu tiên được tạo và kích hoạt thủ công. Từ các năm tiếp theo, dùng mục Tổng kết năm để hệ thống tự tổng kết, tạo cơ cấu mới, xếp lớp và khóa dữ liệu cũ trong một quy trình.</span></div></div>
      <FunctionTabs tabs={[
        { id: 'years', label: 'Năm học', Icon: CalendarDays, content: (
          <Section title="Năm học" subtitle="Quản lý thời gian và vòng đời năm học" wide>
            <div className="live-toolbar academic-create-bar">
              <input className="live-input" placeholder="Mã (2026-2027)" value={yf.code} onChange={(e) => setYf({ ...yf, code: e.target.value })} />
              <input className="live-input grow" placeholder="Tên năm học" value={yf.name} onChange={(e) => setYf({ ...yf, name: e.target.value })} />
              <input className="live-input" type="date" title="Ngày bắt đầu" value={yf.startDate} onChange={(e) => setYf({ ...yf, startDate: e.target.value })} />
              <input className="live-input" type="date" title="Ngày kết thúc" value={yf.endDate} onChange={(e) => setYf({ ...yf, endDate: e.target.value })} />
              <button className="live-btn" disabled={busy} onClick={addYear}><Plus size={15} /> Tạo năm học</button>
            </div>
            <div className="academic-filter-bar"><SearchBox value={query.years} onChange={setYearQuery} placeholder="Tìm mã hoặc tên năm học" /><select className="live-select" value={yearStatus} onChange={(e) => setYearStatus(e.target.value)}><option value="">Tất cả trạng thái</option><option value="PLANNED">Dự kiến</option><option value="ACTIVE">Đang hoạt động</option><option value="CLOSED">Đã đóng</option></select></div>
            <Async paginate resetKey={`${query.years}-${yearStatus}`} state={{ ...years, data: years.data ? filteredYears : null }} itemLabel="năm học">{(list) => (
              <table className="live-table academic-table"><thead><tr><th>Mã</th><th>Tên</th><th>Thời gian</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{list.map((year) => <tr key={year.id}>
                <td><strong>{year.code}</strong></td><td>{year.name}</td><td>{fmtDate(year.startDate)} → {fmtDate(year.endDate)}</td><td><StatusPill value={year.status} /></td>
                <td><div className="academic-row-actions">{year.status === 'PLANNED' && <><ActionButton label="Sửa" disabled={busy} onClick={() => openEditor('year', year)}><Pencil size={15} /></ActionButton><ActionButton label="Kích hoạt" tone="success" disabled={busy} onClick={() => changeStatus('year', year, 'ACTIVE')}><PlayCircle size={15} /></ActionButton><ActionButton label="Xóa" tone="danger" disabled={busy} onClick={() => remove('year', year.id, year.name)}><Trash2 size={15} /></ActionButton></>}{year.status === 'ACTIVE' && <span className="academic-locked-note active">Chuyển năm tại mục Tổng kết</span>}{year.status === 'CLOSED' && <span className="academic-locked-note">Đã khóa dữ liệu</span>}</div></td>
              </tr>)}</tbody></table>
            )}</Async>
          </Section>
        ) },
        { id: 'sem', label: 'Học kỳ', Icon: CalendarDays, content: (
          <Section title="Học kỳ" subtitle="Học kỳ phải nằm trong thời gian của năm học" wide>
            <div className="live-toolbar academic-create-bar">
              <select className="live-select" value={sf.academicYearId} onChange={(e) => setSf({ ...sf, academicYearId: e.target.value })}><option value="">— Năm học —</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.code} · {viLabel(year.status)}</option>)}</select>
              <input className="live-input" placeholder="Mã (HK1)" value={sf.code} onChange={(e) => setSf({ ...sf, code: e.target.value })} />
              <input className="live-input grow" placeholder="Tên học kỳ" value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} />
              <input className="live-input" type="number" min="1" max="4" title="Thứ tự" value={sf.sequence} onChange={(e) => setSf({ ...sf, sequence: Number(e.target.value) })} />
              <input className="live-input" type="date" min={selectedSemesterYear?.startDate} max={selectedSemesterYear?.endDate} value={sf.startDate} onChange={(e) => setSf({ ...sf, startDate: e.target.value })} />
              <input className="live-input" type="date" min={selectedSemesterYear?.startDate} max={selectedSemesterYear?.endDate} value={sf.endDate} onChange={(e) => setSf({ ...sf, endDate: e.target.value })} />
              <button className="live-btn" disabled={busy} onClick={addSemester}><Plus size={15} /> Tạo học kỳ</button>
            </div>
            <div className="academic-filter-bar"><SearchBox value={query.semesters} onChange={setSemesterQuery} placeholder="Tìm học kỳ" /><select className="live-select" value={semesterYear} onChange={(e) => setSemesterYear(e.target.value)}><option value="">Tất cả năm học</option>{(years.data ?? []).map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></div>
            <Async paginate resetKey={`${query.semesters}-${semesterYear}`} state={{ ...semesters, data: semesters.data ? filteredSemesters : null }} itemLabel="học kỳ">{(list) => (
              <table className="live-table academic-table"><thead><tr><th>Năm học</th><th>Học kỳ</th><th>Thứ tự</th><th>Thời gian</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{list.map((semester) => <tr key={semester.id}>
                <td>{yearName(semester.academicYearId)}</td><td><strong>{semester.code}</strong><small className="academic-cell-note">{semester.name}</small></td><td>{semester.sequence}</td><td>{fmtDate(semester.startDate)} → {fmtDate(semester.endDate)}</td><td><StatusPill value={semester.status} /></td>
                <td><div className="academic-row-actions">{semester.status === 'PLANNED' && <><ActionButton label="Sửa" disabled={busy} onClick={() => openEditor('semester', semester)}><Pencil size={15} /></ActionButton><ActionButton label="Kích hoạt" tone="success" disabled={busy} onClick={() => changeStatus('semester', semester, 'ACTIVE')}><PlayCircle size={15} /></ActionButton><ActionButton label="Xóa" tone="danger" disabled={busy} onClick={() => remove('semester', semester.id, semester.name)}><Trash2 size={15} /></ActionButton></>}{semester.status === 'ACTIVE' && <ActionButton label="Đóng học kỳ" disabled={busy} onClick={() => changeStatus('semester', semester, 'CLOSED')}><Archive size={15} /></ActionButton>}{semester.status === 'CLOSED' && <span className="academic-locked-note">Đã khóa</span>}</div></td>
              </tr>)}</tbody></table>
            )}</Async>
          </Section>
        ) },
        { id: 'classes', label: 'Lớp', Icon: School, content: (
          <Section title="Lớp học" subtitle="Quản lý lớp, sức chứa và giáo viên chủ nhiệm" wide>
            <div className="live-toolbar academic-create-bar">
              <input className="live-input" placeholder="Mã lớp (10A1)" value={cf.code} onChange={(e) => setCf({ ...cf, code: e.target.value })} /><input className="live-input grow" placeholder="Tên lớp" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
              <select className="live-select" value={cf.gradeLevel} onChange={(e) => setCf({ ...cf, gradeLevel: e.target.value })}>{[6,7,8,9,10,11,12].map((grade) => <option key={grade} value={`K${grade}`}>Khối {grade}</option>)}</select>
              <select className="live-select class-shift-select" value={cf.studyShift} onChange={(e) => setCf({ ...cf, studyShift: e.target.value, roomId: '' })}><option value="MORNING">Ca sáng</option><option value="AFTERNOON">Ca chiều</option></select>
              <select className="live-select" value={cf.academicYearId} onChange={(e) => setCf({ ...cf, academicYearId: e.target.value, roomId: '' })}><option value="">— Năm học —</option>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select>
              <select className="live-select class-room-select" value={cf.roomId} onChange={(e) => setCf({ ...cf, roomId: e.target.value })}>
                <option value="">— Phòng học tùy chọn —</option>
                {(rooms.data ?? []).filter((room) => roomSupportsShift(room, cf.studyShift)).map((room) => {
                  const assigned = roomAssignment(room.id, cf.academicYearId, cf.studyShift);
                  return <option key={room.id} value={room.id} disabled={Boolean(assigned)}>{room.code}{assigned ? ` · Đã giao lớp ${assigned.code}` : ` · ${room.name || 'Phòng học'}`}</option>;
                })}
              </select>
              <input className="live-input" type="number" min="1" max="100" title="Sĩ số tối đa" value={cf.capacity} onChange={(e) => setCf({ ...cf, capacity: Number(e.target.value) })} />
              <select className="live-select" value={cf.homeroomTeacherId} onChange={(e) => setCf({ ...cf, homeroomTeacherId: e.target.value })}><option value="">— GVCN tùy chọn —</option>{(teachers.data ?? []).filter((teacher) => teacher.status === 'ACTIVE').map((teacher) => <option key={teacher.id} value={teacher.id}>{teacher.fullName}</option>)}</select>
              <button className="live-btn" disabled={busy} onClick={addClass}><Plus size={15} /> Tạo lớp</button>
            </div>
            <div className="academic-filter-bar"><SearchBox value={query.classes} onChange={setClassQuery} placeholder="Tìm lớp hoặc giáo viên chủ nhiệm" /><select className="live-select" value={classYear} onChange={(e) => setClassYear(e.target.value)}><option value="">Tất cả năm học</option>{(years.data ?? []).map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></div>
            <Async paginate resetKey={`${query.classes}-${classYear}`} state={{ ...classes, data: classes.data ? filteredClasses : null }} itemLabel="lớp học">{(list) => (
              <table className="live-table academic-table"><thead><tr><th>Mã lớp</th><th>Năm học</th><th>Khối</th><th>Ca học</th><th>Phòng học</th><th>Sĩ số</th><th>Giáo viên chủ nhiệm</th><th>Thao tác</th></tr></thead><tbody>{list.map((schoolClass) => <tr key={schoolClass.id}>
                <td><strong>{schoolClass.code}</strong><small className="academic-cell-note">{schoolClass.name}</small></td><td>{yearName(schoolClass.academicYearId)}</td><td><Badge tone="violet">{schoolClass.gradeLevel}</Badge></td><td><span className={`class-shift-badge ${(schoolClass.studyShift || 'MORNING').toLowerCase()}`}>{schoolClass.studyShift === 'AFTERNOON' ? 'Ca chiều' : 'Ca sáng'}</span></td><td>{schoolClass.roomCode ? <span className="class-room-badge"><DoorOpen size={14} />{schoolClass.roomCode}</span> : <span className="academic-cell-note">Chưa phân phòng</span>}</td><td>{schoolClass.studentCount}/{schoolClass.capacity || 45}</td>
                <td><select className="live-select homeroom-teacher-select" value={schoolClass.homeroomTeacherId || ''} disabled={assigningClassId === schoolClass.id || teachers.loading} onChange={(event) => assignHomeroomTeacher(schoolClass.id, event.target.value)}><option value="">— Chưa phân công —</option>{(teachers.data ?? []).map((teacher) => <option key={teacher.id} value={teacher.id} disabled={teacher.status !== 'ACTIVE'}>{teacher.fullName} · {teacher.mainSubject || 'Chưa có chuyên ngành'}</option>)}</select></td>
                <td>{tableActions('class', schoolClass)}</td>
              </tr>)}</tbody></table>
            )}</Async>
          </Section>
        ) },
        { id: 'subjects', label: 'Môn', Icon: BookOpen, content: (
          <Section title="Môn học" subtitle="Quản lý danh mục và hệ số tổng kết" wide>
            <div className="live-toolbar academic-create-bar"><input className="live-input" placeholder="Mã môn" value={sj.code} onChange={(e) => setSj({ ...sj, code: e.target.value })} /><input className="live-input grow" placeholder="Tên môn" value={sj.name} onChange={(e) => setSj({ ...sj, name: e.target.value })} /><input className="live-input" type="number" min="0.5" max="10" step="0.5" value={sj.coefficient} onChange={(e) => setSj({ ...sj, coefficient: Number(e.target.value) })} /><button className="live-btn" disabled={busy} onClick={addSubject}><Plus size={15} /> Thêm môn</button></div>
            <div className="academic-filter-bar"><SearchBox value={query.subjects} onChange={setSubjectQuery} placeholder="Tìm mã hoặc tên môn" /></div>
            <Async paginate resetKey={query.subjects} state={{ ...subjects, data: subjects.data ? filteredSubjects : null }} itemLabel="môn học">{(list) => <table className="live-table academic-table"><thead><tr><th>Mã</th><th>Tên môn</th><th>Hệ số tổng kết</th><th>Thao tác</th></tr></thead><tbody>{list.map((subject) => <tr key={subject.id}><td><strong>{subject.code}</strong></td><td>{subject.name}</td><td>{subject.coefficient || 1}</td><td>{tableActions('subject', subject)}</td></tr>)}</tbody></table>}</Async>
          </Section>
        ) },
        { id: 'rooms', label: 'Phòng', Icon: DoorOpen, content: (
          <Section title="Phòng học" subtitle="Cấu hình ca phục vụ và theo dõi phòng đã được giao cho từng lớp" wide>
            <div className="live-toolbar academic-create-bar"><input className="live-input" placeholder="Mã phòng" value={rm.code} onChange={(e) => setRm({ ...rm, code: e.target.value })} /><input className="live-input grow" placeholder="Tên phòng" value={rm.name} onChange={(e) => setRm({ ...rm, name: e.target.value })} /><select className="live-select" aria-label="Ca phục vụ của phòng" value={rm.shiftMode} onChange={(e) => setRm({ ...rm, shiftMode: e.target.value })}><option value="BOTH">Cả ca sáng và chiều</option><option value="MORNING">Chỉ ca sáng</option><option value="AFTERNOON">Chỉ ca chiều</option></select><input className="live-input" type="number" min="1" max="1000" value={rm.capacity} onChange={(e) => setRm({ ...rm, capacity: Number(e.target.value) })} /><button className="live-btn" disabled={busy} onClick={addRoom}><Plus size={15} /> Thêm phòng</button></div>
            <div className="academic-filter-bar"><SearchBox value={query.rooms} onChange={setRoomQuery} placeholder="Tìm mã hoặc tên phòng" /></div>
            <Async paginate resetKey={query.rooms} state={{ ...rooms, data: rooms.data ? filteredRooms : null }} itemLabel="phòng học">{(list) => <table className="live-table academic-table"><thead><tr><th>Mã</th><th>Tên phòng</th><th>Ca phục vụ</th><th>Lớp đang sử dụng</th><th>Sức chứa</th><th>Thao tác</th></tr></thead><tbody>{list.map((room) => {
              const morningClasses = (classes.data ?? []).filter((item) => item.roomId === room.id && (item.studyShift || 'MORNING') === 'MORNING');
              const afternoonClasses = (classes.data ?? []).filter((item) => item.roomId === room.id && item.studyShift === 'AFTERNOON');
              return <tr key={room.id}><td><strong>{room.code}</strong></td><td>{room.name}</td><td><div className="room-shift-list">{room.supportsMorning !== false && <span className="class-shift-badge morning">Ca sáng</span>}{room.supportsAfternoon !== false && <span className="class-shift-badge afternoon">Ca chiều</span>}</div></td><td><div className="room-usage-list"><span><b>Sáng:</b> {morningClasses.map((item) => item.code).join(', ') || 'Còn trống'}</span><span><b>Chiều:</b> {afternoonClasses.map((item) => item.code).join(', ') || 'Còn trống'}</span></div></td><td>{room.capacity ?? '—'} người</td><td>{tableActions('room', room)}</td></tr>;
            })}</tbody></table>}</Async>
          </Section>
        ) },
        { id: 'year-end', label: 'Tổng kết & chuyển năm', Icon: GraduationCap, content: <YearEndManager years={years.data ?? []} onChanged={() => { years.reload(); semesters.reload(); classes.reload(); }} /> },
      ]} />

      {editor && <Modal title="Chỉnh sửa cơ cấu đào tạo" onClose={() => setEditor(null)} footer={<><button className="live-btn ghost" disabled={busy} onClick={() => setEditor(null)}>Hủy</button><button className="live-btn" disabled={busy} onClick={saveEditor}><Save size={16} /> Lưu thay đổi</button></>}>
        <div className="academic-edit-grid">
          {(editor.kind === 'year' || editor.kind === 'semester' || editor.kind === 'class' || editor.kind === 'subject' || editor.kind === 'room') && <Field label="Mã"><input value={editor.data.code ?? ''} onChange={(e) => editField('code', e.target.value)} /></Field>}
          <Field label="Tên"><input value={editor.data.name ?? ''} onChange={(e) => editField('name', e.target.value)} /></Field>
          {editor.kind === 'year' && <><Field label="Ngày bắt đầu"><input type="date" value={editor.data.startDate ?? ''} onChange={(e) => editField('startDate', e.target.value)} /></Field><Field label="Ngày kết thúc"><input type="date" value={editor.data.endDate ?? ''} onChange={(e) => editField('endDate', e.target.value)} /></Field></>}
          {editor.kind === 'semester' && <><Field label="Năm học"><select value={editor.data.academicYearId ?? ''} onChange={(e) => editField('academicYearId', e.target.value)}>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></Field><Field label="Thứ tự"><input type="number" min="1" max="4" value={editor.data.sequence ?? 1} onChange={(e) => editField('sequence', Number(e.target.value))} /></Field><Field label="Ngày bắt đầu"><input type="date" value={editor.data.startDate ?? ''} onChange={(e) => editField('startDate', e.target.value)} /></Field><Field label="Ngày kết thúc"><input type="date" value={editor.data.endDate ?? ''} onChange={(e) => editField('endDate', e.target.value)} /></Field></>}
          {editor.kind === 'class' && <><Field label="Năm học"><select value={editor.data.academicYearId ?? ''} onChange={(e) => { editField('academicYearId', e.target.value); editField('roomId', ''); }}>{activeYears.map((year) => <option key={year.id} value={year.id}>{year.code}</option>)}</select></Field><Field label="Khối"><select value={editor.data.gradeLevel ?? ''} onChange={(e) => editField('gradeLevel', e.target.value)}>{[6,7,8,9,10,11,12].map((grade) => <option key={grade} value={`K${grade}`}>Khối {grade}</option>)}</select></Field><Field label="Ca học"><select value={editor.data.studyShift ?? 'MORNING'} onChange={(e) => { editField('studyShift', e.target.value); editField('roomId', ''); }}><option value="MORNING">Ca sáng</option><option value="AFTERNOON">Ca chiều</option></select></Field><Field label="Phòng học"><select value={editor.data.roomId ?? ''} onChange={(e) => editField('roomId', e.target.value)}><option value="">— Chưa phân phòng —</option>{(rooms.data ?? []).filter((room) => roomSupportsShift(room, String(editor.data.studyShift || 'MORNING'))).map((room) => { const assigned = roomAssignment(room.id, String(editor.data.academicYearId || ''), String(editor.data.studyShift || 'MORNING'), editor.id); return <option key={room.id} value={room.id} disabled={Boolean(assigned)}>{room.code}{assigned ? ` · Đã giao lớp ${assigned.code}` : ` · ${room.name || 'Phòng học'}`}</option>; })}</select></Field><Field label="Sức chứa"><input type="number" min="1" max="100" value={editor.data.capacity ?? 45} onChange={(e) => editField('capacity', Number(e.target.value))} /></Field></>}
          {editor.kind === 'subject' && <Field label="Hệ số tổng kết"><input type="number" min="0.5" max="10" step="0.5" value={editor.data.coefficient ?? 1} onChange={(e) => editField('coefficient', Number(e.target.value))} /></Field>}
          {editor.kind === 'room' && <><Field label="Ca phục vụ"><select value={editor.data.shiftMode ?? 'BOTH'} onChange={(e) => editField('shiftMode', e.target.value)}><option value="BOTH">Cả ca sáng và chiều</option><option value="MORNING">Chỉ ca sáng</option><option value="AFTERNOON">Chỉ ca chiều</option></select></Field><Field label="Sức chứa"><input type="number" min="1" max="1000" value={editor.data.capacity ?? 45} onChange={(e) => editField('capacity', Number(e.target.value))} /></Field></>}
        </div>
      </Modal>}
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { BookCopy, Check, GraduationCap, Plus, Save, UsersRound } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  AcademicYear, ApiUser, EducationProgram, EducationProgramSubject,
  SchoolClass, Subject, SubjectCombinationDetail, TeacherSubjectCapability,
} from '../../api/types';
import { Section, StatusPill } from '../../components/ui';
import { Async } from './common';

type Notify = (type: 'ok' | 'err', message: string) => void;
type Mode = 'programs' | 'combinations' | 'teacher-subjects';

const PROGRAM_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Bản nháp', ACTIVE: 'Đang áp dụng', ARCHIVED: 'Đã lưu trữ',
};
const SUBJECT_TYPE_LABELS: Record<string, string> = {
  MANDATORY: 'Bắt buộc', OPTIONAL: 'Lựa chọn', SPECIALIZED: 'Chuyên đề',
  EDUCATIONAL_ACTIVITY: 'Hoạt động giáo dục',
};

function message(error: unknown) {
  return error instanceof Error ? error.message : 'Không thể hoàn thành thao tác.';
}

export function EducationPlanningCatalogWorkspace({
  mode, years, classes, subjects, teachers, canManage, notify, onChanged,
}: {
  mode: Mode; years: AcademicYear[]; classes: SchoolClass[]; subjects: Subject[];
  teachers: ApiUser[]; canManage: boolean; notify: Notify; onChanged: () => void;
}) {
  const activeYear = years.find((item) => item.status === 'ACTIVE') || years[0];
  const [yearId, setYearId] = useState(activeYear?.id || '');
  const [grade, setGrade] = useState('K10');
  const [teacherId, setTeacherId] = useState('');
  const programs = useApi<EducationProgram[]>('/academic/education-planning/programs');
  const [programId, setProgramId] = useState('');
  useEffect(() => {
    if (activeYear?.id && yearId !== activeYear.id) setYearId(activeYear.id);
  }, [activeYear?.id, yearId]);
  useEffect(() => {
    if (!programId && programs.data?.length) {
      setProgramId(programs.data.find((item) => item.status === 'ACTIVE')?.id || programs.data[0].id);
    }
  }, [programId, programs.data]);
  useEffect(() => {
    if (!teacherId) setTeacherId(teachers.find((item) => item.status === 'ACTIVE')?.id || '');
  }, [teacherId, teachers]);
  const programSubjects = useApi<EducationProgramSubject[]>(
    programId ? `/academic/education-planning/programs/${programId}/subjects?gradeLevel=${grade}` : null,
  );
  const combinations = useApi<SubjectCombinationDetail[]>(
    yearId ? `/academic/education-planning/combinations?academicYearId=${yearId}&gradeLevel=${grade}` : null,
  );
  const capabilities = useApi<TeacherSubjectCapability[]>(
    teacherId ? `/academic/education-planning/teachers/${teacherId}/subjects` : null,
  );
  if (mode === 'programs') {
    return <ProgramsPanel programs={programs} programSubjects={programSubjects} programId={programId}
      setProgramId={setProgramId} grade={grade} setGrade={setGrade} subjects={subjects}
      canManage={canManage} notify={notify} />;
  }
  if (mode === 'combinations') {
    return <CombinationsPanel state={combinations} years={years} yearId={yearId}
      grade={grade} setGrade={setGrade} classes={classes} subjects={subjects}
      canManage={canManage} notify={notify} onChanged={onChanged} />;
  }
  return <TeacherSubjectsPanel state={capabilities} teachers={teachers} teacherId={teacherId}
    setTeacherId={setTeacherId} subjects={subjects} canManage={canManage} notify={notify} />;
}

function ProgramsPanel({ programs, programSubjects, programId, setProgramId, grade, setGrade,
  subjects, canManage, notify }: {
  programs: ReturnType<typeof useApi<EducationProgram[]>>;
  programSubjects: ReturnType<typeof useApi<EducationProgramSubject[]>>;
  programId: string; setProgramId: (id: string) => void;
  grade: string; setGrade: (grade: string) => void; subjects: Subject[];
  canManage: boolean; notify: Notify;
}) {
  const [programForm, setProgramForm] = useState({ code: '', name: '', startYear: 2018, description: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [subjectForm, setSubjectForm] = useState({ subjectId: '', subjectType: 'MANDATORY', annualPeriods: 70, semester1Periods: 35, semester2Periods: 35, weeklyPeriods: 2, required: true, notes: '' });
  const [subjectDrafts, setSubjectDrafts] = useState<Record<string, EducationProgramSubject>>({});
  const selectedProgram = programs.data?.find((item) => item.id === programId);
  useEffect(() => {
    setSubjectDrafts(Object.fromEntries((programSubjects.data || []).map((row) => [row.id, { ...row }])));
  }, [programSubjects.data]);
  const createProgram = async () => {
    if (!programForm.code || !programForm.name) return notify('err', 'Nhập mã và tên chương trình.');
    try {
      const created = await api.post<EducationProgram>('/academic/education-planning/programs', { ...programForm, status: 'DRAFT' });
      setProgramId(created.id);
      setProgramForm({ code: '', name: '', startYear: 2018, description: '' });
      setCreateOpen(false);
      programs.reload(); notify('ok', 'Đã tạo bản nháp chương trình. Hãy kiểm tra số tiết trước khi áp dụng.');
    } catch (error) { notify('err', message(error)); }
  };
  const saveSubject = async () => {
    if (!subjectForm.subjectId) return notify('err', 'Chọn môn cần cấu hình.');
    try {
      const annualPeriods = subjectForm.semester1Periods + subjectForm.semester2Periods;
      await api.post(`/academic/education-planning/programs/${programId}/subjects`, {
        ...subjectForm, annualPeriods, gradeLevel: grade,
      });
      programSubjects.reload(); notify('ok', 'Đã thêm môn vào chương trình của khối.');
    } catch (error) { notify('err', message(error)); }
  };
  const updateSubject = async (row: EducationProgramSubject) => {
    try {
      const annualPeriods = row.semester1Periods + row.semester2Periods;
      await api.put(`/academic/education-planning/programs/${programId}/subjects/${row.id}`, {
        ...row, annualPeriods,
      });
      programSubjects.reload(); notify('ok', 'Đã cập nhật cấu hình số tiết. Kế hoạch nháp có thể bấm “Đồng bộ từ chương trình” để nhận số tiết mới.');
    } catch (error) { notify('err', message(error)); }
  };
  const activateProgram = async () => {
    if (!selectedProgram) return;
    try {
      await api.put(`/academic/education-planning/programs/${selectedProgram.id}`, {
        ...selectedProgram, status: 'ACTIVE',
      });
      programs.reload();
      notify('ok', `Đã áp dụng ${selectedProgram.name}. Chương trình áp dụng trước đó đã được lưu trữ.`);
    } catch (error) { notify('err', message(error)); }
  };
  return <Section title="Chương trình giáo dục" subtitle="Cấu hình môn và số tiết chuẩn theo từng khối, không hardcode trong thuật toán" wide>
    <div className="live-toolbar academic-filter-bar">
      <BookCopy size={18} />
      <select className="live-select grow" value={programId} onChange={(event) => setProgramId(event.target.value)}>
        {(programs.data || []).map((item) => <option key={item.id} value={item.id}>{item.name} · {PROGRAM_STATUS_LABELS[item.status] || item.status}</option>)}
      </select>
      <select className="live-select" value={grade} onChange={(event) => setGrade(event.target.value)}>
        {['K10', 'K11', 'K12'].map((item) => <option key={item} value={item}>Khối {item.slice(1)}</option>)}
      </select>
      {canManage && selectedProgram && selectedProgram.status !== 'ACTIVE' && <button className="live-btn" onClick={activateProgram}><Check size={15} /> Áp dụng chương trình</button>}
    </div>
    {canManage && <div className="planning-create-toggle"><button className="live-btn ghost" onClick={() => setCreateOpen((open) => !open)}><Plus size={15} /> Tạo chương trình khác</button></div>}
    {canManage && createOpen && <div className="planning-editor">
      <div className="live-toolbar"><input className="live-input" placeholder="Mã chương trình" value={programForm.code} onChange={(e) => setProgramForm({ ...programForm, code: e.target.value })} /><input className="live-input grow" placeholder="Tên chương trình" value={programForm.name} onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })} /><input className="live-input" type="number" value={programForm.startYear} onChange={(e) => setProgramForm({ ...programForm, startYear: Number(e.target.value) })} /><button className="live-btn" onClick={createProgram}><Plus size={15} /> Tạo bản nháp</button><button className="live-btn ghost" onClick={() => setCreateOpen(false)}>Hủy</button></div>
      <small>Chương trình mới chưa được áp dụng. Toàn trường chỉ có một chương trình ở trạng thái đang áp dụng.</small>
    </div>}
    {canManage && programId && <div className="live-toolbar academic-create-bar">
      <select className="live-select grow" value={subjectForm.subjectId} onChange={(e) => { const selected = subjects.find((item) => item.id === e.target.value); setSubjectForm({ ...subjectForm, subjectId: e.target.value, subjectType: selected?.subjectType || 'MANDATORY' }); }}><option value="">Chọn môn</option>{subjects.filter((item) => item.active && !(programSubjects.data || []).some((row) => row.subjectId === item.id)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select className="live-select" value={subjectForm.subjectType} onChange={(e) => setSubjectForm({ ...subjectForm, subjectType: e.target.value })}><option value="MANDATORY">Bắt buộc</option><option value="OPTIONAL">Lựa chọn</option><option value="SPECIALIZED">Chuyên đề</option><option value="EDUCATIONAL_ACTIVITY">Hoạt động giáo dục</option></select>
      <label>HK1 <input className="live-input compact" type="number" value={subjectForm.semester1Periods} onChange={(e) => { const value = Number(e.target.value); setSubjectForm({ ...subjectForm, semester1Periods: value, annualPeriods: value + subjectForm.semester2Periods }); }} /></label>
      <label>HK2 <input className="live-input compact" type="number" value={subjectForm.semester2Periods} onChange={(e) => { const value = Number(e.target.value); setSubjectForm({ ...subjectForm, semester2Periods: value, annualPeriods: subjectForm.semester1Periods + value }); }} /></label>
      <label>Cả năm <input className="live-input compact calculated" type="number" value={subjectForm.annualPeriods} readOnly title="Tự động bằng HK1 + HK2" /></label>
      <label className="academic-check"><input type="checkbox" checked={subjectForm.required} onChange={(e) => setSubjectForm({ ...subjectForm, required: e.target.checked })} /> Bắt buộc</label>
      <button className="live-btn" onClick={saveSubject}><Plus size={15} /> Thêm</button>
    </div>}
    <Async state={programSubjects} allowEmpty empty="Chưa có môn trong chương trình của khối">{(items) => <table className="live-table"><thead><tr><th>Môn</th><th>Loại</th><th>HK1</th><th>HK2</th><th>Cả năm</th><th>Tiết/tuần</th><th>Bắt buộc</th><th /></tr></thead><tbody>{items.map((row) => { const draft = subjectDrafts[row.id] || row; const updatePeriods = (field: 'semester1Periods' | 'semester2Periods', value: number) => setSubjectDrafts((current) => { const changed = { ...draft, [field]: value }; return { ...current, [row.id]: { ...changed, annualPeriods: changed.semester1Periods + changed.semester2Periods } }; }); return <tr key={row.id}><td><strong>{subjects.find((item) => item.id === row.subjectId)?.name || row.subjectId}</strong></td><td>{SUBJECT_TYPE_LABELS[row.subjectType] || row.subjectType}</td><td>{canManage ? <input className="coefficient-input" type="number" value={draft.semester1Periods} onChange={(e) => updatePeriods('semester1Periods', Number(e.target.value))} /> : row.semester1Periods}</td><td>{canManage ? <input className="coefficient-input" type="number" value={draft.semester2Periods} onChange={(e) => updatePeriods('semester2Periods', Number(e.target.value))} /> : row.semester2Periods}</td><td>{canManage ? <input className="coefficient-input calculated" type="number" value={draft.annualPeriods} readOnly title="Tự động bằng HK1 + HK2" /> : row.annualPeriods}</td><td>{canManage ? <input className="coefficient-input" type="number" value={draft.weeklyPeriods} onChange={(e) => setSubjectDrafts((current) => ({ ...current, [row.id]: { ...draft, weeklyPeriods: Number(e.target.value) } }))} /> : row.weeklyPeriods}</td><td>{row.required ? 'Có' : 'Không'}</td><td>{canManage && <button className="icon-action" title="Lưu số tiết" onClick={() => updateSubject(draft)}><Save size={15} /></button>}</td></tr>; })}</tbody></table>}</Async>
  </Section>;
}

function CombinationsPanel({ state, years, yearId, grade, setGrade, classes, subjects,
  canManage, notify, onChanged }: {
  state: ReturnType<typeof useApi<SubjectCombinationDetail[]>>; years: AcademicYear[];
  yearId: string; grade: string; setGrade: (grade: string) => void;
  classes: SchoolClass[]; subjects: Subject[]; canManage: boolean; notify: Notify; onChanged: () => void;
}) {
  const [form, setForm] = useState({ code: '', name: '', expectedClassCount: 5, maxStudents: 45, subjectIds: [] as string[] });
  const [createOpen, setCreateOpen] = useState(false);
  const [classSelections, setClassSelections] = useState<Record<string, string[]>>({});
  const activeYear = years.find((item) => item.status === 'ACTIVE') || years.find((item) => item.id === yearId);
  const selectedClasses = useMemo(() => classes.filter((item) => item.academicYearId === yearId && item.gradeLevel === grade), [classes, grade, yearId]);
  useEffect(() => {
    setClassSelections(Object.fromEntries((state.data || []).map((detail) => [detail.combination.id, detail.classIds])));
  }, [state.data]);
  const toggle = (id: string) => setForm((current) => ({ ...current, subjectIds: current.subjectIds.includes(id) ? current.subjectIds.filter((item) => item !== id) : [...current.subjectIds, id] }));
  const create = async () => {
    if (!form.code || !form.name || !form.subjectIds.length) return notify('err', 'Nhập mã, tên và chọn ít nhất một môn.');
    try {
      await api.post('/academic/education-planning/combinations', { ...form, academicYearId: yearId, gradeLevel: grade, status: 'ACTIVE' });
      setForm({ code: '', name: '', expectedClassCount: 5, maxStudents: 45, subjectIds: [] });
      setCreateOpen(false);
      state.reload(); notify('ok', 'Đã tạo tổ hợp môn. Hãy gán các lớp ở danh sách bên dưới.');
    }
    catch (error) { notify('err', message(error)); }
  };
  const assign = async (combinationId: string) => {
    const classIds = classSelections[combinationId] || [];
    try { await api.post('/academic/education-planning/combinations/assign', { combinationId, classIds }); state.reload(); onChanged(); notify('ok', classIds.length ? `Đã lưu ${classIds.length} lớp thuộc tổ hợp.` : 'Đã bỏ gán toàn bộ lớp khỏi tổ hợp.'); }
    catch (error) { notify('err', message(error)); }
  };
  const toggleClass = (combinationId: string, classId: string, checked: boolean) => {
    setClassSelections((current) => {
      const next = Object.fromEntries(Object.entries(current).map(([id, ids]) => [id, ids.filter((value) => value !== classId)]));
      if (checked) next[combinationId] = [...(next[combinationId] || []), classId];
      return next;
    });
  };
  return <Section title="Tổ hợp môn lựa chọn" subtitle="Xác định nhóm môn áp dụng cho từng lớp trước khi lập kế hoạch và xếp lịch" wide>
    <div className="live-toolbar academic-filter-bar"><GraduationCap size={18} /><div className="active-year-indicator"><small>Năm học đang áp dụng</small><strong>{activeYear?.name || 'Chưa có năm học đang mở'}</strong></div><select className="live-select" value={grade} onChange={(e) => setGrade(e.target.value)}>{['K10', 'K11', 'K12'].map((item) => <option key={item} value={item}>Khối {item.slice(1)}</option>)}</select>{canManage && <button className="live-btn ghost" onClick={() => setCreateOpen((open) => !open)}><Plus size={15} /> Tạo tổ hợp</button>}</div>
    {canManage && createOpen && <div className="planning-editor"><div className="live-toolbar"><input className="live-input" placeholder="KHTN" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /><input className="live-input grow" placeholder="Tên tổ hợp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /><button className="live-btn" onClick={create}><Plus size={15} /> Lưu tổ hợp</button><button className="live-btn ghost" onClick={() => setCreateOpen(false)}>Hủy</button></div><div className="planning-chip-grid">{subjects.filter((item) => item.active && item.subjectType !== 'EDUCATIONAL_ACTIVITY').map((item) => <button type="button" className={`planning-choice ${form.subjectIds.includes(item.id) ? 'selected' : ''}`} key={item.id} onClick={() => toggle(item.id)}>{form.subjectIds.includes(item.id) && <Check size={14} />}{item.name}</button>)}</div></div>}
    <Async state={state} allowEmpty empty="Chưa có tổ hợp môn">{(items) => <div className="planning-combination-list">{items.map((detail) => { const assigned = classSelections[detail.combination.id] || []; return <article className="planning-combination" key={detail.combination.id}><header><div><strong>{detail.combination.name}</strong><small>{detail.combination.code} · {detail.subjectIds.length} môn · {assigned.length} lớp</small></div><StatusPill value={detail.combination.status} /></header><p>{detail.subjectIds.map((id) => subjects.find((item) => item.id === id)?.name || id).join(' · ')}</p><div className="combination-assignment-summary"><strong>Lớp đã gán:</strong><span>{assigned.length ? assigned.map((id) => selectedClasses.find((item) => item.id === id)?.code || id).join(', ') : 'Chưa gán lớp'}</span></div>{canManage && <div className="live-toolbar"><div className="planning-class-picker">{selectedClasses.map((item) => <label className={assigned.includes(item.id) ? 'selected' : ''} key={item.id}><input type="checkbox" checked={assigned.includes(item.id)} onChange={(e) => toggleClass(detail.combination.id, item.id, e.target.checked)} /> {item.code}</label>)}</div><button className="live-btn secondary" onClick={() => assign(detail.combination.id)}><Save size={15} /> Lưu danh sách lớp</button></div>}</article>; })}</div>}</Async>
  </Section>;
}

function TeacherSubjectsPanel({ state, teachers, teacherId, setTeacherId, subjects, canManage, notify }: {
  state: ReturnType<typeof useApi<TeacherSubjectCapability[]>>; teachers: ApiUser[];
  teacherId: string; setTeacherId: (id: string) => void; subjects: Subject[]; canManage: boolean; notify: Notify;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [primary, setPrimary] = useState('');
  useEffect(() => { setSelected((state.data || []).map((item) => item.subjectId)); setPrimary((state.data || []).find((item) => item.primarySubject)?.subjectId || ''); }, [state.data]);
  const save = async () => {
    if (!teacherId || !selected.length) return notify('err', 'Chọn giáo viên và ít nhất một môn có thể giảng dạy.');
    try { await api.put(`/academic/education-planning/teachers/${teacherId}/subjects`, { teacherId, subjectIds: selected, primarySubjectId: primary || selected[0] }); state.reload(); notify('ok', 'Đã cập nhật chuyên môn và gửi thông báo tới tài khoản giáo viên.'); }
    catch (error) { notify('err', message(error)); }
  };
  return <Section title="Chuyên môn giáo viên" subtitle="Một giáo viên có thể dạy nhiều môn; một môn được đánh dấu là chuyên môn chính" wide>
    <div className="live-toolbar academic-filter-bar"><UsersRound size={18} /><select className="live-select grow" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>{teachers.filter((item) => item.status === 'ACTIVE').map((item) => <option key={item.id} value={item.id}>{item.teacherCode} · {item.fullName}</option>)}</select>{canManage && <button className="live-btn" onClick={save}><Save size={15} /> Lưu chuyên môn</button>}</div>
    <div className="planning-chip-grid">{subjects.filter((item) => item.active && item.subjectType !== 'EDUCATIONAL_ACTIVITY').map((item) => { const checked = selected.includes(item.id); return <label className={`planning-choice ${checked ? 'selected' : ''}`} key={item.id}><input type="checkbox" checked={checked} disabled={!canManage} onChange={(e) => setSelected(e.target.checked ? [...selected, item.id] : selected.filter((id) => id !== item.id))} /><span>{item.name}</span>{checked && <input type="radio" name="primary-subject" checked={primary === item.id} disabled={!canManage} onChange={() => setPrimary(item.id)} title="Chuyên môn chính" />}</label>; })}</div>
  </Section>;
}

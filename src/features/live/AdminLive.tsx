import { useEffect, useState } from 'react';
import { Lock, Unlock, Plus, RefreshCw, FileText, Send, CheckCircle2, Pencil, Save, UserRound, IdCard, MapPin, UsersRound, Upload, KeyRound, Link2, Unlink, GraduationCap, Download } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, AcademicYear, Semester, SchoolClass, Subject, Room,
  ExamCategory, FeePeriod, FeePeriodItem, Invoice, NotificationTemplate, Club, ClubRegistration,
  ImportResult, LoginHistory, StudentYearlySummary,
} from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, viLabel } from '../../components/ui';
import { Async, useToast, money } from './common';
import { Modal, Field } from './Modal';
import { School, CalendarDays, DoorOpen, BookOpen, CircleDollarSign } from 'lucide-react';

const PAGE_SIZE = 8;

/* ============ A1 — Người dùng (phân trang + modal tạo) ============ */
const BLANK_USER = {
  username: '', fullName: '', role: 'STUDENT', password: 'Sse@123456',
  email: '', phone: '', avatarUrl: '', teacherCode: '', mainSubject: '',
  studentCode: '', classId: '', dateOfBirth: '', gender: '', placeOfBirth: '',
  ethnicity: 'Kinh', nationality: 'Việt Nam', address: '', enrollmentDate: '',
  guardianName: '', guardianPhone: '',
};

export function AdminUsersLive() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const params = [role && `role=${role}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&');
  const users = useApi<ApiUser[]>(`/users${params ? '?' + params : ''}`);
  const classes = useApi<SchoolClass[]>('/classes');
  const students = useApi<ApiUser[]>('/users?role=STUDENT');
  const toast = useToast();
  const [showEditor, setShowEditor] = useState(false);
  const [editingUser, setEditingUser] = useState<ApiUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...BLANK_USER });
  const [linkedStudentId, setLinkedStudentId] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const history = useApi<LoginHistory[]>(editingUser ? `/users/${editingUser.id}/login-history` : null);

  useEffect(() => setPage(0), [role, q]);

  const all = users.data ?? [];
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const pageItems = all.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const toggleLock = async (u: ApiUser) => {
    try {
      await api.post(`/users/${u.id}/${u.status === 'ACTIVE' ? 'lock' : 'unlock'}`);
      toast.show('ok', `${u.status === 'ACTIVE' ? 'Đã khóa' : 'Đã mở khóa'} ${u.fullName}`);
      users.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const closeEditor = () => {
    setShowEditor(false);
    setEditingUser(null);
    setForm({ ...BLANK_USER });
  };

  const resetPassword = async (u: ApiUser) => {
    const value = window.prompt(`Nhập mật khẩu mới cho ${u.fullName} (để trống để hệ thống tự sinh):`, '');
    if (value === null) return;
    if (value && value.length < 8) return toast.show('err', 'Mật khẩu phải có ít nhất 8 ký tự');
    try {
      const result = await api.post<{ password: string }>(`/users/${u.id}/reset-password`, { newPassword: value || null });
      toast.show('ok', `Mật khẩu tạm thời của ${u.fullName}: ${result.password}`);
    } catch (e: any) { toast.show('err', e.message); }
  };

  const importExcel = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await api.upload<ImportResult>('/users/import', file);
      setImportResult(result);
      toast.show(result.failedRows ? 'err' : 'ok', `Đã nhập ${result.importedRows}/${result.totalRows} tài khoản`);
      users.reload(); students.reload(); classes.reload();
    } catch (e: any) { toast.show('err', e.message); }
    finally { setImporting(false); }
  };

  const downloadImportTemplate = async () => {
    try {
      const result = await api.download('/users/import-template');
      const href = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a'); anchor.href = href; anchor.download = result.filename || 'mau-nhap-nguoi-dung.xlsx'; anchor.click();
      URL.revokeObjectURL(href);
    } catch (e: any) { toast.show('err', e.message); }
  };

  const linkChild = async () => {
    if (!editingUser || !linkedStudentId) return;
    try {
      await api.post(`/users/${editingUser.id}/children`, { studentId: linkedStudentId, primaryContact: true });
      setEditingUser({ ...editingUser, childrenIds: [...new Set([...(editingUser.childrenIds ?? []), linkedStudentId])] });
      setLinkedStudentId('');
      toast.show('ok', 'Đã liên kết học sinh với phụ huynh');
      users.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const unlinkChild = async (studentId: string) => {
    if (!editingUser) return;
    try {
      await api.del(`/users/${editingUser.id}/children/${studentId}`);
      setEditingUser({ ...editingUser, childrenIds: (editingUser.childrenIds ?? []).filter((id) => id !== studentId) });
      toast.show('ok', 'Đã bỏ liên kết học sinh');
      users.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const openCreate = () => {
    setEditingUser(null);
    setForm({ ...BLANK_USER });
    setShowEditor(true);
  };

  const openEdit = (user: ApiUser) => {
    setEditingUser(user);
    setForm({
      ...BLANK_USER,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      password: '',
      email: user.email || '',
      phone: user.phone || '',
      avatarUrl: user.avatarUrl || '',
      teacherCode: user.teacherCode || '',
      mainSubject: user.mainSubject || '',
      studentCode: user.studentCode || '',
      classId: user.classId || '',
      dateOfBirth: user.dateOfBirth || '',
      gender: user.gender || '',
      placeOfBirth: user.placeOfBirth || '',
      ethnicity: user.ethnicity || '',
      nationality: user.nationality || '',
      address: user.address || '',
      enrollmentDate: user.enrollmentDate || '',
      guardianName: user.guardianName || '',
      guardianPhone: user.guardianPhone || '',
    });
    setShowEditor(true);
  };

  const saveUser = async () => {
    if (!form.username.trim() || !form.fullName.trim()) return toast.show('err', 'Vui lòng nhập tên đăng nhập và họ tên');
    if (!editingUser && form.password.length < 8) return toast.show('err', 'Mật khẩu phải có ít nhất 8 ký tự');
    if (form.role === 'STUDENT' && !form.classId) return toast.show('err', 'Vui lòng chọn lớp cho học sinh');
    const cls = classes.data?.find((c) => c.id === form.classId);
    const body: Record<string, unknown> = {
      fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), avatarUrl: form.avatarUrl.trim(),
    };
    if (!editingUser) {
      body.username = form.username.trim();
      body.role = form.role;
      body.password = form.password || 'Sse@123456';
    }
    if (form.role === 'TEACHER') {
      body.teacherCode = form.teacherCode.trim();
      body.mainSubject = form.mainSubject.trim();
    }
    if (form.role === 'STUDENT') {
      Object.assign(body, {
        studentCode: form.studentCode.trim() || null,
        classId: form.classId,
        className: cls?.code || '',
        dateOfBirth: form.dateOfBirth || null,
        gender: form.gender || null,
        placeOfBirth: form.placeOfBirth.trim(),
        ethnicity: form.ethnicity.trim(),
        nationality: form.nationality.trim(),
        address: form.address.trim(),
        enrollmentDate: form.enrollmentDate || null,
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
      });
    }
    setSaving(true);
    try {
      if (editingUser) await api.put(`/users/${editingUser.id}`, body);
      else await api.post('/users', body);
      toast.show('ok', editingUser ? 'Đã cập nhật hồ sơ người dùng' : 'Đã tạo người dùng mới');
      closeEditor();
      users.reload();
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Người dùng & phân quyền" subtitle="Quản lý tài khoản và quyền truy cập" wide
      action={<button className="live-btn" onClick={openCreate}><Plus size={15} /> Tạo người dùng</button>}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị viên</option><option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option><option value="PARENT">Phụ huynh</option>
        </select>
        <input className="live-input grow" placeholder="Tìm tên / username / mã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className={`live-btn ghost ${importing ? 'is-disabled' : ''}`}>
          <Upload size={15} /> {importing ? 'Đang nhập…' : 'Nhập Excel'}
          <input hidden type="file" accept=".xlsx,.xls" disabled={importing} onChange={(e) => { importExcel(e.target.files?.[0]); e.currentTarget.value = ''; }} />
        </label>
        <button className="live-btn ghost" onClick={downloadImportTemplate}><Download size={15} /> Tệp mẫu</button>
        <button className="live-btn ghost" onClick={() => users.reload()}><RefreshCw size={15} /> Tải lại</button>
      </div>

      {importResult && (
        <div className={`import-result ${importResult.failedRows ? 'has-errors' : ''}`}>
          <strong>Đã xử lý {importResult.totalRows} dòng</strong>
          <span>{importResult.importedRows} thành công · {importResult.failedRows} lỗi</span>
          {importResult.errors.length > 0 && <small>{importResult.errors.slice(0, 5).map((e) => `Dòng ${e.row}: ${e.error}`).join(' · ')}</small>}
        </div>
      )}

      <Async state={users} empty="Không có người dùng">
        {() => (
          <>
            <table className="live-table">
              <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {pageItems.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong>{u.studentCode && <small style={{ color: 'var(--muted)' }}> · {u.studentCode}</small>}{u.teacherCode && <small style={{ color: 'var(--muted)' }}> · {u.teacherCode}</small>}</td>
                    <td>@{u.username}</td>
                    <td><Badge tone="blue">{viLabel(u.role)}</Badge></td>
                    <td><StatusPill value={u.status} /></td>
                    <td>
                      <div className="admin-user-actions">
                        <button className="live-btn subtle" onClick={() => openEdit(u)}><Pencil size={14} /> Chỉnh sửa</button>
                        <button className="live-btn subtle" onClick={() => toggleLock(u)}>
                          {u.status === 'ACTIVE' ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở</>}
                        </button>
                        <button className="live-btn subtle" onClick={() => resetPassword(u)}><KeyRound size={14} /> Đặt lại mật khẩu</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pager">
              <span>{all.length} người dùng · trang {page + 1}/{totalPages}</span>
              <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹ Trước</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Sau ›</button>
            </div>
          </>
        )}
      </Async>

      {showEditor && (
        <Modal title={editingUser ? `Chỉnh sửa hồ sơ · ${editingUser.fullName}` : 'Tạo người dùng mới'} onClose={closeEditor}
          footer={<>
            <button className="live-btn ghost" onClick={closeEditor} disabled={saving}>Hủy</button>
            <button className="live-btn" onClick={saveUser} disabled={saving}>
              {editingUser ? <><Save size={15} /> {saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</> : <><Plus size={15} /> {saving ? 'Đang tạo…' : 'Tạo tài khoản'}</>}
            </button>
          </>}>
          <div className="admin-user-form">
            <section className="admin-user-form-section">
              <header><span><UserRound size={18} /></span><div><h4>Thông tin tài khoản</h4><p>Thông tin nhận diện và đăng nhập hệ thống</p></div></header>
              <div className="admin-user-form-grid">
                <Field label="Vai trò">
                  <select value={form.role} disabled={Boolean(editingUser)} onChange={(e) => set('role', e.target.value)}>
                    <option value="STUDENT">Học sinh</option><option value="TEACHER">Giáo viên</option>
                    <option value="PARENT">Phụ huynh</option><option value="ADMIN">Quản trị viên</option>
                  </select>
                </Field>
                <Field label="Họ và tên *"><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Nguyễn Văn A" /></Field>
                <Field label="Tên đăng nhập *"><input value={form.username} disabled={Boolean(editingUser)} onChange={(e) => set('username', e.target.value)} placeholder="vd: hs.vana" /></Field>
                {!editingUser && <Field label="Mật khẩu *"><input type="password" value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>}
                <Field label="Email"><input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="a@sse.edu.vn" /></Field>
                <Field label="Số điện thoại"><input type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="09xxxxxxxx" /></Field>
                <Field label="Ảnh đại diện (URL)"><input type="url" value={form.avatarUrl} onChange={(e) => set('avatarUrl', e.target.value)} placeholder="https://…" /></Field>
              </div>
            </section>

            {form.role === 'TEACHER' && (
              <section className="admin-user-form-section">
                <header><span><IdCard size={18} /></span><div><h4>Thông tin giảng dạy</h4><p>Mã cán bộ và chuyên ngành phụ trách</p></div></header>
                <div className="admin-user-form-grid">
                  <Field label="Mã giáo viên"><input value={form.teacherCode} onChange={(e) => set('teacherCode', e.target.value)} placeholder="GV003" /></Field>
                  <Field label="Môn chính"><input value={form.mainSubject} onChange={(e) => set('mainSubject', e.target.value)} placeholder="Toán" /></Field>
                </div>
              </section>
            )}

            {form.role === 'STUDENT' && (
              <>
                <section className="admin-user-form-section">
                  <header><span><School size={18} /></span><div><h4>Thông tin học tập</h4><p>Lớp học, mã học sinh và thời điểm nhập học</p></div></header>
                  <div className="admin-user-form-grid">
                    <Field label="Mã học sinh"><input value={form.studentCode} onChange={(e) => set('studentCode', e.target.value)} placeholder="Để trống để hệ thống tự sinh" /></Field>
                    <Field label="Lớp học *">
                      <select value={form.classId} onChange={(e) => set('classId', e.target.value)}>
                        <option value="">— Chọn lớp —</option>
                        {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Ngày nhập học"><input type="date" value={form.enrollmentDate} onChange={(e) => set('enrollmentDate', e.target.value)} /></Field>
                  </div>
                </section>

                <section className="admin-user-form-section">
                  <header><span><IdCard size={18} /></span><div><h4>Thông tin cá nhân</h4><p>Thông tin định danh cơ bản của học sinh</p></div></header>
                  <div className="admin-user-form-grid">
                    <Field label="Ngày sinh"><input type="date" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} /></Field>
                    <Field label="Giới tính">
                      <select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                        <option value="">— Chọn giới tính —</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option>
                      </select>
                    </Field>
                    <Field label="Nơi sinh"><input value={form.placeOfBirth} onChange={(e) => set('placeOfBirth', e.target.value)} placeholder="Tỉnh / Thành phố" /></Field>
                    <Field label="Dân tộc"><input value={form.ethnicity} onChange={(e) => set('ethnicity', e.target.value)} placeholder="Kinh" /></Field>
                    <Field label="Quốc tịch"><input value={form.nationality} onChange={(e) => set('nationality', e.target.value)} placeholder="Việt Nam" /></Field>
                    <div className="admin-user-form-wide"><Field label="Địa chỉ thường trú"><textarea rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố" /></Field></div>
                  </div>
                </section>

                <section className="admin-user-form-section">
                  <header><span><UsersRound size={18} /></span><div><h4>Thông tin người giám hộ</h4><p>Thông tin liên hệ khi nhà trường cần trao đổi</p></div></header>
                  <div className="admin-user-form-grid">
                    <Field label="Họ tên người giám hộ"><input value={form.guardianName} onChange={(e) => set('guardianName', e.target.value)} placeholder="Nguyễn Văn B" /></Field>
                    <Field label="Số điện thoại người giám hộ"><input type="tel" value={form.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} placeholder="09xxxxxxxx" /></Field>
                  </div>
                </section>

                <div className="admin-user-privacy-note"><MapPin size={16} /><span>Thông tin học sinh chỉ được sử dụng cho công tác quản lý của nhà trường và giáo viên chủ nhiệm.</span></div>
              </>
            )}

            {form.role === 'PARENT' && editingUser && (
              <section className="admin-user-form-section">
                <header><span><Link2 size={18} /></span><div><h4>Liên kết học sinh</h4><p>Phụ huynh chỉ xem được dữ liệu của các học sinh đã liên kết</p></div></header>
                <div className="live-toolbar">
                  <select className="live-select grow" value={linkedStudentId} onChange={(e) => setLinkedStudentId(e.target.value)}>
                    <option value="">— Chọn học sinh —</option>
                    {(students.data ?? []).filter((student) => !(editingUser.childrenIds ?? []).includes(student.id)).map((student) => (
                      <option key={student.id} value={student.id}>{student.fullName} · {student.studentCode || student.username} · {student.className || 'Chưa xếp lớp'}</option>
                    ))}
                  </select>
                  <button type="button" className="live-btn" onClick={linkChild} disabled={!linkedStudentId}><Link2 size={14} /> Liên kết</button>
                </div>
                <div className="linked-student-list">
                  {(editingUser.childrenIds ?? []).length === 0 && <span>Chưa liên kết học sinh nào.</span>}
                  {(editingUser.childrenIds ?? []).map((id) => {
                    const student = students.data?.find((item) => item.id === id);
                    return <div key={id}><strong>{student?.fullName || id}</strong><small>{student?.className || 'Chưa xếp lớp'}</small><button type="button" onClick={() => unlinkChild(id)}><Unlink size={14} /> Bỏ liên kết</button></div>;
                  })}
                </div>
              </section>
            )}

            {editingUser && (
              <section className="admin-user-form-section">
                <header><span><KeyRound size={18} /></span><div><h4>Lịch sử đăng nhập</h4><p>50 lần đăng nhập gần nhất để phát hiện truy cập bất thường</p></div></header>
                <Async state={history} empty="Chưa có lịch sử đăng nhập">
                  {(items) => <div className="login-history-list">{items.slice(0, 8).map((item) => (
                    <div key={item.id}><span className={item.success ? 'success-dot' : 'error-dot'} />
                      <strong>{item.success ? 'Thành công' : 'Thất bại'}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                      <small>{item.ipAddress || 'Không rõ IP'}{item.failureReason ? ` · ${item.failureReason}` : ''}</small></div>
                  ))}</div>}
                </Async>
              </section>
            )}
          </div>
        </Modal>
      )}
    </Section>
  );
}

/* ============ A2 — Cơ cấu đào tạo (thêm tạo phòng học) ============ */
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
  const [cf, setCf] = useState({ code: '', name: '', gradeLevel: 'K10', academicYearId: '', homeroomTeacherId: '', capacity: 45 });
  const [sj, setSj] = useState({ code: '', name: '', coefficient: 1 });
  const [rm, setRm] = useState({ code: '', name: '', capacity: 45 });
  const [assigningClassId, setAssigningClassId] = useState('');

  const addYear = async () => {
    if (!yf.code || !yf.startDate || !yf.endDate) return toast.show('err', 'Nhập mã và thời gian năm học');
    try {
      await api.post('/academicYears', { ...yf, name: yf.name || yf.code, status: 'PLANNED' });
      toast.show('ok', 'Đã tạo năm học'); setYf({ code: '', name: '', startDate: '', endDate: '' }); years.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const addSemester = async () => {
    if (!sf.academicYearId || !sf.code) return toast.show('err', 'Chọn năm học và nhập mã học kỳ');
    try {
      await api.post('/semesters', { ...sf, name: sf.name || sf.code, status: 'PLANNED' });
      toast.show('ok', 'Đã tạo học kỳ'); setSf({ academicYearId: '', code: '', name: '', sequence: 1, startDate: '', endDate: '' }); semesters.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const addClass = async () => {
    if (!cf.code || !cf.academicYearId) return toast.show('err', 'Nhập mã lớp và chọn năm học');
    try {
      await api.post('/classes', { ...cf, name: cf.name || `Lớp ${cf.code}`, homeroomTeacherId: cf.homeroomTeacherId || null });
      toast.show('ok', 'Đã tạo lớp học'); setCf({ code: '', name: '', gradeLevel: 'K10', academicYearId: '', homeroomTeacherId: '', capacity: 45 }); classes.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  const addSubject = async () => {
    if (!sj.code || !sj.name) return toast.show('err', 'Nhập mã + tên môn');
    try { await api.post('/subjects', sj); toast.show('ok', 'Đã thêm môn'); setSj({ code: '', name: '', coefficient: 1 }); subjects.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const addRoom = async () => {
    if (!rm.code) return toast.show('err', 'Nhập mã phòng');
    try { await api.post('/rooms', rm); toast.show('ok', 'Đã thêm phòng học'); setRm({ code: '', name: '', capacity: 45 }); rooms.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const updateSubject = async (subject: Subject, coefficient: number) => {
    if (!Number.isFinite(coefficient) || coefficient <= 0) return toast.show('err', 'Hệ số môn không hợp lệ');
    try { await api.put(`/subjects/${subject.id}`, { name: subject.name, coefficient }); toast.show('ok', `Đã cập nhật hệ số môn ${subject.name}`); subjects.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const assignHomeroomTeacher = async (classId: string, teacherId: string) => {
    setAssigningClassId(classId);
    try {
      if (teacherId) await api.put(`/classes/${classId}/homeroom-teacher`, { teacherId });
      else await api.del(`/classes/${classId}/homeroom-teacher`);
      toast.show('ok', teacherId ? 'Đã phân công giáo viên chủ nhiệm' : 'Đã bỏ phân công giáo viên chủ nhiệm');
      classes.reload();
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setAssigningClassId('');
    }
  };

  return (
    <>
      {toast.node}
      <FunctionTabs
        tabs={[
          { id: 'years', label: 'Năm học', Icon: CalendarDays, content: (
            <Section title="Năm học" subtitle="Danh sách năm học" wide>
              <div className="live-toolbar academic-create-bar">
                <input className="live-input" placeholder="Mã (2026-2027)" value={yf.code} onChange={(e) => setYf({ ...yf, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên năm học" value={yf.name} onChange={(e) => setYf({ ...yf, name: e.target.value })} />
                <input className="live-input" type="date" title="Ngày bắt đầu" value={yf.startDate} onChange={(e) => setYf({ ...yf, startDate: e.target.value })} />
                <input className="live-input" type="date" title="Ngày kết thúc" value={yf.endDate} onChange={(e) => setYf({ ...yf, endDate: e.target.value })} />
                <button className="live-btn" onClick={addYear}><Plus size={15} /> Tạo năm học</button>
              </div>
              <Async state={years}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Thời gian</th><th>Trạng thái</th></tr></thead>
                  <tbody>{l.map((y) => <tr key={y.id}><td><strong>{y.code}</strong></td><td>{y.name}</td><td>{y.startDate || '—'} → {y.endDate || '—'}</td><td><StatusPill value={y.status} /></td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'sem', label: 'Học kỳ', Icon: CalendarDays, content: (
            <Section title="Học kỳ" subtitle="Danh sách học kỳ" wide>
              <div className="live-toolbar academic-create-bar">
                <select className="live-select" value={sf.academicYearId} onChange={(e) => setSf({ ...sf, academicYearId: e.target.value })}><option value="">— Năm học —</option>{(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.code}</option>)}</select>
                <input className="live-input" placeholder="Mã (HK1)" value={sf.code} onChange={(e) => setSf({ ...sf, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên học kỳ" value={sf.name} onChange={(e) => setSf({ ...sf, name: e.target.value })} />
                <input className="live-input" type="number" min="1" max="3" title="Thứ tự" value={sf.sequence} onChange={(e) => setSf({ ...sf, sequence: Number(e.target.value) })} />
                <input className="live-input" type="date" value={sf.startDate} onChange={(e) => setSf({ ...sf, startDate: e.target.value })} />
                <input className="live-input" type="date" value={sf.endDate} onChange={(e) => setSf({ ...sf, endDate: e.target.value })} />
                <button className="live-btn" onClick={addSemester}><Plus size={15} /> Tạo học kỳ</button>
              </div>
              <Async state={semesters}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Thứ tự</th><th>Trạng thái</th></tr></thead>
                  <tbody>{l.map((s) => <tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.name}</td><td>{s.sequence}</td><td><StatusPill value={s.status} /></td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'classes', label: 'Lớp', Icon: School, content: (
            <Section title="Lớp học" subtitle="Phân công giáo viên chủ nhiệm cho từng lớp" wide>
              <div className="live-toolbar academic-create-bar">
                <input className="live-input" placeholder="Mã lớp (10A2)" value={cf.code} onChange={(e) => setCf({ ...cf, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên lớp" value={cf.name} onChange={(e) => setCf({ ...cf, name: e.target.value })} />
                <select className="live-select" value={cf.gradeLevel} onChange={(e) => setCf({ ...cf, gradeLevel: e.target.value })}>{[6,7,8,9,10,11,12].map((g) => <option key={g} value={`K${g}`}>Khối {g}</option>)}</select>
                <select className="live-select" value={cf.academicYearId} onChange={(e) => setCf({ ...cf, academicYearId: e.target.value })}><option value="">— Năm học —</option>{(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.code}</option>)}</select>
                <input className="live-input" type="number" min="1" max="100" style={{ width: 105 }} title="Sĩ số tối đa" value={cf.capacity} onChange={(e) => setCf({ ...cf, capacity: Number(e.target.value) })} />
                <select className="live-select" value={cf.homeroomTeacherId} onChange={(e) => setCf({ ...cf, homeroomTeacherId: e.target.value })}><option value="">— GVCN (tùy chọn) —</option>{(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select>
                <button className="live-btn" onClick={addClass}><Plus size={15} /> Tạo lớp</button>
              </div>
              <Async state={classes}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Khối</th><th>Sĩ số</th><th>Giáo viên chủ nhiệm</th></tr></thead>
                  <tbody>{l.map((c) => <tr key={c.id}>
                    <td><strong>{c.code}</strong></td><td>{c.name}</td><td><Badge tone="violet">{c.gradeLevel}</Badge></td><td>{c.studentCount}/{c.capacity || 45} HS</td>
                    <td>
                      <select
                        className="live-select homeroom-teacher-select"
                        aria-label={`Giáo viên chủ nhiệm lớp ${c.code}`}
                        value={c.homeroomTeacherId || ''}
                        disabled={assigningClassId === c.id || teachers.loading}
                        onChange={(event) => assignHomeroomTeacher(c.id, event.target.value)}
                      >
                        <option value="">— Chưa phân công —</option>
                        {(teachers.data || []).map((teacher) => (
                          <option key={teacher.id} value={teacher.id} disabled={teacher.status !== 'ACTIVE'}>{teacher.fullName} · {teacher.mainSubject || 'Chưa có chuyên ngành'}{teacher.status !== 'ACTIVE' ? ' · Đã khóa' : ''}</option>
                        ))}
                      </select>
                    </td>
                  </tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'subjects', label: 'Môn', Icon: BookOpen, content: (
            <Section title="Môn học" subtitle="Danh sách môn học" wide>
              <div className="live-toolbar">
                <input className="live-input" placeholder="Mã (vd CHEM)" value={sj.code} onChange={(e) => setSj({ ...sj, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên môn" value={sj.name} onChange={(e) => setSj({ ...sj, name: e.target.value })} />
                <input className="live-input" type="number" min="0.5" max="10" step="0.5" style={{ width: 100 }} title="Hệ số môn" value={sj.coefficient} onChange={(e) => setSj({ ...sj, coefficient: Number(e.target.value) })} />
                <button className="live-btn" onClick={addSubject}><Plus size={15} /> Thêm môn</button>
              </div>
              <Async state={subjects}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Hệ số tổng kết</th></tr></thead>
                  <tbody>{l.map((s) => <tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.name}</td><td><input className="coefficient-input" type="number" min="0.5" max="10" step="0.5" defaultValue={s.coefficient || 1} onBlur={(e) => updateSubject(s, Number(e.target.value))} /></td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'rooms', label: 'Phòng', Icon: DoorOpen, content: (
            <Section title="Phòng học" subtitle="Danh sách phòng học" wide>
              <div className="live-toolbar">
                <input className="live-input" placeholder="Mã (vd B201)" value={rm.code} onChange={(e) => setRm({ ...rm, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên phòng" value={rm.name} onChange={(e) => setRm({ ...rm, name: e.target.value })} />
                <input className="live-input" type="number" style={{ width: 110 }} placeholder="Sức chứa" value={rm.capacity} onChange={(e) => setRm({ ...rm, capacity: Number(e.target.value) })} />
                <button className="live-btn" onClick={addRoom}><Plus size={15} /> Thêm phòng</button>
              </div>
              <Async state={rooms}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Sức chứa</th></tr></thead>
                  <tbody>{l.map((r) => <tr key={r.id}><td><strong>{r.code}</strong></td><td>{r.name}</td><td>{r.capacity ?? '—'}</td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'year-end', label: 'Tổng kết năm', Icon: GraduationCap, content: <YearEndManager years={years.data ?? []} /> },
        ]}
      />
    </>
  );
}

function YearEndManager({ years }: { years: AcademicYear[] }) {
  const [yearId, setYearId] = useState('');
  const preview = useApi<StudentYearlySummary[]>(yearId ? `/academic-years/${yearId}/promotion-preview` : null);
  const toast = useToast();
  const [savingId, setSavingId] = useState('');
  const [finalizing, setFinalizing] = useState(false);

  const setConduct = async (studentId: string, conductGrade: string) => {
    setSavingId(studentId);
    try {
      await api.put(`/academic-years/${yearId}/students/${studentId}/conduct`, { conductGrade });
      toast.show('ok', 'Đã lưu hạnh kiểm'); preview.reload();
    } catch (e: any) { toast.show('err', e.message); }
    finally { setSavingId(''); }
  };

  const finalize = async () => {
    if (!yearId || !window.confirm('Chốt năm học sẽ khóa kết quả và tự động xét lên lớp. Bạn muốn tiếp tục?')) return;
    setFinalizing(true);
    try {
      await api.post(`/academic-years/${yearId}/finalize`);
      toast.show('ok', 'Đã chốt năm học và hoàn tất xét lên lớp'); preview.reload();
    } catch (e: any) { toast.show('err', e.message); }
    finally { setFinalizing(false); }
  };

  return (
    <Section title="Tổng kết và xét lên lớp" subtitle="Kiểm tra đủ đầu điểm, nhập hạnh kiểm rồi chốt năm học" wide
      action={<button className="live-btn" disabled={!yearId || finalizing} onClick={finalize}><GraduationCap size={15} /> {finalizing ? 'Đang chốt…' : 'Chốt năm học'}</button>}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select grow" value={yearId} onChange={(e) => setYearId(e.target.value)}>
          <option value="">— Chọn năm học cần tổng kết —</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.code} · {viLabel(year.status)}</option>)}
        </select>
        {yearId && <button className="live-btn ghost" onClick={preview.reload}><RefreshCw size={14} /> Tính lại</button>}
      </div>
      {!yearId ? <div className="live-loading">Chọn năm học để kiểm tra điều kiện tổng kết.</div> : (
        <Async state={preview} empty="Năm học chưa có học sinh">
          {(rows) => <div className="admin-table-scroll"><table className="live-table year-end-table">
            <thead><tr><th>Học sinh</th><th>Điểm TB</th><th>Hạnh kiểm</th><th>Điều kiện</th><th>Kết quả</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td><strong>{row.studentName}</strong></td>
              <td>{row.averageScore == null ? '—' : row.averageScore.toFixed(2)}</td>
              <td><select className="live-select" value={row.conductGrade || ''} disabled={Boolean(row.finalizedAt) || savingId === row.studentId} onChange={(e) => setConduct(row.studentId, e.target.value)}>
                <option value="">— Chọn —</option><option value="GOOD">Tốt</option><option value="FAIR">Khá</option><option value="AVERAGE">Trung bình</option><option value="WEAK">Yếu</option>
              </select></td>
              <td>{row.missingRequirements ? <span className="year-end-missing" title={row.missingRequirements}>{row.missingRequirements}</span> : <Badge tone="green">Đủ dữ liệu</Badge>}</td>
              <td><StatusPill value={yearEndLabel(row.promotionStatus)} /></td>
            </tr>)}</tbody>
          </table></div>}
        </Async>
      )}
    </Section>
  );
}

function yearEndLabel(status: string) {
  return ({ READY: 'Sẵn sàng', INCOMPLETE: 'Thiếu dữ liệu', PROMOTED: 'Lên lớp',
    PROMOTED_PENDING_CLASS: 'Chờ xếp lớp', GRADUATED: 'Tốt nghiệp', RETAINED: 'Lưu ban' } as Record<string, string>)[status] || status;
}

/* ============ A4 — Loại điểm ============ */
export function AdminExamCategoriesLive() {
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();
  const [f, setF] = useState({ code: '', name: '', weight: 1 });
  const add = async () => {
    if (!f.code || !f.name) return toast.show('err', 'Nhập mã + tên');
    try { await api.post('/exam-categories', f); toast.show('ok', 'Đã thêm loại điểm'); setF({ code: '', name: '', weight: 1 }); cats.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  return (
    <Section title="Cấu hình khảo thí" subtitle="Quản lý loại điểm và hệ số" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input" placeholder="Mã (ORAL…)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className="live-input grow" placeholder="Tên" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="live-input" type="number" step="0.5" style={{ width: 90 }} value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} />
        <button className="live-btn" onClick={add}><Plus size={15} /> Thêm</button>
      </div>
      <Async state={cats}>{(l) => (
        <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Hệ số</th></tr></thead>
          <tbody>{l.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td><td>×{c.weight}</td></tr>)}</tbody></table>
      )}</Async>
    </Section>
  );
}

/* ============ A7 — Tài chính (xác nhận thu tiền mặt) ============ */
export function AdminFinanceLive() {
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const invoices = useApi<Invoice[]>('/invoices');
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const items = useApi<FeePeriodItem[]>(sel ? `/fee-periods/${sel}/items` : null);
  const [pf, setPf] = useState({ code: '', name: '', applyToGrades: '', dueDate: '' });
  const [itf, setItf] = useState({ name: '', amount: 1000000 });

  const createPeriod = async () => {
    if (!pf.code) return toast.show('err', 'Nhập mã đợt thu');
    try {
      await api.post('/fee-periods', { ...pf, applyToGrades: pf.applyToGrades || null, dueDate: pf.dueDate || null });
      toast.show('ok', 'Đã tạo đợt thu'); setPf({ code: '', name: '', applyToGrades: '', dueDate: '' }); periods.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };
  const addItem = async () => {
    if (!sel || !itf.name) return toast.show('err', 'Chọn đợt thu + nhập tên khoản');
    try { await api.post(`/fee-periods/${sel}/items`, itf); toast.show('ok', 'Đã thêm khoản'); items.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const open = async (id: string) => { try { await api.post(`/fee-periods/${id}/open`); toast.show('ok', 'Đã mở đợt thu'); periods.reload(); } catch (e: any) { toast.show('err', e.message); } };
  const generate = async (id: string) => {
    try { const inv = await api.post<Invoice[]>(`/fee-periods/${id}/generate-invoices`); toast.show('ok', `Đã sinh ${inv.length} hóa đơn`); invoices.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const confirmCash = async (inv: Invoice) => {
    if (!confirm(`Xác nhận học sinh ${inv.studentName} đã đóng ${money(inv.totalAmount - inv.paidAmount)} tại trường?`)) return;
    try {
      await api.post('/payments/cash', { invoiceId: inv.id, method: 'CASH' });
      toast.show('ok', `Đã ghi nhận thu tiền mặt ${inv.code}`);
      invoices.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <>
      {toast.node}
      <FunctionTabs tabs={[
        { id: 'periods', label: 'Đợt thu', Icon: CircleDollarSign, content: (
          <Section title="Đợt thu học phí" subtitle="Quản lý khoản thu và phát hành hóa đơn" wide>
            <div className="live-toolbar">
              <input className="live-input" placeholder="Mã (HK2-2025)" value={pf.code} onChange={(e) => setPf({ ...pf, code: e.target.value })} />
              <input className="live-input grow" placeholder="Tên đợt thu" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} />
              <input className="live-input" placeholder="Khối (K10,K11 - trống=tất cả)" value={pf.applyToGrades} onChange={(e) => setPf({ ...pf, applyToGrades: e.target.value })} />
              <button className="live-btn" onClick={createPeriod}><Plus size={15} /> Tạo đợt</button>
            </div>
            <Async state={periods} empty="Chưa có đợt thu">
              {(l) => (
                <table className="live-table">
                  <thead><tr><th>Mã</th><th>Tên</th><th>Khối</th><th>Trạng thái</th><th></th></tr></thead>
                  <tbody>{l.map((p) => (
                    <tr key={p.id} style={{ background: sel === p.id ? '#f1f5fd' : undefined }}>
                      <td><strong>{p.code}</strong></td><td>{p.name}</td><td>{p.applyToGrades || 'Tất cả'}</td>
                      <td><StatusPill value={p.status} /></td>
                      <td style={{ display: 'flex', gap: 6 }}>
                        <button className="live-btn subtle" onClick={() => setSel(p.id)}>Khoản thu</button>
                        {p.status === 'DRAFT' && <button className="live-btn ghost" onClick={() => open(p.id)}>Mở</button>}
                        {p.status === 'OPEN' && <button className="live-btn" onClick={() => generate(p.id)}><Send size={14} /> Sinh HĐ</button>}
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Async>
            {sel && (
              <div style={{ marginTop: 16 }}>
                <div className="live-toolbar">
                  <input className="live-input grow" placeholder="Tên khoản (Học phí…)" value={itf.name} onChange={(e) => setItf({ ...itf, name: e.target.value })} />
                  <input className="live-input" type="number" step="100000" value={itf.amount} onChange={(e) => setItf({ ...itf, amount: Number(e.target.value) })} />
                  <button className="live-btn" onClick={addItem}><Plus size={15} /> Thêm khoản</button>
                </div>
                <Async state={items} empty="Chưa có khoản thu">
                  {(l) => (<table className="live-table"><thead><tr><th>Khoản</th><th>Số tiền</th><th>Khối</th></tr></thead>
                    <tbody>{l.map((it) => <tr key={it.id}><td>{it.name}</td><td>{money(it.amount)}</td><td>{it.gradeLevel || 'Tất cả'}</td></tr>)}</tbody></table>)}
                </Async>
              </div>
            )}
          </Section>
        ) },
        { id: 'invoices', label: 'Hóa đơn & thu tiền', Icon: FileText, content: (
          <Section title="Xác nhận thu học phí" subtitle="Theo dõi và xác nhận các khoản đã thanh toán" wide
            action={<button className="live-btn ghost" onClick={() => invoices.reload()}><RefreshCw size={14} /> Tải lại</button>}>
            <Async state={invoices} empty="Chưa có hóa đơn">
              {(l) => (<table className="live-table"><thead><tr><th>Mã</th><th>Học sinh</th><th>Tổng</th><th>Đã trả</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>{l.map((i) => (
                  <tr key={i.id}>
                    <td><strong>{i.code}</strong></td><td>{i.studentName}</td><td>{money(i.totalAmount)}</td><td>{money(i.paidAmount)}</td>
                    <td><StatusPill value={i.status} /></td>
                    <td>{i.status !== 'PAID'
                      ? <button className="live-btn" onClick={() => confirmCash(i)}><CheckCircle2 size={14} /> Xác nhận thu</button>
                      : <Badge tone="green">Đã thu</Badge>}</td>
                  </tr>
                ))}</tbody></table>)}
            </Async>
          </Section>
        ) },
      ]} />
    </>
  );
}

/* ============ A9 — Template thông báo ============ */
export function AdminTemplatesLive() {
  const tpls = useApi<NotificationTemplate[]>('/notification-templates');
  return (
    <Section title="Mẫu thông báo" subtitle="Quản lý nội dung gửi đến người dùng" wide>
      <Async state={tpls} empty="Chưa có template">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Mã</th><th>Tên</th><th>Kênh</th><th>Nội dung</th><th>Bật</th></tr></thead>
            <tbody>{l.map((t) => (
              <tr key={t.id}><td><strong>{t.code}</strong></td><td>{t.name}</td><td><Badge tone="blue">{viLabel(t.channel)}</Badge></td>
                <td><small>{t.bodyTemplate}</small></td><td>{t.active ? <Badge tone="green">Đang bật</Badge> : <Badge tone="red">Đang tắt</Badge>}</td></tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}

/* ============ A5 — CLB ngoại khóa (có học phí) ============ */
export function AdminClubsLive() {
  const clubs = useApi<Club[]>('/clubs');
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const regs = useApi<ClubRegistration[]>(sel ? `/clubs/${sel}/registrations` : null);
  const [f, setF] = useState({ name: '', schedule: '', capacity: 20, fee: 0 });
  const add = async () => {
    if (!f.name) return toast.show('err', 'Nhập tên CLB');
    try { await api.post('/clubs', f); toast.show('ok', 'Đã tạo CLB'); setF({ name: '', schedule: '', capacity: 20, fee: 0 }); clubs.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  return (
    <Section title="Khóa ngoại khóa" subtitle="Quản lý lớp, học phí và đăng ký" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input grow" placeholder="Tên CLB" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="live-input" placeholder="Lịch (Chiều T4)" value={f.schedule} onChange={(e) => setF({ ...f, schedule: e.target.value })} />
        <input className="live-input" type="number" style={{ width: 90 }} placeholder="Sĩ số" value={f.capacity} onChange={(e) => setF({ ...f, capacity: Number(e.target.value) })} />
        <input className="live-input" type="number" step="50000" style={{ width: 130 }} placeholder="Học phí (₫)" value={f.fee} onChange={(e) => setF({ ...f, fee: Number(e.target.value) })} />
        <button className="live-btn" onClick={add}><Plus size={15} /> Tạo CLB</button>
      </div>
      <Async state={clubs} empty="Chưa có CLB">
        {(l) => (
          <table className="live-table"><thead><tr><th>Tên</th><th>Lịch</th><th>Sĩ số</th><th>Học phí</th><th></th></tr></thead>
            <tbody>{l.map((c) => <tr key={c.id} style={{ background: sel === c.id ? '#f1f5fd' : undefined }}>
              <td><strong>{c.name}</strong></td><td>{c.schedule || '—'}</td><td>{c.capacity}</td><td>{money(c.fee)}</td>
              <td><button className="live-btn subtle" onClick={() => setSel(c.id)}>Đăng ký</button></td></tr>)}</tbody></table>
        )}
      </Async>
      {sel && (
        <div style={{ marginTop: 14 }}>
          <Async state={regs} empty="Chưa có đăng ký">
            {(l) => (<table className="live-table"><thead><tr><th>Học sinh</th><th>Trạng thái</th></tr></thead>
              <tbody>{l.map((r) => <tr key={r.id}><td>{r.studentName}</td><td><StatusPill value={r.status} /></td></tr>)}</tbody></table>)}
          </Async>
        </div>
      )}
    </Section>
  );
}

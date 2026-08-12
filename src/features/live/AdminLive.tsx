import { useEffect, useMemo, useState } from 'react';
import { Lock, Unlock, Plus, RefreshCw, FileText, Send, CheckCircle2, Pencil, Save, UserRound, IdCard, MapPin, UsersRound, Upload, KeyRound, Link2, Unlink, GraduationCap, Download, Megaphone, BellRing, Eye, CircleStop, Ban, Trash2, Undo2, AlertTriangle, Search, Bell, CircleAlert, FileImage, History, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, AcademicYear, Semester, SchoolClass, Subject, Room,
  ExamCategory, FeePeriod, FeePeriodItem, Invoice, InvoicePreview, FinanceTargetType, Payment, PaymentInitResponse, PaymentProof, PaymentProofDecision, PaymentHistory, PaymentRefund, PaymentReconciliation, PaymentReceipt, PaymentReceiptDownload, NotificationTemplate, Club, ClubRegistration,
  StudentImportResult, LoginHistory, Announcement, RbacPermission, RbacRole, UserSession, UserDevice, Notification, NotificationDeliveryLog, NotificationOperationsSummary, NotificationProviderStatus,
} from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, viLabel } from '../../components/ui';
import { Async, useToast, money, fmtDate, fmtDateTime } from './common';
import { Modal, Field } from './Modal';
import { AcademicStructureWorkspace } from './AcademicStructureWorkspace';
import { ExamScheduleWorkspace } from './ExamScheduleWorkspace';
import { GradeConfigurationWorkspace } from './GradeConfigurationWorkspace';
import { School, CalendarDays, DoorOpen, BookOpen, CircleDollarSign } from 'lucide-react';
import { useShortcutFilter } from '../../api/shortcutFilter';

/* ============ A1 — Người dùng (phân trang + modal tạo) ============ */
const BLANK_USER = {
  username: '', fullName: '', role: 'STUDENT', password: 'Sse@123456',
  email: '', phone: '', avatarUrl: '', teacherCode: '', mainSubject: '',
  studentCode: '', classId: '', dateOfBirth: '', gender: '', placeOfBirth: '',
  ethnicity: 'Kinh', nationality: 'Việt Nam', address: '', enrollmentDate: '',
  guardianName: '', guardianPhone: '',
};

export function AdminUsersLive() {
  const [identityTab, setIdentityTab] = useState<'accounts' | 'permissions'>('accounts');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const params = [
    role && `role=${role}`,
    status && `status=${status}`,
    status === 'DELETED' && 'includeDeleted=true',
    q && `q=${encodeURIComponent(q)}`,
  ].filter(Boolean).join('&');
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
  const [importResult, setImportResult] = useState<StudentImportResult | null>(null);
  const [resetTarget, setResetTarget] = useState<ApiUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetReason, setResetReason] = useState('');
  const [lifecycleTarget, setLifecycleTarget] = useState<ApiUser | null>(null);
  const [lifecycleReason, setLifecycleReason] = useState('');
  const history = useApi<LoginHistory[]>(editingUser ? `/users/${editingUser.id}/login-history` : null);
  const managedSessions = useApi<UserSession[]>(editingUser ? `/users/${editingUser.id}/sessions` : null);
  const managedDevices = useApi<UserDevice[]>(editingUser ? `/users/${editingUser.id}/devices` : null);

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
    openPasswordReset(u);
  };

  const openPasswordReset = (user: ApiUser) => {
    setResetTarget(user);
    setResetPasswordValue('');
    setResetReason('');
  };

  const submitPasswordReset = async () => {
    if (!resetTarget || resetReason.trim().length < 5) {
      return toast.show('err', 'Vui lòng nhập lý do có ít nhất 5 ký tự.');
    }
    if (resetPasswordValue && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{10,}$/.test(resetPasswordValue)) {
      return toast.show('err', 'Mật khẩu cần ít nhất 10 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt.');
    }
    try {
      const result = await api.post<{ temporaryPassword: string }>(
        `/users/${resetTarget.id}/reset-password`,
        { newPassword: resetPasswordValue || null, reason: resetReason.trim() },
      );
      toast.show('ok', `Mật khẩu tạm thời của ${resetTarget.fullName}: ${result.temporaryPassword}`);
      setResetTarget(null);
      users.reload();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể đặt lại mật khẩu.');
    }
  };

  const submitLifecycleAction = async () => {
    if (!lifecycleTarget || lifecycleReason.trim().length < 5) {
      return toast.show('err', 'Vui lòng nhập lý do có ít nhất 5 ký tự.');
    }
    try {
      if (lifecycleTarget.status === 'DELETED') {
        await api.post(`/users/${lifecycleTarget.id}/restore`, {
          status: 'PENDING',
          reason: lifecycleReason.trim(),
        });
        toast.show('ok', `Đã khôi phục ${lifecycleTarget.fullName} về trạng thái chờ kích hoạt.`);
      } else {
        await api.del(`/users/${lifecycleTarget.id}`, { reason: lifecycleReason.trim() });
        toast.show('ok', `Đã xóa mềm ${lifecycleTarget.fullName}.`);
      }
      setLifecycleTarget(null);
      setLifecycleReason('');
      users.reload();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật tài khoản.');
    }
  };

  const revokeManagedSession = async (sessionId: string) => {
    if (!editingUser) return;
    try {
      await api.del(`/users/${editingUser.id}/sessions/${sessionId}`);
      managedSessions.reload();
      toast.show('ok', 'Đã thu hồi phiên đăng nhập.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể thu hồi phiên.');
    }
  };

  const deactivateManagedDevice = async (deviceId: string) => {
    if (!editingUser) return;
    try {
      await api.del(`/users/${editingUser.id}/devices/${deviceId}`);
      managedDevices.reload();
      managedSessions.reload();
      toast.show('ok', 'Đã ngừng tin cậy thiết bị.');
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật thiết bị.');
    }
  };

  const importExcel = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await api.upload<StudentImportResult>('/admin/users/import', file);
      setImportResult(result);
      toast.show(
        result.failedRows ? 'err' : 'ok',
        `Import: ${result.createdStudents} tạo mới, ${result.updatedStudents} cập nhật, ${result.failedRows} lỗi`,
      );
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
      action={identityTab === 'accounts' ? <button className="live-btn" onClick={openCreate}><Plus size={15} /> Tạo người dùng</button> : undefined}>
      {toast.node}
      <div className="identity-main-tabs tab-list" role="tablist" aria-label="Quản lý người dùng và phân quyền">
        <button type="button" className={identityTab === 'accounts' ? 'active' : ''} onClick={() => setIdentityTab('accounts')}>
          <UsersRound size={17} /> Tài khoản
        </button>
        <button type="button" className={identityTab === 'permissions' ? 'active' : ''} onClick={() => setIdentityTab('permissions')}>
          <ShieldCheck size={17} /> Phân quyền vai trò
        </button>
      </div>

      {identityTab === 'accounts' && <>
        <div className="live-toolbar identity-account-toolbar">
        <select className="live-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị viên</option><option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option><option value="PARENT">Phụ huynh</option>
        </select>
        <select className="live-select" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="PENDING">Chờ kích hoạt</option>
          <option value="LOCKED">Đã khóa</option>
          <option value="DELETED">Đã xóa</option>
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
          <span>{importResult.createdStudents} tạo mới · {importResult.updatedStudents} cập nhật · {importResult.linkedRelations} liên kết PH-HS · {importResult.failedRows} lỗi</span>
          {importResult.failedRows > 0 && <small>{importResult.rows.filter((row) => row.status === 'ERROR').slice(0, 5).map((row) => `Dòng ${row.rowNumber}: ${row.error}`).join(' · ')}</small>}
        </div>
      )}

      <Async paginate state={users} empty="Không có người dùng" itemLabel="người dùng" resetKey={`${role}:${status}:${q}`}>
        {(pageItems) => (
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
                        {u.status !== 'DELETED' && <button className="live-btn subtle" onClick={() => openEdit(u)}><Pencil size={14} /> Chỉnh sửa</button>}
                        {u.status !== 'DELETED' && <button className="live-btn subtle" onClick={() => toggleLock(u)}>
                          {u.status === 'ACTIVE' ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở</>}
                        </button>}
                        {u.status !== 'DELETED' && <button className="live-btn subtle" onClick={() => resetPassword(u)}><KeyRound size={14} /> Đặt lại mật khẩu</button>}
                        <button className="live-btn subtle" onClick={() => { setLifecycleTarget(u); setLifecycleReason(''); }}>
                          {u.status === 'DELETED' ? <><Undo2 size={14} /> Khôi phục</> : <><Trash2 size={14} /> Xóa</>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Async>
      </>}

      {identityTab === 'permissions' && <RbacWorkspace />}

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
                <Async paginate pageSize={5} state={history} empty="Chưa có lịch sử đăng nhập" itemLabel="lần đăng nhập">
                  {(items) => <div className="login-history-list">{items.map((item) => (
                    <div key={item.id}><span className={item.success ? 'success-dot' : 'error-dot'} />
                      <strong>{item.success ? 'Thành công' : 'Thất bại'}</strong><span>{new Date(item.createdAt).toLocaleString('vi-VN')}</span>
                      <small>{item.ipAddress || 'Không rõ IP'}{item.failureReason ? ` · ${item.failureReason}` : ''}</small></div>
                  ))}</div>}
                </Async>
              </section>
            )}

            {editingUser && (
              <section className="admin-user-form-section">
                <header><span><ShieldCheck size={18} /></span><div><h4>Phiên và thiết bị</h4><p>Thu hồi truy cập khi phát hiện thiết bị không còn sử dụng</p></div></header>
                <div className="identity-admin-security">
                  <div>
                    <strong>Phiên đang hoạt động</strong>
                    {(managedSessions.data || []).map((session) => (
                      <div key={session.id}><span>{session.deviceName || session.platform || 'Trình duyệt'} · {session.ipAddress || 'Không rõ IP'}</span><button type="button" onClick={() => revokeManagedSession(session.id)}>Thu hồi</button></div>
                    ))}
                    {!managedSessions.loading && (managedSessions.data || []).length === 0 && <small>Không có phiên hoạt động.</small>}
                  </div>
                  <div>
                    <strong>Thiết bị đã đăng ký</strong>
                    {(managedDevices.data || []).map((device) => (
                      <div key={device.id}><span>{device.deviceName || device.platform} · {device.active ? 'Đang hoạt động' : 'Đã ngừng'}</span>{device.active && <button type="button" onClick={() => deactivateManagedDevice(device.id)}>Ngừng tin cậy</button>}</div>
                    ))}
                  </div>
                </div>
              </section>
            )}
          </div>
        </Modal>
      )}

      {resetTarget && (
        <Modal title={`Đặt lại mật khẩu · ${resetTarget.fullName}`} onClose={() => setResetTarget(null)}
          footer={<><button className="live-btn ghost" onClick={() => setResetTarget(null)}>Hủy</button><button className="live-btn" onClick={submitPasswordReset}><KeyRound size={15} /> Đặt lại mật khẩu</button></>}>
          <Field label="Mật khẩu tạm thời (để trống để hệ thống tự sinh)">
            <input type="password" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} placeholder="Tối thiểu 10 ký tự" />
          </Field>
          <Field label="Lý do bắt buộc">
            <textarea rows={3} value={resetReason} onChange={(event) => setResetReason(event.target.value)} placeholder="Ví dụ: người dùng quên mật khẩu" />
          </Field>
          <div className="identity-warning"><AlertTriangle size={16} /> Toàn bộ phiên đăng nhập hiện tại sẽ bị thu hồi. Người dùng phải đổi mật khẩu ở lần đăng nhập kế tiếp.</div>
        </Modal>
      )}

      {lifecycleTarget && (
        <Modal title={`${lifecycleTarget.status === 'DELETED' ? 'Khôi phục' : 'Xóa tài khoản'} · ${lifecycleTarget.fullName}`} onClose={() => setLifecycleTarget(null)}
          footer={<><button className="live-btn ghost" onClick={() => setLifecycleTarget(null)}>Hủy</button><button className="live-btn" onClick={submitLifecycleAction}>{lifecycleTarget.status === 'DELETED' ? <Undo2 size={15} /> : <Trash2 size={15} />} Xác nhận</button></>}>
          <Field label="Lý do bắt buộc"><textarea rows={3} value={lifecycleReason} onChange={(event) => setLifecycleReason(event.target.value)} /></Field>
          <div className="identity-warning"><AlertTriangle size={16} /> {lifecycleTarget.status === 'DELETED' ? 'Tài khoản sẽ được khôi phục ở trạng thái chờ kích hoạt.' : 'Dữ liệu nghiệp vụ được giữ nguyên và tài khoản có thể khôi phục sau này.'}</div>
        </Modal>
      )}
    </Section>
  );
}

const PERMISSION_COPY: Record<string, { title: string; description: string }> = {
  IDENTITY_PROFILE_READ_SELF: {
    title: 'Xem hồ sơ cá nhân',
    description: 'Xem thông tin tài khoản của chính mình.',
  },
  IDENTITY_PASSWORD_CHANGE_SELF: {
    title: 'Đổi mật khẩu cá nhân',
    description: 'Tự đổi mật khẩu đăng nhập.',
  },
  IDENTITY_SESSION_MANAGE_SELF: {
    title: 'Quản lý phiên đăng nhập cá nhân',
    description: 'Xem và đăng xuất các phiên của chính mình.',
  },
  IDENTITY_DEVICE_MANAGE_SELF: {
    title: 'Quản lý thiết bị cá nhân',
    description: 'Xem và ngừng tin cậy thiết bị của chính mình.',
  },
  IDENTITY_USER_READ: {
    title: 'Xem danh sách người dùng',
    description: 'Tra cứu tài khoản trong hệ thống.',
  },
  IDENTITY_USER_CREATE: {
    title: 'Tạo tài khoản',
    description: 'Tạo mới tài khoản người dùng.',
  },
  IDENTITY_USER_UPDATE: {
    title: 'Cập nhật tài khoản',
    description: 'Chỉnh sửa hồ sơ và thông tin liên hệ.',
  },
  IDENTITY_USER_LOCK: {
    title: 'Khóa và mở khóa tài khoản',
    description: 'Thay đổi trạng thái truy cập của người dùng.',
  },
  IDENTITY_USER_RESET_PASSWORD: {
    title: 'Đặt lại mật khẩu người khác',
    description: 'Cấp mật khẩu tạm và thu hồi các phiên cũ.',
  },
  IDENTITY_USER_DELETE: {
    title: 'Xóa mềm tài khoản',
    description: 'Ngừng sử dụng tài khoản nhưng vẫn giữ dữ liệu.',
  },
  IDENTITY_USER_RESTORE: {
    title: 'Khôi phục tài khoản',
    description: 'Khôi phục tài khoản đã xóa về trạng thái chờ kích hoạt.',
  },
  IDENTITY_LOGIN_HISTORY_READ: {
    title: 'Xem lịch sử đăng nhập',
    description: 'Xem các lần đăng nhập thành công và thất bại.',
  },
  IDENTITY_SESSION_MANAGE_ANY: {
    title: 'Quản lý phiên của người khác',
    description: 'Xem và thu hồi phiên đăng nhập của người dùng khác.',
  },
  IDENTITY_DEVICE_MANAGE_ANY: {
    title: 'Quản lý thiết bị của người khác',
    description: 'Xem và ngừng tin cậy thiết bị của người dùng khác.',
  },
  IDENTITY_RBAC_MANAGE: {
    title: 'Quản lý phân quyền',
    description: 'Thay đổi quyền được cấp cho các vai trò.',
  },
  ACADEMIC_STRUCTURE_READ: {
    title: 'Xem cơ cấu đào tạo',
    description: 'Xem năm học, học kỳ, khối, lớp, môn, phòng và ngày nghỉ.',
  },
  ACADEMIC_STRUCTURE_MANAGE: {
    title: 'Quản lý cơ cấu đào tạo',
    description: 'Tạo và cập nhật danh mục đào tạo.',
  },
  ACADEMIC_ENROLLMENT_MANAGE: {
    title: 'Phân lớp học sinh',
    description: 'Xếp, chuyển và gỡ học sinh khỏi lớp theo năm học.',
  },
  ACADEMIC_PLAN_READ: {
    title: 'Xem kế hoạch giáo dục năm học',
    description: 'Xem thời lượng môn học và lịch thi dự kiến.',
  },
  ACADEMIC_PLAN_MANAGE: {
    title: 'Quản lý kế hoạch giáo dục năm học',
    description: 'Tạo, duyệt, công bố và lưu phiên bản kế hoạch giáo dục năm học.',
  },
  ACADEMIC_EXAM_PLAN_MANAGE: {
    title: 'Quản lý lịch thi dự kiến',
    description: 'Xếp môn thi, ngày giờ, phòng và giám thị.',
  },
  AUDIT_READ: {
    title: 'Xem lịch sử hệ thống',
    description: 'Tra cứu các thao tác quan trọng đã được ghi nhận.',
  },
};

const PERMISSION_GROUPS = [
  { id: 'personal', label: 'Bảo mật cá nhân' },
  { id: 'users', label: 'Quản lý người dùng' },
  { id: 'academic', label: 'Cơ cấu và kế hoạch giáo dục' },
  { id: 'governance', label: 'Phân quyền và kiểm soát' },
] as const;

function permissionGroup(code: string) {
  if (code.endsWith('_SELF')) return 'personal';
  if (code.startsWith('ACADEMIC_')) return 'academic';
  if (code === 'IDENTITY_RBAC_MANAGE' || code === 'AUDIT_READ') return 'governance';
  return 'users';
}

function RbacWorkspace() {
  const roles = useApi<RbacRole[]>('/admin/rbac/roles');
  const permissions = useApi<RbacPermission[]>('/admin/rbac/permissions');
  const toast = useToast();
  const [roleId, setRoleId] = useState('');
  const [draft, setDraft] = useState<string[] | null>(null);
  const [reason, setReason] = useState('');
  const configurableRoles = useMemo(
    () => (roles.data || [])
      .filter((role) => role.code !== 'ADMIN')
      .sort((left, right) => (
        ['TEACHER', 'STUDENT', 'PARENT'].indexOf(left.code)
        - ['TEACHER', 'STUDENT', 'PARENT'].indexOf(right.code)
      )),
    [roles.data],
  );
  const selectedRole = configurableRoles.find((role) => role.id === roleId) || configurableRoles[0];
  const selectedCodes = draft ?? selectedRole?.permissionCodes ?? [];

  useEffect(() => {
    if (selectedRole && selectedRole.id !== roleId) {
      setRoleId(selectedRole.id);
      setDraft(null);
    }
  }, [roleId, selectedRole]);

  const groupedPermissions = useMemo(() => {
    const groups = new Map<string, RbacPermission[]>();
    for (const permission of permissions.data || []) {
      const group = permissionGroup(permission.code);
      groups.set(group, [...(groups.get(group) || []), permission]);
    }
    return PERMISSION_GROUPS.map((group) => [
      group.label,
      groups.get(group.id) || [],
    ] as const);
  }, [permissions.data]);

  const togglePermission = (code: string) => {
    setDraft((current) => {
      const values = new Set(current ?? selectedRole?.permissionCodes ?? []);
      if (values.has(code)) values.delete(code); else values.add(code);
      return [...values];
    });
  };

  const save = async () => {
    if (!selectedRole) return;
    if (reason.trim().length < 5) return toast.show('err', 'Vui lòng nhập lý do thay đổi quyền.');
    try {
      await api.put(`/admin/rbac/roles/${selectedRole.id}/permissions`, {
        permissionCodes: selectedCodes,
        reason: reason.trim(),
      });
      toast.show('ok', `Đã cập nhật quyền của ${selectedRole.name}.`);
      setDraft(null);
      setReason('');
      roles.reload();
    } catch (error) {
      toast.show('err', error instanceof Error ? error.message : 'Không thể cập nhật quyền.');
    }
  };

  return (
    <div className="identity-rbac">
      {toast.node}
      <header>
        <div>
          <h3>Phân quyền vai trò</h3>
          <p>Quản trị viên luôn có toàn quyền. Chọn vai trò cần giới hạn hoặc bổ sung quyền.</p>
        </div>
        <button className="live-btn" type="button" disabled={!selectedRole || draft === null} onClick={save}>
          <Save size={15} /> Lưu thay đổi
        </button>
      </header>
      <div className="identity-role-tabs" role="tablist" aria-label="Chọn vai trò cần phân quyền">
        {configurableRoles.map((role) => (
          <button
            key={role.id}
            type="button"
            className={selectedRole?.id === role.id ? 'active' : ''}
            onClick={() => {
              setRoleId(role.id);
              setDraft(null);
              setReason('');
            }}
          >
            {role.code === 'TEACHER' ? <GraduationCap size={17} /> : role.code === 'STUDENT' ? <UserRound size={17} /> : <UsersRound size={17} />}
            <span>{viLabel(role.code)}</span>
          </button>
        ))}
      </div>
      <div className="identity-rbac-toolbar">
        <div>
          <strong>{selectedRole ? `Quyền của ${viLabel(selectedRole.code)}` : 'Đang tải danh sách vai trò'}</strong>
          <small>Mọi thay đổi có hiệu lực ngay với các phiên đang đăng nhập.</small>
        </div>
        <input className="live-input grow" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do thay đổi quyền" />
      </div>
      <div className="identity-permission-groups">
        {groupedPermissions.map(([group, items]) => (
          <section key={group}>
            <strong>{group}</strong>
            {items.map((permission) => (
              <label key={permission.code}>
                <input type="checkbox" checked={selectedCodes.includes(permission.code)} onChange={() => togglePermission(permission.code)} />
                <span>
                  {PERMISSION_COPY[permission.code]?.title || permission.name}
                  <small>{PERMISSION_COPY[permission.code]?.description || permission.description}</small>
                </span>
              </label>
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

/* ============ A2 — Cơ cấu đào tạo (thêm tạo phòng học) ============ */
export function AdminAcademicLive() {
  const { user } = useAuth();
  return <AcademicStructureWorkspace initialTabId={user?.role === 'TEACHER' ? 'plans' : 'years'} />;
}

export function LegacyAdminAcademicLive() {
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
      await api.put(`/classes/${classId}/homeroom-teacher`, { homeroomTeacherId: teacherId || null });
      toast.show('ok', teacherId ? 'Đã phân công giáo viên chủ nhiệm' : 'Đã bỏ phân công giáo viên chủ nhiệm');
      classes.reload();
    } catch (e: any) {
      toast.show('err', e.message);
    } finally {
      setAssigningClassId('');
    }
  };

  const ensureHighSchoolClasses = async () => {
    if (!cf.academicYearId) return toast.show('err', 'Chọn năm học trước khi khởi tạo 30 lớp');
    try {
      const result = await api.post<{ createdClasses: number }>(
        `/academic/high-school-defaults/ensure?academicYearId=${encodeURIComponent(cf.academicYearId)}`,
      );
      toast.show('ok', `Đã khởi tạo ${result.createdClasses} lớp còn thiếu`);
      classes.reload();
      semesters.reload();
    } catch (e: any) { toast.show('err', e.message); }
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
              <Async paginate state={years} itemLabel="năm học">{(l) => (
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
              <Async paginate state={semesters} itemLabel="học kỳ">{(l) => (
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
                <select className="live-select" value={cf.gradeLevel} onChange={(e) => setCf({ ...cf, gradeLevel: e.target.value })}>{[10,11,12].map((g) => <option key={g} value={`K${g}`}>Khối {g}</option>)}</select>
                <select className="live-select" value={cf.academicYearId} onChange={(e) => setCf({ ...cf, academicYearId: e.target.value })}><option value="">— Năm học —</option>{(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.code}</option>)}</select>
                <input className="live-input" type="number" min="1" max="100" style={{ width: 105 }} title="Sĩ số tối đa" value={cf.capacity} onChange={(e) => setCf({ ...cf, capacity: Number(e.target.value) })} />
                <select className="live-select" value={cf.homeroomTeacherId} onChange={(e) => setCf({ ...cf, homeroomTeacherId: e.target.value })}><option value="">— GVCN (tùy chọn) —</option>{(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select>
                <button className="live-btn" onClick={addClass}><Plus size={15} /> Tạo lớp</button>
                <button className="live-btn ghost" onClick={ensureHighSchoolClasses}>Khởi tạo 30 lớp</button>
              </div>
              <Async paginate state={classes} itemLabel="lớp học">{(l) => (
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
              <Async paginate state={subjects} itemLabel="môn học">{(l) => (
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
              <Async paginate state={rooms} itemLabel="phòng học">{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Sức chứa</th></tr></thead>
                  <tbody>{l.map((r) => <tr key={r.id}><td><strong>{r.code}</strong></td><td>{r.name}</td><td>{r.capacity ?? '—'}</td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
        ]}
      />
    </>
  );
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
  const scoreTypes = (
    <Section title="Cấu hình khảo thí" subtitle="Quản lý loại điểm và hệ số" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input" placeholder="Mã (ORAL…)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className="live-input grow" placeholder="Tên" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input className="live-input" type="number" step="0.5" style={{ width: 90 }} value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} />
        <button className="live-btn" onClick={add}><Plus size={15} /> Thêm</button>
      </div>
      <Async paginate state={cats} itemLabel="đầu điểm">{(l) => (
        <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Hệ số</th></tr></thead>
          <tbody>{l.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td><td>×{c.weight}</td></tr>)}</tbody></table>
      )}</Async>
    </Section>
  );
  return <FunctionTabs tabs={[
    { id: 'exam-schedule', label: 'Lịch thi & coi thi', Icon: CalendarDays, content: <ExamScheduleWorkspace /> },
    { id: 'score-types', label: 'Loại điểm', Icon: BookOpen, content: scoreTypes },
    { id: 'grade-config', label: 'Cấu hình theo môn', Icon: GraduationCap, content: <GradeConfigurationWorkspace /> },
  ]} />;
}

/* ============ A7 — Tài chính ============ */
const FINANCE_TARGET_LABEL: Record<FinanceTargetType, string> = {
  ALL: 'Toàn bộ học sinh', GRADE: 'Theo khối', CLASS: 'Theo lớp', STUDENT: 'Danh sách học sinh',
};

const FINANCE_GRADES = [
  { id: 'K10', label: 'Khối 10' },
  { id: 'K11', label: 'Khối 11' },
  { id: 'K12', label: 'Khối 12' },
];

const FINANCE_FEE_TYPE_LABEL: Record<string, string> = {
  TUITION: 'Học phí',
  MEAL: 'Bán trú / ăn uống',
  TRANSPORT: 'Xe đưa đón',
  ACTIVITY: 'Ngoại khóa',
  OTHER: 'Khoản thu khác',
};

const INVOICE_SETTLEMENT_LABEL: Record<string, string> = {
  PENDING: 'Chưa đóng',
  PARTIAL: 'Đã đóng một phần',
  OVERDUE: 'Quá hạn chưa đóng',
  PAID: 'Đã đóng đủ',
  CANCELLED: 'Đã hủy',
  VOID: 'Không còn hiệu lực',
};

type FinanceDialogState = {
  tone: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
  details?: string[];
  confirmLabel?: string;
  onConfirm?: () => void | Promise<void>;
};

function FinanceActionDialog({ dialog, onClose }: { dialog: FinanceDialogState | null; onClose: () => void }) {
  if (!dialog) return null;
  const Icon = dialog.tone === 'danger' ? CircleAlert : dialog.tone === 'warning' ? AlertTriangle : CircleDollarSign;
  return (
    <Modal
      title={dialog.title}
      onClose={onClose}
      footer={dialog.onConfirm ? (
        <>
          <button className="live-btn subtle" onClick={onClose}>Quay lại</button>
          <button className={`live-btn ${dialog.tone === 'danger' ? 'danger' : ''}`} onClick={() => {
            const action = dialog.onConfirm;
            onClose();
            void action?.();
          }}>{dialog.confirmLabel || 'Xác nhận'}</button>
        </>
      ) : <button className="live-btn" onClick={onClose}>Đã hiểu</button>}
    >
      <div className={`finance-dialog finance-dialog-${dialog.tone}`}>
        <span className="finance-dialog-icon"><Icon size={24} /></span>
        <div>
          <p>{dialog.message}</p>
          {!!dialog.details?.length && <ul>{dialog.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>}
        </div>
      </div>
    </Modal>
  );
}

const normalizeFinanceSearch = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('vi')
  .trim();

const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Tiền mặt',
  MB_BANK_TRANSFER: 'Chuyển khoản MB',
  VNPAY: 'VNPAY',
  MOMO: 'MoMo',
};

const REFUND_METHOD_LABEL: Record<string, string> = {
  MB_BANK_TRANSFER: 'Chuyển khoản MB',
  CASH: 'Tiền mặt',
  OTHER: 'Phương thức khác',
};

const REFUND_TYPE_LABEL: Record<string, string> = {
  PARTIAL: 'Hoàn một phần',
  FULL: 'Hoàn toàn bộ còn lại',
};

type RefundRequestEditor = {
  payment: PaymentHistory;
  mode: 'FULL' | 'PARTIAL';
  amount: string;
  reason: string;
};
type RefundDecisionEditor = {
  refund: PaymentRefund;
  action: 'approve' | 'reject' | 'cancel';
  method: string;
  reference: string;
  reason: string;
  verified: boolean;
};
type FeePeriodMetadataEditor = {
  period: FeePeriod;
  feeType: string;
  academicYearId: string;
  semesterId: string;
};

const schoolToday = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

export function AdminFinanceLive() {
  const shortcut = useShortcutFilter('A7');
  const { user: currentAdmin } = useAuth();
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const invoices = useApi<Invoice[]>('/invoices');
  const paymentProofs = useApi<PaymentProof[]>('/payment-proofs');
  const paymentHistory = useApi<PaymentHistory[]>('/payment-history');
  const paymentRefunds = useApi<PaymentRefund[]>('/payment-refunds');
  const reconciliationRuns = useApi<PaymentReconciliation[]>('/finance/reconciliations');
  const academicYears = useApi<AcademicYear[]>('/academicYears');
  const semesters = useApi<Semester[]>('/semesters');
  const classes = useApi<SchoolClass[]>('/classes');
  const students = useApi<ApiUser[]>('/users?role=STUDENT');
  const toast = useToast();
  const [sel, setSel] = useState<string | null>(null);
  const items = useApi<FeePeriodItem[]>(sel ? `/fee-periods/${sel}/items` : null);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [busy, setBusy] = useState('');
  const [dialog, setDialog] = useState<FinanceDialogState | null>(null);
  const [periodFilterFeeType, setPeriodFilterFeeType] = useState('');
  const [periodFilterSemesterId, setPeriodFilterSemesterId] = useState('');
  const [periodFilterStatus, setPeriodFilterStatus] = useState('');
  const [periodGrade, setPeriodGrade] = useState('');
  const [periodClassId, setPeriodClassId] = useState('');
  const [invoiceFeeType, setInvoiceFeeType] = useState('');
  const [invoiceSemesterId, setInvoiceSemesterId] = useState('');
  const [invoiceSettlement, setInvoiceSettlement] = useState(shortcut.get('status') === 'OVERDUE' ? 'OVERDUE' : '');
  const [invoiceGrade, setInvoiceGrade] = useState('');
  const [invoiceClassId, setInvoiceClassId] = useState('');
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [proofStatus, setProofStatus] = useState('SUBMITTED');
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyMethod, setHistoryMethod] = useState('');
  const [historyQuery, setHistoryQuery] = useState('');
  const [refundStatus, setRefundStatus] = useState('REQUESTED');
  const [refundRequest, setRefundRequest] = useState<RefundRequestEditor | null>(null);
  const [refundDecision, setRefundDecision] = useState<RefundDecisionEditor | null>(null);
  const [periodMetadataEditor, setPeriodMetadataEditor] = useState<FeePeriodMetadataEditor | null>(null);
  const [reconciliationFromDate, setReconciliationFromDate] = useState(schoolToday);
  const [reconciliationToDate, setReconciliationToDate] = useState(schoolToday);
  const [reconciliationMethod, setReconciliationMethod] = useState('');
  const [reconciliationMinAmount, setReconciliationMinAmount] = useState('');
  const [reconciliationMaxAmount, setReconciliationMaxAmount] = useState('');
  const [reconciliationDetail, setReconciliationDetail] = useState<PaymentReconciliation | null>(null);
  const [proofReview, setProofReview] = useState<{ proof: PaymentProof; payment: Payment; downloadUrl: string } | null>(null);
  const [proofRetryReason, setProofRetryReason] = useState('');
  const [proofVerified, setProofVerified] = useState(false);
  const [pf, setPf] = useState<{
    code: string; name: string; feeType: string; academicYearId: string; semesterId: string;
    targetType: FinanceTargetType; targetIds: string[]; dueDate: string;
  }>({
    code: '', name: '', feeType: 'TUITION', academicYearId: '', semesterId: '',
    targetType: 'ALL', targetIds: [], dueDate: '',
  });
  const [itf, setItf] = useState<{ name: string; amount: number; targetType: FinanceTargetType; targetIds: string[] }>({
    name: '', amount: 1000000, targetType: 'ALL', targetIds: [],
  });
  const selectedPeriod = periods.data?.find((period) => period.id === sel) || null;
  const sortedClasses = useMemo(() => [...(classes.data || [])]
    .sort((a, b) => a.code.localeCompare(b.code, 'vi', { numeric: true })), [classes.data]);
  const classById = useMemo(() => new Map(sortedClasses.map((item) => [item.id, item])), [sortedClasses]);
  const feePeriodById = useMemo(() => new Map((periods.data || []).map((period) => [period.id, period])), [periods.data]);
  const semesterById = useMemo(() => new Map((semesters.data || []).map((semester) => [semester.id, semester])), [semesters.data]);
  const studentById = useMemo(() => new Map((students.data || []).map((item) => [item.id, item])), [students.data]);
  const periodSemesterOptions = (semesters.data || []).filter((semester) => !pf.academicYearId || semester.academicYearId === pf.academicYearId);
  const metadataSemesterOptions = (semesters.data || []).filter((semester) =>
    semester.academicYearId === periodMetadataEditor?.academicYearId);
  const periodClassOptions = sortedClasses.filter((item) => !periodGrade || item.gradeLevel === periodGrade);
  const periodStudentOptions = [...(students.data || [])]
    .filter((student) => student.classId === periodClassId)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

  const showIssues = (title: string, details: string[], message = 'Vui lòng bổ sung các thông tin sau trước khi tiếp tục.') => {
    setDialog({ tone: 'warning', title, message, details });
  };
  const showFailure = (title: string, error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    setDialog({ tone: 'danger', title, message, details: ['Dữ liệu chưa được thay đổi.'] });
  };
  const ask = (options: Omit<FinanceDialogState, 'onConfirm'>, onConfirm: () => void | Promise<void>) => {
    setDialog({ ...options, onConfirm });
  };

  const toggleTarget = (ids: string[], id: string) => ids.includes(id)
    ? ids.filter((value) => value !== id) : [...ids, id];

  const targetSummary = (type?: FinanceTargetType, ids: string[] = []) => {
    const effectiveType = type || 'ALL';
    if (effectiveType === 'ALL') return FINANCE_TARGET_LABEL.ALL;
    if (effectiveType === 'GRADE') return ids.map((id) => id.replace('K', 'Khối ')).join(', ');
    if (effectiveType === 'CLASS') return ids.map((id) => classes.data?.find((item) => item.id === id)?.code || id).join(', ');
    return `${ids.length} học sinh`;
  };

  const selectedPeriodStudents = useMemo(() => {
    if (!selectedPeriod) return [];
    return (students.data || []).filter((student) => {
      if (selectedPeriod.targetType === 'ALL') return true;
      if (selectedPeriod.targetType === 'STUDENT') return selectedPeriod.targetIds.includes(student.id);
      if (selectedPeriod.targetType === 'CLASS') return !!student.classId && selectedPeriod.targetIds.includes(student.classId);
      const grade = student.classId ? classById.get(student.classId)?.gradeLevel : null;
      return !!grade && selectedPeriod.targetIds.includes(grade);
    }).sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [selectedPeriod, students.data, classById]);

  const periodAllLabel = selectedPeriod?.targetType === 'CLASS' && selectedPeriod.targetIds.length === 1
    ? `Toàn bộ lớp ${classById.get(selectedPeriod.targetIds[0])?.code || ''}`.trim()
    : selectedPeriod?.targetType === 'GRADE' && selectedPeriod.targetIds.length === 1
      ? `Toàn bộ ${selectedPeriod.targetIds[0].replace('K', 'khối ')}`
      : selectedPeriod?.targetType === 'STUDENT'
        ? `Toàn bộ ${selectedPeriod.targetIds.length} học sinh đã chọn`
        : 'Toàn bộ học sinh trong phạm vi';

  const itemTargetSummary = (item: FeePeriodItem) => item.targetType === 'ALL'
    ? periodAllLabel
    : studentById.get(item.targetIds?.[0])?.fullName || 'Một học sinh';

  const periodRows = useMemo(() => {
    return (periods.data || []).filter((period) => {
      if (periodFilterFeeType && (period.feeType || 'OTHER') !== periodFilterFeeType) return false;
      if (periodFilterSemesterId && period.semesterId !== periodFilterSemesterId) return false;
      if (periodFilterStatus && period.status !== periodFilterStatus) return false;
      return true;
    });
  }, [periods.data, periodFilterFeeType, periodFilterSemesterId, periodFilterStatus]);

  const invoiceRows = useMemo(() => {
    const query = normalizeFinanceSearch(invoiceQuery);
    const statusOrder: Record<string, number> = { PENDING: 0, PARTIAL: 1, OVERDUE: 2, PAID: 3, CANCELLED: 4, VOID: 4 };
    return [...(invoices.data || [])].filter((invoice) => {
      const student = studentById.get(invoice.studentId);
      const schoolClass = student?.classId ? classById.get(student.classId) : null;
      const period = invoice.feePeriodId ? feePeriodById.get(invoice.feePeriodId) : null;
      if (invoiceFeeType && (period?.feeType || 'OTHER') !== invoiceFeeType) return false;
      if (invoiceSemesterId && period?.semesterId !== invoiceSemesterId) return false;
      if (invoiceGrade && schoolClass?.gradeLevel !== invoiceGrade) return false;
      if (invoiceClassId && student?.classId !== invoiceClassId) return false;
      if (invoiceSettlement === 'UNPAID' && !['PENDING', 'PARTIAL', 'OVERDUE'].includes(invoice.status)) return false;
      if (invoiceSettlement === 'PAID' && invoice.status !== 'PAID') return false;
      if (invoiceSettlement === 'INACTIVE' && !['CANCELLED', 'VOID'].includes(invoice.status)) return false;
      if (invoiceSettlement === 'OVERDUE' && invoice.status !== 'OVERDUE') return false;
      if (!query) return true;
      return normalizeFinanceSearch([
        invoice.code, invoice.studentName, student?.username, student?.studentCode,
        student?.phone, student?.guardianPhone, student?.email,
        invoice.feePeriodId ? feePeriodById.get(invoice.feePeriodId)?.code : '',
      ].filter(Boolean).join(' ')).includes(query);
    }).sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9)
      || (a.dueDate || '').localeCompare(b.dueDate || '')
      || (b.issuedAt || '').localeCompare(a.issuedAt || ''));
  }, [invoices.data, invoiceFeeType, invoiceSemesterId, invoiceGrade, invoiceClassId,
    invoiceSettlement, invoiceQuery, studentById, classById, feePeriodById]);
  const invoiceClassOptions = sortedClasses.filter((schoolClass) => !invoiceGrade || schoolClass.gradeLevel === invoiceGrade);
  const invoiceStats = useMemo(() => ({
    pending: (invoices.data || []).filter((invoice) => invoice.status === 'PENDING').length,
    partial: (invoices.data || []).filter((invoice) => invoice.status === 'PARTIAL').length,
    overdue: (invoices.data || []).filter((invoice) => invoice.status === 'OVERDUE').length,
    paid: (invoices.data || []).filter((invoice) => invoice.status === 'PAID').length,
  }), [invoices.data]);
  const proofRows = useMemo(() => (paymentProofs.data || [])
    .filter((proof) => !proofStatus || proof.status === proofStatus), [paymentProofs.data, proofStatus]);
  const historyRows = useMemo(() => {
    const query = normalizeFinanceSearch(historyQuery);
    return (paymentHistory.data || []).filter((payment) => {
      if (historyStatus && payment.status !== historyStatus) return false;
      if (historyMethod && payment.method !== historyMethod) return false;
      if (!query) return true;
      return normalizeFinanceSearch([
        payment.studentName, payment.studentCode, payment.invoiceCode, payment.feePeriodCode,
        payment.txnRef, payment.providerTransactionId, payment.receiptNumber,
      ].filter(Boolean).join(' ')).includes(query);
    });
  }, [paymentHistory.data, historyStatus, historyMethod, historyQuery]);
  const historyStats = useMemo(() => ({
    success: (paymentHistory.data || []).filter((payment) => payment.status === 'SUCCESS').length,
    pending: (paymentHistory.data || []).filter((payment) => payment.status === 'PENDING').length,
    failed: (paymentHistory.data || []).filter((payment) => payment.status === 'FAILED').length,
    reversed: (paymentHistory.data || []).filter((payment) => payment.status === 'REVERSED').length,
  }), [paymentHistory.data]);
  const refundRows = useMemo(() => (paymentRefunds.data || [])
    .filter((refund) => !refundStatus || refund.status === refundStatus)
    .sort((a, b) => {
      const order: Record<string, number> = { REQUESTED: 0, COMPLETED: 1, REJECTED: 2, CANCELLED: 3 };
      return (order[a.status] ?? 9) - (order[b.status] ?? 9)
        || (b.requestedAt || '').localeCompare(a.requestedAt || '');
    }), [paymentRefunds.data, refundStatus]);
  const submittedProofByInvoice = useMemo(() => {
    const result = new Map<string, PaymentProof>();
    for (const proof of paymentProofs.data || []) {
      if (proof.status === 'SUBMITTED' && !result.has(proof.invoiceId)) result.set(proof.invoiceId, proof);
    }
    return result;
  }, [paymentProofs.data]);

  const changePeriodTargetType = (targetType: FinanceTargetType) => {
    setPeriodGrade('');
    setPeriodClassId('');
    setPf((current) => ({ ...current, targetType, targetIds: [] }));
  };

  const selectPeriodGrade = (grade: string) => {
    setPeriodGrade(grade);
    setPeriodClassId('');
    setPf((current) => ({
      ...current,
      targetIds: current.targetType === 'GRADE' && grade ? [grade] : [],
    }));
  };

  const selectPeriodClass = (classId: string) => {
    setPeriodClassId(classId);
    setPf((current) => ({
      ...current,
      targetIds: current.targetType === 'CLASS' && classId ? [classId] : [],
    }));
  };

  const periodScopeFields = pf.targetType === 'ALL' ? (
    <div className="finance-scope-note">Đợt thu sẽ áp dụng cho toàn bộ học sinh đang hoạt động.</div>
  ) : (
    <div className="finance-scope-cascade">
      <label>
        <span><b>1</b> Chọn khối</span>
        <select className="live-select" aria-label="Chọn khối cho đợt thu" value={periodGrade} onChange={(event) => selectPeriodGrade(event.target.value)}>
          <option value="">— Chọn khối —</option>
          {FINANCE_GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}
        </select>
      </label>
      {pf.targetType !== 'GRADE' && (
        <label>
          <span><b>2</b> Chọn lớp</span>
          <select className="live-select" aria-label="Chọn lớp cho đợt thu" disabled={!periodGrade} value={periodClassId} onChange={(event) => selectPeriodClass(event.target.value)}>
            <option value="">— Chọn lớp —</option>
            {periodClassOptions.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}
          </select>
        </label>
      )}
      {pf.targetType === 'STUDENT' && (
        <div className="finance-scope-students">
          <span><b>3</b> Chọn học sinh của lớp</span>
          {!periodClassId ? <small>Chọn khối và lớp để tải danh sách học sinh.</small> : !periodStudentOptions.length
            ? <small>Lớp này chưa có học sinh đang hoạt động.</small>
            : <div className="finance-target-picker" role="group" aria-label="Danh sách học sinh của lớp">
              {periodStudentOptions.map((student) => (
                <label key={student.id} className={pf.targetIds.includes(student.id) ? 'selected' : ''}>
                  <input type="checkbox" checked={pf.targetIds.includes(student.id)} onChange={() => setPf((current) => ({
                    ...current, targetIds: toggleTarget(current.targetIds, student.id),
                  }))} />
                  <span>{student.fullName}<small>{student.studentCode || student.username}</small></span>
                </label>
              ))}
            </div>}
        </div>
      )}
    </div>
  );

  const choosePeriod = (id: string) => {
    setSel(id);
    setPreview(null);
  };

  const createPeriod = async () => {
    const issues: string[] = [];
    if (!pf.code.trim()) issues.push('Nhập mã đợt thu.');
    if (!pf.name.trim()) issues.push('Nhập tên đợt thu.');
    if (!pf.feeType) issues.push('Chọn loại khoản thu.');
    if (!pf.academicYearId) issues.push('Chọn năm học.');
    if (!pf.semesterId) issues.push('Chọn học kỳ.');
    if (!pf.dueDate) issues.push('Chọn hạn thanh toán.');
    if (pf.targetType !== 'ALL' && !periodGrade) issues.push('Chọn khối áp dụng.');
    if (['CLASS', 'STUDENT'].includes(pf.targetType) && !periodClassId) issues.push('Chọn lớp áp dụng.');
    if (pf.targetType === 'STUDENT' && !pf.targetIds.length) issues.push('Chọn ít nhất một học sinh trong lớp.');
    if (issues.length) return showIssues('Chưa thể tạo đợt thu', issues);
    setBusy('create');
    try {
      const created = await api.post<FeePeriod>('/fee-periods', { ...pf, dueDate: pf.dueDate || null });
      toast.show('ok', `Đã tạo bản nháp ${created.code}`);
      setPf({
        code: '', name: '', feeType: 'TUITION', academicYearId: '', semesterId: '',
        targetType: 'ALL', targetIds: [], dueDate: '',
      });
      setPeriodGrade(''); setPeriodClassId('');
      setSel(created.id); setPreview(null); periods.reload();
    } catch (error) { showFailure('Không thể tạo đợt thu', error); }
    finally { setBusy(''); }
  };

  const openPeriodMetadataEditor = (period: FeePeriod) => {
    setPeriodMetadataEditor({
      period,
      feeType: period.feeType || 'OTHER',
      academicYearId: period.academicYearId || '',
      semesterId: period.semesterId || '',
    });
  };

  const savePeriodMetadata = async () => {
    if (!periodMetadataEditor) return;
    const issues: string[] = [];
    if (!periodMetadataEditor.feeType) issues.push('Chọn loại khoản thu.');
    if (!periodMetadataEditor.academicYearId) issues.push('Chọn năm học.');
    if (!periodMetadataEditor.semesterId) issues.push('Chọn học kỳ.');
    const selectedSemester = (semesters.data || [])
      .find((semester) => semester.id === periodMetadataEditor.semesterId);
    if (selectedSemester && selectedSemester.academicYearId !== periodMetadataEditor.academicYearId) {
      issues.push('Học kỳ không thuộc năm học đã chọn.');
    }
    if (issues.length) return showIssues('Chưa thể cập nhật phân loại', issues);

    setBusy(`metadata:${periodMetadataEditor.period.id}`);
    try {
      const updated = await api.put<FeePeriod>(
        `/fee-periods/${encodeURIComponent(periodMetadataEditor.period.id)}/metadata`,
        {
          feeType: periodMetadataEditor.feeType,
          academicYearId: periodMetadataEditor.academicYearId,
          semesterId: periodMetadataEditor.semesterId,
        },
      );
      setPeriodMetadataEditor(null);
      toast.show('ok', `Đã cập nhật phân loại ${updated.code}`);
      periods.reload();
    } catch (error) {
      showFailure('Không thể cập nhật phân loại đợt thu', error);
    } finally {
      setBusy('');
    }
  };

  const addItem = async () => {
    const issues: string[] = [];
    if (!sel) issues.push('Chọn một đợt thu đang ở trạng thái bản nháp.');
    if (!itf.name.trim()) issues.push('Nhập tên khoản thu.');
    if (itf.amount <= 0) issues.push('Số tiền phải lớn hơn 0.');
    if (itf.targetType === 'STUDENT' && itf.targetIds.length !== 1) issues.push('Chọn đúng một học sinh trong phạm vi đợt thu.');
    if (issues.length) return showIssues('Chưa thể thêm khoản thu', issues);
    setBusy(`item:${sel}`);
    try {
      await api.post(`/fee-periods/${sel}/items`, itf);
      toast.show('ok', 'Đã thêm khoản thu');
      setItf({ name: '', amount: 1000000, targetType: 'ALL', targetIds: [] });
      setPreview(null); items.reload();
    } catch (error) { showFailure('Không thể thêm khoản thu', error); }
    finally { setBusy(''); }
  };

  const deleteItem = (item: FeePeriodItem) => {
    if (!selectedPeriod || selectedPeriod.status !== 'DRAFT') {
      return showIssues('Không thể xóa khoản thu', ['Chỉ được xóa khoản khi đợt thu đang ở trạng thái bản nháp.']);
    }
    ask({
      tone: 'danger',
      title: 'Xóa khoản thu?',
      message: `Khoản “${item.name}” trị giá ${money(item.amount)} sẽ bị xóa khỏi bản nháp.`,
      details: ['Thao tác này không ảnh hưởng đến đợt thu khác.'],
      confirmLabel: 'Xóa khoản',
    }, async () => {
      setBusy(`delete-item:${item.id}`);
      try {
        await api.del(`/fee-periods/${selectedPeriod.id}/items/${item.id}`);
        toast.show('ok', `Đã xóa khoản ${item.name}`);
        setPreview(null); items.reload();
      } catch (error) { showFailure('Không thể xóa khoản thu', error); }
      finally { setBusy(''); }
    });
  };

  const openPeriod = async (id: string) => {
    setBusy(`open:${id}`);
    try {
      const feeItems = await api.get<FeePeriodItem[]>(`/fee-periods/${id}/items`);
      if (!feeItems.length) {
        choosePeriod(id);
        return showIssues('Chưa thể mở đợt thu', [
          'Bản nháp chưa có khoản thu nào để lập hóa đơn.',
          'Mở phần Chi tiết và thêm ít nhất một khoản thu.',
        ]);
      }
      const period = periods.data?.find((item) => item.id === id);
      ask({
        tone: 'info',
        title: 'Mở đợt thu?',
        message: `${period?.name || 'Đợt thu'} có ${feeItems.length} khoản thu và sẽ sẵn sàng để xem trước.`,
        details: ['Sau khi mở, cần xem trước trước khi phát hành hóa đơn.'],
        confirmLabel: 'Mở đợt thu',
      }, async () => {
        setBusy(`open:${id}`);
        try {
          await api.post(`/fee-periods/${id}/open`);
          toast.show('ok', 'Đã mở đợt thu'); setPreview(null); periods.reload();
        } catch (error) { showFailure('Không thể mở đợt thu', error); }
        finally { setBusy(''); }
      });
    } catch (error) { showFailure('Không thể kiểm tra đợt thu', error); }
    finally { setBusy(''); }
  };

  const loadPreview = async (id: string) => {
    setSel(id); setBusy(`preview:${id}`);
    try {
      const result = await api.get<InvoicePreview>(`/fee-periods/${id}/preview`);
      setPreview(result);
      toast.show('ok', `Sẵn sàng phát hành ${result.newInvoiceCount} hóa đơn`);
    } catch (error) { showFailure('Không thể xem trước hóa đơn', error); }
    finally { setBusy(''); }
  };

  const generate = async (id: string) => {
    if (preview?.feePeriodId !== id) {
      return showIssues('Chưa thể phát hành', ['Bấm “Xem trước” để kiểm tra số học sinh và tổng tiền trước.']);
    }
    if (!preview.newInvoiceCount) {
      return showIssues('Không có hóa đơn cần phát hành', ['Tất cả học sinh trong phạm vi đã có hóa đơn hoặc chưa có khoản thu phù hợp.']);
    }
    ask({
      tone: 'info',
      title: 'Phát hành hóa đơn?',
      message: `Hệ thống sẽ phát hành ${preview.newInvoiceCount} hóa đơn với tổng giá trị ${money(preview.newTotalAmount)}.`,
      details: ['Học sinh và phụ huynh sẽ nhận thông báo.', 'Sau khi phát hành, hãy thu hồi về nháp nếu cần chỉnh sửa.'],
      confirmLabel: 'Phát hành',
    }, async () => {
      setBusy(`generate:${id}`);
      try {
        const created = await api.post<Invoice[]>(`/fee-periods/${id}/generate-invoices`);
        toast.show('ok', `Đã phát hành ${created.length} hóa đơn và gửi thông báo`);
        setPreview(null); invoices.reload(); periods.reload();
      } catch (error) { showFailure('Không thể phát hành hóa đơn', error); }
      finally { setBusy(''); }
    });
  };

  const closePeriod = (id: string) => {
    ask({
      tone: 'warning',
      title: 'Đóng đợt thu?',
      message: 'Đợt thu sẽ chuyển sang trạng thái đã đóng và không thể chỉnh sửa hay thu hồi.',
      details: ['Các hóa đơn đã phát hành và lịch sử thanh toán vẫn được giữ nguyên.'],
      confirmLabel: 'Đóng đợt thu',
    }, async () => {
      setBusy(`close:${id}`);
      try { await api.post(`/fee-periods/${id}/close`); toast.show('ok', 'Đã đóng đợt thu'); setPreview(null); periods.reload(); }
      catch (error) { showFailure('Không thể đóng đợt thu', error); }
      finally { setBusy(''); }
    });
  };

  const cancelPeriod = (id: string) => {
    ask({
      tone: 'danger',
      title: 'Hủy đợt thu?',
      message: 'Đợt thu và toàn bộ hóa đơn chưa thanh toán sẽ bị hủy.',
      details: ['Không thể hủy nếu đã phát sinh thanh toán.', 'Thao tác được ghi vào lịch sử hệ thống.'],
      confirmLabel: 'Hủy đợt thu',
    }, async () => {
      setBusy(`cancel:${id}`);
      try {
        await api.post(`/fee-periods/${id}/cancel`, { reason: 'Hủy từ màn quản trị tài chính' });
        toast.show('ok', 'Đã hủy đợt thu'); setPreview(null); periods.reload(); invoices.reload();
      } catch (error) { showFailure('Không thể hủy đợt thu', error); }
      finally { setBusy(''); }
    });
  };

  const recallPeriod = (id: string) => {
    ask({
      tone: 'warning',
      title: 'Thu hồi về bản nháp?',
      message: 'Các hóa đơn chưa thanh toán sẽ được thu hồi để bạn chỉnh sửa hoặc xóa khoản thu.',
      details: ['Không thể thu hồi nếu đã có giao dịch thanh toán.', 'Học sinh và phụ huynh sẽ nhận thông báo thu hồi.'],
      confirmLabel: 'Lưu về nháp',
    }, async () => {
      setBusy(`recall:${id}`);
      try {
        await api.post(`/fee-periods/${id}/recall`);
        toast.show('ok', 'Đã thu hồi đợt thu về bản nháp'); setPreview(null); periods.reload(); invoices.reload();
      } catch (error) { showFailure('Không thể thu hồi đợt thu', error); }
      finally { setBusy(''); }
    });
  };

  const confirmCash = (invoice: Invoice) => {
    ask({
      tone: 'info',
      title: 'Xác nhận thu tiền mặt?',
      message: `${invoice.studentName} đã nộp ${money(invoice.totalAmount - invoice.paidAmount)} tại trường.`,
      details: [`Hóa đơn: ${invoice.code}`, 'Thao tác sẽ được ghi vào lịch sử thanh toán.'],
      confirmLabel: 'Xác nhận đã thu',
    }, async () => {
      setBusy(`cash:${invoice.id}`);
      try {
        const initiated = await api.post<PaymentInitResponse>('/payments', { invoiceId: invoice.id, method: 'CASH' });
        await api.post(`/payments/${encodeURIComponent(initiated.payment.id)}/cash-confirm`);
        toast.show('ok', `Đã ghi nhận thu tiền mặt ${invoice.code}`);
        invoices.reload();
        paymentHistory.reload();
      } catch (error) { showFailure('Không thể xác nhận thu tiền', error); }
      finally { setBusy(''); }
    });
  };

  const openPaymentProof = async (proof: PaymentProof) => {
    setBusy(`proof:view:${proof.id}`);
    try {
      const [file, payment] = await Promise.all([
        api.post<{ downloadUrl: string }>(`/files/${encodeURIComponent(proof.fileId)}/presigned-download`),
        api.get<Payment>(`/payments/${encodeURIComponent(proof.paymentId)}`),
      ]);
      setProofRetryReason('');
      setProofVerified(false);
      setProofReview({ proof, payment, downloadUrl: file.downloadUrl });
    } catch (error) {
      showFailure('Không thể mở biên lai', error);
    } finally {
      setBusy('');
    }
  };

  const approvePaymentProof = async () => {
    if (!proofReview) return;
    if (!proofVerified) {
      toast.show('err', 'Hãy xác nhận đã đối chiếu giao dịch trên tài khoản MB');
      return;
    }
    setBusy(`proof:approve:${proofReview.proof.id}`);
    try {
      await api.post<PaymentProofDecision>(`/payment-proofs/${encodeURIComponent(proofReview.proof.id)}/approve`);
      toast.show('ok', `Đã xác nhận thu ${proofReview.proof.invoiceCode}`);
      setProofReview(null);
      paymentProofs.reload();
      invoices.reload();
      paymentHistory.reload();
    } catch (error) {
      showFailure('Không thể duyệt biên lai', error);
    } finally {
      setBusy('');
    }
  };

  const requestPaymentAgain = async () => {
    if (!proofReview) return;
    if (!proofRetryReason.trim()) {
      toast.show('err', 'Bắt buộc nhập lý do yêu cầu thanh toán lại');
      return;
    }
    setBusy(`proof:retry:${proofReview.proof.id}`);
    try {
      await api.post<PaymentProofDecision>(`/payment-proofs/${encodeURIComponent(proofReview.proof.id)}/request-repayment`, {
        reason: proofRetryReason.trim(),
      });
      toast.show('ok', `Đã yêu cầu thanh toán lại ${proofReview.proof.invoiceCode}`);
      setProofReview(null);
      paymentProofs.reload();
      invoices.reload();
      paymentHistory.reload();
    } catch (error) {
      showFailure('Không thể gửi yêu cầu thanh toán lại', error);
    } finally {
      setBusy('');
    }
  };

  const remindInvoice = (invoice: Invoice) => {
    ask({
      tone: 'warning',
      title: 'Gửi nhắc thanh toán?',
      message: `Gửi thông báo quá hạn của ${invoice.code} cho ${invoice.studentName} và phụ huynh liên kết.`,
      details: [`Số tiền còn thiếu: ${money(invoice.totalAmount - invoice.paidAmount)}`],
      confirmLabel: 'Gửi nhắc nhở',
    }, async () => {
      setBusy(`remind:${invoice.id}`);
      try {
        await api.post(`/invoices/${invoice.id}/remind`);
        toast.show('ok', `Đã gửi nhắc thanh toán ${invoice.code}`);
      } catch (error) { showFailure('Không thể gửi nhắc nhở', error); }
      finally { setBusy(''); }
    });
  };

  const downloadPaymentReceipt = async (payment: PaymentHistory) => {
    setBusy(`receipt:download:${payment.paymentId}`);
    try {
      const result = await api.get<PaymentReceiptDownload>(`/payments/${encodeURIComponent(payment.paymentId)}/receipt`);
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.click();
    } catch (error) {
      showFailure('Không thể tải biên nhận', error);
    } finally {
      setBusy('');
    }
  };

  const issuePaymentReceipt = async (payment: PaymentHistory) => {
    setBusy(`receipt:issue:${payment.paymentId}`);
    try {
      const receipt = await api.post<PaymentReceipt>(`/payments/${encodeURIComponent(payment.paymentId)}/receipt/issue`);
      paymentHistory.reload();
      if (receipt.status === 'ISSUED') {
        toast.show('ok', `Đã phát hành biên nhận ${receipt.receiptNumber}`);
      } else {
        showIssues('Biên nhận chưa được tạo', [receipt.generationError || 'MinIO chưa sẵn sàng. Hãy kiểm tra dịch vụ và thử lại.']);
      }
    } catch (error) {
      showFailure('Không thể phát hành biên nhận', error);
    } finally {
      setBusy('');
    }
  };

  const availableRefundAmount = (payment: PaymentHistory) => Math.max(0,
    payment.amount - (payment.refundedAmount || 0) - (payment.pendingRefundAmount || 0));

  const openRefundRequest = (payment: PaymentHistory) => {
    const available = availableRefundAmount(payment);
    if (payment.status !== 'SUCCESS' || available <= 0) {
      return showIssues('Không thể tạo yêu cầu hoàn tiền', [
        'Giao dịch phải đang thành công và còn số tiền chưa hoàn hoặc chưa được giữ chỗ.',
      ]);
    }
    setRefundRequest({ payment, mode: 'FULL', amount: String(available), reason: '' });
  };

  const submitRefundRequest = async () => {
    if (!refundRequest) return;
    const available = availableRefundAmount(refundRequest.payment);
    const amount = refundRequest.mode === 'FULL'
      ? available : Math.trunc(Number(refundRequest.amount));
    if (!Number.isFinite(amount) || amount <= 0 || amount > available) {
      return toast.show('err', `Số tiền hoàn phải từ 1 đến ${money(available)}`);
    }
    if (!refundRequest.reason.trim()) return toast.show('err', 'Bắt buộc nhập lý do hoàn tiền');
    setBusy(`refund:request:${refundRequest.payment.paymentId}`);
    try {
      const created = await api.post<PaymentRefund>(`/payments/${encodeURIComponent(refundRequest.payment.paymentId)}/refunds`, {
        amount,
        reason: refundRequest.reason.trim(),
      });
      setRefundRequest(null);
      toast.show('ok', `Đã tạo yêu cầu ${created.refundNumber}`);
      paymentRefunds.reload();
      paymentHistory.reload();
    } catch (error) {
      setRefundRequest(null);
      showFailure('Không thể tạo yêu cầu hoàn tiền', error);
    } finally {
      setBusy('');
    }
  };

  const openRefundDecision = (refund: PaymentRefund, action: RefundDecisionEditor['action']) => {
    if ((action === 'approve' || action === 'reject') && refund.requestedBy === currentAdmin?.id) {
      return showIssues('Cần Admin thứ hai xử lý', [
        'Admin tạo yêu cầu không được tự duyệt hoặc tự từ chối.',
        'Hãy đăng nhập bằng tài khoản admin.finance để tiếp tục.',
      ], 'Quy trình hoàn tiền bắt buộc tách người tạo và người kiểm tra.');
    }
    setRefundDecision({ refund, action, method: 'MB_BANK_TRANSFER', reference: '', reason: '', verified: false });
  };

  const submitRefundDecision = async () => {
    if (!refundDecision) return;
    const { refund, action } = refundDecision;
    if (action === 'approve' && !refundDecision.verified) {
      return toast.show('err', 'Hãy xác nhận tiền đã được hoàn thực tế trước khi duyệt');
    }
    if (action === 'approve' && refundDecision.method !== 'CASH' && !refundDecision.reference.trim()) {
      return toast.show('err', 'Hoàn không dùng tiền mặt bắt buộc có mã tham chiếu');
    }
    if (action !== 'approve' && !refundDecision.reason.trim()) {
      return toast.show('err', 'Bắt buộc nhập lý do xử lý yêu cầu');
    }
    setBusy(`refund:${action}:${refund.id}`);
    try {
      const body = action === 'approve'
        ? { method: refundDecision.method, reference: refundDecision.reference.trim() || null }
        : { reason: refundDecision.reason.trim() };
      const updated = await api.post<PaymentRefund>(`/payment-refunds/${encodeURIComponent(refund.id)}/${action}`, body);
      setRefundDecision(null);
      toast.show('ok', action === 'approve'
        ? `Đã xác nhận hoàn ${money(updated.amount)}`
        : action === 'reject' ? 'Đã từ chối yêu cầu hoàn tiền' : 'Đã hủy yêu cầu hoàn tiền');
      paymentRefunds.reload();
      paymentHistory.reload();
      invoices.reload();
      reconciliationRuns.reload();
      setReconciliationDetail(null);
    } catch (error) {
      setRefundDecision(null);
      showFailure('Không thể xử lý yêu cầu hoàn tiền', error);
    } finally {
      setBusy('');
    }
  };

  const runReconciliation = async () => {
    if (!reconciliationFromDate || !reconciliationToDate) {
      return toast.show('err', 'Chọn đủ ngày bắt đầu và ngày kết thúc');
    }
    if (reconciliationFromDate > reconciliationToDate) {
      return toast.show('err', 'Ngày bắt đầu không được sau ngày kết thúc');
    }
    const minAmount = reconciliationMinAmount.trim() ? Number(reconciliationMinAmount) : null;
    const maxAmount = reconciliationMaxAmount.trim() ? Number(reconciliationMaxAmount) : null;
    if ((minAmount != null && (!Number.isSafeInteger(minAmount) || minAmount < 0))
      || (maxAmount != null && (!Number.isSafeInteger(maxAmount) || maxAmount < 0))) {
      return toast.show('err', 'Khoảng tiền phải là số nguyên VND không âm');
    }
    if (minAmount != null && maxAmount != null && minAmount > maxAmount) {
      return toast.show('err', 'Số tiền tối thiểu không được lớn hơn số tiền tối đa');
    }
    const rangeLabel = reconciliationFromDate === reconciliationToDate
      ? reconciliationFromDate : `${reconciliationFromDate} - ${reconciliationToDate}`;
    setBusy('reconcile');
    try {
      const result = await api.post<PaymentReconciliation>('/finance/reconciliations', {
        fromDate: reconciliationFromDate,
        toDate: reconciliationToDate,
        minAmount,
        maxAmount,
        method: reconciliationMethod || null,
      });
      setReconciliationDetail(result);
      reconciliationRuns.reload();
      toast.show(result.status === 'BALANCED' ? 'ok' : 'err', result.status === 'BALANCED'
        ? `Đối soát ${rangeLabel} đã khớp sổ`
        : `Phát hiện ${result.discrepancyCount} sai lệch cần kiểm tra`);
    } catch (error) {
      showFailure('Không thể chạy đối soát', error);
    } finally {
      setBusy('');
    }
  };

  const loadReconciliation = async (id: string) => {
    setBusy(`reconcile:view:${id}`);
    try {
      setReconciliationDetail(await api.get<PaymentReconciliation>(`/finance/reconciliations/${encodeURIComponent(id)}`));
    } catch (error) {
      showFailure('Không thể mở kết quả đối soát', error);
    } finally {
      setBusy('');
    }
  };

  return (
    <>
      {toast.node}
      <FinanceActionDialog dialog={dialog} onClose={() => setDialog(null)} />
      {refundRequest && (
        <Modal
          title="Tạo yêu cầu hoàn tiền"
          onClose={() => setRefundRequest(null)}
          footer={(
            <>
              <button className="live-btn ghost" type="button" onClick={() => setRefundRequest(null)}>Đóng</button>
              <button className="live-btn" type="button" disabled={!!busy} onClick={submitRefundRequest}><Undo2 size={15} /> Gửi yêu cầu</button>
            </>
          )}
        >
          <div className="finance-refund-summary">
            <span>{refundRequest.payment.invoiceCode} · {refundRequest.payment.studentName}</span>
            <strong>Có thể hoàn: {money(availableRefundAmount(refundRequest.payment))}</strong>
          </div>
          <Field label="Hình thức hoàn *">
            <div className="finance-refund-mode" role="group" aria-label="Hình thức hoàn tiền">
              <button type="button" className={refundRequest.mode === 'FULL' ? 'active' : ''}
                onClick={() => setRefundRequest({ ...refundRequest, mode: 'FULL', amount: String(availableRefundAmount(refundRequest.payment)) })}>
                Toàn bộ còn lại
              </button>
              <button type="button" className={refundRequest.mode === 'PARTIAL' ? 'active' : ''}
                onClick={() => setRefundRequest({ ...refundRequest, mode: 'PARTIAL' })}>
                Một phần
              </button>
            </div>
          </Field>
          <Field label="Số tiền hoàn (VND) *">
            <input type="number" min="1" max={availableRefundAmount(refundRequest.payment)} step="1" value={refundRequest.amount}
              disabled={refundRequest.mode === 'FULL'}
              onChange={(event) => setRefundRequest({ ...refundRequest, amount: event.target.value })} />
          </Field>
          <Field label="Lý do hoàn tiền *">
            <textarea maxLength={500} rows={4} value={refundRequest.reason}
              placeholder="Nêu rõ căn cứ và lý do cần hoàn"
              onChange={(event) => setRefundRequest({ ...refundRequest, reason: event.target.value })} />
          </Field>
          <p className="finance-refund-note"><CircleAlert size={16} /> Yêu cầu mới chỉ giữ chỗ số tiền. Sau khi duyệt, giao dịch còn {money(Math.max(0, availableRefundAmount(refundRequest.payment) - (refundRequest.mode === 'FULL' ? availableRefundAmount(refundRequest.payment) : Math.max(0, Number(refundRequest.amount) || 0))))} có thể hoàn tiếp.</p>
        </Modal>
      )}
      {refundDecision && (
        <Modal
          title={refundDecision.action === 'approve' ? 'Xác nhận đã hoàn tiền'
            : refundDecision.action === 'reject' ? 'Từ chối yêu cầu hoàn tiền' : 'Hủy yêu cầu hoàn tiền'}
          onClose={() => setRefundDecision(null)}
          footer={(
            <>
              <button className="live-btn ghost" type="button" onClick={() => setRefundDecision(null)}>Đóng</button>
              <button className={`live-btn ${refundDecision.action !== 'approve' ? 'danger' : ''}`} type="button"
                disabled={!!busy || (refundDecision.action === 'approve'
                  ? !refundDecision.verified || (refundDecision.method !== 'CASH' && !refundDecision.reference.trim())
                  : !refundDecision.reason.trim())}
                onClick={submitRefundDecision}>
                {refundDecision.action === 'approve' ? <CheckCircle2 size={15} /> : <Ban size={15} />}
                {refundDecision.action === 'approve' ? 'Xác nhận hoàn' : refundDecision.action === 'reject' ? 'Từ chối' : 'Hủy yêu cầu'}
              </button>
            </>
          )}
        >
          <div className="finance-refund-summary">
            <span>{refundDecision.refund.refundNumber} · {refundDecision.refund.studentName}</span>
            <strong>{money(refundDecision.refund.amount)}</strong>
            <small>{refundDecision.refund.reason}</small>
          </div>
          {refundDecision.action === 'approve' ? (
            <>
              <Field label="Phương thức hoàn *">
                <select value={refundDecision.method} onChange={(event) => setRefundDecision({
                  ...refundDecision,
                  method: event.target.value,
                  reference: event.target.value === 'CASH' ? '' : refundDecision.reference,
                })}>
                  {Object.entries(REFUND_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </Field>
              {refundDecision.method !== 'CASH' && (
                <Field label="Mã tham chiếu hoàn tiền *">
                  <input maxLength={120} value={refundDecision.reference} placeholder="Ví dụ: FT202607210001"
                    onChange={(event) => setRefundDecision({ ...refundDecision, reference: event.target.value })} />
                </Field>
              )}
              <label className="finance-refund-verification">
                <input type="checkbox" checked={refundDecision.verified}
                  onChange={(event) => setRefundDecision({ ...refundDecision, verified: event.target.checked })} />
                <span><strong>Tôi đã kiểm tra tiền được hoàn thực tế</strong><small>Duyệt sẽ trừ số đã thu của hóa đơn và được ghi vào audit Admin.</small></span>
              </label>
            </>
          ) : (
            <Field label="Lý do xử lý *">
              <textarea maxLength={500} rows={4} value={refundDecision.reason}
                placeholder={refundDecision.action === 'reject' ? 'Nêu lý do không duyệt hoàn tiền' : 'Nêu lý do hủy yêu cầu'}
                onChange={(event) => setRefundDecision({ ...refundDecision, reason: event.target.value })} />
            </Field>
          )}
        </Modal>
      )}
      {proofReview && (
        <Modal
          title={`Biên lai ${proofReview.proof.invoiceCode}`}
          size="wide"
          onClose={() => setProofReview(null)}
          footer={(
            <>
              <button className="live-btn ghost" type="button" onClick={() => setProofReview(null)}>Đóng</button>
              <a className="live-btn ghost" href={proofReview.downloadUrl} target="_blank" rel="noopener noreferrer"><Download size={15} /> Tải biên lai</a>
              {proofReview.proof.status === 'SUBMITTED' && (
                <>
                  <button className="live-btn ghost" type="button" disabled={!!busy || !proofRetryReason.trim()} onClick={requestPaymentAgain}><Undo2 size={15} /> Yêu cầu thanh toán lại</button>
                  <button className="live-btn" type="button" disabled={!!busy || !proofVerified} onClick={approvePaymentProof}><CheckCircle2 size={15} /> Xác nhận đã thu</button>
                </>
              )}
            </>
          )}
        >
          <div className="payment-proof-review">
            <div className="payment-proof-preview">
              {proofReview.proof.contentType === 'application/pdf'
                ? <iframe src={proofReview.downloadUrl} title={`Biên lai ${proofReview.proof.invoiceCode}`} />
                : <img src={proofReview.downloadUrl} alt={`Biên lai ${proofReview.proof.invoiceCode}`} />}
            </div>
            <aside>
              <div><span>Học sinh</span><strong>{proofReview.proof.studentName}</strong><small>{proofReview.proof.studentCode}</small></div>
              <div><span>Hóa đơn</span><strong>{proofReview.proof.invoiceCode}</strong></div>
              <div><span>Số tiền cần đối chiếu</span><strong>{money(proofReview.proof.amount)}</strong></div>
              <div><span>Nội dung chuyển khoản cần khớp</span><strong>{proofReview.payment.bankTransferContent || 'Đối chiếu theo mã hóa đơn và học sinh'}</strong></div>
              <div><span>File biên lai</span><strong>{proofReview.proof.fileName}</strong><small>{(proofReview.proof.sizeBytes / 1024).toFixed(0)} KB</small></div>
              <div><span>Gửi lúc</span><strong>{fmtDateTime(proofReview.proof.submittedAt)}</strong></div>
              <div><span>Trạng thái</span><StatusPill value={proofReview.proof.status} /></div>
              {proofReview.proof.status === 'SUBMITTED' && (
                <>
                  <label className="payment-proof-verification">
                    <input type="checkbox" checked={proofVerified} onChange={(event) => setProofVerified(event.target.checked)} />
                    <span><strong>Đã đối chiếu trên tài khoản MB</strong><small>Giao dịch đã vào tài khoản, đúng số tiền và đúng nội dung chuyển khoản.</small></span>
                  </label>
                  <label className="payment-proof-reason">
                    <span>Lý do yêu cầu thanh toán lại *</span>
                    <textarea className="live-input" maxLength={500} placeholder="Ví dụ: Chưa thấy tiền vào tài khoản, sai số tiền hoặc sai nội dung chuyển khoản" value={proofRetryReason} onChange={(event) => setProofRetryReason(event.target.value)} />
                  </label>
                </>
              )}
              {proofReview.proof.reviewReason && <div className="payment-proof-rejected"><span>Lý do yêu cầu thanh toán lại</span><strong>{proofReview.proof.reviewReason}</strong></div>}
            </aside>
          </div>
        </Modal>
      )}
      {periodMetadataEditor && (
        <Modal
          title={`Phân loại đợt thu · ${periodMetadataEditor.period.code}`}
          onClose={() => !busy && setPeriodMetadataEditor(null)}
          footer={(
            <>
              <button className="live-btn ghost" type="button" disabled={!!busy} onClick={() => setPeriodMetadataEditor(null)}>Hủy</button>
              <button className="live-btn" type="button" disabled={!!busy} onClick={savePeriodMetadata}>
                <Save size={15} /> {busy === `metadata:${periodMetadataEditor.period.id}` ? 'Đang lưu...' : 'Lưu phân loại'}
              </button>
            </>
          )}
        >
          <div className="finance-metadata-context">
            <strong>{periodMetadataEditor.period.name}</strong>
            <span>Trạng thái và toàn bộ hóa đơn hiện có sẽ được giữ nguyên.</span>
          </div>
          <div className="finance-metadata-fields">
            <Field label="Loại khoản thu *">
              <select
                className="live-select"
                value={periodMetadataEditor.feeType}
                onChange={(event) => setPeriodMetadataEditor((current) =>
                  current ? { ...current, feeType: event.target.value } : current)}
              >
                {Object.entries(FINANCE_FEE_TYPE_LABEL).map(([value, label]) =>
                  <option key={value} value={value}>{label}</option>)}
              </select>
            </Field>
            <Field label="Năm học *">
              <select
                className="live-select"
                value={periodMetadataEditor.academicYearId}
                onChange={(event) => setPeriodMetadataEditor((current) => current ? {
                  ...current, academicYearId: event.target.value, semesterId: '',
                } : current)}
              >
                <option value="">— Chọn năm học —</option>
                {(academicYears.data || []).map((year) =>
                  <option key={year.id} value={year.id}>{year.name || year.code}</option>)}
              </select>
            </Field>
            <Field label="Học kỳ *">
              <select
                className="live-select"
                disabled={!periodMetadataEditor.academicYearId}
                value={periodMetadataEditor.semesterId}
                onChange={(event) => setPeriodMetadataEditor((current) =>
                  current ? { ...current, semesterId: event.target.value } : current)}
              >
                <option value="">— Chọn học kỳ —</option>
                {metadataSemesterOptions.map((semester) =>
                  <option key={semester.id} value={semester.id}>{semester.name}</option>)}
              </select>
            </Field>
          </div>
        </Modal>
      )}
      <FunctionTabs tabs={[
        { id: 'periods', label: 'Đợt thu', Icon: CircleDollarSign, content: (
          <Section title="Đợt thu học phí" subtitle="Thiết lập phạm vi, khoản thu và phát hành hóa đơn" wide>
            <div className="finance-create-form">
              <div className="live-toolbar">
                <input className="live-input" placeholder="Mã đợt thu" value={pf.code} onChange={(e) => setPf({ ...pf, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên đợt thu" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} />
                <select className="live-select" aria-label="Loại khoản thu" value={pf.feeType} onChange={(e) => setPf({ ...pf, feeType: e.target.value })}>
                  {Object.entries(FINANCE_FEE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <select className="live-select" aria-label="Năm học của đợt thu" value={pf.academicYearId} onChange={(e) => setPf({ ...pf, academicYearId: e.target.value, semesterId: '' })}>
                  <option value="">— Chọn năm học —</option>
                  {(academicYears.data || []).map((year) => <option key={year.id} value={year.id}>{year.name || year.code}</option>)}
                </select>
                <select className="live-select" aria-label="Học kỳ của đợt thu" disabled={!pf.academicYearId} value={pf.semesterId} onChange={(e) => setPf({ ...pf, semesterId: e.target.value })}>
                  <option value="">— Chọn học kỳ —</option>
                  {periodSemesterOptions.map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
                </select>
                <select className="live-select" aria-label="Phạm vi đợt thu" value={pf.targetType} onChange={(e) => changePeriodTargetType(e.target.value as FinanceTargetType)}>
                  {Object.entries(FINANCE_TARGET_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
                <input className="live-input" type="date" aria-label="Hạn thanh toán" value={pf.dueDate} onChange={(e) => setPf({ ...pf, dueDate: e.target.value })} />
                <button className="live-btn" disabled={busy === 'create'} onClick={createPeriod}><Plus size={15} /> Tạo đợt</button>
              </div>
              {periodScopeFields}
            </div>

            <div className="finance-period-filter">
              <label><span>Loại khoản thu</span><select className="live-select" aria-label="Lọc đợt thu theo loại khoản thu" value={periodFilterFeeType} onChange={(event) => setPeriodFilterFeeType(event.target.value)}>
                <option value="">Tất cả loại</option>
                {Object.entries(FINANCE_FEE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label><span>Học kỳ</span><select className="live-select" aria-label="Lọc đợt thu theo học kỳ" value={periodFilterSemesterId} onChange={(event) => setPeriodFilterSemesterId(event.target.value)}>
                <option value="">Tất cả học kỳ</option>
                {(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
              </select></label>
              <label><span>Trạng thái đợt thu</span><select className="live-select" aria-label="Lọc đợt thu theo trạng thái" value={periodFilterStatus} onChange={(event) => setPeriodFilterStatus(event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="DRAFT">Bản nháp</option><option value="OPEN">Đang mở</option>
                <option value="PUBLISHED">Đã phát hành</option><option value="CLOSED">Đã đóng</option>
                <option value="CANCELLED">Đã hủy</option>
              </select></label>
              <button className="icon-inline-btn" title="Đặt lại bộ lọc đợt thu" aria-label="Đặt lại bộ lọc đợt thu" onClick={() => {
                setPeriodFilterFeeType(''); setPeriodFilterSemesterId(''); setPeriodFilterStatus('');
              }}><RefreshCw size={16} /></button>
              {periods.data && <div className="finance-filter-result">Đang hiển thị <strong>{periodRows.length}</strong> đợt thu phù hợp</div>}
            </div>

            <Async paginate resetKey={`${periodFilterFeeType}|${periodFilterSemesterId}|${periodFilterStatus}`} state={{ ...periods, data: periods.data ? periodRows : null }} empty="Không có đợt thu phù hợp" itemLabel="đợt thu">
              {(list) => (
                <table className="live-table finance-period-table">
                  <thead><tr><th>Mã</th><th>Tên</th><th>Loại khoản thu</th><th>Học kỳ</th><th>Phạm vi</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>{list.map((period) => (
                    <tr key={period.id} className={sel === period.id ? 'is-selected' : ''}>
                      <td><strong>{period.code}</strong></td><td>{period.name}</td>
                      <td>{FINANCE_FEE_TYPE_LABEL[period.feeType || 'OTHER']}</td>
                      <td>{period.semesterId ? semesterById.get(period.semesterId)?.name || 'Không xác định' : 'Chưa gán'}</td>
                      <td>{targetSummary(period.targetType, period.targetIds || [])}</td>
                      <td><StatusPill value={period.status} /></td>
                      <td><div className="finance-row-actions">
                        <button className="live-btn subtle compact" onClick={() => choosePeriod(period.id)}><FileText size={14} /> Chi tiết</button>
                        <button className="live-btn ghost compact" disabled={!!busy} onClick={() => openPeriodMetadataEditor(period)}><Pencil size={14} /> Phân loại</button>
                        {period.status === 'DRAFT' && <button className="live-btn ghost compact" disabled={!!busy} onClick={() => openPeriod(period.id)}><Unlock size={14} /> Mở</button>}
                        {period.status === 'OPEN' && <button className="live-btn ghost compact" disabled={!!busy} onClick={() => loadPreview(period.id)}><Eye size={14} /> Xem trước</button>}
                        {period.status === 'OPEN' && <button className="live-btn compact" disabled={!!busy || preview?.feePeriodId !== period.id || !preview.newInvoiceCount} onClick={() => generate(period.id)}><Send size={14} /> Phát hành</button>}
                        {period.status === 'PUBLISHED' && <button className="live-btn ghost compact" disabled={!!busy} onClick={() => recallPeriod(period.id)}><Undo2 size={14} /> Lưu về nháp</button>}
                        {period.status === 'PUBLISHED' && <button className="live-btn subtle compact" disabled={!!busy} onClick={() => closePeriod(period.id)}><CircleStop size={14} /> Đóng</button>}
                        {['DRAFT', 'OPEN', 'PUBLISHED'].includes(period.status) && <button className="live-btn danger compact" disabled={!!busy} onClick={() => cancelPeriod(period.id)}><Ban size={14} /> Hủy</button>}
                      </div></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Async>

            {selectedPeriod && (
              <div className="finance-period-detail">
                <div className="finance-detail-heading">
                  <div><strong>{selectedPeriod.code} · {selectedPeriod.name}</strong><span>{targetSummary(selectedPeriod.targetType, selectedPeriod.targetIds || [])}</span></div>
                  <StatusPill value={selectedPeriod.status} />
                </div>

                {selectedPeriod.status === 'DRAFT' && (
                  <div className="finance-item-form">
                    <div className="live-toolbar">
                      <input className="live-input grow" placeholder="Tên khoản thu" value={itf.name} onChange={(e) => setItf({ ...itf, name: e.target.value })} />
                      <input className="live-input" aria-label="Số tiền" type="number" min="1" step="100000" value={itf.amount} onChange={(e) => setItf({ ...itf, amount: Number(e.target.value) })} />
                      <select className="live-select" aria-label="Phạm vi khoản thu" value={itf.targetType} onChange={(e) => setItf({ ...itf, targetType: e.target.value as FinanceTargetType, targetIds: [] })}>
                        <option value="ALL">{periodAllLabel}</option>
                        <option value="STUDENT">Một học sinh trong phạm vi</option>
                      </select>
                      <button className="live-btn" disabled={busy === `item:${sel}`} onClick={addItem}><Plus size={15} /> Thêm khoản</button>
                    </div>
                    {itf.targetType === 'STUDENT' && (
                      <label className="finance-individual-picker">
                        <span>Chọn học sinh nhận khoản thu riêng</span>
                        <select className="live-select" aria-label="Chọn học sinh cho khoản thu riêng" value={itf.targetIds[0] || ''} onChange={(event) => setItf({ ...itf, targetIds: event.target.value ? [event.target.value] : [] })}>
                          <option value="">— Chọn một học sinh —</option>
                          {selectedPeriodStudents.map((student) => <option key={student.id} value={student.id}>{student.fullName} · {student.className || 'Chưa có lớp'} · {student.studentCode || student.username}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}

                <Async paginate state={items} empty="Chưa có khoản thu" itemLabel="khoản thu">
                  {(list) => (<table className="live-table"><thead><tr><th>Khoản thu</th><th>Số tiền</th><th>Phạm vi</th>{selectedPeriod.status === 'DRAFT' && <th>Thao tác</th>}</tr></thead>
                    <tbody>{list.map((item) => <tr key={item.id}><td>{item.name}</td><td>{money(item.amount)}</td><td>{itemTargetSummary(item)}</td>{selectedPeriod.status === 'DRAFT' && <td><button className="icon-inline-btn" title="Xóa khoản thu" aria-label={`Xóa khoản ${item.name}`} disabled={!!busy} onClick={() => deleteItem(item)}><Trash2 size={16} /></button></td>}</tr>)}</tbody></table>)}
                </Async>

                {selectedPeriod.status === 'OPEN' && preview?.feePeriodId === selectedPeriod.id && (
                  <div className="finance-preview-panel">
                    <div className="finance-preview-heading"><div><strong>Kết quả xem trước</strong><span>Dữ liệu chưa được ghi thành hóa đơn</span></div><StatusPill value={preview.status} /></div>
                    <div className="finance-preview-metrics">
                      <div><span>Học sinh trong phạm vi</span><strong>{preview.targetedStudentCount}</strong></div>
                      <div><span>Hóa đơn mới</span><strong>{preview.newInvoiceCount}</strong></div>
                      <div><span>Đã phát hành</span><strong>{preview.existingInvoiceCount}</strong></div>
                      <div><span>Tổng phát hành mới</span><strong>{money(preview.newTotalAmount)}</strong></div>
                    </div>
                    <table className="live-table finance-preview-table">
                      <thead><tr><th>Học sinh</th><th>Lớp</th><th>Số khoản</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
                      <tbody>{preview.students.slice(0, 100).map((student) => (
                        <tr key={student.studentId}><td>{student.studentName}</td><td>{student.className || '—'}</td><td>{student.itemCount}</td><td>{money(student.totalAmount)}</td>
                          <td><Badge tone={student.alreadyIssued ? 'green' : 'orange'}>{student.alreadyIssued ? 'Đã có hóa đơn' : 'Chờ phát hành'}</Badge></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Section>
        ) },
        { id: 'invoices', label: 'Hóa đơn & thu tiền', Icon: FileText, content: (
          <Section title="Xác nhận thu học phí" subtitle="Theo dõi và xác nhận các khoản đã thanh toán" wide
            action={<button className="live-btn ghost" onClick={() => { invoices.reload(); toast.show('ok', 'Đang cập nhật danh sách hóa đơn'); }}><RefreshCw size={14} /> Tải lại</button>}>
            <div className="finance-invoice-stats">
              <div><span>Chưa đóng</span><strong>{invoiceStats.pending}</strong></div>
              <div><span>Đã đóng một phần</span><strong>{invoiceStats.partial}</strong></div>
              <div className="overdue"><span>Quá hạn chưa đóng</span><strong>{invoiceStats.overdue}</strong></div>
              <div><span>Đã đóng đủ</span><strong>{invoiceStats.paid}</strong></div>
            </div>
            <div className="finance-invoice-filters">
              <label><span>Loại khoản thu</span><select className="live-select" aria-label="Lọc hóa đơn theo loại khoản thu" value={invoiceFeeType} onChange={(event) => setInvoiceFeeType(event.target.value)}>
                <option value="">Tất cả loại</option>
                {Object.entries(FINANCE_FEE_TYPE_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label><span>Học kỳ</span><select className="live-select" aria-label="Lọc hóa đơn theo học kỳ" value={invoiceSemesterId} onChange={(event) => setInvoiceSemesterId(event.target.value)}>
                <option value="">Tất cả học kỳ</option>
                {(semesters.data || []).map((semester) => <option key={semester.id} value={semester.id}>{semester.name}</option>)}
              </select></label>
              <label><span>Khối</span><select className="live-select" aria-label="Lọc hóa đơn theo khối" value={invoiceGrade} onChange={(event) => {
                setInvoiceGrade(event.target.value); setInvoiceClassId('');
              }}><option value="">Tất cả học sinh</option>{FINANCE_GRADES.map((grade) => <option key={grade.id} value={grade.id}>{grade.label}</option>)}</select></label>
              <label><span>Lớp</span><select className="live-select" aria-label="Lọc hóa đơn theo lớp" value={invoiceClassId} onChange={(event) => setInvoiceClassId(event.target.value)}>
                <option value="">Tất cả lớp</option>{invoiceClassOptions.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code}</option>)}</select></label>
              <label><span>Tình trạng đóng phí</span><select className="live-select" aria-label="Lọc tình trạng đóng phí" value={invoiceSettlement} onChange={(event) => setInvoiceSettlement(event.target.value)}>
                <option value="">Tất cả tình trạng</option>
                <option value="OVERDUE">Chỉ hóa đơn quá hạn</option>
                <option value="UNPAID">Chưa đóng / còn thiếu</option>
                <option value="PAID">Đã đóng đủ</option>
                <option value="INACTIVE">Đã hủy / không hiệu lực</option>
              </select></label>
              <label className="finance-invoice-search"><span>Tìm học sinh hoặc hóa đơn</span><div><Search size={16} /><input className="live-input" value={invoiceQuery} onChange={(event) => setInvoiceQuery(event.target.value)} placeholder="Tên, SĐT, mã HS, mã HĐ, mã đợt thu…" /></div></label>
              <button className="icon-inline-btn finance-filter-reset" title="Đặt lại bộ lọc hóa đơn" aria-label="Đặt lại bộ lọc hóa đơn" onClick={() => {
                setInvoiceFeeType(''); setInvoiceSemesterId(''); setInvoiceGrade('');
                setInvoiceClassId(''); setInvoiceSettlement(''); setInvoiceQuery('');
              }}><RefreshCw size={16} /></button>
            </div>
            <div className="finance-filter-result">Đang hiển thị <strong>{invoiceRows.length}</strong> hóa đơn phù hợp</div>
            <Async paginate resetKey={`${invoiceFeeType}|${invoiceSemesterId}|${invoiceGrade}|${invoiceClassId}|${invoiceSettlement}|${invoiceQuery}`} state={{ ...invoices, data: invoices.data ? invoiceRows : null }} empty="Không có hóa đơn phù hợp" itemLabel="hóa đơn">
              {(list) => (<table className="live-table finance-invoice-table"><thead><tr><th>Mã HĐ</th><th>Học sinh</th><th>Đợt thu</th><th>Lớp</th><th>Hạn thu</th><th>Tổng</th><th>Đã trả</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                <tbody>{list.map((invoice) => (
                  <tr key={invoice.id}>
                    <td><strong>{invoice.code}</strong></td>
                    <td><strong>{invoice.studentName}</strong><small>{studentById.get(invoice.studentId)?.studentCode || studentById.get(invoice.studentId)?.username}</small></td>
                    <td><strong>{invoice.feePeriodId ? feePeriodById.get(invoice.feePeriodId)?.code || '—' : '—'}</strong></td>
                    <td>{studentById.get(invoice.studentId)?.className || '—'}</td><td>{fmtDate(invoice.dueDate)}</td><td>{money(invoice.totalAmount)}</td><td>{money(invoice.paidAmount)}</td>
                    <td><Badge tone={invoice.status === 'PAID' ? 'green' : invoice.status === 'OVERDUE' ? 'red' : invoice.status === 'PARTIAL' ? 'orange' : ['CANCELLED', 'VOID'].includes(invoice.status) ? 'red' : 'blue'}>{INVOICE_SETTLEMENT_LABEL[invoice.status] || viLabel(invoice.status)}</Badge></td>
                    <td><div className="finance-invoice-actions">
                      {submittedProofByInvoice.has(invoice.id)
                        ? <button className="live-btn compact" disabled={!!busy} onClick={() => openPaymentProof(submittedProofByInvoice.get(invoice.id)!)}><FileImage size={14} /> Xem biên lai</button>
                        : ['PENDING', 'OVERDUE', 'PARTIAL'].includes(invoice.status) && <button className="live-btn compact" disabled={!!busy} onClick={() => confirmCash(invoice)}><CheckCircle2 size={14} /> Thu tiền mặt</button>}
                      {invoice.status === 'OVERDUE' && <button className="live-btn ghost compact" disabled={!!busy} onClick={() => remindInvoice(invoice)}><Bell size={14} /> Nhắc đóng tiền</button>}
                      {!['PENDING', 'OVERDUE', 'PARTIAL'].includes(invoice.status) && <Badge tone={invoice.status === 'PAID' ? 'green' : 'red'}>{invoice.status === 'PAID' ? 'Đã thu' : 'Không còn hiệu lực'}</Badge>}
                    </div></td>
                  </tr>
                ))}</tbody></table>)}
            </Async>
          </Section>
        ) },
        { id: 'proofs', label: `Biên lai (${(paymentProofs.data || []).filter((proof) => proof.status === 'SUBMITTED').length})`, Icon: FileImage, content: (
          <Section title="Biên lai chuyển khoản MB" subtitle="Đối chiếu tài khoản ngân hàng trước khi xác nhận đã thu" wide
            action={<button className="live-btn ghost" onClick={() => paymentProofs.reload()}><RefreshCw size={14} /> Tải lại</button>}>
            <div className="payment-proof-toolbar">
              <label><span>Trạng thái</span><select className="live-select" value={proofStatus} onChange={(event) => setProofStatus(event.target.value)}>
                <option value="SUBMITTED">Chờ duyệt</option>
                <option value="APPROVED">Đã duyệt</option>
                <option value="RETRY_REQUIRED">Yêu cầu thanh toán lại</option>
                <option value="">Tất cả</option>
              </select></label>
              <p>Chỉ xác nhận sau khi số tiền và nội dung đã xuất hiện trên tài khoản MB.</p>
            </div>
            <Async paginate resetKey={proofStatus} state={{ ...paymentProofs, data: paymentProofs.data ? proofRows : null }} empty="Không có biên lai phù hợp" itemLabel="biên lai">
              {(list) => (
                <table className="live-table payment-proof-table">
                  <thead><tr><th>Học sinh</th><th>Hóa đơn</th><th>Số tiền</th><th>Biên lai</th><th>Gửi lúc</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>{list.map((proof) => (
                    <tr key={proof.id}>
                      <td><strong>{proof.studentName}</strong><small>{proof.studentCode}</small></td>
                      <td><strong>{proof.invoiceCode}</strong></td>
                      <td>{money(proof.amount)}</td>
                      <td><span className="payment-proof-file">{proof.fileName}</span><small>{(proof.sizeBytes / 1024).toFixed(0)} KB</small></td>
                      <td>{fmtDateTime(proof.submittedAt)}</td>
                      <td><StatusPill value={proof.status} />{proof.reviewReason && <small className="payment-proof-reason-inline">{proof.reviewReason}</small>}</td>
                      <td><button className="live-btn ghost compact" disabled={!!busy} onClick={() => openPaymentProof(proof)}><Eye size={14} /> Xem biên lai</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Async>
          </Section>
        ) },
        { id: 'reconciliation', label: `Đối soát & hoàn tiền (${(paymentRefunds.data || []).filter((refund) => refund.status === 'REQUESTED').length})`, Icon: RefreshCw, content: (
          <Section title="Đối soát & hoàn tiền" subtitle="Đối chiếu sổ thu theo ngày và xử lý hoàn tiền có phê duyệt" wide
            action={<button className="live-btn ghost" onClick={() => { paymentRefunds.reload(); reconciliationRuns.reload(); }}><RefreshCw size={14} /> Tải lại</button>}>
            <div className="finance-reconciliation-toolbar">
              <label><span>Từ ngày</span><input className="live-input" type="date" max={reconciliationToDate || schoolToday()} value={reconciliationFromDate} onChange={(event) => setReconciliationFromDate(event.target.value)} /></label>
              <label><span>Đến ngày</span><input className="live-input" type="date" min={reconciliationFromDate} max={schoolToday()} value={reconciliationToDate} onChange={(event) => setReconciliationToDate(event.target.value)} /></label>
              <label><span>Từ số tiền</span><input className="live-input" type="number" min="0" step="1000" placeholder="Không giới hạn" value={reconciliationMinAmount} onChange={(event) => setReconciliationMinAmount(event.target.value)} /></label>
              <label><span>Đến số tiền</span><input className="live-input" type="number" min="0" step="1000" placeholder="Không giới hạn" value={reconciliationMaxAmount} onChange={(event) => setReconciliationMaxAmount(event.target.value)} /></label>
              <label><span>Phương thức</span><select className="live-select" value={reconciliationMethod} onChange={(event) => setReconciliationMethod(event.target.value)}>
                <option value="">Tất cả phương thức</option>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <button className="live-btn" disabled={!!busy || !reconciliationFromDate || !reconciliationToDate} onClick={runReconciliation}><RefreshCw size={15} /> {busy === 'reconcile' ? 'Đang đối soát…' : 'Chạy đối soát'}</button>
              <p>Khoảng ngày tối đa 31 ngày. Bộ lọc tiền áp dụng theo giá trị payment gốc; hệ thống kiểm tra invoice, refund, biên nhận, IPN VNPAY/MoMo và biên lai MB đã duyệt.</p>
            </div>

            {reconciliationDetail && (
              <div className="finance-reconciliation-detail">
                <div className="finance-detail-heading">
                  <div>
                    <strong>Kết quả {fmtDate(reconciliationDetail.fromDate || reconciliationDetail.reconciliationDate)}{(reconciliationDetail.toDate || reconciliationDetail.reconciliationDate) !== (reconciliationDetail.fromDate || reconciliationDetail.reconciliationDate) ? ` - ${fmtDate(reconciliationDetail.toDate)}` : ''}</strong>
                    <span>{reconciliationDetail.method ? (PAYMENT_METHOD_LABEL[reconciliationDetail.method] || reconciliationDetail.method) : 'Tất cả phương thức'} · {reconciliationDetail.minAmount == null ? '0 đ' : money(reconciliationDetail.minAmount)} đến {reconciliationDetail.maxAmount == null ? 'không giới hạn' : money(reconciliationDetail.maxAmount)}</span>
                    <span>Chạy lúc {fmtDateTime(reconciliationDetail.runAt)} · lần {reconciliationDetail.runCount}</span>
                  </div>
                  <StatusPill value={reconciliationDetail.status} />
                </div>
                <div className="finance-reconciliation-metrics">
                  <div><span>Thực thu</span><strong>{money(reconciliationDetail.grossAmount)}</strong><small>{reconciliationDetail.paymentCount} giao dịch</small></div>
                  <div><span>Hoàn tiền</span><strong>{money(reconciliationDetail.refundAmount)}</strong><small>{reconciliationDetail.refundCount} khoản hoàn</small></div>
                  <div><span>Thực thu ròng</span><strong>{money(reconciliationDetail.netAmount)}</strong><small>Thực thu trừ hoàn tiền</small></div>
                  <div className={reconciliationDetail.discrepancyCount ? 'has-error' : ''}><span>Sai lệch</span><strong>{reconciliationDetail.discrepancyCount}</strong><small>{reconciliationDetail.discrepancyCount ? 'Cần kiểm tra' : 'Đã khớp sổ'}</small></div>
                </div>
                {!!(reconciliationDetail.methodSummaries || []).length && (
                  <table className="live-table finance-reconciliation-method-table">
                    <thead><tr><th>Phương thức</th><th>Giao dịch</th><th>Thực thu</th><th>Khoản hoàn</th><th>Hoàn tiền</th><th>Thực thu ròng</th></tr></thead>
                    <tbody>{reconciliationDetail.methodSummaries.map((summary) => (
                      <tr key={summary.method}><td><strong>{PAYMENT_METHOD_LABEL[summary.method] || summary.method}</strong></td><td>{summary.paymentCount}</td><td>{money(summary.grossAmount)}</td><td>{summary.refundCount}</td><td>{money(summary.refundAmount)}</td><td><strong>{money(summary.netAmount)}</strong></td></tr>
                    ))}</tbody>
                  </table>
                )}
                {!!reconciliationDetail.issues.length && (
                  <table className="live-table finance-reconciliation-issue-table">
                    <thead><tr><th>Mức độ</th><th>Loại sai lệch</th><th>Đối tượng</th><th>Kỳ vọng</th><th>Thực tế</th><th>Nội dung</th></tr></thead>
                    <tbody>{reconciliationDetail.issues.map((issue) => (
                      <tr key={issue.id}><td><StatusPill value={issue.severity} /></td><td><strong>{issue.issueType}</strong></td><td>{issue.entityType}<small>{issue.entityId}</small></td>
                        <td>{issue.expectedAmount == null ? '—' : money(issue.expectedAmount)}</td><td>{issue.actualAmount == null ? '—' : money(issue.actualAmount)}</td><td>{issue.message}</td></tr>
                    ))}</tbody>
                  </table>
                )}
              </div>
            )}

            <div className="finance-subsection-heading">
              <div><strong>Yêu cầu hoàn tiền</strong><small>Yêu cầu chờ duyệt giữ chỗ số tiền nhưng chưa thay đổi hóa đơn.</small></div>
              <label><span>Trạng thái</span><select className="live-select" value={refundStatus} onChange={(event) => setRefundStatus(event.target.value)}>
                <option value="REQUESTED">Chờ duyệt</option><option value="COMPLETED">Đã hoàn</option><option value="REJECTED">Đã từ chối</option><option value="CANCELLED">Đã hủy</option><option value="">Tất cả</option>
              </select></label>
            </div>
            <Async paginate resetKey={refundStatus} state={{ ...paymentRefunds, data: paymentRefunds.data ? refundRows : null }} empty="Không có yêu cầu hoàn tiền phù hợp" itemLabel="yêu cầu hoàn tiền">
              {(list) => (
                <table className="live-table finance-refund-table">
                  <thead><tr><th>Mã hoàn</th><th>Học sinh & hóa đơn</th><th>Số tiền</th><th>Lý do</th><th>Trạng thái & xử lý</th><th>Thao tác</th></tr></thead>
                  <tbody>{list.map((refund) => (
                    <tr key={refund.id}>
                      <td><strong>{refund.refundNumber}</strong><small>{fmtDateTime(refund.requestedAt)}</small></td>
                      <td><strong>{refund.studentName}</strong><small>{refund.studentCode || '—'} · {refund.invoiceCode}</small></td>
                      <td>
                        <strong>{money(refund.amount)}</strong>
                        <small>{REFUND_TYPE_LABEL[refund.refundType || 'PARTIAL'] || refund.refundType}</small>
                        {refund.invoicePaidAmountBefore != null && refund.invoicePaidAmountAfter != null && (
                          <small>Số dư HĐ: {money(refund.invoicePaidAmountBefore)} → {money(refund.invoicePaidAmountAfter)}</small>
                        )}
                      </td>
                      <td><span className="finance-refund-reason">{refund.reason}</span>{(refund.rejectionReason || refund.cancellationReason) && <small>{refund.rejectionReason || refund.cancellationReason}</small>}</td>
                      <td>
                        <StatusPill value={refund.status} />
                        <small>Yêu cầu: {refund.requestedByName || refund.requestedBy}</small>
                        {refund.status === 'REQUESTED' && refund.requestedBy === currentAdmin?.id && <small className="finance-refund-checker-note">Cần Admin khác xử lý</small>}
                        {refund.approvedBy && <small>Duyệt: {refund.approvedByName || refund.approvedBy}</small>}
                        {refund.refundMethod && <small>{REFUND_METHOD_LABEL[refund.refundMethod] || refund.refundMethod}{refund.refundReference ? ` · ${refund.refundReference}` : ''}</small>}
                        {refund.completedAt && <small>{fmtDateTime(refund.completedAt)}</small>}
                      </td>
                      <td>{refund.status === 'REQUESTED' ? <div className="finance-refund-actions">
                        <button className="icon-inline-btn primary" title={refund.requestedBy === currentAdmin?.id ? 'Cần Admin khác duyệt' : 'Duyệt hoàn tiền'} aria-label={`Duyệt ${refund.refundNumber}`} disabled={!!busy || refund.requestedBy === currentAdmin?.id} onClick={() => openRefundDecision(refund, 'approve')}><CheckCircle2 size={15} /></button>
                        <button className="icon-inline-btn" title={refund.requestedBy === currentAdmin?.id ? 'Cần Admin khác từ chối' : 'Từ chối yêu cầu'} aria-label={`Từ chối ${refund.refundNumber}`} disabled={!!busy || refund.requestedBy === currentAdmin?.id} onClick={() => openRefundDecision(refund, 'reject')}><Ban size={15} /></button>
                        <button className="icon-inline-btn" title="Hủy yêu cầu" aria-label={`Hủy ${refund.refundNumber}`} disabled={!!busy} onClick={() => openRefundDecision(refund, 'cancel')}><Trash2 size={15} /></button>
                      </div> : <span>—</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Async>

            <div className="finance-subsection-heading"><div><strong>Nhật ký đối soát</strong><small>Mỗi phạm vi ngày, tiền và phương thức có một bản tổng hợp; chạy lại đúng phạm vi sẽ cập nhật kết quả.</small></div></div>
            <Async paginate state={reconciliationRuns} empty="Chưa có phiên đối soát" itemLabel="phiên đối soát">
              {(list) => (
                <table className="live-table finance-reconciliation-table">
                  <thead><tr><th>Ngày</th><th>Thực thu</th><th>Hoàn tiền</th><th>Thực thu ròng</th><th>Kết quả</th><th>Người chạy</th><th></th></tr></thead>
                  <tbody>{list.map((run) => (
                    <tr key={run.id}><td><strong>{fmtDate(run.fromDate || run.reconciliationDate)}{(run.toDate || run.reconciliationDate) !== (run.fromDate || run.reconciliationDate) ? ` - ${fmtDate(run.toDate)}` : ''}</strong><small>{run.method ? (PAYMENT_METHOD_LABEL[run.method] || run.method) : 'Tất cả'} · {fmtDateTime(run.runAt)} · lần {run.runCount}</small></td><td>{money(run.grossAmount)}</td><td>{money(run.refundAmount)}</td><td><strong>{money(run.netAmount)}</strong></td>
                      <td><StatusPill value={run.status} /><small>{run.discrepancyCount} sai lệch</small></td><td>{run.runByName || run.runBy}</td>
                      <td><button className="live-btn ghost compact" disabled={!!busy} onClick={() => loadReconciliation(run.id)}><Eye size={14} /> Chi tiết</button></td></tr>
                  ))}</tbody>
                </table>
              )}
            </Async>
          </Section>
        ) },
        { id: 'history', label: 'Lịch sử giao dịch', Icon: History, content: (
          <Section title="Lịch sử giao dịch" subtitle="Theo dõi thanh toán và biên nhận đã phát hành" wide
            action={<button className="live-btn ghost" onClick={() => paymentHistory.reload()}><RefreshCw size={14} /> Tải lại</button>}>
            <div className="finance-history-stats">
              <div><span>Thành công</span><strong>{historyStats.success}</strong></div>
              <div><span>Chờ xử lý</span><strong>{historyStats.pending}</strong></div>
              <div className="failed"><span>Thất bại</span><strong>{historyStats.failed}</strong></div>
              <div><span>Đã hoàn tác</span><strong>{historyStats.reversed}</strong></div>
            </div>
            <div className="finance-history-filters">
              <label><span>Trạng thái</span><select className="live-select" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="SUCCESS">Thành công</option>
                <option value="PENDING">Chờ xử lý</option>
                <option value="FAILED">Thất bại</option>
                <option value="REVERSED">Đã hoàn tác</option>
              </select></label>
              <label><span>Phương thức</span><select className="live-select" value={historyMethod} onChange={(event) => setHistoryMethod(event.target.value)}>
                <option value="">Tất cả phương thức</option>
                {Object.entries(PAYMENT_METHOD_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select></label>
              <label className="finance-history-search"><span>Tìm giao dịch</span><div><Search size={16} /><input className="live-input" value={historyQuery} onChange={(event) => setHistoryQuery(event.target.value)} placeholder="Tên, mã HS, hóa đơn, đợt thu, mã giao dịch…" /></div></label>
            </div>
            <div className="finance-filter-result">Đang hiển thị <strong>{historyRows.length}</strong> giao dịch phù hợp</div>
            <Async paginate resetKey={`${historyStatus}|${historyMethod}|${historyQuery}`} state={{ ...paymentHistory, data: paymentHistory.data ? historyRows : null }} empty="Chưa có giao dịch phù hợp" itemLabel="giao dịch">
              {(list) => (
                <table className="live-table finance-history-table">
                  <thead><tr><th>Thời gian</th><th>Học sinh</th><th>Hóa đơn</th><th>Phương thức</th><th>Số tiền</th><th>Trạng thái</th><th>Mã giao dịch</th><th>Hoàn tiền</th><th>Biên nhận</th></tr></thead>
                  <tbody>{list.map((payment) => (
                    <tr key={payment.paymentId}>
                      <td>{fmtDateTime(payment.paidAt || payment.createdAt)}</td>
                      <td><strong>{payment.studentName}</strong><small>{payment.studentCode || 'Chưa có mã HS'}</small></td>
                      <td><strong>{payment.invoiceCode}</strong><small>{payment.feePeriodCode || 'Không có mã đợt thu'}</small></td>
                      <td>{PAYMENT_METHOD_LABEL[payment.method] || payment.method}</td>
                      <td><strong>{money(payment.amount)}</strong>{(payment.refundedAmount || 0) > 0 && <small>Thực nhận: {money(payment.netAmount)}</small>}</td>
                      <td><StatusPill value={payment.status} />{payment.gatewayErrorMessage && <small className="finance-history-error">{payment.gatewayErrorMessage}</small>}</td>
                      <td><span className="finance-transaction-code">{payment.providerTransactionId || payment.txnRef || '—'}</span>{payment.callbackCount > 0 && <small>{payment.callbackCount} lần callback</small>}</td>
                      <td><div className="finance-refund-cell">
                        {(payment.refundedAmount || 0) > 0 && <small>Đã hoàn {money(payment.refundedAmount)}</small>}
                        {(payment.pendingRefundAmount || 0) > 0 && <small className="pending">Chờ duyệt {money(payment.pendingRefundAmount)}</small>}
                        {payment.status === 'SUCCESS' && availableRefundAmount(payment) > 0
                          ? <button className="live-btn ghost compact" disabled={!!busy} onClick={() => openRefundRequest(payment)}><Undo2 size={14} /> Yêu cầu hoàn</button>
                          : !(payment.refundedAmount || payment.pendingRefundAmount) && <span>—</span>}
                      </div></td>
                      <td>{!['SUCCESS', 'REVERSED'].includes(payment.status) ? <span>—</span> : payment.receiptStatus === 'ISSUED' ? (
                        <div className="finance-receipt-cell"><small>{payment.receiptNumber}</small><button className="live-btn ghost compact" disabled={!!busy} onClick={() => downloadPaymentReceipt(payment)}><Download size={14} /> Tải PDF</button></div>
                      ) : payment.status === 'SUCCESS' ? (
                        <div className="finance-receipt-cell">{payment.receiptStatus && <StatusPill value={payment.receiptStatus} />}<button className="live-btn compact" disabled={!!busy} onClick={() => issuePaymentReceipt(payment)}><FileText size={14} /> {payment.receiptStatus === 'FAILED' ? 'Tạo lại' : 'Tạo biên nhận'}</button></div>
                      ) : <span>—</span>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </Async>
          </Section>
        ) },
      ]} />
    </>
  );
}

const ANNOUNCEMENT_CATEGORIES = [
  { value: 'GENERAL', label: 'Thông báo chung', hint: 'Thông tin điều hành và nhắc nhở chung', title: 'Thông báo từ nhà trường', body: 'Kính gửi quý thầy cô, học sinh và phụ huynh,\n\nNhà trường trân trọng thông báo:' },
  { value: 'HOLIDAY', label: 'Nghỉ lễ', hint: 'Lịch nghỉ, ngày trở lại trường', title: 'Thông báo lịch nghỉ', body: 'Kính gửi quý thầy cô, học sinh và phụ huynh,\n\nNhà trường thông báo lịch nghỉ và thời gian trở lại trường như sau:' },
  { value: 'EVENT', label: 'Sự kiện', hint: 'Hoạt động, chương trình của nhà trường', title: 'Thông báo sự kiện nhà trường', body: 'Nhà trường trân trọng thông báo chương trình sắp diễn ra:' },
  { value: 'PARENT_MEETING', label: 'Họp phụ huynh', hint: 'Thời gian, địa điểm và nội dung cuộc họp', title: 'Thông báo họp phụ huynh', body: 'Kính gửi quý phụ huynh,\n\nNhà trường trân trọng thông báo lịch họp phụ huynh như sau:' },
];

const ANNOUNCEMENT_AUDIENCES = [
  { value: 'ALL', label: 'Toàn trường', hint: 'Giáo viên, học sinh và phụ huynh', Icon: School },
  { value: 'TEACHER', label: 'Giáo viên', hint: 'Toàn bộ giáo viên đang hoạt động', Icon: UsersRound },
  { value: 'STUDENT', label: 'Học sinh', hint: 'Toàn bộ học sinh đang hoạt động', Icon: GraduationCap },
  { value: 'PARENT', label: 'Phụ huynh', hint: 'Toàn bộ phụ huynh đang hoạt động', Icon: UserRound },
];

const ANNOUNCEMENT_CATEGORY_LABEL = Object.fromEntries(ANNOUNCEMENT_CATEGORIES.map((item) => [item.value, item.label]));
const ANNOUNCEMENT_AUDIENCE_LABEL = Object.fromEntries(ANNOUNCEMENT_AUDIENCES.map((item) => [item.value, item.label]));
const ANNOUNCEMENT_PRIORITY_LABEL: Record<string, string> = { NORMAL: 'Thông thường', IMPORTANT: 'Quan trọng', URGENT: 'Khẩn cấp' };

/* ============ A9 — Trung tâm thông báo ============ */
export function AdminNotificationsLive() {
  const tpls = useApi<NotificationTemplate[]>('/notification-templates');
  const announcements = useApi<Announcement[]>('/admin/announcements');
  const audienceCounts = useApi<Record<string, number>>('/admin/announcements/audience-counts');
  const operationSummary = useApi<NotificationOperationsSummary>('/admin/notification-operations/summary');
  const providerStatus = useApi<NotificationProviderStatus>('/admin/notification-providers/status');
  const failedNotifications = useApi<Notification[]>('/admin/notifications/failed');
  const deliveryLogs = useApi<NotificationDeliveryLog[]>('/admin/notification-deliveries');
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ audience: 'ALL', category: 'GENERAL', priority: 'NORMAL', title: '', body: '' });
  const selectedCategory = ANNOUNCEMENT_CATEGORIES.find((item) => item.value === form.category) || ANNOUNCEMENT_CATEGORIES[0];
  const recipientCount = audienceCounts.data?.[form.audience] ?? 0;

  const applyCategory = (category: typeof ANNOUNCEMENT_CATEGORIES[number]) => {
    setForm((current) => ({ ...current, category: category.value, title: category.title, body: category.body }));
  };

  const sendAnnouncement = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.show('err', 'Vui lòng nhập tiêu đề và nội dung thông báo');
    if (!recipientCount) return toast.show('err', 'Phạm vi đã chọn hiện không có người nhận');
    setSending(true);
    try {
      const sent = await api.post<Announcement>('/announcements', {
        audience: form.audience,
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        body: form.body.trim(),
      });
      toast.show('ok', `Đã gửi thông báo tới ${sent.recipientCount ?? recipientCount} người nhận`);
      setForm((current) => ({ ...current, title: '', body: '', priority: 'NORMAL' }));
      announcements.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSending(false);
    }
  };
  const retryNotification = async (notificationId: string) => {
    try {
      await api.post(`/admin/notifications/${encodeURIComponent(notificationId)}/retry`);
      toast.show('ok', 'Đã chạy lại kênh gửi thông báo');
      failedNotifications.reload(); operationSummary.reload(); deliveryLogs.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  return (
    <div className="admin-notification-center">
      {toast.node}
      <Section title="Trung tâm thông báo" subtitle="Soạn và gửi thông tin đúng đối tượng trong toàn trường" wide
        action={<button className="live-btn ghost" onClick={() => { announcements.reload(); audienceCounts.reload(); }}><RefreshCw size={14} /> Cập nhật dữ liệu</button>}>
        <div className="announcement-audience-summary">
          {ANNOUNCEMENT_AUDIENCES.map(({ value, label, Icon }) => (
            <article key={value} className={form.audience === value ? 'active' : ''}>
              <span><Icon size={18} /></span><div><small>{label}</small><strong>{audienceCounts.data?.[value] ?? '—'}</strong><p>người nhận</p></div>
            </article>
          ))}
        </div>

        <div className="announcement-automation-note">
          <span><CircleDollarSign size={20} /></span>
          <div><strong>Thông báo khoản thu được gửi tự động</strong><small>Khi hóa đơn được phát hành, hệ thống tự gửi số tiền, hạn thanh toán và mã hóa đơn tới toàn bộ phụ huynh liên kết với học sinh.</small></div>
          <Badge tone="green">Tự động</Badge>
        </div>

        <div className="announcement-compose-layout">
          <div className="announcement-compose-form">
            <div className="announcement-compose-heading"><span><Megaphone size={19} /></span><div><strong>Soạn thông báo mới</strong><small>Chọn mẫu tình huống hoặc tự nhập nội dung</small></div></div>

            <div className="announcement-field-group">
              <label>Loại thông báo</label>
              <div className="announcement-category-grid">
                {ANNOUNCEMENT_CATEGORIES.map((category) => (
                  <button type="button" key={category.value} className={form.category === category.value ? 'active' : ''} onClick={() => applyCategory(category)}>
                    <strong>{category.label}</strong><small>{category.hint}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="announcement-field-group">
              <label>Phạm vi nhận</label>
              <div className="announcement-audience-grid">
                {ANNOUNCEMENT_AUDIENCES.map(({ value, label, hint, Icon }) => (
                  <button type="button" key={value} className={form.audience === value ? 'active' : ''} onClick={() => setForm({ ...form, audience: value })}>
                    <span><Icon size={17} /></span><div><strong>{label}</strong><small>{hint}</small></div><b>{audienceCounts.data?.[value] ?? 0}</b>
                  </button>
                ))}
              </div>
            </div>

            <div className="announcement-form-grid">
              <label className="wide"><span>Tiêu đề</span><input maxLength={255} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Nhập tiêu đề rõ ràng, dễ hiểu" /></label>
              <label><span>Mức độ</span><select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="NORMAL">Thông thường</option><option value="IMPORTANT">Quan trọng</option><option value="URGENT">Khẩn cấp</option></select></label>
              <label className="wide"><span>Nội dung</span><textarea maxLength={4000} rows={7} value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="Nhập đầy đủ thời gian, địa điểm và hướng dẫn cần thiết…" /><small>{form.body.length}/4000 ký tự</small></label>
            </div>
          </div>

          <aside className="announcement-preview">
            <div className="announcement-preview-heading"><BellRing size={18} /><div><strong>Xem trước thông báo</strong><small>Nội dung người nhận sẽ nhìn thấy</small></div></div>
            <div className={`announcement-preview-card priority-${form.priority.toLowerCase()}`}>
              <header><Badge tone={form.priority === 'URGENT' ? 'red' : 'blue'}>{selectedCategory.label}</Badge><span>{ANNOUNCEMENT_PRIORITY_LABEL[form.priority]}</span></header>
              <strong>{form.title || 'Tiêu đề thông báo'}</strong>
              <p>{form.body || 'Nội dung thông báo sẽ hiển thị tại đây.'}</p>
              <small>Vừa xong · Từ Ban quản trị nhà trường</small>
            </div>
            <div className="announcement-send-summary"><span>Đối tượng</span><strong>{ANNOUNCEMENT_AUDIENCE_LABEL[form.audience]}</strong><span>Dự kiến nhận</span><strong>{recipientCount} người</strong></div>
            <p className="announcement-send-note">Thông báo được lưu vào hộp thư trong ứng dụng và gửi thêm qua email/push nếu người dùng đã bật kênh tương ứng.</p>
            <button type="button" className="live-btn announcement-send-button" disabled={sending || !recipientCount || !form.title.trim() || !form.body.trim()} onClick={sendAnnouncement}><Send size={16} /> {sending ? 'Đang gửi…' : `Gửi ngay tới ${recipientCount} người`}</button>
          </aside>
        </div>
      </Section>

      <Section title="Lịch sử gửi thông báo" subtitle="Theo dõi phạm vi, nội dung và số lượng người nhận" wide>
        <Async paginate state={announcements} empty="Chưa có thông báo nào được gửi" itemLabel="thông báo">
          {(items) => <div className="admin-table-scroll"><table className="live-table announcement-history-table"><thead><tr><th>Thời gian</th><th>Loại</th><th>Đối tượng</th><th>Nội dung</th><th>Mức độ</th><th>Người nhận</th><th>Trạng thái</th></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}><td>{fmtDateTime(item.createdAt)}</td><td><Badge tone="blue">{ANNOUNCEMENT_CATEGORY_LABEL[item.category || 'GENERAL'] || item.category}</Badge></td><td><strong>{ANNOUNCEMENT_AUDIENCE_LABEL[item.audience] || item.audience}</strong></td><td><strong>{item.title}</strong><small>{item.body}</small></td><td><span className={`announcement-priority priority-${(item.priority || 'NORMAL').toLowerCase()}`}>{ANNOUNCEMENT_PRIORITY_LABEL[item.priority || 'NORMAL'] || item.priority}</span></td><td><strong>{item.recipientCount ? item.recipientCount : '—'}</strong></td><td><StatusPill value={item.status === 'SENT' ? 'Đã gửi' : item.status || 'Đã gửi'} /></td></tr>)}</tbody>
          </table></div>}
        </Async>
      </Section>

      <Section title="Vận hành Email và Push" subtitle="Theo dõi SendGrid, FCM, số lần thử và gửi lại thông báo lỗi" wide
        action={<button className="live-btn ghost" onClick={() => { providerStatus.reload(); operationSummary.reload(); failedNotifications.reload(); deliveryLogs.reload(); }}><RefreshCw size={14} /> Làm mới</button>}>
        {providerStatus.data && <div className={`notification-provider-status mode-${providerStatus.data.mode.toLowerCase()}`}>
          <ShieldCheck size={20} />
          <div>
            <strong>{providerStatus.data.mode === 'REAL' ? 'Đang gửi qua nhà cung cấp thật' : 'Đang chạy chế độ mô phỏng'}</strong>
            <small>{providerStatus.data.mode === 'REAL' ? 'Email và push sẽ rời khỏi hệ thống khi kênh đã cấu hình.' : 'Delivery được ghi nhận để test nhưng không gửi email hoặc push ra ngoài.'}</small>
          </div>
          <span><Badge tone={providerStatus.data.mode === 'REAL' ? 'green' : 'orange'}>{providerStatus.data.mode}</Badge></span>
          <span><Badge tone={providerStatus.data.sendGridConfigured ? 'green' : 'red'}>SendGrid {providerStatus.data.sendGridConfigured ? 'sẵn sàng' : 'chưa cấu hình'}</Badge><small>{providerStatus.data.sendGridFromEmail || 'Chưa có email gửi'}</small></span>
          <span><Badge tone={providerStatus.data.fcmConfigured ? 'green' : 'red'}>FCM {providerStatus.data.fcmConfigured ? 'sẵn sàng' : 'chưa cấu hình'}</Badge><small>{providerStatus.data.fcmProjectId || providerStatus.data.fcmCredentialSource}</small></span>
        </div>}
        {operationSummary.data && <div className="notification-operation-summary">
          <span><small>Đã gửi</small><strong>{operationSummary.data.sent}</strong></span>
          <span><small>Đang chờ</small><strong>{operationSummary.data.queued + operationSummary.data.retrying}</strong></span>
          <span><small>Thất bại</small><strong>{operationSummary.data.failed}</strong></span>
          <span><small>Tỷ lệ lỗi</small><strong>{operationSummary.data.failureRatePercent}%</strong></span>
          <span><small>Lần gọi provider</small><strong>{operationSummary.data.deliveryAttempts}</strong></span>
        </div>}
        <FunctionTabs tabs={[
          { id: 'failed', label: `Cần gửi lại (${failedNotifications.data?.length || 0})`, Icon: AlertTriangle, content: <Async state={failedNotifications} empty="Không có thông báo gửi thất bại">{(items) => <div className="admin-table-scroll"><table className="live-table"><thead><tr><th>Kênh</th><th>Nội dung</th><th>Số lần</th><th>Lỗi cuối</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><Badge tone="blue">{item.channel || 'IN_APP'}</Badge></td><td><strong>{item.title}</strong><small>{item.body}</small></td><td>{item.attemptCount || 0}</td><td>{item.errorMessage || '—'}</td><td><button className="live-btn subtle" onClick={() => retryNotification(item.id)}><RefreshCw size={14} /> Gửi lại</button></td></tr>)}</tbody></table></div>}</Async> },
          { id: 'logs', label: 'Nhật ký gửi', Icon: History, content: <Async paginate state={deliveryLogs} empty="Chưa có lượt gửi nào" itemLabel="lượt gửi">{(items) => <div className="admin-table-scroll"><table className="live-table"><thead><tr><th>Thời gian</th><th>Kênh / provider</th><th>Lần</th><th>Trạng thái</th><th>Phản hồi</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td>{fmtDateTime(item.attemptedAt)}</td><td><strong>{item.channel}</strong><small>{item.provider}</small></td><td>{item.attemptNo}</td><td><StatusPill value={item.status} /></td><td>{item.errorMessage || item.providerResponse || '—'}</td></tr>)}</tbody></table></div>}</Async> },
        ]} />
      </Section>

      <Section title="Mẫu thông báo tự động" subtitle="Các mẫu dùng cho điểm số, chuyên cần, hóa đơn và tác vụ hệ thống" wide>
        <Async paginate state={tpls} empty="Chưa có mẫu thông báo" itemLabel="mẫu thông báo">
          {(items) => <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Kênh</th><th>Nội dung</th><th>Trạng thái</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.code}</strong></td><td>{item.name}</td><td><Badge tone="blue">{viLabel(item.channel)}</Badge></td><td><small>{item.bodyTemplate}</small></td><td>{item.active ? <Badge tone="green">Đang bật</Badge> : <Badge tone="red">Đang tắt</Badge>}</td></tr>)}</tbody></table>}
        </Async>
      </Section>
    </div>
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
      <Async paginate state={clubs} empty="Chưa có CLB" itemLabel="câu lạc bộ">
        {(l) => (
          <table className="live-table"><thead><tr><th>Tên</th><th>Lịch</th><th>Sĩ số</th><th>Học phí</th><th></th></tr></thead>
            <tbody>{l.map((c) => <tr key={c.id} style={{ background: sel === c.id ? '#f1f5fd' : undefined }}>
              <td><strong>{c.name}</strong></td><td>{c.schedule || '—'}</td><td>{c.capacity}</td><td>{money(c.fee)}</td>
              <td><button className="live-btn subtle" onClick={() => setSel(c.id)}>Đăng ký</button></td></tr>)}</tbody></table>
        )}
      </Async>
      {sel && (
        <div style={{ marginTop: 14 }}>
          <Async paginate state={regs} empty="Chưa có đăng ký" itemLabel="đăng ký">
            {(l) => (<table className="live-table"><thead><tr><th>Học sinh</th><th>Trạng thái</th></tr></thead>
              <tbody>{l.map((r) => <tr key={r.id}><td>{r.studentName}</td><td><StatusPill value={r.status} /></td></tr>)}</tbody></table>)}
          </Async>
        </div>
      )}
    </Section>
  );
}

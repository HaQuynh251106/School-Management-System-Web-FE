import { useEffect, useMemo, useState } from 'react';
import { Lock, Unlock, Plus, RefreshCw, FileText, Send, CheckCircle2, Pencil, Save, UserRound, IdCard, MapPin, UsersRound, Upload, KeyRound, Link2, Unlink, GraduationCap, Download, Megaphone, BellRing, WalletCards, TrendingUp, AlertTriangle, Clock3, Search, Eye, Trash2, ReceiptText, CircleGauge, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, AcademicYear, Semester, SchoolClass, Subject, Room,
  ExamCategory, FeePeriod, FeePeriodItem, Invoice, FinanceOverview, FinanceClassSummary, HomeroomDebtReminderResult,
  ImportPreview, ImportResult, LoginHistory, PageResponse, StudentYearlySummary, YearRolloverPreview, YearRolloverResult, Announcement, NotificationDeliveryLog,
} from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge, viLabel } from '../../components/ui';
import { Async, EmptyState, PaginatedData, ServerPagination, useToast, money, fmtDateTime, fmtDate } from './common';
import { Modal, Field } from './Modal';
import { School, CalendarDays, DoorOpen, BookOpen, CircleDollarSign } from 'lucide-react';
import { useHashNumber, useHashString } from '../../api/urlState';

/* ============ A1 — Người dùng (phân trang + modal tạo) ============ */
const BLANK_USER = {
  username: '', fullName: '', role: 'STUDENT', password: 'Sse@123456',
  email: '', phone: '', avatarUrl: '', teacherCode: '', mainSubject: '',
  studentCode: '', classId: '', dateOfBirth: '', gender: '', placeOfBirth: '',
  ethnicity: 'Kinh', nationality: 'Việt Nam', address: '', enrollmentDate: '',
  guardianName: '', guardianPhone: '',
};

type ManagedUserRole = 'STUDENT' | 'TEACHER' | 'PARENT';

const USER_ROLE_CONFIG: Record<ManagedUserRole, { title: string; subtitle: string; createLabel: string; itemLabel: string; empty: string }> = {
  STUDENT: {
    title: 'Quản lý học sinh',
    subtitle: 'Hồ sơ, tài khoản, lớp học và trạng thái của học sinh',
    createLabel: 'Thêm học sinh',
    itemLabel: 'học sinh',
    empty: 'Chưa có học sinh',
  },
  TEACHER: {
    title: 'Quản lý giáo viên',
    subtitle: 'Hồ sơ, chuyên môn và trạng thái tài khoản giáo viên',
    createLabel: 'Thêm giáo viên',
    itemLabel: 'giáo viên',
    empty: 'Chưa có giáo viên',
  },
  PARENT: {
    title: 'Quản lý phụ huynh',
    subtitle: 'Tài khoản phụ huynh và liên kết với học sinh',
    createLabel: 'Thêm phụ huynh',
    itemLabel: 'phụ huynh',
    empty: 'Chưa có phụ huynh',
  },
};

export function AdminUsersLive({ fixedRole }: { fixedRole?: ManagedUserRole }) {
  const [role, setRole] = useHashString('role', '');
  const [q, setQ] = useHashString('q', '');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [gradeLevel, setGradeLevel] = useHashString('grade', 'ALL');
  const [classId, setClassId] = useHashString('class', 'ALL');
  const [status, setStatus] = useHashString('status', 'ALL');
  const [pageNumber, setPageNumber] = useHashNumber('page', 1);
  const [pageSize, setPageSize] = useHashNumber('size', 10);
  const page = pageNumber - 1;
  const selectedRole = fixedRole || role;
  const supportsClassScope = fixedRole === 'STUDENT' || fixedRole === 'PARENT';
  const params = [
    selectedRole && `role=${selectedRole}`,
    debouncedQ && `q=${encodeURIComponent(debouncedQ)}`,
    supportsClassScope && classId !== 'ALL' && `classId=${encodeURIComponent(classId)}`,
    supportsClassScope && classId === 'ALL' && gradeLevel !== 'ALL' && `gradeLevel=${encodeURIComponent(gradeLevel)}`,
    status !== 'ALL' && `status=${status}`,
    `page=${page}`,
    `size=${pageSize}`,
    'sort=fullName',
  ].filter(Boolean).join('&');
  const users = useApi<PageResponse<ApiUser>>(`/users/page?${params}`);
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
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importStrategy, setImportStrategy] = useState<'ALL_OR_NOTHING' | 'SKIP_ERRORS'>('ALL_OR_NOTHING');
  const history = useApi<LoginHistory[]>(editingUser ? `/users/${editingUser.id}/login-history` : null);
  const roleConfig = fixedRole ? USER_ROLE_CONFIG[fixedRole] : null;
  const availableGrades = useMemo(() => [...new Set((classes.data || [])
    .map((schoolClass) => schoolClass.gradeLevel).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, 'vi')), [classes.data]);
  const availableClasses = useMemo(() => (classes.data || [])
    .filter((schoolClass) => gradeLevel === 'ALL' || schoolClass.gradeLevel === gradeLevel)
    .sort((a, b) => a.code.localeCompare(b.code, 'vi')), [classes.data, gradeLevel]);
  const selectedClass = (classes.data || []).find((schoolClass) => schoolClass.id === classId);
  const scopeFiltered = classId !== 'ALL' || gradeLevel !== 'ALL';
  const userStats = {
    total: users.data?.summary.total ?? users.data?.totalElements ?? 0,
    active: users.data?.summary.active ?? 0,
    locked: users.data?.summary.locked ?? 0,
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    setPageNumber(1);
  }, [selectedRole, debouncedQ, gradeLevel, classId, status, setPageNumber]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const changeGrade = (value: string) => {
    setGradeLevel(value);
    if (classId !== 'ALL' && !(classes.data || []).some((schoolClass) => schoolClass.id === classId
      && (value === 'ALL' || schoolClass.gradeLevel === value))) setClassId('ALL');
  };
  const linkedStudentsInScope = (parent: ApiUser) => (students.data || []).filter((student) =>
    (parent.childrenIds || []).includes(student.id)
    && (classId !== 'ALL' ? student.classId === classId : gradeLevel === 'ALL'
      || classes.data?.some((schoolClass) => schoolClass.id === student.classId && schoolClass.gradeLevel === gradeLevel)));

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
    setForm({ ...BLANK_USER, role: fixedRole || BLANK_USER.role });
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

  const previewExcel = async (file?: File) => {
    if (!file) return;
    setImporting(true);
    try {
      const preview = await api.upload<ImportPreview>('/users/import/preview', file);
      setImportFile(file);
      setImportPreview(preview);
      setImportStrategy(preview.invalidRows ? 'ALL_OR_NOTHING' : 'SKIP_ERRORS');
    } catch (e: any) { toast.show('err', e.message); }
    finally { setImporting(false); }
  };

  const commitImport = async () => {
    if (!importFile || !importPreview) return;
    if (importStrategy === 'ALL_OR_NOTHING' && importPreview.invalidRows > 0) {
      return toast.show('err', 'Hãy sửa các dòng lỗi hoặc chọn bỏ qua dòng lỗi trước khi xác nhận');
    }
    setImporting(true);
    try {
      const result = await api.uploadForm<ImportResult>('/users/import/commit', importFile, {
        token: importPreview.token,
        strategy: importStrategy,
      });
      setImportResult(result);
      setImportPreview(null);
      setImportFile(null);
      toast.show('ok', `Đã nhập an toàn ${result.importedRows}/${result.totalRows} tài khoản`);
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
    setForm({ ...BLANK_USER, role: fixedRole || BLANK_USER.role });
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
    <Section title={roleConfig?.title || 'Người dùng & phân quyền'} subtitle={roleConfig?.subtitle || 'Quản lý tài khoản và quyền truy cập'} wide
      action={<button className="live-btn" onClick={openCreate}><Plus size={15} /> {roleConfig?.createLabel || 'Tạo người dùng'}</button>}>
      {toast.node}
      {roleConfig && <div className="admin-user-summary" aria-label={`Thống kê ${roleConfig.itemLabel}`}>
        <article><span><UsersRound size={18} /></span><div><small>{scopeFiltered ? 'Đang hiển thị' : 'Tổng số'}</small><strong>{userStats.total}</strong></div></article>
        <article><span><CheckCircle2 size={18} /></span><div><small>Đang hoạt động</small><strong>{userStats.active}</strong></div></article>
        <article><span><Lock size={18} /></span><div><small>Đã khóa</small><strong>{userStats.locked}</strong></div></article>
      </div>}
      {supportsClassScope && <div className="admin-account-scope-filter">
        <div className="admin-account-scope-heading"><span><School size={19} /></span><div><strong>Xem tài khoản theo lớp học</strong><small>{fixedRole === 'PARENT' ? 'Phụ huynh được xác định theo lớp của học sinh đã liên kết' : 'Thu hẹp danh sách học sinh theo khối và lớp cụ thể'}</small></div></div>
        <label><span>Khối</span><select className="live-select" value={gradeLevel} onChange={(event) => changeGrade(event.target.value)}><option value="ALL">Tất cả khối</option>{availableGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}</select></label>
        <label><span>Lớp</span><select className="live-select" value={classId} onChange={(event) => setClassId(event.target.value)}><option value="ALL">Tất cả lớp</option>{availableClasses.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.code} · {schoolClass.name}</option>)}</select></label>
        <div className={`admin-account-scope-result ${scopeFiltered ? 'active' : ''}`}><GraduationCap size={17} /><span>{selectedClass ? <>Đang xem <strong>lớp {selectedClass.code}</strong> · {selectedClass.gradeLevel}</> : gradeLevel !== 'ALL' ? <>Đang xem <strong>toàn bộ khối {gradeLevel}</strong></> : <>Đang xem <strong>toàn bộ trường</strong></>}</span></div>
      </div>}
      <div className="live-toolbar">
        {!fixedRole && <select className="live-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Quản trị viên</option><option value="TEACHER">Giáo viên</option>
          <option value="STUDENT">Học sinh</option><option value="PARENT">Phụ huynh</option>
        </select>}
        <input className="live-input grow" placeholder="Tìm tên / username / mã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="live-select" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Lọc trạng thái tài khoản">
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="LOCKED">Đã khóa</option>
        </select>
        <label className={`live-btn ghost ${importing ? 'is-disabled' : ''}`}>
          <Upload size={15} /> {importing ? 'Đang kiểm tra…' : 'Nhập Excel an toàn'}
          <input hidden type="file" accept=".xlsx,.xls" disabled={importing} onChange={(e) => { previewExcel(e.target.files?.[0]); e.currentTarget.value = ''; }} />
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

      <Async state={users}>
        {(pageData) => pageData.items.length === 0
          ? <EmptyState label={scopeFiltered ? `Không có ${roleConfig?.itemLabel || 'người dùng'} trong phạm vi đã chọn` : roleConfig?.empty || 'Không có người dùng'} />
          : <>
            <table className="live-table">
              <thead><tr><th>Họ tên</th><th>Tên đăng nhập</th><th>{fixedRole === 'STUDENT' ? 'Lớp học' : fixedRole === 'TEACHER' ? 'Chuyên môn' : fixedRole === 'PARENT' ? 'Liên kết học sinh' : 'Vai trò'}</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {pageData.items.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong>{!fixedRole && u.studentCode && <small style={{ color: 'var(--muted)' }}> · {u.studentCode}</small>}{!fixedRole && u.teacherCode && <small style={{ color: 'var(--muted)' }}> · {u.teacherCode}</small>}</td>
                    <td>@{u.username}</td>
                    <td>{fixedRole === 'STUDENT'
                      ? <><strong>{u.className || 'Chưa xếp lớp'}</strong>{u.studentCode && <small style={{ color: 'var(--muted)' }}> · {u.studentCode}</small>}</>
                      : fixedRole === 'TEACHER'
                        ? <><strong>{u.mainSubject || 'Chưa cập nhật môn'}</strong>{u.teacherCode && <small style={{ color: 'var(--muted)' }}> · {u.teacherCode}</small>}</>
                        : fixedRole === 'PARENT'
                          ? <div className="parent-account-class-links">{linkedStudentsInScope(u).length
                            ? linkedStudentsInScope(u).map((student) => <span key={student.id}><strong>{student.fullName}</strong><small>{student.className || 'Chưa xếp lớp'}</small></span>)
                            : <Badge tone="blue">{u.childrenIds?.length || 0} học sinh</Badge>}</div>
                          : <Badge tone="blue">{viLabel(u.role)}</Badge>}</td>
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
            <ServerPagination data={pageData} itemLabel={roleConfig?.itemLabel || 'người dùng'}
              onPageChange={(nextPage) => setPageNumber(nextPage + 1, 'push')}
              onPageSizeChange={(size) => { setPageSize(size); setPageNumber(1); }} />
          </>}
      </Async>

      {importPreview && (
        <Modal title="Kiểm tra dữ liệu trước khi nhập" onClose={() => { if (!importing) { setImportPreview(null); setImportFile(null); } }}
          footer={<>
            <button className="live-btn ghost" disabled={importing} onClick={() => { setImportPreview(null); setImportFile(null); }}>Hủy</button>
            <button className="live-btn" disabled={importing || (importStrategy === 'ALL_OR_NOTHING' && importPreview.invalidRows > 0)} onClick={commitImport}>
              <ShieldCheck size={15} /> {importing ? 'Đang ghi dữ liệu…' : `Xác nhận nhập ${importStrategy === 'SKIP_ERRORS' ? importPreview.validRows : importPreview.totalRows} dòng`}
            </button>
          </>}>
          <div className="safe-import">
            <div className="safe-import-summary">
              <article><small>Tổng số dòng</small><strong>{importPreview.totalRows}</strong></article>
              <article className="success"><small>Hợp lệ</small><strong>{importPreview.validRows}</strong></article>
              <article className={importPreview.invalidRows ? 'danger' : ''}><small>Có lỗi</small><strong>{importPreview.invalidRows}</strong></article>
            </div>
            <div className="safe-import-policy">
              <label className={importStrategy === 'ALL_OR_NOTHING' ? 'selected' : ''}>
                <input type="radio" name="import-strategy" value="ALL_OR_NOTHING" checked={importStrategy === 'ALL_OR_NOTHING'}
                  onChange={() => setImportStrategy('ALL_OR_NOTHING')} />
                <span><strong>Toàn vẹn dữ liệu</strong><small>Chỉ nhập khi tất cả các dòng đều hợp lệ</small></span>
              </label>
              <label className={importStrategy === 'SKIP_ERRORS' ? 'selected' : ''}>
                <input type="radio" name="import-strategy" value="SKIP_ERRORS" checked={importStrategy === 'SKIP_ERRORS'}
                  onChange={() => setImportStrategy('SKIP_ERRORS')} />
                <span><strong>Bỏ qua dòng lỗi</strong><small>Chỉ nhập {importPreview.validRows} dòng đã vượt qua kiểm tra</small></span>
              </label>
            </div>
            <div className="safe-import-table">
              <table className="live-table">
                <thead><tr><th>Dòng</th><th>Tài khoản</th><th>Vai trò</th><th>Lớp</th><th>Kết quả kiểm tra</th></tr></thead>
                <tbody>{importPreview.rows.map((row) => (
                  <tr key={row.row} className={row.valid ? '' : 'has-error'}>
                    <td>{row.row}</td>
                    <td><strong>{row.fullName || '—'}</strong><small>@{row.username || 'chưa có'}</small></td>
                    <td>{viLabel(row.role || '')}</td>
                    <td>{row.classCode || '—'}</td>
                    <td>{row.valid
                      ? <span className="safe-import-valid"><CheckCircle2 size={14} /> Hợp lệ</span>
                      : <span className="safe-import-error"><AlertTriangle size={14} /> {row.error}</span>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <p className="safe-import-expiry">Phiên kiểm tra có hiệu lực đến {new Date(importPreview.expiresAt).toLocaleTimeString('vi-VN')}. Tệp sẽ được kiểm tra lại trước khi ghi.</p>
          </div>
        </Modal>
      )}

      {showEditor && (
        <Modal title={editingUser ? `Chỉnh sửa hồ sơ · ${editingUser.fullName}` : roleConfig?.createLabel || 'Tạo người dùng mới'} onClose={closeEditor}
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
                  <select value={form.role} disabled={Boolean(editingUser || fixedRole)} onChange={(e) => set('role', e.target.value)}>
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
          </div>
        </Modal>
      )}
    </Section>
  );
}

/* ============ A2 — Cơ cấu đào tạo (thêm tạo phòng học) ============ */
export function AdminAcademicLegacyLive() {
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
                <select className="live-select" value={cf.gradeLevel} onChange={(e) => setCf({ ...cf, gradeLevel: e.target.value })}>{[6,7,8,9,10,11,12].map((g) => <option key={g} value={`K${g}`}>Khối {g}</option>)}</select>
                <select className="live-select" value={cf.academicYearId} onChange={(e) => setCf({ ...cf, academicYearId: e.target.value })}><option value="">— Năm học —</option>{(years.data ?? []).map((y) => <option key={y.id} value={y.id}>{y.code}</option>)}</select>
                <input className="live-input" type="number" min="1" max="100" style={{ width: 105 }} title="Sĩ số tối đa" value={cf.capacity} onChange={(e) => setCf({ ...cf, capacity: Number(e.target.value) })} />
                <select className="live-select" value={cf.homeroomTeacherId} onChange={(e) => setCf({ ...cf, homeroomTeacherId: e.target.value })}><option value="">— GVCN (tùy chọn) —</option>{(teachers.data ?? []).map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select>
                <button className="live-btn" onClick={addClass}><Plus size={15} /> Tạo lớp</button>
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
          { id: 'year-end', label: 'Tổng kết năm', Icon: GraduationCap, content: <YearEndManager years={years.data ?? []} /> },
        ]}
      />
    </>
  );
}
export function YearEndManager({ years, onChanged }: { years: AcademicYear[]; onChanged?: () => void }) {
  const [yearId, setYearId] = useState('');
  const preview = useApi<StudentYearlySummary[]>(yearId ? `/academic-years/${yearId}/promotion-preview` : null);
  const rolloverPreview = useApi<YearRolloverPreview>(yearId ? `/academic-years/${yearId}/rollover-preview` : null);
  const toast = useToast();
  const [finalizing, setFinalizing] = useState(false);
  const [rolloverResult, setRolloverResult] = useState<YearRolloverResult | null>(null);
  const selectedYear = useMemo(() => years.find((year) => year.id === yearId), [years, yearId]);
  const [rolloverForm, setRolloverForm] = useState({ nextYearCode: '', nextYearName: '', startDate: '', endDate: '', createIntakeClasses: true, activateNextYear: true });

  useEffect(() => {
    if (!selectedYear) return;
    const nextCode = suggestNextAcademicYearCode(selectedYear.code);
    setRolloverForm({ nextYearCode: nextCode, nextYearName: `Năm học ${nextCode}`,
      startDate: shiftIsoYear(selectedYear.startDate), endDate: shiftIsoYear(selectedYear.endDate),
      createIntakeClasses: true, activateNextYear: true });
    setRolloverResult(null);
  }, [selectedYear]);

  const rolloverYear = async () => {
    if (!yearId || !selectedYear || !rolloverPreview.data) return;
    if (rolloverPreview.data.blockers.length) return toast.show('err', rolloverPreview.data.blockers[0]);
    if (!rolloverForm.nextYearCode || !rolloverForm.startDate || !rolloverForm.endDate) return toast.show('err', 'Nhập đầy đủ thông tin năm học mới');
    if (!window.confirm(`Hệ thống sẽ tổng kết ${selectedYear.code}, tạo cơ cấu ${rolloverForm.nextYearCode}, xếp lớp và khóa dữ liệu cũ. Bạn muốn tiếp tục?`)) return;
    setFinalizing(true);
    try {
      const result = await api.post<YearRolloverResult>(`/academic-years/${yearId}/rollover`, rolloverForm);
      setRolloverResult(result);
      toast.show('ok', `Đã chuyển sang năm học ${result.nextYearCode}`);
      onChanged?.(); preview.reload(); rolloverPreview.reload();
    } catch (e: any) { toast.show('err', e.message); }
    finally { setFinalizing(false); }
  };

  return (
    <Section title="Tổng kết và chuyển năm học" subtitle="Một quy trình an toàn để tổng kết, xếp lớp, khóa dữ liệu cũ và kích hoạt năm mới" wide
      action={yearId ? <button className="live-btn ghost" onClick={() => { preview.reload(); rolloverPreview.reload(); }}><RefreshCw size={14} /> Kiểm tra lại</button> : undefined}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select grow" value={yearId} onChange={(e) => setYearId(e.target.value)}>
          <option value="">— Chọn năm học cần tổng kết —</option>
          {years.map((year) => <option key={year.id} value={year.id}>{year.code} · {viLabel(year.status)}</option>)}
        </select>
      </div>
      {!yearId ? <div className="live-loading">Chọn năm học để kiểm tra điều kiện tổng kết.</div> : (
        <>
        <Async state={rolloverPreview}>{(readiness) => <div className="rollover-workflow">
          <div className="rollover-readiness-grid">
            <article><span>Học sinh</span><strong>{readiness.studentCount}</strong><small>{readiness.classCount} lớp trong năm học</small></article>
            <article className={readiness.semesterCount < 2 ? 'warning' : 'success'}><span>Học kỳ bắt buộc</span><strong>{Math.min(readiness.semesterCount, 2)}/2</strong><small>Phải có đủ học kỳ I và II</small></article>
            <article className={readiness.incompleteCount ? 'warning' : 'success'}><span>Sẵn sàng</span><strong>{readiness.readyCount}/{readiness.studentCount}</strong><small>{readiness.incompleteCount ? `${readiness.incompleteCount} hồ sơ cần hoàn thiện` : 'Đã đủ điểm hai kỳ và hạnh kiểm'}</small></article>
            <article><span>Dự kiến lên lớp</span><strong>{readiness.expectedPromoted}</strong><small>Được tự động xếp lớp mới</small></article>
            <article><span>Lưu ban / Tốt nghiệp</span><strong>{readiness.expectedRetained} / {readiness.expectedGraduated}</strong><small>Được xử lý riêng theo kết quả</small></article>
          </div>
          {readiness.blockers.length ? <div className="rollover-blockers"><AlertTriangle size={19} /><div><strong>Chưa thể chuyển năm học</strong>{readiness.blockers.map((item) => <span key={item}>{item}</span>)}</div></div>
            : <div className="rollover-ready"><ShieldCheck size={19} /><div><strong>Dữ liệu đã sẵn sàng</strong><span>Thao tác được thực hiện trong một giao dịch; có lỗi sẽ không thay đổi dữ liệu.</span></div></div>}

          {selectedYear?.status === 'ACTIVE' && <div className="rollover-builder">
            <header><div><Sparkles size={19} /><span><strong>Tạo năm học mới tự động</strong><small>Sao chép mốc học kỳ, tạo lớp lên khối và lớp tuyển sinh đầu cấp</small></span></div><Badge tone="blue">5 bước trong 1</Badge></header>
            <div className="rollover-form-grid">
              <label><span>Mã năm học mới</span><input className="live-input" value={rolloverForm.nextYearCode} onChange={(event) => setRolloverForm({ ...rolloverForm, nextYearCode: event.target.value })} /></label>
              <label><span>Tên năm học</span><input className="live-input" value={rolloverForm.nextYearName} onChange={(event) => setRolloverForm({ ...rolloverForm, nextYearName: event.target.value })} /></label>
              <label><span>Ngày bắt đầu</span><input className="live-input" type="date" value={rolloverForm.startDate} onChange={(event) => setRolloverForm({ ...rolloverForm, startDate: event.target.value })} /></label>
              <label><span>Ngày kết thúc</span><input className="live-input" type="date" value={rolloverForm.endDate} onChange={(event) => setRolloverForm({ ...rolloverForm, endDate: event.target.value })} /></label>
            </div>
            <div className="rollover-options">
              <label><input type="checkbox" checked={rolloverForm.createIntakeClasses} disabled={readiness.expectedRetained > 0} onChange={(event) => setRolloverForm({ ...rolloverForm, createIntakeClasses: event.target.checked })} /><span><strong>Tạo lớp tuyển sinh đầu cấp</strong><small>{readiness.expectedRetained > 0 ? 'Bắt buộc vì có học sinh dự kiến lưu ban' : 'Giữ lại các mã lớp đầu khối cho học sinh mới'}</small></span></label>
              <label><input type="checkbox" checked={rolloverForm.activateNextYear} onChange={(event) => setRolloverForm({ ...rolloverForm, activateNextYear: event.target.checked })} /><span><strong>Kích hoạt ngay năm học mới</strong><small>Đồng thời kích hoạt học kỳ đầu tiên</small></span></label>
            </div>
            <div className="rollover-class-plan"><span>Lớp sẽ tạo</span><div>{readiness.classPlan.filter((item) => rolloverForm.createIntakeClasses || item.type !== 'NEW_INTAKE').map((item) => <i key={`${item.type}-${item.targetClassCode}`}><b>{item.targetClassCode}</b><small>{item.type === 'NEW_INTAKE' ? 'Tuyển sinh mới' : `${item.sourceClassCode} → ${item.targetClassCode}`}</small></i>)}</div></div>
            <button className="live-btn rollover-submit" disabled={finalizing || readiness.blockers.length > 0} onClick={rolloverYear}><GraduationCap size={17} /> {finalizing ? 'Đang chuyển năm học…' : <>Chuyển sang {rolloverForm.nextYearCode || 'năm học mới'} <ArrowRight size={16} /></>}</button>
          </div>}
          {rolloverResult && <div className="rollover-result"><CheckCircle2 size={20} /><div><strong>Đã chuyển sang {rolloverResult.nextYearCode}</strong><span>{rolloverResult.createdClassCount} lớp · {rolloverResult.createdSemesterCount} học kỳ · {rolloverResult.promotedCount} lên lớp · {rolloverResult.retainedCount} lưu ban · {rolloverResult.graduatedCount} tốt nghiệp</span></div></div>}
        </div>}</Async>
        <div className="rollover-formula-note"><strong>Quy tắc xét lên lớp</strong><span>Điểm cả năm = (Điểm HKI + Điểm HKII × 2) ÷ 3. Chỉ xét khi cả hai học kỳ đủ toàn bộ đầu điểm và đã có hạnh kiểm.</span></div>
        <Async paginate state={preview} empty="Năm học chưa có học sinh" itemLabel="học sinh">
          {(rows) => <div className="admin-table-scroll rollover-student-table"><table className="live-table year-end-table">
            <thead><tr><th>Học sinh</th><th>TB HKI</th><th>TB HKII</th><th>TB cả năm</th><th>Hạnh kiểm</th><th>Điều kiện</th><th>Kết quả</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.id}>
              <td><strong>{row.studentName}</strong></td>
              <td className="year-end-score">{formatYearAverage(row.semesterOneAverage)}</td>
              <td className="year-end-score">{formatYearAverage(row.semesterTwoAverage)}</td>
              <td className="year-end-score annual">{formatYearAverage(row.averageScore)}</td>
              <td>{row.conductGrade ? <Badge tone="blue">{({ GOOD: 'Tốt', FAIR: 'Khá', AVERAGE: 'Trung bình', WEAK: 'Yếu' } as Record<string, string>)[row.conductGrade] || row.conductGrade}</Badge> : <Badge tone="orange">Chờ GVCN</Badge>}</td>
              <td>{row.missingRequirements ? <span className="year-end-missing" title={row.missingRequirements}>{row.missingRequirements}</span>
                : !row.conductGrade ? <Badge tone="orange">Thiếu hạnh kiểm</Badge> : <Badge tone="green">Đủ dữ liệu</Badge>}</td>
              <td><StatusPill value={yearEndLabel(row.promotionStatus)} /></td>
            </tr>)}</tbody>
          </table></div>}
        </Async>
        </>)}
    </Section>
  );
}

function yearEndLabel(status: string) {
  return ({ READY: 'Sẵn sàng', INCOMPLETE: 'Thiếu dữ liệu', PROMOTED: 'Lên lớp',
    PROMOTED_PENDING_CLASS: 'Chờ xếp lớp', RETAINED_PENDING_CLASS: 'Lưu ban, chờ lớp', GRADUATED: 'Tốt nghiệp', RETAINED: 'Lưu ban' } as Record<string, string>)[status] || status;
}

function formatYearAverage(value?: number | null) {
  return value == null ? '—' : value.toFixed(2);
}

function suggestNextAcademicYearCode(code: string) {
  const match = code.match(/(\d{4})\D+(\d{4})/);
  return match ? `${Number(match[1]) + 1}-${Number(match[2]) + 1}` : `${code}-MỚI`;
}

function shiftIsoYear(value?: string) {
  if (!value) return '';
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '';
  const date = new Date(Date.UTC(parts[0] + 1, parts[1] - 1, parts[2]));
  return date.toISOString().slice(0, 10);
}

/* ============ A4 — Loại điểm ============ */
export function AdminExamCategoriesLive() {
  const cats = useApi<ExamCategory[]>('/exam-categories');
  const toast = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [f, setF] = useState({ code: '', name: '', weight: 1, requiredCount: 1 });
  const reset = () => { setEditingId(null); setF({ code: '', name: '', weight: 1, requiredCount: 1 }); };
  const save = async () => {
    if (!f.code || !f.name) return toast.show('err', 'Nhập mã + tên');
    try {
      if (editingId) await api.put(`/exam-categories/${editingId}`, f);
      else await api.post('/exam-categories', f);
      toast.show('ok', editingId ? 'Đã cập nhật đầu điểm' : 'Đã thêm đầu điểm');
      reset(); cats.reload();
    }
    catch (e: any) { toast.show('err', e.message); }
  };
  const edit = (category: ExamCategory) => {
    setEditingId(category.id);
    setF({ code: category.code, name: category.name, weight: category.weight, requiredCount: category.requiredCount || 1 });
  };
  const remove = async (category: ExamCategory) => {
    if (!window.confirm(`Xóa đầu điểm “${category.name}”?`)) return;
    try { await api.del(`/exam-categories/${category.id}`); toast.show('ok', 'Đã xóa đầu điểm'); if (editingId === category.id) reset(); cats.reload(); }
    catch (error: any) { toast.show('err', error.message); }
  };
  return (
    <Section title="Cấu hình đầu điểm" subtitle="Quản lý tên, hệ số và số đầu điểm bắt buộc để tính tổng kết" wide>
      {toast.node}
      <div className="live-toolbar">
        <input className="live-input" placeholder="Mã (ORAL…)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
        <input className="live-input grow" placeholder="Tên" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <label><small>Hệ số</small><input className="live-input" aria-label="Hệ số" type="number" min="0.5" max="10" step="0.5" style={{ width: 90 }} value={f.weight} onChange={(e) => setF({ ...f, weight: Number(e.target.value) })} /></label>
        <label><small>Số đầu điểm</small><input className="live-input" aria-label="Số đầu điểm bắt buộc" type="number" min="1" max="10" style={{ width: 110 }} value={f.requiredCount} onChange={(e) => setF({ ...f, requiredCount: Number(e.target.value) })} /></label>
        {editingId && <button className="live-btn subtle" onClick={reset}>Hủy sửa</button>}
        <button className="live-btn" onClick={save}>{editingId ? <Save size={15} /> : <Plus size={15} />} {editingId ? 'Lưu' : 'Thêm'}</button>
      </div>
      <Async paginate state={cats} itemLabel="đầu điểm">{(l) => (
        <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Hệ số</th><th>Số đầu điểm bắt buộc</th><th>Thao tác</th></tr></thead>
          <tbody>{l.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td><td>×{c.weight}</td><td>{c.requiredCount || 1}</td><td><div className="row-actions"><button className="icon-action" title="Sửa đầu điểm" onClick={() => edit(c)}><Pencil size={15} /></button><button className="icon-action danger" title="Xóa đầu điểm" onClick={() => remove(c)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table>
      )}</Async>
    </Section>
  );
}

/* ============ A7 — Tài chính nội bộ ============ */
const EMPTY_PERIOD_FORM = { code: '', name: '', applyToGrades: '', dueDate: '' };

function downloadClassFinanceCsv(rows: FinanceClassSummary[]) {
  const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const data = [
    ['Khối', 'Lớp', 'Giáo viên chủ nhiệm', 'Số hóa đơn', 'Đã hoàn thành', 'Tổng phải thu', 'Đã thu', 'Công nợ', 'Tỷ lệ thu', 'Quá hạn', 'Trạng thái'],
    ...rows.map((summary) => [summary.gradeLevel || '', summary.classCode, summary.homeroomTeacherName || 'Chưa phân công',
      summary.invoiceCount, summary.paidCount, summary.totalAmount, summary.paidAmount, summary.outstanding,
      `${summary.collectionRate.toFixed(1)}%`, summary.overdueCount,
      summary.completed ? 'Đã hoàn thành' : summary.overdueCount ? 'Có quá hạn' : 'Đang thu']),
  ];
  const blob = new Blob([`\uFEFF${data.map((row) => row.map(quote).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cong-no-theo-lop-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function AdminFinanceLive() {
  const periods = useApi<FeePeriod[]>('/fee-periods');
  const overview = useApi<FinanceOverview>('/finance/overview');
  const toast = useToast();
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const selectedPeriod = periods.data?.find((period) => period.id === selectedPeriodId) || null;
  const items = useApi<FeePeriodItem[]>(selectedPeriodId ? `/fee-periods/${selectedPeriodId}/items` : null);
  const [periodQuery, setPeriodQuery] = useState('');
  const [classQuery, setClassQuery] = useState('');
  const [classStatus, setClassStatus] = useState('ALL');
  const [invoicePeriod, setInvoicePeriod] = useState('ALL');
  const [invoiceGrade, setInvoiceGrade] = useState('ALL');
  const [invoiceClass, setInvoiceClass] = useState('ALL');
  const classSummaries = useApi<FinanceClassSummary[]>(invoicePeriod === 'ALL'
    ? '/finance/classes'
    : `/finance/classes?periodId=${encodeURIComponent(invoicePeriod)}`);
  const [showPeriodEditor, setShowPeriodEditor] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState<FeePeriod | null>(null);
  const [periodForm, setPeriodForm] = useState(EMPTY_PERIOD_FORM);
  const [itemForm, setItemForm] = useState({ name: '', amount: 1000000, gradeLevel: '' });
  const [busy, setBusy] = useState(false);
  const [sendingClassId, setSendingClassId] = useState<string | null>(null);
  const [sendingVisible, setSendingVisible] = useState(false);

  const refreshFinance = () => {
    periods.reload();
    overview.reload();
    classSummaries.reload();
    if (selectedPeriodId) items.reload();
  };

  const filteredPeriods = useMemo(() => {
    const query = periodQuery.trim().toLocaleLowerCase('vi');
    return (periods.data || []).filter((period) => !query
      || period.code.toLocaleLowerCase('vi').includes(query)
      || (period.name || '').toLocaleLowerCase('vi').includes(query));
  }, [periodQuery, periods.data]);

  const filteredClassSummaries = useMemo(() => {
    const query = classQuery.trim().toLocaleLowerCase('vi');
    return (classSummaries.data || []).filter((summary) => {
      const matchesQuery = !query || summary.classCode.toLocaleLowerCase('vi').includes(query)
        || (summary.homeroomTeacherName || '').toLocaleLowerCase('vi').includes(query);
      const matchesGrade = invoiceGrade === 'ALL' || summary.gradeLevel === invoiceGrade;
      const matchesClass = invoiceClass === 'ALL' || summary.classId === invoiceClass;
      const matchesStatus = classStatus === 'ALL'
        || (classStatus === 'COMPLETED' && summary.completed)
        || (classStatus === 'INCOMPLETE' && !summary.completed)
        || (classStatus === 'OVERDUE' && !summary.completed && summary.overdueCount > 0)
        || (classStatus === 'IN_PROGRESS' && !summary.completed && summary.overdueCount === 0)
        || (classStatus === 'NO_HOMEROOM' && !summary.homeroomTeacherId);
      return matchesQuery && matchesGrade && matchesClass && matchesStatus;
    });
  }, [classQuery, classStatus, classSummaries.data, invoiceClass, invoiceGrade]);

  const availableGrades = useMemo(() => [...new Set((classSummaries.data || [])
    .map((item) => item.gradeLevel).filter(Boolean) as string[])].sort(), [classSummaries.data]);
  const availableClasses = useMemo(() => (classSummaries.data || []).filter((item) =>
    invoiceGrade === 'ALL' || item.gradeLevel === invoiceGrade), [classSummaries.data, invoiceGrade]);
  const visibleTotals = useMemo(() => filteredClassSummaries.reduce((totals, item) => ({
    total: totals.total + item.totalAmount,
    paid: totals.paid + item.paidAmount,
    outstanding: totals.outstanding + item.outstanding,
    incomplete: totals.incomplete + (item.completed ? 0 : 1),
  }), { total: 0, paid: 0, outstanding: 0, incomplete: 0 }), [filteredClassSummaries]);
  const remindableClasses = filteredClassSummaries.filter((item) => !item.completed
    && Boolean(item.homeroomTeacherId) && !item.reminderSentToday);

  const openCreatePeriod = () => {
    setEditingPeriod(null);
    setPeriodForm(EMPTY_PERIOD_FORM);
    setShowPeriodEditor(true);
  };

  const openEditPeriod = (period: FeePeriod) => {
    setEditingPeriod(period);
    setPeriodForm({ code: period.code, name: period.name || '', applyToGrades: period.applyToGrades || '', dueDate: period.dueDate || '' });
    setShowPeriodEditor(true);
  };

  const focusPeriodSetup = (periodId: string) => {
    setSelectedPeriodId(periodId);
    window.setTimeout(() => {
      document.getElementById('finance-period-setup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  };

  const savePeriod = async () => {
    if (!periodForm.code.trim() || !periodForm.name.trim()) return toast.show('err', 'Vui lòng nhập mã và tên đợt thu');
    setBusy(true);
    try {
      const payload = { ...periodForm, applyToGrades: periodForm.applyToGrades.trim() || null, dueDate: periodForm.dueDate || null };
      if (editingPeriod) await api.put(`/fee-periods/${editingPeriod.id}`, payload);
      else {
        const created = await api.post<FeePeriod>('/fee-periods', payload);
        periods.setData((current) => [...(current || []), created]);
        focusPeriodSetup(created.id);
      }
      toast.show('ok', editingPeriod ? 'Đã cập nhật đợt thu' : 'Đã tạo đợt thu mới');
      setShowPeriodEditor(false);
      refreshFinance();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const deletePeriod = async (period: FeePeriod) => {
    if (!confirm(`Xóa đợt thu nháp “${period.name || period.code}” và toàn bộ khoản thu bên trong?`)) return;
    try {
      await api.del(`/fee-periods/${period.id}`);
      if (selectedPeriodId === period.id) setSelectedPeriodId(null);
      toast.show('ok', 'Đã xóa đợt thu nháp');
      refreshFinance();
    } catch (error: any) { toast.show('err', error.message); }
  };

  const addItem = async () => {
    if (!selectedPeriodId || !itemForm.name.trim() || itemForm.amount <= 0) return toast.show('err', 'Nhập đầy đủ tên và số tiền khoản thu');
    try {
      await api.post(`/fee-periods/${selectedPeriodId}/items`, {
        ...itemForm, name: itemForm.name.trim(), gradeLevel: itemForm.gradeLevel.trim() || null,
      });
      setItemForm({ name: '', amount: 1000000, gradeLevel: '' });
      toast.show('ok', 'Đã thêm khoản thu');
      items.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  const deleteItem = async (item: FeePeriodItem) => {
    if (!selectedPeriodId || !confirm(`Xóa khoản “${item.name}”?`)) return;
    try {
      await api.del(`/fee-periods/${selectedPeriodId}/items/${item.id}`);
      toast.show('ok', 'Đã xóa khoản thu');
      items.reload();
    } catch (error: any) { toast.show('err', error.message); }
  };

  const changePeriodStatus = async (period: FeePeriod, action: 'open' | 'close') => {
    if (action === 'open' && selectedPeriodId === period.id && !items.loading && (items.data || []).length === 0) {
      focusPeriodSetup(period.id);
      return toast.show('err', 'Hãy thêm ít nhất một khoản thu ở phần thiết lập bên dưới trước khi mở đợt');
    }
    try {
      const updated = await api.post<FeePeriod>(`/fee-periods/${period.id}/${action}`);
      periods.setData((current) => (current || []).map((item) => item.id === updated.id ? updated : item));
      if (action === 'open') focusPeriodSetup(period.id);
      toast.show('ok', action === 'open' ? 'Đợt thu đã sẵn sàng phát hành' : 'Đã đóng đợt thu');
      refreshFinance();
    } catch (error: any) {
      if (action === 'open' && String(error.message).toLocaleLowerCase('vi').includes('khoản thu')) {
        focusPeriodSetup(period.id);
        toast.show('err', 'Đợt thu chưa có khoản thu. Hãy thêm tên khoản và số tiền ở phần thiết lập vừa mở');
      } else toast.show('err', error.message);
    }
  };

  const generateInvoices = async (period: FeePeriod) => {
    if (!confirm(`Phát hành hóa đơn cho đợt “${period.name || period.code}”? Phụ huynh sẽ nhận được thông báo tự động.`)) return;
    setBusy(true);
    try {
      const result = await api.post<Invoice[]>(`/fee-periods/${period.id}/generate-invoices`);
      toast.show('ok', `Đã đồng bộ ${result.length} hóa đơn và gửi thông báo tới phụ huynh`);
      refreshFinance();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  const remindHomeroom = async (summary: FinanceClassSummary) => {
    if (!summary.homeroomTeacherId) return toast.show('err', `Lớp ${summary.classCode} chưa có giáo viên chủ nhiệm`);
    if (!confirm(`Gửi thông báo nhiệm vụ tài chính của lớp ${summary.classCode} tới giáo viên chủ nhiệm?`)) return;
    setSendingClassId(summary.classId);
    try {
      const suffix = invoicePeriod === 'ALL' ? '' : `?periodId=${encodeURIComponent(invoicePeriod)}`;
      await api.post<HomeroomDebtReminderResult>(`/finance/classes/${summary.classId}/remind-homeroom${suffix}`);
      toast.show('ok', `Đã nhắc GVCN lớp ${summary.classCode} theo dõi và liên hệ phụ huynh`);
      classSummaries.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSendingClassId(null); }
  };

  const remindVisibleHomerooms = async () => {
    if (!remindableClasses.length) return toast.show('err', 'Không có lớp phù hợp cần gửi nhắc mới hôm nay');
    if (!confirm(`Gửi nhắc nhiệm vụ tài chính tới GVCN của ${remindableClasses.length} lớp đang hiển thị?`)) return;
    setSendingVisible(true);
    try {
      const result = await api.post<HomeroomDebtReminderResult>('/finance/classes/remind-homerooms', {
        periodId: invoicePeriod === 'ALL' ? null : invoicePeriod,
        classIds: remindableClasses.map((item) => item.classId),
      });
      toast.show('ok', `Đã nhắc ${result.recipientCount} GVCN phụ trách ${result.classCount} lớp`);
      classSummaries.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSendingVisible(false); }
  };

  const collectionRate = Math.min(100, Math.max(0, overview.data?.collectionRate || 0));
  const configuredTotal = (items.data || []).reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="finance-page">
      {toast.node}
      <header className="finance-hero">
        <div>
          <span className="finance-eyebrow"><CircleGauge size={15} /> Trung tâm điều hành tài chính</span>
          <h2>Dòng tiền minh bạch, công nợ dễ kiểm soát</h2>
          <p>Theo dõi thu học phí theo thời gian thực, xử lý khoản thu và chủ động nhắc phụ huynh trên một màn hình.</p>
        </div>
        <div className="finance-hero-actions">
          <button className="live-btn ghost" type="button" onClick={refreshFinance}><RefreshCw size={15} /> Đồng bộ</button>
          <button className="live-btn" type="button" onClick={openCreatePeriod}><Plus size={15} /> Tạo đợt thu</button>
        </div>
      </header>

      <section className="finance-kpi-grid" aria-label="Tổng quan tài chính">
        <article className="finance-kpi-card primary"><span><TrendingUp size={20} /></span><div><small>Đã thu toàn trường</small><strong>{money(overview.data?.paidAmount || 0)}</strong><p>{collectionRate.toFixed(1)}% tổng phải thu</p></div></article>
        <article className="finance-kpi-card"><span><WalletCards size={20} /></span><div><small>Công nợ còn lại</small><strong>{money(overview.data?.outstanding || 0)}</strong><p>{Math.max(0, (overview.data?.invoiceCount || 0) - (overview.data?.paidInvoiceCount || 0))} hóa đơn chưa hoàn tất</p></div></article>
        <article className="finance-kpi-card success"><span><ReceiptText size={20} /></span><div><small>Thu trong tháng</small><strong>{money(overview.data?.collectedThisMonth || 0)}</strong><p>{overview.data?.paidInvoiceCount || 0} hóa đơn đã thanh toán</p></div></article>
        <article className={`finance-kpi-card ${(overview.data?.overdueInvoiceCount || 0) > 0 ? 'danger' : ''}`}><span><AlertTriangle size={20} /></span><div><small>Cần xử lý</small><strong>{overview.data?.overdueInvoiceCount || 0} quá hạn</strong><p>{overview.data?.dueSoonInvoiceCount || 0} hóa đơn sắp đến hạn</p></div></article>
      </section>

      <FunctionTabs tabs={[
        { id: 'overview', label: 'Tổng quan', Icon: TrendingUp, content: (
          <div className="finance-overview-grid">
            <Section title="Tiến độ thu học phí" subtitle="Tỷ lệ thu trên tổng giá trị hóa đơn đã phát hành" wide>
              <div className="finance-progress-summary">
                <div><strong>{collectionRate.toFixed(1)}%</strong><span>Đã hoàn thành</span></div>
                <div className="finance-progress-track"><span style={{ width: `${collectionRate}%` }} /></div>
                <footer><span>Đã thu <b>{money(overview.data?.paidAmount || 0)}</b></span><span>Tổng phải thu <b>{money(overview.data?.totalAmount || 0)}</b></span></footer>
              </div>
              <div className="finance-insight-row">
                <article><Clock3 size={18} /><div><strong>{overview.data?.dueSoonInvoiceCount || 0} hóa đơn sắp hạn</strong><span>Cần theo dõi trong 7 ngày tới</span></div></article>
                <article><CheckCircle2 size={18} /><div><strong>{overview.data?.partialInvoiceCount || 0} hóa đơn thu một phần</strong><span>Tiếp tục đối soát số dư còn lại</span></div></article>
              </div>
            </Section>
            <Section title="Hiệu quả theo đợt thu" subtitle="So sánh tiến độ và công nợ từng đợt" wide>
              <Async state={overview} allowEmpty>{(data) => data.periods.length ? (
                <div className="finance-period-performance">
                  {data.periods.slice(0, 6).map((period) => (
                    <article key={period.periodId}>
                      <header><div><strong>{period.name || period.code}</strong><span>{period.invoiceCount} hóa đơn</span></div><StatusPill value={period.status} /></header>
                      <div className="finance-mini-progress"><span style={{ width: `${Math.min(100, period.collectionRate)}%` }} /></div>
                      <footer><span>{period.collectionRate.toFixed(1)}% đã thu</span><b>Còn {money(period.outstanding)}</b></footer>
                    </article>
                  ))}
                </div>
              ) : <div className="empty-state"><strong>Chưa có dữ liệu đợt thu</strong></div>}</Async>
            </Section>
          </div>
        ) },
        { id: 'periods', label: 'Đợt thu', Icon: CircleDollarSign, content: (
          <Section title="Quản lý đợt thu" subtitle="Tạo định mức, kiểm tra phạm vi và phát hành hóa đơn theo quy trình" wide
            action={<button className="live-btn" type="button" onClick={openCreatePeriod}><Plus size={15} /> Tạo đợt thu</button>}>
            <div className="finance-filterbar">
              <label className="finance-search"><Search size={16} /><input placeholder="Tìm theo mã hoặc tên đợt thu" value={periodQuery} onChange={(event) => setPeriodQuery(event.target.value)} /></label>
              <span>{filteredPeriods.length} đợt thu</span>
            </div>
            <Async state={{ ...periods, data: filteredPeriods }} empty="Chưa có đợt thu">
              {(rows) => <PaginatedData items={rows} pageSize={10} itemLabel="đợt thu" resetKey={periodQuery}>
                {(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table"><thead><tr><th>Đợt thu</th><th>Phạm vi</th><th>Hạn thanh toán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
                  <tbody>{pageRows.map((period) => <tr key={period.id} className={selectedPeriodId === period.id ? 'selected' : ''}>
                    <td><strong>{period.name || 'Chưa đặt tên'}</strong><small>{period.code}</small></td>
                    <td>{period.applyToGrades || 'Toàn trường'}</td><td>{fmtDate(period.dueDate)}</td><td><StatusPill value={period.status} /></td>
                    <td><div className="finance-row-actions">
                      <button className="icon-action" type="button" title="Quản lý khoản thu" onClick={() => focusPeriodSetup(period.id)}><Eye size={16} /></button>
                      {period.status === 'DRAFT' && <><button className="icon-action" type="button" title="Chỉnh sửa" onClick={() => openEditPeriod(period)}><Pencil size={16} /></button><button className="icon-action danger" type="button" title="Xóa" onClick={() => deletePeriod(period)}><Trash2 size={16} /></button></>}
                      {period.status === 'DRAFT' && <button className="live-btn subtle" type="button" onClick={() => changePeriodStatus(period, 'open')}>Mở đợt</button>}
                      {period.status === 'OPEN' && <><button className="live-btn" type="button" disabled={busy} onClick={() => generateInvoices(period)}><Send size={14} /> Phát hành</button><button className="live-btn ghost" type="button" onClick={() => changePeriodStatus(period, 'close')}>Đóng đợt</button></>}
                    </div></td>
                  </tr>)}</tbody></table></div>}
              </PaginatedData>}
            </Async>

            {selectedPeriod && <div className="finance-period-workspace" id="finance-period-setup">
              <header><div><span>Đang quản lý</span><h3>{selectedPeriod.name || selectedPeriod.code}</h3><p>{selectedPeriod.code} · {selectedPeriod.applyToGrades || 'Toàn trường'} · hạn {fmtDate(selectedPeriod.dueDate)}</p></div><div><small>Tổng định mức</small><strong>{money(configuredTotal)}</strong></div></header>
              {selectedPeriod.status === 'DRAFT' && <div className="finance-item-form">
                <Field label="Tên khoản thu"><input className="live-input" placeholder="Ví dụ: Học phí tháng 9" value={itemForm.name} onChange={(event) => setItemForm({ ...itemForm, name: event.target.value })} /></Field>
                <Field label="Số tiền"><input className="live-input" type="number" min="1" step="50000" value={itemForm.amount} onChange={(event) => setItemForm({ ...itemForm, amount: Number(event.target.value) })} /></Field>
                <Field label="Khối áp dụng"><input className="live-input" placeholder="Để trống = tất cả" value={itemForm.gradeLevel} onChange={(event) => setItemForm({ ...itemForm, gradeLevel: event.target.value })} /></Field>
                <button className="live-btn" type="button" onClick={addItem}><Plus size={15} /> Thêm khoản</button>
              </div>}
              <Async state={items} empty="Chưa có khoản thu trong đợt này">
                {(rows) => <div className="finance-item-list">{rows.map((item) => <article key={item.id}><span><ReceiptText size={17} /></span><div><strong>{item.name}</strong><small>{item.gradeLevel || 'Áp dụng toàn trường'}</small></div><b>{money(item.amount)}</b>{selectedPeriod.status === 'DRAFT' && <button className="icon-action danger" type="button" title="Xóa khoản thu" onClick={() => deleteItem(item)}><Trash2 size={15} /></button>}</article>)}</div>}
              </Async>
              {selectedPeriod.status === 'DRAFT' && <div className={`finance-period-readiness ${(items.data || []).length ? 'ready' : ''}`}>
                <div>{(items.data || []).length ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}<span><strong>{(items.data || []).length ? `Đã có ${(items.data || []).length} khoản thu` : 'Chưa thể mở đợt thu'}</strong><small>{(items.data || []).length ? 'Kiểm tra lần cuối rồi mở đợt để chuẩn bị phát hành hóa đơn.' : 'Nhập tên khoản, số tiền và bấm “Thêm khoản” trước.'}</small></span></div>
                <button className="live-btn" type="button" disabled={items.loading || (items.data || []).length === 0} onClick={() => changePeriodStatus(selectedPeriod, 'open')}>Mở đợt thu</button>
              </div>}
              {selectedPeriod.status === 'OPEN' && <div className="finance-period-readiness ready publish">
                <div><Send size={18} /><span><strong>Đợt thu đã mở, có thể phát hành</strong><small>Hệ thống sẽ tạo hóa đơn cho học sinh phù hợp và tự động thông báo tới phụ huynh.</small></span></div>
                <button className="live-btn" type="button" disabled={busy} onClick={() => generateInvoices(selectedPeriod)}><Send size={15} /> {busy ? 'Đang phát hành…' : 'Phát hành hóa đơn'}</button>
              </div>}
            </div>}
          </Section>
        ) },
        { id: 'invoices', label: 'Công nợ theo lớp', Icon: FileText, content: (
          <Section title="Tổng thu và công nợ toàn trường" subtitle="Theo dõi tiến độ từng lớp và giao nhiệm vụ nhắc hạn cho giáo viên chủ nhiệm" wide
            action={<div className="finance-section-actions"><button className="live-btn ghost" type="button" onClick={() => downloadClassFinanceCsv(filteredClassSummaries)}><Download size={15} /> Xuất báo cáo lớp</button><button className="live-btn" type="button" disabled={sendingVisible || remindableClasses.length === 0} onClick={remindVisibleHomerooms}><BellRing size={15} /> {sendingVisible ? 'Đang gửi…' : `Nhắc GVCN (${remindableClasses.length})`}</button></div>}>
            <div className="finance-delegation-note"><UsersRound size={20} /><div><strong>Admin điều hành tổng thể, GVCN chịu trách nhiệm theo sát phụ huynh</strong><small>Admin chỉ theo dõi tổng thu và công nợ theo lớp. Các lớp chưa hoàn thành sẽ được giao lại cho giáo viên chủ nhiệm kiểm tra và nhắc phụ huynh.</small></div></div>
            <div className="finance-filterbar class-debt-filters">
              <label className="finance-search"><Search size={16} /><input placeholder="Tìm lớp hoặc giáo viên chủ nhiệm" value={classQuery} onChange={(event) => setClassQuery(event.target.value)} /></label>
              <select className="live-input" value={invoicePeriod} onChange={(event) => { setInvoicePeriod(event.target.value); setInvoiceClass('ALL'); }} aria-label="Lọc khoản thu">
                <option value="ALL">Tất cả khoản thu</option>{(periods.data || []).map((period) => <option key={period.id} value={period.id}>{period.name || period.code}</option>)}
              </select>
              <select className="live-input" value={invoiceGrade} onChange={(event) => { setInvoiceGrade(event.target.value); setInvoiceClass('ALL'); }} aria-label="Lọc khối">
                <option value="ALL">Tất cả khối</option>{availableGrades.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
              <select className="live-input" value={invoiceClass} onChange={(event) => setInvoiceClass(event.target.value)} aria-label="Lọc lớp">
                <option value="ALL">Tất cả lớp</option>{availableClasses.map((item) => <option key={item.classId} value={item.classId}>{item.classCode}</option>)}
              </select>
              <select className="live-input" value={classStatus} onChange={(event) => setClassStatus(event.target.value)} aria-label="Lọc trạng thái lớp">
                <option value="ALL">Tất cả trạng thái</option><option value="INCOMPLETE">Chưa hoàn thành</option><option value="OVERDUE">Có khoản quá hạn</option><option value="IN_PROGRESS">Đang trong hạn</option><option value="COMPLETED">Đã hoàn thành</option><option value="NO_HOMEROOM">Chưa có GVCN</option>
              </select>
              <span>{filteredClassSummaries.length} lớp</span>
            </div>
            <div className="finance-filter-summary">
              <article><small>Phải thu</small><strong>{money(visibleTotals.total)}</strong></article>
              <article><small>Đã thu</small><strong>{money(visibleTotals.paid)}</strong></article>
              <article className={visibleTotals.outstanding ? 'attention' : ''}><small>Còn công nợ</small><strong>{money(visibleTotals.outstanding)}</strong></article>
              <article><small>Lớp chưa hoàn thành</small><strong>{visibleTotals.incomplete}</strong></article>
            </div>
            <Async state={{ ...classSummaries, data: filteredClassSummaries }} empty="Không có lớp phù hợp với bộ lọc">
              {(rows) => <PaginatedData items={rows} pageSize={10} itemLabel="lớp" resetKey={`${classQuery}-${classStatus}-${invoicePeriod}-${invoiceGrade}-${invoiceClass}`}>
                {(pageRows) => <div className="finance-table-wrap"><table className="live-table finance-table class-debt-table"><thead><tr><th>Khối / Lớp</th><th>Giáo viên chủ nhiệm</th><th>Hoàn thành</th><th>Thu &amp; công nợ</th><th>Tiến độ &amp; trạng thái</th><th>Điều phối</th></tr></thead><tbody>
                  {pageRows.map((summary) => <tr key={summary.classId}>
                    <td><strong>{summary.classCode}</strong><small>{summary.gradeLevel || 'Chưa xác định khối'}</small></td>
                    <td><strong>{summary.homeroomTeacherName || 'Chưa phân công'}</strong></td>
                    <td><strong>{summary.paidCount}/{summary.invoiceCount}</strong><small>hóa đơn</small></td>
                    <td><div className="finance-money-stack"><span><small>Phải thu</small><b>{money(summary.totalAmount)}</b></span><span><small>Đã thu</small><b className="finance-paid-value">{money(summary.paidAmount)}</b></span><span className={summary.outstanding ? 'debt' : ''}><small>Còn nợ</small><b>{money(summary.outstanding)}</b></span></div></td>
                    <td><div className="finance-status-stack"><div className="finance-table-progress"><div className="finance-mini-progress"><span style={{ width: `${Math.min(100, summary.collectionRate)}%` }} /></div><b>{summary.collectionRate.toFixed(1)}%</b></div><div><StatusPill value={summary.completed ? 'Đã hoàn thành' : summary.overdueCount ? 'Có quá hạn' : 'Đang thu'} />{summary.overdueCount > 0 && <small>{summary.overdueCount} hóa đơn quá hạn</small>}</div></div></td>
                    <td>{summary.completed ? <span className="finance-complete-label"><CheckCircle2 size={14} /> Hoàn thành</span> : !summary.homeroomTeacherId ? <span className="finance-missing-owner">Cần phân công GVCN</span> : <button className="live-btn subtle" type="button" disabled={summary.reminderSentToday || sendingClassId === summary.classId} onClick={() => remindHomeroom(summary)}><BellRing size={14} /> {summary.reminderSentToday ? 'Đã nhắc hôm nay' : sendingClassId === summary.classId ? 'Đang gửi…' : 'Nhắc GVCN'}</button>}</td>
                  </tr>)}
                </tbody></table></div>}
              </PaginatedData>}
            </Async>
          </Section>
        ) },
      ]} />

      {showPeriodEditor && <Modal title={editingPeriod ? 'Chỉnh sửa đợt thu nháp' : 'Tạo đợt thu mới'} onClose={() => setShowPeriodEditor(false)} footer={<><button className="live-btn ghost" type="button" onClick={() => setShowPeriodEditor(false)}>Hủy</button><button className="live-btn" type="button" disabled={busy} onClick={savePeriod}><Save size={15} /> {editingPeriod ? 'Lưu thay đổi' : 'Tạo đợt thu'}</button></>}>
        <div className="finance-modal-form">
          <Field label="Mã đợt thu"><input className="live-input" disabled={!!editingPeriod} placeholder="Ví dụ: HP-HK1-2026" value={periodForm.code} onChange={(event) => setPeriodForm({ ...periodForm, code: event.target.value.toUpperCase() })} /></Field>
          <Field label="Tên đợt thu"><input className="live-input" placeholder="Học phí học kỳ I" value={periodForm.name} onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })} /></Field>
          <Field label="Khối áp dụng"><input className="live-input" placeholder="K10,K11 hoặc để trống cho toàn trường" value={periodForm.applyToGrades} onChange={(event) => setPeriodForm({ ...periodForm, applyToGrades: event.target.value })} /></Field>
          <Field label="Hạn thanh toán"><input className="live-input" type="date" value={periodForm.dueDate} onChange={(event) => setPeriodForm({ ...periodForm, dueDate: event.target.value })} /></Field>
        </div>
        <div className="finance-guidance"><ReceiptText size={18} /><p>Đợt thu được tạo ở trạng thái nháp. Hãy thêm đầy đủ các khoản trước khi mở và phát hành hóa đơn.</p></div>
      </Modal>}

    </div>
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
  const announcements = useApi<Announcement[]>('/admin/announcements');
  const audienceCounts = useApi<Record<string, number>>('/admin/announcements/audience-counts');
  const deliveryLogs = useApi<NotificationDeliveryLog[]>('/notification-delivery-logs');
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ audience: 'ALL', category: 'GENERAL', priority: 'NORMAL', title: '', body: '', holidayStartDate: '', holidayEndDate: '' });
  const selectedCategory = ANNOUNCEMENT_CATEGORIES.find((item) => item.value === form.category) || ANNOUNCEMENT_CATEGORIES[0];
  const recipientCount = audienceCounts.data?.[form.audience] ?? 0;

  const applyCategory = (category: typeof ANNOUNCEMENT_CATEGORIES[number]) => {
    setForm((current) => ({
      ...current,
      category: category.value,
      audience: category.value === 'HOLIDAY' ? 'ALL' : current.audience,
      title: category.title,
      body: category.body,
      holidayStartDate: category.value === 'HOLIDAY' ? current.holidayStartDate : '',
      holidayEndDate: category.value === 'HOLIDAY' ? current.holidayEndDate : '',
    }));
  };

  const sendAnnouncement = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.show('err', 'Vui lòng nhập tiêu đề và nội dung thông báo');
    if (form.category === 'HOLIDAY' && (!form.holidayStartDate || !form.holidayEndDate)) return toast.show('err', 'Vui lòng chọn đầy đủ thời gian nghỉ');
    if (form.category === 'HOLIDAY' && form.holidayEndDate < form.holidayStartDate) return toast.show('err', 'Ngày kết thúc không được trước ngày bắt đầu');
    if (!recipientCount) return toast.show('err', 'Phạm vi đã chọn hiện không có người nhận');
    setSending(true);
    try {
      const sent = await api.post<Announcement>('/announcements', {
        audience: form.audience,
        category: form.category,
        priority: form.priority,
        title: form.title.trim(),
        body: form.body.trim(),
        holidayStartDate: form.category === 'HOLIDAY' ? form.holidayStartDate : null,
        holidayEndDate: form.category === 'HOLIDAY' ? form.holidayEndDate : null,
      });
      toast.show('ok', form.category === 'HOLIDAY'
        ? `Đã thông báo nghỉ và tự động miễn điểm danh trong ${form.holidayStartDate === form.holidayEndDate ? 'ngày đã chọn' : 'khoảng thời gian đã chọn'}`
        : `Đã gửi thông báo tới ${sent.recipientCount ?? recipientCount} người nhận`);
      setForm((current) => ({ ...current, title: '', body: '', priority: 'NORMAL', holidayStartDate: '', holidayEndDate: '' }));
      announcements.reload();
      deliveryLogs.reload();
    } catch (error: any) {
      toast.show('err', error.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="admin-notification-center">
      {toast.node}
      <Section title="Trung tâm thông báo" subtitle="Soạn và gửi thông tin đúng đối tượng trong toàn trường" wide
        action={<button className="live-btn ghost" onClick={() => { announcements.reload(); audienceCounts.reload(); deliveryLogs.reload(); }}><RefreshCw size={14} /> Cập nhật dữ liệu</button>}>
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
                  <button type="button" key={value} className={form.audience === value ? 'active' : ''} disabled={form.category === 'HOLIDAY' && value !== 'ALL'} onClick={() => setForm({ ...form, audience: value })}>
                    <span><Icon size={17} /></span><div><strong>{label}</strong><small>{hint}</small></div><b>{audienceCounts.data?.[value] ?? 0}</b>
                  </button>
                ))}
              </div>
              {form.category === 'HOLIDAY' && <small className="announcement-holiday-help">Thông báo nghỉ luôn áp dụng cho toàn trường và tự động tắt yêu cầu điểm danh trong thời gian đã chọn.</small>}
            </div>

            <div className="announcement-form-grid">
              {form.category === 'HOLIDAY' && <>
                <label><span>Ngày bắt đầu nghỉ</span><input type="date" value={form.holidayStartDate} onChange={(event) => setForm({ ...form, holidayStartDate: event.target.value, holidayEndDate: form.holidayEndDate && form.holidayEndDate < event.target.value ? event.target.value : form.holidayEndDate })} /></label>
                <label><span>Ngày kết thúc nghỉ</span><input type="date" min={form.holidayStartDate} value={form.holidayEndDate} onChange={(event) => setForm({ ...form, holidayEndDate: event.target.value })} /></label>
              </>}
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
              {form.category === 'HOLIDAY' && <small><CalendarDays size={14} /> {form.holidayStartDate || 'Chọn ngày bắt đầu'} → {form.holidayEndDate || 'Chọn ngày kết thúc'}</small>}
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
            <tbody>{items.map((item) => <tr key={item.id}><td>{fmtDateTime(item.createdAt)}</td><td><Badge tone="blue">{ANNOUNCEMENT_CATEGORY_LABEL[item.category || 'GENERAL'] || item.category}</Badge></td><td><strong>{ANNOUNCEMENT_AUDIENCE_LABEL[item.audience] || item.audience}</strong></td><td><strong>{item.title}</strong><small>{item.body}</small>{item.category === 'HOLIDAY' && item.holidayStartDate && <small>Thời gian nghỉ: {item.holidayStartDate} → {item.holidayEndDate}</small>}</td><td><span className={`announcement-priority priority-${(item.priority || 'NORMAL').toLowerCase()}`}>{ANNOUNCEMENT_PRIORITY_LABEL[item.priority || 'NORMAL'] || item.priority}</span></td><td><strong>{item.recipientCount ? item.recipientCount : '—'}</strong></td><td><StatusPill value={item.status === 'SENT' ? 'Đã gửi' : item.status || 'Đã gửi'} /></td></tr>)}</tbody>
          </table></div>}
        </Async>
      </Section>

      <Section title="Nhật ký chuyển phát" subtitle="Kiểm tra kênh nào đã nhận, bị bỏ qua hoặc gửi thất bại" wide>
        <Async paginate state={deliveryLogs} empty="Chưa có lượt chuyển phát" itemLabel="lượt chuyển phát">
          {(items) => <div className="admin-table-scroll"><table className="live-table"><thead><tr><th>Thời gian</th><th>Kênh</th><th>Người nhận</th><th>Trạng thái</th><th>Số lần</th><th>Chi tiết</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}>
            <td>{fmtDateTime(item.createdAt)}</td><td><strong>{{ IN_APP: 'Trong ứng dụng', EMAIL: 'Email', PUSH: 'Thông báo đẩy' }[item.channel]}</strong></td><td>{item.recipientId}</td><td><StatusPill value={item.status} /></td><td>{item.attempts}</td><td>{item.detail || 'Đã chuyển phát thành công'}</td>
          </tr>)}</tbody></table></div>}
        </Async>
      </Section>

    </div>
  );
}

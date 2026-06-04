import { useEffect, useState } from 'react';
import { Lock, Unlock, Plus, RefreshCw, FileText, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import type {
  ApiUser, AcademicYear, Semester, SchoolClass, Subject, Room,
  ExamCategory, FeePeriod, FeePeriodItem, Invoice, NotificationTemplate, Club, ClubRegistration,
} from '../../api/types';
import { Section, FunctionTabs, StatusPill, Badge } from '../../components/ui';
import { Async, useToast, money } from './common';
import { Modal, Field } from './Modal';
import { School, CalendarDays, DoorOpen, BookOpen, CircleDollarSign } from 'lucide-react';

const PAGE_SIZE = 8;

/* ============ A1 — Người dùng (phân trang + modal tạo) ============ */
const BLANK_USER = {
  username: '', fullName: '', role: 'STUDENT', password: 'Sse@123456',
  email: '', phone: '', teacherCode: '', mainSubject: '', classId: '',
};

export function AdminUsersLive() {
  const [role, setRole] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(0);
  const params = [role && `role=${role}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&');
  const users = useApi<ApiUser[]>(`/users${params ? '?' + params : ''}`);
  const classes = useApi<SchoolClass[]>('/classes');
  const toast = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ ...BLANK_USER });

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

  const create = async () => {
    if (!form.username || !form.fullName) return toast.show('err', 'Nhập username + họ tên');
    const cls = classes.data?.find((c) => c.id === form.classId);
    const body: Record<string, unknown> = {
      username: form.username, fullName: form.fullName, role: form.role,
      password: form.password || 'Sse@123456', email: form.email || null, phone: form.phone || null,
    };
    if (form.role === 'TEACHER') { body.teacherCode = form.teacherCode || null; body.mainSubject = form.mainSubject || null; }
    if (form.role === 'STUDENT') { body.classId = form.classId || null; body.className = cls?.code || null; } // mã HS tự sinh
    try {
      await api.post('/users', body);
      toast.show('ok', 'Đã tạo người dùng');
      setShowCreate(false);
      setForm({ ...BLANK_USER });
      users.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <Section title="Người dùng & phân quyền (A1)" subtitle="identity service · khóa/mở/tạo · phân trang" wide
      action={<button className="live-btn" onClick={() => setShowCreate(true)}><Plus size={15} /> Tạo người dùng</button>}>
      {toast.node}
      <div className="live-toolbar">
        <select className="live-select" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="">Tất cả vai trò</option>
          <option value="ADMIN">Admin</option><option value="TEACHER">Teacher</option>
          <option value="STUDENT">Student</option><option value="PARENT">Parent</option>
        </select>
        <input className="live-input grow" placeholder="Tìm tên / username / mã…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="live-btn ghost" onClick={() => users.reload()}><RefreshCw size={15} /> Tải lại</button>
      </div>

      <Async state={users} empty="Không có người dùng">
        {() => (
          <>
            <table className="live-table">
              <thead><tr><th>Họ tên</th><th>Username</th><th>Vai trò</th><th>Trạng thái</th><th></th></tr></thead>
              <tbody>
                {pageItems.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.fullName}</strong>{u.studentCode && <small style={{ color: 'var(--muted)' }}> · {u.studentCode}</small>}{u.teacherCode && <small style={{ color: 'var(--muted)' }}> · {u.teacherCode}</small>}</td>
                    <td>@{u.username}</td>
                    <td><Badge tone="blue">{u.role}</Badge></td>
                    <td><StatusPill value={u.status} /></td>
                    <td>
                      <button className="live-btn subtle" onClick={() => toggleLock(u)}>
                        {u.status === 'ACTIVE' ? <><Lock size={14} /> Khóa</> : <><Unlock size={14} /> Mở</>}
                      </button>
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

      {showCreate && (
        <Modal title="Tạo người dùng mới" onClose={() => setShowCreate(false)}
          footer={<>
            <button className="live-btn ghost" onClick={() => setShowCreate(false)}>Hủy</button>
            <button className="live-btn" onClick={create}><Plus size={15} /> Tạo tài khoản</button>
          </>}>
          <Field label="Vai trò">
            <select value={form.role} onChange={(e) => set('role', e.target.value)}>
              <option value="STUDENT">Học sinh</option><option value="TEACHER">Giáo viên</option>
              <option value="PARENT">Phụ huynh</option><option value="ADMIN">Quản trị</option>
            </select>
          </Field>
          <div className="modal-grid2">
            <Field label="Họ và tên"><input value={form.fullName} onChange={(e) => set('fullName', e.target.value)} placeholder="Nguyễn Văn A" /></Field>
            <Field label="Tên đăng nhập"><input value={form.username} onChange={(e) => set('username', e.target.value)} placeholder="vd: hs.vana" /></Field>
          </div>
          <div className="modal-grid2">
            <Field label="Mật khẩu"><input value={form.password} onChange={(e) => set('password', e.target.value)} /></Field>
            <Field label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="a@sse.edu.vn" /></Field>
          </div>
          <Field label="Số điện thoại"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>

          {form.role === 'TEACHER' && (
            <div className="modal-grid2">
              <Field label="Mã giáo viên"><input value={form.teacherCode} onChange={(e) => set('teacherCode', e.target.value)} placeholder="GV003" /></Field>
              <Field label="Môn chính"><input value={form.mainSubject} onChange={(e) => set('mainSubject', e.target.value)} placeholder="Toán" /></Field>
            </div>
          )}
          {form.role === 'STUDENT' && (
            <Field label="Lớp (mã học sinh sẽ tự sinh)">
              <select value={form.classId} onChange={(e) => set('classId', e.target.value)}>
                <option value="">— Chọn lớp —</option>
                {(classes.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} — {c.name}</option>)}
              </select>
            </Field>
          )}
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
  const toast = useToast();
  const [sj, setSj] = useState({ code: '', name: '' });
  const [rm, setRm] = useState({ code: '', name: '', capacity: 45 });

  const addSubject = async () => {
    if (!sj.code || !sj.name) return toast.show('err', 'Nhập mã + tên môn');
    try { await api.post('/subjects', sj); toast.show('ok', 'Đã thêm môn'); setSj({ code: '', name: '' }); subjects.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };
  const addRoom = async () => {
    if (!rm.code) return toast.show('err', 'Nhập mã phòng');
    try { await api.post('/rooms', rm); toast.show('ok', 'Đã thêm phòng học'); setRm({ code: '', name: '', capacity: 45 }); rooms.reload(); }
    catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <>
      {toast.node}
      <FunctionTabs
        tabs={[
          { id: 'years', label: 'Năm học', Icon: CalendarDays, content: (
            <Section title="Năm học" subtitle="academic_years" wide>
              <Async state={years}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Trạng thái</th></tr></thead>
                  <tbody>{l.map((y) => <tr key={y.id}><td><strong>{y.code}</strong></td><td>{y.name}</td><td><StatusPill value={y.status} /></td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'sem', label: 'Học kỳ', Icon: CalendarDays, content: (
            <Section title="Học kỳ" subtitle="semesters" wide>
              <Async state={semesters}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Thứ tự</th><th>Trạng thái</th></tr></thead>
                  <tbody>{l.map((s) => <tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.name}</td><td>{s.sequence}</td><td><StatusPill value={s.status} /></td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'classes', label: 'Lớp', Icon: School, content: (
            <Section title="Lớp học" subtitle="classes" wide>
              <Async state={classes}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th><th>Khối</th><th>Sĩ số</th></tr></thead>
                  <tbody>{l.map((c) => <tr key={c.id}><td><strong>{c.code}</strong></td><td>{c.name}</td><td><Badge tone="violet">{c.gradeLevel}</Badge></td><td>{c.studentCount} HS</td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'subjects', label: 'Môn', Icon: BookOpen, content: (
            <Section title="Môn học" subtitle="subjects" wide>
              <div className="live-toolbar">
                <input className="live-input" placeholder="Mã (vd CHEM)" value={sj.code} onChange={(e) => setSj({ ...sj, code: e.target.value })} />
                <input className="live-input grow" placeholder="Tên môn" value={sj.name} onChange={(e) => setSj({ ...sj, name: e.target.value })} />
                <button className="live-btn" onClick={addSubject}><Plus size={15} /> Thêm môn</button>
              </div>
              <Async state={subjects}>{(l) => (
                <table className="live-table"><thead><tr><th>Mã</th><th>Tên</th></tr></thead>
                  <tbody>{l.map((s) => <tr key={s.id}><td><strong>{s.code}</strong></td><td>{s.name}</td></tr>)}</tbody></table>
              )}</Async>
            </Section>
          ) },
          { id: 'rooms', label: 'Phòng', Icon: DoorOpen, content: (
            <Section title="Phòng học" subtitle="rooms · thêm phòng khi trường mở rộng tòa nhà" wide>
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
  return (
    <Section title="Cấu hình khảo thí (A4)" subtitle="Loại điểm + hệ số · exam_categories" wide>
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
      await api.post('/payments', { invoiceId: inv.id, method: 'CASH' });
      toast.show('ok', `Đã ghi nhận thu tiền mặt ${inv.code}`);
      invoices.reload();
    } catch (e: any) { toast.show('err', e.message); }
  };

  return (
    <>
      {toast.node}
      <FunctionTabs tabs={[
        { id: 'periods', label: 'Đợt thu', Icon: CircleDollarSign, content: (
          <Section title="Đợt thu học phí (A7)" subtitle="Tạo đợt → thêm khoản → mở → sinh hóa đơn" wide>
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
          <Section title="Hóa đơn — xác nhận thu tiền mặt" subtitle="HS đóng trực tiếp tại trường → admin xác nhận; PH thanh toán online trên app" wide
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
    <Section title="Template thông báo (A9)" subtitle="notification_templates · Handlebars-like" wide>
      <Async state={tpls} empty="Chưa có template">
        {(l) => (
          <table className="live-table">
            <thead><tr><th>Mã</th><th>Tên</th><th>Kênh</th><th>Nội dung</th><th>Bật</th></tr></thead>
            <tbody>{l.map((t) => (
              <tr key={t.id}><td><strong>{t.code}</strong></td><td>{t.name}</td><td><Badge tone="blue">{t.channel}</Badge></td>
                <td><small>{t.bodyTemplate}</small></td><td>{t.active ? <Badge tone="green">ON</Badge> : <Badge tone="red">OFF</Badge>}</td></tr>
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
    <Section title="Khóa ngoại khóa (A5)" subtitle="clubs + đăng ký · có học phí" wide>
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

import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, CircleDot, HeartHandshake,
  History, MessageCircleMore, PencilLine, Plus, RefreshCw, Search,
  ShieldCheck, UserRound, UsersRound,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import { useHashNumber, useHashString } from '../../api/urlState';
import type { ApiUser, PageResponse, SchoolClass, StudentIntervention } from '../../api/types';
import { StatusPill } from '../../components/ui';
import { Async, ServerPagination, fmtDateTime, useToast } from './common';
import { Field, Modal } from './Modal';

const CATEGORY_OPTIONS = [
  ['ACADEMIC', 'Học tập'], ['ATTENDANCE', 'Chuyên cần'], ['BEHAVIOR', 'Hành vi'],
  ['WELLBEING', 'Tâm lý – sức khỏe'], ['OTHER', 'Khác'],
] as const;
const SEVERITY_OPTIONS = [['LOW', 'Theo dõi'], ['MEDIUM', 'Cần phối hợp'], ['HIGH', 'Ưu tiên xử lý']] as const;
const STATUS_OPTIONS = [['OPEN', 'Mới ghi nhận'], ['MONITORING', 'Đang theo dõi'], ['RESOLVED', 'Đã hoàn tất']] as const;

const labelOf = (options: readonly (readonly [string, string])[], value: string) =>
  options.find(([key]) => key === value)?.[1] || value;

type InterventionForm = {
  studentId: string; category: string; severity: string; title: string;
  description: string; actionTaken: string; followUpDate: string; status: string;
};

const emptyForm: InterventionForm = {
  studentId: '', category: 'ACADEMIC', severity: 'LOW', title: '', description: '',
  actionTaken: '', followUpDate: '', status: 'OPEN',
};

export function StudentSupportLive() {
  const { user } = useAuth();
  const toast = useToast();
  const classes = useApi<SchoolClass[]>('/classes');
  const [classId, setClassId] = useHashString('class', '');
  const [studentId, setStudentId] = useHashString('student', 'ALL');
  const [status, setStatus] = useHashString('status', 'ALL');
  const [severity, setSeverity] = useHashString('severity', 'ALL');
  const [query, setQuery] = useHashString('q', '');
  const [page, setPage] = useHashNumber('page', 1);
  const [pageSize, setPageSize] = useHashNumber('size', 10, 5);
  const selectedClass = classes.data?.find((item) => item.id === classId);
  const homeroom = selectedClass?.homeroomTeacherId === user?.id;
  const students = useApi<ApiUser[]>(classId ? `/classes/${encodeURIComponent(classId)}/students` : null);
  const params = useMemo(() => new URLSearchParams({
    classId,
    ...(studentId !== 'ALL' ? { studentId } : {}),
    ...(status !== 'ALL' ? { status } : {}),
    ...(severity !== 'ALL' ? { severity } : {}),
    ...(query.trim() ? { q: query.trim() } : {}),
    page: String(page - 1), size: String(pageSize),
  }).toString(), [classId, page, pageSize, query, severity, status, studentId]);
  const records = useApi<PageResponse<StudentIntervention>>(classId ? `/me/student-support?${params}` : null);
  const [editing, setEditing] = useState<StudentIntervention | null | undefined>(undefined);
  const [form, setForm] = useState<InterventionForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [contacting, setContacting] = useState<StudentIntervention | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!classId && classes.data?.length) setClassId(classes.data[0].id, 'replace');
    else if (classId && classes.data && !classes.data.some((item) => item.id === classId)) {
      setClassId(classes.data[0]?.id || '', 'replace');
    }
  }, [classId, classes.data, setClassId]);

  useEffect(() => {
    if (studentId !== 'ALL' && students.data && !students.data.some((item) => item.id === studentId)) {
      setStudentId('ALL', 'replace');
    }
  }, [setStudentId, studentId, students.data]);

  const openCreate = () => {
    const initialStudent = studentId !== 'ALL' ? studentId : students.data?.[0]?.id || '';
    setForm({ ...emptyForm, studentId: initialStudent, category: homeroom ? 'ACADEMIC' : 'ACADEMIC' });
    setEditing(null);
  };

  const openEdit = (item: StudentIntervention) => {
    setForm({
      studentId: item.studentId, category: item.category, severity: item.severity,
      title: item.title, description: item.description, actionTaken: item.actionTaken || '',
      followUpDate: item.followUpDate || '', status: item.status,
    });
    setEditing(item);
  };

  const save = async () => {
    if (!classId || !form.studentId) return toast.show('err', 'Vui lòng chọn học sinh');
    if (!form.title.trim() || !form.description.trim()) return toast.show('err', 'Vui lòng nhập tiêu đề và nội dung ghi nhận');
    setSaving(true);
    const payload = {
      ...(editing ? {} : { studentId: form.studentId, classId }),
      category: form.category, severity: form.severity, title: form.title.trim(),
      description: form.description.trim(), actionTaken: form.actionTaken.trim() || null,
      followUpDate: form.followUpDate || null, status: form.status,
    };
    try {
      if (editing) await api.put(`/me/student-support/${editing.id}`, payload);
      else await api.post('/me/student-support', payload);
      toast.show('ok', editing ? 'Đã cập nhật kế hoạch hỗ trợ' : 'Đã thêm ghi nhận hỗ trợ');
      setEditing(undefined);
      records.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSaving(false); }
  };

  const contactFamily = async () => {
    if (!contacting || !message.trim()) return toast.show('err', 'Vui lòng nhập nội dung trao đổi');
    setSaving(true);
    try {
      const result = await api.post<{ recipients: number }>(`/me/student-support/${contacting.id}/contact-family`, { message: message.trim() });
      toast.show('ok', `Đã gửi tới ${result.recipients} người nhận`);
      setContacting(null); setMessage(''); records.reload();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSaving(false); }
  };

  const resetFilters = () => {
    setStudentId('ALL'); setStatus('ALL'); setSeverity('ALL'); setQuery(''); setPage(1);
  };
  const summary = records.data?.summary || {};

  return <div className="student-support-page">
    <section className="student-support-hero">
      <div className="student-support-hero-icon"><HeartHandshake size={29} /></div>
      <div><small>KHÔNG GIAN HỖ TRỢ HỌC SINH</small><h2>Theo dõi đúng người, phối hợp đúng lúc</h2>
        <p>Lưu diễn biến theo thời gian; giáo viên bộ môn ghi nhận học tập, GVCN điều phối kế hoạch và trao đổi với gia đình.</p></div>
      <span className={`student-support-role ${homeroom ? 'homeroom' : ''}`}><ShieldCheck size={16} />
        {homeroom ? `GVCN lớp ${selectedClass?.code || ''}` : 'Giáo viên bộ môn'}</span>
    </section>

    <section className="student-support-scope">
      <div className="student-support-scope-title"><UsersRound size={20} /><div><strong>1. Chọn phạm vi theo dõi</strong><small>Chỉ hiển thị lớp được phân công</small></div></div>
      <label><span>Lớp</span><select value={classId} onChange={(event) => { setClassId(event.target.value, 'push'); setStudentId('ALL'); setPage(1); }}>
        {(classes.data || []).map((item) => <option value={item.id} key={item.id}>{item.code} · {item.studentCount} học sinh{item.homeroomTeacherId === user?.id ? ' · Lớp chủ nhiệm' : ''}</option>)}
      </select></label>
      <div className="student-support-permission"><ShieldCheck size={17} /><span>{homeroom
        ? 'Bạn được xem toàn bộ lịch sử lớp và phối hợp với phụ huynh.'
        : 'Bạn chỉ xem, cập nhật ghi nhận học tập do mình tạo.'}</span></div>
    </section>

    <div className="student-support-kpis">
      <SupportKpi icon={<History size={19} />} label="Tổng ghi nhận" value={summary.TOTAL || 0} tone="blue" />
      <SupportKpi icon={<CircleDot size={19} />} label="Đang theo dõi" value={summary.OPEN || 0} tone="amber" />
      <SupportKpi icon={<AlertTriangle size={19} />} label="Ưu tiên xử lý" value={summary.HIGH || 0} tone="red" />
      <SupportKpi icon={<MessageCircleMore size={19} />} label="Đã phối hợp gia đình" value={summary.FAMILY_CONTACTED || 0} tone="green" />
    </div>

    <section className="student-support-workspace">
      <header><div><strong>2. Lịch sử hỗ trợ</strong><span>Các ghi nhận mới nhất hiển thị trước</span></div>
        <button className="live-btn primary" onClick={openCreate} disabled={!classId || !students.data?.length}><Plus size={16} /> Thêm ghi nhận</button></header>
      <div className="student-support-filters">
        <label className="student-support-search"><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tìm nội dung, biện pháp hỗ trợ..." /></label>
        <select value={studentId} onChange={(event) => { setStudentId(event.target.value, 'push'); setPage(1); }}><option value="ALL">Tất cả học sinh</option>{(students.data || []).map((item) => <option key={item.id} value={item.id}>{item.fullName} · {item.studentCode || 'Chưa có mã'}</option>)}</select>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">Tất cả trạng thái</option>{STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(1); }}><option value="ALL">Tất cả mức độ</option>{SEVERITY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button className="live-btn subtle" onClick={resetFilters}><RefreshCw size={15} /> Xóa lọc</button>
      </div>

      <Async state={records} allowEmpty>{(data) => data.items.length ? <>
        <div className="student-support-list">{data.items.map((item) => <InterventionCard key={item.id} item={item}
          onEdit={() => openEdit(item)} onContact={() => { setContacting(item); setMessage(''); }} />)}</div>
        <ServerPagination data={data} itemLabel="ghi nhận" pageSizes={[5, 10, 20]}
          onPageChange={(next) => setPage(next + 1, 'push')}
          onPageSizeChange={(next) => { setPageSize(next); setPage(1); }} />
      </> : <div className="student-support-empty"><HeartHandshake size={30} /><strong>Chưa có ghi nhận hỗ trợ</strong><span>Khi phát hiện học sinh cần đồng hành, hãy tạo ghi nhận đầu tiên để cả quá trình không bị bỏ sót.</span></div>}</Async>
    </section>

    {editing !== undefined && <Modal title={editing ? `Cập nhật · ${editing.studentName}` : 'Thêm ghi nhận hỗ trợ'} onClose={() => setEditing(undefined)} size="wide" footer={<>
      <button className="live-btn subtle" onClick={() => setEditing(undefined)}>Hủy</button>
      <button className="live-btn primary" onClick={save} disabled={saving}>{editing ? 'Lưu thay đổi' : 'Tạo ghi nhận'}</button>
    </>}><div className="student-support-form">
      <Field label="Học sinh"><select value={form.studentId} disabled={Boolean(editing)} onChange={(event) => setForm({ ...form, studentId: event.target.value })}>{(students.data || []).map((item) => <option value={item.id} key={item.id}>{item.fullName} · {item.studentCode || 'Chưa có mã'}</option>)}</select></Field>
      <Field label="Nhóm hỗ trợ"><select value={form.category} disabled={!homeroom} onChange={(event) => setForm({ ...form, category: event.target.value })}>{CATEGORY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
      <Field label="Mức độ"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>{SEVERITY_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
      <Field label="Trạng thái"><select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>{STATUS_OPTIONS.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></Field>
      <Field label="Tiêu đề"><input value={form.title} maxLength={300} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Ví dụ: Điểm kiểm tra giảm trong ba tuần" /></Field>
      <Field label="Hẹn theo dõi lại"><input type="date" value={form.followUpDate} onChange={(event) => setForm({ ...form, followUpDate: event.target.value })} /></Field>
      <Field label="Diễn biến / căn cứ"><textarea value={form.description} maxLength={3000} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Ghi dữ kiện cụ thể, tránh nhận xét cảm tính..." /></Field>
      <Field label="Biện pháp đã thực hiện"><textarea value={form.actionTaken} maxLength={3000} onChange={(event) => setForm({ ...form, actionTaken: event.target.value })} placeholder="Trao đổi riêng, giao bài bổ trợ, hẹn kiểm tra lại..." /></Field>
      {!homeroom && <p className="student-support-form-note"><ShieldCheck size={15} /> Giáo viên bộ môn ghi nhận hỗ trợ học tập. GVCN sẽ tổng hợp các vấn đề chuyên cần, hành vi và phối hợp gia đình.</p>}
    </div></Modal>}

    {contacting && <Modal title={`Phối hợp gia đình · ${contacting.studentName}`} onClose={() => setContacting(null)} footer={<>
      <button className="live-btn subtle" onClick={() => setContacting(null)}>Hủy</button>
      <button className="live-btn primary" onClick={contactFamily} disabled={saving || !message.trim()}><MessageCircleMore size={16} /> Gửi thông báo</button>
    </>}><div className="student-support-contact"><p>Thông báo được gửi cho học sinh và các phụ huynh đã liên kết. Nội dung gửi được lưu theo mã ghi nhận để đối soát.</p>
      <Field label="Nội dung trao đổi"><textarea value={message} maxLength={2000} onChange={(event) => setMessage(event.target.value)} placeholder="Nêu tình hình, biện pháp đang áp dụng và đề nghị gia đình phối hợp..." /></Field>
    </div></Modal>}
  </div>;
}

function SupportKpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: number; tone: string }) {
  return <article className={`student-support-kpi ${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function InterventionCard({ item, onEdit, onContact }: { item: StudentIntervention; onEdit: () => void; onContact: () => void }) {
  const directContact = item.familyContactAllowed && item.parentContacts?.length
    ? item.parentContacts[0]
    : { id: item.studentId, fullName: item.studentName };
  return <article className={`student-intervention-card severity-${item.severity.toLowerCase()}`}>
    <div className="student-intervention-person"><span><UserRound size={19} /></span><div><strong>{item.studentName}</strong><small>{item.studentCode || 'Chưa có mã'} · Lớp {item.classCode}</small></div></div>
    <div className="student-intervention-main"><div className="student-intervention-tags">
      <span>{labelOf(CATEGORY_OPTIONS, item.category)}</span><span>{labelOf(SEVERITY_OPTIONS, item.severity)}</span><StatusPill value={item.status} />
    </div><h3>{item.title}</h3><p>{item.description}</p>
      {item.actionTaken && <div className="student-intervention-action"><CheckCircle2 size={15} /><span><b>Đã thực hiện:</b> {item.actionTaken}</span></div>}
      <footer><span>Ghi bởi {item.teacherName || 'Giáo viên'} · {fmtDateTime(item.updatedAt)}</span>
        {item.followUpDate && <span>Hẹn theo dõi: {new Date(`${item.followUpDate}T00:00:00`).toLocaleDateString('vi-VN')}</span>}
        {item.parentContacted && <span className="family-contacted"><MessageCircleMore size={13} /> Đã trao đổi gia đình</span>}</footer>
    </div>
    <div className="student-intervention-actions">{item.editable && <button className="live-btn subtle" onClick={onEdit}><PencilLine size={15} /> Cập nhật</button>}
      {item.familyContactAllowed && <button className="live-btn primary" onClick={onContact}><MessageCircleMore size={15} /> Phối hợp gia đình</button>}
      <button className="live-btn subtle" onClick={() => { window.location.hash = `#/giao-vien/trao-doi?with=${encodeURIComponent(directContact.id)}&contactClass=${encodeURIComponent(item.classId)}`; }}>
        {item.familyContactAllowed && item.parentContacts?.length ? `Nhắn ${directContact.fullName}` : 'Nhắn học sinh'} <ChevronRight size={15} />
      </button>
    </div>
  </article>;
}

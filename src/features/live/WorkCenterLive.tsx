import { useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import {
  AlertTriangle, ArrowRight, CalendarClock, Check, CheckCircle2, CircleDot,
  Clock3, Download, Filter, ListChecks, Plus, RefreshCw,
  Paperclip, Search, Send, Sparkles, Upload, UserRound, X,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../api/auth';
import { useApi } from '../../api/useApi';
import type { PageResponse } from '../../api/types';
import { NOTIFICATION_INBOX_CHANGED } from '../../api/liveEvents';
import { updateHashQuery, useHashNumber, useHashString } from '../../api/urlState';
import { fmtDate, fmtDateTime, useToast } from './common';

type Task = {
  id: string; title: string; description?: string; module: string; priority: string;
  status: string; effectiveStatus: string; assignedRole: string; assignedTo?: string;
  assignedToName?: string; dueDate?: string; progressPercent: number; slaLevel: string;
  autoManaged: boolean; creatorName?: string; createdBy: string; updatedAt: string;
  snoozedUntil?: string; overdue: boolean;
};
type ChecklistItem = { id: string; title: string; completed: boolean };
type Comment = { id: string; authorName?: string; body: string; createdAt: string };
type HistoryItem = { id: string; actorName?: string; action: string; fromStatus?: string; toStatus?: string; detail?: string; createdAt: string };
type Attachment = { id: string; fileName: string; fileUrl: string; contentType?: string; fileSize?: number; uploadedAt: string };
type StoredFile = { id: string; originalName: string; contentType?: string; sizeBytes: number };
type Detail = {
  task: Task; resolution?: string; rejectionReason?: string; delayReason?: string;
  checklist: ChecklistItem[]; comments: Comment[]; attachments: Attachment[]; history: HistoryItem[];
};
type Stats = {
  total: number; newCount: number; inProgress: number; waitingConfirmation: number;
  completed: number; overdue: number; rejected: number; completedOnTime: number; onTimeRate: number;
};
type Assignee = { id: string; fullName: string; role: string; subtitle?: string };

const STATUS_LABEL: Record<string, string> = {
  NEW: 'Mới giao', ACCEPTED: 'Đã tiếp nhận', IN_PROGRESS: 'Đang thực hiện',
  WAITING_CONFIRMATION: 'Chờ xác nhận', COMPLETED: 'Hoàn thành', REJECTED: 'Từ chối',
  CANCELLED: 'Đã hủy', OVERDUE: 'Quá hạn',
};
const PRIORITY_LABEL: Record<string, string> = { LOW: 'Thấp', NORMAL: 'Bình thường', HIGH: 'Cao', URGENT: 'Khẩn cấp' };
const MODULE_LABEL: Record<string, string> = {
  ACADEMIC: 'Học vụ', TIMETABLE: 'Thời khóa biểu', EXAM: 'Khảo thí', FINANCE: 'Tài chính',
  TEACHING: 'Giảng dạy', OPERATIONS: 'Vận hành', ADMIN: 'Quản trị',
};
const ROLE_LABEL: Record<string, string> = { ADMIN: 'Quản trị viên', ACADEMIC_STAFF: 'Giáo vụ', ACCOUNTANT: 'Kế toán', TEACHER: 'Giáo viên' };

const emptyForm = {
  title: '', description: '', module: 'OPERATIONS', priority: 'NORMAL', assignedRole: 'ACADEMIC_STAFF',
  assignedTo: '', dueDate: '', checklistText: '',
};

function createFormForRole(role: string) {
  if (role === 'ACCOUNTANT') return { ...emptyForm, module: 'FINANCE', assignedRole: 'ACCOUNTANT' };
  if (role === 'ACADEMIC_STAFF') return { ...emptyForm, module: 'ACADEMIC', assignedRole: 'ACADEMIC_STAFF' };
  return { ...emptyForm };
}

export function WorkCenterLive() {
  const { user } = useAuth();
  const toast = useToast();
  const [query, setQuery] = useHashString('q', '');
  const [status, setStatus] = useHashString('status', 'ALL');
  const [priority, setPriority] = useHashString('priority', 'ALL');
  const [module, setModule] = useHashString('module', 'ALL');
  const [page, setPage] = useHashNumber('page', 1);
  const [size, setSize] = useHashNumber('size', 20);
  const [selectedId, setSelectedId] = useHashString('task', '');
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const params = useMemo(() => {
    const value = new URLSearchParams({ page: String(page - 1), size: String(size) });
    if (query.trim()) value.set('q', query.trim());
    if (status !== 'ALL') value.set('status', status);
    if (priority !== 'ALL') value.set('priority', priority);
    if (module !== 'ALL') value.set('module', module);
    return value.toString();
  }, [module, page, priority, query, size, status]);
  const tasks = useApi<PageResponse<Task>>(`/work-center/tasks?${params}`);
  const stats = useApi<Stats>('/work-center/stats');
  const detail = useApi<Detail>(selectedId ? `/work-center/tasks/${selectedId}` : null);
  const assignees = useApi<Assignee[]>(createOpen ? `/work-center/assignees?role=${form.assignedRole}` : null);
  const reloadTasks = tasks.reload;
  const reloadStats = stats.reload;
  const reloadDetail = detail.reload;

  useEffect(() => {
    const refresh = () => { void reloadTasks(); void reloadStats(); if (selectedId) void reloadDetail(); };
    window.addEventListener(NOTIFICATION_INBOX_CHANGED, refresh);
    return () => window.removeEventListener(NOTIFICATION_INBOX_CHANGED, refresh);
  }, [reloadDetail, reloadStats, reloadTasks, selectedId]);

  const refresh = async () => { await Promise.all([tasks.reload(), stats.reload(), detail.reload()]); };
  const resetFilters = () => {
    setQuery(''); setStatus('ALL'); setPriority('ALL'); setModule('ALL'); setPage(1);
    updateHashQuery({ q: null, status: null, priority: null, module: null, page: null });
  };
  const openTask = (id: string) => setSelectedId(id, 'push');
  const closeTask = () => setSelectedId('', 'push');

  const createTask = async () => {
    if (!form.title.trim() || !form.dueDate) return toast.show('err', 'Vui lòng nhập tiêu đề và hạn hoàn thành');
    setSaving(true);
    try {
      const created = await api.post<Detail>('/work-center/tasks', {
        title: form.title, description: form.description || null, module: form.module, priority: form.priority,
        assignedRole: form.assignedRole, assignedTo: form.assignedTo || null, dueDate: form.dueDate,
        checklist: form.checklistText.split('\n').map((item) => item.trim()).filter(Boolean),
      });
      toast.show('ok', 'Đã tạo và giao công việc'); setCreateOpen(false); setForm(emptyForm);
      await refresh(); openTask(created.task.id);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setSaving(false); }
  };

  const downloadCsv = async () => {
    try {
      const filters = new URLSearchParams(); if (status !== 'ALL') filters.set('status', status); if (module !== 'ALL') filters.set('module', module);
      const result = await api.download(`/work-center/export?${filters}`);
      const url = URL.createObjectURL(result.blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.filename || 'trung-tam-cong-viec.csv'; anchor.click(); URL.revokeObjectURL(url);
      toast.show('ok', 'Đã xuất danh sách công việc');
    } catch (error: any) { toast.show('err', error.message); }
  };

  const role = user?.role || 'ADMIN';
  const canCreate = ['ADMIN', 'ACADEMIC_STAFF', 'ACCOUNTANT'].includes(role);
  const summary = tasks.data?.summary ?? {};
  const openCreate = () => {
    setForm(createFormForRole(role));
    setCreateOpen(true);
  };

  return <div className="work-center">
    {toast.node}
    <section className="work-center-hero">
      <div className="work-center-hero__icon"><ListChecks size={28} /></div>
      <div><span>ĐIỀU PHỐI CÔNG VIỆC</span><h2>Rõ người phụ trách, rõ thời hạn, rõ kết quả</h2><p>Tập trung công việc thủ công và nhiệm vụ hệ thống tự tạo trong một luồng thống nhất.</p></div>
      <div className="work-center-hero__actions">
        <button type="button" className="secondary" onClick={() => void refresh()}><RefreshCw size={17} /> Làm mới</button>
        {canCreate && <button type="button" className="primary" onClick={openCreate}><Plus size={18} /> Giao công việc</button>}
      </div>
    </section>

    <section className="work-center-kpis" aria-label="Chỉ số công việc">
      <Kpi icon={<ListChecks />} label="Tổng công việc" value={stats.data?.total ?? summary.all ?? 0} tone="blue" />
      <Kpi icon={<CircleDot />} label="Đang thực hiện" value={stats.data?.inProgress ?? summary.inProgress ?? 0} tone="teal" />
      <Kpi icon={<Clock3 />} label="Chờ xác nhận" value={stats.data?.waitingConfirmation ?? summary.waitingConfirmation ?? 0} tone="orange" />
      <Kpi icon={<AlertTriangle />} label="Đã quá hạn" value={stats.data?.overdue ?? summary.overdue ?? 0} tone="red" />
      <Kpi icon={<CheckCircle2 />} label="Đúng hạn" value={`${stats.data?.onTimeRate ?? 0}%`} tone="green" />
    </section>

    <section className="work-center-panel">
      <header className="work-center-panel__header">
        <div><span><Filter size={16} /> BỘ LỌC CÔNG VIỆC</span><h3>Danh sách cần theo dõi</h3><p>{tasks.data?.totalElements ?? 0} kết quả phù hợp với phạm vi quyền của bạn.</p></div>
        <button type="button" className="secondary" onClick={() => void downloadCsv()}><Download size={16} /> Xuất Excel</button>
      </header>
      <div className="work-center-filters">
        <label className="work-center-search"><span>Tìm kiếm</span><div><Search size={17} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Tên việc, người phụ trách, mã nguồn…" /></div></label>
        <FilterSelect label="Trạng thái" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[['ALL', 'Tất cả trạng thái'], ...Object.entries(STATUS_LABEL)]} />
        <FilterSelect label="Ưu tiên" value={priority} onChange={(value) => { setPriority(value); setPage(1); }} options={[['ALL', 'Tất cả mức độ'], ...Object.entries(PRIORITY_LABEL)]} />
        <FilterSelect label="Nhóm nghiệp vụ" value={module} onChange={(value) => { setModule(value); setPage(1); }} options={[['ALL', 'Tất cả nhóm'], ...Object.entries(MODULE_LABEL)]} />
        <button type="button" className="work-center-clear" onClick={resetFilters}><X size={15} /> Xóa bộ lọc</button>
      </div>

      {tasks.loading ? <TaskSkeleton /> : tasks.error ? <StatePanel tone="error" title="Chưa thể tải công việc" detail={tasks.error} action={() => void tasks.reload()} />
        : !tasks.data?.items.length ? <StatePanel title="Không có công việc phù hợp" detail="Hãy thay đổi bộ lọc hoặc tạo công việc mới để bắt đầu." />
          : <div className="work-center-list">
            {tasks.data.items.map((task) => <TaskRow key={task.id} task={task} onClick={() => openTask(task.id)} />)}
          </div>}
      {!!tasks.data?.totalElements && <footer className="work-center-pagination">
        <span>Trang <strong>{page}</strong> / {Math.max(1, tasks.data.totalPages)} · {tasks.data.totalElements} công việc</span>
        <label>Số dòng <select value={size} onChange={(event) => { setSize(Number(event.target.value)); setPage(1); }}>{[10, 20, 50].map((item) => <option key={item}>{item}</option>)}</select></label>
        <button type="button" disabled={tasks.data.first} onClick={() => setPage((value) => value - 1, 'push')}>Trước</button>
        <button type="button" disabled={tasks.data.last} onClick={() => setPage((value) => value + 1, 'push')}>Sau</button>
      </footer>}
    </section>

    {selectedId && <TaskDrawer state={detail} onClose={closeTask} onChanged={refresh} toast={toast} />}
    {createOpen && <TaskModal form={form} setForm={setForm} assignees={assignees.data ?? []} role={role} saving={saving} onClose={() => setCreateOpen(false)} onSubmit={() => void createTask()} />}
  </div>;
}

function Kpi({ icon, label, value, tone }: { icon: ReactNode; label: string; value: string | number; tone: string }) {
  return <article className={`work-kpi tone-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong></div></article>;
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>;
}

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  return <button type="button" className={`work-task-row priority-${task.priority.toLowerCase()}`} onClick={onClick}>
    <span className="work-task-row__priority"><i /><small>{PRIORITY_LABEL[task.priority] || task.priority}</small></span>
    <span className="work-task-row__main"><span>{task.autoManaged && <em><Sparkles size={13} /> Tự động</em>}<b>{MODULE_LABEL[task.module] || task.module}</b></span><strong>{task.title}</strong><small>{task.description || 'Không có mô tả bổ sung'}</small></span>
    <span className="work-task-row__owner"><UserRound size={16} /><span><small>Phụ trách</small><b>{task.assignedToName || ROLE_LABEL[task.assignedRole] || task.assignedRole}</b></span></span>
    <span className="work-task-row__due"><CalendarClock size={16} /><span><small>Hạn hoàn thành</small><b>{fmtDate(task.dueDate)}</b></span></span>
    <span className="work-task-row__progress"><span><small>Tiến độ</small><b>{task.progressPercent}%</b></span><i><u style={{ width: `${task.progressPercent}%` }} /></i></span>
    <span className={`work-status status-${task.effectiveStatus.toLowerCase()}`}>{task.overdue && <AlertTriangle size={14} />}{STATUS_LABEL[task.effectiveStatus] || task.effectiveStatus}</span>
    <ArrowRight className="work-task-row__arrow" size={18} />
  </button>;
}

function TaskDrawer({ state, onClose, onChanged, toast }: { state: ReturnType<typeof useApi<Detail>>; onClose: () => void; onChanged: () => Promise<void>; toast: ReturnType<typeof useToast> }) {
  const { user } = useAuth();
  const task = state.data?.task;
  const [note, setNote] = useState('');
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const next = task ? nextActions(task.status).filter((status) => status !== 'COMPLETED'
    || user?.role === 'ADMIN'
    || user?.id === task.createdBy
    || task.autoManaged && user?.role === task.assignedRole && user?.role !== 'TEACHER') : [];
  const act = async (status: string) => {
    if (['REJECTED', 'CANCELLED'].includes(status) && !note.trim()) return toast.show('err', 'Vui lòng nhập lý do trước khi xác nhận');
    setBusy(true); try { await api.post(`/work-center/tasks/${task?.id}/transitions`, { status, note: note || null }); setNote(''); toast.show('ok', `Đã chuyển sang “${STATUS_LABEL[status]}”`); await onChanged(); }
    catch (error: any) { toast.show('err', error.message); } finally { setBusy(false); }
  };
  const toggle = async (item: ChecklistItem) => { try { await api.patch(`/work-center/tasks/${task?.id}/checklist/${item.id}`, { completed: !item.completed }); await onChanged(); } catch (error: any) { toast.show('err', error.message); } };
  const sendComment = async () => { if (!comment.trim()) return; try { await api.post(`/work-center/tasks/${task?.id}/comments`, { body: comment }); setComment(''); await onChanged(); } catch (error: any) { toast.show('err', error.message); } };
  const uploadAttachment = async (file?: File) => {
    if (!file || !task) return;
    setUploading(true);
    try {
      const stored = await api.upload<StoredFile>('/files', file);
      await api.post(`/work-center/tasks/${task.id}/attachments`, {
        fileName: stored.originalName,
        fileUrl: stored.id,
        contentType: stored.contentType || file.type || null,
        fileSize: stored.sizeBytes,
      });
      toast.show('ok', 'Đã đính kèm tệp');
      await onChanged();
    } catch (error: any) { toast.show('err', error.message); }
    finally { setUploading(false); }
  };
  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const result = await api.download(`/files/${attachment.fileUrl}/content`);
      const url = URL.createObjectURL(result.blob); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.filename || attachment.fileName; anchor.click(); URL.revokeObjectURL(url);
    } catch (error: any) { toast.show('err', error.message); }
  };
  return <div className="work-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="work-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết công việc">
      <header><div><small>CHI TIẾT CÔNG VIỆC</small><h3>{task?.title || 'Đang tải…'}</h3></div><button type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
      {state.loading ? <TaskSkeleton /> : state.error ? <StatePanel tone="error" title="Không tải được chi tiết" detail={state.error} action={() => void state.reload()} /> : task && state.data && <div className="work-drawer__body">
        <div className="work-detail-meta"><span><small>Trạng thái</small><b className={`work-status status-${task.effectiveStatus.toLowerCase()}`}>{STATUS_LABEL[task.effectiveStatus]}</b></span><span><small>Người phụ trách</small><b>{task.assignedToName || ROLE_LABEL[task.assignedRole]}</b></span><span><small>Hạn</small><b>{fmtDate(task.dueDate)}</b></span><span><small>Tiến độ</small><b>{task.progressPercent}%</b></span></div>
        <section><h4>Mô tả</h4><p>{task.description || 'Chưa có mô tả.'}</p></section>
        {!!state.data.checklist.length && <section><h4>Danh sách kiểm tra <span>{state.data.checklist.filter((item) => item.completed).length}/{state.data.checklist.length}</span></h4><div className="work-checklist">{state.data.checklist.map((item) => <button type="button" key={item.id} className={item.completed ? 'done' : ''} onClick={() => void toggle(item)}><i>{item.completed && <Check size={14} />}</i><span>{item.title}</span></button>)}</div></section>}
        <section><h4>Tệp đính kèm <span>{state.data.attachments.length}</span></h4><div className="work-attachments">{state.data.attachments.map((item) => <button type="button" key={item.id} onClick={() => void downloadAttachment(item)}><Paperclip size={16} /><span><b>{item.fileName}</b><small>{formatBytes(item.fileSize)} · {fmtDateTime(item.uploadedAt)}</small></span><Download size={16} /></button>)}</div><label className={`work-upload ${uploading ? 'is-busy' : ''}`}><Upload size={16} /><span>{uploading ? 'Đang tải tệp…' : 'Thêm tệp đính kèm'}</span><input type="file" disabled={uploading} onChange={(event) => { void uploadAttachment(event.target.files?.[0]); event.currentTarget.value = ''; }} /></label></section>
        {!!next.length && <section className="work-actions"><h4>Cập nhật xử lý</h4><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Kết quả, lý do từ chối hoặc nội dung cần bổ sung…" /><div>{next.map((status) => <button disabled={busy} type="button" key={status} className={`action-${status.toLowerCase()}`} onClick={() => void act(status)}>{STATUS_LABEL[status]}</button>)}</div></section>}
        <section><h4>Trao đổi <span>{state.data.comments.length}</span></h4><div className="work-comments">{state.data.comments.length ? state.data.comments.map((item) => <article key={item.id}><span><b>{item.authorName || 'Người dùng'}</b><time>{fmtDateTime(item.createdAt)}</time></span><p>{item.body}</p></article>) : <p className="muted">Chưa có trao đổi.</p>}</div><div className="work-comment-input"><input value={comment} onChange={(event) => setComment(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void sendComment(); }} placeholder="Nhập trao đổi…" /><button type="button" onClick={() => void sendComment()} aria-label="Gửi trao đổi"><Send size={17} /></button></div></section>
        <section><h4>Lịch sử xử lý</h4><div className="work-history">{state.data.history.map((item) => <article key={item.id}><i /><div><span><b>{item.actorName || 'Hệ thống'}</b><time>{fmtDateTime(item.createdAt)}</time></span><p>{item.detail || `${item.fromStatus || ''} → ${item.toStatus || ''}`}</p></div></article>)}</div></section>
      </div>}
    </aside>
  </div>;
}

function TaskModal({ form, setForm, assignees, role, saving, onClose, onSubmit }: { form: typeof emptyForm; setForm: Dispatch<SetStateAction<typeof emptyForm>>; assignees: Assignee[]; role: string; saving: boolean; onClose: () => void; onSubmit: () => void }) {
  const allowedRoles = role === 'ADMIN' ? ['ACADEMIC_STAFF', 'ACCOUNTANT', 'TEACHER', 'ADMIN'] : role === 'ACADEMIC_STAFF' ? ['ACADEMIC_STAFF', 'TEACHER'] : ['ACCOUNTANT'];
  return <div className="work-modal-backdrop" role="presentation"><div className="work-modal" role="dialog" aria-modal="true" aria-labelledby="create-task-title">
    <header><div><small>GIAO VIỆC CÓ KIỂM SOÁT</small><h3 id="create-task-title">Tạo công việc mới</h3><p>Người nhận sẽ được thông báo ngay sau khi lưu.</p></div><button type="button" onClick={onClose} aria-label="Đóng"><X /></button></header>
    <div className="work-modal__form">
      <label className="wide"><span>Tiêu đề công việc *</span><input autoFocus value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))} placeholder="Ví dụ: Hoàn tất phân lớp học sinh khối 10" /></label>
      <label className="wide"><span>Mô tả kết quả cần đạt</span><textarea value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} placeholder="Nêu rõ phạm vi, kết quả bàn giao và lưu ý…" /></label>
      <label><span>Nhóm nghiệp vụ</span><select value={form.module} onChange={(event) => setForm((old) => ({ ...old, module: event.target.value }))}>{Object.entries(MODULE_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label><span>Mức ưu tiên</span><select value={form.priority} onChange={(event) => setForm((old) => ({ ...old, priority: event.target.value }))}>{Object.entries(PRIORITY_LABEL).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label><span>Bộ phận phụ trách</span><select value={form.assignedRole} onChange={(event) => setForm((old) => ({ ...old, assignedRole: event.target.value, assignedTo: '' }))}>{allowedRoles.map((id) => <option key={id} value={id}>{ROLE_LABEL[id]}</option>)}</select></label>
      <label><span>Người phụ trách cụ thể</span><select value={form.assignedTo} onChange={(event) => setForm((old) => ({ ...old, assignedTo: event.target.value }))}><option value="">Giao cho bộ phận</option>{assignees.map((item) => <option key={item.id} value={item.id}>{item.fullName}{item.subtitle ? ` · ${item.subtitle}` : ''}</option>)}</select></label>
      <label><span>Hạn hoàn thành *</span><input type="date" value={form.dueDate} onChange={(event) => setForm((old) => ({ ...old, dueDate: event.target.value }))} /></label>
      <label className="wide"><span>Checklist (mỗi dòng một việc)</span><textarea value={form.checklistText} onChange={(event) => setForm((old) => ({ ...old, checklistText: event.target.value }))} placeholder={'Kiểm tra dữ liệu nguồn\nĐối chiếu cảnh báo\nXác nhận kết quả'} /></label>
    </div>
    <footer><button type="button" className="secondary" onClick={onClose}>Hủy</button><button type="button" className="primary" disabled={saving} onClick={onSubmit}>{saving ? 'Đang lưu…' : <><Send size={17} /> Giao công việc</>}</button></footer>
  </div></div>;
}

function TaskSkeleton() { return <div className="work-skeleton" aria-label="Đang tải"><i /><i /><i /><i /></div>; }
function StatePanel({ title, detail, tone = 'empty', action }: { title: string; detail: string; tone?: string; action?: () => void }) { return <div className={`work-state tone-${tone}`}><span>{tone === 'error' ? <AlertTriangle /> : <ListChecks />}</span><div><strong>{title}</strong><p>{detail}</p></div>{action && <button type="button" onClick={action}>Thử lại</button>}</div>; }
function nextActions(status: string) {
  return ({ NEW: ['ACCEPTED', 'REJECTED'], ACCEPTED: ['IN_PROGRESS', 'REJECTED'], IN_PROGRESS: ['WAITING_CONFIRMATION'], WAITING_CONFIRMATION: ['COMPLETED', 'IN_PROGRESS', 'REJECTED'], OVERDUE: ['IN_PROGRESS', 'WAITING_CONFIRMATION', 'COMPLETED'] } as Record<string, string[]>)[status] ?? [];
}

function formatBytes(value?: number) {
  if (!value) return '0 KB';
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

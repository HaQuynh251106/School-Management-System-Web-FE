import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, Database, HardDrive, Mail, RefreshCcw, Server, Wifi } from 'lucide-react';
import { api } from '../../api/client';
import { useApi } from '../../api/useApi';
import { Section, StatusPill } from '../../components/ui';
import { Async, useToast } from './common';
import { Modal } from './Modal';

type ComponentStatus = { key: string; label: string; status: string; detail: string; checkedAt: string };
type JobState = { key: string; label: string; status: string; lastStartedAt?: string; lastCompletedAt?: string; lastSucceededAt?: string; lastFailure?: string; executionCount: number };
type ActionItem = { key: string; severity: string; title: string; detail: string; value: number; pageCode: string };
type OperationsSnapshot = {
  generatedAt: string;
  components: ComponentStatus[];
  scheduledJobs: JobState[];
  deliveries: { pending: number; retrying: number; failed: number; deliveredToday: number; latestFailureAt?: string };
  imports: { completedRuns: number; latestCompletedAt?: string; latestDetail?: string };
  backup: { status: string; latestFile?: string; latestBackupAt?: string; latestSizeBytes: number; detail: string };
  storage: { usableBytes: number; totalBytes: number; uploadBytes: number };
  actionItems: ActionItem[];
};
type DeliveryLog = { id: string; recipientId: string; channel: string; status: string; attempts: number; detail?: string; createdAt: string; updatedAt?: string };

const iconFor = (key: string) => key === 'postgresql' ? Database : key === 'smtp' ? Mail
  : key === 'sse' ? Wifi : key === 'backup' ? HardDrive : Server;
const bytes = (value: number) => value ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / 1024 / 1024) + ' MB' : '0 MB';
const time = (value?: string) => value ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Chưa có';

export function AdminOperationsLive() {
  const snapshot = useApi<OperationsSnapshot>('/admin/operations/overview');
  const deliveries = useApi<DeliveryLog[]>('/notification-delivery-logs');
  const toast = useToast();
  const [retrying, setRetrying] = useState<DeliveryLog | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(snapshot.reload, 60_000);
    return () => window.clearInterval(timer);
  }, [snapshot.reload]);

  const failedDeliveries = useMemo(() => (deliveries.data ?? []).filter((item) => ['FAILED', 'SKIPPED'].includes(item.status)), [deliveries.data]);
  const retry = async () => {
    if (!retrying || reason.trim().length < 10) return;
    setBusy(true);
    try {
      await api.post(`/notification-delivery-logs/${retrying.id}/retry`, { reason: reason.trim() });
      toast.show('ok', 'Đã đưa lần gửi vào hàng đợi thử lại và ghi nhật ký kiểm toán.');
      setRetrying(null); setReason('');
      await Promise.all([snapshot.reload(), deliveries.reload()]);
    } catch (error: any) { toast.show('err', error.message); }
    finally { setBusy(false); }
  };

  return <div className="admin-operations-page">
    {toast.node}
    {retrying && <Modal title="Thử gửi lại thông báo" onClose={() => !busy && setRetrying(null)} footer={<><button className="live-btn ghost" type="button" disabled={busy} onClick={() => setRetrying(null)}>Hủy</button><button className="live-btn" type="button" disabled={busy || reason.trim().length < 10} onClick={retry}><RefreshCcw size={15} /> {busy ? 'Đang đưa vào hàng đợi…' : 'Xác nhận thử lại'}</button></>}>
      <div className="ops-retry-context"><strong>{retrying.channel} · {retrying.recipientId}</strong><span>Lần gửi đã thử {retrying.attempts} lần. Hành động mới sẽ được lưu vào lịch sử hệ thống.</span></div>
      <label className="modal-field"><span>Lý do thử lại</span><textarea className="live-input" autoFocus value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập ít nhất 10 ký tự để phục vụ kiểm toán" /></label>
    </Modal>}
    <Section title="Trung tâm vận hành" subtitle="Một nơi duy nhất để theo dõi sức khỏe hệ thống, sao lưu và tác vụ tự động" wide>
      <Async state={snapshot}>{(data) => <>
        <div className="ops-summary-bar"><span><Clock3 size={16} /> Cập nhật {time(data.generatedAt)}</span><button className="live-btn ghost" type="button" onClick={snapshot.reload}><RefreshCcw size={15} /> Làm mới</button></div>
        <div className="ops-component-grid">{data.components.map((item) => {
          const Icon = iconFor(item.key);
          return <article key={item.key} className={`ops-component-card status-${item.status.toLowerCase()}`}><span><Icon size={20} /></span><div><strong>{item.label}</strong><small>{item.detail}</small></div><StatusPill value={item.status} /></article>;
        })}</div>
        <div className="ops-kpi-grid">
          <article><small>Gửi thành công hôm nay</small><strong>{data.deliveries.deliveredToday}</strong><span>{data.deliveries.failed} lần gửi cần xử lý</span></article>
          <article><small>Import đã hoàn tất</small><strong>{data.imports.completedRuns}</strong><span>Lần gần nhất: {time(data.imports.latestCompletedAt)}</span></article>
          <article><small>Sao lưu gần nhất</small><strong>{time(data.backup.latestBackupAt)}</strong><span>{data.backup.latestFile || data.backup.detail}</span></article>
          <article><small>Dữ liệu tải lên</small><strong>{bytes(data.storage.uploadBytes)}</strong><span>Còn trống {bytes(data.storage.usableBytes)}</span></article>
        </div>
        <div className="ops-two-column">
          <article className="ops-panel"><header><div><strong>Việc Admin cần xử lý</strong><small>Chỉ hiển thị ngoại lệ vận hành, không chứa công việc học vụ hay tài chính</small></div></header>
            {data.actionItems.length ? <div className="ops-action-list">{data.actionItems.map((item) => <div key={item.key}><span className={item.severity === 'CRITICAL' ? 'critical' : 'warning'}>{item.severity === 'CRITICAL' ? <AlertTriangle size={17} /> : <Clock3 size={17} />}</span><div><strong>{item.title}</strong><small>{item.detail}</small></div><b>{item.value}</b></div>)}</div> : <div className="ops-empty"><CheckCircle2 size={24} /><strong>Không có ngoại lệ cần xử lý</strong><span>Hệ thống đang vận hành trong ngưỡng an toàn.</span></div>}
          </article>
          <article className="ops-panel"><header><div><strong>Tác vụ tự động</strong><small>Trạng thái thực tế của lần chạy gần nhất</small></div></header>
            <div className="ops-job-list">{data.scheduledJobs.length ? data.scheduledJobs.map((job) => <div key={job.key}><StatusPill value={job.status} /><span><strong>{job.label}</strong><small>{job.lastFailure || `Lần chạy gần nhất: ${time(job.lastCompletedAt)}`}</small></span><b>{job.executionCount} lần</b></div>) : <div className="ops-empty"><Clock3 size={22} /><span>Đang chờ lần chạy đầu tiên</span></div>}</div>
          </article>
        </div>
      </>}</Async>
    </Section>
    <Section title="Lần gửi cần kiểm tra" subtitle="Chỉ cho phép thử lại bản ghi có payload an toàn và bắt buộc nhập lý do" wide>
      <Async state={deliveries} allowEmpty empty="Không có lần gửi thất bại">{() => failedDeliveries.length ? <div className="live-table-scroll"><table className="live-table"><thead><tr><th>Kênh</th><th>Người nhận</th><th>Trạng thái</th><th>Số lần</th><th>Nguyên nhân</th><th>Thao tác</th></tr></thead><tbody>{failedDeliveries.map((item) => <tr key={item.id}><td>{item.channel}</td><td>{item.recipientId}</td><td><StatusPill value={item.status} /></td><td>{item.attempts}</td><td>{item.detail || 'Chưa có chi tiết'}</td><td><button className="live-btn small" type="button" onClick={() => setRetrying(item)}><RefreshCcw size={14} /> Thử lại</button></td></tr>)}</tbody></table></div> : <div className="ops-empty"><CheckCircle2 size={24} /><strong>Không có lần gửi thất bại</strong></div>}</Async>
    </Section>
  </div>;
}

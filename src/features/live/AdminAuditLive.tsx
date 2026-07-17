import { useState } from 'react';
import { useApi } from '../../api/useApi';
import { Section, Badge, viLabel } from '../../components/ui';
import { Async, fmtDateTime } from './common';
import { RefreshCw } from 'lucide-react';

interface AuditLog {
  id: string; actorName: string; role: string; action: string;
  module: string; entityType?: string; entityId?: string; detail?: string; createdAt: string;
}

const ACTION_TONE: Record<string, 'green' | 'blue' | 'orange' | 'red' | 'violet'> = {
  LOGIN: 'green', CREATE: 'blue', UPDATE: 'orange', DELETE: 'red', PAYMENT: 'violet', EXPORT: 'blue',
};

/** A6: Lưu vết hệ thống — /audit-logs (+stats). */
export function AdminAuditLive() {
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const params = [module && `module=${module}`, action && `action=${action}`].filter(Boolean).join('&');
  const logs = useApi<AuditLog[]>(`/audit-logs${params ? '?' + params : ''}`);
  const stats = useApi<{ byModule: Record<string, number>; byAction: Record<string, number>; total: number }>('/audit-logs/stats');

  return (
    <Section title="Lịch sử hệ thống" subtitle="Theo dõi các hoạt động quan trọng" wide>
      <div className="live-toolbar">
        <select className="live-select" value={module} onChange={(e) => setModule(e.target.value)}>
          <option value="">Mọi module</option>
          <option value="identity">identity</option><option value="academic">academic</option>
          <option value="finance">finance</option><option value="reports">reports</option>
        </select>
        <select className="live-select" value={action} onChange={(e) => setAction(e.target.value)}>
          <option value="">Mọi hành động</option>
          <option value="LOGIN">Đăng nhập</option><option value="CREATE">Tạo mới</option>
          <option value="UPDATE">Cập nhật</option><option value="PAYMENT">Thanh toán</option><option value="EXPORT">Xuất dữ liệu</option>
        </select>
        <span className="grow" />
        <button className="live-btn ghost" onClick={() => { logs.reload(); stats.reload(); }}><RefreshCw size={14} /> Tải lại</button>
      </div>
      {stats.data && (
        <div style={{ marginBottom: 12, color: 'var(--muted)', fontSize: 13 }}>
          Tổng <strong>{stats.data.total}</strong> sự kiện · theo module: {Object.entries(stats.data.byModule).map(([k, v]) => `${k}(${v})`).join(', ')}
        </div>
      )}
      <Async paginate state={logs} empty="Chưa có sự kiện" itemLabel="sự kiện">
        {(list) => (
          <table className="live-table">
            <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Module</th><th>Chi tiết</th></tr></thead>
            <tbody>{list.map((l) => (
              <tr key={l.id}>
                <td><small>{fmtDateTime(l.createdAt)}</small></td>
                <td><strong>{l.actorName}</strong> <small style={{ color: 'var(--muted)' }}>{viLabel(l.role)}</small></td>
                <td><Badge tone={ACTION_TONE[l.action] || 'blue'}>{viLabel(l.action)}</Badge></td>
                <td>{l.module === 'identity' ? 'Tài khoản' : l.module === 'academic' ? 'Học tập' : l.module === 'finance' ? 'Tài chính' : l.module === 'reports' ? 'Báo cáo' : l.module}</td>
                <td><small>{l.detail}</small></td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}

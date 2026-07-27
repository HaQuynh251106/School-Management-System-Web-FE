import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock3,
  FileClock,
  Filter,
  LogIn,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useApi } from '../../api/useApi';
import type { PageResponse } from '../../api/types';
import { Badge, viLabel } from '../../components/ui';
import { useHashNumber, useHashString } from '../../api/urlState';
import { Async, fmtDateTime, ServerPagination } from './common';

interface AuditLog {
  id: string;
  actorName: string;
  role: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
  createdAt: string;
}

interface AuditStats {
  byModule: Record<string, number>;
  byAction: Record<string, number>;
  total: number;
}

const ACTION_TONE: Record<string, 'green' | 'blue' | 'orange' | 'red' | 'violet'> = {
  LOGIN: 'green',
  LOGIN_FAILED: 'red',
  CREATE: 'blue',
  UPDATE: 'orange',
  DELETE: 'red',
  PAYMENT: 'violet',
  EXPORT: 'blue',
};

const MODULE_LABELS: Record<string, string> = {
  identity: 'Tài khoản',
  academic: 'Học vụ',
  attendance: 'Điểm danh',
  finance: 'Tài chính',
  notification: 'Thông báo',
  reports: 'Báo cáo',
  examination: 'Khảo thí',
  system: 'Hệ thống',
};

const ACTION_OPTIONS = [
  ['LOGIN', 'Đăng nhập'],
  ['LOGIN_FAILED', 'Đăng nhập thất bại'],
  ['CREATE', 'Tạo mới'],
  ['UPDATE', 'Cập nhật'],
  ['DELETE', 'Xóa dữ liệu'],
  ['PAYMENT', 'Thanh toán'],
  ['EXPORT', 'Xuất dữ liệu'],
] as const;

function moduleLabel(value?: string) {
  if (!value) return 'Khác';
  return MODULE_LABELS[value.toLowerCase()] ?? value;
}

function actionIcon(action: string) {
  if (action === 'LOGIN' || action === 'LOGIN_FAILED') return LogIn;
  if (action === 'DELETE') return AlertTriangle;
  if (action === 'CREATE') return Sparkles;
  return Activity;
}

export function AdminAuditLive() {
  const [module, setModule] = useHashString('module', '');
  const [action, setAction] = useHashString('action', '');
  const [query, setQuery] = useHashString('q', '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [pageNumber, setPageNumber] = useHashNumber('page', 1);
  const [pageSize, setPageSize] = useHashNumber('size', 20);
  const page = pageNumber - 1;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
      setPageNumber(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, setPageNumber]);

  const params = [
    module && `module=${encodeURIComponent(module)}`,
    action && `action=${encodeURIComponent(action)}`,
    debouncedQuery && `q=${encodeURIComponent(debouncedQuery)}`,
    `page=${page}`,
    `size=${pageSize}`,
  ].filter(Boolean).join('&');

  const logs = useApi<PageResponse<AuditLog>>(`/audit-logs/page?${params}`);
  const stats = useApi<AuditStats>('/audit-logs/stats');
  const failedLogins = stats.data?.byAction.LOGIN_FAILED ?? 0;
  const sensitiveActions = (stats.data?.byAction.DELETE ?? 0) + failedLogins;
  const activeFilters = Number(Boolean(module)) + Number(Boolean(action)) + Number(Boolean(query.trim()));

  const moduleOptions = useMemo(() => {
    const available = new Set(Object.keys(stats.data?.byModule ?? {}));
    Object.keys(MODULE_LABELS).forEach((key) => available.add(key));
    return [...available].filter((key) => key !== '-').sort((a, b) => moduleLabel(a).localeCompare(moduleLabel(b), 'vi'));
  }, [stats.data]);

  const clearFilters = () => {
    setModule('');
    setAction('');
    setQuery('');
    setPageNumber(1);
  };

  return (
    <div className="audit-portal">
      <section className="audit-hero">
        <div className="audit-hero-copy">
          <span><ShieldCheck size={15} /> Trung tâm giám sát quản trị</span>
          <h2>Lịch sử hệ thống</h2>
          <p>Theo dõi minh bạch mọi hoạt động quan trọng, nhanh chóng phát hiện thao tác bất thường và truy vết người thực hiện.</p>
        </div>
        <div className="audit-hero-status">
          <span className={sensitiveActions > 0 ? 'warning' : 'safe'}>
            {sensitiveActions > 0 ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
          </span>
          <div>
            <small>Trạng thái giám sát</small>
            <strong>{sensitiveActions > 0 ? `${sensitiveActions} sự kiện cần chú ý` : 'Hệ thống ổn định'}</strong>
            <p>Dữ liệu được sắp xếp mới nhất trước</p>
          </div>
        </div>
      </section>

      <section className="audit-kpi-grid" aria-label="Tổng quan lịch sử hệ thống">
        <article className="audit-kpi primary">
          <span><FileClock size={21} /></span>
          <div><small>Tổng sự kiện</small><strong>{stats.data?.total ?? '—'}</strong><p>Đã được lưu vết an toàn</p></div>
        </article>
        <article className="audit-kpi success">
          <span><LogIn size={21} /></span>
          <div><small>Đăng nhập thành công</small><strong>{stats.data?.byAction.LOGIN ?? 0}</strong><p>Phiên truy cập hợp lệ</p></div>
        </article>
        <article className={`audit-kpi ${failedLogins > 0 ? 'danger' : ''}`}>
          <span><AlertTriangle size={21} /></span>
          <div><small>Đăng nhập thất bại</small><strong>{failedLogins}</strong><p>{failedLogins > 0 ? 'Nên kiểm tra tài khoản liên quan' : 'Chưa phát hiện rủi ro'}</p></div>
        </article>
        <article className="audit-kpi">
          <span><BarChart3 size={21} /></span>
          <div><small>Kết quả đang xem</small><strong>{logs.data?.totalElements ?? '—'}</strong><p>{activeFilters ? `${activeFilters} bộ lọc đang áp dụng` : 'Toàn bộ hoạt động'}</p></div>
        </article>
      </section>

      <section className="audit-workspace">
        <header className="audit-workspace-head">
          <div>
            <span><Filter size={17} /></span>
            <div><strong>Bộ lọc lịch sử</strong><small>Thu hẹp kết quả theo người thực hiện, phân hệ hoặc hành động</small></div>
          </div>
          <button className="live-btn ghost" type="button" onClick={() => { logs.reload(); stats.reload(); }}>
            <RefreshCw size={15} /> Làm mới dữ liệu
          </button>
        </header>

        <div className="audit-filter-grid">
          <label className="audit-search">
            <span>Tìm kiếm</span>
            <div><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tên người dùng, nội dung hoặc mã dữ liệu..." /></div>
          </label>
          <label>
            <span>Phân hệ</span>
            <select className="live-select" value={module} onChange={(event) => { setModule(event.target.value); setPageNumber(1); }}>
              <option value="">Tất cả phân hệ</option>
              {moduleOptions.map((value) => <option key={value} value={value}>{moduleLabel(value)}</option>)}
            </select>
          </label>
          <label>
            <span>Hành động</span>
            <select className="live-select" value={action} onChange={(event) => { setAction(event.target.value); setPageNumber(1); }}>
              <option value="">Tất cả hành động</option>
              {ACTION_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <button className="audit-clear-btn" type="button" disabled={!activeFilters} onClick={clearFilters}>
            Xóa bộ lọc {activeFilters > 0 && `(${activeFilters})`}
          </button>
        </div>
      </section>

      {stats.data && Object.keys(stats.data.byModule).length > 0 && (
        <section className="audit-distribution">
          <header><Activity size={17} /><div><strong>Phân bố hoạt động</strong><small>Chọn nhanh phân hệ cần kiểm tra</small></div></header>
          <div>
            {Object.entries(stats.data.byModule)
              .sort(([, a], [, b]) => b - a)
              .map(([key, value]) => {
                const percentage = stats.data?.total ? Math.round((value / stats.data.total) * 100) : 0;
                return (
                  <button key={key} type="button" className={module === key ? 'active' : ''} onClick={() => { setModule(module === key ? '' : key); setPageNumber(1); }}>
                    <span><strong>{moduleLabel(key)}</strong><small>{value} sự kiện</small></span>
                    <i><b style={{ width: `${percentage}%` }} /></i>
                    <em>{percentage}%</em>
                  </button>
                );
              })}
          </div>
        </section>
      )}

      <section className="audit-list-panel">
        <header>
          <div><span><Clock3 size={18} /></span><div><h3>Dòng thời gian hoạt động</h3><p>{logs.data?.totalElements ?? 0} sự kiện phù hợp với bộ lọc hiện tại</p></div></div>
          {activeFilters > 0 && <Badge tone="blue">{activeFilters} bộ lọc</Badge>}
        </header>

        <Async state={{ ...logs, data: logs.data?.items ?? null }} empty="Chưa có sự kiện phù hợp" itemLabel="sự kiện">
          {(list) => (
            <div className="audit-table-wrap">
              <table className="live-table audit-table">
                <thead><tr><th>Thời gian</th><th>Người thực hiện</th><th>Hành động</th><th>Phân hệ</th><th>Nội dung thay đổi</th></tr></thead>
                <tbody>{list.map((log) => {
                  const ActionIcon = actionIcon(log.action);
                  return (
                    <tr key={log.id}>
                      <td data-label="Thời gian"><div className="audit-time"><Clock3 size={14} /><span>{fmtDateTime(log.createdAt)}</span></div></td>
                      <td data-label="Người thực hiện">
                        <div className="audit-actor"><span><UserRound size={16} /></span><div><strong>{log.actorName || 'Hệ thống'}</strong><small>{viLabel(log.role)}</small></div></div>
                      </td>
                      <td data-label="Hành động"><Badge tone={ACTION_TONE[log.action] || 'blue'}><ActionIcon size={12} /> {viLabel(log.action)}</Badge></td>
                      <td data-label="Phân hệ"><span className="audit-module">{moduleLabel(log.module)}</span></td>
                      <td data-label="Nội dung">
                        <div className="audit-detail"><strong>{log.detail || 'Không có mô tả bổ sung'}</strong>{(log.entityType || log.entityId) && <small>{[log.entityType, log.entityId].filter(Boolean).join(' · ')}</small>}</div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          )}
        </Async>

        {logs.data && (
          <ServerPagination
            data={logs.data}
            itemLabel="sự kiện"
            onPageChange={(nextPage) => setPageNumber(nextPage + 1, 'push')}
            onPageSizeChange={(value) => { setPageSize(value); setPageNumber(1); }}
          />
        )}
      </section>
    </div>
  );
}

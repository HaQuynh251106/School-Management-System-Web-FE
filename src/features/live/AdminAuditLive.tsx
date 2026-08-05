import { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useApi } from '../../api/useApi';
import { Section, Badge, viLabel } from '../../components/ui';
import { Async, fmtDateTime } from './common';

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

const MODULE_LABELS: Record<string, string> = {
  identity: 'Tài khoản và phân quyền',
  academic: 'Học tập và đào tạo',
  finance: 'Tài chính',
  reports: 'Báo cáo và thống kê',
  system: 'Vận hành hệ thống',
};

const ACTION_LABELS: Record<string, string> = {
  LOGIN: 'Đăng nhập thành công',
  LOGIN_FAILED: 'Đăng nhập thất bại',
  CREATE: 'Tạo mới dữ liệu',
  UPDATE: 'Cập nhật dữ liệu',
  DELETE: 'Xóa dữ liệu',
  SUBMIT: 'Gửi yêu cầu',
  APPROVE: 'Phê duyệt',
  REJECT: 'Từ chối',
  CANCEL: 'Hủy thao tác',
  NOTIFY: 'Gửi thông báo',
  FINALIZE: 'Chốt dữ liệu',
  EXPORT: 'Xuất báo cáo',
  PAYMENT: 'Ghi nhận thanh toán',
  RECONCILE: 'Đối soát giao dịch',
  SEED: 'Khởi tạo dữ liệu nền',
  PASSWORD_CHANGE: 'Đổi mật khẩu',
  PASSWORD_RESET_COMPLETED: 'Hoàn tất đặt lại mật khẩu',
  PASSWORD_RESET_BY_ADMIN: 'Quản trị viên đặt lại mật khẩu',
  USER_CREATE: 'Tạo tài khoản',
  USER_UPDATE: 'Cập nhật tài khoản',
  USER_STATUS_CHANGE: 'Thay đổi trạng thái tài khoản',
  USER_SOFT_DELETE: 'Xóa mềm tài khoản',
  USER_RESTORE: 'Khôi phục tài khoản',
  SESSION_REVOKE: 'Thu hồi một phiên đăng nhập',
  SESSION_REVOKE_ALL: 'Thu hồi tất cả phiên đăng nhập',
  DEVICE_REGISTER: 'Đăng ký thiết bị',
  DEVICE_DEACTIVATE: 'Ngừng tin cậy thiết bị',
  RBAC_UPDATE: 'Cập nhật phân quyền vai trò',
  REQUEST_REFUND: 'Yêu cầu hoàn tiền',
  APPROVE_REFUND: 'Phê duyệt hoàn tiền',
  REJECT_REFUND: 'Từ chối hoàn tiền',
  CANCEL_REFUND: 'Hủy yêu cầu hoàn tiền',
  REQUEST_REPAYMENT: 'Yêu cầu thanh toán lại',
  ISSUE_RECEIPT: 'Phát hành biên nhận',
  DOWNLOAD_RECEIPT: 'Tải biên nhận',
  REVIEW_RESULT: 'Xét kết quả năm học',
  CLOSE_ACADEMIC_YEAR: 'Chốt năm học',
  REOPEN_ACADEMIC_YEAR: 'Mở lại năm học',
  PUBLISH_YEAR_RESULTS: 'Công bố kết quả năm học',
  REPUBLISH_YEAR_RESULTS: 'Công bố lại kết quả năm học',
  WITHDRAW_YEAR_RESULTS: 'Thu hồi kết quả đã công bố',
  EXECUTE_YEAR_PROMOTION: 'Thực hiện lên lớp',
  UNDO_YEAR_PROMOTION: 'Hoàn tác lên lớp',
  EXPORT_YEAR_RESULT: 'Xuất kết quả năm học',
};

const ENTITY_LABELS: Record<string, string> = {
  user: 'Tài khoản',
  database: 'Cơ sở dữ liệu',
  academic_year: 'Năm học',
  assignment_submission: 'Bài nộp',
  fee_period: 'Đợt thu',
  fee_period_item: 'Khoản thu',
  finance_report: 'Báo cáo tài chính',
  invoice: 'Hóa đơn',
  invoice_batch: 'Đợt phát hành hóa đơn',
  payment: 'Giao dịch thanh toán',
  payment_proof: 'Minh chứng thanh toán',
  payment_receipt: 'Biên nhận',
  payment_reconciliation: 'Đối soát',
  payment_refund: 'Hoàn tiền',
  student_class_enrollment: 'Phân lớp học sinh',
  student_yearly_summary: 'Kết quả năm học',
  year_result_publication: 'Công bố kết quả',
  year_review: 'Xét kết quả năm học',
};

const ACTION_TONE: Record<string, 'green' | 'blue' | 'orange' | 'red' | 'violet'> = {
  LOGIN: 'green',
  LOGIN_FAILED: 'red',
  CREATE: 'blue',
  USER_CREATE: 'blue',
  UPDATE: 'orange',
  USER_UPDATE: 'orange',
  DELETE: 'red',
  USER_SOFT_DELETE: 'red',
  USER_RESTORE: 'green',
  PAYMENT: 'violet',
  EXPORT: 'blue',
  EXPORT_YEAR_RESULT: 'blue',
};

function moduleLabel(value: string) {
  return MODULE_LABELS[value.toLowerCase()] || 'Chức năng hệ thống';
}

function actionLabel(value: string) {
  const normalized = value.toUpperCase();
  if (ACTION_LABELS[normalized]) return ACTION_LABELS[normalized];
  if (normalized.includes('CREATE')) return 'Tạo mới dữ liệu';
  if (normalized.includes('UPDATE')) return 'Cập nhật dữ liệu';
  if (normalized.includes('DELETE')) return 'Xóa dữ liệu';
  if (normalized.includes('APPROVE')) return 'Phê duyệt';
  if (normalized.includes('REJECT')) return 'Từ chối';
  if (normalized.includes('EXPORT')) return 'Xuất dữ liệu';
  return 'Hoạt động hệ thống';
}

function detailLabel(detail?: string) {
  if (!detail) return 'Không có ghi chú bổ sung';
  return detail
    .replace(/^Dang nhap thanh cong/i, 'Đăng nhập thành công')
    .replace(/^Dang nhap that bai/i, 'Đăng nhập thất bại')
    .replace(/\bStatus=([A-Z_]+)\b/gi, (_, status) => `Trạng thái: ${viLabel(status)}`)
    .replace(/\breason=/gi, 'Lý do: ')
    .replace(/\bip=/gi, 'IP: ')
    .replace(/\bstatus=(\d{3})\b/gi, 'Mã phản hồi: $1')
    .replace(/\buser=/gi, 'Tài khoản: ')
    .replace(/\bInvoice=/gi, 'Hóa đơn: ')
    .replace(/\bPayment=/gi, 'Giao dịch: ')
    .replace(/^Revoked=(\d+)$/i, 'Đã thu hồi $1 phiên đăng nhập')
    .replace(/^Session=/i, 'Phiên đăng nhập: ')
    .replace(/^Device=/i, 'Thiết bị: ')
    .replace(/^Status=([A-Z_]+)$/i, (_, status) => `Trạng thái: ${viLabel(status)}`)
    .replace(/^Ly do=/i, 'Lý do: ')
    .replace(/^Doi mat khau va thu hoi toan bo phien$/i, 'Đổi mật khẩu và thu hồi toàn bộ phiên đăng nhập')
    .replace(/^Cap nhat ho so /i, 'Cập nhật hồ sơ ');
}

/** A6: Lưu vết hệ thống - /audit-logs (+stats). */
export function AdminAuditLive() {
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const params = [module && `module=${module}`, action && `action=${action}`].filter(Boolean).join('&');
  const logs = useApi<AuditLog[]>(`/audit-logs${params ? `?${params}` : ''}`);
  const stats = useApi<{ byModule: Record<string, number>; byAction: Record<string, number>; total: number }>('/audit-logs/stats');
  const moduleOptions = useMemo(() => Object.keys(stats.data?.byModule || {}).sort(), [stats.data]);
  const actionOptions = useMemo(() => Object.keys(stats.data?.byAction || {}).sort(), [stats.data]);

  return (
    <Section title="Lịch sử hệ thống" subtitle="Theo dõi các hoạt động quan trọng" wide>
      <div className="live-toolbar audit-toolbar">
        <select className="live-select" value={module} onChange={(event) => setModule(event.target.value)}>
          <option value="">Tất cả phân hệ</option>
          {moduleOptions.map((value) => <option key={value} value={value}>{moduleLabel(value)}</option>)}
        </select>
        <select className="live-select" value={action} onChange={(event) => setAction(event.target.value)}>
          <option value="">Tất cả hành động</option>
          {actionOptions.map((value) => <option key={value} value={value}>{actionLabel(value)}</option>)}
        </select>
        <span className="grow" />
        <button className="live-btn ghost" onClick={() => { logs.reload(); stats.reload(); }}>
          <RefreshCw size={14} /> Tải lại
        </button>
      </div>

      {stats.data && (
        <div className="audit-summary">
          <strong>Tổng cộng {stats.data.total.toLocaleString('vi-VN')} hoạt động</strong>
          <div>
            {Object.entries(stats.data.byModule).map(([key, value]) => (
              <span key={key}>{moduleLabel(key)} <b>{value.toLocaleString('vi-VN')}</b></span>
            ))}
          </div>
        </div>
      )}

      <Async paginate state={logs} empty="Chưa có hoạt động nào được ghi nhận" itemLabel="hoạt động">
        {(list) => (
          <table className="live-table audit-table">
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Phân hệ</th>
                <th>Đối tượng và chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {list.map((log) => (
                <tr key={log.id}>
                  <td><small>{fmtDateTime(log.createdAt)}</small></td>
                  <td><strong>{log.actorName || 'Hệ thống'}</strong><small>{viLabel(log.role)}</small></td>
                  <td><Badge tone={ACTION_TONE[log.action] || 'blue'}>{actionLabel(log.action)}</Badge></td>
                  <td>{moduleLabel(log.module)}</td>
                  <td>
                    <strong>{ENTITY_LABELS[log.entityType || ''] || 'Dữ liệu hệ thống'}</strong>
                    <small>{detailLabel(log.detail)}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Async>
    </Section>
  );
}

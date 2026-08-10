import { BellRing, CalendarClock, ExternalLink, Flag, Link2 } from 'lucide-react';
import type { Notification } from '../api/types';
import { Modal } from '../features/live/Modal';

const TYPE_LABELS: Record<string, string> = {
  ANNOUNCEMENT: 'Thông báo nhà trường',
  ASSIGNMENT: 'Bài tập',
  ATTENDANCE: 'Chuyên cần',
  EXAM: 'Lịch thi',
  FINANCE: 'Tài chính',
  GRADE: 'Điểm số',
  INVOICE: 'Khoản thu',
  PAYMENT: 'Thanh toán',
  TIMETABLE: 'Thời khóa biểu',
  YEAR_RESULT: 'Kết quả năm học',
};

const PRIORITY_LABELS: Record<string, string> = {
  NORMAL: 'Thông thường', IMPORTANT: 'Quan trọng', URGENT: 'Khẩn cấp',
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'long', timeStyle: 'short',
  }).format(new Date(value));
}

export function NotificationDetailDialog({
  notification,
  onClose,
  onOpenRelated,
  relatedLabel = 'Mở chức năng liên quan',
}: {
  notification: Notification;
  onClose: () => void;
  onOpenRelated?: () => void;
  relatedLabel?: string;
}) {
  const priority = notification.priority || 'NORMAL';
  return (
    <Modal
      title="Chi tiết thông báo"
      onClose={onClose}
      footer={<>
        <button className="live-btn ghost" type="button" onClick={onClose}>Đóng</button>
        {onOpenRelated && <button className="live-btn" type="button" onClick={onOpenRelated}><ExternalLink size={15} /> {relatedLabel}</button>}
      </>}
    >
      <article className="notification-detail">
        <header>
          <span className="notification-detail-icon"><BellRing size={22} /></span>
          <div>
            <span className="notification-detail-type">{TYPE_LABELS[notification.type] || notification.type}</span>
            <h4>{notification.title}</h4>
          </div>
        </header>
        <div className="notification-detail-meta">
          <span><CalendarClock size={15} /> {formatDateTime(notification.createdAt)}</span>
          <span className={`notification-priority ${priority.toLowerCase()}`}><Flag size={14} /> {PRIORITY_LABELS[priority] || priority}</span>
          <span className="notification-read-state">Đã đọc</span>
        </div>
        <p className="notification-detail-body">{notification.body}</p>
        {(notification.refType || notification.refId) && <div className="notification-detail-reference"><Link2 size={15} /><span><small>Tham chiếu</small><strong>{notification.refType || 'Nội dung'}{notification.refId ? ` · ${notification.refId}` : ''}</strong></span></div>}
      </article>
    </Modal>
  );
}

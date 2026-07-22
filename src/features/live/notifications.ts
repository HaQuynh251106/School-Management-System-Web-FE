import type { Notification } from '../../api/types';

export type NotificationReadFilter = 'ALL' | 'UNREAD' | 'READ';
export type NotificationPriorityFilter = 'ALL' | 'NORMAL' | 'IMPORTANT' | 'URGENT';

export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  GENERAL: 'Thông báo chung', HOLIDAY: 'Nghỉ lễ', GRADE: 'Điểm số', GRADE_PUBLISHED: 'Điểm số',
  EVENT: 'Sự kiện', STUDENT_STATUS: 'Tình hình học sinh', ATTENDANCE: 'Điểm danh',
  ATTENDANCE_ALERT: 'Chuyên cần', ATTENDANCE_REMINDER: 'Nhắc điểm danh',
  ATTENDANCE_UNLOCK: 'Mở khóa điểm danh', PARENT_MEETING: 'Họp phụ huynh', ASSIGNMENT: 'Bài tập',
  FEE: 'Khoản thu', INVOICE: 'Hóa đơn', PAYMENT: 'Thanh toán',
  FINANCE_REMINDER: 'Nhắc hạn khoản thu', FINANCE_CLASS_COMPLETE: 'Lớp hoàn thành tài chính',
  FINANCE_TASK_REMINDER: 'Nhiệm vụ tài chính lớp',
  ANNOUNCEMENT: 'Thông báo chung',
};

export interface NotificationFilters {
  query: string;
  read: NotificationReadFilter;
  priority: NotificationPriorityFilter;
  type: string;
}

export function filterNotifications(items: Notification[], filters: NotificationFilters) {
  const query = filters.query.trim().toLocaleLowerCase('vi');
  return items
    .filter((item) => filters.read === 'ALL' || (filters.read === 'READ' ? item.read : !item.read))
    .filter((item) => filters.priority === 'ALL' || (item.priority || 'NORMAL') === filters.priority)
    .filter((item) => filters.type === 'ALL' || item.type === filters.type)
    .filter((item) => !query || [item.title, item.body, NOTIFICATION_TYPE_LABEL[item.type], item.type]
      .some((value) => value?.toLocaleLowerCase('vi').includes(query)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function notificationSummary(items: Notification[], now = new Date()) {
  const today = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
  const isToday = (createdAt: string) => {
    const date = new Date(createdAt);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` === today;
  };
  return {
    total: items.length,
    unread: items.filter((item) => !item.read).length,
    important: items.filter((item) => item.priority === 'IMPORTANT' || item.priority === 'URGENT').length,
    today: items.filter((item) => isToday(item.createdAt)).length,
  };
}

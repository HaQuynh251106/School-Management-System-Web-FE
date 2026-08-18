export const NOTIFICATION_INBOX_CHANGED = 'school:notification-inbox-changed';
export const CHAT_UNREAD_CHANGED = 'school:chat-unread-changed';
export const CHAT_REALTIME_RECEIVED = 'school:chat-realtime-received';
export const BUSINESS_DATA_CHANGED = 'school:business-data-changed';

export interface BusinessDataChangedDetail {
  type: string;
  data: Record<string, unknown>;
}

/** Chỉ reload các resource bị ảnh hưởng; tránh polling và tránh gọi lại API không liên quan. */
export function businessEventAffectsPath(type: string, path: string) {
  const normalized = type.toUpperCase();
  if (normalized.startsWith('GRADE_')) return path.startsWith('/grades') || path.startsWith('/me/reports') || path.startsWith('/dashboard');
  if (normalized.startsWith('ATTENDANCE_')) return path.startsWith('/attendance') || path.startsWith('/me/reports') || path.startsWith('/dashboard');
  if (normalized.startsWith('TIMETABLE_')) return path.includes('/timetable') || path.startsWith('/timetable-versions') || path.startsWith('/dashboard');
  if (normalized.startsWith('ASSIGNMENT_')) return path.includes('/assignments') || path.includes('/submissions') || path.startsWith('/dashboard');
  if (normalized.startsWith('EXAM_')) return path.includes('/exam-') || path.startsWith('/exam-periods') || path.startsWith('/dashboard');
  if (normalized.startsWith('PAYMENT_')) return path.startsWith('/payments') || path.startsWith('/invoices') || path.startsWith('/finance') || path.startsWith('/dashboard');
  if (normalized.startsWith('TEACHING_PROGRESS_')) return path.startsWith('/teaching-progress') || path.includes('/timetable');
  return false;
}

export function emitNotificationInboxChanged() {
  window.dispatchEvent(new Event(NOTIFICATION_INBOX_CHANGED));
}

export function emitChatUnreadChanged() {
  window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED));
}

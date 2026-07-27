export const NOTIFICATION_INBOX_CHANGED = 'school:notification-inbox-changed';
export const CHAT_UNREAD_CHANGED = 'school:chat-unread-changed';
export const CHAT_REALTIME_RECEIVED = 'school:chat-realtime-received';

export function emitNotificationInboxChanged() {
  window.dispatchEvent(new Event(NOTIFICATION_INBOX_CHANGED));
}

export function emitChatUnreadChanged() {
  window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED));
}

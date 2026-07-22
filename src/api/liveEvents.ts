export const NOTIFICATION_INBOX_CHANGED = 'school:notification-inbox-changed';
export const CHAT_UNREAD_CHANGED = 'school:chat-unread-changed';

export function emitNotificationInboxChanged() {
  window.dispatchEvent(new Event(NOTIFICATION_INBOX_CHANGED));
}

export function emitChatUnreadChanged() {
  window.dispatchEvent(new Event(CHAT_UNREAD_CHANGED));
}

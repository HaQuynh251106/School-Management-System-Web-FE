export const APP_ERROR_EVENT = 'sse:app-error';
export const APP_SUCCESS_EVENT = 'sse:app-success';

let lastMessage = '';
let lastEmittedAt = 0;

export function showAppError(message: string) {
  const text = message?.trim() || 'Đã xảy ra lỗi. Vui lòng thử lại.';
  const now = Date.now();
  if (text === lastMessage && now - lastEmittedAt < 500) return;
  lastMessage = text;
  lastEmittedAt = now;
  window.dispatchEvent(new CustomEvent(APP_ERROR_EVENT, { detail: { message: text } }));
}

export function showAppSuccess(message: string) {
  const text = message?.trim();
  if (!text) return;
  window.dispatchEvent(new CustomEvent(APP_SUCCESS_EVENT, { detail: { message: text } }));
}

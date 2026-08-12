self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { notification: { body: event.data.text() } }; }
  const notification = payload.notification || payload.data || {};
  const title = notification.title || 'Trường học số';
  const options = {
    body: notification.body || 'Bạn có thông báo mới.',
    data: { deepLink: payload.data?.deepLink || '/notifications' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.deepLink || '/notifications';
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
    const existing = windows[0];
    if (existing) {
      existing.focus();
      existing.postMessage({ type: 'SSE_NOTIFICATION_OPEN', deepLink: target });
      return existing;
    }
    return clients.openWindow('/');
  }));
});

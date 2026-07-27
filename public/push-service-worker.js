self.addEventListener('push', (event) => {
  let payload = {};
  try { payload = event.data ? event.data.json() : {}; } catch { payload = {}; }
  const notification = payload.notification || payload.data || {};
  const title = notification.title || 'Trường học số';
  const options = {
    body: notification.body || 'Bạn có một thông báo mới',
    data: { url: notification.url || '/#/dashboard' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/#/dashboard';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    const current = clients.find((client) => 'focus' in client);
    if (current) {
      current.navigate(target);
      return current.focus();
    }
    return self.clients.openWindow(target);
  }));
});

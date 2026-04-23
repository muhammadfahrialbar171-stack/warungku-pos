self.addEventListener('push', function (event) {
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'WarungKu POS';
  const body = data.body || 'Pemberitahuan baru';
  const icon = data.icon || '/icon-192x192.png';
  const url = data.url || '/dashboard';

  const options = {
    body: body,
    icon: icon,
    badge: '/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: url,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

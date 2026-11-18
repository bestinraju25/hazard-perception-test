/* HPT V134: root-scoped Web Push service worker for provider-admin alerts. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (_) { data = { body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'New HPT school registration';
  const options = {
    body: data.body || 'A driving school has registered and is waiting for approval.',
    icon: data.icon || '/assets/hpt-brand-logo-v129.png',
    badge: data.badge || '/hpt-favicon-v128-192.png',
    tag: data.tag || 'hpt-new-school-registration',
    renotify: true,
    data: { url: data.url || '/admin.html?tab=schools' },
    vibrate: [120, 60, 120]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || '/admin.html?tab=schools', self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && 'focus' in client) {
        await client.navigate(target);
        return client.focus();
      }
    }
    if (self.clients.openWindow) return self.clients.openWindow(target);
  })());
});

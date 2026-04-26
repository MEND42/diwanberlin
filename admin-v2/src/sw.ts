/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>;
};

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  const data = event.data?.json?.() ?? {
    title: 'Cafe Diwan',
    body: 'Neue Benachrichtigung',
    url: '/admin/',
  };

  const title = data.title || 'Cafe Diwan';
  const options: NotificationOptions & { data?: { url?: string }; renotify?: boolean } = {
    body: data.body || '',
    icon: '/uploads/diwan-logo-new.png',
    badge: '/uploads/diwan-logo-new.png',
    data: { url: data.url || '/admin/' },
    tag: data.type || 'diwan-admin',
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/admin/';
  const url = new URL(targetUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clientList) {
      if ('focus' in client) {
        await client.focus();
        if ('navigate' in client) await client.navigate(url);
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

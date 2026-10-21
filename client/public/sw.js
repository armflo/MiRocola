// Cache-clearing Service Worker: safely purges any stale v1 cache and unregisters
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.claim())
  );
});

// Always pass-through to live network directly so SPAs never serve stale bundles
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

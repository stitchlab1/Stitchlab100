// public/service-worker.js
// A clean, simple, high-performance service worker to enable native PWA installation.

const CACHE_NAME = 'stitchlab-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through fetch handler to satisfy PWA criteria perfectly without causing any cache/delay issues.
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});

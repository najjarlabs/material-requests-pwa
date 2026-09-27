const CACHE = 'material-requests-pwa-v1.0.1';

const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './config.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Always fetch gateway configuration from the network.
  // This ensures Apps Script URL changes are visible immediately.
  if (
    url.origin === self.location.origin &&
    (
      url.pathname.endsWith('/config.js') ||
      url.pathname.endsWith('/manifest.webmanifest') ||
      url.pathname.endsWith('/index.html') ||
      url.pathname.endsWith('/sw.js')
    )
  ) {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then(response => response)
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigation: network first.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Other static resources: cache first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          const copy = response.clone();

          caches.open(CACHE).then(cache => {
            cache.put(request, copy);
          });

          return response;
        });
      })
    );
  }
});

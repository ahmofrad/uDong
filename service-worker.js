const CACHE_NAME = 'dong-pwa-v10';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css',
  './css/base.css',
  './css/components.css',
  './js/app.js',
  './js/state/schema.js',
  './js/state/store.js',
  './js/storage/localStorageAdapter.js',
  './js/storage/cookieAdapter.js',
  './js/utils/currency.js',
  './js/utils/date.js',
  './js/utils/i18n.js',
  './js/utils/settlementEngine.js',
  './js/utils/validators.js',
  './js/views/viewContext.js',
  './js/views/tripList.js',
  './js/views/tripSetup.js',
  './js/views/dashboard.js',
  './js/views/expenses.js',
  './js/views/expenseCard.js',
  './js/views/settlement.js',
  './js/views/settings.js',
  './assets/icons/icon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable.svg',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/fonts/vazirmatn-arabic.woff2',
  './assets/fonts/vazirmatn-latin.woff2',
  './assets/vendors/jalalidatepicker/jalalidatepicker.min.js',
  './assets/vendors/jalalidatepicker/jalalidatepicker.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request.url).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Only cache same-origin requests, and only successful basic responses.
  // Cross-origin and opaque responses are passed through without caching.
  const requestUrl = new URL(event.request.url);
  const isSameOrigin = requestUrl.origin === self.location.origin;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (isSameOrigin && response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
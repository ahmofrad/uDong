const CACHE_NAME = 'dong-pwa-v4';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/variables.css?v=2',
  './css/base.css?v=2',
  './css/components.css?v=2',
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
  './assets/icons/icon.svg',
  './assets/icons/icon-192.svg',
  './assets/icons/icon-512.svg',
  './assets/icons/icon-maskable.svg',
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

  event.respondWith(
    caches.match(event.request).then((cached) =>
      cached || fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
    )
  );
});
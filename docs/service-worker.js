/* Al Zahraa Portal PWA shell cache. Business records stay in encrypted IndexedDB. */
var CACHE = 'alzahraa-shell-v2.0.1';
var SHELL = [
  './', './index.html', './manifest.webmanifest', './robots.txt',
  './assets/css/styles.css', './assets/css/brand.css',
  './assets/img/favicon.svg', './assets/img/icon-192.png', './assets/img/icon-512.png',
  './assets/img/logo-full.svg', './assets/img/logo-mark.svg', './assets/img/logo-mark-white.svg', './assets/img/logo-stacked.svg',
  './assets/vendor/chart-4.4.1.umd.js', './assets/vendor/supabase-2.112.3.js',
  './assets/js/frame-guard.js', './assets/js/loader.js', './assets/js/env.js', './assets/js/config.js', './assets/js/offline-db.js', './assets/js/i18n.js', './assets/js/store.js',
  './assets/js/schema.js', './assets/js/auth.js', './assets/js/identity.js', './assets/js/workflow.js',
  './assets/js/ui.js', './assets/js/rules.js', './assets/js/print.js', './assets/js/alerts.js',
  './assets/js/roleview.js', './assets/js/assistant.js', './assets/js/pages/dashboard.js',
  './assets/js/pages/dashboard-render.js', './assets/js/pages/entity.js', './assets/js/pages/approvals.js',
  './assets/js/pages/reports.js', './assets/js/pages/settings.js', './assets/js/app.js'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) { return key !== CACHE; }).map(function (key) { return caches.delete(key); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;
  var url = new URL(event.request.url);
  if (url.origin === self.location.origin) {
    event.respondWith(fetch(event.request).then(function (response) {
      if (response && response.ok) {
        var copy = response.clone();
        caches.open(CACHE).then(function (cache) { cache.put(event.request, copy); });
      }
      return response;
    }).catch(function () {
      return caches.match(event.request).then(function (cached) {
        return cached || (event.request.mode === 'navigate' ? caches.match('./index.html') : Promise.reject(new Error('offline')));
      });
    }));
  }
});

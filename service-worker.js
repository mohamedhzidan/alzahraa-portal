/* Al Zahraa Portal PWA shell cache. Business records stay in encrypted IndexedDB.
   ---------------------------------------------------------------------------
   TWO CHANGES IN v2.0.2 — both matter:

   1) CACHE NAME BUMPED  v2.0.1 → v2.0.2
      The activate handler deletes every cache whose name is not the current
      one. If the name had stayed the same, browsers would have kept serving
      the OLD auth.js and loader.js out of the cache, and the upload would
      have looked like it did nothing.

      تغيير رقم النسخة يجبر المتصفح على حذف النسخة القديمة. بدونه سيظل
      الموقع يعمل بالملفات القديمة ولو رفعت الجديدة.

   2) SIX NEW FILES ADDED to the shell list.
      Without them the AI and the two new departments would not have been
      available offline — which is the one thing that was asked for most.

      بدون إضافتها لن يعمل الذكاء الاصطناعي ولا القسمان الجديدان بدون إنترنت.
   --------------------------------------------------------------------------- */
var CACHE = 'alzahraa-shell-v2.0.2';

var SHELL = [
  './', './index.html', './manifest.webmanifest', './robots.txt',

  './assets/css/styles.css', './assets/css/brand.css',

  './assets/img/favicon.svg', './assets/img/icon-192.png', './assets/img/icon-512.png',
  './assets/img/logo-full.svg', './assets/img/logo-mark.svg',
  './assets/img/logo-mark-white.svg', './assets/img/logo-stacked.svg',

  './assets/vendor/chart-4.4.1.umd.js', './assets/vendor/supabase-2.112.3.js',

  './assets/js/frame-guard.js', './assets/js/loader.js', './assets/js/env.js',
  './assets/js/config.js', './assets/js/offline-db.js', './assets/js/i18n.js',
  './assets/js/store.js', './assets/js/schema.js',

  /* ── NEW in v2.0.2 · الجديد في هذه النسخة ────────────────────────────
     departments.js must be cached, or the Site Engineers and Document
     Control screens vanish the moment the connection drops.
     The other five are the assistant: without them a site engineer with
     no signal loses every check and every piece of job knowledge. */
  './assets/js/departments.js',
  './assets/js/hr-department.js',
  './assets/js/knowledge.js',
  './assets/js/inspector.js',
  './assets/js/inspector-departments.js',
  './assets/js/assistant-pro.js',
  './assets/js/agents.js',
  './assets/js/save-modes.js',
  './assets/js/workflow-policy.js',
  /* ─────────────────────────────────────────────────────────────────── */

  './assets/js/auth.js', './assets/js/identity.js', './assets/js/workflow.js',
  './assets/js/ui.js', './assets/js/rules.js', './assets/js/print.js',
  './assets/js/alerts.js', './assets/js/roleview.js', './assets/js/assistant.js',

  './assets/js/pages/dashboard.js', './assets/js/pages/dashboard-render.js',
  './assets/js/pages/entity.js', './assets/js/pages/approvals.js',
  './assets/js/pages/reports.js', './assets/js/pages/settings.js',

  './assets/js/app.js'
];

/* cache.addAll() is all-or-nothing: one missing file and the whole service
   worker fails to install, leaving no offline support at all and no clue why.
   We try the fast path first, and if it fails we cache each file individually
   and name the ones that did not make it in the console. Offline support then
   still works for everything that did arrive.

   الطريقة السريعة أولاً، فإن فشلت نخزّن كل ملف على حدة ونطبع أسماء الملفات
   الناقصة، بدل أن يفشل كل شيء بصمت. */
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).catch(function (firstError) {
        console.warn('[SW] bulk cache failed, falling back to one-by-one:', firstError);
        var missing = [];
        return Promise.all(SHELL.map(function (path) {
          return cache.add(path).catch(function () { missing.push(path); });
        })).then(function () {
          if (missing.length) {
            console.error('[SW] these files are NOT available offline:', missing);
          } else {
            console.info('[SW] all shell files cached on the second attempt.');
          }
        });
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (key) {
      return key !== CACHE;
    }).map(function (key) {
      console.info('[SW] deleting old cache:', key);
      return caches.delete(key);
    }));
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
        return cached || (event.request.mode === 'navigate'
          ? caches.match('./index.html')
          : Promise.reject(new Error('offline')));
      });
    }));
  }
});

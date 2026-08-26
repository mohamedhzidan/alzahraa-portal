/* Al Zahraa Portal PWA shell cache. Business records stay in encrypted IndexedDB.
   ---------------------------------------------------------------------------
   v2.0.11 — 26 أغسطس ٢٠٢٦
   لا ملف جديد — auth.js نفسه تغيّر (طلب فحص المواد صار يعتمده مدير
   المشروع والمكتب الفني معاً، لا المدير العام وحده). auth.js موجود
   أصلاً في قائمة الغلاف أدناه، فيظل المتصفح يقدّم نسخته القديمة من
   الذاكرة المؤقتة إلى الأبد ما لم يتغيّر اسم النسخة — تعديل صلاحية
   داخل auth.js يحتاج اسم ذاكرة جديداً تماماً كملف جديد. هذا هو فخ
   AUDIT-25 يظهر للمرة الرابعة.

   v2.0.11 — 26 August 2026
   No new file — auth.js itself changed (a Material Inspection Request
   is now signed by both the project manager and the technical office,
   not the general manager alone). auth.js is already in the shell list
   below, so without a new cache name the browser keeps serving its old
   cached copy forever — a permission change inside auth.js needs a new
   cache name exactly as much as a brand-new file does. This is the
   AUDIT-25 trap's fourth appearance.
   ---------------------------------------------------------------------------
   v2.0.10 — 26 أغسطس ٢٠٢٦
   أُضيف ملفان جديدان:
     · client-ipc-withholding.js  (خصم وتحصيل الضريبة على مستخلصات العميل)
     · lookup-loader.js           (يملأ قوائم اختيار lookup الفارغة)
   رقم النسخة ارتفع من v2.0.9 (وهو رقم الحزمة الأولى، لم يُنشر بعد —
   الموقع الحيّ ما زال على v2.0.8 وقت كتابة هذا السطر)
   لإجبار المتصفح على حذف النسخة القديمة، وإلا استمر في تقديم الملفات
   القديمة دون هذين الملفين حتى لو رُفع الجديد.

   v2.0.10 — 26 August 2026
   Two new files added: client-ipc-withholding.js (withholding tax on
   client IPCs) and lookup-loader.js (fills previously-empty lookup
   dropdowns). Bumped from v2.0.9 — the FIRST batch's number, not yet
   published; the live site was still on v2.0.8 when this was written.
   Both v2.0.9 and v2.0.10 are unspent, so batch one must go up before
   batch two or batch one's loader would un-wire these two files.
   The bump forces the browser to drop the old cache; otherwise it keeps
   serving the old file set, missing both, even after the upload.
   (This header first wrongly claimed v2.0.9 was already live — caught
   by integrator before hand-off. Getting this number wrong is the
   AUDIT-25 trap, and it has now come up three times.)
   ---------------------------------------------------------------------------

   v2.0.9 — 26 أغسطس ٢٠٢٦
   أُضيفت أربعة ملفات جديدة:
     · hr-manager-links.js  (يوصّل مدير الموارد البشرية بخبرة/فحوصات/لوحة hr)
     · money-owed.js        (المبلغ المسدَّد/المحصَّل الحقيقي من السندات المعتمدة)
     · hr-signals.js        (تاريخ انتهاء العقد الحقيقي وحضور اليوم الحقيقي)
     · version-badge.js     (رقم النسخة في التذييل من الذاكرة الفعلية)
   رقم النسخة ارتفع من v2.0.8 (وهو مُستهلَك بالفعل — يخدم الموقع الحيّ
   اليوم) لإجبار المتصفح على حذف النسخة القديمة، وإلا استمر في تقديم
   الملفات القديمة دون هذه الملفات الأربعة حتى لو رُفع الجديد.

   v2.0.9 — 26 August 2026
   Four new files added: hr-manager-links.js (links the HR manager role
   into HR knowledge/checks/dashboard), money-owed.js (the real
   paid/collected amounts from approved vouchers), hr-signals.js (the
   real contract-expiry date and real headcount present today), and
   version-badge.js (footer version read from the real cache). The
   version was bumped from v2.0.8 — which is SPENT, it is what the live
   site runs today — to force the browser to drop the old cache;
   otherwise it keeps serving the old file set, missing all four, even
   after the upload.
   ---------------------------------------------------------------------------

   v2.0.8 — 26 أغسطس ٢٠٢٦ (تاريخي · historical)
   أُضيفت أربعة ملفات: retention-release-field.js · one-step-approval.js ·
   report-access.js · audit-security-events.js.

   ⚠️ خطأ صُحِّح حينها: كُتبت تلك النسخة أولاً باسم v2.0.7 — رقم كان قد
   استُهلك بالفعل في نشر ٢٥ أغسطس. ولأن المتصفح لا يحذف إلا ما اختلف
   اسمه، كان الرفع سيبدو ناجحاً ولا يصل الملف الجديد لأحد. هذا الفخ
   نفسه هو سبب حرص v2.0.9 أعلاه على التأكد أن v2.0.8 مُستهلَك فعلاً قبل
   الترقيم.

   Four files were added then: retention-release-field.js,
   one-step-approval.js, report-access.js, audit-security-events.js.
   CORRECTED at the time: first written as v2.0.7 — already spent by the
   25 August deploy. Since the browser only deletes caches whose name
   DIFFERS, the upload would have looked successful and reached no one.
   This exact trap is why v2.0.9 above double-checked that v2.0.8 was
   truly spent before numbering.
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
var CACHE = 'alzahraa-shell-v2.0.11';

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

  /* ── جديد في v2.0.10 · NEW in v2.0.10 ──────────────────────────────── */
  /* خصم وتحصيل الضريبة على مستخلصات العميل
     withholding tax on client IPCs */
  './assets/js/client-ipc-withholding.js',
  /* يملأ قوائم اختيار lookup الفارغة
     fills previously-empty lookup dropdowns */
  './assets/js/lookup-loader.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.9 · NEW in v2.0.9 ──────────────────────────────── */
  /* يوصّل مدير الموارد البشرية بخبرة/فحوصات/لوحة hr
     links the HR manager role into HR knowledge/checks/dashboard */
  './assets/js/hr-manager-links.js',
  /* المبلغ المسدَّد/المحصَّل الحقيقي من السندات المعتمدة
     the real paid/collected amounts from approved vouchers */
  './assets/js/money-owed.js',
  /* تاريخ انتهاء العقد الحقيقي وحضور اليوم الحقيقي
     the real contract-expiry date and real headcount present today */
  './assets/js/hr-signals.js',
  /* رقم النسخة في التذييل من الذاكرة الفعلية
     footer version read from the real cache */
  './assets/js/version-badge.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── جديد في v2.0.8 · NEW in v2.0.8 ──────────────────────────────── */
  './assets/js/retention-release-field.js',
  /* يفكّ عَلَق مستندات التوقيع الواحد · unsticks one-step documents */
  './assets/js/one-step-approval.js',
  /* يخفي زر التقارير عمّن لا تقارير له · hides Reports where empty */
  './assets/js/report-access.js',
  /* أحداث الأمان للسجل الدائم · security events to the permanent log */
  './assets/js/audit-security-events.js',
  /* ─────────────────────────────────────────────────────────────────── */

  /* ── NEW in v2.0.2 · الجديد في هذه النسخة ────────────────────────────
     departments.js must be cached, or the Site Engineers and Document
     Control screens vanish the moment the connection drops.
     The other five are the assistant: without them a site engineer with
     no signal loses every check and every piece of job knowledge. */
  './assets/js/departments.js',
  './assets/js/hr-department.js',
  './assets/js/dc-requests.js',
  './assets/js/save-guard.js',
  './assets/js/access-check.js',
  './assets/js/audit-trail.js',
  './assets/js/sites.js',
  './assets/js/knowledge.js',
  './assets/js/inspector.js',
  './assets/js/inspector-departments.js',
  './assets/js/assistant-pro.js',
  './assets/js/agents.js',
  './assets/js/save-modes.js',
  './assets/js/attachments.js',
  './assets/js/import.js',
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

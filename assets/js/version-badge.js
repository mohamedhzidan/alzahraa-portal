/* =========================================================================
   version-badge.js — رقم النسخة في تذييل الصفحة يقرأ الذاكرة الفعلية
                       بدل رقم ثابت في index.html
                       The footer version reads the real cache instead of a
                       hard-coded number in index.html
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   index.html يكتب <span id="footerVersion">v2.0.1</span> بشكل ثابت، بينما
   الذاكرة الفعلية service-worker.js صارت alzahraa-shell-v2.0.9 — رقم
   خاطئ منذ سبعة إصدارات. لا توجد وسيلة على الشاشة يتحقق بها محمد زيدان
   من نجاح رفعة (deploy) فعلاً؛ هذا أكثر ما طلبه.

   index.html hard-codes <span id="footerVersion">v2.0.1</span>, while the
   real cache in service-worker.js is now alzahraa-shell-v2.0.9 — wrong
   for seven releases. There is no on-screen way for Mohamed Zidan to
   check a deploy actually worked. This is his most-requested thing.

   الحل · THE FIX

   نقرأ أسماء الذواكر الفعلية عبر caches.keys() عند التشغيل، نبحث عن
   الاسم الذي يبدأ بـ "alzahraa-shell-"، ونأخذ الجزء بعد هذه البادئة —
   فيصبح الرقم المعروض هو الرقم الحقيقي الذي يخدم الصفحة الآن، لا رقماً
   كُتب يدوياً وقد يُنسى تحديثه.

   We read the real cache names at runtime via caches.keys(), find the
   one starting with "alzahraa-shell-", and take the part after that
   prefix — so the number shown is the real one actually serving the
   page right now, not a hand-typed number that can be forgotten.

   ⚠️ لا نكتب رقماً خاطئاً أبداً: لو caches غير متاح (متصفح قديم، أو
      إطار iframe محجوب) أو لم نجد ذاكرة مطابقة، نترك النص الموجود في
      الصفحة كما هو دون لمسه.
   We never write a WRONG number: if caches is unavailable (old browser,
   a blocked iframe) or nothing matches, we leave the page's existing
   text exactly as it is.

   ⚠️⚠️ الفخ الحقيقي الذي كاد يُفشل هذا الملف بالكامل — كشفه integrator
   -------------------------------------------------------------------
   العنصر #footerVersion يقع داخل #appShell وهو مخفي (hidden) قبل تسجيل
   الدخول. و app.js:137-138 داخل enterApp() يكتب فوقه عند كل تسجيل دخول:
   `fv.textContent = 'v' + (ALZAHRAA_CONFIG.version || '2.0.1')`
   و config.js:15 ما زال '2.0.1'.

   أي أن النسخة الأولى من هذا الملف كانت ستكتب الرقم الصحيح **بينما لا
   أحد يستطيع رؤيته**، ثم يمحوه app.js بالرقم القديم في اللحظة نفسها
   التي يصبح فيها مرئياً. كان الملف سيبدو ناجحاً تماماً ولا يعمل أبداً —
   وهو بالضبط نوع الفشل الصامت الذي كُتب هذا الملف ليُنهيه.

   THE REAL TRAP THAT NEARLY KILLED THIS FILE — found by integrator:
   #footerVersion lives inside #appShell, which is `hidden` until login.
   And app.js:137-138, inside enterApp(), overwrites it at every login
   with `'v' + (ALZAHRAA_CONFIG.version || '2.0.1')` — and config.js:15
   is still '2.0.1'. So the first version of this file wrote the right
   number **while nobody could see it**, and app.js replaced it with the
   stale one at the exact moment it became visible. The file would have
   looked perfectly successful and never worked — precisely the silent
   failure it exists to end.

   الحل: نراقب العنصر نفسه (MutationObserver) ونعيد الكتابة كلما غيّره
   أحد. app.js للقراءة فقط، فلا نعدّله — نلحق به. نفس أسلوب
   report-access.js مع القائمة الجانبية.
   THE FIX: observe the element itself and re-apply whenever anything
   changes it. app.js is read-only, so we do not edit it — we follow it.
   Same technique report-access.js uses on the sidebar nav.

   ⚠️ وأيضاً: نأخذ **أعلى** رقم نسخة لا أول واحد. أثناء تفعيل نسخة
   جديدة تتعايش الذاكرتان القديمة والجديدة للحظة، وأخذ الأولى كان قد
   يُظهر القديمة. We take the HIGHEST version, not the first: during a
   new activation the old and new caches coexist briefly, and taking the
   first could show the old one.

   هذا هو فحص الرفعة الخاص بمحمد زيدان — نظرة واحدة على تذييل الصفحة
   بدل عدّ الأسطر على GitHub.
   THIS IS MOHAMED ZIDAN'S DEPLOY CHECK — one glance at the footer
   instead of counting lines on GitHub.

   إضافي بالكامل: احذف هذا الملف ويعود الرقم الثابت في index.html كما
   كان — لا يتوقف عليه أي سلوك آخر في الموقع.
   ADDITIVE: delete this file and the hard-coded number in index.html
   returns exactly as it was — no other behaviour in the site depends on
   this file.

   يُحمَّل آخر ملف في loader.js. Load LAST in loader.js.
   ========================================================================= */
(function (global) {
  'use strict';

  var PREFIX = 'alzahraa-shell-';
  var real = null;        /* الرقم الحقيقي بعد قراءته مرة · the real number once read */
  var writing = false;    /* يمنع المراقب من ملاحقة كتابتنا نحن · stops the observer chasing our own write */

  /* ترتيب النسخ رقمياً: v2.0.10 أحدث من v2.0.9 — والمقارنة النصية
     كانت ستقول العكس. numeric ordering: v2.0.10 is newer than v2.0.9,
     which a plain string compare would get backwards. */
  function newer(a, b) {
    var x = String(a).replace(/^v/, '').split('.').map(Number);
    var y = String(b).replace(/^v/, '').split('.').map(Number);
    for (var i = 0; i < Math.max(x.length, y.length); i++) {
      var d = (x[i] || 0) - (y[i] || 0);
      if (d) return d > 0;
    }
    return false;
  }

  function write() {
    if (!real) return;
    var el = document.getElementById('footerVersion');
    /* لا عنصر في الصفحة → لا شيء نفعله (لا نُنشئه، فليس هذا دوره)
       no element on the page → nothing to do (we don't create it, that
       is not this file's job) */
    if (!el || el.textContent === real) return;
    writing = true;
    el.textContent = real;
    writing = false;
  }

  function read() {
    if (!global.caches || !caches.keys) return;   /* لا نلمس النص الموجود */
    caches.keys().then(function (keys) {
      var best = null;
      (keys || []).forEach(function (k) {
        if (k.indexOf(PREFIX) !== 0) return;
        var v = k.slice(PREFIX.length);
        if (!best || newer(v, best)) best = v;
      });
      if (!best) return;   /* لا نطابق → نترك النص الموجود كما هو */
      real = best;
      write();
      watch();
    }).catch(function () { /* أي خطأ → لا نلمس النص الموجود */ });
  }

  /* app.js:137-138 يكتب فوق العنصر عند كل تسجيل دخول — نلحق به بدل أن
     نعدّل app.js (ملف للقراءة فقط). انظر الشرح أعلاه.
     app.js:137-138 overwrites this element at every login — we follow it
     rather than editing app.js (read-only). See the note above. */
  function watch() {
    var el = document.getElementById('footerVersion');
    if (!el || el.__azVersionWatched) return;
    el.__azVersionWatched = true;
    try {
      new MutationObserver(function () { if (!writing) write(); })
        .observe(el, { childList: true, characterData: true, subtree: true });
    } catch (e) { /* بلا مراقب نعتمد على المؤقتات أدناه · fall back to the timers below */ }
  }

  function start() {
    read();
    /* شبكة أمان: العنصر مخفي قبل الدخول وقد يُستبدل بالكامل، فنعيد
       المحاولة بعد الدخول أيضاً.
       safety net: the element is hidden before login and may be replaced
       wholesale, so retry after login too. */
    [0, 600, 2000, 5000].forEach(function (ms) {
      setTimeout(function () { if (real) { write(); watch(); } else { read(); } }, ms);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);

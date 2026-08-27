/* =========================================================================
   site-fence-retry.js — يزرع حاجز المواقع بعد أن فشل sites.js في زرعه
                         INSTALLS THE SITE FENCE AFTER sites.js FAILED TO
   -------------------------------------------------------------------------
   الدليل الحي · PROVEN LIVE ON PRODUCTION

   Auth.__sitesInstalled كان undefined على الموقع الحيّ — أي أن الحاجز
   الذي يُفترض أن يمنع الروبيكي من رؤية سجلات سوهاج لم يُركَّب إطلاقاً،
   رغم أن sites.js يحمل الكود الصحيح لتركيبه.

   Auth.__sitesInstalled was undefined on the live site — the fence meant
   to stop Elrobaki from seeing Sohag's records was never installed at
   all, even though sites.js carries the correct code to install it.

   -------------------------------------------------------------------------
   لماذا يفشل sites.js في وقته · WHY sites.js MISSES ITS OWN WINDOW

   sites.js:261-264:

       install();
       if (document.readyState === 'loading') {
         document.addEventListener('DOMContentLoaded', function () { install(); ... });
       } else { ... }

   المحاولة الأولى (install() الفورية) تُنفَّذ وقت تحميل ملف sites.js
   نفسه — وهو يُحمَّل في loader.js قبل auth.js مباشرة، فـ global.Auth غير
   موجود بعد؛ install() تتحقق من (!global.Auth) وتخرج فوراً بصمت.

   المحاولة الثانية معلَّقة على DOMContentLoaded. لكن loader.js يُنشئ
   عناصر <script> ديناميكياً (createElement + appendChild) ويُحمّلها
   الواحدة تلو الأخرى بانتظار onload لكل ملف — نحو تسعين ملفاً عبر
   الشبكة. عناصر <script> المُنشأة هكذا لا تُعطِّل تفسير المستند، فـ
   DOMContentLoaded يُطلَق فور انتهاء تفسير index.html الصغير نفسه — أي
   قبل أن يصل التحميل التسلسلي إلى auth.js بوقت طويل غالباً. فتُنفَّذ
   المحاولة الثانية أيضاً قبل وجود Auth، ولا توجد محاولة ثالثة في
   sites.js — فيبقى Auth.__sitesInstalled بلا قيمة إلى الأبد.

   The first attempt (the immediate install()) runs while sites.js itself
   is loading — and it loads right before auth.js in loader.js, so
   global.Auth does not exist yet; install() checks (!global.Auth) and
   returns immediately, silently.

   The second attempt is pinned to DOMContentLoaded. But loader.js creates
   <script> elements dynamically (createElement + appendChild) and loads
   them one at a time, waiting for each file's onload — roughly ninety
   files over the network. Dynamically-created <script> elements do not
   block document parsing, so DOMContentLoaded fires as soon as the small
   index.html itself finishes parsing — almost always long before the
   sequential chain even reaches auth.js. So the second attempt also runs
   before Auth exists, and sites.js has no third attempt — leaving
   Auth.__sitesInstalled unset forever.

   -------------------------------------------------------------------------
   الإصلاح · THE FIX

   هذا الملف لا يُعيد لصق sites.js. يستعمل فقط ما صدَّرَته بالفعل —
   Sites.siteOf / Sites.seesAllSites / Sites.scopeBySite / Sites.seed —
   ويعيد بناء نفس اللفّة بالحرف، محروسة بنفس العلم Auth.__sitesInstalled،
   مع حزام محاولات [0,300,1200,3000]ms + DOMContentLoaded — وهذا الملف
   يُحمَّل بعد auth.js مباشرة في loader.js، فـ Auth موجودة غالباً من أول
   محاولة؛ الحزام احتياط فقط لأي ترتيب تحميل غير متوقَّع مستقبلاً.

   This file does not re-paste sites.js. It uses only what sites.js
   already exports — Sites.siteOf / Sites.seesAllSites / Sites.scopeBySite
   / Sites.seed — and rebuilds the identical wrap verbatim, guarded by the
   same Auth.__sitesInstalled flag, with a [0,300,1200,3000]ms retry ladder
   + DOMContentLoaded. This file loads immediately after auth.js in
   loader.js, so Auth already exists on the very first attempt in
   practice; the ladder is a safety net against any unexpected future
   load-order change.

   لو نجح sites.js نفسه في التركيب يوماً (مثلاً بعد إصلاح لاحق فيه)،
   Auth.__sitesInstalled يكون true بالفعل، فتخرج كل محاولاتنا هنا فوراً
   بلا أي أثر — لا لفّ مزدوج ممكناً إطلاقاً.

   If sites.js's own install ever succeeds on its own (a later fix inside
   it, say), Auth.__sitesInstalled is already true, so every attempt here
   exits immediately with no effect at all — double-wrapping is not
   possible.

   يُعيد أيضاً محاولة Sites.seed() عند 2500ms — لنفس سبب الفشل أعلاه:
   الزرع الأصلي معلَّق أيضاً على توقيت قد يفوت وقته.
   Also retries Sites.seed() at 2500ms — for the same reason as above: the
   original seeding is likewise pinned to a timing window that can be missed.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. Delete this file and the portal returns to
   exactly today's (broken) behaviour — sites.js is not touched or
   re-pasted anywhere.

   يُحمَّل مباشرة بعد auth.js — الحاجز يقع تحت لفّة audit-trail.js اللاحقة
   على scopeRows؛ كلاهما تصفية بحتة، فالترتيب بينهما آمن (مذكور هنا حتى
   يبقى الحال معروفاً إن تغيّر أحدهما).
   Load immediately after auth.js — the fence sits UNDER audit-trail.js's
   later wrap of scopeRows; both are pure filters, so the order between
   them is safe (stated here so the situation stays known if either one
   changes).
   ========================================================================= */
(function (global) {
  'use strict';

  function install() {
    if (!global.Auth || !global.Sites || Auth.__sitesInstalled) return;
    var orig = Auth.scopeRows;
    Auth.scopeRows = function (moduleId, rows) {
      var out = orig.apply(Auth, arguments);
      return Sites.scopeBySite(moduleId, out);
    };
    Auth.site = Sites.siteOf;
    Auth.seesAllSites = Sites.seesAllSites;
    Auth.__sitesInstalled = true;
    console.info('[site-fence-retry] site fence installed — sites.js\'s own attempt ran before ' +
      'auth.js existed and never retried; this file finishes the job.');
  }

  [0, 300, 1200, 3000].forEach(function (ms) { setTimeout(install, ms); });
  document.addEventListener('DOMContentLoaded', install);
  install();

  /* نفس عطل التوقيت أصاب seedIfEmpty أيضاً — محاولة ثانية أضمن توقيتاً */
  setTimeout(function () {
    try { if (global.Sites && Sites.seed) Sites.seed(); } catch (e) {}
  }, 2500);

  global.SiteFenceRetry = { install: install };
})(window);

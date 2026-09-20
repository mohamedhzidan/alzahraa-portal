/* =========================================================================
   desk-save-honesty.js — تأكيد وصول حفظ شاشات المكتب للخادم، حتى لو
                          صنّف store.js الفشل «انقطاعاً» لا «تعارضاً»
                          Confirms desk-screen saves reach the server, even
                          when store.js classifies the failure as an
                          OUTAGE, not a conflict
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (job4، صيد الأخطاء).

   الفجوة التي وُجدت بالتشغيل الفعلي — لا بالقراءة · THE GAP FOUND BY
   ACTUALLY RUNNING IT, NOT BY READING CODE
   -------------------------------------------------------------------------
   قِسنا: خادم التمرين يُقتَل أثناء حفظ تسوية عهدة. store.js:226-228
   (classifyError) يصنّف فشل اتصالٍ حقيقياً كهذا 'network' بحقٍّ — وflush()
   عندئذٍ يضبط remoteReady=false ويُخرِج المهمة من الطابور دون أن يسجّلها
   تعارضاً (وهذا سليمٌ بذاته: عهدنا الشبكة قد تنقطع فعلاً، والمهمة تبقى في
   الطابور المحلي لإعادة إرسالها عند عودة الاتصال). لكن save-guard.js
   (السطر ١٦٤): `if (... && !Store.isOnline()) return;` — يتخطّى فحصه
   كلياً بمجرد أن يصبح Store.isOnline() false، بافتراض أنّ هذا يعني «مهمة
   محليّة مشروعة، لا داعي للتحذير». وقِسنا فعلاً: Store.isOnline() يصبح
   false خلال أقل من ثانية من موت الخادم — أي قبل أن يحين موعد فحص
   save-guard.js (بعد ٢٥٠٠ مللي‌ثانية) بوقتٍ طويل. فشريطه الأحمر لا يظهر
   إطلاقاً لهذا المسار — أُثبِت بتشغيل _trials/t07-browser-hunt-fixes.js
   (job4): ٩٫٥ ثوانٍ استطلاعاً كاملاً، لا ظهور. والنموذج يُغلَق (entity.js
   commit()) والتنبيه الذي يظهر لا يذكر الخادم أو وصول الحفظ من قريبٍ أو
   بعيد — فلا شيء يخبر أ. أحمد أنّ المستند لا يزال على هذا الجهاز فقط.

   MEASURED: the practice server is killed mid-save of a custody
   settlement. store.js:226-228 (classifyError) correctly classifies a
   real connection failure like this as 'network' — and flush() then sets
   remoteReady=false and drops the job out of the queue's error path
   WITHOUT filing it as a conflict (which is correct behaviour on its own:
   a real network outage should leave the job queued locally for a later
   retry). But save-guard.js (line 164): `if (... && !Store.isOnline())
   return;` skips its own check entirely the moment Store.isOnline()
   turns false, on the assumption that this means "a legitimately queued
   local job, nothing to warn about." MEASURED: Store.isOnline() goes
   false in well under a second of the server dying — long before
   save-guard.js's own check would even fire (2,500ms later). So its red
   banner NEVER appears on this path — proven by running
   _trials/t07-browser-hunt-fixes.js (job4): a full 9.5-second poll, no
   appearance. The form closes (entity.js commit()) and the toast that
   does appear never mentions the server or whether the save arrived —
   so nothing tells Ahmed the document is still local-only.

   لماذا ملفٌّ منفصل، لا تعديل save-guard.js · WHY A SEPARATE FILE, NOT AN
   EDIT TO save-guard.js
   -------------------------------------------------------------------------
   save-guard.js يعمل بلا عطل لكل الحالات الأخرى (رفض صلاحيات، عمود ناقص،
   تعارض تحديث حقيقي) وهو مُثبَتٌ ومُختبَر بذاكرة المشروع (register-row-
   click-skips-openDetail-wrappers وغيرها). لمسه يخاطر بإعادة فتح تلك
   العيوب المُصلَحة فيه (نافذتان تتنازعان #modalHost، مؤقّتات متراكمة).
   نطاقنا هنا أضيق ومختلف تماماً في النيّة: لا نتجاهل حالة «غير متصل»
   إطلاقاً — بل هي بالضبط الحالة التي نتحقّق فيها، لأن انقطاعاً حقيقياً في
   لحظة الحفظ هو أخطر لحظة على الإطلاق (لا نسخة أخرى من القيد المكتوب إلا
   على هذا الجهاز). الملفان يعملان معاً بلا تعارض: كلاهما يلفّ Store.create/
   Store.save بنفس نمط التركيب الإضافي (لا يستبدل أحدهما الآخر).
   save-guard.js works correctly for every OTHER case (permission refusal,
   a missing column, a genuine update conflict) and is proven/tested in
   project memory. Touching it risks reopening bugs already fixed there
   (two modals fighting over #modalHost, piled-up timers). Our scope here
   is narrower and different in intent on purpose: we do NOT skip the
   "offline" state at all — that is EXACTLY the state we check, because a
   real outage at the moment of saving is the single most dangerous
   moment there is (no other copy of what was written exists anywhere but
   this device). The two files coexist without conflict: both wrap
   Store.create/Store.save in the same additive pattern (neither replaces
   the other).

   لماذا محصور بشاشات المكتب فقط، لا كل الموقع · WHY SCOPED TO THE DESK'S
   OWN SCREENS ONLY, NOT THE WHOLE PORTAL
   -------------------------------------------------------------------------
   توسيع هذا لكل شاشة يعني تغيير سلوك مُلاحَظ في كل شاشات الموقع بلا طلبٍ
   بذلك (البند ١٩: لا نبني شيئاً جديداً في مكانٍ لم يُطلَب). النطاق هنا هو
   بالضبط ما أضافه desk-finance-modules.js (المال الخمس + الخزائن) زائد
   الوحدتين الجديدتين — القوائم العامة التي كشفها ذلك الملف نفسه
   (MONEY_MODULES_SITE_ENTRY تضم cashAccounts بالفعل، وNEW_MODULE_IDS)،
   لا قائمة جديدة نحتفظ بها هنا يمكن أن تُنسى وتصبح قديمة (ذاكرة المشروع:
   hand-kept-lists-rot).
   Widening this to every screen would change observed behaviour across
   the whole portal with nobody having asked for that (Order 19: never
   build something new in a place nobody asked for). The scope here is
   exactly what desk-finance-modules.js itself added (the five money
   screens + cash boxes) plus the two new modules — the SAME public lists
   that file already exposes (MONEY_MODULES_SITE_ENTRY already includes
   cashAccounts, and NEW_MODULE_IDS) — not a second, separately
   maintained list here that could rot (project memory:
   hand-kept-lists-rot).

   إضافي بالكامل — حذف هذا الملف يعيد الحال إلى ما كان عليه: save-guard.js
   وحده، بسلوكه الحالي بالحرف، بلا أي أثر آخر.
   Fully additive — deleting this file returns things exactly to how they
   were: save-guard.js alone, its current behaviour verbatim, nothing else
   affected.
   ========================================================================= */
(function (global) {
  'use strict';

  /* 🔴 قيسَ بالتشغيل الفعلي، لا افتُرِض — عطلٌ اتصالٍ حقيقيٌّ (خادمٌ مقتول)
     يأخذ نحو ٧ ثوانٍ ليستقرّ الوعد بالرفض في هذا المتصفّح (fetch ثم
     TypeError: Failed to fetch) — لا رفضاً فورياً كما افتُرِض أول مرة.
     وحفظٌ ناجحٌ على اتصالٍ سليمٍ محلياً استقرّ خلال ١٢ مللي‌ثانية فقط. فمهلة
     الانتظار الأولى هنا صغيرة عمداً (٥٠٠، لا ٢٥٠٠ مثل save-guard.js) لأن
     أغلب الميزانية المطلوبة (٨ ثوانٍ) يستهلكها انتظار الشبكة نفسها لا
     شيء آخر — تركُ مهلةٍ أطول هنا كان سيتجاوز الثماني ثوانٍ المطلوبة
     بالكامل. الثمن: قد يومض الشريط لحظة ثم يختفي تلقائياً في حفظٍ بطيءٍ
     لكنه ناجح على اتصال ضعيف حقيقي (موقعٍ ببطء إنترنت) — مقبولٌ لأن الشريط
     يُزال فوراً بمجرد وصول التأكيد (لا يبقى خطأً)، وهذا أفضل بكثير من صمتٍ
     تامّ في الانقطاع الحقيقي.
     🔴 MEASURED by actually running it, not assumed — a REAL connection
     failure (a killed server) takes about 7 SECONDS for the promise to
     settle into rejection in this browser (fetch, then "TypeError: Failed
     to fetch") — not an instant refusal as first assumed. A successful
     save on a healthy LOCAL connection settled in just 12ms. So the first
     wait here is deliberately small (500ms, not save-guard.js's 2,500ms)
     because most of the required 8-second budget is eaten by the network
     wait itself, not by anything else — a longer first wait here would
     have blown straight through the required 8 seconds. The cost: on a
     slow-but-genuinely-succeeding save over a real weak connection (a
     site with poor internet), the bar may flash briefly before clearing
     itself automatically — acceptable, because it clears the instant
     confirmation arrives (it never stays wrongly red), and that is far
     better than total silence during a real outage. */
  var WAIT_MS = 200;   /* هامش أوسع أثبته التشغيل — انظر القياس أعلاه (٧,٧٠٦ مللي‌ثانية
                           بمهلة ٥٠٠) — ٢٠٠ يترك هامشاً أكبر تحت سقف الثماني ثوانٍ
                           A wider margin proven by running it — see the
                           measurement above (7,706ms at a 500ms wait) — 200
                           leaves more room under the 8-second ceiling. */
  var POLL_MS = 4000;   /* إعادة محاولة دورية حتى يصل الصفّ فعلاً — لا نتخلّى أبداً
                            periodic retry until the row genuinely lands — never gives up */

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return isAr() ? o.ar : o.en; }

  /* نطاق الجداول — من القوائم العامة التي يكشفها desk-finance-modules.js
     بالفعل، لا قائمة محفوظة هنا يدوياً (انظر رأس الملف).
     The table scope — from the PUBLIC lists desk-finance-modules.js
     already exposes, never a hand-kept list here (see file header). */
  var _tables = null;
  function scopeTables() {
    if (_tables) return _tables;
    _tables = [];
    if (!global.DeskFinanceModules || !global.Schema) return _tables;
    var ids = (global.DeskFinanceModules.MONEY_MODULES_SITE_ENTRY || [])
      .concat(global.DeskFinanceModules.NEW_MODULE_IDS || []);
    ids.forEach(function (id) {
      var mod = Schema.get(id);
      var t = mod ? mod.table : id;
      if (t && _tables.indexOf(t) === -1) _tables.push(t);
    });
    return _tables;
  }
  /* يُعاد الحساب مرّة كل نداء تركيب فقط — desk-finance-modules.js يُحمَّل
     قبل هذا الملف (خطة الملفات)، فالقوائم جاهزة وقت أول حفظ حقيقي دائماً؛
     resetScope() موجودة فقط لتجربة t07 (تعيد بناء الموقع بين red/green).
     Recomputed once per install call only — desk-finance-modules.js loads
     before this file (file plan), so the lists are ready by the time any
     real save happens; resetScope() exists only for t07's trial (it
     rebuilds the site between red/green). */
  function resetScope() { _tables = null; }

  var pendingSet = {};  /* "table:id" → {table, id} — ما لم يصل الخادم بعد بعد
                            "table:id" → {table, id} — what has not reached the server yet */

  function renderBanner() {
    var n = Object.keys(pendingSet).length;
    var existing = document.getElementById('azSaveHonestyBar');
    if (n === 0) { if (existing) existing.remove(); return; }
    var suffix = n > 1 ? ' (' + n + ')' : '';
    var text = L({
      ar: 'لم يصل الحفظ إلى الخادم بعد — المسودة على هذا الجهاز فقط؛ أعد المحاولة عند عودة الاتصال' + suffix,
      en: 'The save has not reached the server yet — the draft is only on this device; retry when the connection returns' + suffix
    });
    if (existing) {
      var span = existing.querySelector('[data-honesty-text]');
      if (span) span.textContent = text;
      return;
    }
    var bar = document.createElement('div');
    bar.id = 'azSaveHonestyBar';
    /* لا زرّ إغلاق عمداً — «يبقى حتى يصل الصفّ فعلاً» يعني أن لا أحد
       يستطيع إخفاءه ظنّاً أنه انتهى؛ الكود وحده يزيله عند التأكّد.
       NO close button, on purpose — "stays until the row genuinely lands"
       means nobody can hide it believing it is resolved; only the code
       removes it, once confirmed. */
    /* شريط save-guard.js (إن ظهر) يستعمل نفس أعلى الصفحة — نضع شريطنا
       تحته مباشرة بدل التزاحم على نفس المكان.
       save-guard.js's own bar (if shown) sits at the same top-of-page
       spot — place ours directly BELOW it instead of fighting for the
       same spot. */
    var guardBar = document.getElementById('azSaveGuardBar');
    var top = guardBar ? guardBar.getBoundingClientRect().height : 0;
    bar.style.cssText =
      'position:fixed;inset-inline:0;top:' + top + 'px;z-index:9998;background:#b42318;color:#fff;' +
      'padding:10px 16px;font:600 14px/1.6 Tahoma,Arial,sans-serif;text-align:center;' +
      'box-shadow:0 2px 12px rgba(0,0,0,.3)';
    var span = document.createElement('span');
    span.setAttribute('data-honesty-text', '');
    span.textContent = text;
    bar.appendChild(span);
    document.body.appendChild(bar);
  }

  function markPending(table, id, key) { pendingSet[key] = { table: table, id: id }; renderBanner(); }
  function clearPending(key) { if (pendingSet[key]) { delete pendingSet[key]; renderBanner(); } }

  /* ═══════════════════════════════════════════════════════════════════
     التحقّق — لا يتخطّى شيئاً بسبب Store.isOnline()، عمداً (انظر رأس الملف)
     THE CHECK — never skips on Store.isOnline(), on purpose (see header)
     ═══════════════════════════════════════════════════════════════════ */
  function tick(table, id) {
    var key = table + ':' + id;
    var client = global.Auth && Auth.client && Auth.client();
    if (!client) { scheduleNext(table, id); return; }
    var q;
    try { q = client.from(table).select('id').eq('id', id).maybeSingle(); }
    catch (e) { markPending(table, id, key); scheduleNext(table, id); return; }
    Promise.resolve(q).then(function (res) {
      if (res && !res.error && res.data && res.data.id) { clearPending(key); return; }
      markPending(table, id, key);
      scheduleNext(table, id);
    }).catch(function () {
      markPending(table, id, key);
      scheduleNext(table, id);
    });
  }
  function scheduleNext(table, id) {
    setTimeout(function () { tick(table, id); }, POLL_MS);
  }
  function verify(table, id) {
    if (!scopeTables().length || scopeTables().indexOf(table) === -1) return;
    setTimeout(function () { tick(table, id); }, WAIT_MS);
  }

  /* ═══════════════════════════════════════════════════════════════════
     التركيب — نفس نمط save-guard.js بالحرف: لفّ إضافي، لا استبدال
     INSTALL — the exact same pattern as save-guard.js: an additive wrap,
     never a replacement. Never blocks the queue's own retry — this file
     only READS (select), it never touches the queue or Store.flush().
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    if (!global.Store || Store.__saveHonesty) return;
    Store.__saveHonesty = true;

    var origCreate = Store.create;
    Store.create = function (table, data, opts) {
      var row = origCreate.apply(Store, arguments);
      if (row && row.id) verify(table, row.id);
      return row;
    };
    var origSave = Store.save;
    Store.save = function (table, id, patch, opts) {
      var row = origSave.apply(Store, arguments);
      if (row && row.id) verify(table, row.id);
      return row;
    };
    console.info('desk-save-honesty.js ready — desk saves are re-checked even when Store.isOnline() is false.');
  }

  install();
  [0, 500, 2000, 5000].forEach(function (ms) { setTimeout(install, ms); });

  global.DeskSaveHonesty = { pendingCount: function () { return Object.keys(pendingSet).length; }, resetScope: resetScope };
})(window);

/* =========================================================================
   desk-finance-sync-guard.js — يمنع سباق «إعادة تحميل» يُفقد مستند العهدة
                                 كليةً بعد أول ضغطة F5
                                 PREVENTS A "RELOAD" RACE THAT LOSES A
                                 CUSTODY DOCUMENT ENTIRELY AFTER THE FIRST F5
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢).

   العَرَض الذي دفع هذا الملف · THE SYMPTOM THAT CAUSED THIS FILE
   -------------------------------------------------------------------------
   مسودة تسوية عهدة (CS-2026-0001) يؤكد الخادم نفسه وجودها (REST مباشر:
   count=1, error=null) — لكنها تختفي كلياً من `Store.all('custodySettlements')`
   بعد إعادة تحميل الصفحة (F5) لنفس المحاسب طنطا. ليست مسألة سياج مواقع
   (desk-money-site.js) إطلاقاً — تحققتُ بالتشغيل، لا بالتخمين: الصفّ لا
   يظهر حتى في القائمة الخام غير المُقيَّدة، فالعطل قبل أي سياج بمراحل.
   A saved custody-settlement draft (CS-2026-0001) — the SERVER itself
   confirms it exists (a direct REST read: count=1, error=null) — vanishes
   COMPLETELY from `Store.all('custodySettlements')` after the SAME Tanta
   accountant reloads the page (F5). This is not a site-fence question
   (desk-money-site.js) at all — verified by RUNNING, never guessed: the
   row is missing even from the raw, unfenced list, so the fault sits
   stages before any fence could even run.

   السبب الجذري بالضبط، بالسطر · THE EXACT ROOT CAUSE, BY LINE
   -------------------------------------------------------------------------
   store.js:60-67 (tableNames()) يبني قائمة الجداول التي يجلبها
   loadRemote() بفلترة `Auth.canSee(mod.id)` — لقطة واحدة، لحظة النداء،
   لا تُعاد أبداً بعدها. store.js:139-156 (initialize()) يستدعيها فوراً.
   app.js:31 (boot()) يستدعي `await Auth.restore()` ثم `loadWorkspace()` →
   `Store.initialize()` — وrestore() هنا سريع جداً (الجلسة محفوظة محلياً
   بالفعل)، بينما desk-finance-roles.js — الملف الوحيد الذي يمنح دور
   accountant صلاحية 'view' على custodyTransfers/custodySettlements —
   يُحمَّل بعد app.js بمئات الأسطر في loader.js (كتلة الشريحة الثانية
   تحديداً). فحص فعلي (زُرع تسجيلٌ زمني في نسخة مؤقتة، وأُزيل بعد التأكيد):
     - تسجيل دخول عادي (كل الملفات محمَّلة بالفعل قبل ضغطة الدخول اليدوية):
       Store.initialize يُستدعى بعد ٥٨٢ مللي ثانية، وDeskFinanceRoles محمَّل
       بالفعل (perms.custodySettlements=["view","create","edit","send","review"]).
     - نفس الحساب، بعد F5 (استعادة الجلسة تلقائية، بلا انتظار بشري):
       Store.initialize يُستدعى بعد ١٣٨ مللي ثانية فقط — وDeskFinanceRoles
       لم يُحمَّل بعد (perms.custodySettlements=undefined، Auth.canSee=false).
       فتُستبعد custodySettlements من tableNames() تلك اللحظة، ولا شيء
       يُعيد جلبها بعدها أبداً — حتى بعد أن يكتمل تحميل desk-finance-roles.js
       فعلياً ويصبح Auth.canSee=true (تحقّقتُ: يصبح صحيحاً، لكن بعد فوات
       أوان اللقطة الوحيدة).
   هذا عطلٌ في توقيت التحميل بين ملفَّين إضافيَّين لهذه الشريحة، لا في
   منطق سياج المواقع الذي اقترحته المهمة كفرضية أولى — الفرضية كانت خاطئة،
   والفحص هو من صحّحها.
   THE EXACT ROOT CAUSE, BY LINE
   -------------------------------------------------------------------------
   store.js:60-67 (tableNames()) builds the list loadRemote() fetches by
   filtering on `Auth.canSee(mod.id)` — ONE snapshot, taken at call time,
   never retaken. store.js:139-156 (initialize()) calls it immediately.
   app.js:31 (boot()) does `await Auth.restore()` then `loadWorkspace()` →
   `Store.initialize()` — and restore() here is FAST (the session is
   already cached locally), while desk-finance-roles.js — the ONLY file
   that grants the accountant role 'view' on custodyTransfers/
   custodySettlements — loads hundreds of lines after app.js in
   loader.js (specifically inside the slice-2 block). Measured directly
   (a temporary timing log was planted in a scratch copy and removed once
   confirmed):
     - a normal LOGIN (every file has already finished loading before the
       human clicks the button): Store.initialize is called at 582ms, and
       DeskFinanceRoles has ALREADY loaded
       (perms.custodySettlements=["view","create","edit","send","review"]).
     - the SAME account, after an F5 (session restore is automatic, no
       human reaction time to wait out): Store.initialize is called at
       only 138ms — and DeskFinanceRoles has NOT loaded yet
       (perms.custodySettlements=undefined, Auth.canSee=false). So
       custodySettlements is excluded from that one-time tableNames()
       snapshot, and NOTHING ever re-fetches it afterward — even once
       desk-finance-roles.js finishes loading moments later and
       Auth.canSee genuinely becomes true (confirmed: it does — just too
       late for the snapshot that already ran).
   This is a LOAD-TIMING race between two of this slice's own additive
   files, not the site-fence logic the task named as its first hypothesis
   — that hypothesis was wrong, and running the trial is what corrected it.

   لماذا لا يُصلَح داخل desk-money-site.js · WHY NOT INSIDE desk-money-site.js
   -------------------------------------------------------------------------
   ملف desk-money-site.js يلفّ Auth.scopeRows — طبقة تصفية تعمل على صفوفٍ
   وصلت بالفعل من الخادم. العطل هنا أسبق بمرحلة كاملة: الصفّ لا يصل قط
   إلى ذاكرة المتصفح (cache) لأن اسم الجدول نفسه غاب عن قائمة الجلب. لا
   تصفية تستطيع أن تُظهر صفّاً لم يُجلَب إطلاقاً. المِفصل الصحيح هو
   Store.initialize نفسها — تحديداً، اللحظة التي تُستدعى فيها.
   desk-money-site.js wraps Auth.scopeRows — a filtering layer that runs
   on rows that have ALREADY arrived from the server. This fault sits a
   full stage earlier: the row never reaches the browser's cache at all,
   because the table's own name was missing from the fetch list. No
   filter can show a row that was never fetched. The correct seam is
   Store.initialize itself — specifically, the MOMENT it is called.

   الإصلاح · THE FIX
   -------------------------------------------------------------------------
   يلفّ Store.initialize من الخارج (نمط مُثبَت هنا تماماً: desk-money-
   site.js يفعل الشيء نفسه بلفّ Auth.scopeRows) لينتظر — قبل تمرير النداء
   إلى الأصل — حتى يوجد `global.DeskFinanceRoles` (العلامة التي يضعها
   desk-finance-roles.js في آخر سطر له، بعد اكتمال كل منحه لِـ
   Auth.ROLES). هذا هو بالضبط، ولا شيء غيره، ما يحتاجه tableNames() ليرى
   custodyTransfers/custodySettlements. الانتظار يُقاس (يُستطلَع كل ١٠
   مللي ثانية) لا يُخمَّن بمهلة ثابتة — نفس فلسفة حزام محاولات
   site-fence-retry.js، لكن بشرطٍ حقيقي بدل تأخير أعمى. مهلة قصوى ٤
   ثوانٍ: لو لم يُحمَّل desk-finance-roles.js إطلاقاً (ملف مفقود من
   الموقع مثلاً)، لا يُعلَّق تسجيل الدخول إلى الأبد — يمضي بعد المهلة مع
   تحذير في الطرفية، فتعود المشكلة الأصلية (لا أسوأ منها) بدل تجميد كامل.
   Wraps Store.initialize from the outside (the EXACT pattern already
   proven here: desk-money-site.js does the same to Auth.scopeRows) to
   wait — before handing the call to the original — until
   `global.DeskFinanceRoles` exists (the flag desk-finance-roles.js sets
   on its very last line, after every one of its Auth.ROLES grants has
   landed). That is exactly, and only, what tableNames() needs to see
   custodyTransfers/custodySettlements. The wait is MEASURED (polled
   every 10ms), never a guessed fixed delay — the same philosophy as
   site-fence-retry.js's retry ladder, but gated on a real condition
   instead of blind timing. A 4-second ceiling: if desk-finance-roles.js
   never loads at all (say, missing from the deployed site), login is
   never hung forever — it proceeds after the ceiling with a console
   warning, so the fallback is exactly today's bug, never a worse freeze.

   لماذا هنا في ترتيب التحميل · WHY THIS SLOT IN LOAD ORDER
   -------------------------------------------------------------------------
   يجب أن يُحمَّل ويُنفَّذ قبل app.js (الذي يستدعي boot() فور اكتمال
   تحميله غالباً، لأن DOMContentLoaded يكون قد مضى منذ زمن طويل — نفس
   ملاحظة site-fence-retry.js تماماً). يوضَع هنا، فوراً بعد
   desk-finance-modules.js، لأنه لا يحتاج شيئاً آخر (Store وحده)، وهذا
   أول مكان في القائمة يوجد فيه Store عملياً بعد null-writeback-guard.js
   وschema.js. ليس له أي علاقة وظيفية بمحتوى desk-finance-modules.js —
   فقط قرب موضعي في الكتلة نفسها لسهولة القراءة.
   Must be loaded and RUN before app.js (which calls boot() the moment
   its own script finishes executing, in practice — DOMContentLoaded has
   almost always already fired by then, exactly as site-fence-retry.js's
   own header explains). Placed here, immediately after
   desk-finance-modules.js, because it needs nothing but Store, and this
   is the first slot in the list where Store already exists. It has no
   functional link to desk-finance-modules.js's own content — only a
   position kept in the same block for readability.

   إضافي بالكامل — حذف هذا الملف يعيد العطل الأصلي بالضبط، دون أي أثر
   آخر: لا حقل، لا جدول، لا شاشة تتغيّر. store.js نفسه غير مُعدَّل.
   Fully additive — deleting this file restores EXACTLY today's bug, and
   nothing else changes: no field, no table, no screen. store.js itself
   is never touched.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store) {
    console.error('desk-finance-sync-guard.js needs store.js first — not installed');
    return;
  }
  if (Store.__deskFinanceSyncGuardInstalled) return;
  Store.__deskFinanceSyncGuardInstalled = true;

  var MAX_WAIT_MS = 4000;
  var POLL_MS = 10;

  /* الشرطان الحقيقيّان المطلوبان — لا وقت، لا حدث · THE TWO REAL CONDITIONS
     NEEDED — never a timer, never an event. desk-finance-roles.js sets its
     flag on its OWN last line, after every Auth.ROLES grant has already
     landed — waiting for it is waiting for the exact fact tableNames()
     needs. 🔴 desk-finance.js's install probe («الخطر ١» — بدونه لا
     يدخل أي موظف مالية إن بقي جدولا العهدة مسجَّلين بلا جدولين حقيقيَّين)
     يلفّ Store.initialize في المرّة الثانية — بعد هذا الملف في ترتيب
     التحميل (سطر ١١٣١ إذاً ١١٦٧ في loader.js) — فلو أعاد هذا الحارس
     نداءه إلى original بمجرد جهوزية الأدوار وحدها، قد يسبق ذلك تحميل
     desk-finance.js على إعادة تحميل سريعة (F5)، فيُنفَّذ الفحص الحقيقي
     (Store.initialize) قبل أن يُثبَّت الفاحص فوقه إطلاقاً — نفس فخّ
     السباق، بترتيب مختلف. الانتظار حتى وجود global.DeskFinance أيضاً
     يضمن أن كتلة desk-finance.js نفّذت installProbe() بالفعل (تسجّل
     global.DeskFinance في آخر سطر لها، بعد إعادة اللفّ) قبل أن يُكمل
     هذا الحارس، فتلتقط اللفّة النهائية للـ property الحيّة لا نسخة
     قديمة منها.
     🔴 desk-finance.js's install probe (danger 1 — without it, NO
     finance employee can log in if the two custody tables stay
     registered with no real tables behind them) wraps Store.initialize
     a SECOND time — after this file in load order (line 1131, then 1167
     in loader.js) — so if this guard resumed the moment roles alone were
     ready, on a fast F5 that could still be BEFORE desk-finance.js has
     loaded, running the real Store.initialize before the probe was ever
     installed on top of it — the same race, in a different shape. Also
     waiting for global.DeskFinance to exist guarantees desk-finance.js's
     own IIFE has already run installProbe() (it sets global.DeskFinance
     on its very last line, after the re-wrap) before this guard
     completes, so the live property it eventually reads back reflects
     the FINAL wrap, not a stale one. */
  function rolesGranted() { return !!global.DeskFinanceRoles && !!global.DeskFinance; }

  function waitForRoles() {
    if (rolesGranted()) return Promise.resolve(true);
    return new Promise(function (resolve) {
      var waited = 0;
      var iv = setInterval(function () {
        waited += POLL_MS;
        if (rolesGranted()) { clearInterval(iv); resolve(true); }
        else if (waited >= MAX_WAIT_MS) {
          clearInterval(iv);
          console.warn('desk-finance-sync-guard: desk-finance-roles.js/desk-finance.js did not both load ' +
            'within ' + MAX_WAIT_MS + 'ms — proceeding without the wait. custodyTransfers/custodySettlements ' +
            'may not sync this session (today\'s pre-existing reload bug), never a hang.');
          resolve(false);
        }
      }, POLL_MS);
    });
  }

  var origInitialize = Store.initialize;   /* store.js's OWN raw initialize — captured once, at THIS file's load time */

  /* 🔴 علامة إعادة الدخول — لا تكرار انتظار · REENTRANCY FLAG — never wait
     twice. THE SECOND RACE, found while fixing the first: this guard's own
     `guardedInitialize` below is captured by desk-finance.js's probe as
     ITS "orig" (installProbe() reads `Store.initialize` at ITS OWN load
     time, which is already `guardedInitialize`, since this file loads
     first). So once desk-finance.js has installed its probe wrapper, the
     LIVE `Store.initialize` property is: probe → guardedInitialize → store.js.
     But boot() may call `Store.initialize()` BEFORE the probe has wrapped
     anything (a fast F5 — see this file's header) — at that instant the
     property is only `guardedInitialize`, so THAT is the function actually
     invoked and awaited. If it simply called the frozen `origInitialize`
     once its wait was done, the probe — installed on top of it MEANWHILE,
     while it was waiting — would never run at all for this page load,
     because nothing else ever calls `Store.initialize()` again. So instead,
     once the wait is over, this function re-reads the LIVE `Store.initialize`
     property: if something re-wrapped it in the meantime (the probe), it
     calls THAT (routing the call back out through the probe, which then
     calls back into this very function) — and the reentrancy flag makes
     that SECOND pass through fall straight to `origInitialize`, so the
     real fetch still runs exactly once, with the probe having had its turn
     first.
     🔴 THE SECOND RACE, found while fixing the first — same idea in
     Arabic above. Without the flag, "call the live property instead of the
     frozen original" would recurse forever (probe → this function → live
     property → probe → …). */
  var inFlight = false;
  function guardedInitialize() {
    var self = guardedInitialize;
    if (inFlight) {
      /* نداء ثانٍ عبر لفّة لاحقة (الفاحص) أثناء انتظار النداء الأول —
         نفّذ الأصل مباشرة، لا مزيد من الانتظار · a second call arriving
         via a LATER wrap (the probe) while the first call's own wait is
         still resolving — run the true original directly, no more waiting. */
      return origInitialize.apply(Store, arguments);
    }
    var args = arguments;
    inFlight = true;   /* يبقى صحيحاً طوال أي نداء متداخل عبر الفاحص أدناه · stays true through any nested call the probe makes below */
    return waitForRoles().then(function () {
      /* 🔴 لا ننتظر إلا في أول نداء لكل جلسة (initialize يُستدعى أيضاً بعد
         تسجيل خروج/دخول متتالٍ في نفس التبويب، وrolesGranted() تكون
         صحيحة فوراً حينها) · we only ever actually WAIT on the very first
         call of a session — a same-tab logout/login finds rolesGranted()
         already true, so this settles immediately with no extra delay. */
      var live = Store.initialize;
      /* شخصٌ آخر (الفاحص) أعاد لفّ Store.initialize في أثناء الانتظار —
         مرّر النداء إليه، لا إلى original المجمَّد، ليأخذ الفاحص دوره قبل
         الجلب الحقيقي؛ نداؤه الداخلي لـ origInitialize يعود إلى هذه
         الدالة نفسها، وinFlight ما زالت صحيحة فيسقط في الفرع الأول أعلاه
         مباشرة إلى original · someone else (the probe) re-wrapped
         Store.initialize while we waited — hand the call to THAT, not the
         frozen original, so the probe gets its turn before the real
         fetch; its own internal call back into this same function finds
         inFlight still true and falls straight to the branch above. */
      return (live !== self ? live : origInitialize).apply(Store, args);
    }).finally(function () { inFlight = false; });
  }
  Store.initialize = guardedInitialize;

  console.info('desk-finance-sync-guard.js ready — Store.initialize now waits for desk-finance-roles.js ' +
    'AND desk-finance.js\'s install probe before its one-time table list is built, closing both the ' +
    'original reload race (a saved custody settlement vanishing from Store.all() after F5) and the ' +
    'probe-bypass race found while fixing it.');
})(window);

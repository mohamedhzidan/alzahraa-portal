/* =========================================================================
   manager-change-feed.js — «تغييرات فريقك»: ما غيّره أو ألغاه من هم في
                            نطاق إشراف المدير — من، ومتى، ولماذا
                            THE MANAGER'S CHANGE FEED — what the people
                            inside a manager's scope changed or cancelled,
                            with who, when and why
   -------------------------------------------------------------------------
   الحكم · THE OWNER'S RULING (.claude/memory/DECISIONS.md:1540-1556، حكم ٥،
   ٩ سبتمبر ٢٠٢٦، بنصّه):

     «if i am hr manager and in khalata, now i have access to all hrs in all
      other sites, so when any of those hrs changes anything or delete i get
      notified (in a separate place maybe to lessen the crowd), with all
      details, reason, and who and when was that but ofc if a regualrr
      employee no he doesnt see that»

   وحكم ٤ في نفس الجلسة عن محتوى السطر الواحد:

     «any editing is save with time, reasoning and the changes are saved…
      say exactly what was changed and by who by what time and why… make
      this place uneditable by others so no one plays in it»

   -------------------------------------------------------------------------
   🔴 أين تظهر بالضبط، وبأي زرّ يصل إليها المدير — خطوة بخطوة
   🔴 EXACTLY WHERE THIS APPEARS, AND WHICH EXISTING BUTTON REACHES IT

     ١. المدير يفتح البوابة ويسجّل الدخول كالمعتاد.
     ٢. يضغط **جرس التنبيهات** أعلى الشاشة (index.html، الزرّ id="alertsBtn"،
        الموصول في app.js:302-303) — أو «التنبيهات» في القائمة الجانبية
        (app.js:172، نفس الوجهة تماماً: App.go('alerts')).
     ٣. تُرسم شاشة التنبيهات المعتادة كما هي اليوم حرفياً، بلا أي تغيير.
     ٤. **أسفلها**، بطاقة منفصلة عنوانها «تغييرات فريقك — من غيّر ماذا ومتى
        ولماذا». هذه هي المكان المنفصل الذي طلبه.

     A manager signs in → presses the **alerts bell** at the top of the
     screen (index.html, button id="alertsBtn", wired at app.js:302-303) —
     or «التنبيهات» in the side menu (app.js:172, the identical
     destination, App.go('alerts')) → the ordinary alerts screen renders
     exactly as it does today → and **beneath it** sits one separate card,
     «تغييرات فريقك». That card is the "separate place" he asked for.

   لماذا هنا ولا مكان آخر · WHY HERE AND NOWHERE ELSE — ثلاثة أسباب مقيسة:

     ١) هذا هو مكان الإشعارات القائم فعلاً في البوابة. القاعدة رقم ١٩ في
        CLAUDE.md مكتوبة بدم حادثة سابقة: اختُرع زرّ جديد داخل لوحة لم يرها
        المالك قط، فاستنتج بحقّ أن شيئاً لم يعمل. فلا لوحة جديدة، ولا زرّ
        جديد، ولا شاشة جديدة — الجرس الذي يضغطه أصلاً.
     ٢) إضافة **مسار جديد** (صفحة مستقلة في القائمة) مستحيل إضافياً: app.js
        يبني القائمة من خمس مجموعات مكتوبة بالنصّ (app.js:168-182) ويوجّه
        بسلسلة if مكتوبة بالنصّ (app.js:248-254)، وapp.js من الملفات التي لا
        تُعدَّل. صفحة بلا زرّ في القائمة = صفحة لا يجدها أحد = نفس خطأ
        القاعدة ١٩ مرة أخرى.
     ٣) «in a separate place maybe to lessen the crowd»: البطاقة **لا
        تُدمَج** في قائمة التنبيهات إطلاقاً، ولا تدخل Alerts.list ولا
        Alerts.count، فلا يتغيّر رقم الجرس ولا شارة القائمة الجانبية ولا
        بطاقتا لوحة التحكم بحرف واحد. الزحام لم يزد.

     (1) This is the portal's existing notification place. CLAUDE.md rule 19
         exists because a previous build invented a button inside a panel the
         owner had never seen. No new panel, no new button, no new screen.
     (2) A NEW ROUTE is impossible additively: app.js builds the menu from
         five hardcoded groups (app.js:168-182) and routes with a hardcoded
         if-chain (app.js:248-254), and app.js is read-only. A page with no
         menu button is a page nobody finds — rule 19 all over again.
     (3) "a separate place to lessen the crowd": this card is NEVER merged
         into Alerts.list or Alerts.count, so the bell number, the sidebar
         badge and both dashboard cards do not change by one character.

   -------------------------------------------------------------------------
   🔴 لماذا نلفّ Alerts.render ولا نلفّ UI.modal هنا
   🔴 WHY Alerts.render IS THE HOOK, AND UI.modal IS NOT

   قاعدة المشروع «لفّ UI.modal ولا تراقب الـDOM» تخصّ **النماذج**، لأنها
   تُفتح داخل #modalHost فلا يراها مراقب #content. لا يوجد نموذج هنا: هذه
   شاشة، وapp.js:250 ينادي `Alerts.render(host)` **المُصدَّرة** بالاسم. فاللفّ
   الصحيح هو لفّ الاسم المُصدَّر — وهو بالضبط ما يفعله dc-alerts.js:292
   المُثبَت في هذا الموقع منذ نسخ. (UI.modal تُستَدعى هنا لفتح «عرض الكل»،
   لا تُلفّ.)

   The project rule "wrap UI.modal, don't watch the DOM" is about FORMS,
   which open inside #modalHost. There is no form here: this is a SCREEN,
   and app.js:250 calls the EXPORTED `Alerts.render(host)` by name. The
   correct hook is therefore the exported name — exactly what dc-alerts.js:292
   already proves in this codebase. (UI.modal is CALLED here to open the
   "show all" dialog; it is not wrapped.)

   ⚠️ ولهذا السبب يجب أن يُحمَّل هذا الملف **بعد dc-alerts.js**، فهو آخر ملف
   يستبدل Alerts.render كاملةً. لو حُمِّلنا قبله لَمُحيت لفّتنا بلا رسالة خطأ
   واحدة ولاختفت البطاقة تماماً. فحص ذاتي في نهاية الملف يصرخ إن حدث ذلك.
   ⚠️ Hence this file MUST load AFTER dc-alerts.js, the last file that
   REPLACES Alerts.render outright. Loaded before it, our wrapper would be
   erased with no error at all and the card would simply never appear. The
   self-check at the end of this file shouts if that ever happens.

   -------------------------------------------------------------------------
   ما هو موجود بالفعل ولم يُعَد بناؤه · WHAT ALREADY EXISTS AND WAS NOT REBUILT

     · audit-trail.js:170-183 (diff) يقارن قبل/بعد ويكتب «السعر: ١٠٠ ← ٢٠٠».
       نعرض نصّه كما هو ولا نحسب فرقاً ثانياً.
     · audit-trail.js:188-205 (cancelRecord) يكتب سبب الإلغاء الإجباري.
       نقرأه، ولا نطلب سبباً ثانياً.
     · جدول audit بلا سياسة UPDATE وبلا سياسة DELETE — مُثبَت من إعادة بناء
       Postgres حقيقية في 13-PRACTICE-ENVIRONMENT/_evidence/catalog.json:
       المنح لـauthenticated هو INSERT,SELECT فقط. فالسجل غير قابل للعبث
       أصلاً، وهذا هو «uneditable so no one plays in it». لم يُضَف شيء.
     · pages/settings.js:602-642 (الإعدادات ← السجل) جدول مسطّح بـ٤٠٠ سطر
       بلا نطاق ولا موقع ولا فريق، مبني على Store.auditLog() غير الموثوق،
       ومدفون في الإعدادات. **لم يُلمَس ولم يُستبدل** — ليس إشعاراً لمدير.
     · rollout-meter.js عدّاد «من أدخل شغلاً هذا الأسبوع» مجمَّعاً بالشخص،
       لا سجلّ تغييرات. **لم يُلمَس.** استُعير منه أسلوب الجلب وحده.

     Already built, deliberately not rebuilt: the before/after diff, the
     mandatory cancellation reason, the tamper-proof audit table itself,
     the flat Settings audit tab, and the rollout meter.

   -------------------------------------------------------------------------
   🔒 السياجان، وأيّهما الحقيقي · THE TWO FENCES, AND WHICH ONE IS REAL

     السياج الحقيقي هو **قاعدة البيانات**: سياسة audit_read (مقروءة من
     catalog.json، لا من نصّ SQL) تُرجع للموظف العادي **صفر صفوف** — لا خطأ،
     صفر صفوف — لأن فرع ELSE فيها false. فحتى لو عُطِّل جافاسكربت هذا الملف
     أو عُبث به من أدوات المطوّر، لا توجد بيانات ليعرضها.

     ⚠️ ما قِيس بالفعل وما لم يُقَس — بالنصّ، لا بالإيحاء: قِيس على القاعدة
     الحيّة أن جدول audit موجود، وأن أعمدته التسعة موجودة، وأن الوصول
     المجهول مرفوض (42501). **لم يُقَس** أن موظفاً مسجَّلاً بدور عادي يحصل
     على صفر صفوف — ذلك يحتاج حساب موظف حقيقي، ولا يجوز. وهو مقروء من نصّ
     السياسة في إعادة البناء الحقيقية (فرع ELSE = false) ومن دلالات RLS
     المعروفة. ومصفوفة الخوادم الحقيقية
     (13-PRACTICE-ENVIRONMENT/_evidence/server-matrix.json) تغطي ٦١ جدولاً
     **وليس بينها audit** — فالسياج الأهم في هذه الميزة لم يُقَس بعد بدور
     حقيقي، وهذه فجوة مُعلَنة لا مُخفاة.
     ⚠️ MEASURED versus NOT MEASURED, stated rather than implied: measured
     on the live database — the audit table exists, its nine columns exist,
     and anonymous access is refused (42501). NOT measured — that a signed-in
     ordinary employee receives zero rows; that needs a real employee account
     and is not permissible. It is read from the policy text in the real
     Postgres rebuild (ELSE = false) and from standard RLS semantics. And the
     real server matrix (server-matrix.json) covers 61 tables and audit is
     NOT one of them — so this feature's most important fence has not yet
     been measured with a real role. That gap is declared, not hidden.

     وسياج المتصفح هنا هو **الطبقة الثانية فقط**: لا نرسم البطاقة إطلاقاً
     ولا زرّاً ولا عنواناً لمن ليس في قائمة الأدوار أدناه، فشاشة التنبيهات
     للموظف العادي تبقى مطابقة حرفياً لما هي عليه اليوم.

     لم تُوسَّع أي صلاحية في هذا الملف. القائمة أدناه هي **نفس** قائمة
     قاعدة البيانات، منقوصاً منها الدور hr — انظر السبب عندها.

     The REAL fence is the database: audit_read returns ZERO ROWS (not an
     error) to an ordinary employee, because its ELSE branch is false — read
     from the real Postgres rebuild, not from SQL text. Even with this file's
     JavaScript disabled or tampered with from devtools, there is nothing to
     show. The browser gate here is only the SECOND layer: it draws no card,
     no button and no heading at all for anyone outside the role list below.
     NO PERMISSION IS WIDENED BY THIS FILE.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف فتعود شاشة التنبيهات إلى ما
   يرسمه dc-alerts.js بالحرف، ولا يتغيّر شيء آخر في البوابة إطلاقاً.
   Delete this file and the alerts screen returns to exactly what
   dc-alerts.js draws — nothing else in the portal changes.

   يُحمَّل بعد dc-alerts.js (إلزامي، أعلاه)، وبعد sites.js (يستعمل
   Auth.seesAllSites/Auth.site اللتين يثبّتهما)، وبعد auth.js وschema.js
   وui.js وi18n.js.
   Load after dc-alerts.js (mandatory, above), after sites.js (it uses
   Auth.seesAllSites/Auth.site, which sites.js installs), and after
   auth.js, schema.js, ui.js and i18n.js.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Alerts || !global.Auth || !global.Schema) {
    console.error('manager-change-feed.js needs alerts.js, auth.js and schema.js first');
    return;
  }
  if (global.Alerts.__azManagerFeedWrapped) return;

  function isAr() { return !(global.I18N && I18N.getLang && I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function esc(s) { return global.UI && UI.esc ? UI.esc(s) : String(s == null ? '' : s); }
  function attr(s) { return global.UI && UI.attr ? UI.attr(s) : String(s == null ? '' : s); }
  function icon(n, s) { return global.UI && UI.icon ? UI.icon(n, s) : ''; }
  function when(iso) { return (global.I18N && I18N.dateTime) ? I18N.dateTime(iso) : String(iso || ''); }

  /* ═══════════════════════════════════════════════════════════════════
     ٠ · الإعدادات — كل رقم هنا وحده، لا مبعثراً في الكود
         SETTINGS — every number in one place, never scattered
     ═══════════════════════════════════════════════════════════════════ */
  var WINDOW_DAYS  = 30;    /* نافذة السجل المعروضة                       */
  var FETCH_CAP    = 6000;  /* حدّ أقصى صريح بدل تصفّح بلا نهاية           */
  var PAGE_SIZE    = 1000;  /* حجم الصفحة الواحدة من الخادم               */
  var CARD_ROWS    = 12;    /* كم سطراً داخل البطاقة نفسها — «lessen the crowd» */
  var MODAL_ROWS   = 300;   /* كم سطراً في نافذة «عرض الكل»               */
  var CACHE_MS     = 60000; /* لا نُرهق الخادم عند كل إعادة رسم للشاشة    */

  /* الأفعال المعروضة في القائمة — كلماته: «changes anything or delete».
     الإنشاء **ليس** تغييراً لشيء قائم، وعرضه يغرق البطاقة بالضبط بالزحام
     الذي طلب تقليله؛ لكن إخفاءه تماماً يترك ثغرة إشراف حقيقية (موظف يضيف
     سجلاً وهمياً). فالحلّ: يُعدّ ولا يُسرَد — سطر واحد بالعدد أسفل البطاقة.
     Displayed actions — his words were "changes anything or delete".
     Creating is not changing something that existed, and listing creates
     would flood the card with exactly the crowd he asked to reduce; hiding
     them entirely would leave a real oversight hole (a fabricated record).
     So creates are COUNTED, never listed — one line under the card. */
  var LISTED_ACTIONS = ['update', 'delete', 'restore'];
  var COUNTED_ACTION = 'create';

  /* 🔒 من يرى البطاقة أصلاً — **نفس** قائمة سياسة audit_read في قاعدة
     البيانات (catalog.json)، ناقص الدور hr.
     لماذا ناقص hr: القاعدة لا تعطي hr سجلّ تغييرات إطلاقاً، بل صفوف
     **الحسابات** التي يديرها فقط (entity='users'). وهذه الصفوف مستبعَدة
     هنا بحكم مرشّح الشاشات أدناه، فبطاقة hr كانت ستظهر فارغة دائماً —
     وشاشة تَعِد بشيء ثم لا تعطيه أسوأ من غيابها. وموظف شؤون عاملين الموقع
     في نموذج المالك موظّف لا مدير.
     🔒 Who may see the card at all — the SAME list as the database's own
     audit_read policy, minus the `hr` role. The database never gives `hr`
     a change log: it gives it only the ACCOUNT rows it manages
     (entity='users'), and those are excluded by the screen filter below,
     so an `hr` card would always be empty. A screen that promises
     something and delivers nothing is worse than no screen. Site HR is
     staff in the owner's model, not a manager. */
  var FEED_ROLES = ['admin', 'gm', 'auditor', 'finance_manager', 'hr_manager'];

  var VERB = {
    update:   { ar: 'عدّل',   en: 'edited' },
    'delete': { ar: 'ألغى',   en: 'cancelled' },
    restore:  { ar: 'استعاد', en: 'restored' }
  };
  var TONE  = { update: '#0000A3', 'delete': '#b42318', restore: '#B8860B' };
  var GLYPH = { update: 'edit', 'delete': 'trash', restore: 'arrow-up' };

  /* ═══════════════════════════════════════════════════════════════════
     ١ · البوابة — تفشل مغلقة دائماً · THE GATE — always fails closed
     ═══════════════════════════════════════════════════════════════════ */
  function me() {
    try { return (global.Auth.current && Auth.current()) || null; } catch (e) { return null; }
  }
  function gate() {
    try {
      var u = me();
      return !!(u && u.role && FEED_ROLES.indexOf(u.role) !== -1);
    } catch (e) { return false; }   /* أي خطأ = لا بطاقة إطلاقاً */
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · النطاق — من هم «الناس داخل نطاق هذا المدير»
         SCOPE — who counts as "the people within this manager's scope"
     -------------------------------------------------------------------
     صفّ السجل لا يحمل **دور** من كتبه، ولا يستطيع مدير الموارد البشرية
     قراءة جدول المستخدمين أصلاً (store.js:62 يحمّل users لأدوار
     admin/gm/finance_manager/hr/auditor فقط — hr_manager ليس منها). فلا
     سبيل لسؤال «ما دور من فعل هذا؟» من المتصفح.

     المتاح فعلاً على كل صفّ شيئان: **الشاشة** (entity) و**موقع الفاعل**
     (site). فنقرأ النطاق بأضيق قراءة تُطابق مثاله حرفياً:

        «الشاشات التي يملكها هذا المدير» × «المواقع التي يراها»

     مثاله: مدير الموارد البشرية شاشاته هي شاشات الموارد البشرية بالضبط
     (auth.js:626-670 — لا يملك '*'، فقائمة Auth.canSee عنده هي عائلة
     الموارد البشرية وحدها)، وموقعه الخلاطة يرى كل المواقع، فيصله كل ما
     غيّره أي موظّف موارد بشرية في أي موقع — وهو نصّ ما وصفه.

     An audit row does NOT carry the actor's ROLE, and an hr_manager cannot
     read the users table at all (store.js:62 loads `users` for
     admin/gm/finance_manager/hr/auditor only — hr_manager is absent). So
     "what role was that person?" is unanswerable in the browser.

     What every row DOES carry is the SCREEN (entity) and the ACTOR'S SITE.
     So scope is read the narrowest way that still matches his example:
     "the screens this manager owns" × "the sites this manager can see".
     For an hr_manager that is exactly the HR family of screens across
     every site — which is precisely what he described.

     🔴 قراءة أضيق مُعلَنة، لا مخمّنة واسعة: لو كان قصده أوسع من ذلك (مثلاً
     كل شاشة يراها الموظف لا كل شاشة يراها المدير) فالتوسيع سطر واحد هنا،
     والتضييق هو الاتجاه الآمن دائماً.
     🔴 This is the declared NARROW reading, not a guessed wide one.
     Widening it later is one line here; narrow is always the safe side.
     ═══════════════════════════════════════════════════════════════════ */

  /* الشاشات: جدول ← وحدة، مبنيّ عند كل رسم لأن ملفات الأقسام تسجّل شاشات
     بعد التحميل (departments.js وhr-department.js وsites.js وغيرها).
     screens: table → module, rebuilt each render because department files
     register screens after load time. */
  function visibleTables() {
    var out = {};
    try {
      (Schema.MODULES || []).forEach(function (m) {
        if (!m || !m.table) return;
        if (!Auth.canSee(m.id)) return;
        out[m.table] = m;
      });
    } catch (e) { return {}; }
    return out;
  }

  /* المواقع: **نفس** قاعدة sites.js:258-267 حرفياً، لا قاعدة ثانية موازية
     تنحرف عنها لاحقاً. ومن لا تتوفّر عنده الدالة أصلاً يُعامَل معاملة
     «يرى موقعه وحده» — فشل مغلق، لا مفتوح.
     sites: EXACTLY sites.js:258-267's own rule, never a second parallel
     rule that could drift from it. If the function is missing entirely we
     fall back to "own site only" — closed, never open. */
  function seesAllSites() {
    try {
      if (global.Auth && typeof Auth.seesAllSites === 'function') return !!Auth.seesAllSites();
      if (global.Sites && typeof Sites.seesAllSites === 'function') return !!Sites.seesAllSites();
    } catch (e) {}
    return false;
  }
  function mySite() {
    try {
      if (global.Auth && typeof Auth.site === 'function') return Auth.site();
    } catch (e) {}
    var u = me();
    return u ? (u.site || null) : null;
  }
  function siteAllowed(rowSite, all, mine) {
    if (all) return true;
    if (!rowSite) return true;      /* بلا موقع مسجَّل — نفس استثناء sites.js:266 */
    return rowSite === mine;
  }

  /* 🔴 هل نعرف أصلاً إن كان موقع هذا المدير «يرى كل المواقع»؟
     sites.js:247-257 تجيب بقراءة صفّ موقعه من Store — وصفوف جدول sites لا
     تصل Store أصلاً لمن ليس معه canSee('sites')، ومدير الموارد البشرية
     ليس معه (auth.js:632 — sites: LOOKUP). الذي يسدّ هذه الفجوة هو
     site-options.js، لكنه يجلب لقطته **بعد** الدخول بشكل غير متزامن.
     ففي اللحظة التي تسبق وصول اللقطة، seesAllSites() تُجيب false زوراً —
     وهو بالضبط «العطل الثاني الكامن» الذي وثّقه site-options.js:25-42 —
     فتُخفى عن أ. محمد عمارة تغييرات المواقع الأخرى، أي عكس حكم المالك
     تماماً، وبصمت.
     فنكشف الحالة بدل ابتلاعها: إن كان صفّ موقعه غير معروف بعد، نقول ذلك
     على الشاشة ونعيد المحاولة مرة واحدة بعد أن تستقرّ اللقطة.
     🔴 Do we even KNOW whether this manager's site consolidates?
     sites.js:247-257 answers by reading his site's row from Store — and
     sites rows never reach Store for anyone without canSee('sites'), which
     the HR manager does not have (auth.js:632, sites: LOOKUP). The file
     that closes that gap is site-options.js, but it fetches its snapshot
     ASYNCHRONOUSLY after login. In the moment before it lands,
     seesAllSites() answers false wrongly — precisely the "latent bug two"
     site-options.js:25-42 documents — hiding other sites' changes from
     أ. محمد عمارة, which is the exact opposite of the owner's ruling, and
     silently. So we surface the state instead of swallowing it: if his
     site row is not known yet, we SAY SO on screen and retry once. */
  function siteRowKnown() {
    var mine = mySite();
    if (!mine) return true;         /* بلا موقع — sites.js تعتبره «يرى الكل» بالفعل */
    try { return !!(global.Store && Store.find('sites', mine)); } catch (e) { return false; }
  }

  function siteName(id) {
    if (!id) return '';
    try {
      var s = global.Store && Store.find('sites', id);
      return s ? (s.name || id) : id;
    } catch (e) { return id; }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · الجلب — استعلام خاص ضيّق مرتَّب محدود التاريخ
         THE FETCH — our own narrow, ordered, date-bounded query
     -------------------------------------------------------------------
     🔴 لا Store.all('audit') إطلاقاً، وهذا موثَّق ومقيس في
     rollout-meter.js:25-51 من قراءة store.js نفسها:
       · store.js:75 يُصفِّح بـ.range بلا .order — فوق ١٠٠٠ صفّ قد يتكرر
         صفّ أو يسقط بصمت، وجدول السجل يتجاوز ١٠٠٠ خلال أسابيع.
       · store.js:431 يقصّ الذاكرة لآخر ٢٥٠٠ سطر **بترتيب الوصول** لا
         بترتيب التاريخ.
       · store.js:184 وStore.log يضيفان صفوفاً محليّة (_localOnly) لم تصل
         الخادم قط — وهي دائماً أفعال المستخدم نفسه، فتظهر مكرَّرة.
     🔴 NEVER Store.all('audit') — documented and measured in
     rollout-meter.js:25-51 from reading store.js itself: unordered paging,
     arrival-order trimming, and local-only shadow rows.
     ═══════════════════════════════════════════════════════════════════ */
  /* 🔴🔴 قائمة الأعمدة التسعة — مُقاسة على قاعدة البيانات الحيّة، لا مقروءة
     من ملف SQL. جدول audit **لا يحمل عمود site إطلاقاً**، والبرهان قياس لا
     استنتاج (٩ سبتمبر ٢٠٢٦، بالمفتاح العام الذي تصفه CLAUDE.md بأنه عام
     بالتصميم):

       GET /rest/v1/audit?select=site&limit=1
         → 42703  column audit.site does not exist
       GET /rest/v1/audit?select=id,at&limit=1
         → 42501  permission denied for table audit   ← الأعمدة موجودة،
                                                        والمنع صلاحيات فقط
       GET /rest/v1/audit?select=<الأعمدة التسعة أدناه>&limit=1
         → 42501  لا 42703 — أي أن التسعة كلها موجودة فعلاً

     السبب معروف وموثَّق: النسخة الأساسية أنشأت الجدول بتسعة أعمدة
     (_baseline-2026-08-12-do-not-run/01-SUPABASE-SETUP.sql:38-48)، والملف
     19-ACCOUNTABILITY.sql:95-106 أعاد كتابته بـ create table if not exists
     — وهي **لا تضيف أعمدة لجدول موجود**، وهو الفخّ الأول في
     .claude/rules/database.md. فنصّ الملف ١٩ يذكر site والجدول لا يحمله،
     و63-PRIVATE-FILES-AND-DELETE-WITH-REASON.sql:99-102 يقول ذلك صراحةً.

     ⚠️ وطلب عمود غير موجود **يُسقط الاستعلام كلّه** بـ42703 — لا يتجاهله
     الخادم. فلو أُدرجت site هنا لَما وصل المدير صفٌّ واحد أبداً، ولَظهرت
     البطاقة برسالة «تعذّر القراءة» إلى الأبد.

     🔴🔴 The nine columns — MEASURED against the live database, not read
     from a SQL file. public.audit has NO `site` column, proven by running
     (9 Sep 2026, with the publishable key CLAUDE.md states is public by
     design): select=site → 42703 "column audit.site does not exist";
     select=id,at → 42501 "permission denied" (so the columns exist and only
     the grant refuses); select=<the nine below> → 42501, not 42703, so all
     nine really exist. The cause is documented: the baseline created nine
     columns and file 19's `create table if not exists` added none — the
     first trap in .claude/rules/database.md.
     ⚠️ Asking for a column that does not exist KILLS THE WHOLE QUERY with
     42703. Listing `site` here would mean no manager ever received a single
     row, and the card would read "could not be read" forever. */
  var COLS = '"id",action,entity,"recordId",label,extra,"userId","userName",at';

  function client() {
    try { return (global.Auth.client && Auth.client()) || null; } catch (e) { return null; }
  }
  function sinceISO() {
    return new Date(Date.now() - WINDOW_DAYS * 86400000).toISOString();
  }

  function fetchRows() {
    var c = client();
    if (!c) return Promise.reject(new Error('no-client'));
    var since = sinceISO();
    var rows = [], from = 0, capped = false;

    function page() {
      return Promise.resolve(
        c.from('audit').select(COLS).gte('at', since)
         .order('at', { ascending: false })
         .range(from, from + PAGE_SIZE - 1)
      ).then(function (res) {
        if (res && res.error) throw res.error;
        var got = (res && res.data) || [];
        rows = rows.concat(got);
        if (rows.length >= FETCH_CAP) {
          capped = rows.length > FETCH_CAP;
          rows = rows.slice(0, FETCH_CAP);
          return { rows: rows, capped: capped };
        }
        if (got.length < PAGE_SIZE) return { rows: rows, capped: false };
        from += PAGE_SIZE;
        return page();
      });
    }
    return page();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · التصفية — طبقة المتصفح الثانية فوق سياج قاعدة البيانات
     ═══════════════════════════════════════════════════════════════════ */
  /* 🔴 موقع الصفّ يُستنتَج من **السجلّ نفسه**، لا من عمود في جدول السجل —
     لسببين، كلاهما مُثبَت لا مُرجَّح:

     ١) العمود غير موجود أصلاً (انظر البرهان المقيس عند COLS أعلاه).
     ٢) وحتى لو أُضيف غداً، فـaudit-trail.js:111 يكتب فيه **موقع الفاعل**
        لا موقع السجلّ — وهذان يختلفان بالضبط في الحالة التي يتكلّم عنها
        حكم المالك: أ. محمد عمارة في الخلاطة يعدّل ملف موظف في سوهاج،
        فيُقيَّد التغيير على الخلاطة ويختفي من نطاق سوهاج. الاستنتاج من
        السجلّ يعطي «سوهاج» وهو الصحيح. (نفس الاستنتاج وصلت إليه خطة
        تفويض الحسابات — .claude/memory/PLAN-users-delegation.md:151,190.)

     ⚖️ وحين يتعذّر إيجاد السجلّ في Store (سجلّ ملغى قديم، أو شاشة لم
     تُحمَّل بعد) يبقى الموقع **مجهولاً — فيُعرَض الصفّ ولا يُخفى**، ويُعدّ.
     السبب صريح: حكم المالك عن **ألّا يفوته شيء** («i get notified»)، وأسوأ
     الخطأين هنا هو الإخفاء الصامت. وسياج المتصفح هذا تضييق نحو نموذج
     المالك، لا حاجز أمني — الحاجز الأمني هو سياسة audit_read في القاعدة،
     وقد سمحت بالصفّ فعلاً قبل أن يصل إلى هنا. والعدد يُقال على الشاشة.

     🔴 A row's site is derived from the RECORD, never from a column on the
     audit table — two proven reasons: (1) the column does not exist (see
     the measured proof at COLS above); (2) even if it were added tomorrow,
     audit-trail.js:111 writes the ACTOR's site, not the record's — and
     those differ in exactly the case the owner's ruling is about: عمارة at
     الخلاطة editing a سوهاج employee file would be filed under الخلاطة and
     vanish from سوهاج's scope. (The account-delegation plan reached the
     same conclusion — PLAN-users-delegation.md:151,190.)
     ⚖️ When the record cannot be found in Store, the site is UNKNOWN and
     the row is SHOWN, not hidden, and counted. The owner's ruling is about
     not missing things, so silent hiding is the worse error; and this
     browser fence is a narrowing toward his model, not a security boundary
     — the database's audit_read policy is the boundary and it already
     allowed the row. The count is stated on screen. */
  function siteOfRecord(mod, recordId) {
    if (!mod || !mod.table || !recordId) return null;
    try {
      var rec = global.Store && Store.find(mod.table, recordId);
      return rec ? (rec.site || null) : null;
    } catch (e) { return null; }
  }

  function build(rawRows, includeMine) {
    var u = me();
    var tables = visibleTables();
    var all = seesAllSites(), mine = mySite();
    var listed = [], creates = 0, seen = {}, unknownSite = 0;

    (rawRows || []).forEach(function (a) {
      if (!a || !a.id) return;
      /* الصفّ المحلّي لم يصل الخادم قطّ وهو دائماً فعل المستخدم نفسه —
         عرضه يعني تكراراً وسطراً لا يراه أحد غيره.
         A local-only row never reached the server and is always the current
         user's own action — showing it means a duplicate nobody else sees. */
      if (a._localOnly) return;
      if (seen[a.id]) return;
      seen[a.id] = true;

      /* الشاشة داخل نطاقه؟ (صفوف الحسابات entity='users' لا شاشة لها،
         فتسقط هنا تلقائياً — وهي شأن الإعدادات ← المستخدمين لا هذه البطاقة.)
         Is the screen inside his scope? (Account rows, entity='users', map
         to no screen and drop out here automatically — they belong to
         Settings → Users, not to this card.) */
      var mod = tables[a.entity];
      if (!mod) return;

      var rowSite = siteOfRecord(mod, a.recordId);
      if (!siteAllowed(rowSite, all, mine)) return;
      if (!all && !rowSite) unknownSite++;

      /* أفعاله هو ليست «إشرافاً» — تُخفى ما لم يطلبها بالخانة.
         His own actions are not oversight — hidden unless he ticks the box. */
      var isMine = !!(u && a.userId && a.userId === u.id);
      if (isMine && !includeMine) return;

      if (a.action === COUNTED_ACTION) { creates++; return; }
      if (LISTED_ACTIONS.indexOf(a.action) === -1) return;

      listed.push({
        id: a.id, action: a.action,
        who: a.userName || a.userId || '—',
        screen: L(mod.label), moduleId: mod.id,
        record: a.label || '', recordId: a.recordId || '',
        at: a.at, site: rowSite || '', extra: a.extra || '', mine: isMine
      });
    });

    /* ⚠️ الترتيب هنا لا في الخادم وحده. .order() تُرسَل فعلاً (وهي ما يجعل
       التصفّح فوق ١٠٠٠ صفّ سليماً)، لكن الاعتماد عليها وحدها يجعل ترتيب
       الشاشة رهينة سلوك طبقة الشبكة. الفرز هنا يجعل «الأحدث أولاً» صحيحاً
       بالبناء مهما فعل الخادم.
       ⚠️ Sorted HERE, not only on the server. .order() is genuinely sent
       (and is what makes paging past 1,000 rows sound), but relying on it
       alone makes the on-screen order hostage to the network layer. Sorting
       here makes "newest first" true by construction. */
    listed.sort(function (x, y) { return new Date(y.at) - new Date(x.at); });
    return { rows: listed, creates: creates, unknownSite: unknownSite };
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · ذاكرة قصيرة — لئلا يُستعلَم الخادم عند كل إعادة رسم للشاشة
     ═══════════════════════════════════════════════════════════════════ */
  var cache = null, cacheUser = null, cacheAt = 0, inflight = null;

  function load(force) {
    var u = me();
    var uid = u ? u.id : null;
    if (!force && cache && cacheUser === uid && (Date.now() - cacheAt) < CACHE_MS) {
      return Promise.resolve(cache);
    }
    if (inflight && cacheUser === uid && !force) return inflight;
    cacheUser = uid;
    inflight = fetchRows().then(function (got) {
      cache = { raw: got.rows, capped: got.capped, error: null };
      cacheAt = Date.now(); inflight = null;
      return cache;
    }).catch(function (e) {
      /* 🔴 لا سقوط صامت إلى نسخة المتصفح. قائمة ناقصة تبدو كاملة أسوأ من
         رسالة صريحة: المدير سيقرأ الصمت على أنه «لم يغيّر أحد شيئاً».
         🔴 NO silent fallback to the browser copy. A truncated list that
         looks complete is worse than an honest message: the manager would
         read silence as "nobody changed anything". */
      cache = { raw: [], capped: false, error: String((e && e.message) || e) };
      cacheAt = Date.now(); inflight = null;
      return cache;
    });
    return inflight;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · الرسم
     ═══════════════════════════════════════════════════════════════════ */
  var includeMine = false;
  var renderToken = 0;

  function rowHTML(r) {
    var tone = TONE[r.action] || '#475467';
    var detail = r.extra ||
      (r.action === 'delete'
        ? L({ ar: '(لم يُسجَّل سبب)', en: '(no reason recorded)' })
        : L({ ar: '(لم تُسجَّل تفاصيل)', en: '(no detail recorded)' }));
    var place = r.site ? siteName(r.site) : '';
    return '<div class="alert-row" data-mcf-go="' + attr(r.moduleId) + '" data-mcf-rid="' + attr(r.recordId) + '"' +
             ' style="align-items:flex-start">' +
      '<span class="al-ic" style="color:' + tone + '">' + icon(GLYPH[r.action] || 'edit', 15) + '</span>' +
      '<span class="al-tx">' +
        '<strong style="color:' + tone + '">' + esc(L(VERB[r.action] || { ar: r.action, en: r.action })) + '</strong> ' +
        '<strong>' + esc(r.who) + '</strong> — ' +
        esc(r.screen) + (r.record ? ' «' + esc(r.record) + '»' : '') +
        (place ? ' <span class="muted small">· ' + esc(place) + '</span>' : '') +
        '<br><span class="muted small">' + esc(detail) + '</span>' +
      '</span>' +
      '<span class="al-mod num nowrap">' + esc(when(r.at)) + '</span>' +
    '</div>';
  }

  function openAll(data) {
    if (!global.UI || !UI.modal) return;
    var built = build(data.raw, includeMine);
    var rows = built.rows.slice(0, MODAL_ROWS);
    var body = rows.length
      ? rows.map(rowHTML).join('')
      : '<p class="muted">' + esc(L({
          ar: 'لا توجد تغييرات مسجّلة داخل نطاقك في هذه الفترة.',
          en: 'No recorded changes inside your scope in this period.' })) + '</p>';
    UI.modal({
      title: L({ ar: 'تغييرات فريقك — آخر ' + WINDOW_DAYS + ' يوماً',
                 en: 'Your team\'s changes — last ' + WINDOW_DAYS + ' days' }),
      body: '<div>' + body + '</div>' +
        (built.rows.length > rows.length
          ? '<p class="muted small mt-2">' + esc(L({
              ar: 'معروض ' + rows.length + ' من ' + built.rows.length + ' تغييراً.',
              en: 'Showing ' + rows.length + ' of ' + built.rows.length + ' changes.' })) + '</p>'
          : ''),
      buttons: [{ label: L({ ar: 'إغلاق', en: 'Close' }), cls: 'btn-ghost' }]
    });
  }

  function fill(bodyEl, data, token) {
    if (!bodyEl || token !== renderToken) return;

    if (data.error) {
      bodyEl.innerHTML = '<div class="alert alert-warn">' + icon('alert', 16) + '<span>' + esc(L({
        ar: 'تعذّر قراءة سجل التغييرات من الخادم الآن. لا يعني هذا أن أحداً لم يغيّر شيئاً — ' +
            'تحقّق من الاتصال ثم افتح الشاشة مرة أخرى.',
        en: 'The change log could not be read from the server right now. This does NOT mean nobody ' +
            'changed anything — check the connection and open the screen again.' })) + '</span></div>';
      return;
    }

    var built = build(data.raw, includeMine);
    var shown = built.rows.slice(0, CARD_ROWS);

    var html = '';
    if (!built.rows.length) {
      html += '<div class="empty-state" style="padding:22px">' + icon('check', 30) + '<p>' + esc(L({
        ar: 'لا أحد داخل نطاقك عدّل أو ألغى شيئاً في آخر ' + WINDOW_DAYS + ' يوماً.',
        en: 'Nobody inside your scope edited or cancelled anything in the last ' + WINDOW_DAYS + ' days.' })) +
        '</p></div>';
    } else {
      html += shown.map(rowHTML).join('');
    }

    var notes = [];
    /* 🔴 نطاق المواقع غير محسوم بعد — يُقال، لا يُبتلَع. القائمة الآن مُضيَّقة
       على موقعه وحده، وقد تكون أقصر مما يجب.
       🔴 The site scope is not settled yet — say it, never swallow it. The
       list is currently narrowed to his own site and may be shorter than
       it should be. */
    if (!seesAllSites() && !siteRowKnown()) {
      notes.push(L({
        ar: 'لم تصل بيانات المواقع بعد، فالقائمة مضيّقة على موقعك وحده مؤقتاً — ' +
            'افتح الشاشة مرة أخرى بعد لحظات.',
        en: 'The site data has not arrived yet, so this list is temporarily narrowed to your ' +
            'own site — open the screen again in a moment.' }));
      /* محاولة واحدة بعد أن تستقرّ لقطة site-options.js · one retry once
         site-options.js's snapshot has had time to land. */
      if (!bodyEl.__mcfRetried) {
        bodyEl.__mcfRetried = true;
        setTimeout(function () { fill(bodyEl, data, token); }, 2500);
      }
    }
    if (built.creates) {
      notes.push(L({ ar: 'وأضاف فريقك ' + built.creates + ' سجلاً جديداً في نفس الفترة (غير مسرودة هنا).',
                     en: 'Your team also added ' + built.creates + ' new records in the same period (not listed here).' }));
    }
    /* 🔴 صفوف تعذّر تحديد موقعها — تُعرَض ولا تُخفى، ويُقال عددها. الصمت هنا
       كان سيبدو كأن نطاق المواقع طُبِّق تماماً وهو لم يُطبَّق.
       🔴 Rows whose site could not be determined are SHOWN, not hidden, and
       their number is stated. Silence here would look like the site scope
       had been fully applied when it had not. */
    if (built.unknownSite) {
      notes.push(L({
        ar: 'من بينها ' + built.unknownSite + ' حركة تعذّر تحديد موقعها (السجلّ نفسه ' +
            'غير متاح لك)، فعُرضت ولم تُخفَ.',
        en: built.unknownSite + ' of these are on records whose site could not be determined ' +
            '(the record itself is not available to you), so they are shown rather than hidden.' }));
    }
    if (data.capped) {
      notes.push(L({ ar: 'السجل طويل: قُرئت آخر ' + FETCH_CAP + ' حركة فقط.',
                     en: 'The log is long: only the most recent ' + FETCH_CAP + ' events were read.' }));
    }
    if (built.rows.length > shown.length) {
      notes.push(L({ ar: 'معروض ' + shown.length + ' من ' + built.rows.length + '.',
                     en: 'Showing ' + shown.length + ' of ' + built.rows.length + '.' }));
    }
    if (notes.length) {
      html += '<p class="muted small" style="padding:8px 12px;margin:0">' + esc(notes.join(' ')) + '</p>';
    }

    bodyEl.innerHTML = html;

    /* الضغط يفتح السجل نفسه — نفس سلوك صفوف التنبيهات (alerts.js:423-429).
       A click opens the record itself — the same behaviour as the alert
       rows above it (alerts.js:423-429). */
    bodyEl.querySelectorAll('[data-mcf-go]').forEach(function (el) {
      el.onclick = function () {
        var m = el.getAttribute('data-mcf-go'), rid = el.getAttribute('data-mcf-rid');
        if (!m || !global.App || !App.go) return;
        App.go(m);
        if (rid) setTimeout(function () {
          try { EntityPage.openDetail(m, rid); } catch (e) {}
        }, 220);
      };
    });
  }

  function attachCard(host) {
    /* 🔒 لا شيء إطلاقاً لغير المدير — لا بطاقة، لا عنوان، لا زرّ، لا نقطة
       دخول. شاشة التنبيهات للموظف العادي تبقى مطابقة حرفياً لما هي عليه.
       🔒 NOTHING at all for a non-manager — no card, no heading, no button,
       no entry point. An ordinary employee's alerts screen stays identical. */
    if (!gate()) return;
    if (!host || !host.querySelector || host.querySelector('#azChangeFeed')) return;

    var token = ++renderToken;

    var card = document.createElement('div');
    card.id = 'azChangeFeed';
    card.className = 'card mb-2';
    card.innerHTML =
      '<div class="card-head">' +
        '<h3 class="card-title">' + icon('clock', 17) + ' ' + esc(L({
          ar: 'تغييرات فريقك — من غيّر ماذا ومتى ولماذا',
          en: 'Your team\'s changes — who changed what, when and why' })) + '</h3>' +
        '<button class="btn btn-outline btn-sm" id="azChangeFeedAll" style="margin-inline-start:auto">' +
          esc(L({ ar: 'عرض الكل', en: 'Show all' })) + '</button>' +
      '</div>' +
      '<div class="card-body flush">' +
        '<p class="muted small" style="padding:8px 12px;margin:0">' + esc(L({
          ar: 'آخر ' + WINDOW_DAYS + ' يوماً، داخل الشاشات والمواقع التي تُشرف عليها. ' +
              'هذا السجل لا يمكن تعديله ولا حذفه من داخل البوابة.',
          en: 'The last ' + WINDOW_DAYS + ' days, inside the screens and sites you oversee. ' +
              'This log cannot be edited or deleted from inside the portal.' })) + '</p>' +
        '<label class="muted small" style="padding:0 12px 8px;display:block">' +
          '<input type="checkbox" id="azChangeFeedMine"' + (includeMine ? ' checked' : '') + '> ' +
          esc(L({ ar: 'أظهر تغييراتي أنا أيضاً', en: 'Show my own changes too' })) +
        '</label>' +
        '<div id="azChangeFeedBody"><p class="muted small" style="padding:8px 12px;margin:0">' +
          esc(L({ ar: 'جارٍ القراءة…', en: 'Reading…' })) + '</p></div>' +
      '</div>';
    host.appendChild(card);

    var bodyEl = card.querySelector('#azChangeFeedBody');

    var allBtn = card.querySelector('#azChangeFeedAll');
    if (allBtn) allBtn.onclick = function () { load(false).then(function (d) { openAll(d); }); };

    var mineBox = card.querySelector('#azChangeFeedMine');
    if (mineBox) mineBox.onchange = function () {
      includeMine = !!mineBox.checked;
      load(false).then(function (d) { fill(bodyEl, d, token); });
    };

    load(false).then(function (d) { fill(bodyEl, d, token); });
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · اللفّ — نُنادي الأصل أولاً ثم نُلحق بطاقتنا
     ═══════════════════════════════════════════════════════════════════ */
  var origRender = Alerts.render;
  Alerts.render = function (host) {
    var out = origRender.apply(Alerts, arguments);
    try { attachCard(host); }
    catch (e) { console.warn('[manager-change-feed] could not attach the card', e); }
    return out;
  };
  Alerts.__azManagerFeedWrapped = true;
  Alerts.__azManagerFeedRender = Alerts.render;

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · فحص ذاتي للترتيب — يمسك بالضبط الانحدار الموصوف في الرأس
         LOAD-ORDER SELF-CHECK — catches exactly the regression above
     -------------------------------------------------------------------
     لو حُمِّل هذا الملف **قبل** dc-alerts.js، فذاك يستبدل Alerts.render
     كاملةً فتُمحى لفّتنا ولا تظهر البطاقة أبداً — بلا رسالة خطأ واحدة
     ولا شيء يشتكي. صامت على الشاشة، صاخب هنا.
     If this file were loaded BEFORE dc-alerts.js, that file REPLACES
     Alerts.render outright, erasing our wrapper — the card would simply
     never appear, with no error anywhere. Silent on screen, loud here.
     ═══════════════════════════════════════════════════════════════════ */
  setTimeout(function () {
    try {
      if (Alerts.render !== Alerts.__azManagerFeedRender) {
        console.error('[manager-change-feed] LOAD ORDER PROBLEM — something replaced ' +
          'Alerts.render after this file ran, so the manager change-feed card will never ' +
          'appear. loader.js must load manager-change-feed.js AFTER dc-alerts.js.');
      }
    } catch (e) {}
  }, 6000);

  /* ═══════════════════════════════════════════════════════════════════
     ٩ · التصدير — للتجربة، وللفحص من شاشة المدير عند الحاجة
     ═══════════════════════════════════════════════════════════════════ */
  global.ManagerChangeFeed = {
    gate: gate,
    build: build,
    load: load,
    invalidate: function () { cache = null; cacheAt = 0; },
    seesAllSites: seesAllSites,
    siteRowKnown: siteRowKnown,
    visibleTables: visibleTables,
    settings: {
      WINDOW_DAYS: WINDOW_DAYS, FETCH_CAP: FETCH_CAP, CARD_ROWS: CARD_ROWS,
      FEED_ROLES: FEED_ROLES, LISTED_ACTIONS: LISTED_ACTIONS
    },
    showMine: function (on) { includeMine = !!on; }
  };

  console.info('manager-change-feed.js ready — managers see a separate «تغييرات فريقك» card ' +
    'at the bottom of the alerts screen (the bell button). Alerts.list/count/dashboardHTML ' +
    'are untouched, so no badge number changes.');
})(window);

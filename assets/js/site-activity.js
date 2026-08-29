/* =========================================================================
   site-activity.js — نشاط الموارد البشرية لكل موقع + تبويبات المواقع
                       Per-site HR activity feed + site tabs on list screens
   -------------------------------------------------------------------------
   ما الذي طلبه المالك بالحرف (spec §2، ملف التسليم):

   «x is in sohag and he uploads a file now, automatically there is a page
   for omara dedicated just for sohag … that x uploaded a file at that time
   with every detail in the file … once it saves for x it also at the same
   time saves for omara. needless to say any edits or changes is recorded
   too, ofcourse who changes or edits is a must so no one can play in the
   others work.»

   هذا الملف يبني شيئين إضافيّين، بلا لمس أي ملف قائم:

   ١) صفحات نشاط لكل موقع (الجزء أ) — لأ. محمد عمارة (hr_manager): شريط
      زمني لكل ما يحدث في جداول الموارد البشرية — من فعله، ماذا فعل،
      متى، وأي سجل بالضبط — واسم من عدّل يظهر دائماً. صفحة كل موقع تُبنى
      تلقائياً من جدول المواقع نفسه: موقع جديد يعني تبويباً جديداً بلا
      كتابة سطر كود واحد.

   ٢) تبويبات مواقع أعلى شاشات القوائم متعددة المواقع (الجزء ب) — لكل
      من يرى أكثر من موقع، لا لعمارة وحده (الأمر المعياري ٢١: صلاحية
      جديدة تشمل الجميع افتراضياً ما لم يحصرها هو). بدل خلط كل المواقع
      في قائمة واحدة، يختار المستخدم موقعاً واحداً أو «الكل».

   1) Per-site activity pages (Part A) — for أ. محمد عمارة (hr_manager): a
      chronological feed of everything that happens across the HR tables —
      who did it, what, when, and exactly which record — with the editor's
      name always shown on edits. Each site's page is generated from the
      sites table itself: a new site row means a new tab, with zero code.

   2) Site tabs on multi-site list screens (Part B) — for EVERYONE who
      sees more than one site, not only عمارة (Standing Order 21: a new
      capability defaults to everyone unless he narrows it). Instead of
      mixing every site's rows into one list, the viewer picks one site,
      or «الكل» (all).

   -------------------------------------------------------------------------
   الأعطال الخمسة التي تجنّبها هذا الملف عمداً — كل واحد منها كان معروفاً
   قبل كتابة سطر واحد من هذا الملف:
   THE FIVE TRAPS this file deliberately avoids — each one was already
   found before a single line of this file was written:

   T1 · وحدة بجدول غير موجود تُسقط تسجيل الدخول للجميع.
        store.js (tableNames عند ٦٠-٦٧، loadRemote عند ١١٤-١٣٧) تجلب جدول
        كل وحدة يراها المستخدم، وترمي استثناءً يمنع الدخول كلياً لو فشل
        جدول واحد. لهذا صفحة النشاط تُعلن `table: 'audit'` — جدول حقيقي
        يُجلَب بالفعل لكل الأدوار (store.js:61، غير مشروط بأي صلاحية) —
        فلا تحميل إضافي ولا احتمال فشل مهما كان من يرى الوحدة.
        A module whose table does not exist BREAKS LOGIN for everyone who
        can see it — store.js's tableNames()/loadRemote fetch every visible
        module's table and throw if even one fails. Fixed by declaring
        `table: 'audit'`, a real table already fetched unconditionally for
        every role (store.js:61) — zero extra load, zero risk.

   T2 · إعادة الرسم الداخلية في pages/entity.js تتجاوز أي تغليف لـ render.
        نقرات فلاتر العمل والبحث والفرز والصفحات (entity.js:225-243) تنادي
        الدالة render الخاصّة مباشرة، لا الدالة المُصدَّرة EntityPage.render —
        فأي شريط يُزرع فقط عبر تغليف render يموت عند أول نقرة. الحل هنا:
        حالة التبويب المختار تعيش في كائن وحدة ثابت خارج أي دالة رسم، ومراقب
        طفرات (نفس فكرة report-access.js) على #content يعيد زرع الشريط
        كلما مُحي — أُثبت هذا بتجربة محاكاة نقرة في TESTS.
        Internal re-renders bypass a render wrapper. entity.js's own
        chip/search/sort/page handlers call its PRIVATE render closure, not
        the exported EntityPage.render — so a tab bar planted only through
        wrapping render dies on the first click. Fixed by keeping the
        chosen tab OUTSIDE any render function, and a MutationObserver on
        #content (same idea as report-access.js) that replants the bar the
        moment it is wiped — proven by a simulated-click trial in TESTS.

   T3 · site في صف audit هو موقع الفاعل، لا موقع السجل (audit-trail.js:111
        `site: u ? (u.site || null) : null`). لو جُمعت الخلاصة بهذا العمود
        لأُخفي كل تعديل عابر للمواقع بصمت — عمارة يعدّل سجل سوهاج من
        الخلاطة فيظهر النشاط تحت الخلاطة لا تحت سوهاج. الإسناد هنا بموقع
        السجل نفسه أولاً (Store.find على الجدول الأصلي)، ثم موقع الموظف
        المرتبط إن غاب حقل site عن الجدول نفسه (مثل مصوغات التوظيف)، ولا
        نلجأ لموقع الفاعل إلا حين يختفي السجل تماماً.
        audit.site is the ACTOR's site, not the record's. Grouping by it
        silently misfiles every cross-site edit — عمارة editing a سوهاج
        record from الخلاطة would show under الخلاطة. Attribution here uses
        the RECORD's own site first, falling back to the related employee's
        site where the table itself carries none, and only to the actor's
        site when the record is gone entirely.

   T4 · الصفوف بلا موقع يجب ألا تختفي. سجلات أقدم من عمود الموقع (08-SITES
        أضافه لاحقاً) تظهر تحت «الكل» دائماً، وتحت تبويب «بدون موقع» حين
        يوجد ولو صف واحد منها — إخفاؤها يعني «فقدان» سجلات من منظور المالك.
        Rows with an empty site must not vanish. Older records predate the
        site column and stay visible under «الكل» always, and under a
        «بدون موقع» tab whenever at least one exists — hiding them would
        "lose" records from the owner's point of view.

   T5 · «الكل» وحدها ليست اختيار موقع. entity.js يرسم شريط «الكل» لفلتر
        حالة العمل أصلاً (entity.js:54) — وقد خُلط بينه وبين اختيار الموقع
        من قبل. تبويبات هذا الملف تعرض أسماء مواقع حقيقية من
        Store.all('sites') دائماً، لا إعادة استعمال لذلك الشريط.
        «الكل» alone is not a site chooser — entity.js already draws an
        «الكل» chip for the workflow filter, and that has been mistaken for
        a finished site chooser before. This file's tabs always show real
        site NAMES read from Store.all('sites'), never a reuse of that
        existing chip row.

   -------------------------------------------------------------------------
   وعد الحداثة · THE FRESHNESS PROMISE

   هذه الشاشة تُحدَّث عند فتحها أو تحديثها — وليست لحظية أبداً. لا شيء في
   هذا الملف يَعِد بدفع فوري، والنص المعروض على الشاشة نفسها يقول ذلك
   بالحرف حتى لا يُفهم خطأ.
   This screen refreshes when it is opened or refreshed — never live-push.
   Nothing in this file promises instant updates, and the screen's own
   caption text says so explicitly.

   -------------------------------------------------------------------------
   من يرى صفحة النشاط (الجزء أ)؟ · WHO SEES THE ACTIVITY PAGE (Part A)?

   hr_manager فقط — عبر صلاحية جديدة تُمنح هنا إضافيّاً: auth.js يبقى
   للقراءة فقط، لكن ROLES مُصدَّرة بالمرجع (auth.js:1026) فتقبل إضافة
   مفتاح صلاحية دون تعديل الملف نفسه، تماماً كما فعل robot-role.js من قبل
   لدور كامل. admin و gm و auditor يرونها أيضاً عبر صلاحية '*' العامة
   الموجودة لديهم أصلاً — اطّلاع دعم فني عادي، لا قرار جديد. hr (شؤون
   عاملين الموقع) لا يرى هذه الشاشة، ولا document_control ولا
   finance_manager — لأن لا واحد منهم يملك '*' ولا مُنح صلاحية صريحة هنا.
   hr_manager only — via a permission granted additively here: auth.js
   stays read-only, but ROLES is exported by reference (auth.js:1026) and
   accepts a new permission key without editing the file itself, exactly
   as robot-role.js already does for a whole new role. admin/gm/auditor
   also see it through their pre-existing '*' wildcard — ordinary support
   visibility, not a new decision. hr, document_control and finance_manager
   see nothing new here — none of them carries '*' and none is granted
   anything explicitly in this file.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف وسيحدث بالضبط:
     · «نشاط المواقع» تختفي من القائمة الجانبية لعمارة.
     · شاشات القوائم متعددة المواقع تعود لخلط كل المواقع كما كانت تماماً.
   لا يلمس هذا الملف entity.js أو store.js أو app.js أو schema.js أو
   auth.js أو ui.js بحرف واحد — كل تعديل هنا هو تغليف أو إضافة إلى كائن
   مُصدَّر بالمرجع.
   Delete this file and exactly this happens:
     · Site activity disappears from عمارة's side menu.
     · Multi-site list screens go back to mixing every site's rows exactly
       as before.
   This file does not touch entity.js, store.js, app.js, schema.js, auth.js
   or ui.js by one character — every change here is a wrap around, or an
   addition to, an object already exported by reference.

   -------------------------------------------------------------------------
   موضع التحميل النهائي (يُقرّره من يُوصِّل الملف في loader.js) · FINAL LOAD
   POSITION (decided by whoever wires this file into loader.js):

   بعد assets/js/ref-label-resolve.js وقبل assets/js/version-badge.js — كل
   ما يحتاجه هذا الملف (Schema، Auth، EntityPage، Store، App) محمَّل
   ومهيَّأ قبل هذه النقطة بمراحل طويلة؛ site-fence-retry.js، المحمَّل
   مباشرة بعد auth.js، يضمن أن Auth.seesAllSites موجودة أيضاً قبل هذا
   الملف بكثير.
   After assets/js/ref-label-resolve.js, before assets/js/version-badge.js —
   everything this file needs (Schema, Auth, EntityPage, Store, App) is long
   since loaded by that point; site-fence-retry.js, loaded immediately after
   auth.js, also guarantees Auth.seesAllSites exists well before this file.
   ========================================================================= */
(function (global) {
  'use strict';

  /* ⚠️ كل مرجع هنا يمر عبر global.X دائماً، حتى داخل && — لا نكتفي بمرجع
     مجرَّد بعد التأكد من وجوده. في متصفح حقيقي global هو window نفسه
     فلا فرق أبداً، لكن الفحوص في TESTS تُحمِّل هذا الملف بصندوق حيث
     window كائن منفصل عن النطاق العام — مرجع مجرَّد هناك يرمي استثناءً
     حتى لو كان global.X صحيحاً، فيُسقط التجربة كلها بخطأ لا علاقة له
     بما يُختبَر. القاعدة: global.X.method(...)، لا X.method(...) أبداً.
     ⚠️ EVERY reference here goes through global.X, always — even inside
     && — never a bare reference once existence is confirmed. In a real
     browser global IS window, so this makes no difference at all; but
     TESTS load this file into a sandbox where window is a SEPARATE object
     from the execution scope — a bare reference there throws even when
     global.X is genuinely present, failing the whole trial on something
     unrelated to what is being tested. Rule: global.X.method(...), never
     bare X.method(...). */
  function isAr() { return !(global.I18N && global.I18N.getLang && global.I18N.getLang() === 'en'); }
  function L(o) { return o && o.ar !== undefined ? (isAr() ? o.ar : o.en) : o; }
  function esc(s) { return (global.UI && global.UI.esc) ? global.UI.esc(s) : String(s == null ? '' : s); }
  function attr(s) { return (global.UI && global.UI.attr) ? global.UI.attr(s) : esc(s); }

  /* ═══════════════════════════════════════════════════════════════════
     الجزء أ · صفحات نشاط المواقع
     PART A · SITE ACTIVITY PAGES
     ═══════════════════════════════════════════════════════════════════ */

  /* الجداول التي يُبنى منها الشريط الزمني — كل جدول موارد بشرية حقيقي.
     THE TABLES the feed is built from — every real HR table. */
  var HR_ENTITIES = [
    'employees', 'attendance', 'siteAttendance', 'dailyLabour', 'leaves',
    'employeeAdvances', 'employmentContracts', 'employeeDocs', 'payroll'
  ];

  var VERB = {
    create:   { ar: 'أنشأ',   en: 'created' },
    update:   { ar: 'عدّل',   en: 'updated' },
    'delete': { ar: 'ألغى',   en: 'cancelled' },
    restore:  { ar: 'استعاد', en: 'restored' }
  };
  var VERB_TONE = { create: '#1a7f37', update: '#0000A3', 'delete': '#b42318', restore: '#B8860B' };

  /* حد أداء لا حد سياسة — جدول audit ينمو بلا توقف مع الوقت. الفلترة
     بالموقع تسبق هذا الحد دائماً، فلا يُفقَد صف بسببه، فقط لا يُرسَم كل
     شيء دفعة واحدة إن كبر الجدول كثيراً بعد شهور طويلة.
     A render-performance cap, not a policy limit — the audit table grows
     without bound over time. The site filter always runs BEFORE this cap,
     so no row is lost by it; it only avoids painting everything at once
     once the table has grown large after many months. */
  var FEED_LIMIT = 400;

  var SITE_ACTIVITY_ID = 'siteActivity';
  var SITE_ACTIVITY_MODULE = {
    id: SITE_ACTIVITY_ID,
    /* ⚠️ إجباري — انظر T1 أعلى الملف. أي جدول آخر هنا يُسقط الدخول لكل
       من يرى هذه الوحدة. MANDATORY — see T1 above. Any other table here
       breaks login for everyone who can see this module. */
    table: 'audit',
    group: 'people', icon: 'building',
    label: { ar: 'نشاط المواقع', en: 'Site activity' },
    desc: {
      ar: 'من فعل ماذا ومتى في كل موقع — تُحدَّث عند فتح هذه الشاشة أو تحديثها، وليست لحظية.',
      en: 'Who did what and when, per site — refreshed when this screen opens or is refreshed, never live.'
    },
    /* لا حقل site هنا عمداً — هذا يستثني هذه الوحدة تلقائياً من تبويبات
       الجزء ب ومن Sites.scopeBySite (كلاهما يفحص وجود حقل باسمه site
       بالحرف)، فلا تتضارب الآليتان أبداً.
       Deliberately no 'site' field — this automatically excludes this
       module from Part B's tabs and from Sites.scopeBySite (both key on a
       field literally named 'site'), so the two mechanisms never collide. */
    fields: [],
    columns: []
  };

  function registerModule() {
    if (!global.Schema || !global.Schema.MODULES) {
      console.error('site-activity.js: schema.js must load first');
      return;
    }
    if (global.Schema.MODULES.some(function (m) { return m.id === SITE_ACTIVITY_ID; })) return;
    global.Schema.MODULES.push(SITE_ACTIVITY_MODULE);
    /* نفس نمط الإضافة الذي بنته departments.js وhr-department.js وsites.js —
       نغلّف Schema.get فلا تفقد أي وحدة جديدة مكاناً يبحث عنها بالاسم.
       Same additive pattern departments.js/hr-department.js/sites.js already
       use — wrap Schema.get so no new module loses anywhere that looks it
       up by id. */
    var origGet = global.Schema.get;
    global.Schema.get = function (id) { return origGet(id) || (id === SITE_ACTIVITY_ID ? SITE_ACTIVITY_MODULE : null); };
  }

  function grantPerms() {
    if (!global.Auth || !global.Auth.ROLES || !global.Auth.ROLES.hr_manager) {
      console.error('site-activity.js: auth.js (with hr_manager registered) must load first');
      return;
    }
    /* auth.js للقراءة فقط. ROLES مُصدَّرة بالمرجع (auth.js:1026) فتقبل
       إضافة مفتاح صلاحية جديد لدور قائم دون تعديل الملف نفسه — تماماً
       كما أضاف robot-role.js دوراً كاملاً بنفس الطريقة.
       auth.js stays read-only. ROLES is exported by reference (auth.js:1026)
       and accepts a new permission key on an existing role without editing
       the file itself — exactly how robot-role.js already adds a whole new
       role the same way. */
    if (!global.Auth.ROLES.hr_manager.perms.siteActivity) {
      global.Auth.ROLES.hr_manager.perms.siteActivity = ['view'];
    }
  }

  /* المواقع الفعّالة، مرتّبة عربياً — تُقرأ حيّة من Store.all('sites') في
     كل استدعاء، فموقع جديد يظهر بلا أي كود إضافي (T5).
     Active sites, sorted for Arabic — read LIVE from Store.all('sites')
     on every call, so a new site appears with no extra code at all (T5). */
  function activeSites() {
    var list = (global.Store && global.Store.all('sites')) || [];
    return list.filter(function (s) { return s && s.status !== 'inactive'; })
      .slice()
      .sort(function (a, b) { return String((a && a.name) || '').localeCompare(String((b && b.name) || ''), 'ar'); });
  }

  /* موقع السجل يفوز دائماً على موقع الفاعل (T3). عند غياب حقل site في
     الجدول نفسه (مصوغات التوظيف مثلاً لا تحمل site — sites.js لا يضيفه
     إليها) نحاول موقع الموظف المرتبط، ثم موقع الفاعل كحل أخير فقط حين
     يختفي السجل تماماً، ثم لا شيء (بدون موقع).
     The record's site always wins over the actor's (T3). Where the table
     itself carries no 'site' field (recruitment documents, for instance —
     sites.js never adds one there) we try the linked employee's site next,
     and only fall back to the actor's site once the record itself is gone,
     then to nothing (no site) if even that is unavailable. */
  function recordSiteOf(entityTable, recordId, actorSite) {
    var rec = global.Store && global.Store.find(entityTable, recordId);
    if (rec) {
      if (rec.site) return rec.site;
      if (rec.employee) {
        var emp = global.Store.find('employees', rec.employee);
        if (emp && emp.site) return emp.site;
      }
      return null; /* السجل موجود ولا موقع له — لا نلجأ لموقع الفاعل هنا،
                       فهو تقدير أضعف من سجل فعلي بلا موقع (T4). */
    }
    return actorSite || null;
  }

  function screenLabel(table) {
    var m = global.Schema && global.Schema.MODULES &&
      global.Schema.MODULES.filter(function (x) { return x.table === table; })[0];
    return m ? L(m.label) : table;
  }

  /* الشريط الزمني الكامل، مُسنَداً بالموقع ومرتَّباً الأحدث أولاً. */
  function feedRows() {
    var raw = (global.Store && global.Store.all('audit')) || [];
    var me = global.Auth && global.Auth.current && global.Auth.current();
    return raw.filter(function (a) {
      if (!a) return false;
      if (a.entity === 'users') {
        /* دفاع إضافي فقط — هذه الشاشة لا تسرد صفوف الحسابات أصلاً (ليست
           ضمن HR_ENTITIES أدناه). لو تسرّب صف حساب يوماً فلا نبني سياج
           رتب ثانياً هنا — نستعمل بوّابة فريق الحسابات نفسها بالحرف
           (AccountFence.canSeeAccountAudit)، كما طُلب صراحة.
           Defence only — this screen never lists account rows on purpose
           (not in HR_ENTITIES below). If one ever leaked in, we do not
           build a second rank fence — we reuse the accounts team's own
           gate verbatim (AccountFence.canSeeAccountAudit), exactly as
           instructed. */
        if (!global.AccountFence || !global.AccountFence.canSeeAccountAudit) return false;
        var subject = global.Store && global.Store.find('users', a.recordId);
        return subject ? global.AccountFence.canSeeAccountAudit(me, subject) : false;
      }
      return HR_ENTITIES.indexOf(a.entity) !== -1;
    }).map(function (a) {
      /* Object.assign ينسخ صفاً جديداً — لا نكتب فوق الصف المخزَّن في
         Store.all('audit') أبداً (نفس الاحتراس في audit-trail.js). */
      return Object.assign({}, a, { __site: recordSiteOf(a.entity, a.recordId, a.site) });
    }).sort(function (a, b) { return new Date(b.at) - new Date(a.at); });
  }

  /* حالة تبويب صفحة النشاط — تعيش هنا، خارج أي دالة رسم، فلا تُفقَد بين
     إعادات الرسم (نفس فكرة T2، هنا داخل صفحة نملكها بالكامل). */
  var activityTab = 'all';

  function renderSiteActivity(host) {
    var mod = SITE_ACTIVITY_MODULE;
    if (!global.Auth || !global.Auth.canSee || !global.Auth.canSee(SITE_ACTIVITY_ID)) {
      host.innerHTML = '<div class="alert alert-danger">' +
        ((global.UI && global.UI.icon) ? global.UI.icon('alert', 18) : '') + '<span>' +
        esc(L({ ar: 'لا تملك صلاحية عرض هذه الشاشة.', en: 'You do not have permission to view this screen.' })) +
        '</span></div>';
      return;
    }

    var sites = activeSites();
    var rows = feedRows();
    var hasNoSite = rows.some(function (r) { return !r.__site; });
    /* الموقع المختار أُلغي تفعيله أو حُذف منذ آخر زيارة — لا نعلّق على
       تبويب لم يعد له وجود، نعود لـ«الكل» بصمت. */
    if (activityTab !== 'all' && activityTab !== 'nosite' &&
        !sites.some(function (s) { return s.id === activityTab; })) {
      activityTab = 'all';
    }

    var html = '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + ((global.UI && global.UI.icon) ? global.UI.icon(mod.icon, 22) : '') + ' ' + esc(L(mod.label)) + '</h1>' +
      '<p class="page-sub">' + esc(L(mod.desc)) + '</p></div></div>';

    html += '<div class="card">';
    html += '<div class="chip-row">';
    html += '<button type="button" class="filter-chip' + (activityTab === 'all' ? ' active' : '') +
      '" data-az-act-site="all">' + esc(L({ ar: 'كل المواقع', en: 'All sites' })) + '</button>';
    sites.forEach(function (s) {
      html += '<button type="button" class="filter-chip' + (activityTab === s.id ? ' active' : '') +
        '" data-az-act-site="' + attr(s.id) + '">' + esc(s.name || s.code || s.id) + '</button>';
    });
    if (hasNoSite) {
      html += '<button type="button" class="filter-chip' + (activityTab === 'nosite' ? ' active' : '') +
        '" data-az-act-site="nosite">' + esc(L({ ar: 'بدون موقع', en: 'No site' })) + '</button>';
    }
    html += '</div>';

    var filtered = rows.filter(function (r) {
      if (activityTab === 'all') return true;
      if (activityTab === 'nosite') return !r.__site;
      return r.__site === activityTab;
    });
    var shown = filtered.slice(0, FEED_LIMIT);

    html += '<p class="muted small">' +
      esc(L({ ar: 'يُحدَّث عند فتح هذه الشاشة أو تحديثها — ليس لحظياً.',
              en: 'Refreshed when this screen opens or is refreshed — not live.' })) +
      ' · ' + esc(L({ ar: 'يعرض', en: 'Showing' })) + ' <strong class="num">' + shown.length + '</strong> ' +
      esc(L({ ar: 'من', en: 'of' })) + ' <strong class="num">' + filtered.length + '</strong></p>';

    if (!shown.length) {
      html += (global.UI && global.UI.empty)
        ? global.UI.empty(L({ ar: 'لا يوجد نشاط مسجَّل بعد.', en: 'No recorded activity yet.' }), '')
        : '<p class="muted">' + esc(L({ ar: 'لا يوجد نشاط مسجَّل بعد.', en: 'No recorded activity yet.' })) + '</p>';
    } else {
      html += '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        '<th>' + esc(L({ ar: 'من', en: 'Who' })) + '</th>' +
        '<th>' + esc(L({ ar: 'الإجراء', en: 'Action' })) + '</th>' +
        '<th>' + esc(L({ ar: 'الشاشة والسجل', en: 'Screen & record' })) + '</th>' +
        '<th>' + esc(L({ ar: 'ما تغيّر', en: 'What changed' })) + '</th>' +
        '<th>' + esc(L({ ar: 'الوقت', en: 'When' })) + '</th>' +
        '</tr></thead><tbody>';
      shown.forEach(function (r) {
        html += '<tr class="clickable" data-az-entity="' + attr(r.entity) + '" data-az-record="' + attr(r.recordId) + '">' +
          '<td>' + esc(r.userName || '—') + '</td>' +
          '<td><span style="font-weight:700;color:' + (VERB_TONE[r.action] || '#475467') + '">' +
            esc(L(VERB[r.action] || { ar: r.action, en: r.action })) + '</span></td>' +
          '<td>' + esc(screenLabel(r.entity)) + (r.label ? ' — ' + esc(r.label) : '') + '</td>' +
          '<td class="small muted">' + esc(r.extra || '—') + '</td>' +
          '<td class="num" style="white-space:nowrap">' +
            esc((global.I18N && global.I18N.dateTime) ? global.I18N.dateTime(r.at) : r.at) + '</td>' +
          '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';

    host.innerHTML = html;
    wireSiteActivity(host);
  }

  function wireSiteActivity(host) {
    host.querySelectorAll('[data-az-act-site]').forEach(function (b) {
      b.onclick = function () {
        activityTab = b.getAttribute('data-az-act-site');
        renderSiteActivity(host);
      };
    });
    host.querySelectorAll('tr[data-az-record]').forEach(function (tr) {
      tr.onclick = function () {
        var table = tr.getAttribute('data-az-entity');
        var id = tr.getAttribute('data-az-record');
        var targetMod = global.Schema && global.Schema.MODULES &&
          global.Schema.MODULES.filter(function (m) { return m.table === table; })[0];
        var rec = global.Store && global.Store.find(table, id);
        if (!targetMod || !rec) {
          if (global.UI && global.UI.toast) {
            global.UI.toast(L({ ar: 'السجل لم يعد موجوداً.', en: 'This record no longer exists.' }), 'error');
          }
          return;
        }
        /* EntityPage.openDetail مُصدَّرة (entity.js:873-875) وسبق أن غلّفها
           audit-trail.js بنفس الطريقة لعرض تاريخ السجل أسفله — القفز هنا
           يفتح السجل مباشرة، وسجل عملياته يظهر تحته تلقائياً (W3). */
        global.EntityPage.openDetail(targetMod.id, id);
      };
    });
  }

  /* ═══════════════════════════════════════════════════════════════════
     الجزء ب · تبويبات المواقع أعلى شاشات القوائم متعددة المواقع
     PART B · SITE TABS ON MULTI-SITE LIST SCREENS
     ═══════════════════════════════════════════════════════════════════ */

  /* moduleId → 'all' | 'nosite' | معرّف موقع — تعيش هنا، خارج أي دالة
     رسم، فتنجو من إعادات الرسم الداخلية في entity.js (T2). */
  var tabStateByModule = {};
  /* moduleId → عقدة الشريط المُدرَجة فعلاً في الصفحة الآن، لمعرفة إن
     مُحيت فنعيد زرعها، أو لا تزال هناك فلا نُكرّر الإدراج. */
  var barNodes = {};
  /* دالة Auth.scopeRows كما كانت قبل تغليفنا — تُستعمل لحساب الصفوف
     الأساسية (قبل فلتر تبويبنا) عند بناء الشريط، دون أن تستدعي هي نفسها
     فلترتنا فتُخفي معلومات نحتاجها لعرض الشريط نفسه. */
  var origScopeRows = null;

  function eligibleForTabs(mod) {
    return !!(mod && Array.isArray(mod.fields) && mod.fields.some(function (f) { return f.name === 'site'; }));
  }

  function shouldShowTabs(mod) {
    if (!eligibleForTabs(mod)) return false;
    /* المستخدم أحادي الموقع لا يرى أصلاً غير موقعه (Sites.scopeBySite) —
       تبويبات لما لا يملك غيره تضليل بلا فائدة (T5's twin: single-site
       users get no bar — their sites list is one row). Auth.seesAllSites
       مُركَّبة بواسطة site-fence-retry.js مباشرة بعد auth.js — قبل هذا
       الملف بمراحل طويلة (انظر رأس الملف). */
    var seesAll = (global.Auth && global.Auth.seesAllSites) ? global.Auth.seesAllSites() : false;
    return !!seesAll;
  }

  function siteChipInfo(moduleId, mod) {
    var sites = activeSites();
    var base = origScopeRows ? origScopeRows(moduleId, ((global.Store && global.Store.all(mod.table)) || [])) : [];
    if (!Array.isArray(base)) base = [];
    var hasNoSite = base.some(function (r) { return r && !r.site; });
    return { sites: sites, hasNoSite: hasNoSite };
  }

  function installScopeRowsWrap() {
    if (!global.Auth || !global.Auth.scopeRows || global.Auth.__siteTabsScoped) return;
    global.Auth.__siteTabsScoped = true;
    origScopeRows = global.Auth.scopeRows;
    global.Auth.scopeRows = function (moduleId, rows) {
      var out = origScopeRows.apply(global.Auth, arguments);
      if (!Array.isArray(out)) return out;
      /* لا نُفلتر إلا حين تكون هذه الشاشة هي المفتوحة فعلياً — App.route()
         هو نفس المتغيّر الذي يضبطه app.js مباشرة قبل نداء
         EntityPage.render (app.js:231-254)، وهو أوثق من location.hash
         الذي قد يبقى قديماً من جلسة سابقة قبل تسجيل الدخول. هذا الحارس
         يمنع التسريب إلى لوحة التحكم أو أي مكان آخر يستدعي
         Auth.scopeRows لنفس الوحدة وهي ليست الشاشة المفتوحة (T5/T2).
         Only filter while THIS screen is genuinely the one open —
         App.route() is the exact variable app.js sets immediately before
         calling EntityPage.render (app.js:231-254), more reliable than
         location.hash, which can still hold a stale value from before
         login. This guard stops the filter leaking into the dashboard or
         anywhere else that calls Auth.scopeRows for the same module while
         it is not the screen actually on view. */
      if (!(global.App && global.App.route && global.App.route() === moduleId)) return out;
      var mod = global.Schema && global.Schema.get(moduleId);
      if (!shouldShowTabs(mod)) return out;
      var sel = tabStateByModule[moduleId] || 'all';
      if (sel === 'all') return out;
      if (sel === 'nosite') return out.filter(function (r) { return !r || !r.site; });
      return out.filter(function (r) { return r && r.site === sel; });
    };
  }

  /* الشريط يُبنى بعناصر DOM حقيقية (createElement)، لا بنص HTML يُحقَن
     ثم يُستعلَم عنه — نفس أسلوب audit-trail.js في زر «إلغاء المستند»
     (audit-trail.js:428-451). هذا أبسط ويقاوم التكرار، ويسهل اختباره في
     TESTS بعنصر وهمي بسيط بلا محلّل HTML كامل.
     Built with REAL DOM nodes (createElement), not an HTML string that
     gets re-queried afterwards — the same technique audit-trail.js already
     uses for its "cancel document" button (audit-trail.js:428-451). This
     is simpler, resists double-injection, and is far easier to prove in
     TESTS with a small fake element rather than a full HTML parser. */
  function buildTabsBar(moduleId, mod, host) {
    var info = siteChipInfo(moduleId, mod);
    var sel = tabStateByModule[moduleId] || 'all';
    var bar = document.createElement('div');
    bar.className = 'chip-row az-site-tabs';

    function addChip(value, label) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'filter-chip' + (sel === value ? ' active' : '');
      b.textContent = String(label == null ? '' : label);
      b.setAttribute('data-az-site', value);
      b.onclick = function () {
        tabStateByModule[moduleId] = value;
        global.EntityPage.render(moduleId, host);
      };
      bar.appendChild(b);
    }

    addChip('all', L({ ar: 'كل المواقع', en: 'All sites' }));
    info.sites.forEach(function (s) { addChip(s.id, s.name || s.code || s.id); });
    if (info.hasNoSite) addChip('nosite', L({ ar: 'بدون موقع', en: 'No site' }));
    return bar;
  }

  function ensureTabsBar(moduleId, host) {
    var mod = global.Schema && global.Schema.get(moduleId);
    if (!shouldShowTabs(mod)) return;
    if (!host || !host.querySelector) return;
    var card = host.querySelector('.card');
    if (!card) return;
    var existing = barNodes[moduleId];
    /* الشريط موجود بالفعل ومتصل بنفس البطاقة — لا نُكرّر الإدراج. هذا ما
       يمنع الحلقة اللانهائية بين مراقب الطفرات وإدراجنا نحن أنفسنا، ويمنع
       ازدواج الشريط لو استُدعيت هذه الدالة مرتين لأي سبب (T2).
       The bar already exists and is still attached to THIS card — do not
       insert again. This is exactly what stops the mutation observer from
       looping against our own insertion, and stops a doubled bar if this
       function is ever called twice for the same reason (T2). */
    if (existing && existing.parentNode === card) return;
    var bar = buildTabsBar(moduleId, mod, host);
    card.insertBefore(bar, card.firstChild || null);
    barNodes[moduleId] = bar;
  }

  function installRenderWrap() {
    if (!global.EntityPage || global.EntityPage.__siteActivityWrapped) return;
    global.EntityPage.__siteActivityWrapped = true;
    var origRender = global.EntityPage.render;
    global.EntityPage.render = function (moduleId, host) {
      if (moduleId === SITE_ACTIVITY_ID) { renderSiteActivity(host); return; }
      origRender(moduleId, host);
      ensureTabsBar(moduleId, host);
    };
  }

  var observing = false;
  function installContentObserver() {
    if (observing || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    var content = document.getElementById('content');
    if (!content) return;
    observing = true;
    new MutationObserver(function () {
      /* أي إعادة رسم داخلية في entity.js تستبدل innerHTML كاملاً فتمحو
         شريطنا — هذا هو الحارس الذي يزرعه من جديد (T2). نقرأ الشاشة
         المفتوحة الآن من App.route() في كل مرة، لا من أي حالة قديمة. */
      var moduleId = global.App && global.App.route && global.App.route();
      if (!moduleId) return;
      ensureTabsBar(moduleId, document.getElementById('content'));
    }).observe(content, { childList: true });
  }

  /* ═══════════════════════════════════════════════════════════════════
     التركيب · INSTALL
     ═══════════════════════════════════════════════════════════════════ */
  function install() {
    registerModule();
    grantPerms();
    installScopeRowsWrap();
    installRenderWrap();
    installContentObserver();
  }

  function start() {
    install();
    /* شبكة أمان فقط — ترتيب التحميل في loader.js يضمن جاهزية كل ما
       يحتاجه هذا الملف قبل موضعه (انظر رأس الملف)، لكن الإعادة هنا
       بلا كلفة تُذكر، وكل دالة أعلاه محروسة فلا تُكرِّر عملها.
       A pure safety net — loader.js's ordering already guarantees
       everything this file needs is ready before its position (see the
       file header), but repeating this costs nothing, and every function
       above is guarded so it never repeats its own work. */
    [0, 300, 1200].forEach(function (ms) { setTimeout(install, ms); });
  }
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
    else start();
  }

  /* مُصدَّرة لِتَجمَع دواعي التركيب أعلاه ولإتاحة اختبار كل دالة منطقية
     وحدها في TESTS دون الحاجة لمتصفح حقيقي.
     Exported so the install pieces above can be driven, and so every pure
     logic function can be exercised on its own in TESTS without a real
     browser. */
  global.SiteActivity = {
    MODULE_ID: SITE_ACTIVITY_ID,
    HR_ENTITIES: HR_ENTITIES,
    MODULE: SITE_ACTIVITY_MODULE,
    registerModule: registerModule,
    grantPerms: grantPerms,
    activeSites: activeSites,
    recordSiteOf: recordSiteOf,
    feedRows: feedRows,
    render: renderSiteActivity,
    getActivityTab: function () { return activityTab; },
    setActivityTab: function (v) { activityTab = v; },
    eligibleForTabs: eligibleForTabs,
    shouldShowTabs: shouldShowTabs,
    getTabState: function (moduleId) { return tabStateByModule[moduleId] || 'all'; },
    setTabState: function (moduleId, v) { tabStateByModule[moduleId] = v; },
    installScopeRowsWrap: installScopeRowsWrap,
    installRenderWrap: installRenderWrap,
    installContentObserver: installContentObserver,
    ensureTabsBar: ensureTabsBar,
    install: install,
    __barNodes: barNodes
  };
})(window);

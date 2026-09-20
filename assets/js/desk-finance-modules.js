/* =========================================================================
   desk-finance-modules.js — الحقول الجديدة على شاشات المال + تسجيل شاشتَي العهدة
                             New fields on the money screens + registering
                             the two custody modules
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ١: الأساس).
      ACCOUNTANT'S DESK — v2.0.38. Part of the "accountant's desk"
      (Slice 1: foundation).

   لماذا هذا الملف · WHY THIS FILE
   -------------------------------------------------------------------------
   sites.js:222-233 يضيف حقل «الموقع» لثلاثين شاشة بنمط ثابت (S.get، فحص
   عدم التكرار، الإدراج بعد حقل project أو في الموضع ١). شاشات المال
   الخمس (سندات الصرف/القبض، فواتير الموردين، القيود، الخزائن) لم تكن من
   بينها — فلا مستند مالي يحمل موقعاً، ومحاسب طنطا يرى (أو لا يرى) كل
   شيء بلا تمييز. هذا الملف يكرّر النمط نفسه حرفياً على الشاشات الخمس،
   ويضيف حقلَي entryRoute (مباشر/ورقي) وpaperRef (مرجع الورقة) لتتبّع
   الإدخال المركزي نيابةً عن موقع (الخطة §4.1).

   sites.js:222-233 adds a "site" field to thirty screens with a fixed
   pattern (S.get, a duplicate guard, insertion after the project field or
   at position 1). The five money screens were not among them, so no money
   document carried a site at all. This file repeats the EXACT SAME pattern
   on those five screens, and adds entryRoute (direct/paper) and paperRef
   (the paper's reference) to track central "on behalf of a site" entry
   (plan §4.1).

   لماذا يكفي هذا لتقييد القوائم أيضاً — بلا كود إضافي هناك
   WHY THIS ALONE ALSO SCOPES THE LISTS — no extra code elsewhere
   -------------------------------------------------------------------------
   sites.js:258-267 (scopeBySite) لا تفحص اسم الشاشة، بل تفحص فقط: «هل
   تملك هذه الوحدة حقلاً اسمه site الآن؟» — وهي تُستدعى وقت الاستعمال
   (بعد اكتمال كل ملفات التحميل)، لا وقت تحميل sites.js نفسه. فبمجرد أن
   يصبح لسندات الصرف مثلاً هذا الحقل، تدخل تلقائياً تحت نفس التصفية التي
   تعمل بها الشاشات الثلاثون الأخرى — تماماً كما فعل project-site-field.js
   لشاشة المشروعات.
   sites.js's scopeBySite does not check the screen's name — only "does
   this module have a field called site NOW?" — and it runs at USE time
   (after every loader file has finished), not at sites.js's own load
   time. So the moment payments (say) has that field, it falls under the
   exact same filtering the other thirty screens already use — exactly
   what project-site-field.js already proved for the projects screen.

   ما هذا الملف لا يفعله (الشريحة ١ فقط) · WHAT THIS FILE DOES NOT DO YET
   (slice 1 only)
   -------------------------------------------------------------------------
   لا quickEntry ولا lines ولا validate على الوحدتين الجديدتين — هذه أعمال
   الشريحة ٢ (لوحة المفاتيح + العهدة). الوحدتان هنا بحقول رأس فقط، تكفي
   لتظهر الشاشة وتُفتح نموذجها. سياج تركيب الجدولين (موجودتان في القاعدة
   أم لا) ليس هنا: هذا الملف يُسجِّل الوحدتين دائماً، وdesk-finance.js هو
   من يُلغي تسجيلهما وقت الدخول الفعلي إن كان الجدولان غائبين (الفاحص —
   see the probe in desk-finance.js). فصل الاثنين مقصود: هذا الملف يعمل
   بلا اتصال بقاعدة بيانات على الإطلاق (وقت تحميل السكربتات)، والفاحص
   يحتاج جلسة متّصلة (وقت storage.initialize).
   No quickEntry/lines/validate on the two new modules — that is slice 2's
   job (keyboard + custody). They carry header fields only here, enough
   for the screen to exist and its form to open. The "are the two tables
   actually installed" guard is NOT here: this file always registers both
   modules, and desk-finance.js is what UNregisters them at real login time
   if the tables are missing (the probe). The split is deliberate: this
   file runs with no database connection at all (script load time), and
   the probe needs a live session (Store.initialize time).

   إضافي بالكامل — حذف هذا الملف يعيد الشاشات الخمس والوحدتين الجديدتين
   إلى ما كانتا عليه اليوم تماماً؛ لا يُعدَّل schema.js.
   Fully additive — deleting this file returns the five screens and the two
   new modules to exactly today's shape. schema.js is never edited.

   يُحمَّل بعد hr-department.js/payroll-net.js وقبل dc-requests.js (خطة
   الملفات §9.1) — قبل أي ملف يقرأ حقول هذه الشاشات لاحقاً (site-field-
   required.js على السطر ٦١٤، ودesk-money-site.js بعده).
   Loads after hr-department.js/payroll-net.js and before dc-requests.js
   (file plan §9.1) — before anything that later reads these screens'
   fields (site-field-required.js at line 614, and desk-money-site.js
   after it).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('desk-finance-modules.js needs schema.js first — not installed'); return; }
  var S = global.Schema;

  /* أدوات محلية بنفس شكل sites.js — لا نستورد شيئاً من schema.js المغلق
     Local helpers, same shape as sites.js — nothing imported from
     schema.js's closed-over helpers. */
  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }
  var SEC = {
    main:  { ar: 'البيانات الأساسية', en: 'Main information' },
    link:  { ar: 'الربط', en: 'Links' },
    money: { ar: 'البيانات المالية', en: 'Financial details' },
    extra: { ar: 'بيانات إضافية', en: 'Additional information' }
  };

  var ENTRY_ROUTE_OPTIONS = [
    { value: 'direct', label: { ar: 'مباشر من الموقع', en: 'Direct from the site' } },
    { value: 'paper',  label: { ar: 'ورقي — أُدخل مركزياً نيابةً عن موقع', en: 'Paper — entered centrally on behalf of a site' } }
  ];

  function entryRouteField() {
    return F('entryRoute', 'طريقة الإدخال', 'Entry route', 'select', {
      default: 'direct', options: ENTRY_ROUTE_OPTIONS, section: SEC.extra,
      help: { ar: 'مباشر: أدخله محاسب الموقع بنفسه. ورقي: أدخله محاسب مركزي نيابةً عن الموقع من ورقة وصلته.',
              en: 'Direct: the site\'s own accountant entered it. Paper: a central accountant entered it on behalf of the site from a paper that reached them.' }
    });
  }
  function paperRefField() {
    return F('paperRef', 'مرجع الورقة', 'Paper reference', 'text', {
      section: SEC.extra,
      help: { ar: 'رقم/وصف الورقة الأصلية عند الإدخال المركزي نيابةً عن موقع',
              en: 'The original paper\'s number/description for a central on-behalf-of entry' }
    });
  }
  function siteField() {
    return F('site', 'الموقع', 'Site', 'ref', {
      ref: 'sites', refLabel: 'name', section: SEC.main,
      help: { ar: 'الموقع الذي صدر منه هذا المستند المالي', en: 'The site this money document came from' }
    });
  }
  function openingDateField() {
    return F('openingDate', 'تاريخ بدء الرصيد', 'Balance start date', 'date', {
      section: SEC.extra,
      help: { ar: 'حركات ما قبل هذا التاريخ لا تُحتسب في رصيد هذا الحساب (حاجز التاريخ)',
              en: 'Movements before this date are not counted in this account\'s balance (the history gate)' }
    });
  }

  /* ── إضافة الحقول الثلاثة (site/entryRoute/paperRef) لأربع شاشات ─────────
     ADD THE THREE FIELDS to four modules — نفس حراسة sites.js بالحرف: لا
     تكرار إن كان الحقل موجوداً، والإدراج بعد project حيث وُجد.
     Same duplicate guard as sites.js, verbatim: skip if present; insert
     after "project" where one exists. */
  var MONEY_MODULES_SITE_ENTRY = ['payments', 'supplierInvoices', 'receipts', 'journal'];
  /* 🔴 مُصلَّح — ملاحظة مُدقِّق Fable: openingDate كان يُسجَّل خطأً داخل
     addedSite (نسخ-لصق). دلوٌ خاصٌّ به الآن.
     🔴 FIXED — Fable integrator note: openingDate was mistakenly logged
     into addedSite (a copy-paste). It has its own bucket now. */
  var addedSite = [], addedEntryRoute = [], addedPaperRef = [], addedOpeningDate = [];

  function insertAfterProjectOrStart(mod, field) {
    var i = mod.fields.findIndex(function (f) { return f.name === 'project'; });
    if (i === -1) mod.fields.splice(1, 0, field); else mod.fields.splice(i + 1, 0, field);
  }
  function pushIfMissing(mod, name, build, bucket) {
    if (mod.fields.some(function (f) { return f.name === name; })) return;
    var f = build();
    if (name === 'site') insertAfterProjectOrStart(mod, f); else mod.fields.push(f);
    bucket.push(mod.id);
  }

  MONEY_MODULES_SITE_ENTRY.forEach(function (id) {
    var m = S.get(id);
    if (!m || !m.fields) { console.error('desk-finance-modules.js: module "' + id + '" not found — nothing added to it'); return; }
    pushIfMissing(m, 'site', siteField, addedSite);
    pushIfMissing(m, 'entryRoute', entryRouteField, addedEntryRoute);
    pushIfMissing(m, 'paperRef', paperRefField, addedPaperRef);
  });

  /* ── الخزائن/البنوك: site + openingDate فقط (لا entryRoute/paperRef —
     الخزينة نفسها ليست «ورقة»، بل حاوية) ─────────────────────────────────
     Cash & bank accounts: site + openingDate only (a cash box is not
     itself "a paper" — it is a container). */
  (function () {
    var m = S.get('cashAccounts');
    if (!m || !m.fields) { console.error('desk-finance-modules.js: module "cashAccounts" not found — nothing added to it'); return; }
    pushIfMissing(m, 'site', siteField, addedSite);
    pushIfMissing(m, 'openingDate', openingDateField, addedOpeningDate);
  })();

  /* ── الموردون: openingDate (بند ٣.١ في الخطة — نفس حاجز التاريخ) ────────
     Suppliers: openingDate (plan §3.1 — the same history gate). */
  (function () {
    var m = S.get('suppliers');
    if (!m || !m.fields) { console.error('desk-finance-modules.js: module "suppliers" not found — nothing added to it'); return; }
    pushIfMissing(m, 'openingDate', openingDateField, addedOpeningDate);
  })();

  /* ═══════════════════════════════════════════════════════════════════
     الوحدتان الجديدتان: تحويل نقدية (CT) وتسوية عهدة (CS)
     THE TWO NEW MODULES: custody transfer (CT) and custody settlement (CS)
     -------------------------------------------------------------------
     حقول رأس فقط في هذه الشريحة — لا lines ولا quickEntry (الشريحة ٢).
     يُسجَّلان دائماً هنا؛ desk-finance.js يُلغي تسجيلهما وقت الدخول إن
     غاب الجدولان (الفاحص). Header fields only this slice — no lines/
     quickEntry (slice 2). Always registered here; desk-finance.js
     UNregisters them at login time if the tables are missing (the probe).
     ═══════════════════════════════════════════════════════════════════ */
  var CUSTODY_TRANSFERS = {
    id: 'custodyTransfers', table: 'custodyTransfers', group: 'finance', icon: 'arrow-up',
    label: { ar: 'تحويل نقدية (عهدة)', en: 'Cash transfer (custody)' },
    desc: { ar: 'تمويل أو استرجاع عهدة نقدية بين خزينة مركزية وخزينة عهدة موقع',
            en: 'Fund or reclaim a custody cash box, between a central box and a site custody box' },
    workflow: true, skipReview: true, docPrefix: 'CT', amountField: 'amount',
    search: ['docNo', 'notes'],
    columns: ['docNo', 'date', 'site', 'fromCashAccount', 'toCashAccount', 'amount', 'status'],
    fields: [
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      siteField(),
      F('fromCashAccount', 'من خزينة', 'From cash account', 'ref', { ref: 'cashAccounts', refLabel: 'name', required: true, section: SEC.money }),
      F('toCashAccount', 'إلى خزينة العهدة', 'To custody box', 'ref', { ref: 'cashAccounts', refLabel: 'name', required: true, section: SEC.money }),
      F('amount', 'المبلغ', 'Amount', 'money', { required: true, section: SEC.money }),
      entryRouteField(), paperRefField(),
      /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (job3، صيد الأخطاء) — كان هذا
         الحقل مسمّى "notes" هنا بينما عمود القاعدة الحقيقي في
         الملف 87 (87-CUSTODY-DOCUMENTS.sql) لـ"custodyTransfers" هو "description"
         (لا عمود "notes" على هذا الجدول إطلاقاً). فإرسال قيمة فيه
         (store.js يرسل draft كما هو إلى .insert()) كان يجعل PostgREST
         يرفض الصف كله بعمود غير معروف — تحويل نقدية يحمل ملاحظة كان
         يفشل حفظه بصمت (يبقى محلياً بحالة _syncState:'conflict' فقط،
         لا يصل الخادم أبداً)، بينما تحويل بلا ملاحظة (المفتاح غير
         موجود في draft أصلاً) كان ينجح. عُثر عليه بقراءة مسودة الملف
         87 يومها قبل التشغيل، وأثبته t06 بتعليقه أعلى
         السطر ١٩٨ («ترك بلا ضبط عمداً، بلاغ منفصل»). الإصلاح: اسم الحقل
         نفسه يصبح "description" — يطابق العمود بالحرف؛ التسمية الظاهرة
         للمستخدم (العربي/الإنجليزي) بقيت "ملاحظات"/"Notes" بلا تغيير.
         🔴 A SERIOUS defect found by actually running this (job3, bug
         hunt) — this field was named "notes" here while the REAL
         database column on "custodyTransfers" in file 87 (87-CUSTODY-DOCUMENTS.sql)
         is "description" (that table has no "notes" column at all). So
         sending a value in it (store.js sends draft as-is to .insert())
         made PostgREST refuse the WHOLE row with an unknown column — a
         cash transfer WITH a note silently failed to save (stayed local
         only, forever "_syncState:'conflict'", never reaching the
         server), while a transfer with no note (the key never set in
         draft at all) succeeded. Found by reading file 87's draft at the
         time, before running anything, and proven by t06's own
         comment above its line 198 ("left unset on purpose, reported
         separately"). THE FIX: the field's internal name is now
         "description" — matches the column verbatim; the user-visible
         label (Arabic/English) is unchanged, still "ملاحظات"/"Notes". */
      F('description', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ]
  };

  var CUSTODY_SETTLEMENTS = {
    id: 'custodySettlements', table: 'custodySettlements', group: 'finance', icon: 'edit',
    label: { ar: 'تسوية عهدة', en: 'Custody settlement' },
    desc: { ar: 'تصريف بنود مصروفات على عهدة موقع، سطراً سطراً',
            en: 'Line-by-line expense settlement against a site\'s custody box' },
    /* skipReview غائب عمداً — تسوية العهدة درجة FULL (مسودة←مراجعة←اعتماد)
       skipReview is deliberately absent — a settlement is FULL tier
       (draft → review → approve), per plan §2 journey J-A. */
    workflow: true, docPrefix: 'CS', amountField: 'totalAmount',
    search: ['docNo', 'notes'],
    /* 🔴 تصحيح ١٩ سبتمبر (الشريحة ٢) — كان هذا الحقل مسمّى "custodyBox" هنا
       بينما عمود القاعدة الحقيقي في الملف 87 (87-CUSTODY-DOCUMENTS.sql) هو "custodyAccount"
       (تعريف الجدول وكل استعمالاته اللاحقة في الحارس وباب المراجعة). كان الحفظ
       سيفشل بصمت: store.js يُرسل مفتاح "custodyBox" لا عمود له في الجدول.
       عُثر عليه بقراءة الملفين معاً قبل بناء الشبكة، لا بتجربة فاشلة لاحقاً.
       🔴 CORRECTED 19 Sept (slice 2) — this field was named "custodyBox"
       here while the REAL database column in file 87 (87-CUSTODY-DOCUMENTS.sql) is
       "custodyAccount" (the table definition and every later use in the guard and the
       review door). Saving would have failed silently: store.js would send
       a "custodyBox" key with no matching column. Found by reading both
       files together before building the grid, not by a later failed trial. */
    columns: ['docNo', 'date', 'site', 'custodyAccount', 'totalAmount', 'acceptedTotal', 'status'],
    fields: [
      F('date', 'التاريخ', 'Date', 'date', { required: true, default: 'today', section: SEC.main }),
      siteField(),
      F('custodyAccount', 'خزينة العهدة', 'Custody box', 'ref', { ref: 'cashAccounts', refLabel: 'name', required: true, section: SEC.money }),
      F('custodian', 'صاحب العهدة', 'Custodian', 'ref', { ref: 'employees', refLabel: 'name', section: SEC.money }),
      F('totalAmount', 'إجمالي المُطالَب به', 'Claimed total', 'money', { readonly: true, section: SEC.money,
        help: { ar: 'يُحسب من إجمالي أسطر التسوية — الشريحة ٢', en: 'Computed from the settlement lines — slice 2' } }),
      F('acceptedTotal', 'إجمالي المقبول', 'Accepted total', 'money', { readonly: true, section: SEC.money }),
      F('correctionOf', 'تصحيح لتسوية', 'Correction of', 'ref', { ref: 'custodySettlements', refLabel: 'docNo', section: SEC.link }),
      entryRouteField(), paperRefField(),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ]
  };

  var NEW_MODULE_IDS = ['custodyTransfers', 'custodySettlements'];
  var extraById = { custodyTransfers: CUSTODY_TRANSFERS, custodySettlements: CUSTODY_SETTLEMENTS };
  var unregistered = {};   /* moduleId -> true إن أُلغي تسجيلها بالفاحص */

  NEW_MODULE_IDS.forEach(function (id) {
    if (!S.MODULES.some(function (m) { return m.id === id; })) S.MODULES.push(extraById[id]);
  });

  /* Schema.get مغلَّف بالفعل (departments.js، sites.js) — نضيف حلقة أخرى
     بنفس النمط. Schema.get is already wrapped (departments.js, sites.js) —
     add one more link in the same chain, same pattern. */
  var origGet = S.get;
  S.get = function (id) {
    if (unregistered[id]) return null;
    return origGet(id) || (extraById[id] && !unregistered[id] ? extraById[id] : null);
  };

  /* ── واجهة الإلغاء/الاستعادة لصالح فاحص desk-finance.js ────────────────
     UNREGISTER/RESTORE, for desk-finance.js's probe to call. Removing from
     Schema.MODULES too (not just S.get) matters: store.js:tableNames(),
     Workflow.inbox(), app.js's modulesIn() and the search palette all
     iterate Schema.MODULES directly, never through S.get. */
  function unregister(id) {
    if (!extraById[id] || unregistered[id]) return;
    unregistered[id] = true;
    var i = S.MODULES.findIndex(function (m) { return m.id === id; });
    if (i !== -1) S.MODULES.splice(i, 1);
  }
  function reregister(id) {
    if (!extraById[id] || !unregistered[id]) return;
    unregistered[id] = false;
    if (!S.MODULES.some(function (m) { return m.id === id; })) S.MODULES.push(extraById[id]);
  }
  function isRegistered(id) { return !!extraById[id] && !unregistered[id]; }

  global.DeskFinanceModules = {
    NEW_MODULE_IDS: NEW_MODULE_IDS,
    MONEY_MODULES_SITE_ENTRY: MONEY_MODULES_SITE_ENTRY.concat(['cashAccounts']),
    unregister: unregister, reregister: reregister, isRegistered: isRegistered,
    addedSite: addedSite, addedEntryRoute: addedEntryRoute, addedPaperRef: addedPaperRef, addedOpeningDate: addedOpeningDate
  };

  console.info('desk-finance-modules.js: site field on ' + addedSite.length +
    ' module(s), openingDate on ' + addedOpeningDate.length +
    '; ' + NEW_MODULE_IDS.length + ' new module(s) registered (custody, header fields only — slice 1).');
})(window);

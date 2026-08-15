/* =========================================================================
   sites.js — المواقع والفروع · Sites and locations
   -------------------------------------------------------------------------
   الشركة تعمل من أربعة أماكن، والناس فيها غير متصلين ببعضهم:

     · الروبيكي   — مشروع كوبري   (أ. أحمد عبد الحي — ضبط المستندات)
     · سوهاج      — مشروع رصف طرق
     · القرين     — مكتب المحاسبين والموارد البشرية (أ. محمد عمارة)
     · المركز الرئيسي — الإدارة

   قبل هذا الملف لم يكن في النظام مفهوم «الموقع» أصلاً. كان هناك مشروعات
   ومخازن فقط. النتيجة أن أحمد في الروبيكي يرى مستندات سوهاج، ومحمد في
   القرين يرى كل شيء بلا تمييز، ولا أحد «ينتمي» لمكان.

   Before this file the portal had no concept of a place. It had projects
   and warehouses. So Ahmed at Elrobaki saw Sohag's documents, and nothing
   belonged anywhere.

   -------------------------------------------------------------------------
   القاعدة المهمة · THE RULE THAT MATTERS

   موقعان يجمعان بيانات الشركة كلها، والموقعان الآخران يريان عملهما فقط:

     القرين          allSites = true   ← «مكتب يجمع معلومات الشركة كلها»
     المركز الرئيسي  allSites = true
     الروبيكي        allSites = false  ← يرى الروبيكي فقط
     سوهاج           allSites = false  ← يرى سوهاج فقط

   هذا هو سبب وجود الخانة. القرين وُصف بالحرف بأنه «مكتب للمحاسبين
   والموارد البشرية يجمع معلومات كل الشركة»، فلا معنى لحجب المواقع عنه.

   Two locations consolidate the whole company; the other two see only
   their own work. Elqurien was described as the office that gathers
   information for the entire company, so scoping it to itself would
   defeat its purpose.

   -------------------------------------------------------------------------
   ⭐ لإضافة موقع خامس: افتح شاشة «المواقع والفروع» وأضفه. لا كود.
      To add a fifth site: open the Sites screen and add it. No code.

   يُحمَّل بعد schema.js وقبل auth.js
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('sites.js needs schema.js first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }
  var SEC = {
    main:    { ar: 'البيانات الأساسية', en: 'Main information' },
    contact: { ar: 'بيانات الاتصال',    en: 'Contact details' },
    scope:   { ar: 'نطاق الاطّلاع',     en: 'Visibility scope' },
    extra:   { ar: 'بيانات إضافية',     en: 'Additional information' }
  };

  var SITE_TYPE = [
    { value: 'project',  label: { ar: 'موقع مشروع',       en: 'Project site' } },
    { value: 'office',   label: { ar: 'مكتب إداري',       en: 'Administrative office' } },
    { value: 'hq',       label: { ar: 'المركز الرئيسي',   en: 'Head office' } },
    { value: 'store',    label: { ar: 'مخزن',             en: 'Store' } },
    { value: 'workshop', label: { ar: 'ورشة',             en: 'Workshop' } }
  ];

  /* ═══════════════════════════════════════════════════════════════════
     ١ · شاشة المواقع والفروع
     ═══════════════════════════════════════════════════════════════════ */
  var SITES = {
    id: 'sites', table: 'sites', group: 'projects', icon: 'building',
    label: { ar: 'المواقع والفروع', en: 'Sites & locations' },
    desc: { ar: 'أماكن عمل الشركة — كل موظف ينتمي لموقع، وكل مستند يُنسب لموقع',
            en: 'Where the company works — every person belongs to a site, every document is attributed to one' },
    columns: ['code', 'name', 'siteType', 'city', 'allSites', 'status'],
    search: ['code', 'name', 'city'],
    fields: [
      F('code', 'الكود', 'Code', 'text',
        { required: true, section: SEC.main,
          help: { ar: 'اختصار قصير يظهر في أرقام المستندات — مثال ROB',
                  en: 'A short code that appears in document numbers, e.g. ROB' } }),
      F('name', 'اسم الموقع', 'Site name', 'text', { required: true, section: SEC.main }),
      F('siteType', 'النوع', 'Type', 'select',
        { options: SITE_TYPE, default: 'project', required: true, section: SEC.main }),
      F('project', 'المشروع المرتبط', 'Related project', 'ref',
        { ref: 'projects', refLabel: 'name', section: SEC.main,
          help: { ar: 'للمواقع الإنشائية فقط — المكاتب تُترك فارغة',
                  en: 'Construction sites only — leave empty for offices' } }),
      F('city', 'المحافظة / المدينة', 'Governorate / city', 'text', { section: SEC.main }),
      F('address', 'العنوان', 'Address', 'textarea', { section: SEC.contact, full: true }),
      F('manager', 'مسؤول الموقع', 'Site manager', 'ref',
        { ref: 'employees', refLabel: 'name', section: SEC.main }),
      F('phone', 'تليفون', 'Phone', 'phone', { section: SEC.contact }),

      F('allSites', 'يرى كل المواقع', 'Sees all sites', 'checkbox',
        { section: SEC.scope,
          help: { ar: 'فعّلها للمكاتب التي تجمع بيانات الشركة كلها — القرين والمركز الرئيسي. ' +
                      'اتركها فارغة لمواقع المشروعات حتى يرى كل موقع عمله فقط.',
                  en: 'Tick for offices that consolidate the whole company. Leave empty for ' +
                      'project sites so each sees only its own work.' } }),
      F('startDate', 'تاريخ الفتح', 'Opened on', 'date', { section: SEC.extra }),
      F('closeDate', 'تاريخ الإغلاق', 'Closed on', 'date', { section: SEC.extra }),
      F('headcount', 'عدد العاملين', 'Headcount', 'number', { section: SEC.extra }),
      F('hasInternet', 'يوجد إنترنت ثابت', 'Has reliable internet', 'checkbox',
        { default: true, section: SEC.extra,
          help: { ar: 'المواقع بلا إنترنت تعتمد على الحفظ دون اتصال',
                  en: 'Sites without internet rely on offline saving' } }),
      F('status', 'الحالة', 'Status', 'select',
        { options: S.YESNO, default: 'active', section: SEC.main }),
      F('notes', 'ملاحظات', 'Notes', 'textarea', { section: SEC.extra, full: true })
    ]
  };

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · المواقع الأربعة الحالية — تُنشأ تلقائياً إن كانت الشاشة فارغة
        The four current sites, created automatically the first time an
        administrator opens an empty Sites screen. Editable afterwards
        like any other record.
     ═══════════════════════════════════════════════════════════════════ */
  var SEED = [
    { id: 'site_robaki',  code: 'ROB', name: 'الروبيكي — مشروع الكوبري',
      siteType: 'project', city: 'الشرقية', allSites: false, status: 'active',
      notes: 'مشروع كوبري. أ. أحمد عبد الحي — ضبط المستندات.' },

    { id: 'site_sohag',   code: 'SOH', name: 'سوهاج — مشروع رصف الطرق',
      siteType: 'project', city: 'سوهاج', allSites: false, status: 'active',
      notes: 'مشروع رصف طرق.' },

    { id: 'site_qurien',  code: 'QUR', name: 'القرين — مكتب المحاسبة والموارد البشرية',
      siteType: 'office', city: 'الشرقية', allSites: true, status: 'active',
      notes: 'مكتب يجمع بيانات الشركة كلها. أ. محمد عمارة — مدير الموارد البشرية.' },

    { id: 'site_hq',      code: 'HQ',  name: 'المركز الرئيسي',
      siteType: 'hq', allSites: true, status: 'active',
      notes: 'الإدارة العليا.' }
  ];

  function seedIfEmpty() {
    if (!global.Store || !Store.isInitialized || !Store.isInitialized()) return;
    var u = global.Auth && Auth.current();
    if (!u || !global.Auth.isAdmin || !Auth.isAdmin()) return;   /* admin only */
    var existing = Store.all('sites') || [];
    if (existing.length) return;
    SEED.forEach(function (s) {
      try { Store.create('sites', Object.assign({}, s)); }
      catch (e) { console.warn('sites.js: could not create ' + s.code, e); }
    });
    console.info('sites.js: created the four company sites.');
    if (global.UI && UI.toast) {
      UI.toast('أُنشئت مواقع الشركة الأربعة. عدّلها من شاشة «المواقع والفروع».', 'success', 6000);
    }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · إضافة حقل «الموقع» للموظفين وللمستندات
        A document without a site cannot be scoped, so every screen that
        a site actually produces gets the field.
     ═══════════════════════════════════════════════════════════════════ */
  var SITE_FIELD = function () {
    return F('site', 'الموقع', 'Site', 'ref',
      { ref: 'sites', refLabel: 'name',
        section: { ar: 'البيانات الأساسية', en: 'Main information' },
        help: { ar: 'الموقع الذي صدر منه هذا المستند', en: 'The site this document came from' } });
  };

  /* Screens produced AT a site. Everything here becomes site-scoped. */
  var SITE_SCOPED = [
    /* الموارد البشرية */
    'employees', 'attendance', 'siteAttendance', 'dailyLabour',
    'employeeAdvances', 'employmentContracts', 'leaves',
    /* الموقع والتنفيذ */
    'wir', 'mir', 'pourCards', 'asphaltRecords', 'surveyRecords',
    'labourAllocation', 'ncr', 'siteInstructions', 'safetyReports', 'siteReports',
    /* ضبط المستندات */
    'docRegister', 'transmittals', 'rfi', 'submittals', 'correspondence', 'docArchive',
    /* المخازن */
    'goodsReceipts', 'stockIssues', 'stockTransfers', 'stockCounts', 'warehouses',
    /* المعدات */
    'equipment', 'equipmentLogs'
  ];

  var added = [];
  SITE_SCOPED.forEach(function (id) {
    var m = S.get(id);
    if (!m || !m.fields) return;
    if (m.fields.some(function (f) { return f.name === 'site'; })) return;
    /* place it straight after the project field where one exists, so the
       two location questions sit together on the form */
    var i = m.fields.findIndex(function (f) { return f.name === 'project'; });
    if (i === -1) m.fields.splice(1, 0, SITE_FIELD());
    else m.fields.splice(i + 1, 0, SITE_FIELD());
    added.push(id);
  });

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · تقييد الاطّلاع بالموقع
        Layered on top of the existing project scoping, not replacing it.
        A person sees a record when EITHER their site consolidates
        everything, OR the record belongs to their own site, OR the record
        has no site at all (older records, and company-wide masters).
     ═══════════════════════════════════════════════════════════════════ */
  function siteOf(user) {
    var u = user || (global.Auth && Auth.current());
    return u ? (u.site || null) : null;
  }

  function seesAllSites(user) {
    var u = user || (global.Auth && Auth.current());
    if (!u) return false;
    if (u.allSites === true) return true;              /* per-person override */
    var sid = siteOf(u);
    if (!sid) return true;   /* nobody assigned a site yet — do not lock the
                                company out of its own data on day one */
    var s = global.Store && Store.find('sites', sid);
    return !!(s && s.allSites);
  }

  function scopeBySite(moduleId, rows) {
    if (!Array.isArray(rows)) return rows;
    var m = S.get(moduleId);
    if (!m || !m.fields) return rows;
    if (!m.fields.some(function (f) { return f.name === 'site'; })) return rows;
    if (seesAllSites()) return rows;
    var mine = siteOf();
    if (!mine) return rows;
    return rows.filter(function (r) { return !r.site || r.site === mine; });
  }

  /* Wrap Auth.scopeRows so site filtering runs after project filtering.
     نلفّ الدالة الموجودة بدل تعديلها، فيمكن التراجع بحذف هذا الملف. */
  function install() {
    if (!global.Auth || Auth.__sitesInstalled) return;
    var orig = Auth.scopeRows;
    Auth.scopeRows = function (moduleId, rows) {
      var out = orig.apply(Auth, arguments);
      return scopeBySite(moduleId, out);
    };
    Auth.site = siteOf;
    Auth.seesAllSites = seesAllSites;
    Auth.__sitesInstalled = true;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · التسجيل
     ═══════════════════════════════════════════════════════════════════ */
  if (!S.MODULES.some(function (m) { return m.id === 'sites'; })) S.MODULES.push(SITES);
  var origGet = S.get;
  S.get = function (id) { return origGet(id) || (id === 'sites' ? SITES : null); };

  install();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { install(); setTimeout(seedIfEmpty, 2500); });
  } else { setTimeout(seedIfEmpty, 2500); }

  global.Sites = {
    SEED: SEED, MODULE: SITES,
    siteOf: siteOf, seesAllSites: seesAllSites, scopeBySite: scopeBySite,
    seed: seedIfEmpty, scopedScreens: added
  };

  console.info('sites.js: site field added to ' + added.length + ' screens.');
})(window);

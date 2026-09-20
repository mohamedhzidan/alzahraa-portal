/* =========================================================================
   desk-finance.js — ضبط «مكتب المحاسب» + فاحص تركيب جدولَي العهدة
                     The finance desk's own configuration + the custody
                     tables' install probe
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ١).

   جزء ١ — الضبط · PART 1 — THE CONFIG
   -------------------------------------------------------------------------
   يسجّل عند desk-kit.js الشكل الخاص بالمالية فقط: المسار (deskFinance)،
   المجموعة (finance)، ترتيب أزرار البدء السريع كما طلب محمود حلاوني
   (الخطة §11 ١٢، الافتراضي المعتمد)، وحدات الطابور، بلاطات الكشوف
   (عناوين فقط — الشريحة ٣ تبنيها)، وقائمة السجلّات الست عشرة.

   Registers finance's own shape with desk-kit.js: the route (deskFinance),
   the group (finance), the quick-start order Mahmoud asked for (plan §11
   item ١٢, the approved default), the queue modules, statement tiles
   (labels only — slice 3 builds them), and the sixteen registers.

   جزء ٢ — فاحص التركيب («الخطر ١» في الخطة، الأخطر في الشريحة كلّها)
   PART 2 — THE INSTALL PROBE (plan "danger #1", the most dangerous thing
   in this whole slice)
   -------------------------------------------------------------------------
   store.js:60-69 يبني قائمة الجداول من كل وحدة Schema **ظاهرة حالياً**،
   ثم store.js:114-127 يجلبها كلّها ويرمي عطلاً واحداً «database-load-
   failed» إن غاب جدول واحد — فلا يستطيع **أي** موظّف مالية الدخول، لا
   المحاسب فقط، لو ظلّت custodyTransfers/custodySettlements مُسجَّلتين في
   Schema.MODULES بلا جدولين حقيقيّين. هذا هو بالضبط ما يمنعه هذا الفاحص.

   store.js builds its table list from every CURRENTLY VISIBLE Schema
   module, then fetches all of them and throws ONE "database-load-failed"
   if even one table is missing — so NO finance employee could log in, not
   just the accountant, if custodyTransfers/custodySettlements stayed
   registered in Schema.MODULES with no real tables behind them. This probe
   is exactly what prevents that.

   لماذا هنا لا في desk-finance-modules.js · WHY HERE, NOT IN
   desk-finance-modules.js
   -------------------------------------------------------------------------
   الفحص يحتاج جلسة اتصال حقيقية (عميل Supabase) ليسأل «هل الجدول
   موجود؟» — وهذا غير متاح وقت تحميل السكربتات (desk-finance-modules.js
   يعمل بلا أي اتصال). فالتسجيل هناك دائم وغير مشروط؛ والإلغاء هنا،
   بمجرّد توفّر جلسة حقيقية، قبل أن يُستدعى loadRemote أصلاً — بلفّ
   Store.initialize (store.js:139) من الخارج، قبل استدعاء original.
   The probe needs a real connected session (a Supabase client) to ask "is
   this table there?" — unavailable at script-load time (desk-finance-
   modules.js runs with no connection at all). So registration there is
   unconditional; UNregistration happens here, the moment a real session
   exists, BEFORE loadRemote is ever called — by wrapping Store.initialize
   (store.js:139) from the outside, running before the original.

   إضافي بالكامل — حذف هذا الملف يلغي تسجيل المكتب المالي كلياً (لا زرّ
   في القائمة، لا بطاقة، لا مسار) بلا أي أثر على البقية، ويعيد الوحدتين
   الجديدتين مسجَّلتين دائماً (وقد كانتا كذلك أصلاً في desk-finance-
   modules.js، فحذف هذا الملف وحده لا يخاطر بشيء لأن الفاحص كان يمنع
   العطل لا يسبّبه).
   Fully additive — deleting this file un-registers the finance desk
   entirely (no menu button, no card, no route) with no effect on anything
   else, and leaves the two new modules always-registered again (which is
   what they already were in desk-finance-modules.js — deleting only this
   file risks nothing, since the probe PREVENTS the crash, it never causes
   one).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.DeskKit || !global.Schema || !global.DeskFinanceModules) {
    console.error('desk-finance.js needs desk-kit.js, schema.js and desk-finance-modules.js first — not installed');
    return;
  }

  /* ── الضبط ─────────────────────────────────────────────────────────── */
  var FINANCE_DESK = {
    id: 'deskFinance',
    group: 'finance',
    navIcon: 'box',
    label: { ar: 'مكتب المحاسب', en: 'Accountant\'s desk' },
    desc: { ar: 'طابور عملك، ابدأ سريعاً، كشوفك، وكل السجلّات — في مكانٍ واحد',
            en: 'Your work queue, quick starts, your statements, and every register — in one place' },
    /* ترتيب محمود حلاوني اليومي (الخطة §11 ١٢، افتراضي معتمد) */
    quickStarts: ['custodySettlements', 'custodyTransfers', 'payments', 'receipts', 'supplierInvoices', 'journal'],
    queueModules: ['payments', 'receipts', 'supplierInvoices', 'journal', 'custodyTransfers', 'custodySettlements'],
    /* عناوين فقط — الشريحة ٣ تبنيها فعلياً (كشف العهدة/المورد/المعدات/
       المصروف حسب البند أو الحساب/رابط المخزون) */
    statements: [
      { label: { ar: 'كشف العهدة', en: 'Custody statement' } },
      { label: { ar: 'كشف المورد', en: 'Supplier statement' } },
      { label: { ar: 'كشف المعدات', en: 'Equipment statement' } },
      { label: { ar: 'كشف المصروف حسب البند/الحساب', en: 'Expense by cost item / account' } },
      { label: { ar: 'رابط المخزون', en: 'Stock link' } }
    ],
    /* السجلّات الست عشرة الحقيقية — نفس شاشات المجموعة، بلا أي تغيير فيها */
    registers: ['journal', 'suppliers', 'customers', 'costItems', 'purchaseApprovals', 'goodsReceipts',
      'supplierInvoices', 'payments', 'receipts', 'cashAccounts', 'items', 'warehouses',
      'stockIssues', 'stockTransfers', 'stockCounts', 'custodyTransfers', 'custodySettlements']
  };
  DeskKit.register(FINANCE_DESK);

  /* ── الفاحص ────────────────────────────────────────────────────────── */
  var NEW_TABLES = { custodyTransfers: 'custodyTransfers', custodySettlements: 'custodySettlements' };
  var lastProbe = null;   /* آخر نتيجة — يقرؤها الفاحص/التجربة */

  async function probeTable(client, table) {
    try {
      var res = await client.from(table).select('id').limit(1);
      /* PostgREST يُعيد خطأً صريحاً لجدول غير موجود (٤٠٤/PGRST205) — لا
         نخمّن شكل الخطأ، نكتفي بـ res.error كدليل على الغياب.
         PostgREST returns an explicit error for a missing table
         (404/PGRST205) — we do not guess its shape, res.error alone is
         evidence it is absent. */
      return !res.error;
    } catch (e) { return false; }
  }

  function installProbe() {
    if (!global.Store || Store.__deskFinanceProbeWrapped) return;
    Store.__deskFinanceProbeWrapped = true;
    var origInit = Store.initialize;
    Store.initialize = async function (supabaseClient, user) {
      var results = {};
      for (var id in NEW_TABLES) {
        if (!Object.prototype.hasOwnProperty.call(NEW_TABLES, id)) continue;
        var ok = await probeTable(supabaseClient, NEW_TABLES[id]);
        results[id] = ok;
        if (ok) DeskFinanceModules.reregister(id); else DeskFinanceModules.unregister(id);
      }
      lastProbe = { at: new Date().toISOString(), results: results };
      console.info('desk-finance.js: custody table probe — ' + JSON.stringify(results));
      return origInit.apply(this, arguments);
    };
  }
  installProbe();

  global.DeskFinance = { CONFIG: FINANCE_DESK, lastProbe: function () { return lastProbe; } };
  console.info('desk-finance.js ready — finance desk registered; custody-table probe installed on Store.initialize.');
})(window);

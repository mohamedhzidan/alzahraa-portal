/* =========================================================================
   desk-money-site.js — السياج الفعلي لموقع المستندات المالية على المتصفح
                        The browser-side fence for money documents' site
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ١).

   لماذا هذا الملف موجود رغم أن sites.js يُقيِّد تلقائياً · WHY THIS FILE
   EXISTS EVEN THOUGH sites.js ALREADY FENCES AUTOMATICALLY
   -------------------------------------------------------------------------
   sites.js:258-267 (scopeBySite) تعمل تلقائياً على أي شاشة اكتسبت حقل
   site — وشاشات المال اكتسبته للتوّ من desk-finance-modules.js. فمحاسب
   طنطا (site=site_tanta، allSites=false) يُقيَّد تلقائياً بلا كود إضافي
   هنا — تماماً كما فعل project-site-field.js لشاشة المشروعات.

   لكن sites.js:247-256 (seesAllSites) تُعيد **true** لأي مستخدم بلا موقع
   إطلاقاً («لا نحبس الشركة عن بياناتها في اليوم الأول») — وهذا صحيح
   ومقصود لثلاثين شاشة أخرى، لكنه هنا يعني: محاسبٌ نُسي ربطه بموقع يرى
   **كل** المستندات المالية، لا شيئاً منها (القرار §4.1 «A9» في خطة
   المهندس المعماري). تعديل sites.js نفسه كان سيحبس اليوم الأول لثلاثين
   شاشة أخرى، فهذا الملف يلفّ Auth.scopeRows بلفّة إضافية **خارجية** —
   بعد لفّة sites.js — تخصّ شاشات المال فقط بقاعدة معاكسة تماماً.

   sites.js's scopeBySite already runs automatically on any screen that
   gained a site field — and the money screens just gained one from
   desk-finance-modules.js. So a Tanta accountant (site=site_tanta,
   allSites=false) is already fenced with NO extra code here — exactly
   what project-site-field.js proved for the projects screen.

   BUT sites.js's seesAllSites() deliberately returns TRUE for anyone with
   NO site at all ("do not lock the company out of its own data on day
   one") — correct and intended for the other thirty screens, but here it
   means: an accountant nobody has linked to a site yet would see EVERY
   money document, not none (architect plan §4.1 "A9"). Editing sites.js
   itself would have locked day-one access on those thirty other screens,
   so this file wraps Auth.scopeRows with ONE MORE, OUTER layer — after
   sites.js's own wrap — that gives money screens alone the opposite rule.

   لماذا خارجية لا داخلية · WHY OUTER, NOT INNER
   -------------------------------------------------------------------------
   يُحمَّل بعد site-field-required.js (السطر ٦١٤ في loader.js)، أي بعد
   sites.js وauth.js بكثير — فحين نلتقط Auth.scopeRows الحالية، هي
   بالفعل النسخة الملفوفة من sites.js. لفّنا فوقها = ننفّذ بعدها.
   Loaded after site-field-required.js (loader.js line 614) — long after
   sites.js and auth.js — so the Auth.scopeRows we capture is ALREADY
   sites.js's wrapped version. Wrapping on top of that means running
   AFTER it, which is exactly the order the rule needs: project fence →
   site fence (both existing) → our stricter blank-site override.

   ما يفعله هذا الملف أيضاً (الخطة §9.1، صفّ desk-money-site.js) ────────
   WHAT ELSE THIS FILE DOES
   -------------------------------------------------------------------------
   ٢) DeskMoneySite.buildPreset(site) — يبني preset الموقع/طريقة الإدخال/
      مرجع الورقة لِـ EntityPage.openForm عند الإدخال المركزي نيابةً عن
      موقع (تستهلكه desk-kit.js).
   ٣) يرفض حفظ سند صرف تختار فيه خزينة عهدة (kind='custody') كحساب دفع —
      §3.1 «قاعدتان تُبقيانه مكاناً واحداً»: التمويل والاسترجاع يمرّان فقط
      عبر «تحويل نقدية». فحصٌ في المتصفح فقط هذه الشريحة؛ الفحص الملزم في
      القاعدة (az_acc_no_custody_as_payment_account) في الملف 87
      (87-CUSTODY-DOCUMENTS.sql) — هذا الفحص هنا سياج أول، لا الملزم الوحيد.
      Refuses saving a payment voucher whose cash account is a custody box
      — the browser-only half of §3.1's "two rules that keep it one place".
      The binding database check is file 87 (az_acc_no_custody_as_payment_account); this is a
      first fence, never the only one.
   ٤) يرفض استيراد جدول مالٍ بلا عمود site لمستخدمٍ «كل المواقع» — بدل أن
      يُختم تلقائياً بموقع الخلاطة (الخطة §4.1، فقرة الاستيراد).

   إضافي بالكامل — حذف هذا الملف يعيد شاشات المال إلى قاعدة sites.js
   العامة وحدها (رؤية كاملة لمن بلا موقع)، ويزيل الفحصين الإضافيين. لا
   تعديل على auth.js أو sites.js أو store.js.
   Fully additive — delete this file and the money screens fall back to
   sites.js's general rule alone (full visibility for a no-site account),
   and the two extra checks disappear. auth.js/sites.js/store.js untouched.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Auth || !global.DeskFinanceModules) {
    console.error('desk-money-site.js needs auth.js and desk-finance-modules.js first — not installed');
    return;
  }

  var MONEY_MODULES = global.DeskFinanceModules.MONEY_MODULES_SITE_ENTRY
    .concat(global.DeskFinanceModules.NEW_MODULE_IDS);   /* الخمس + العهدتان الجديدتان */

  /* ── ١ · الحساب بلا موقع = لا شيء على شاشات المال ─────────────────────
     A no-site account = nothing on the money screens. */
  function isBlankSiteAccountant(u) {
    if (!u || u.role !== 'accountant') return false;
    if (u.allSites === true) return false;         /* استثناء صريح فقط — الخطة §4.1 */
    var mySite = null;
    try { mySite = Auth.site && Auth.site(); } catch (e) {}
    return !mySite;
  }

  /* ── ١أ · محاسبٌ له موقع حقيقي («لا يرى كل المواقع») = يُسقَط عنه أيضاً
     أيّ صفّ مالي بلا موقع، لا يبقى مرئياً كما تفعل sites.js بشكل عام ─────
     🔴 مُصحَّح ١٩ سبتمبر ٢٠٢٦ (بلاغ مُدمِج Fable، إصلاح ١) — sites.js:265
     (scopeBySite) تُبقي أي صفّ `!r.site` مرئياً للجميع عمداً («لا نحبس
     يوم بدء العمل» — صحيح لباقي ثلاثين شاشة)، بينما الملف 85:174-189
     (az_acc_money_site_ok) على القاعدة تقول العكس تماماً لشاشات المال:
     صفٌّ بلا موقع لا يظهر إلا لمن يرى كل المواقع فعلاً. أونلاين هذا الفرق
     غير محسوس — سياسة القاعدة أصلاً لا ترسل مثل هذا الصفّ لمحاسبٍ محصور
     بموقع، فلا يصل هذا الفلتر شيئاً ليُسقطه. الفجوة أوفلاين فقط: لقطة
     محلية (IndexedDB) محفوظة قبل تفعيل ACC-A، أو صفّ وصل أثناء اتصال بلا
     هذا الإصلاح، يبقى في ذاكرة المتصفح المؤقتة (store.js:cache) حتى بعد
     أن صار محاسب طنطا محصوراً بموقعه — فيراه رغم أن القاعدة نفسها ترفضه.
     🔴 CORRECTED 19 Sept 2026 (Fable integrator's report, fix 1) —
     sites.js:265 (scopeBySite) deliberately keeps any `!r.site` row
     visible to everyone ("do not lock day one" — correct for the other
     thirty screens), while file 85:174-189 (az_acc_money_site_ok) on
     the database says the exact OPPOSITE for money screens: a blank-site
     row is visible only to someone who genuinely sees every site. Online
     this difference is never felt — the database policy already refuses
     to SEND such a row to a site-bound accountant, so this filter has
     nothing left to drop. The gap is OFFLINE only: a local snapshot
     (IndexedDB) saved before ACC-A was ever applied, or a row that
     reached the browser's in-memory cache (store.js) while online with
     this fix absent, survives in that cache even after the accountant
     became site-bound — so it would still be shown, contradicting what
     the database itself refuses. */
  function isSiteBoundAccountant(u) {
    if (!u || u.role !== 'accountant') return false;
    var mySite = null;
    try { mySite = Auth.site && Auth.site(); } catch (e) {}
    if (!mySite) return false;   /* بلا موقع أصلاً — تلك حالة isBlankSiteAccountant أعلاه، لا هذه */
    /* Auth.seesAllSites() هنا آمنة تماماً (خلافاً لاستعمالها في
       isBlankSiteAccountant): تعفيها «لا موقع = يرى الكل» فقط حين لا يوجد
       موقع إطلاقاً، وهذا المستخدم يملك موقعاً بالفعل — فتُرجع بدقة: هل
       شخصه أو موقعه نفسه معلَّمان allSites؟ safe here (unlike in
       isBlankSiteAccountant): its "no site = sees all" exception only
       fires when there is NO site at all, and this user already has one
       — so it answers precisely: is this person, or their own site,
       marked allSites? */
    try { return !(Auth.seesAllSites && Auth.seesAllSites(u)); } catch (e) { return false; }
  }

  function install() {
    if (!global.Auth || Auth.__deskMoneySiteInstalled) return;
    Auth.__deskMoneySiteInstalled = true;
    var origScopeRows = Auth.scopeRows;
    Auth.scopeRows = function (moduleId, rows) {
      if (MONEY_MODULES.indexOf(moduleId) !== -1) {
        var u = null; try { u = Auth.current && Auth.current(); } catch (e) {}
        if (isBlankSiteAccountant(u)) return [];
        var out = origScopeRows.apply(Auth, arguments);
        if (isSiteBoundAccountant(u) && Array.isArray(out)) {
          return out.filter(function (r) { return !!(r && r.site); });
        }
        return out;
      }
      return origScopeRows.apply(Auth, arguments);
    };
    console.info('desk-money-site.js: Auth.scopeRows wrapped — a no-site accountant now sees NOTHING, and a ' +
      'site-bound accountant now loses blank-site rows too (offline-snapshot fix, 19 Sept), on ' +
      MONEY_MODULES.length + ' money module(s), instead of sites.js\'s permissive default.');
  }
  install();

  /* ── ٢ · preset الإدخال المركزي نيابةً عن موقع ─────────────────────────
     يبنيه desk-kit.js عند الضغط على زرّ بدء سريع فيما محاسب مركزي مختارٌ
     «أُدخل نيابةً عن موقع: طنطا» مثلاً. Built by desk-kit.js when a
     quick-start button is pressed while a central accountant has chosen
     "on behalf of site: Tanta". */
  function buildPreset(site, paperRef) {
    if (!site) return {};
    var p = { site: site, entryRoute: 'paper' };
    if (paperRef) p.paperRef = paperRef;
    return p;
  }

  /* ── ٣ · لا يجوز اختيار خزينة عهدة كحساب دفع سند صرف ───────────────────
     §3.1: funding/reclaiming a custody box goes ONLY through «تحويل
     نقدية» — a payment voucher may never point its cashAccount at one. */
  function isCustodyBox(id) {
    if (!id || !global.Store || !Store.find) return false;
    try { var row = Store.find('cashAccounts', id); return !!(row && row.kind === 'custody'); }
    catch (e) { return false; }
  }
  function refusalToast(msg) {
    try { if (global.UI && UI.toast) UI.toast(msg, 'error', 6000); } catch (e) {}
  }
  var CUSTODY_CASH_MSG = { ar: 'لا يمكن اختيار خزينة عهدة كحساب دفع لسند صرف — التمويل والاسترجاع من «تحويل نقدية» فقط.',
                           en: 'A custody box cannot be a payment voucher\'s cash account — funding/reclaiming goes only through "cash transfer".' };
  function lang() { try { return (global.I18N && I18N.getLang && I18N.getLang() === 'en') ? 'en' : 'ar'; } catch (e) { return 'ar'; } }
  function t(o) { return lang() === 'en' ? (o.en || o.ar) : (o.ar || o.en); }

  /* ── ٤ · استيراد جدولٍ مالي بلا عمود site لمستخدمٍ يرى كل المواقع ─────
     🔴 لم يُبنَ — تحقّقتُ بالقراءة لا بالتخمين، والنتيجة تخالف افتراض
     الخطة. import.js:992 (`if (!rec.site && u && u.site) rec.site = u.site;`)
     يعيش داخل `commit(moduleId, list)` (import.js:939) — دالة محلّية
     مغلقة تُستدعى مباشرة من onClick في السطر ٩٣٠، **غير مُصدَّرة** ولا
     `global.Import` موجود إطلاقاً. فبحلول لحظة استدعاء Store.create يكون
     الصفّ قد خُتم بالفعل بموقع المستورِد المركزي (الخلاطة مثلاً) — لا
     يصل هذا الملف صفّاً «بلا موقع» ليرفضه؛ يصله صفٌّ بموقعٍ **خاطئ لكنه
     يبدو صحيحاً**، ولا فرق تركيبي بين الاثنين على باب Store.create.
     فرضية الخطة الاحتياطية («أضِف الرفض عند غياب سياج قابل للّف») لا
     تعمل هنا فعلياً — سُجِّل في ROADMAP.md بدل ادّعاء حمايةٍ غير قائمة.
     🔴 NOT BUILT — verified by reading, not guessed, and the result
     contradicts the plan's fallback assumption. import.js:992 lives
     inside `commit()` (import.js:939), a closure-local function called
     directly from its own onClick (line 930) — never exported, and there
     is no `global.Import` at all. By the time Store.create is ever
     called the row has ALREADY been stamped with the central importer's
     own site — this file is never handed a "no site" row to refuse; it
     is handed a row with a WRONG site that is structurally
     indistinguishable from a correct one at the Store.create door. The
     plan's own fallback ("refuse at the Store.create door if no seam is
     wrappable") does not actually work for this specific bug. Logged to
     ROADMAP.md as found-not-triaged rather than claiming a protection
     that is not there. */

  function installCreateWrap() {
    if (!global.Store || Store.__deskMoneySiteCreateWrapped) return;
    Store.__deskMoneySiteCreateWrapped = true;
    var origCreate = Store.create;
    Store.create = function (table, data /* , opts */) {
      if (table === 'payments' && data && isCustodyBox(data.cashAccount)) {
        refusalToast(t(CUSTODY_CASH_MSG));
        return false;
      }
      return origCreate.apply(Store, arguments);
    };
  }
  installCreateWrap();

  global.DeskMoneySite = {
    MONEY_MODULES: MONEY_MODULES,
    isBlankSiteAccountant: isBlankSiteAccountant,
    buildPreset: buildPreset,
    isCustodyBox: isCustodyBox
  };

  console.info('desk-money-site.js ready — blank-site fence, custody-box-as-payment-account guard, on-behalf-of preset builder.');
})(window);

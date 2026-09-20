/* =========================================================================
   desk-finance-roles.js — من يرى مكتب المحاسب، ومن يملك ماذا على شاشتَي العهدة
                           Who sees the accountant's desk, and who holds
                           what on the two custody screens
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ١).

   لماذا التعديل على Auth.ROLES لا لفّ دالة — مُثبَتٌ سابقاً على هذا المشروع
   بالضبط (stock-approval-roles.js): auth.js ملف للقراءة فقط، وpermsFor
   تقرأ ROLES[role].perms، وglobal.Auth.ROLES هو الكائن نفسه لا نسخة —
   فالإضافة إليه تصل فعلاً. نفس النمط هنا بلا تغيير.
   WHY MUTATE Auth.ROLES RATHER THAN WRAP — already proven on this exact
   project (stock-approval-roles.js): auth.js is read-only, permsFor reads
   ROLES[role].perms, and global.Auth.ROLES IS that object, not a copy — so
   adding to it genuinely reaches permsFor. Same pattern here, unchanged.

   🔴 الفارق عن stock-approval-roles.js: تلك أضافت فعلاً واحداً لقائمة
   موجودة على شاشة قديمة. هنا الوحدتان جديدتان كلياً (custodyTransfers/
   custodySettlements) فلا توجد لهما أي قائمة r.perms[mod] سابقاً على أي
   دور — فننشئها ابتداءً بدل الإضافة إلى موجود.
   THE DIFFERENCE from stock-approval-roles.js: that file added ONE action
   to an EXISTING list on an old screen. Here the two modules are BRAND
   NEW, so no role has an r.perms[mod] list for them at all yet — we
   CREATE the list from scratch instead of pushing into one.

   🔴 الطبقات الثلاث — وهذا الملف واحدة منها فقط (permissions.md):
     ١) هذا الملف — يُظهر الأزرار في المتصفح.
     ٢) سياسة قاعدة البيانات (role_workflow_permissions) — الملف 87
        (87-CUSTODY-DOCUMENTS.sql). بدونها الزرّ يظهر ويُرفض الضغط.
     ٣) حساب حقيقي يحمل الدور فعلاً — لا يُرى من هذا الجهاز.
   THREE LAYERS, this file is only one: (1) here, the button appears;
   (2) the DB policy (file 87, 87-CUSTODY-DOCUMENTS.sql — without it, pressing a
   button on the two custody screens is refused server-side, which is
   CORRECT: run file 87 before this file is uploaded); (3) a real account actually
   carrying the role — invisible from this machine.

   ── الحكم، في مكان واحد (يبدأ من هنا، ويحتاج الملف 87 ليكتمل) ────────
   THE RULING, in one place (starts here; needs file 87 to complete):
     · deskFinance (المسار، ليس شاشة Schema) — view لِـ: accountant,
       finance_manager, gm, admin, auditor (نفس أدوار «عرض مستندات
       المال» في مصفوفة الخطة §4.2).
     · custodyTransfers — view/create/edit/send للمحاسب المركزي فقط
       (نياتة عن موقع)؛ approve لِـ finance_manager وgm. المحاسب المحلي
       لا يملك create — الزرّ يظهر معطّلاً بسببٍ مذكور (قرار الخطة §2
       جدول J-A: التمويل يبدأ مركزياً).
     · custodySettlements — view/create/edit/send للمحاسب (محلي أو
       مركزي)؛ review يُمنح صراحةً هنا ثم يُقيَّد بشرط «كل المواقع» عبر
       غلاف Auth.can أدناه (Hassanein ١٦ ❓ لم يُحسم بعد — الافتراض هنا
       الأكثر أماناً: لا مراجعة لمحاسب محلي)؛ approve لِـ finance_manager
       وgm فقط، مطابقةً لمصفوفة الخطة (لا admin — قرار «admin لا يعتمد
       أبداً» في permissions.md).
     · admin: view صريح على الوحدتين الجديدتين — يُلغي بند '*' الشامل
       (auth.js:97) الذي كان سيمنحه create/edit/approve بالمصادفة، تماماً
       كما نصّت الخطة §4.2 "لا يُمنح admin أي approve".

   إضافي بالكامل — حذف هذا الملف يعيد صلاحيات اليوم حرفياً؛ لا حقل، لا
   جدول، لا شاشة. يُحمَّل بجوار stock-approval-roles.js (نفس النمط، نفس
   الموضع تقريباً في ترتيب التحميل).
   Fully additive — deleting this file restores today's permissions
   exactly. Loads next to stock-approval-roles.js (same pattern, same
   rough position in load order).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Auth || !Auth.ROLES) { console.error('desk-finance-roles.js needs auth.js first — not installed'); return; }

  /* ── ١ · من يرى «مكتب المحاسب» (مسار، لا شاشة Schema) ──────────────────
     منزوعة عن Auth.can('deskFinance','view') التي يستعملها desk-kit.js
     ليقرّر من يرى زرّ القائمة وبطاقة الصفحة الأولى، دون اختراع بوّابة
     جديدة — نفس دالة Auth.can الموجودة، بمفتاح جديد فقط.
     WHO SEES "the accountant's desk" (a route, not a Schema module) —
     read via the EXISTING Auth.can('deskFinance','view'), which desk-kit.js
     uses to decide who sees the nav button and the home card. No new gate
     invented — the same function, one more key. */
  var DESK_VIEWERS = ['accountant', 'finance_manager', 'gm', 'admin', 'auditor'];
  var applied = [];

  function ensurePerms(role) {
    var r = Auth.ROLES[role];
    if (!r) { console.error('desk-finance-roles.js: role "' + role + '" is not defined in auth.js — nothing granted'); return null; }
    if (!r.perms) r.perms = {};
    return r;
  }

  DESK_VIEWERS.forEach(function (role) {
    var r = ensurePerms(role);
    if (!r) return;
    if (!Array.isArray(r.perms.deskFinance)) { r.perms.deskFinance = ['view']; applied.push(role + '.deskFinance.view'); }
    else if (r.perms.deskFinance.indexOf('view') === -1) { r.perms.deskFinance.push('view'); applied.push(role + '.deskFinance.view'); }
  });

  /* ── ٢ · الوحدتان الجديدتان — مِنَح كاملة، لا إضافة لقائمة موجودة ────── */
  /* 🔴 أُصلح — بلاغ مُدقِّق Fable (VM حقيقي على auth.js الحيّ + هذا الملف):
     الأساس هنا كان يمنح المحاسب ['view'] فقط على custodyTransfers، بلا
     'review' على custodySettlements — فكان غلاف Auth.can أدناه (السطر
     ~131 وقتها) يرجع base المرفوض **قبل** أن تصل فروع «كل المواقع» أبداً
     («if (!base) return base؛» يقطع الطريق). فروع التضييق كانت شيفرة
     ميتة تناقض الحكم في رأس الملف وdesk-finance.js:81 تماماً. الإصلاح هنا
     يمنح الأساس الكامل، والغلاف أدناه يُضيِّقه لمحاسبٍ محلي فقط — لا
     العكس.
     🔴 FIXED — reported by the Fable integrator (a real VM run of live
     auth.js + this file): the base here granted the accountant only
     ['view'] on custodyTransfers, and no 'review' on custodySettlements —
     so the Auth.can wrapper below returned the refused `base` BEFORE the
     all-sites branches were ever reached ("if (!base) return base"
     shortcuts past them). The narrowing branches were dead code,
     contradicting the ruling at the top of this file and desk-finance.js:81
     outright. The fix: grant the FULL base here, and let the wrapper below
     narrow it down for a LOCAL accountant only — never the other way
     round. */
  var GRANTS = [
    /* تحويل نقدية: الأساس الكامل هنا؛ الغلاف أدناه يمنعه عن المحاسب
       المحلي (المحاسب المركزي وحده ينشئ فعلياً — نيابةً عن موقع). */
    { role: 'accountant',      module: 'custodyTransfers',   perms: ['view', 'create', 'edit', 'send'] },
    { role: 'finance_manager', module: 'custodyTransfers',   perms: ['view', 'create', 'edit', 'send', 'approve'] },
    { role: 'gm',              module: 'custodyTransfers',   perms: ['view', 'approve'] },
    { role: 'admin',           module: 'custodyTransfers',   perms: ['view'] },

    /* تسوية عهدة: كل محاسب ينشئ ويرسل؛ review الأساس هنا أيضاً، والغلاف
       أدناه يمنعه عن المحاسب المحلي حتى يحسم Hassanein ١٦. */
    { role: 'accountant',      module: 'custodySettlements', perms: ['view', 'create', 'edit', 'send', 'review'] },
    { role: 'finance_manager', module: 'custodySettlements', perms: ['view', 'review', 'approve'] },
    { role: 'gm',              module: 'custodySettlements', perms: ['view', 'review', 'approve'] },
    { role: 'admin',           module: 'custodySettlements', perms: ['view'] }
  ];

  GRANTS.forEach(function (g) {
    var r = ensurePerms(g.role);
    if (!r) return;
    var existing = Array.isArray(r.perms[g.module]) ? r.perms[g.module] : [];
    var merged = existing.slice();
    g.perms.forEach(function (p) { if (merged.indexOf(p) === -1) merged.push(p); });
    r.perms[g.module] = merged;
    applied.push(g.role + '.' + g.module + '.[' + g.perms.join(',') + ']');
  });

  /* المحاسب المركزي وحده ينشئ تحويلاً — نموذج «نيابةً عن موقع» فقط
     (الخطة §1.1: «أُدخل نيابةً عن موقع» متاح فقط لحساب allSites=true).
     يُفرض هنا بلفّ Auth.can، لأن auth.js لا يفرّق بين محاسب مركزي/محلي —
     الفرق يعيش في بيانات الموقع (allSites) لا في الدور نفسه.
     Only a CENTRAL accountant may create a transfer — the "on behalf of a
     site" form only (plan §1.1: that selector exists only for an
     allSites=true account). Enforced by wrapping Auth.can, because auth.js
     does not distinguish central vs local accountant — that lives in the
     SITE data (allSites), not the role name. */
  var origCan = Auth.can;
  Auth.can = function (moduleId, action) {
    var base = origCan.apply(Auth, arguments);
    if (!base) return base;
    var u = null; try { u = Auth.current && Auth.current(); } catch (e) {}
    if (!u || u.role !== 'accountant') return base;

    if (moduleId === 'custodyTransfers' && (action === 'create' || action === 'edit' || action === 'send')) {
      var central = false;
      try { central = !!(Auth.seesAllSites && Auth.seesAllSites()); } catch (e) {}
      return central;
    }

    /* مراجعة تسوية عهدة: لمحاسبٍ «يرى كل المواقع» فقط، إلى أن يحسم
       Hassanein ١٦ من يراجعها محلياً (الخطة §4.2، ❓). الافتراض الأكثر
       أماناً: لا مراجعة محلية حتى يصدر قرار صريح.
       Reviewing a settlement: only an all-sites-seeing accountant, until
       Hassanein ١٦ decides who reviews it locally (plan §4.2, ❓). The
       safer default: no local review until an explicit ruling. */
    if (moduleId === 'custodySettlements' && action === 'review') {
      var allSites = false;
      try { allSites = !!(Auth.seesAllSites && Auth.seesAllSites()); } catch (e) {}
      return allSites;
    }
    return base;
  };

  global.DeskFinanceRoles = {
    DESK_VIEWERS: DESK_VIEWERS, GRANTS: GRANTS, applied: applied,
    check: function (moduleId, action) { try { return !!Auth.can(moduleId, action); } catch (e) { return null; } }
  };

  console.info('desk-finance-roles.js ready — ' + applied.length + ' grant(s) applied: ' + applied.join(' | ') +
    '  ⚠️ the browser is only ONE of three layers; the DB policy is file 87 (87-CUSTODY-DOCUMENTS.sql).');
})(window);

/* =========================================================================
   desk-statements.js — الكشوف الخمسة على صفحة التقارير (الخطة §٧)
                        THE FIVE STATEMENTS on the Reports page (plan §7)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢ + الشريحة ٣).

   ما بُني الليلة (الشريحة ٢)، وما أُضيف الآن (الشريحة ٣) — بصراحة، لا صمتاً
   WHAT WAS BUILT before (slice 2), and what is ADDED now (slice 3) — stated
   plainly, never silently
   -------------------------------------------------------------------------
   «كشف العهدة» (custody) — كما كان، بلا أي تغيير في سلوكه أو معرّفاته
   الظاهرة (azdCustodyTab/azdStmtBox/azdStmtFrom/azdStmtTo/azd-clickrow) —
   t06 يعتمد عليها بالحرف. الأربعة الجديدة: «كشف المورد»، «كشف المعدة»،
   «المصروف حسب البند/الحساب»، «كشف المخزون (رابط)» — تشارك الآن هيكل
   تبويبات واحداً (activeTab بدل custodyActive وحدها) بلا مساس بالمنطق
   القديم. «قيود مرحّلة» (basis=posted) لا تزال غير متاحة إلا لكشف العهدة —
   ولكشف المورد يُعلَن غيابها بنفس الصدق (az_acc_trial_balance_json تعمل
   بمستوى حساب دفتر الأستاذ، لا بمستوى مورّدٍ بعينه؛ ربطٌ يحتاج استقصاءً لم
   يتّسع له وقت هذه الشريحة). المعدة/المصروف لا تعرضان مبدّل أساسٍ إطلاقاً —
   الخطة §٧ نفسها لا تُعرِّف لهما "قيود مرحّلة" (المعدة: «—»، المصروف:
   P12 P&L موجودة تقنياً لكن ربطها ببند التكلفة نفسه غير مبنيّ الليلة).

   THE custody tab — unchanged, same behaviour, same visible ids
   (azdCustodyTab/azdStmtBox/azdStmtFrom/azdStmtTo/azd-clickrow) — t06
   depends on them verbatim. The FOUR new ones — supplier, equipment,
   expense (by cost item/account), stock (link) — now share ONE tab
   framework (activeTab, replacing the old custodyActive alone) without
   touching the old logic. "Posted entries" basis (basis=posted) is still
   available for the custody tab ONLY — the supplier tab states its own
   absence with the same honesty (az_acc_trial_balance_json works at the
   general-ledger-account level, not per named supplier; that mapping
   needed an investigation this slice had no time for). Equipment/expense
   show NO basis toggle at all — plan §7's own table defines no "posted"
   column for equipment ("—"), and for expense the P12 P&L wrapper exists
   technically but wiring it to THIS SAME cost-item grouping is not built
   tonight.

   نمط الإرفاق الثابت مع علامات التبويب الأصلية (نفس books-reports.js) ·
   THE PERSISTENT-TAB PATTERN (identical to books-reports.js)
   -------------------------------------------------------------------------
   ReportsPage.render مُغلَّف؛ نقرة تبويب أصلية تنادي render المحلية داخل
   إغلاق reports.js مباشرة (لا ReportsPage.render الخارجية)، فتُمحى إضافتنا
   — لذلك نراقب host (المُمرَّر لـReportsPage.render) بـMutationObserver
   ونُعيد الحقن عند أي تغيير في أبنائه المباشرين. مُثبَتٌ من قبل في
   books-reports.js؛ لا نسخة ثانية من المنطق، الشكل نفسه فقط.
   ReportsPage.render is wrapped; a click on a NATIVE tab calls reports.js's
   own internal render function directly (not the external
   ReportsPage.render), which wipes our addition — so we watch `host`
   (the element passed to ReportsPage.render) with a MutationObserver and
   re-inject on any change to its direct children. Already proven in
   books-reports.js; not a second copy of the logic, the same shape only.

   إضافي بالكامل — حذف هذا الملف يعيد صفحة التقارير إلى تبويباتها العشرة
   الأصلية بلا أي أثر.
   Fully additive — deleting this file returns the Reports page to its
   original ten tabs with zero effect.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.ReportsPage || typeof ReportsPage.render !== 'function') {
    console.error('desk-statements.js needs ReportsPage.render — not installed');
    return;
  }

  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }
  function L2(o) { return (global.L ? L(o) : o.ar); }
  function money(v) { return (global.I18N && I18N.money) ? I18N.money(v || 0) : String(v || 0); }

  /* ── محاسبٌ محلي أم مركزي — للتسمية «كشف جزئي» فقط ────────────────────────
     LOCAL vs CENTRAL accountant — for the "partial statement" LABEL only.
     نفس منطق desk-money-site.js:isSiteBoundAccountant تماماً — قراءةٌ منه
     لا تعديلاً عليه (ذلك الملف يبقى المصدر الوحيد لتطبيق السياج الفعلي؛
     هذا مجرد نصٍّ على الشاشة). Exactly desk-money-site.js's own
     isSiteBoundAccountant logic — READ, never edited (that file remains
     the only place the real fence is enforced; this is on-screen text
     only). */
  function isLocalAccountant() {
    try {
      var sid = global.Auth && Auth.site ? Auth.site() : null;
      if (!sid) return false;
      return !(global.Auth && Auth.seesAllSites && Auth.seesAllSites());
    } catch (e) { return false; }
  }
  function currentSiteLabel() {
    try {
      var sid = global.Auth && Auth.site ? Auth.site() : null;
      if (!sid) return '';
      var s = (global.Store && Store.find) ? Store.find('sites', sid) : null;
      return s ? s.name : sid;
    } catch (e) { return ''; }
  }

  /* ── حالة كل تبويب — مستقلة، فلا يُفسِد أحدها مرشِّحات الآخر ─────────────── */
  var activeTab = null; /* null | 'custody' | 'supplier' | 'equipment' | 'expense' | 'stock' */
  var lastRows = { headers: [], rows: [], raw: [] };
  var exportName = 'statement';

  var custodyFilters = { box: '', from: '', to: '', basis: 'documents', scroll: 0 };
  var supplierFilters = { supplier: '', from: '', to: '', basis: 'documents', site: '', scroll: 0 };
  var equipmentFilters = { equipment: '', from: '', to: '', site: '' };
  var expenseFilters = { groupBy: 'cost', from: '', to: '', site: '' };

  /* ── بوّابات كل تبويب — بلا صلاحية = بلا زرّ، لا "غير متاح" فارغ ─────────── */
  function gateCustody() { try { return !!(global.Auth && Auth.can && Auth.can('custodySettlements', 'view')); } catch (e) { return false; } }
  function gateSupplierDocs() { try { return !!(global.Auth && Auth.can && Auth.can('supplierInvoices', 'view')); } catch (e) { return false; } }

  /* =========================================================================
     ١) كشف العهدة — كما هو تماماً، دون أي تعديل في السلوك أو المعرِّفات
        CUSTODY STATEMENT — exactly as it was, no change to behaviour or ids
     ========================================================================= */
  function boxOptionsHTML() {
    if (!global.DeskLedgers) return '';
    return DeskLedgers.custodyBoxes().map(function (b) {
      return '<option value="' + esc(b.id) + '"' + (custodyFilters.box === b.id ? ' selected' : '') + '>' + esc(b.name) + '</option>';
    }).join('');
  }

  function drawCustodyBody() {
    var box = document.getElementById('repBody');
    if (!box) return;
    if (!global.DeskLedgers) { box.innerHTML = '<p class="small muted">desk-ledgers.js غير محمَّل</p>'; return; }

    var boxes = DeskLedgers.custodyBoxes();
    if (!custodyFilters.box && boxes.length) custodyFilters.box = boxes[0].id;

    var html = '<div class="table-toolbar">' +
      '<label class="field" style="min-width:190px"><span class="field-label">' + esc(L2({ ar: 'خزينة العهدة', en: 'Custody box' })) + '</span>' +
      '<select class="select input-sm" id="azdStmtBox">' + boxOptionsHTML() + '</select></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'من', en: 'From' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdStmtFrom" value="' + esc(custodyFilters.from) + '"></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'إلى', en: 'To' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdStmtTo" value="' + esc(custodyFilters.to) + '"></label>' +
      '<div class="field"><span class="field-label">' + esc(L2({ ar: 'الأساس', en: 'Basis' })) + '</span>' +
      '<div class="azd-basis-toggle">' +
      '<button type="button" class="btn btn-sm ' + (custodyFilters.basis === 'documents' ? 'btn-primary' : 'btn-outline') + '" data-basis="documents">' + esc(L2({ ar: 'مستندات معتمدة', en: 'Approved documents' })) + '</button>' +
      '<button type="button" class="btn btn-sm ' + (custodyFilters.basis === 'posted' ? 'btn-primary' : 'btn-outline') + '" data-basis="posted">' + esc(L2({ ar: 'قيود مرحّلة', en: 'Posted entries' })) + '</button>' +
      '</div></div></div>';

    var b = custodyFilters.box ? DeskLedgers.boxBalance(custodyFilters.box) : null;
    var boxRec = boxes.filter(function (x) { return x.id === custodyFilters.box; })[0];

    if (custodyFilters.basis === 'posted') {
      html += '<div class="alert alert-warn">' + esc(L2({
        /* 🔴 جملة يقرؤها المحاسب: لا اسم دالّة فيها (كانت تذكر az_acc_trial_balance_json) — الدفاتر تُرفع مطفأة (الملف 90).
           A sentence the accountant reads: no function name (it used to name az_acc_trial_balance_json) — the books ship OFF (file 90). */
        ar: 'القيود المرحّلة غير متاحة بعد — الترحيل متوقف حتى يُفعَّل. اعرض «مستندات معتمدة» بدلاً منه.',
        en: 'Posted entries are not available yet — posting is switched off until it is turned on. Use "Approved documents" instead.'
      })) + '</div>';
      lastRows = { headers: [], rows: [], raw: [] };
      box.innerHTML = html;
      bindCustodyFilterEvents();
      return;
    }

    if (!boxRec) {
      html += '<div class="empty-state">' + esc(L2({ ar: 'لا توجد صناديق عهدة مرئية لك', en: 'No custody boxes visible to you' })) + '</div>';
      box.innerHTML = html; bindCustodyFilterEvents(); return;
    }

    var openingLabel = boxRec.openingDate
      ? L2({ ar: 'الحركات من ' + boxRec.openingDate + '؛ ما قبلها في بابل', en: 'Movements from ' + boxRec.openingDate + '; before that, in Babel' })
      : L2({ ar: 'لا تاريخ فتح مسجَّل لهذا الصندوق', en: 'No opening date recorded for this box' });
    html += '<p class="small muted">' + esc(openingLabel) + '</p>';

    var mv = DeskLedgers.movementsForBox(custodyFilters.box, custodyFilters.from || null, custodyFilters.to || null);
    /* 🔴 عطلٌ حقيقي وُجد بالتشغيل (t06، ١٩ سبتمبر) — لا افتراضاً · A REAL
       BUG FOUND BY RUNNING (t06, 19 Sept) — not assumed
       -----------------------------------------------------------------
       desk-ledgers.js:boxBalance() يحسب THREE أرقام معلَّقة منفصلة تماماً:
       pending (مستندات pending)، reviewedPending (مستندات reviewed)،
       returnedTotal (أسطر مرتجَعة داخل مستندٍ مُعتمَد بانتظار مسودة
       تصحيح). الشريط هنا كان يعرض الأوّلين فقط ("قيد المراجعة") ويُسقِط
       الثالث كلياً — فبعد اعتماد تسوية فيها سطرٌ مرتجَع (لا مستندات
       pending/reviewed أخرى)، كان الشريط يعرض «قيد المراجعة: صفر» رغم
       أنّ ١,٠٠٠ منتظرةٌ فعلاً تصحيحاً (الخطة §3.1، ومثال C01، وملف
       الثوابت pending_separate). مُثبَت: t06 (B4) كان يفشل قبل هذا
       الإصلاح؛ يمرّ بعده.
       desk-ledgers.js's boxBalance() computes THREE entirely SEPARATE
       pending figures: pending (status=pending docs), reviewedPending
       (status=reviewed docs), returnedTotal (lines RETURNED inside an
       ALREADY-APPROVED document, awaiting a correction draft). This strip
       showed only the first two ("Under review") and dropped the third
       completely — so after approving a settlement with one returned line
       (no other pending/reviewed documents), the strip read "Under
       review: zero" while 1,000 was genuinely awaiting a correction (plan
       §3.1, its own C01 example, and the fixtures file's pending_
       separate). PROVEN: t06 (B4) failed before this fix, passes after. */
    html += '<div class="azd-summarystrip">' +
      '<div><small>' + esc(L2({ ar: 'مموَّل + افتتاحي', en: 'Funded + opening' })) + '</small><b>' + money(b.opening + b.funded) + '</b></div>' +
      '<div><small>' + esc(L2({ ar: 'مقبول', en: 'Accepted' })) + '</small><b>' + money(b.accepted) + '</b></div>' +
      '<div><small>' + esc(L2({ ar: 'المتاح', en: 'Available' })) + '</small><b>' + money(b.available) + '</b></div>' +
      '<div class="warn"><small>' + esc(L2({ ar: 'قيد المراجعة', en: 'Under review' })) + '</small><b>' + money(b.pending + b.reviewedPending) + '</b></div>' +
      '<div class="warn"><small>' + esc(L2({ ar: 'مرتجَع — بانتظار التصحيح', en: 'Returned — awaiting correction' })) + '</small><b>' + money(b.returnedTotal) + '</b></div>' +
      '</div>';

    var headers = [L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'المستند', en: 'Document' }), L2({ ar: 'البيان', en: 'Description' }), L2({ ar: 'وارد', en: 'In' }), L2({ ar: 'صادر', en: 'Out' })];
    var rowsHtml = mv.map(function (m) {
      return '<tr data-open-mod="' + esc(m.moduleId) + '" data-open-id="' + esc(m.id) + '" class="azd-clickrow">' +
        '<td class="num">' + esc(m.date || '') + '</td><td class="num">' + esc(m.docNo || '') + '</td><td>' + esc(L2(m.label)) + '</td>' +
        '<td class="money">' + (m.amount > 0 ? money(m.amount) : '') + '</td><td class="money">' + (m.amount < 0 ? money(-m.amount) : '') + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="5" class="empty-state">' + esc(L2({ ar: 'لا حركات في هذا المدى', en: 'No movements in this range' })) + '</td></tr>') + '</tbody></table></div>';

    lastRows = {
      headers: headers,
      rows: mv.map(function (m) { return [m.date || '', m.docNo || '', L2(m.label), m.amount > 0 ? m.amount : '', m.amount < 0 ? -m.amount : '']; }),
      raw: mv
    };
    exportName = 'custody_statement';

    box.innerHTML = html;
    bindCustodyFilterEvents();
    box.querySelectorAll('.azd-clickrow').forEach(function (tr) {
      tr.addEventListener('click', function () {
        custodyFilters.scroll = box.scrollTop || window.scrollY;
        var m = tr.getAttribute('data-open-mod'), id = tr.getAttribute('data-open-id');
        if (global.EntityPage) EntityPage.openDetail(m, id);
      });
    });
    if (custodyFilters.scroll) window.scrollTo(0, custodyFilters.scroll);
  }

  function bindCustodyFilterEvents() {
    var boxSel = document.getElementById('azdStmtBox');
    if (boxSel) boxSel.onchange = function () { custodyFilters.box = boxSel.value; drawCustodyBody(); };
    var f = document.getElementById('azdStmtFrom'), t = document.getElementById('azdStmtTo');
    if (f) f.onchange = function () { custodyFilters.from = f.value; drawCustodyBody(); };
    if (t) t.onchange = function () { custodyFilters.to = t.value; drawCustodyBody(); };
    document.querySelectorAll('[data-basis]').forEach(function (b) {
      b.onclick = function () { custodyFilters.basis = b.getAttribute('data-basis'); drawCustodyBody(); };
    });
  }

  /* =========================================================================
     ٢) كشف حساب المورّد (الشريحة ٣ — J-B/C/E، العقد سطر ١٨)
        SUPPLIER STATEMENT (slice 3 — J-B/C/E, contract line 18)
     ========================================================================= */
  function drawSupplierBody() {
    var box = document.getElementById('repBody');
    if (!box) return;
    if (!global.DeskLedgers || !DeskLedgers.supplierLedger) { box.innerHTML = '<p class="small muted">desk-ledgers.js غير محمَّل</p>'; return; }

    var suppliers = DeskLedgers.suppliers();
    if (!supplierFilters.supplier && suppliers.length) supplierFilters.supplier = suppliers[0].id;

    var html = '<div class="table-toolbar">' +
      '<label class="field" style="min-width:220px"><span class="field-label">' + esc(L2({ ar: 'المورد', en: 'Supplier' })) + '</span>' +
      '<select class="select input-sm" id="azdSupSel">' + suppliers.map(function (s) {
        return '<option value="' + esc(s.id) + '"' + (supplierFilters.supplier === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'من', en: 'From' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdSupFrom" value="' + esc(supplierFilters.from) + '"></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'إلى', en: 'To' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdSupTo" value="' + esc(supplierFilters.to) + '"></label>' +
      '<div class="field"><span class="field-label">' + esc(L2({ ar: 'الأساس', en: 'Basis' })) + '</span>' +
      '<div class="azd-basis-toggle">' +
      '<button type="button" class="btn btn-sm ' + (supplierFilters.basis === 'documents' ? 'btn-primary' : 'btn-outline') + '" data-sup-basis="documents">' + esc(L2({ ar: 'مستندات معتمدة', en: 'Approved documents' })) + '</button>' +
      '<button type="button" class="btn btn-sm ' + (supplierFilters.basis === 'posted' ? 'btn-primary' : 'btn-outline') + '" data-sup-basis="posted">' + esc(L2({ ar: 'قيود مرحّلة', en: 'Posted entries' })) + '</button>' +
      '</div></div></div>';

    var local = isLocalAccountant();
    /* 🔴 الموردون سجلٌّ واحد على مستوى الشركة (لا حقل site) — رصيدهم
       الافتتاحي رقمٌ شركةٍ كاملة، لا موقعاً. محاسبٌ محصورٌ بموقع (كشفٌ
       «جزئي» أصلاً — حركاته هو فقط) كان يرى هذا الرصيد الكامل مضافاً فوق
       حركات موقعه وحده — خليطٌ بلا معنى (المُنسِّق، ١٩ سبتمبر). يُسقَط هنا
       فقط لهذا العارض، وتُضاف جملة توضيحية على نفس البادج — لا بادجٌ ثانٍ.
       🔴 Suppliers are ONE company-wide record (no site field) — their
       opening balance is a whole-company figure, never a site one. A
       site-bound accountant (already a "partial" statement — their own
       site's movements only) was seeing this FULL figure added on top of
       only their own site's movements — a meaningless mixture
       (coordinator, 19 Sept). Dropped here for this viewer only, with an
       explanatory phrase on the SAME badge — never a second badge. */
    if (local) html += '<p class="small muted"><span class="badge b-pending">' + esc(L2({ ar: 'كشف جزئي — موقع ' + currentSiteLabel() + ' فقط — بلا رصيد افتتاحي للشركة', en: 'Partial statement — this site only — no company-wide opening balance' })) + '</span></p>';

    var sup = suppliers.filter(function (s) { return s.id === supplierFilters.supplier; })[0];
    if (!sup) {
      html += '<div class="empty-state">' + esc(L2({ ar: 'لا يوجد مورّدون مرئيون', en: 'No suppliers visible' })) + '</div>';
      lastRows = { headers: [], rows: [], raw: [] };
      box.innerHTML = html; bindSupplierFilterEvents(); return;
    }

    if (supplierFilters.basis === 'posted') {
      html += '<div class="alert alert-warn">' + esc(L2({
        /* 🔴 جملة يقرؤها المحاسب: لا اسم دالّة فيها (كانت تذكر az_acc_trial_balance_json) — الدفاتر تُرفع مطفأة (الملف 90).
           A sentence the accountant reads: no function name (it used to name az_acc_trial_balance_json) — the books ship OFF (file 90). */
        ar: 'القيود المرحّلة غير متاحة بعد — الترحيل متوقف حتى يُفعَّل. اعرض «مستندات معتمدة» بدلاً منه.',
        en: 'Posted entries are not available yet — posting is switched off until it is turned on. Use "Approved documents" instead.'
      })) + '</div>';
      lastRows = { headers: [], rows: [], raw: [] };
      box.innerHTML = html; bindSupplierFilterEvents(); return;
    }

    var ledger = DeskLedgers.supplierLedger(sup.id, supplierFilters.from || null, supplierFilters.to || null, supplierFilters.site || null, !local);
    var openingLabel = sup.openingDate
      ? L2({ ar: 'الحركات من ' + sup.openingDate + '؛ ما قبلها في بابل', en: 'Movements from ' + sup.openingDate + '; before that, in Babel' })
      : L2({ ar: 'لا تاريخ فتح مسجَّل لهذا المورّد', en: 'No opening date recorded for this supplier' });
    html += '<p class="small muted">' + esc(openingLabel) + '</p>';

    html += '<div class="azd-summarystrip">' +
      '<div><small>' + esc(L2({ ar: 'رصيد أول', en: 'Opening' })) + '</small><b>' + money(ledger.opening) + '</b></div>' +
      '<div class="warn"><small>' + esc(L2({ ar: 'الرصيد المستحق', en: 'Balance due' })) + '</small><b>' + money(ledger.closing) + '</b></div>' +
      '</div>';

    var headers = [L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'المستند', en: 'Document' }), L2({ ar: 'البيان', en: 'Description' }), L2({ ar: 'مدين', en: 'Debit' }), L2({ ar: 'دائن', en: 'Credit' })];
    var rowsHtml = ledger.rows.map(function (m) {
      return '<tr data-open-mod="' + esc(m.moduleId) + '" data-open-id="' + esc(m.id) + '" class="azd-clickrow">' +
        '<td class="num">' + esc(m.date || '') + '</td><td class="num">' + esc(m.docNo || '') + '</td><td>' + esc(L2(m.label)) + '</td>' +
        '<td class="money">' + (m.amount > 0 ? money(m.amount) : '') + '</td><td class="money">' + (m.amount < 0 ? money(-m.amount) : '') + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="5" class="empty-state">' + esc(L2({ ar: 'لا حركات في هذا المدى', en: 'No movements in this range' })) + '</td></tr>') + '</tbody></table></div>';

    html += '<h3 class="pv-h3" style="margin-top:12px">' + esc(L2({ ar: 'الفواتير والمستخلصات المفتوحة', en: 'Open invoices / certificates' })) + '</h3>';
    var invHeaders = [L2({ ar: 'المستند', en: 'Document' }), L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'الإجمالي', en: 'Total' }), L2({ ar: 'المتبقي', en: 'Open' })];
    var invRowsHtml = ledger.openInvoices.map(function (i) {
      return '<tr data-open-mod="supplierInvoices" data-open-id="' + esc(i.id) + '" class="azd-clickrow">' +
        '<td class="num">' + esc(i.docNo || '') + '</td><td class="num">' + esc(i.date || '') + '</td>' +
        '<td class="money">' + money(i.total) + '</td><td class="money">' + money(i.open) + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + invHeaders.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (invRowsHtml || '<tr><td colspan="4" class="empty-state">' + esc(L2({ ar: 'لا فواتير', en: 'No invoices' })) + '</td></tr>') + '</tbody></table></div>';

    if (ledger.unallocatedAdvances.length) {
      html += '<h3 class="pv-h3" style="margin-top:12px">' + esc(L2({ ar: 'دفعات غير مخصَّصة', en: 'Unallocated advances' })) + '</h3>';
      var advHeaders = [L2({ ar: 'المستند', en: 'Document' }), L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'المبلغ', en: 'Amount' })];
      var advRowsHtml = ledger.unallocatedAdvances.map(function (a) {
        return '<tr data-open-mod="payments" data-open-id="' + esc(a.id) + '" class="azd-clickrow">' +
          '<td class="num">' + esc(a.docNo || '') + '</td><td class="num">' + esc(a.date || '') + '</td><td class="money">' + money(a.amount) + '</td></tr>';
      }).join('');
      html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + advHeaders.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + advRowsHtml + '</tbody></table></div>';
    }

    /* 🔴 مُصلَح (b01 check 3، ١٩ سبتمبر) — التصدير كان يحمل أسطر الحركة
       فقط، بلا الرصيد الافتتاحي ولا الرصيد المستحق (كلاهما تعرضهما الشاشة
       في شريط الملخّص، لا الجدول) — فمن يفتح الـCSV لا يرى الرقمين
       الأهمّ في الكشف كله. الإصلاح: صفّان إضافيّان بنفس أعمدة الجدول
       الخمسة، في أوّل الصفوف وآخرها — البيان يحمل الاسم، والمبلغ في عمود
       مدين/دائن بنفس اصطلاح صفوف الحركة (موجبٌ = مدين، سالبٌ = دائن).
       🔴 FIXED (b01 check 3, 19 Sept) — the export used to carry only the
       movement rows, missing both the opening balance and the balance due
       (the screen shows both, in the summary strip, never in the table)
       — so whoever opened the CSV never saw the two most important
       numbers in the whole statement. THE FIX: two extra rows sharing the
       SAME five columns as the table, first and last — the description
       carries the label, the amount follows the same debit/credit
       convention the movement rows already use (positive = debit,
       negative = credit). */
    var csvRows = [
      ['', '', L2({ ar: 'رصيد افتتاحي', en: 'Opening balance' }), ledger.opening > 0 ? ledger.opening : '', ledger.opening < 0 ? -ledger.opening : '']
    ];
    ledger.rows.forEach(function (m) { csvRows.push([m.date || '', m.docNo || '', L2(m.label), m.amount > 0 ? m.amount : '', m.amount < 0 ? -m.amount : '']); });
    csvRows.push(['', '', L2({ ar: 'الرصيد المستحق', en: 'Balance due' }), ledger.closing > 0 ? ledger.closing : '', ledger.closing < 0 ? -ledger.closing : '']);
    lastRows = {
      headers: headers,
      rows: csvRows,
      raw: ledger.rows
    };
    exportName = 'supplier_statement';

    box.innerHTML = html;
    bindSupplierFilterEvents();
    box.querySelectorAll('.azd-clickrow').forEach(function (tr) {
      tr.addEventListener('click', function () {
        supplierFilters.scroll = box.scrollTop || window.scrollY;
        var m = tr.getAttribute('data-open-mod'), id = tr.getAttribute('data-open-id');
        if (global.EntityPage) EntityPage.openDetail(m, id);
      });
    });
    if (supplierFilters.scroll) window.scrollTo(0, supplierFilters.scroll);
  }

  function bindSupplierFilterEvents() {
    var sel = document.getElementById('azdSupSel');
    if (sel) sel.onchange = function () { supplierFilters.supplier = sel.value; drawSupplierBody(); };
    var f = document.getElementById('azdSupFrom'), t = document.getElementById('azdSupTo');
    if (f) f.onchange = function () { supplierFilters.from = f.value; drawSupplierBody(); };
    if (t) t.onchange = function () { supplierFilters.to = t.value; drawSupplierBody(); };
    document.querySelectorAll('[data-sup-basis]').forEach(function (b) {
      b.onclick = function () { supplierFilters.basis = b.getAttribute('data-sup-basis'); drawSupplierBody(); };
    });
  }

  /* =========================================================================
     ٣) كشف المعدة (الشريحة ٣، العقد سطر ١٨)
        EQUIPMENT STATEMENT (slice 3, contract line 18)
     ========================================================================= */
  /* 🔴 مُصحَّح بأمر المُنسِّق (فحص t11، ١٩ سبتمبر) — كان هذا التبويب يقرأ
     DeskLedgers.equipment() وحدها (Store.all('equipment') المباشرة)،
     فيراه فارغاً كل من accountant وfinance_manager معاً (لا سياسة SELECT
     لأيّهما على الجدول الأساسي) ويعرض «لا توجد معدّات مرئية» بلا أي رقم،
     رغم أن المبالغ نفسها (من أسطر التسوية والفواتير) كانت متاحة فعلاً.
     desk-ledgers.js:equipmentNames() الآن تعود إلى portal_equipment_names
     (نفس عرض desk-cell-picker.js) حين تكون القائمة الحقيقية فارغة —
     وهذا يجعل drawEquipmentBody غير متزامنة (وعدٌ واحد)، فتُبنى الشاشة
     في دالّة renderEquipmentTab أدناه بعد وصول القائمة، مع حارس activeTab
     لتفادي رسم شاشة تبويبٍ لم يعد نشطاً.
     FIXED per the coordinator's instruction (t11 check, 19 Sept) — this
     tab used to read DeskLedgers.equipment() alone (a direct Store.all
     ('equipment')), which is empty for BOTH accountant and finance_manager
     (neither holds a SELECT policy on the base table), so it showed "no
     equipment visible" with no figure at all — even though the AMOUNTS
     themselves (from settlement lines and invoices) were genuinely
     available. desk-ledgers.js:equipmentNames() now falls back to
     portal_equipment_names (the SAME view desk-cell-picker.js already
     uses) when the real list is empty — which makes drawEquipmentBody
     asynchronous (one promise), so the screen is built in
     renderEquipmentTab below once the list arrives, guarded by activeTab
     so a tab the user has already left is never drawn late. */
  function drawEquipmentBody() {
    var box = document.getElementById('repBody');
    if (!box) return;
    if (!global.DeskLedgers || !DeskLedgers.equipmentCost || !DeskLedgers.equipmentNames) { box.innerHTML = '<p class="small muted">desk-ledgers.js غير محمَّل</p>'; return; }
    DeskLedgers.equipmentNames().then(function (equipList) {
      if (activeTab !== 'equipment') return; /* بدّل المستخدم التبويب أثناء الانتظار · the user switched tabs while waiting */
      renderEquipmentTab(equipList || []);
    });
  }

  function renderEquipmentTab(equipList) {
    var box = document.getElementById('repBody');
    if (!box) return;
    if (!equipmentFilters.equipment && equipList.length) equipmentFilters.equipment = equipList[0].id;
    var central = !isLocalAccountant();

    var html = '<div class="table-toolbar">' +
      '<label class="field" style="min-width:200px"><span class="field-label">' + esc(L2({ ar: 'المعدة', en: 'Equipment' })) + '</span>' +
      '<select class="select input-sm" id="azdEqSel">' + equipList.map(function (e) {
        return '<option value="' + esc(e.id) + '"' + (equipmentFilters.equipment === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>';
      }).join('') + '</select></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'من', en: 'From' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdEqFrom" value="' + esc(equipmentFilters.from) + '"></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'إلى', en: 'To' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdEqTo" value="' + esc(equipmentFilters.to) + '"></label>';
    if (central) {
      var siteList1 = (global.Store && Store.all) ? Store.all('sites') : [];
      html += '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'الموقع', en: 'Site' })) + '</span>' +
        '<select class="select input-sm" id="azdEqSite"><option value="">' + esc(L2({ ar: 'كل المواقع', en: 'All sites' })) + '</option>' +
        siteList1.map(function (s) { return '<option value="' + esc(s.id) + '"' + (equipmentFilters.site === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
        '</select></label>';
    }
    html += '</div>';

    var eq = equipList.filter(function (e) { return e.id === equipmentFilters.equipment; })[0];
    if (!eq) {
      html += '<div class="empty-state">' + esc(L2({ ar: 'لا توجد معدّات مرئية', en: 'No equipment visible' })) + '</div>';
      lastRows = { headers: [], rows: [], raw: [] };
      box.innerHTML = html; bindEquipmentFilterEvents(); return;
    }

    if (!central) html += '<p class="small muted"><span class="badge b-pending">' + esc(L2({ ar: 'كشف جزئي — موقع ' + currentSiteLabel() + ' فقط', en: 'Partial statement — this site only' })) + '</span></p>';

    var siteFilter = central ? (equipmentFilters.site || null) : null;
    var res = DeskLedgers.equipmentCost(eq.id, equipmentFilters.from || null, equipmentFilters.to || null, siteFilter);

    var headers = [L2({ ar: 'الغرض (بند التكلفة)', en: 'Purpose (cost item)' }), L2({ ar: 'الفترة', en: 'Period' }), L2({ ar: 'منذ بداية السنة', en: 'Year to date' })];
    var rowsHtml = res.purposes.map(function (p) {
      return '<tr><td>' + esc(p.label || L2({ ar: 'بلا بند تكلفة', en: 'No cost item' })) + '</td><td class="money">' + money(p.period) + '</td><td class="money">' + money(p.ytd) + '</td></tr>';
    }).join('');
    html += '<h3 class="pv-h3">' + esc(L2({ ar: 'إجمالي الفترة حسب الغرض', en: 'Period total by purpose' })) + '</h3>' +
      '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="3" class="empty-state">' + esc(L2({ ar: 'لا تكلفة في هذا المدى', en: 'No cost in this range' })) + '</td></tr>') + '</tbody></table></div>';

    html += '<h3 class="pv-h3">' + esc(L2({ ar: 'سجلّ الحركة', en: 'Usage log' })) +
      ' <small style="font-weight:600;color:var(--text-3)">— ' + esc(L2({ ar: 'ساعات/لترات؛ التكلفة هنا للعِلم فقط ولا تُجمع', en: 'hours/litres; cost here is FOR INFORMATION ONLY and never totalled' })) + '</small></h3>';
    var logHeaders = [L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'البيان', en: 'Description' }), L2({ ar: 'ساعات', en: 'Hours' }), L2({ ar: 'لترات', en: 'Litres' }), L2({ ar: 'التكلفة (غير محاسبي)', en: 'Cost (not accounting)' })];
    var logRowsHtml = res.logs.map(function (l) {
      return '<tr><td class="num">' + esc(l.date || '') + '</td><td>' + esc(l.desc || '') + '</td><td class="num">' + esc(l.hours || 0) + '</td>' +
        '<td class="num">' + esc(l.litres || 0) + '</td><td class="money">' + money(l.cost) + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap pv-scrollbox"><table class="data-table"><thead><tr>' + logHeaders.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (logRowsHtml || '<tr><td colspan="5" class="empty-state">' + esc(L2({ ar: 'لا حركة مسجَّلة', en: 'No logged usage' })) + '</td></tr>') + '</tbody></table></div>';

    lastRows = { headers: headers, rows: res.purposes.map(function (p) { return [p.label || '—', p.period, p.ytd]; }), raw: res.purposes };
    exportName = 'equipment_statement';

    box.innerHTML = html;
    bindEquipmentFilterEvents();
  }

  function bindEquipmentFilterEvents() {
    var sel = document.getElementById('azdEqSel');
    if (sel) sel.onchange = function () { equipmentFilters.equipment = sel.value; drawEquipmentBody(); };
    var f = document.getElementById('azdEqFrom'), t = document.getElementById('azdEqTo');
    if (f) f.onchange = function () { equipmentFilters.from = f.value; drawEquipmentBody(); };
    if (t) t.onchange = function () { equipmentFilters.to = t.value; drawEquipmentBody(); };
    var site = document.getElementById('azdEqSite');
    if (site) site.onchange = function () { equipmentFilters.site = site.value; drawEquipmentBody(); };
  }

  /* =========================================================================
     ٤) المصروف حسب بند التكلفة / الحساب (الشريحة ٣، العقد سطر ١٨)
        EXPENSE BY COST ITEM / ACCOUNT (slice 3, contract line 18)
     ========================================================================= */
  function drawExpenseBody() {
    var box = document.getElementById('repBody');
    if (!box) return;
    if (!global.DeskLedgers || !DeskLedgers.expenseByGroup) { box.innerHTML = '<p class="small muted">desk-ledgers.js غير محمَّل</p>'; return; }

    var central = !isLocalAccountant();
    var html = '<div class="table-toolbar">';
    if (central) {
      var siteList2 = (global.Store && Store.all) ? Store.all('sites') : [];
      html += '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'الموقع', en: 'Site' })) + '</span>' +
        '<select class="select input-sm" id="azdExpSite"><option value="">' + esc(L2({ ar: 'كل المواقع', en: 'All sites' })) + '</option>' +
        siteList2.map(function (s) { return '<option value="' + esc(s.id) + '"' + (expenseFilters.site === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') +
        '</select></label>';
    } else {
      html += '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'الموقع', en: 'Site' })) + '</span>' +
        '<input class="input input-sm" value="' + esc(currentSiteLabel()) + '" disabled></label>';
    }
    html += '<label class="field" style="min-width:170px"><span class="field-label">' + esc(L2({ ar: 'التجميع حسب', en: 'Group by' })) + '</span>' +
      '<select class="select input-sm" id="azdExpGroup">' +
      '<option value="cost"' + (expenseFilters.groupBy === 'cost' ? ' selected' : '') + '>' + esc(L2({ ar: 'بند التكلفة', en: 'Cost item' })) + '</option>' +
      '<option value="account"' + (expenseFilters.groupBy === 'account' ? ' selected' : '') + '>' + esc(L2({ ar: 'الحساب', en: 'Account' })) + '</option>' +
      '</select></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'من', en: 'From' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdExpFrom" value="' + esc(expenseFilters.from) + '"></label>' +
      '<label class="field" style="min-width:150px"><span class="field-label">' + esc(L2({ ar: 'إلى', en: 'To' })) + '</span>' +
      '<input type="date" class="input input-sm" id="azdExpTo" value="' + esc(expenseFilters.to) + '"></label>' +
      '</div>';

    if (!central) html += '<p class="small muted"><span class="badge b-pending">' + esc(L2({ ar: 'كشف جزئي — موقع ' + currentSiteLabel() + ' فقط', en: 'Partial statement — this site only' })) + '</span></p>';
    html += '<div class="pv-cover">' + esc(L2({
      ar: 'كل مستند يُحسب مرة — فاتورةٌ مرتبطة بإذن استلام لا تُضاف هنا (تُحسب في تقارير المخازن بدل ذلك)',
      en: 'Each document counts once — an invoice linked to a goods receipt is not added here (it counts in the stores reports instead)'
    })) + '</div>';

    var siteFilter = central ? (expenseFilters.site || null) : null;
    var res = DeskLedgers.expenseByGroup(expenseFilters.groupBy, expenseFilters.from || null, expenseFilters.to || null, siteFilter);
    var groupLabel = expenseFilters.groupBy === 'account' ? L2({ ar: 'الحساب', en: 'Account' }) : L2({ ar: 'بند التكلفة', en: 'Cost item' });
    var headers = [groupLabel, L2({ ar: 'الفترة', en: 'Period' }), L2({ ar: 'منذ بداية السنة', en: 'Year to date' })];
    var rowsHtml = res.map(function (r) {
      return '<tr><td>' + esc(r.label || L2({ ar: 'بلا تصنيف', en: 'Unclassified' })) + '</td><td class="money">' + money(r.period) + '</td><td class="money">' + money(r.ytd) + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + (rowsHtml || '<tr><td colspan="3" class="empty-state">' + esc(L2({ ar: 'لا بيانات في هذا المدى', en: 'No data in this range' })) + '</td></tr>') + '</tbody></table></div>';

    lastRows = { headers: headers, rows: res.map(function (r) { return [r.label || '—', r.period, r.ytd]; }), raw: res };
    exportName = 'expense_statement';

    box.innerHTML = html;
    bindExpenseFilterEvents();
  }

  function bindExpenseFilterEvents() {
    var g = document.getElementById('azdExpGroup');
    if (g) g.onchange = function () { expenseFilters.groupBy = g.value; drawExpenseBody(); };
    var f = document.getElementById('azdExpFrom'), t = document.getElementById('azdExpTo');
    if (f) f.onchange = function () { expenseFilters.from = f.value; drawExpenseBody(); };
    if (t) t.onchange = function () { expenseFilters.to = t.value; drawExpenseBody(); };
    var site = document.getElementById('azdExpSite');
    if (site) site.onchange = function () { expenseFilters.site = site.value; drawExpenseBody(); };
  }

  /* =========================================================================
     ٥) كشف المخزون (رابط فقط) — العقد سطر ١٨
        STOCK (LINK ONLY) — contract line 18
     -------------------------------------------------------------------------
     لا يكرّر شاشة المخازن — يعرض قائمة إذون صرفٍ معتمدة، والنقر يفتح
     المستند الحقيقي في نافذة التفاصيل نفسها التي تفتحها كل الكشوف الأخرى
     (EntityPage.openDetail) — لا آلية ثانية.
     Never duplicates the stores screen — lists approved issue notes, and a
     click opens the REAL document in the exact same detail window every
     other statement uses (EntityPage.openDetail) — no second mechanism.
     ========================================================================= */
  function drawStockLinkBody() {
    var box = document.getElementById('repBody');
    if (!box) return;
    var html = '<div class="pv-cover" style="margin-bottom:10px">' + esc(L2({
      ar: 'هذه الشاشة لا تكرّر شاشة المخازن — تعرض فقط سلوك الرابط: فتح مستند مخزون داخل شاشة المخازن الحقيقية.',
      en: 'This screen does not duplicate the stores screen — it only demonstrates the link: opening a stock document inside the real stores screen.'
    })) + '</div>';

    var candidates = (global.Store && Store.all)
      ? Store.all('stockIssues').filter(function (x) { return x.status === 'approved'; }).sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); }).slice(0, 30)
      : [];
    if (!candidates.length) {
      html += '<div class="empty-state">' + esc(L2({ ar: 'لا توجد إذون صرفٍ معتمدة مرئية', en: 'No approved issue notes visible' })) + '</div>';
      lastRows = { headers: [], rows: [], raw: [] };
      box.innerHTML = html;
      return;
    }

    var headers = [L2({ ar: 'المستند', en: 'Document' }), L2({ ar: 'التاريخ', en: 'Date' }), L2({ ar: 'المخزن', en: 'Warehouse' })];
    var rowsHtml = candidates.map(function (d) {
      return '<tr data-open-mod="stockIssues" data-open-id="' + esc(d.id) + '" class="azd-clickrow">' +
        '<td class="num">' + esc(d.docNo || '') + '</td><td class="num">' + esc(d.date || '') + '</td><td>' + esc(d.warehouse || '') + '</td></tr>';
    }).join('');
    html += '<div class="table-wrap"><table class="data-table"><thead><tr>' + headers.map(function (h) { return '<th>' + esc(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + rowsHtml + '</tbody></table></div>';

    lastRows = { headers: headers, rows: candidates.map(function (d) { return [d.docNo || '', d.date || '', d.warehouse || '']; }), raw: candidates };
    exportName = 'stock_link';

    box.innerHTML = html;
    box.querySelectorAll('.azd-clickrow').forEach(function (tr) {
      tr.addEventListener('click', function () {
        var m = tr.getAttribute('data-open-mod'), id = tr.getAttribute('data-open-id');
        if (global.EntityPage) EntityPage.openDetail(m, id);
      });
    });
  }

  /* =========================================================================
     الإطار المشترك للتبويبات الخمسة · THE SHARED FIVE-TAB FRAMEWORK
     ========================================================================= */
  var TABS = [
    { id: 'custody', gate: gateCustody, btnId: 'azdCustodyTab', icon: 'wallet', label: { ar: 'كشف العهدة', en: 'Custody statement' }, draw: drawCustodyBody },
    { id: 'supplier', gate: gateSupplierDocs, btnId: 'azdSupplierTab', icon: 'file', label: { ar: 'كشف المورد', en: 'Supplier statement' }, draw: drawSupplierBody },
    { id: 'equipment', gate: gateSupplierDocs, btnId: 'azdEquipmentTab', icon: 'truck-2', label: { ar: 'كشف المعدة', en: 'Equipment statement' }, draw: drawEquipmentBody },
    { id: 'expense', gate: gateSupplierDocs, btnId: 'azdExpenseTab', icon: 'tag', label: { ar: 'كشف المصروف', en: 'Expense statement' }, draw: drawExpenseBody },
    { id: 'stock', gate: gateSupplierDocs, btnId: 'azdStockLinkTab', icon: 'box', label: { ar: 'كشف المخزون (رابط)', en: 'Stock (link)' }, draw: drawStockLinkBody }
  ];

  function buildOwnShell(host) {
    host.innerHTML =
      '<div class="page-head"><div class="page-head-text">' +
      '<h1 class="page-title">' + (global.UI && UI.icon ? UI.icon('chart', 22) : '') + ' ' + esc(L2({ ar: 'التقارير', en: 'Reports' })) + '</h1>' +
      '</div><div class="page-actions">' +
      '<button class="btn btn-outline btn-sm" id="repExport">' + (global.UI && UI.icon ? UI.icon('download', 15) : '') + ' ' + esc(L2({ ar: 'تصدير', en: 'Export' })) + '</button>' +
      '<button class="btn btn-outline btn-sm" id="repPrint">' + (global.UI && UI.icon ? UI.icon('printer', 15) : '') + ' ' + esc(L2({ ar: 'طباعة', en: 'Print' })) + '</button>' +
      '</div></div>' +
      '<div class="tabs"></div>' +
      '<div class="card"><div class="card-body flush" id="repBody"></div></div>';
    var pr = document.getElementById('repPrint');
    if (pr) pr.onclick = function () { global.print(); };
  }

  function ensure(host) {
    var visible = TABS.filter(function (tb) { try { return !!tb.gate(); } catch (e) { return false; } });
    if (!visible.length) return;
    var tabs = host.querySelector('.tabs');
    if (!tabs) {
      buildOwnShell(host);
      tabs = host.querySelector('.tabs');
      if (!tabs) return;
    }
    visible.forEach(function (tb) {
      var btn = tabs.querySelector('#' + tb.btnId);
      if (!btn) {
        btn = document.createElement('button');
        btn.id = tb.btnId; btn.type = 'button'; btn.setAttribute('data-acc-tab', '1');
        btn.onclick = function () { activeTab = tb.id; ensure(host); };
        tabs.appendChild(btn);
      }
      btn.className = 'tab' + (activeTab === tb.id ? ' active' : '');
      btn.innerHTML = (global.UI && UI.icon ? UI.icon(tb.icon, 15) : '') + ' ' + esc(L2(tb.label));
    });
    var active = visible.filter(function (tb) { return tb.id === activeTab; })[0];
    if (active) {
      tabs.querySelectorAll('.tab').forEach(function (b) { if (b.id !== active.btnId) b.classList.remove('active'); });
      var body = document.getElementById('repBody');
      if (body) body.innerHTML = '';
      active.draw();
      rebindExport();
    }
  }
  function rebindExport() {
    var exp = document.getElementById('repExport');
    if (!exp) return;
    var clone = exp.cloneNode(true);
    exp.parentNode.replaceChild(clone, exp);
    clone.onclick = function () {
      if (!global.UI || !UI.exportCSV) return;
      UI.exportCSV(exportName, lastRows.headers, lastRows.rows);
    };
  }
  /* 🔴 عطلٌ قديم موروث من الشريحة ٢ (كشف العهدة وحده)، وُجد بالتشغيل
     الفعلي هنا الآن (t11، ١٩ سبتمبر) — لا افتراضاً · AN OLD FAULT
     inherited from slice 2 (custody statement alone), found by ACTUALLY
     RUNNING it here (t11, 19 Sept) — not assumed
     ------------------------------------------------------------------
     الحارس `if (!activeTab) return;` كان يعني: إن نقر المستخدم تبويباً
     أصلياً (مثل «أعمار ديون الموردين») قبل أن يفتح أيّاً من تبويباتنا
     الخمسة ولو مرّة، فحين يُعيد ذلك النقر بناء host.innerHTML بالكامل
     (نمط reports.js الأصلي)، يُطلَق المراقب فعلاً لكنه يتجاهل الحدث فوراً
     — فتختفي أزرارنا الخمسة عن الشاشة نهائياً حتى تُغادَر صفحة التقارير
     وتُفتَح من جديد. t06 لم يكشفه لأنه ينقر azdCustodyTab أولاً دائماً.
     الإصلاح: نداء ensure(host) دائماً — آمنٌ هنا لأن subtree:false يعني
     أن هذا المراقب لا يرى أصلاً أي تعديلٍ يُحدثه ensure نفسه (أزرار
     .tabs ومحتوى #repBody كلاهما أحفاد، لا أبناء مباشرون لـhost) — فلا
     حلقة ممكنة (خلافاً لعطل ap/cash في desk-ledgers.js الذي استعمل
     subtree:true). مُثبَت: t11 (E1) كان يفشل بمهلة قبل هذا الإصلاح؛
     يمرّ بعده.
     The guard `if (!activeTab) return;` meant: if the user clicked a
     NATIVE tab (e.g. "Supplier ageing") before ever opening any of our
     five tabs once, then when that click fully rebuilt host.innerHTML
     (reports.js's own native pattern), the observer DID fire but ignored
     it immediately — so our five buttons vanished from the screen for
     good until the Reports page was left and re-entered. t06 never
     caught this because it always clicks azdCustodyTab first. THE FIX:
     always call ensure(host) — safe here because subtree:false means
     this observer never even SEES any mutation ensure() itself makes
     (both the .tabs buttons and #repBody's content are grandchildren of
     host, not direct children) — so no loop is possible (unlike the
     ap/cash fault in desk-ledgers.js, which used subtree:true). PROVEN:
     t11 (E1) timed out before this fix, passes after it. */
  function observeHost(host) {
    if (host.__azdStmtObs) return;
    host.__azdStmtObs = true;
    new MutationObserver(function () {
      try { ensure(host); } catch (e) { console.error('desk-statements.js: observer failed', e); }
    }).observe(host, { childList: true, subtree: false });
  }

  var originalRender = global.ReportsPage.render;
  global.ReportsPage.render = function (host) {
    originalRender(host);
    try { ensure(host); observeHost(host); } catch (e) { console.error('desk-statements.js: could not attach the desk tabs', e); }
  };

  global.DeskStatements = {
    drawBody: drawCustodyBody, /* توافقٌ خلفي مع الاسم القديم · backward-compat with the old name */
    drawCustodyBody: drawCustodyBody,
    drawSupplierBody: drawSupplierBody,
    drawEquipmentBody: drawEquipmentBody,
    drawExpenseBody: drawExpenseBody,
    drawStockLinkBody: drawStockLinkBody
  };
  console.info('desk-statements.js ready — 5 tabs on Reports (custody/supplier/equipment/expense/stock-link); ' +
    'posted basis: custody only, others state their own gap.');
})(window);

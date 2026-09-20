/* =========================================================================
   desk-ledgers.js — مصدر واحد لحركات العهدة (الخطة §٣.١ و§٧)
                     ONE SOURCE for custody box movements (plan §3.1, §7)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢، وجزء من
      كشف العهدة في الشريحة ٣ — بُني الآن لأن desk-side-panel.js وdesk-
      statements.js يحتاجانه معاً الليلة).

   القاعدة نفسها في كل مكان يعرضها · THE SAME RULE EVERYWHERE IT IS SHOWN
   -------------------------------------------------------------------------
   رصيد صندوق العهدة (الخطة §3.1) = openingBalance (بعد/عند openingDate) +
   Σ«تحويل نقدية» المعتمدة (تمويل داخل، استرداد خارج) − Σ«تسوية عهدة»
   المعتمدة (acceptedTotal فقط). المُعلَّق (pending/reviewed) والمُرتَجَع
   يُعرَضان منفصلَين، لا يُطرحان أبداً من «المتاح» — تماماً كما يقول القسم
   ٣.١.
   🔴 مُصلَح (مُدقِّق ١٩ سبتمبر) — الادّعاء السابق هنا («لا حساب ثانٍ لهذا
   الرقم في أي ملف آخر») كان خطأً مثبَتاً بالتشغيل: الصفحة الرئيسية
   (Dashboard.analytics.cashBalance، pages/dashboard.js:129-135) والتنبيه
   («عهدة تحتاج تسوية»، alerts.js:279-289) كانا يحسبان رصيد أي حساب نقدي
   بـ openingBalance + إيصالات − مدفوعات فقط، بلا أي علم بالتحويلات، فيريان
   صفراً لصندوق عهدة موّلته «تحويل نقدية» فقط بدل قيمته الحقيقية، والخزينة
   المركزية تبقى بكامل رصيدها القديم رغم خروج التحويل منها فعلاً. أسفل هذا
   الملف الآن يلفّ Dashboard.analytics.cashBalance من الخارج ليضيف صافي
   حركات هذا الملف نفسه (نفس movementsForBox المُستعمَلة في boxBalance)
   فوق حساب dashboard.js الأصلي — فتقرأ اللوحة الرئيسية والتنبيه نفس الرقم
   الذي تقرؤه هذه الوحدة، بلا حذف لحساب dashboard.js الأصلي (إيصالات/
   مدفوعات الحسابات العادية تبقى كما هي، والتحويلات تُضاف فوقها).
   🔴 ما زال غير مُغطّى عمداً (خارج نطاق هذه الشريحة): تقرير «حركة الخزائن
   والبنوك» في pages/reports.js:508-531 يحسب نسخته الخاصة الثالثة
   (openingBalance + إيصالات مُصفّاة بالمدى الزمني − مدفوعات) بلا أي علم
   بالتحويلات أيضاً — لم يُلمَس هنا، ويبقى الرقم الثالث المختلف حتى تُبنى
   الشريحة ٣ (الكشوف).

   The custody box balance (plan §3.1) = openingBalance (on/after
   openingDate) + Σ approved "custody transfer" (funding IN, return OUT)
   − Σ approved "custody settlement" acceptedTotal ONLY. Pending/reviewed
   and returned amounts are shown SEPARATELY, never subtracted from
   "available" — exactly plan §3.1.
   🔴 FIXED (integrator, 19 Sept) — the claim that used to sit here ("no
   second computation of this figure anywhere else") was proven wrong by
   running it: the home dashboard (Dashboard.analytics.cashBalance,
   pages/dashboard.js:129-135) and the "custody needs settlement" alert
   (alerts.js:279-289) both computed any cash account's balance as
   openingBalance + receipts − payments only, with no knowledge of
   transfers at all — so a custody box funded ONLY by a "custody
   transfer" showed as ZERO instead of its real balance, and the central
   treasury kept its full old balance even though a transfer had actually
   left it. Below, this file now wraps Dashboard.analytics.cashBalance
   from the outside to add this SAME file's own net movement figure (the
   same movementsForBox used by boxBalance) on top of dashboard.js's
   original computation — so the home KPI and the alert read the exact
   same number this file does, without discarding dashboard.js's own
   maths (ordinary accounts' receipts/payments are kept exactly as they
   were; transfers are added on top).
   🔴 Still deliberately NOT covered (out of this slice's scope): the
   "Cash & bank movement" REPORT in pages/reports.js:508-531 computes its
   own THIRD version (openingBalance + date-ranged receipts − payments)
   with no knowledge of transfers either — left untouched here, and
   remains a third, different figure until slice 3 (statements) is built.

   يقرأ من Store.all فقط — بلا شبكة إضافية · READS FROM Store.all ONLY — no
   extra network calls
   -------------------------------------------------------------------------
   كل الوثائق محمَّلة أصلاً عند تسجيل الدخول (store.js). Auth.scopeRows
   (المُطبَّق بالفعل عبر desk-money-site.js) يقصّ ما لا يراه المستخدم قبل
   أن يصل هنا — فهذا الملف لا يحتاج تكرار سياج الموقع بنفسه.
   Every document is already loaded at login (store.js). Auth.scopeRows
   (already applied via desk-money-site.js) prunes what this user may not
   see BEFORE it reaches here — this file does not need to re-implement
   the site fence.

   إضافي بالكامل — حذف هذا الملف يعطّل شريط الرصيد الجانبي وكشف العهدة معاً
   (يرجعان لغيابهما اليوم)، بلا أي أثر على المستندات نفسها.
   Fully additive — deleting this file disables the side-panel balance
   strip and the custody statement together (both return to not existing
   today), with zero effect on the documents themselves.
   ========================================================================= */
(function (global) {
  'use strict';

  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function rows(table) { try { return (global.Store && Store.all) ? (Store.all(table) || []) : []; } catch (e) { return []; } }

  /* ── حركات صندوق عهدة واحد، ضمن مدى تاريخ اختياري ────────────────────────
     Movements of ONE custody box, within an optional date range. */
  function movementsForBox(boxId, from, to) {
    var out = [];
    rows('custodyTransfers').forEach(function (t) {
      if (t.status !== 'approved') return;
      var inBox = t.toCashAccount === boxId, outBox = t.fromCashAccount === boxId;
      if (!inBox && !outBox) return;
      if (from && t.date < from) return;
      if (to && t.date > to) return;
      out.push({
        date: t.date, docNo: t.docNo, kind: 'transfer',
        label: { ar: inBox ? 'تمويل عهدة' : 'استرداد من عهدة', en: inBox ? 'Custody funding' : 'Custody return' },
        amount: inBox ? num(t.amount) : -num(t.amount), status: t.status,
        moduleId: 'custodyTransfers', id: t.id
      });
    });
    rows('custodySettlements').forEach(function (s) {
      if (s.custodyAccount !== boxId) return;
      if (s.status !== 'approved') return;
      if (from && s.date < from) return;
      if (to && s.date > to) return;
      out.push({
        date: s.date, docNo: s.docNo, kind: 'settlement',
        label: { ar: 'تسوية عهدة — مقبول', en: 'Custody settlement — accepted' },
        amount: -num(s.acceptedTotal), status: s.status,
        moduleId: 'custodySettlements', id: s.id
      });
    });
    out.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });
    return out;
  }

  /* ── الرصيد اللحظي («المتاح») ─────────────────────────────────────────── */
  function boxBalance(boxId) {
    var box = rows('cashAccounts').filter(function (c) { return c.id === boxId; })[0];
    var opening = box ? num(box.openingBalance) : 0;
    var openingDate = box ? box.openingDate : null;
    var mv = movementsForBox(boxId, openingDate || null, null);
    var funded = 0, accepted = 0;
    mv.forEach(function (m) { if (m.kind === 'transfer') funded += m.amount; else accepted += -m.amount; });
    var available = opening + funded - accepted;

    var pending = 0, reviewedTotal = 0, returned = 0;
    rows('custodySettlements').forEach(function (s) {
      if (s.custodyAccount !== boxId) return;
      if (s.status === 'pending') pending += num(s.totalAmount);
      else if (s.status === 'reviewed') reviewedTotal += num(s.acceptedTotal || s.totalAmount);
      /* 🔴 عطلٌ حقيقي وُجد بالتشغيل (t06، ١٩ سبتمبر) — لا افتراضاً · A REAL
         BUG FOUND BY RUNNING (t06, 19 Sept) — not assumed
         -------------------------------------------------------------
         اعتماد التصحيح لا يمسح decision='returned' عن سطر المستند
         الأصلي أبداً — البند يبقى "returned" إلى الأبد (المسودة
         التصحيحية مستندٌ منفصل تماماً بنفس lineId، ولا شيء يكتب فوق
         الأصل). كان هذا الفرع يُحسَب من كل مستندٍ approved بصرف النظر
         عن اكتمال تصحيحه — فبعد اعتماد التصحيح واعتماد ١٠٠٠ فعلياً
         (acceptedTotal للتصحيح)، ظلّ الرصيد يعرض ١٠٠٠ «مرتجَع بانتظار
         التصحيح» للأبد. الإصلاح: `correctionPending` على المستند نفسه
         هو العلَم الصحيح (يُصفَّر عند اعتماد تصحيحه، مُثبَت في
         FIXTURES-ACC-B وaz_acc_start_correction) — لا حالة السطر
         الثابتة. مُثبَت: t06 (B16) كان يفشل قبل هذا الإصلاح؛ يمرّ بعده.
         Approving a correction never clears decision='returned' on the
         ORIGINAL document's line — it stays "returned" forever (the
         correction draft is a wholly separate document with the same
         lineId; nothing overwrites the original). This branch counted
         every approved document regardless of whether its correction had
         already landed — so after the correction was approved (its own
         1,000 acceptedTotal), the balance kept showing 1,000 "returned,
         awaiting correction" forever. THE FIX: the document's own
         `correctionPending` flag is the correct signal (cleared when its
         correction is approved — proven in FIXTURES-ACC-B and
         az_acc_start_correction), never the line's frozen decision alone.
         PROVEN: t06 (B16) failed before this fix, passes after. */
      else if (s.status === 'approved' && s.correctionPending && Array.isArray(s.lines)) {
        s.lines.forEach(function (l) { if (l && l.decision === 'returned') returned += num(l.amount); });
      }
    });

    return {
      boxId: boxId, opening: opening, funded: funded, accepted: accepted,
      available: available, pending: pending, reviewedPending: reviewedTotal, returnedTotal: returned
    };
  }

  /* ── كل صناديق العهدة التي يراها هذا المستخدم الآن ──────────────────────── */
  function custodyBoxes() {
    return rows('cashAccounts').filter(function (c) { return c.kind === 'custody' && c.status !== 'inactive'; });
  }

  /* ── نفس نقطة البداية أينما ظهر رصيد أي حساب نقدي (تكامل ١٩ سبتمبر) ──────
     THE SAME STARTING POINT wherever any cash account's balance is shown
     (integrator, 19 Sept)
     -------------------------------------------------------------------------
     boxBalance أعلاه يبدأ من openingDate الحساب دائماً؛ لفّ Dashboard.
     analytics.cashBalance وbuildCashRows أدناه كانا يمرّران حركات العهدة
     كاملةً (أو مقيَّدة بمدى التقرير فقط) بلا أي علمٍ بـopeningDate — فحركة
     تحويلٍ سابقة على تاريخ الفتح المُعلَن كانت تُحسَب هناك ولا تُحسَب هنا،
     رقمان مختلفان لنفس الصندوق. الإصلاح: أخذ "الأخير" (الأحدث) بين
     openingDate والمدى المطلوب كحدٍّ أدنى — نفس ما يفعله boxBalance بالحرف،
     في الأماكن الثلاثة معاً.
     boxBalance above always starts at the account's own openingDate; the
     Dashboard.analytics.cashBalance wrap and buildCashRows below used to
     pass EITHER the full history or only the report's own date range, with
     no knowledge of openingDate at all — so a transfer dated BEFORE the
     declared opening date was counted there and not here, two different
     figures for the same box. THE FIX: take the LATER of openingDate and
     the requested lower bound as the effective floor — exactly what
     boxBalance already does, now in all three places. */
  function clampFromToOpening(boxId, from) {
    var box = rows('cashAccounts').filter(function (c) { return c.id === boxId; })[0];
    var od = box ? box.openingDate : null;
    if (!od) return from || null;
    if (!from || od > from) return od;
    return from;
  }

  /* ── إجمالي المخصَّص لكل مورّد على مستند سند صرف (لكشف المورّد لاحقاً) ───── */
  function supplierOpenInvoices(supplierId) {
    return rows('supplierInvoices').filter(function (i) { return i.supplier === supplierId && i.status === 'approved'; });
  }

  /* ── قوائم مرجعية للكشوف (الشريحة ٣) ─────────────────────────────────────
     REFERENCE LISTS for the statements (slice 3)
     ------------------------------------------------------------------------
     الموردون سجلٌّ واحد على مستوى الشركة كلّها (لا حقل site) — الخطة §٣:
     «never merge by name»؛ يبقى ظاهراً لكل من يفتح كشف المورد، والحركات
     التي تُبنى منها الكشف (فواتير/سندات/تسويات) هي المفلترة بالموقع فعلاً
     عبر Auth.scopeRows قبل وصولها هنا — لا حاجة لتصفية القائمة نفسها.
     Suppliers are ONE company-wide list (no `site` field — plan §3: "never
     merge by name"); it stays visible to whoever opens the supplier
     statement, and the MOVEMENTS the statement is built from (invoices/
     vouchers/settlements) are the ones already site-fenced by
     Auth.scopeRows before they reach here — the list itself needs no
     filtering. */
  function suppliersAll() {
    return rows('suppliers').filter(function (s) { return s.status !== 'inactive'; });
  }
  /* المعدات: sites.js:219 تضعها ضمن SITE_SCOPED فتصل هنا مُقلَّمة بالفعل
     لمحاسبٍ محصور بموقع — سلوكٌ صحيح لكشفٍ (قراءة فقط)، خلافاً لمشكلة
     المُنتقي عند P04 (الخطة §4.3) التي تخصّ إدخال مستندٍ جديد فقط.
     Equipment: sites.js:219 puts it in SITE_SCOPED, so it arrives here
     ALREADY pruned for a site-bound accountant — correct behaviour for a
     read-only STATEMENT, unlike the picker problem in P04 (plan §4.3),
     which is about entering a NEW document only. */
  function equipmentAll() {
    return rows('equipment').filter(function (e) { return e.status !== 'inactive'; });
  }

  /* ── equipmentNames — احتياط الأسماء عبر portal_equipment_names (ACC-B) ──
     equipmentNames — a NAMES-ONLY fallback via portal_equipment_names
     (ACC-B), for the equipment STATEMENT (this file's own job)
     ------------------------------------------------------------------------
     🔴 عطلٌ اكتُشِف بالتشغيل ثم صحَّحه المُنسِّق (فحص t11، ١٩ سبتمبر): لا
     accountant ولا finance_manager يملك أي سياسة SELECT على "equipment"
     — Store.all('equipment') يعيد صفراً دائماً لكليهما، فكان تبويب كشف
     المعدة يعرض «لا توجد معدّات مرئية» بلا أي رقم. desk-cell-picker.js
     يحلّ نفس المشكلة تماماً لمنتقي أسطر التسوية عبر عرضٍ للقراءة فقط —
     portal_equipment_names(id, code, name, plateNo, status) — يعمل
     بصلاحيات مالكه (security_invoker=false) فيتجاوز غياب السياسة، ومُتاحٌ
     لكل authenticated. نفس النمط هنا بالحرف، لا نسخة ثانية من المنطق:
     REST مباشر (Auth.client()) حين تكون Store.all('equipment') فارغة
     فقط — دورٌ يملك صلاحية حقيقية (site_engineer مثلاً) يرى قائمته
     العادية دون أي تغيير. المبالغ نفسها لا تُقرأ من هنا إطلاقاً — تبقى
     من أسطر التسوية والفواتير التي يراها المستخدم فعلاً (equipmentCost
     أعلاه)؛ هذا الاحتياط للأسماء فقط، تماماً كما طلب المُنسِّق.
     A REAL bug found by running it, then corrected by the coordinator
     (t11 check, 19 Sept): neither accountant nor finance_manager holds
     any SELECT policy on "equipment" — Store.all('equipment') always
     returns zero for either, so the equipment statement showed "no
     equipment visible" with no figure at all. desk-cell-picker.js solves
     the EXACT same problem for the settlement-line picker via a
     READ-ONLY view — portal_equipment_names(id, code, name, plateNo,
     status) — running with its OWNER's privileges (security_invoker=
     false), so it bypasses the missing policy, and is granted to every
     authenticated user. The SAME pattern here, verbatim, not a second
     copy of the logic: a direct REST call (Auth.client()) ONLY when
     Store.all('equipment') is empty — a role with genuine access (a site
     engineer, say) still sees its normal list, unchanged. The AMOUNTS
     are never read from here at all — they still come only from the
     settlement lines and invoices the user may already see
     (equipmentCost above); this fallback is names only, exactly as the
     coordinator asked. */
  var equipmentNamesPromise = null;
  function equipmentNames() {
    var local = equipmentAll();
    if (local.length) return Promise.resolve(local);
    if (equipmentNamesPromise) return equipmentNamesPromise;
    equipmentNamesPromise = (function () {
      try {
        if (!global.Auth || typeof Auth.client !== 'function') return Promise.resolve([]);
        var client = Auth.client();
        if (!client) return Promise.resolve([]);
        return client.from('portal_equipment_names').select('*').then(function (r) {
          if (r.error) { console.warn('[desk-ledgers.js] portal_equipment_names read failed — equipment statement stays empty for this role:', r.error.message); return []; }
          return (r.data || []).filter(function (e) { return e.status !== 'inactive'; });
        }).catch(function () { return []; });
      } catch (e) { return Promise.resolve([]); }
    })();
    return equipmentNamesPromise;
  }

  /* ── القاعدة الوحيدة لـ"إجمالي الفاتورة" — العقد، السطر ١٦ ────────────────
     THE ONE "invoice total" RULE — contract line 16
     ------------------------------------------------------------------------
     grandTotal حين موجود (يشمل الضريبة والحسم)، وإلا subTotal. تُستعمَل هنا
     في invoiceOpen وinvoiceOpen ذاتها، وفي حركات كشف المورّد أدناه — رقمٌ
     واحدٌ محسوبٌ في مكانٍ واحد، لا نسخٌ متفرّقة قد تختلف.
     grandTotal when present (includes tax and withholding), else subTotal.
     Used here in invoiceOpen and again in the supplier-ledger movements
     below — ONE figure computed in ONE place, never separate copies that
     could disagree. */
  function invoiceBase(inv) {
    if (!inv) return 0;
    return (inv.grandTotal !== null && inv.grandTotal !== undefined && inv.grandTotal !== '')
      ? num(inv.grandTotal) : num(inv.subTotal);
  }
  function isReversedRow(r) {
    return !!(r && (r.status === 'reversed' || r.isReversal === true));
  }
  /* ── قيدٌ تلقائي كتبه P12؟ — نفس علامة books-journal-source.js بالحرف ──────
     AN AUTO ENTRY P12 WROTE? — the EXACT SAME marker as books-journal-
     source.js's own autoKind() (books-journal-source.js, the automatic-
     books browser file, lines 79-87), not a second invented signal.
     -------------------------------------------------------------------------
     🔴 عطلٌ حقيقي وُجد بالتشغيل (v01، ١٩ سبتمبر) — كشف المصروف كان يجمع كل
     سطر يومية معتمد بلا تمييز، فبعد ترحيل تسوية عهدة (١,٠٠٠ وقود) يكتب
     P12 قيداً تلقائياً بنفس المبلغ فوق نفس بند التكلفة — فيراه المستخدم
     ٢,٠٠٠ (المستند + قيده الخاص) بدل ١,٠٠٠. الإصلاح: نفس ما يفحصه
     books-journal-source.js — `trail` يحمل `{action:'p12-auto'}` أو
     `{action:'p12-reversal'}` (az_p12_book يكتبها، الملف 88 · 88-BOOKS-FOR-CUSTODY-AND-SUPPLIERS.sql
     نحو السطر ٤٨١-٤٨٣). حين تصل الوثيقة من REST بلا `trail` كاملاً (شكلٌ
     أضيق زُرِع في تجربة الصائد نفسها)، `notes` تحمل نفس الشكل الحرفي الذي
     يكتبه az_p12_book — `'P12 · ' || table || ' · ' || id` — فحصٌ ثانٍ لا
     يُخترَع، بل نفس النصّ الذي تكتبه القاعدة بالفعل (الملف 88، السطر ٤٨١).
     🔴 A REAL DEFECT found by running it (v01, 19 Sept) — the expense
     statement summed EVERY approved journal line with no distinction, so
     after a custody settlement (1,000 fuel) posts, P12 writes its OWN
     auto entry for the SAME amount against the SAME cost item — the user
     saw 2,000 (the document + its own entry) instead of 1,000. THE FIX:
     the exact same check books-journal-source.js already uses — `trail`
     carries `{action:'p12-auto'}` or `{action:'p12-reversal'}` (az_p12_book
     writes it, file 88 · 88-BOOKS-FOR-CUSTODY-AND-SUPPLIERS.sql around line 481-483). When a
     document arrives from REST without a full `trail` (a narrower shape
     planted by the hunter's own trial), `notes` carries the EXACT literal
     shape az_p12_book itself writes — `'P12 · ' || table || ' · ' || id`
     — a second check, not an invented one: the very text the database
     already writes (line 428). */
  function isAutoP12Journal(j) {
    if (!j) return false;
    var tr = Array.isArray(j.trail) ? j.trail : [];
    for (var i = 0; i < tr.length; i++) {
      if (tr[i] && (tr[i].action === 'p12-auto' || tr[i].action === 'p12-reversal')) return true;
    }
    return typeof j.notes === 'string' && /^P12\s*·/.test(j.notes);
  }
  function inDateRange(d, from, to) {
    if (!d) return true;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  }
  /* مطابقة inRange في pages/reports.js تماماً (مقارنة Date حقيقية، لا نصّية)
     — يحتاجها لفّ «ap»/«cash» أدناه ليتّفق مع نفس مدى التقرير الأصلي بالحرف.
     Matches pages/reports.js's own inRange EXACTLY (a real Date compare,
     not a string one) — needed by the "ap"/"cash" wrap below so it agrees
     with the native report's own range, to the letter. */
  function inRangeDate(d, from, to) {
    if (!d) return true;
    var x = new Date(d);
    if (from && x < new Date(from)) return false;
    if (to && x > new Date(to + 'T23:59:59')) return false;
    return true;
  }

  /* ── invoiceOpen — تعريفٌ واحد، هنا وفي az_acc_invoice_open على القاعدة ──
     invoiceOpen — ONE definition, here AND in az_acc_invoice_open on the
     database (DATA CONTRACT, 19 Sept 12:0x)
     ------------------------------------------------------------------------
     ✅ إشعارات الدائن (kind='credit') وربطها بفاتورةٍ بعينها: كان هذا
     استدلالاً مني (العقد لا يسمّي حقلاً صريحاً)، وتَحقَّق بالحرف بقراءة
     الملف 89:355-363 (az_acc_invoice_open_unchecked) نفسها بعد وصولها — نفس az_acc_
     invoice_open على القاعدة تقرأ "lines" LINKS بالشكل ذاته
     ([{lineId, linkedDoc, linkedAmount}], kind='credit', linkedDoc =
     الفاتورة المُخصَّصة له) — فالسطر أدناه مطابقٌ للدالة على القاعدة حرفاً
     بحرف، لا تخمين.
     ✅ Credit notes (kind='credit') and their link to ONE specific invoice:
     this WAS my own inference (the contract names no explicit field), and
     it has since been VERIFIED by reading file 89:355-363 (az_acc_invoice_open_unchecked)
     itself once it landed — the database's own az_acc_invoice_open reads
     the SAME "lines" LINKS shape ([{lineId, linkedDoc, linkedAmount}],
     kind='credit', linkedDoc = the invoice it credits) — the line below
     matches the database function to the letter, not a guess. */
  /* ── settlesSupplierInvoices — الشرط الذي تطبّقه القاعدة على كل تخصيص ────
     settlesSupplierInvoices — the condition the DATABASE applies to EVERY
     allocation
     ------------------------------------------------------------------------
     الملف ٨٩:٣٢٦-٣٤١ يشترط payeeType='supplier' على فرعَي التخصيص معاً
     (سطور lines، والرابط القديم المفرد supplierInvoice)، وهذا الملف لم يكن
     يشترطه في أيّ موضع — فسند صرف بنوع مستفيد «مصروف» يحمل رابطاً لفاتورة
     مورّد (والشاشة الحيّة تعرض حقلَي المورّد والفاتورة لكل أنواع المستفيدين،
     schema.js:358-359) كان يُغلق الفاتورة على الشاشة وحدها. قاسه مُدقِّق
     Fable على الحزمة v2.0.38 (٢٠ سبتمبر): القاعدة ٦٠٠٫٠٠ مقابل الشاشة ٤٠٠
     لنفس الفاتورة ونفس الصفوف — رقمان لنفس الفاتورة، أي «الخطر ٣» نفسه.
     وأُعيد إنتاجه هنا من الأبواب الحقيقية في متصفّحٍ حقيقي (t11 فحص I6:
     القاعدة ٥٬٠٠٠ مقابل الشاشة ٣٬٠٠٠) قبل هذا السطر، وبعده يتطابقان.
     تعريفٌ واحد يستعمله كل من يحسب تخصيصاً في هذا الملف (invoiceOpen،
     supplierLedger، تقرير «أعمار ديون الموردين») — لا ثلاث نسخٍ تفترق
     لاحقاً.
     File 89:326-341 requires payeeType='supplier' on BOTH allocation
     branches (the "lines" array AND the legacy single "supplierInvoice"
     link); this file required it nowhere — so a voucher whose payee type
     is "expense" carrying a link to a supplier invoice (and the live form
     shows the supplier + invoice fields for EVERY payee type,
     schema.js:358-359) closed that invoice ON SCREEN ONLY. Measured by
     the Fable integrator on package v2.0.38 (20 Sept): database 600.00
     against screen 400 for the same invoice on the same rows — two
     numbers for one invoice, which is danger 3 itself. Reproduced here
     through the REAL doors in a REAL browser (t11 check I6: database
     5,000 against screen 3,000) before this line existed; after it they
     agree. ONE definition used by everything in this file that computes
     an allocation (invoiceOpen, supplierLedger, the "supplier ageing"
     report) — never three copies that drift apart later. */
  function settlesSupplierInvoices(p) { return !!p && p.payeeType === 'supplier'; }

  function invoiceOpen(invoiceId) {
    var inv = rows('supplierInvoices').filter(function (i) { return i.id === invoiceId; })[0];
    if (!inv) return 0;
    var base = invoiceBase(inv);

    var allocated = 0;
    rows('payments').forEach(function (p) {
      if (p.status !== 'approved' || isReversedRow(p)) return;
      /* نفس شرط القاعدة حرفاً بحرف (٨٩:٣٢٦-٣٤١) · the database's own condition, verbatim (89:326-341) */
      if (!settlesSupplierInvoices(p)) return;
      if (Array.isArray(p.lines) && p.lines.length) {
        p.lines.forEach(function (l) { if (l && l.invoice === invoiceId) allocated += num(l.amount); });
      } else if (p.supplierInvoice === invoiceId) {
        /* الرابط القديم أحادي المستند — يُحسَب تخصيصاً كاملاً لقيمة السند،
           فقط حين لا يملك السند "lines" على الإطلاق (توافق قديم، العقد ١٦).
           The legacy single-document link — counted as a FULL allocation
           of the voucher's amount, ONLY when the voucher has no "lines" at
           all (back-compat, contract line 16). */
        allocated += num(p.amount);
      }
    });

    var settled = 0;
    rows('custodySettlements').forEach(function (s) {
      if (s.status !== 'approved' || isReversedRow(s)) return; /* مطابقة az_acc_invoice_open بالحرف (الملف 89:355-363) · matches az_acc_invoice_open verbatim (file 89:355-363) */
      (s.lines || []).forEach(function (l) {
        if (l && l.decision === 'accepted' && l.supplierInvoice === invoiceId) settled += num(l.amount);
      });
    });

    var credited = 0;
    rows('supplierInvoices').forEach(function (c) {
      if (c.kind !== 'credit' || c.status !== 'approved' || isReversedRow(c)) return;
      (c.lines || []).forEach(function (l) { if (l && l.linkedDoc === invoiceId) credited += num(l.linkedAmount); });
    });

    return base - allocated - settled - credited;
  }

  /* ── supplierLedger — مصدر كشف حساب المورّد (الخطة §٧، العقد سطر ١٨) ──────
     supplierLedger — the source for the supplier statement (plan §7,
     contract line 18)
     ------------------------------------------------------------------------
     siteFilter اختياري: يُستعمَل فقط حين يختار محاسبٌ مركزي موقعاً بعينه من
     شاشة الكشف — لا علاقة له بسياج المحاسب المحصور بموقع، فذلك مضمونٌ سلفاً
     لأن كل الجداول المصدرية (فواتير/سندات/تسويات) تصل هنا مُقلَّمة فعلاً عبر
     Auth.scopeRows (تعليق رأس الملف). قائمة الموردين نفسها ليست موقعية.
     siteFilter is OPTIONAL: used only when a CENTRAL accountant picks one
     site from the statement screen — it has nothing to do with a
     site-bound accountant's own fence, which is already guaranteed because
     every source table (invoices/vouchers/settlements) arrives here
     already pruned by Auth.scopeRows (file-header comment). The supplier
     list itself is not site-scoped. */
  function siteOk(r, siteFilter) { return !siteFilter || r.site === siteFilter; }

  /* ── includeCompanyOpening — الرصيد الافتتاحي شركةٌ كاملة، لا موقعاً ─────
     includeCompanyOpening — the opening balance is COMPANY-WIDE, never
     per-site (contract line 18: suppliers carry no "site" field at all)
     -------------------------------------------------------------------------
     🔴 عطلٌ حقيقي اشتُبِه به بالتشغيل، ثم تحقَّقتُ منه بقراءة الحقل نفسه —
     محاسبٌ محصورٌ بموقع (كشفٌ «جزئي»، حركاته فقط) كان يرى الرصيد
     الافتتاحي الكامل للشركة مضافاً فوق حركات موقعه هو وحده — خليطٌ لا معنى
     له (لا رقمٌ صحيحٌ لأي شيء). الوسيط الخامس (اختياريّ، الافتراضي true =
     السلوك القديم بالحرف لكل مستدعٍ لا يمرّره) يسمح لِـdesk-statements.js
     بإسقاطه إلى false فقط حين يكون العارض محاسباً محصوراً بموقع —
     desk-statements.js أيضاً يضيف عندها «بلا رصيد افتتاحي للشركة» لنفس
     البادج.
     🔴 A REAL DEFECT suspected while running it, then CONFIRMED by reading
     the field itself — a site-bound accountant (a "partial" statement,
     their own site's movements only) was seeing the FULL company-wide
     opening balance added on top of only their own site's movements — a
     meaningless mixture (not a correct number for anything). The fifth,
     OPTIONAL argument (default true = the old behaviour verbatim for
     every caller that omits it) lets desk-statements.js drop it to false
     ONLY when the viewer is a site-bound accountant — desk-statements.js
     also adds "بلا رصيد افتتاحي للشركة" (no company-wide opening) to the
     same badge then. */
  function supplierLedger(supplierId, from, to, siteFilter, includeCompanyOpening) {
    var supplier = rows('suppliers').filter(function (s) { return s.id === supplierId; })[0];
    var openingBalance = (supplier && includeCompanyOpening !== false) ? num(supplier.openingBalance) : 0;
    var openingDate = supplier ? supplier.openingDate : null;
    var movements = [];

    rows('supplierInvoices').forEach(function (inv) {
      if (inv.supplier !== supplierId || inv.status !== 'approved' || isReversedRow(inv)) return;
      if (!siteOk(inv, siteFilter)) return;
      var amt = invoiceBase(inv);
      if (inv.kind === 'credit') {
        movements.push({ date: inv.date, docNo: inv.docNo, kind: 'credit', moduleId: 'supplierInvoices', id: inv.id,
          label: { ar: 'إشعار دائن', en: 'Credit note' }, amount: -amt });
      } else {
        /* subTotal/grandTotal لمستخلصٍ هو "الشغل الجديد" فعلاً (العقد ١٣) —
           فمستخلص إجمالي (summary، subTotal=صفر) يضيف صفراً بلا استثناء خاص.
           A certificate's subTotal/grandTotal already IS the "new work"
           amount (contract line 13) — a summary certificate (subTotal=0)
           adds zero with no special case. */
        movements.push({ date: inv.date, docNo: inv.docNo, kind: inv.kind || 'invoice', moduleId: 'supplierInvoices', id: inv.id,
          label: { ar: inv.kind === 'certificate' ? 'مستخلص' : 'فاتورة', en: inv.kind === 'certificate' ? 'Certificate' : 'Invoice' },
          amount: amt });
      }
    });

    var advances = [];
    rows('payments').forEach(function (p) {
      if (p.supplier !== supplierId || p.status !== 'approved' || isReversedRow(p)) return;
      if (!siteOk(p, siteFilter)) return;
      /* التخصيص وحده يخضع لشرط القاعدة (settlesSupplierInvoices) — سند بنوع
         مستفيد غير «مورّد» لا يُحسَب تخصيصه أبداً، فيظهر كاملاً في «دفعات غير
         مخصَّصة» (عرضٌ فقط). حركة السند نفسها أدناه لم تُمَسّ عمداً: قاعدتها
         حكم المنسّق ١٩ سبتمبر (البند ٩) «الرصيد يتحرّك بتاريخ كل سند صرف»،
         ولا توأم لها على القاعدة يُقاس عليه — وتغييرها قرارٌ يخصّ المالك لا
         هذا الإصلاح.
         The ALLOCATION alone takes the database's condition
         (settlesSupplierInvoices) — a voucher whose payee type is not
         "supplier" never counts as allocated, so it shows in full under
         "unallocated advances" (display only). The voucher's own MOVEMENT
         below is deliberately untouched: its rule is the coordinator's
         19 Sept ruling (item 9) "the balance moves on each voucher's own
         date", it has no database twin to measure against, and changing
         it is the owner's decision, not this fix's. */
      var allocated = 0;
      if (!settlesSupplierInvoices(p)) {
        allocated = 0;
      } else if (Array.isArray(p.lines) && p.lines.length) {
        p.lines.forEach(function (l) { allocated += num(l.amount); });
      } else if (p.supplierInvoice) {
        allocated = num(p.amount);
      }
      /* 🔴 قرارٌ جديد يُلغي القرار السابق هنا حرفياً (المُنسِّق، ١٩ سبتمبر،
         البند ٩) — إثباتٌ بالتشغيل (b01 checks 1/1b) لا مجرّد تفضيل:
         «رصيد المورّد يتحرّك بتاريخ كل سند صرف نفسه سواء خُصِّص أم لا؛
         التخصيص لا يطابق إلا البنود المفتوحة». القرار القديم (تعليقه محذوفٌ
         هنا عمداً بدل تركه مضلِّلاً) كان يطرح المخصَّص فقط، فيترك عهدةً
         غير مخصَّصة كاملة القيمة خارج الرصيد — فكان كشفٌ لِـ١–١٠ سبتمبر
         مطبوعاً قبل تخصيصٍ لاحق (az_acc_allocate) يتغيّر بعده رجعياً، رغم
         أن لا فَلْساً تحرّك فعلياً في ذلك التاريخ (b01 check 1، عطلٌ مُثبَت
         بالتشغيل). الإصلاح: نطرح قيمة السند الكاملة دائماً بتاريخه هو —
         التخصيص (الآن أو لاحقاً) لا يغيّر لا القيمة ولا التاريخ، فلا يُغيِّر
         كشفاً سابقاً أبداً. قائمة «دفعات غير مخصَّصة» أدناه تبقى للعرض فقط
         (العقد لا يزال يطلب إدراجها)، بلا أي أثر إضافي على الرصيد — فلا
         ازدواج.
         🔴 A NEW decision that LITERALLY REVERSES the one that used to sit
         here (coordinator, 19 Sept, item 9) — proven by running it (b01
         checks 1/1b), not a mere preference: "a supplier's balance moves
         on each payment's OWN date whether or not it is allocated;
         allocation only matches open items." The OLD decision (its comment
         deliberately removed here rather than left to mislead) subtracted
         only the ALLOCATED portion, leaving a fully-unallocated advance
         entirely outside the balance — so a statement for 1–10 Sept
         printed BEFORE a later allocation (az_acc_allocate) changed
         RETROACTIVELY after it, even though no cash moved on that later
         date at all (b01 check 1, proven by running it). THE FIX: always
         subtract the payment's FULL amount, on its OWN date — allocating
         it (now or later) changes neither the amount nor the date, so a
         past statement never changes. The "unallocated advances" list
         below stays for DISPLAY only (the contract still asks for it
         listed), with no further effect on the balance — no double
         count. */
      var full = num(p.amount);
      if (full > 0.004) {
        movements.push({ date: p.date, docNo: p.docNo, kind: 'payment', moduleId: 'payments', id: p.id,
          label: { ar: allocated > 0.004 ? 'سند صرف — مخصَّص لفاتورة' : 'سند صرف', en: allocated > 0.004 ? 'Payment — allocated to invoice' : 'Payment' }, amount: -full });
      }
      var remainder = full - allocated;
      if (remainder > 0.004) {
        advances.push({ id: p.id, docNo: p.docNo, date: p.date, amount: remainder });
      }
    });

    rows('custodySettlements').forEach(function (s) {
      if (s.status !== 'approved' || isReversedRow(s)) return;
      if (!siteOk(s, siteFilter)) return;
      (s.lines || []).forEach(function (l) {
        if (!l || l.decision !== 'accepted' || l.supplier !== supplierId || !l.supplierInvoice) return;
        movements.push({ date: l.lineDate || s.date, docNo: s.docNo, kind: 'settlement-line', moduleId: 'custodySettlements', id: s.id,
          label: { ar: 'تسوية عهدة — سداد فاتورة', en: 'Custody settlement — invoice payment' }, amount: -num(l.amount) });
      });
    });

    movements.sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

    /* الرصيد الافتتاحي عند «من»: openingBalance + كل حركة قبل «من» وبعد/عند
       openingDate — نفس قاعدة الفتح بتاريخ المستخدمة في boxBalance أعلاه
       (نمط P12، pass-7). Opening at "from": openingBalance + every movement
       before "from" and on/after openingDate — the SAME dated-opening rule
       used in boxBalance above (the P12 pattern, pass-7 fix). */
    var opening = openingBalance;
    movements.forEach(function (m) {
      if (openingDate && m.date && m.date < openingDate) return; /* قبل الفتح — في بابل · before opening — in Babel */
      if (from && m.date && m.date < from) opening += m.amount;
    });

    var rowsInRange = movements.filter(function (m) {
      if (openingDate && m.date && m.date < openingDate) return false;
      return inDateRange(m.date, from, to);
    });
    var closing = opening;
    rowsInRange.forEach(function (m) { closing += m.amount; });

    var openInvoices = rows('supplierInvoices').filter(function (inv) {
      return inv.supplier === supplierId && inv.status === 'approved' && !isReversedRow(inv) &&
        inv.kind !== 'credit' && siteOk(inv, siteFilter);
    }).map(function (inv) {
      return { id: inv.id, docNo: inv.docNo, date: inv.date, kind: inv.kind || 'invoice', total: invoiceBase(inv), open: invoiceOpen(inv.id) };
    });

    return { opening: opening, rows: rowsInRange, closing: closing, openInvoices: openInvoices, unallocatedAdvances: advances };
  }

  /* ── equipmentCost — مصدر كشف المعدة (الخطة §٧) ───────────────────────────
     equipmentCost — the source for the equipment statement (plan §7)
     ------------------------------------------------------------------------
     مصدران فقط، ولا ازدواج بينهما: أسطر تسوية عهدة مقبولة بحقل equipment،
     وفواتير موردين معتمدة بحقل equipment (غير إشعارات الدائن) — كلٌّ منها
     مستندٌ واحد يُحسب مرة. equipmentLogs مصدرٌ ثالثٌ منفصلٌ تماماً — تشغيلي
     لا محاسبي — يُعاد كما هو دون تجميع (العقد سطر ١٨).
     TWO sources only, never overlapping: ACCEPTED custody-settlement lines
     carrying `equipment`, and APPROVED supplier invoices carrying
     `equipment` (never credit notes) — each is one document counted once.
     equipmentLogs is a wholly separate THIRD source — operational, not
     accounting — returned as-is, never summed in (contract line 18). */
  function equipmentCost(equipmentId, from, to, siteFilter) {
    var yearStart = ((to || from || new Date().toISOString().slice(0, 10))).slice(0, 4) + '-01-01';
    var costItems = rows('costItems');
    function labelOf(id) { var c = costItems.filter(function (x) { return x.id === id; })[0]; return c ? c.name : null; }
    var map = {};
    function add(key, label, amt, d) {
      if (!map[key]) map[key] = { key: key, label: label, period: 0, ytd: 0 };
      if (d && d >= yearStart && inDateRange(d, null, to)) map[key].ytd += amt;
      if (inDateRange(d, from, to)) map[key].period += amt;
    }
    rows('custodySettlements').forEach(function (s) {
      if (s.status !== 'approved' || isReversedRow(s) || !siteOk(s, siteFilter)) return;
      (s.lines || []).forEach(function (l) {
        if (!l || l.decision !== 'accepted' || l.equipment !== equipmentId) return;
        /* 🔴 مُصلَح (تكامل ١٩ سبتمبر) — سطرٌ يسمّي supplierInvoice هو سدادٌ
           لتلك الفاتورة، لا تكلفةً جديدة (نفس قرار الازدواج على قاعدة
           البيانات) — الفاتورة نفسها تحمل التكلفة مرّة واحدة في الحلقة
           التالية. كان هذا السطر يُضاف هنا فوق فاتورةٍ ٢,٠٠٠ مدفوعة بالكامل
           من العهدة، فيُنتج ٤,٠٠٠ بدل ٢,٠٠٠ (مُثبَت بالتشغيل، b01 check 2a).
           🔴 FIXED (integrator, 19 Sept) — a line naming supplierInvoice is
           a PAYMENT of that invoice, not a new cost (same decision as the
           database side) — the invoice itself carries the cost once, in
           the next loop. This line used to be added here ON TOP of a
           2,000 invoice paid in full from custody, producing 4,000 instead
           of 2,000 (proven by running it, b01 check 2a). */
        if (l.supplierInvoice) return;
        add(l.costItem || '__none', labelOf(l.costItem), num(l.amount), l.lineDate || s.date);
      });
    });
    rows('supplierInvoices').forEach(function (inv) {
      if (inv.status !== 'approved' || isReversedRow(inv) || inv.kind === 'credit' || inv.equipment !== equipmentId) return;
      if (!siteOk(inv, siteFilter)) return;
      add(inv.costItem || '__none', labelOf(inv.costItem), invoiceBase(inv), inv.date);
    });
    var purposes = Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.period - a.period; });

    var logs = rows('equipmentLogs').filter(function (l) { return l.equipment === equipmentId && inDateRange(l.date, from, to); })
      .map(function (l) { return { date: l.date, desc: l.description, hours: num(l.hours), litres: num(l.fuelLitres), cost: num(l.cost) }; })
      .sort(function (a, b) { return (a.date || '').localeCompare(b.date || ''); });

    return { purposes: purposes, logs: logs };
  }

  /* ── expenseByGroup — مصدر كشف المصروف حسب البند/الحساب (الخطة §٧) ───────
     expenseByGroup — the source for the "expense by cost item/account"
     statement (plan §7)
     ------------------------------------------------------------------------
     أربعة مصادر، كلٌّ منها مستندٌ يُحسب مرة واحدة فقط: أسطر تسوية مقبولة،
     سندات صرف مصروفٍ مباشر، فواتير موردين معتمدة **بلا** إذن استلام مرتبط
     (لا ازدواج مع المخازن — العقد سطر ١٨)، وأسطر يومية يدوية.
     ⚠️ التجميع حسب "الحساب": فقط أسطر التسوية واليومية تحمل حقل "account"
     حقيقياً؛ سندات الصرف والفواتير تُصنَّف بـ"بند التكلفة" فقط في هذا
     البناء، فتقع تحت "__none" عند التجميع بالحساب — حقيقةٌ في شكل البيانات
     نفسها، لا تقصيرٌ هنا، ومُعلَنة صراحةً في الشاشة (لا رقمٌ يُخمَّن).
     FOUR sources, each a document counted exactly once: accepted
     settlement lines, direct-expense payment vouchers, approved supplier
     invoices with **no** linked goods receipt (no double with stores —
     contract line 18), and manual journal lines.
     ⚠️ Grouping by "account": only settlement lines and journal lines
     genuinely carry an "account" field; payment vouchers and invoices are
     classified by "cost item" only in this build, so they fall under
     "__none" when grouped by account — a fact about the data shape
     itself, not a shortcut taken here, and stated plainly on screen (never
     a guessed number). */
  function expenseByGroup(groupBy, from, to, siteFilter) {
    var costItems = rows('costItems'), accounts = rows('accounts');
    function costLabel(id) { var c = costItems.filter(function (x) { return x.id === id; })[0]; return c ? c.name : null; }
    function accountLabel(id) { var a = accounts.filter(function (x) { return x.id === id; })[0]; return a ? a.name : null; }
    var yearStart = ((to || from || new Date().toISOString().slice(0, 10))).slice(0, 4) + '-01-01';
    var map = {};
    function add(key, label, amt, d) {
      if (!amt) return;
      if (!map[key]) map[key] = { key: key, label: label, period: 0, ytd: 0 };
      if (d && d >= yearStart && inDateRange(d, null, to)) map[key].ytd += amt;
      if (inDateRange(d, from, to)) map[key].period += amt;
    }
    function keyOf(costItemId, accountId) {
      return (groupBy === 'account')
        ? { key: accountId || '__none', label: accountId ? accountLabel(accountId) : null }
        : { key: costItemId || '__none', label: costItemId ? costLabel(costItemId) : null };
    }

    rows('custodySettlements').forEach(function (s) {
      if (s.status !== 'approved' || isReversedRow(s) || !siteOk(s, siteFilter)) return;
      (s.lines || []).forEach(function (l) {
        if (!l || l.decision !== 'accepted') return;
        /* 🔴 مُصلَح (تكامل ١٩ سبتمبر) — نفس إصلاح equipmentCost أعلاه بالحرف:
           سطرٌ يسمّي supplierInvoice سدادٌ لفاتورة، لا مصروفاً جديداً —
           الفاتورة تحمل التكلفة مرّة واحدة في حلقة supplierInvoices أدناه.
           🔴 FIXED (integrator, 19 Sept) — verbatim the same fix as
           equipmentCost above: a line naming supplierInvoice is a PAYMENT
           of an invoice, not a new expense — the invoice carries the cost
           once, in the supplierInvoices loop below. */
        if (l.supplierInvoice) return;
        var kl = keyOf(l.costItem, l.account);
        add(kl.key, kl.label, num(l.amount), l.lineDate || s.date);
      });
    });
    rows('payments').forEach(function (p) {
      if (p.status !== 'approved' || isReversedRow(p) || p.payeeType !== 'expense' || !siteOk(p, siteFilter)) return;
      var kl = keyOf(p.costItem, null);
      add(kl.key, kl.label, num(p.amount), p.date);
    });
    rows('supplierInvoices').forEach(function (inv) {
      if (inv.status !== 'approved' || isReversedRow(inv) || inv.kind === 'credit' || !siteOk(inv, siteFilter)) return;
      if (inv.goodsReceipt) return; /* لا ازدواج مع المخازن · no double with stores */
      var kl = keyOf(inv.costItem, null);
      add(kl.key, kl.label, invoiceBase(inv), inv.date);
    });
    /* 🔴 مُصلَح (v01، ١٩ سبتمبر) — قيدٌ تلقائيٌّ كتبه P12 فوق مستندٍ سبق
       عدّه في إحدى الحلقات أعلاه (تسوية/سند صرف/فاتورة) يُضاعِف الرقم —
       يُستبعَد هنا بعلامة P12 نفسها (isAutoP12Journal)؛ القيود اليدوية
       وحدها تُحسَب من هذا المصدر. الأساس «قيود مرحّلة» (توأمة كاملة مع
       الدفاتر) مبدّلٌ منفصلٌ لم يُبنَ لهذا التبويب بعد (تعليق desk-
       statements.js).
       🔴 FIXED (v01, 19 Sept) — an AUTOMATIC entry P12 wrote on top of a
       document already counted in a loop above (settlement/voucher/
       invoice) doubles the figure — excluded here by P12's OWN marker
       (isAutoP12Journal); only MANUAL journal entries are counted from
       this source. The "posted entries" (full books) basis is a separate
       toggle not built for this tab yet (desk-statements.js comment). */
    rows('journal').forEach(function (j) {
      if (j.status !== 'approved' || !siteOk(j, siteFilter) || isAutoP12Journal(j)) return;
      (j.lines || []).forEach(function (l) {
        var amt = num(l.debit) - num(l.credit);
        var kl = keyOf(null, l.account);
        add(kl.key, kl.label, amt, j.date);
      });
    });

    return Object.keys(map).map(function (k) { return map[k]; }).sort(function (a, b) { return b.period - a.period; });
  }

  global.DeskLedgers = {
    movementsForBox: movementsForBox,
    boxBalance: boxBalance,
    custodyBoxes: custodyBoxes,
    supplierOpenInvoices: supplierOpenInvoices,
    suppliers: suppliersAll,
    equipment: equipmentAll,
    equipmentNames: equipmentNames,
    invoiceOpen: invoiceOpen,
    supplierLedger: supplierLedger,
    equipmentCost: equipmentCost,
    expenseByGroup: expenseByGroup,
    invoiceBase: invoiceBase,
    isReversedRow: isReversedRow,
    inRangeDate: inRangeDate
  };

  /* ── لفّ Dashboard.analytics.cashBalance («الخطر ٢») ─────────────────────
     WRAP Dashboard.analytics.cashBalance (integrator "danger 2")
     ------------------------------------------------------------------------
     dashboard.js:129-135 يحسب أي حساب نقدي بـ openingBalance + إيصالات −
     مدفوعات فقط — بلا أي علم بـ«تحويل نقدية». نضيف هنا صافي حركات هذا
     الحساب من movementsForBox (نفس الدالة التي يبني منها boxBalance)
     فوق حساب dashboard.js الأصلي، لا بدلاً منه: الحسابات العادية
     (إيصالات/مدفوعات) لا تملك حركات تحويل عادةً فتزيد بصفر، وصندوق العهدة
     لا يملك إيصالات/مدفوعات أصلاً (يمنعه az_acc_no_custody_as_payment_
     account) فيبقى حساب dashboard.js له = openingBalance وحده، وبإضافة
     الحركات يصبح مطابقاً تماماً لـ boxBalance(id).available. Auth.canSee/
     A().cashBalance يُستدعيان ديناميكياً وقت العرض (alerts.js:41,
     dashboard-render.js:52) لا مرّة واحدة عند التحميل — فكل قارئ لاحق
     يرى اللفّة فوراً.
     dashboard.js:129-135 computes ANY cash account as openingBalance +
     receipts − payments only, with no knowledge of "custody transfer" at
     all. Here we add this account's net movements from movementsForBox
     (the same function boxBalance is built from) ON TOP of dashboard.js's
     own computation, never replacing it: ordinary accounts (receipts/
     payments) normally carry no transfer movements at all, so this adds
     zero for them; a custody box carries no receipts/payments to begin
     with (az_acc_no_custody_as_payment_account forbids it), so
     dashboard.js's own figure for it is openingBalance alone, and adding
     the movements makes it exactly equal boxBalance(id).available.
     A().cashBalance is looked up FRESH at render/alert time
     (alerts.js:41, dashboard-render.js:52), never cached at load time, so
     every later reader sees this wrap immediately. */
  (function wrapDashboardCashBalance() {
    if (!global.Dashboard || !Dashboard.analytics || typeof Dashboard.analytics.cashBalance !== 'function') {
      console.error('desk-ledgers.js: Dashboard.analytics.cashBalance not found — home KPI/alert cash figures ' +
        'will NOT include custody transfers (today\'s pre-existing gap, not a new failure).');
      return;
    }
    if (Dashboard.analytics.__deskLedgersWrapped) return;
    Dashboard.analytics.__deskLedgersWrapped = true;
    var origCashBalance = Dashboard.analytics.cashBalance;
    Dashboard.analytics.cashBalance = function (accId) {
      var base = origCashBalance(accId);
      var adj = 0;
      /* بداية موحّدة مع boxBalance — انظر تعليق clampFromToOpening أعلاه ·
         SAME starting point as boxBalance — see clampFromToOpening's
         comment above. */
      movementsForBox(accId, clampFromToOpening(accId, null), null).forEach(function (m) { adj += m.amount; });
      return base + adj;
    };
  })();

  /* ── لفّ MoneyOwed.paidOf («الخطر ٣») ────────────────────────────────────
     WRAP MoneyOwed.paidOf ("danger 3")
     ------------------------------------------------------------------------
     money-owed.js:paidOf(invoiceId) يجمع فقط payments.amount المرتبطة
     بـ "supplierInvoice" (الرابط القديم أحادي المستند) — بلا أي علم بتخصيص
     "lines" الجديد، ولا بسداد فاتورةٍ من داخل تسوية عهدة، ولا بإشعار دائن.
     فبعد سداد ١٠,٠٠٠ من فاتورة ٥٠,٠٠٠ عبر العهدة (لا سند صرف)، كان هذا
     العمود يبقى صفراً بينما كشف المورّد الجديد يعرض ١٠,٠٠٠ — رقمان
     مختلفان لنفس الفاتورة على شاشتين مختلفتين (بالضبط الخطر رقم ٣).
     الإصلاح: استبدالٌ كاملٌ لا إضافة فوق القديم — لأن الرابط القديم قد
     يُعِدُّ نفس المبلغ الذي تُحسِبه "lines" مرّتين لو أُضيف فوقه بلا حذر
     (العقد سطر ١٦: الرابط القديم يُحسَب فقط حين لا توجد "lines"). الحساب
     الجديد = grandTotal/subTotal − invoiceOpen(id) — بالضبط ما يُخصَم من
     الفاتورة أياً كان مصدره (سند صرف، سطر تسوية، أو إشعار دائن) — فيتّفق
     تلقائياً مع كشف المورّد وتقرير «أعمار ديون الموردين» أدناه، لأن
     الثلاثة تُبنى من invoiceOpen نفسها. حارس الصلاحية نفسه (Auth.canSee
     ('payments')) باقٍ بالحرف — سلوك التدهور الرشيق القديم (صفر لمن لا
     يرى سندات الصرف) لم يتغيّر.
     money-owed.js:paidOf(invoiceId) sums ONLY payments.amount linked via
     "supplierInvoice" (the old single-document link) — with no knowledge
     of the new "lines" allocation, of an invoice paid from INSIDE a
     custody settlement, or of a credit note. So after paying 10,000 of a
     50,000 invoice through custody (no payment voucher at all), this
     column stayed at zero while the new supplier statement showed 10,000
     — two different numbers for the same invoice on two different
     screens (exactly danger 3). THE FIX: a full REPLACEMENT, not an
     addition on top of the old sum — because the old link could double
     count the same amount "lines" already counts, if simply added
     (contract line 16: the legacy link counts ONLY when "lines" is
     absent). The new computation = grandTotal/subTotal − invoiceOpen(id)
     — exactly what has been deducted from the invoice, whatever its
     source (payment voucher, settlement line, or credit note) — so it
     automatically agrees with the supplier statement and the "Supplier
     ageing" report below, because all three are built from invoiceOpen
     itself. The SAME permission guard (Auth.canSee('payments')) is kept
     byte-identical — the old graceful-degradation behaviour (zero for
     whoever may not see payment vouchers) is unchanged. */
  (function wrapMoneyOwedPaidOf() {
    if (!global.MoneyOwed || typeof MoneyOwed.paidOf !== 'function') {
      console.error('desk-ledgers.js: MoneyOwed.paidOf not found — the invoice register\'s "Paid" column will ' +
        'NOT include settlement/credit reductions (today\'s pre-existing gap, not a new failure).');
      return;
    }
    if (MoneyOwed.__deskLedgersWrapped) return;
    MoneyOwed.__deskLedgersWrapped = true;
    MoneyOwed.paidOf = function (invoiceId) {
      if (!global.Auth || !Auth.canSee || !Auth.canSee('payments')) return 0; /* نفس حارس اليوم بالحرف · today's guard, verbatim */
      var inv = rows('supplierInvoices').filter(function (i) { return i.id === invoiceId; })[0];
      if (!inv) return 0;
      return invoiceBase(inv) - invoiceOpen(invoiceId);
    };
  })();

  /* ── لفّ ReportsPage.render لإصلاح تبويبَي «ap» و«cash» الأصليّين ─────────
     WRAP ReportsPage.render TO FIX the native "ap" and "cash" tabs
     (الخطران ٢ و٣ · dangers 2 and 3)
     ------------------------------------------------------------------------
     لماذا DOM لا استدعاءً مباشراً · WHY THE DOM, NOT A DIRECT CALL
     pages/reports.js يحتفظ بـBUILDERS (الدوال ap/cash نفسها) وlastTable
     (لبيانات التصدير) كمتغيّرين خاصّين داخل IIFE واحد، لا يُصدَّران على
     `global.ReportsPage` إطلاقاً (المُصدَّر فقط: render/allowed/
     allowedReports) — فلا يوجد اسمٌ نلفّه مباشرة. الطريقة الوحيدة
     المطابقة لقاعدة «لفّ لا تعديل» هنا هي التقاط `host` عبر لفّ render
     نفسها (نفس أسلوب desk-statements.js المُثبَت)، ثم — بعد أن يرسم
     reports.js تبويبه الأصلي — نستبدل محتوى #repBody بجدولٍ مبنيٍّ من
     desk-ledgers.js نفسها حين يكون التبويب النشط ap أو cash، ونعيد ربط
     زرّي التصدير/الطباعة لتصديرَي نفس الصفوف المصحَّحة. الشاشة والطباعة
     والتصدير الآن من نفس المصدر — لا نسخة ثانية قد تختلف (R02).
     pages/reports.js keeps BUILDERS (the ap/cash functions themselves) and
     lastTable (the export buffer) as PRIVATE variables inside one IIFE —
     never exported on `global.ReportsPage` at all (only render/allowed/
     allowedReports are). So there is no name to wrap directly. The only
     technique that still honours "wrap, never edit" here is to capture
     `host` by wrapping render itself (the same proven technique
     desk-statements.js already uses), then — after reports.js draws its
     own native tab — REPLACE #repBody's content with a table built from
     this same desk-ledgers.js module whenever the active tab is ap or
     cash, and rebind the export/print buttons to export those SAME
     corrected rows. Screen, print and export now share one source — never
     a second copy that could disagree (R02).

     حارسٌ ضدّ حلقةٍ لا نهائية · A GUARD AGAINST AN INFINITE LOOP
     استبدال #repBody يُطلق MutationObserver نفسه من جديد؛ توقيعٌ (تبويب +
     من + إلى) يُخزَّن على العنصر نفسه يمنع إعادة الكتابة حين لا شيء تغيّر
     — فتتوقّف السلسلة عند العمق الثاني تلقائياً.
     Replacing #repBody's content fires the SAME MutationObserver again; a
     signature (tab + from + to) stored on the element itself prevents a
     re-write when nothing changed — the chain stops itself at depth two. */
  (function wrapReportsApCash() {
    if (!global.ReportsPage || typeof ReportsPage.render !== 'function') {
      console.error('desk-ledgers.js: ReportsPage.render not found — the native "ap"/"cash" tabs will keep their ' +
        'own numbers, unaware of custody transfers/settlements (today\'s pre-existing gap, not a new failure).');
      return;
    }
    if (ReportsPage.__deskLedgersApCashWrapped) return;
    ReportsPage.__deskLedgersApCashWrapped = true;

    function ddEsc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }
    function ddMoney(v) { return '<span class="money">' + ((global.I18N && I18N.money) ? I18N.money(v || 0) : String(v || 0)) + '</span>'; }
    function ddT(key, fb) { return (global.t ? t(key) : (global.I18N && I18N.t ? I18N.t(key) : fb)) || fb; }
    function ddL(o) { return (global.L ? L(o) : o.ar); }

    function currentFilters() {
      var f = document.getElementById('fFrom'), t2 = document.getElementById('fTo');
      return { from: f ? f.value : '', to: t2 ? t2.value : '' };
    }
    function activeReportId(host) {
      var b = host.querySelector('.tabs [data-rep].active');
      return b ? b.getAttribute('data-rep') : null;
    }

    function buildApRows(from, to) {
      var out = [], total = 0;
      suppliersAll().forEach(function (s) {
        var opening = num(s.openingBalance), inv = 0, paid = 0;
        rows('supplierInvoices').forEach(function (r) {
          if (r.supplier !== s.id || r.status !== 'approved' || isReversedRow(r) || !inRangeDate(r.date, from, to)) return;
          inv += (r.kind === 'credit') ? -invoiceBase(r) : invoiceBase(r);
        });
        /* 🔴 مُصحَّح مقابل الثوابت (FIXTURES-ACC-C، ١٩ سبتمبر) — لا افتراضاً:
           الكود الأصلي هنا كان يجمع p.amount الكامل لكل سند صرف، بلا أي علم
           بالتخصيص — فسند صرفٍ فيه عهدة زائدة غير مخصَّصة (PV_2: ١٥,٠٠٠،
           منها ١٢,٠٠٠ فقط على فاتورة، والباقي ٣,٠٠٠ عهدة) كان يُخصَم بكامل
           قيمته، فيُنتج ٣٥,٥٠٠ بدل ٣٨,٥٠٠ الصحيحة (ثوابت مؤسسة النيل) —
           بالضبط ازدواج «الخطر ٣» في شكل جديد: عهدة غير مخصَّصة تُحتسَب هنا
           كأنها سدادٌ لدَينٍ، بينما العقد ينصّ صراحةً أنها «تُدرَج» فقط ولا
           تُطرَح من الرصيد الجاري. الإصلاح: تُطرَح فقط القيمة المخصَّصة
           فعلاً (lines، أو الرابط القديم المفرد حين لا توجد lines) — تماماً
           كما تحسبها invoiceOpen وsupplierLedger أعلاه.
           🔴 FIXED against the fixtures (FIXTURES-ACC-C, 19 Sept) — not
           assumed: the original code here summed the FULL p.amount of
           every payment voucher, with no knowledge of allocation — so a
           voucher carrying an unallocated advance on top of a real
           allocation (PV_2: 15,000, of which only 12,000 is allocated to
           an invoice and the remaining 3,000 is an advance) was deducted
           at its FULL value, producing 35,500 instead of the correct
           38,500 (the Nile-supplier fixtures) — exactly danger 3 in a new
           shape: an unallocated advance counted here as if it settled a
           debt, while the contract explicitly says it is only "listed",
           never subtracted from the running balance. THE FIX: subtract
           only the amount actually ALLOCATED (lines, or the legacy single
           link when there are no lines) — exactly as invoiceOpen and
           supplierLedger above already compute it. */
        rows('payments').forEach(function (p) {
          if (p.supplier !== s.id || p.status !== 'approved' || isReversedRow(p) || !inRangeDate(p.date, from, to)) return;
          /* نفس شرط القاعدة (٨٩:٣٢٦-٣٤١): «المدفوع» هنا مجموع تخصيصات فقط،
             فسند بنوع مستفيد غير «مورّد» لا يخفض دَيناً هنا كما لا يخفضه في
             invoiceOpen — وإلا اختلف عمود «المدفوع» عن المتبقّي على الفاتورة.
             The database's own condition (89:326-341): "paid" here is a sum
             of ALLOCATIONS only, so a voucher whose payee type is not
             "supplier" reduces no debt here, exactly as it reduces none in
             invoiceOpen — otherwise the "paid" column and the invoice's open
             amount would disagree. */
          if (!settlesSupplierInvoices(p)) return;
          if (Array.isArray(p.lines) && p.lines.length) {
            p.lines.forEach(function (l) { paid += num(l.amount); });
          } else if (p.supplierInvoice) {
            paid += num(p.amount);
          }
        });
        /* المضاف هنا وحده — سداد فاتورة من داخل تسوية عهدة، الخطر ٣ ·
           THE ONLY thing added here — an invoice paid FROM INSIDE a
           custody settlement, danger 3. */
        rows('custodySettlements').forEach(function (doc) {
          if (doc.status !== 'approved' || isReversedRow(doc) || !inRangeDate(doc.date, from, to)) return;
          (doc.lines || []).forEach(function (l) {
            if (l && l.decision === 'accepted' && l.supplier === s.id && l.supplierInvoice) paid += num(l.amount);
          });
        });
        var bal = opening + inv - paid;
        if (!inv && !paid && !opening) return;
        total += bal;
        out.push({ code: s.code, name: s.name, opening: opening, inv: inv, paid: paid, bal: bal });
      });
      return { rows: out, total: total };
    }

    function buildCashRows(from, to) {
      var out = [], tIn = 0, tOut = 0, tBal = 0;
      rows('cashAccounts').forEach(function (a) {
        var inn = 0, outAmt = 0;
        /* 🔴 مُصلَح (تكامل ١٩ سبتمبر) — سطرٌ عكسيّ (isReversal) على القيد
           نفسه كان يُحسَب هنا مرّتين فعلياً (الأصل ثم عكسه)، فتُحسَب حركة
           الصندوق بأقلّ من الصحيح — مُقاسٌ: بعد عكس سند صرف ١٠,٠٠٠ عرض هذا
           التقرير «صادر» ٦,٥٠٠ بدل ١٦,٥٠٠ الصحيحة (رصيد البنك مُبالَغٌ فيه
           بـ١٠,٠٠٠). الإصلاح: استبعاد أي سطرٍ عكسيّ من كلا العدّادين — تماماً
           كما تفعل isReversedRow في كل مكانٍ آخر بهذا الملف.
           🔴 FIXED (integrator, 19 Sept) — a reversal-flagged row on the
           SAME entry was being counted here, throwing off the box's own
           movement figure — measured: after reversing a 10,000 payment
           this report showed "out" 6,500 instead of the correct 16,500
           (bank balance overstated by 10,000). THE FIX: exclude any
           reversal-flagged row from both counters, exactly what
           isReversedRow already does everywhere else in this file. */
        rows('receipts').forEach(function (r) { if (r.cashAccount === a.id && r.status === 'approved' && !r.isReversal && inRangeDate(r.date, from, to)) inn += num(r.amount); });
        rows('payments').forEach(function (r) { if (r.cashAccount === a.id && r.status === 'approved' && !r.isReversal && inRangeDate(r.date, from, to)) outAmt += num(r.amount); });
        /* المضاف هنا وحده — تحويلات العهدة (تمويل/استرداد) واعتماد التسوية،
           الخطر ٢ — كانا غائبين كلياً عن هذا التقرير من قبل. بداية موحّدة
           مع boxBalance — انظر تعليق clampFromToOpening أعلاه.
           THE ONLY thing added here — custody transfers (funding/return)
           and settlement acceptance, danger 2 — both entirely absent from
           this report before. SAME starting point as boxBalance — see
           clampFromToOpening's comment above. */
        movementsForBox(a.id, clampFromToOpening(a.id, from || null), to || null).forEach(function (m) {
          if (m.amount > 0) inn += m.amount; else outAmt += -m.amount;
        });
        var bal = num(a.openingBalance) + inn - outAmt;
        tIn += inn; tOut += outAmt; tBal += bal;
        out.push({ code: a.code, name: a.name, kind: a.kind, opening: num(a.openingBalance), inn: inn, out: outAmt, bal: bal });
      });
      return { rows: out, tIn: tIn, tOut: tOut, tBal: tBal };
    }

    function apHTML(data) {
      var headers = [ddT('g.docNo', 'الكود'), ddL({ ar: 'المورد', en: 'Supplier' }), ddL({ ar: 'رصيد افتتاحي', en: 'Opening' }),
        ddL({ ar: 'الفواتير', en: 'Invoices' }), ddL({ ar: 'المدفوع', en: 'Paid' }), ddL({ ar: 'الرصيد المستحق', en: 'Balance due' })];
      var rowsHtml = data.rows.map(function (r) {
        return '<tr><td><span class="num">' + ddEsc(r.code) + '</span></td><td><strong>' + ddEsc(r.name) + '</strong></td>' +
          '<td>' + ddMoney(r.opening) + '</td><td>' + ddMoney(r.inv) + '</td><td>' + ddMoney(r.paid) + '</td>' +
          '<td><span class="' + (r.bal > 0 ? 'neg' : 'pos') + '">' + ((global.I18N && I18N.money) ? I18N.money(r.bal) : r.bal) + '</span></td></tr>';
      }).join('');
      var footer = data.rows.length ? '<tfoot><tr><td class="strong" style="background:var(--surface-2)"></td><td class="strong" style="background:var(--surface-2)">' +
        ddEsc(ddL({ ar: 'الإجمالي', en: 'Total' })) + '</td><td class="strong" style="background:var(--surface-2)"></td><td class="strong" style="background:var(--surface-2)"></td>' +
        '<td class="strong" style="background:var(--surface-2)"></td><td class="strong" style="background:var(--surface-2)">' +
        ((global.I18N && I18N.money) ? I18N.money(data.total) : data.total) + '</td></tr></tfoot>' : '';
      return { headers: headers, html: tableWrap(headers, rowsHtml, footer, data.rows.length), rows: data.rows.map(function (r) { return [r.code, r.name, r.opening, r.inv, r.paid, r.bal]; }) };
    }
    function cashHTML(data) {
      var headers = [ddT('g.docNo', 'الكود'), ddL({ ar: 'الحساب', en: 'Account' }), ddL({ ar: 'النوع', en: 'Type' }),
        ddL({ ar: 'رصيد افتتاحي', en: 'Opening' }), ddL({ ar: 'وارد', en: 'In' }), ddL({ ar: 'صادر', en: 'Out' }), ddL({ ar: 'الرصيد', en: 'Balance' })];
      var rowsHtml = data.rows.map(function (r) {
        return '<tr><td><span class="num">' + ddEsc(r.code) + '</span></td><td><strong>' + ddEsc(r.name) + '</strong></td>' +
          '<td>' + ddEsc(r.kind) + '</td><td>' + ddMoney(r.opening) + '</td><td>' + ddMoney(r.inn) + '</td><td>' + ddMoney(r.out) + '</td>' +
          '<td><span class="' + (r.bal < 0 ? 'neg' : 'pos') + '">' + ((global.I18N && I18N.money) ? I18N.money(r.bal) : r.bal) + '</span></td></tr>';
      }).join('');
      var footer = data.rows.length ? '<tfoot><tr><td class="strong" style="background:var(--surface-2)"></td><td class="strong" style="background:var(--surface-2)">' +
        ddEsc(ddL({ ar: 'الإجمالي', en: 'Total' })) + '</td><td class="strong" style="background:var(--surface-2)"></td><td class="strong" style="background:var(--surface-2)"></td>' +
        '<td class="strong" style="background:var(--surface-2)">' + ((global.I18N && I18N.money) ? I18N.money(data.tIn) : data.tIn) + '</td>' +
        '<td class="strong" style="background:var(--surface-2)">' + ((global.I18N && I18N.money) ? I18N.money(data.tOut) : data.tOut) + '</td>' +
        '<td class="strong" style="background:var(--surface-2)">' + ((global.I18N && I18N.money) ? I18N.money(data.tBal) : data.tBal) + '</td></tr></tfoot>' : '';
      return { headers: headers, html: tableWrap(headers, rowsHtml, footer, data.rows.length), rows: data.rows.map(function (r) { return [r.code, r.name, r.kind, r.opening, r.inn, r.out, r.bal]; }) };
    }
    function tableWrap(headers, rowsHtml, footer, hasRows) {
      if (!hasRows) return '<div class="empty-state">' + ddEsc(ddL({ ar: 'لا توجد بيانات معتمدة تطابق الفلاتر المحددة.', en: 'No approved data matches the selected filters.' })) + '</div>';
      return '<div class="table-wrap"><table class="data-table"><thead><tr>' +
        headers.map(function (h) { return '<th class="no-sort">' + ddEsc(h) + '</th>'; }).join('') +
        '</tr></thead><tbody>' + rowsHtml + '</tbody>' + footer + '</table></div>';
    }

    var lastPatched = { id: null, headers: [], rows: [] };
    function rebindExportPrint(id, built) {
      var exp = document.getElementById('repExport');
      if (!exp) return;
      var clone = exp.cloneNode(true);
      exp.parentNode.replaceChild(clone, exp);
      lastPatched = { id: id, headers: built.headers, rows: built.rows };
      clone.onclick = function () {
        if (!global.UI || !UI.exportCSV) return;
        UI.exportCSV(id + '_report', lastPatched.headers, lastPatched.rows);
      };
    }

    /* 🔴 عطلٌ خطيرٌ حقيقي وُجد بالتشغيل الفعلي في متصفّح حقيقي (t11، ١٩
       سبتمبر) — لا في محاكاة DOM مزيَّفة · A SERIOUS real fault found by
       running it in a REAL browser (t11, 19 Sept) — never caught by a
       fake-DOM simulation
       ------------------------------------------------------------------
       rebindExportPrint تستدعي exp.parentNode.replaceChild(clone, exp) —
       وهذا تعديلٌ حقيقي على شجرة DOM (لا مجرّد onclick) يُطلِق المراقب
       (MutationObserver) نفسه. كانت هذه الدالّة تُنادى في كل مرّة بلا قيد
       — حتى حين يتطابق التوقيع ولا حاجة لأي تعديل — فتخلق حلقةً لا نهائية:
       تصحيح ← استبدال الزرّ (تعديل) ← المراقب يُطلَق ← تصحيح ← ... للأبد،
       تُجمِّد صفحة المتصفّح كلياً (لا استجابة لأي أمر CDP، حتى انتهاء
       المهلة). الإصلاح: نتحقّق من التوقيع **أولاً**، قبل أي تعديل DOM على
       الإطلاق — فحين يتطابق، لا يحدث أي تعديل، ولا يُطلَق المراقب مجدداً،
       وتتوقّف الحلقة قطعاً عند العمق الأول.
       rebindExportPrint calls exp.parentNode.replaceChild(clone, exp) —
       a REAL DOM mutation (not just an onclick assignment) that fires the
       SAME MutationObserver. This function used to be called
       UNCONDITIONALLY every time — even when the signature already
       matched and no mutation was needed at all — creating an infinite
       loop: patch → replace the button (a mutation) → the observer fires
       → patch again → ... forever, freezing the browser tab completely
       (no reply to any CDP command, not even after a timeout). THE FIX:
       check the signature FIRST, before any DOM mutation whatsoever — when
       it matches, NO mutation happens, the observer never fires again, and
       the loop is GUARANTEED to stop at depth one. PROVEN: t11's "click
       the ap tab" step hung indefinitely before this fix (280s watchdog),
       and completes in under a second after it. */
    function patchIfNeeded(host) {
      var id = activeReportId(host);
      if (id !== 'ap' && id !== 'cash') return;
      var body = host.querySelector('#repBody');
      if (!body) return;
      var f = currentFilters();
      var sig = id + '|' + f.from + '|' + f.to;
      if (body.getAttribute('data-azd-ap-cash-sig') === sig) return; /* لا أي تعديل DOM هنا — يمنع الحلقة قطعاً · NO DOM mutation here at all — guarantees no loop */
      var built = (id === 'ap') ? apHTML(buildApRows(f.from || null, f.to || null)) : cashHTML(buildCashRows(f.from || null, f.to || null));
      rebindExportPrint(id, built);
      body.innerHTML = built.html;
      body.setAttribute('data-azd-ap-cash-sig', sig);
    }

    var origRender = ReportsPage.render;
    ReportsPage.render = function (host) {
      origRender(host);
      try {
        patchIfNeeded(host);
        if (!host.__deskLedgersApCashObs) {
          host.__deskLedgersApCashObs = true;
          new MutationObserver(function () { try { patchIfNeeded(host); } catch (e) { console.error('desk-ledgers.js: ap/cash patch failed', e); } })
            .observe(host, { childList: true, subtree: true });
        }
      } catch (e) { console.error('desk-ledgers.js: could not patch the ap/cash reports', e); }
    };
  })();

  console.info('desk-ledgers.js ready — one source for custody/supplier movements/balance (' + custodyBoxes().length + ' custody box(es) visible now); ' +
    'Dashboard.analytics.cashBalance wrapped=' + !!(global.Dashboard && Dashboard.analytics && Dashboard.analytics.__deskLedgersWrapped) + '; ' +
    'MoneyOwed.paidOf wrapped=' + !!(global.MoneyOwed && MoneyOwed.__deskLedgersWrapped) + '; ' +
    'ap/cash reports wrapped=' + !!(global.ReportsPage && ReportsPage.__deskLedgersApCashWrapped) + '.');
})(window);

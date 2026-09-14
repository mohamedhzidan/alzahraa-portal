/* =========================================================================
   design-b-money-cells.js — مبلغٌ غير مسجَّل لا يظهر صفراً في الجدول
                             A missing amount stops printing as zero in tables
   -------------------------------------------------------------------------
   إضافة v2.0.36 — حذف هذا الملف وسطوره في loader.js وservice-worker.js يعيد الموقع كما كان تماماً. / v2.0.36 addition — deleting this file and its entries in loader.js and service-worker.js restores the portal exactly.

   ══ العطل، مقيساً لا موصوفاً ════════════════════════════════════════════
   في شاشة «إذون الصرف المخزني»، عمود «الإجمالي قبل الضريبة» يطبع
   «0.00 ج.م» لسجلٍّ قيمة subTotal فيه **null**. قِيس على البيانات الحقيقية:

       mod.columns[4] === 'subTotal'
       record.subTotal === null          ← والمفتاح موجود، والقيمة غائبة
       الخلية على الشاشة  === "0.00 ج.م"

   والسبب في منسّق الموقع نفسه: I18N.num يبدأ بـ
       if (!isFinite(n)) n = 0;
   فكلّ رقمٍ غائب في الموقع كلّه يصبح صفراً حقيقياً في العرض.
   قِيس أيضاً: I18N.money(undefined) === I18N.money(0) === "0.00 ج.م".

   ══ THE FAULT, measured not described ═══════════════════════════════════
   On the stock-issues screen the «الإجمالي قبل الضريبة» column prints
   "0.00 ج.م" for a record whose subTotal is **null**. Measured against real
   data: the key exists, the value is absent, the cell says zero.
   The cause is the portal's own formatter — I18N.num opens with
   `if (!isFinite(n)) n = 0;` — so EVERY missing number anywhere in the
   portal renders as a real-looking zero.

   ══ لماذا هذا خطير على المال ════════════════════════════════════════════
   «إذنُ صرفٍ بصفر جنيه» و«إذنُ صرفٍ لم يُسعَّر بعد» قرارَان مختلفان تماماً.
   الأوّل يُعتمد بلا تفكير؛ والثاني يجب أن يتوقّف. وحين يتشابهان على الشاشة
   يعتمد المعتمِد ما لا يعرف قيمته.
   A "zero-pound issue note" and a "not yet priced issue note" are entirely
   different decisions. The first is approved without thought; the second must
   stop. When they look identical, an approver signs something whose value
   nobody knows.

   ══ 🔴 ما لا يفعله هذا الملفّ ════════════════════════════════════════════
   ١) لا يغيّر قيمةً واحدة، ولا حساباً، ولا مجموعاً، ولا حدّ اعتماد.
   ٢) لا يلمس صفراً حقيقياً: الصفر يبقى «0.00 ج.م» عبر منسّق الموقع نفسه،
      فالأرقام والفواصل والعملة كما يعرفها الموظّف بالحرف.
   ٣) لا يكتب في المخزن ولا يرسل شيئاً. يقرأ القيمة الخام ويصلح **العرض**.

   1) It changes no value, no calculation, no total and no approval limit.
   2) It never touches a REAL zero: zero still renders "0.00 ج.م" through the
      portal's own formatter, so digits, separators and currency stay exactly
      as staff know them.
   3) It writes nothing anywhere. It reads the raw value and repairs the
      DISPLAY only.
   ========================================================================= */
(function (global) {
  'use strict';

  var AZB = global.AZB;
  if (!AZB) { console.error('design-b-money-cells.js needs design-b-kit.js first'); return; }
  if (!global.EntityPage || typeof EntityPage.render !== 'function') {
    console.error('design-b-money-cells.js: EntityPage.render not found — load order is wrong');
    return;
  }

  /* أيّ الأعمدة أعمدةُ مال؟ تُجمع من ثلاثة مصادر، لأنّ مصدراً واحداً لا يكفي:
     - amountField: حقل المبلغ المعلَن للشاشة
     - الحقول من نوع money أو calc
     - أهداف مجاميع الأسطر (وهذه هي الحالة التي فوّتها أوّل محاولة: subTotal
       ليس في mod.fields إطلاقاً — هو هدفُ مجموعٍ في mod.lines.totals، فلو
       اعتمدنا على الحقول وحدها لما أصلحنا العمود الذي بدأ كلّ هذا)
     Which columns are money columns? Gathered from THREE sources, because one
     is not enough:
     - amountField, the screen's declared amount
     - fields whose type is money or calc
     - the line-total TARGETS — and this is the case the first attempt missed:
       `subTotal` is not in mod.fields at all; it is a totals target in
       mod.lines.totals. Relying on fields alone would have left unfixed the
       very column that started this. */
  /* 🔴 (DESIGN-B-4, 11 سبتمبر — ملاحظة P10 لـ«ب»، والافتراضي الذي قرّره المدير) الحقول المحسوبة (calc) كانت
     تُحسب صفراً داخل الصفحة تحت قاعدة الأمان (§1)، فكانت «ب» تعاملها كأعمدة مال وتضع «غير متاح» مكان الصفر
     الكاذب. ملفّ P10 «calc-no-eval.js» (يُحمَّل بعد calc-formulas.js) يحسبها الآن داخل الصفحة ويرفع علماً:
     UI.__azCalcNoEval = true. حين يُرفع العلم يُترك الحقل المحسوب لحسابه ويُعرض رقمه؛ وحين لا يُرفع
     (نسخة بلا P10) يبقى السلوك القديم بالحرف. شرطٌ وقت التشغيل لا وقت البناء — فملفٌّ واحد يصحّ على النسختين.
     قِيس في صندوق Node (design-b-trial.js C.10–C.11) وعلى نسخة تحمل ملفّ P10.
     🔴 (DESIGN-B-4, 11 Sept — P10's note to Design B, and the manager's Q4 default) Calculated (calc) fields
     computed to ZERO inside the page under the security rule (§1), so Design B treated them as money columns
     and put «غير متاح» where the false zero stood. P10's «calc-no-eval.js» (loaded after calc-formulas.js) now
     computes them inside the page and raises a flag: UI.__azCalcNoEval = true. When the flag is up, a calc
     field is left to its calculator and shows its number; when it is not (a copy without P10) the old
     behaviour stays byte for byte. A RUNTIME condition, not a build-time one — one file is right on both
     copies. Measured in the Node sandbox (design-b-trial.js C.10–C.11) and on a copy carrying P10's file. */
  function calcHandledByP10() {
    try { return !!(global.UI && global.UI.__azCalcNoEval); } catch (e) { return false; }
  }
  function moneyColumns(mod) {
    var set = {};
    if (mod.amountField) set[mod.amountField] = true;
    (mod.fields || []).forEach(function (f) {
      if (f && f.name && (f.type === 'money' || f.type === 'calc')) set[f.name] = true;
    });
    if (mod.lines && Array.isArray(mod.lines.totals)) {
      mod.lines.totals.forEach(function (t) { if (t && t.target) set[t.target] = true; });
    }
    /* مع علم P10 يُحذف كلّ حقلٍ نوعه calc أيّاً كان الطريق الذي أدخله — فحقل المبلغ المعلَن نفسه قد يكون محسوباً
       (فاتورة المورّد: grandTotal هو amountField وهو calc؛ قِيس: بقي عموداً بالطريق الثاني حتى صُحِّح هذا).
       With P10's flag, every calc-typed field is removed whichever path added it — the declared amount field itself
       may be a calc field (supplier invoice: grandTotal is BOTH amountField and calc; measured: it stayed a money
       column through the second path until this was fixed — design-b-trial.js C.12). */
    if (calcHandledByP10()) {
      (mod.fields || []).forEach(function (f) { if (f && f.name && f.type === 'calc') delete set[f.name]; });
    }
    return set;
  }

  /* القيمة الخام غائبة؟ null و undefined والنصّ الفارغ وغير الرقم — كلّها
     «غير متاح». والصفر ليس منها، والصفر النصّي '0' ليس منها.
     Is the raw value absent? null, undefined, '' and non-numbers are all
     "unavailable". Zero is NOT, and the string '0' is NOT. */
  function isMissing(v) {
    if (v === null || v === undefined) return true;
    if (typeof v === 'string' && v.trim() === '') return true;
    return !isFinite(Number(v));
  }

  function fix(moduleId, host) {
    var mod;
    try { mod = global.Schema && Schema.get ? Schema.get(moduleId) : null; } catch (e) { return; }
    if (!mod || !Array.isArray(mod.columns) || !mod.columns.length) return;

    var money = moneyColumns(mod);
    var idxs = [];
    mod.columns.forEach(function (name, i) { if (money[name]) idxs.push({ i: i, name: name }); });
    if (!idxs.length) return;                    /* لا أعمدة مال في هذه الشاشة */

    var rows = host.querySelectorAll('.data-table tbody tr[data-id]');
    if (!rows.length) return;

    var repaired = 0;
    [].forEach.call(rows, function (tr) {
      var rec;
      try { rec = global.Store && Store.find ? Store.find(mod.table, tr.getAttribute('data-id')) : null; }
      catch (e) { return; }
      if (!rec) return;

      idxs.forEach(function (c) {
        var td = tr.children[c.i];
        if (!td || td.getAttribute('data-azb-money') === '1') return;
        if (!isMissing(rec[c.name])) return;     /* رقم حقيقي — لا نلمسه */
        td.setAttribute('data-azb-money', '1');
        td.innerHTML = AZB.na({ ar: 'لم يُسجَّل مبلغ', en: 'no amount recorded' });
        repaired++;
      });
    });

    if (repaired && global.console && console.info) {
      /* يُقال في الطرفية لا على الشاشة: عددُ الخلايا التي كانت تكذب.
         Reported in the console, not on screen: how many cells were lying. */
      console.info('design-b-money-cells: ' + repaired + ' cell(s) on ' + moduleId +
        ' showed 0.00 for an amount that was never recorded; now marked «غير متاح».');
    }
  }

  /* خطّاف السجلّ الواحد — بعد كل رسم، وإلا عادت «0.00» بأوّل نقرة (قِيس)
     The ONE register hook — after every draw, or «0.00» returns on the first
     click (measured: 9 repaired cells reverted after one chip press). */
  AZB.onRegister(fix);

  global.AZBMoneyCells = { fix: fix, isMissing: isMissing, moneyColumns: moneyColumns, calcHandledByP10: calcHandledByP10 };
})(window);

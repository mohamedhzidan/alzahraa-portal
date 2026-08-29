/* =========================================================================
   stock-in-transit.js — الرصيد المخزني المصحَّح: الوجهة تُقيَّد فقط عند
                          تسجيل الوصول الفعلي، لا عند مجرد الاعتماد الورقي
                          THE CORRECTED STOCK BALANCE: the destination is
                          credited only when arrival is actually recorded,
                          not merely on paper approval
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM (مُثبَتة بالتشغيل — TESTS/stock-transfer-paper-
   credit-trial.js، ١٠ نجاح/٠ فشل قبل هذا الملف)

   أمين مخزن يعتمد تحويل ٦٠ شيكارة أسمنت من الروبيكي إلى سوهاج. اللوري لم
   يتحرك بعد، لكن الموقع يقول فوراً إن سوهاج تملك ٦٠ شيكارة — pages/
   dashboard.js:93-119 يقيّد مخزن الوجهة بمجرد اعتماد المستند
   (posted('stockTransfers')، :103-110)، ولا يقرأ حقلي arrivalDate ولا
   receivedByDest إطلاقاً رغم وجودهما فعلاً في النموذج (schema.js:529-530).
   لو تأخر اللوري أو سُرق أو لم يخرج أصلاً، يستمر الموقع في قول إن البضاعة
   في سوهاج — للأبد. والأخطر: يمكن لسوهاج أن تصرف من الـ٦٠ شيكارة الوهمية
   هذه بإذن صرف حقيقي، وحارس منع الرصيد السالب (rules.js) يمرّره لأنه
   يقرأ نفس الرقم المتضخّم. هذا بالضبط ما تصفه knowledge.js:38 بأنه «أكبر
   ثغرة على الإطلاق».

   A storekeeper approves a transfer of 60 cement bags from Elrobaki to
   Sohag. The lorry has not moved, but the portal immediately says Sohag
   holds 60 bags — dashboard.js:93-119 credits the destination the moment
   the document is approved, and never reads arrivalDate or receivedByDest
   even though both fields already exist on the form. If the lorry is
   delayed, robbed, or never sent, the portal keeps saying the goods are at
   Sohag forever — and Sohag can issue against those phantom bags, with the
   negative-stock guard waving it through because it reads the same
   inflated number. This is exactly what knowledge.js:38 calls "the single
   biggest gap."

   -------------------------------------------------------------------------
   لماذا ملف مستقل، لا تعديل في dashboard.js · WHY A SEPARATE FILE, NOT AN
   EDIT TO dashboard.js

   dashboard.js من الملفات الإضافية التي لا تُعدَّل (frontend.md). والأهم:
   هذا الملف يُحمَّل بين hr-alerts.js وdc-alerts.js — قبل أن يوجد الكائن
   Dashboard أصلاً (يُنشأ في pages/dashboard.js، فتحة لاحقة كثيراً في
   loader.js). فهذا الملف لا "يصحّح" Dashboard.analytics.stockQty هنا؛ هو
   يبني حسابه المستقل الخاص به (StockInTransit.qty)، بنفس منطق dashboard.js
   حرفياً مع فرق سطر واحد. ملف لاحق منفصل — stock-arrival-gate.js — هو من
   يُلصق Dashboard.analytics.stockQty/.stockValue بهذا الحساب بعد أن يوجد
   Dashboard فعلاً؛ التفصيل الكامل في رأس ذلك الملف.

   dashboard.js is one of the additive files that is not edited. More to
   the point: this file loads between hr-alerts.js and dc-alerts.js —
   before the Dashboard object exists at all (it is created inside pages/
   dashboard.js, a much later loader.js slot). So this file does not
   "patch" Dashboard.analytics.stockQty here; it builds its own independent
   computation (StockInTransit.qty), byte-for-byte dashboard.js's own logic
   with one line different. A separate, later file — stock-arrival-gate.js
   — is what wires Dashboard.analytics.stockQty/.stockValue to this
   computation once Dashboard actually exists; see that file's header.

   -------------------------------------------------------------------------
   لماذا arrivalDate وحدها، لا receivedByDest · WHY arrivalDate ALONE, NOT
   receivedByDest

   اسم المستلم المتوقَّع قد يُملأ وقت الإنشاء ("من المفترض أن يستلمه") قبل
   وصول أي شيء فعلياً — لو استعملناه بوابةً لأعدنا فتح نفس الثغرة بصمت.
   نقص الرصيد فشل مرئي (رقم منخفض + تنبيه يسمّي العلاج)؛ الرصيد الوهمي فشل
   صامت. نختار الفشل المرئي دائماً. نافذة تسجيل الوصول (stock-arrival-
   gate.js) تملأ الحقلين معاً على أي حال.

   A receiver name can plausibly be pre-filled at creation ("who WILL
   receive it") before anything has actually arrived — using it as the gate
   would silently re-open the same hole. A missing credit fails VISIBLY (a
   low number plus an alert naming the cure); a phantom credit fails
   silently. We always choose the visible failure. The arrival-recording
   modal (stock-arrival-gate.js) fills both fields anyway.

   لا تصحيح تلقائي بعد N يوم · NO AUTO-CREDIT AFTER N DAYS — a timeout
   would silently re-open the same hole it is meant to close.

   -------------------------------------------------------------------------
   ما يفعله هذا الملف بالضبط · WHAT THIS FILE DOES, EXACTLY

   ١) StockInTransit.qty / .inTransit / .pending — الحساب المصحَّح الوحيد.
   ٢) يلفّ Alerts.list (نفس أسلوب hr-alerts.js المُثبَت) ليضيف تنبيهاً
      واحداً مجمَّعاً عن التحويلات المعتمدة التي لم يُسجَّل وصولها.
   ٣) يلفّ Rules.validateSave ليُغلق الحارس بدل أن يفشل صامتاً، ويضيف فحص
      رصيد المصدر على التحويلات (كان غائباً تماماً — rules.js:127 يفحص
      stockEffect==='out' فقط، لا 'transfer').

   1) StockInTransit.qty / .inTransit / .pending — the one corrected
      computation.
   2) Wraps Alerts.list (the same proven technique as hr-alerts.js) to add
      one aggregated alert about approved transfers with no recorded
      arrival.
   3) Wraps Rules.validateSave to fail CLOSED instead of silently open, and
      adds the source-balance check on transfers that never existed at all
      (rules.js:127 only checks stockEffect==='out', never 'transfer').

   -------------------------------------------------------------------------
   نصف الإصلاح · THE DANGEROUS HALF-STATE

   هذا الملف وstock-arrival-gate.js يجب أن يُرفعا معاً دائماً. لو رُفع هذا
   وحده بلا الملف المتأخر، يبقى Dashboard.analytics.stockQty القديم كما هو
   (المصدر الحقيقي الذي تراه شاشة التقارير)، بينما الحارس هنا يرفض الصرف
   والتحويل بأرقام مصحَّحة والتنبيه يطلب تسجيل وصول لا زر له بعد. الفحص
   الذاتي بالأسفل (__gatePatched) يرصد هذا الوضع ويصرخ به بدل أن يعمل نصف
   عمل بصمت.

   This file and stock-arrival-gate.js must always ship together. If this
   file alone is uploaded without the later one, Dashboard.analytics.
   stockQty stays exactly as it was (the number the reports screen actually
   shows), while the guard here refuses issues/transfers using CORRECTED
   numbers and the alert asks staff to record an arrival with no button yet
   to do it. The self-check below (__gatePatched) detects this and shouts
   about it instead of quietly doing half a job.

   -------------------------------------------------------------------------
   إضافي بالكامل · ADDITIVE. احذف هذا الملف (وstock-arrival-gate.js) فتعود
   حسابات المخزون والحارس إلى سلوك اليوم تماماً — لا بيانات تُفقد: الحقلان
   arrivalDate/receivedByDest ظلّا موجودين في المخطط دائماً.
   Delete this file (and stock-arrival-gate.js) and stock arithmetic and
   the guard revert to exactly today's behaviour — no data is lost: both
   fields always existed in the schema.

   ⚠️ ترتيب التحميل إلزامي · MANDATORY LOAD ORDER — بين hr-alerts.js
   وdc-alerts.js. يحتاج Store/Schema/Auth/Rules/Alerts موجودين (كلهم قبله
   في loader.js)؛ dc-alerts.js يلتقط لفّتنا لـ Alerts.list ويعيد بناء الخمس
   دوالّ المُصدَّرة منها — انظر تعليق hr-alerts.js لشرح هذا الفخ بالتفصيل.
   Between hr-alerts.js and dc-alerts.js. Needs Store/Schema/Auth/Rules/
   Alerts already loaded (all earlier in loader.js); dc-alerts.js captures
   our Alerts.list wrap and rebuilds its five exported functions from it —
   see hr-alerts.js's own header for the full trap this order avoids.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Store || !global.Schema || !global.Auth || !global.Rules || !global.Alerts) {
    console.error('stock-in-transit.js needs store.js, schema.js, auth.js, rules.js and alerts.js loaded first');
    return;
  }
  if (global.StockInTransit) return; /* حارس ضد لفّ مزدوج لو حُمِّل الملف مرتين بالخطأ */

  function L(o) { return (global.I18N && I18N.L) ? I18N.L(o) : (o && (o.ar || o.en)) || ''; }

  /* ═══════════════════════════════════════════════════════════════════
     SETTINGS — اضبط هذين الرقمين مع إدارتكم (نفس أسلوب rules.js)
     ═══════════════════════════════════════════════════════════════════ */
  var SETTINGS = {
    /* لا تنبّه عن تحويل عمره أقل من هذا — رحلة لوري عادية ليوم واحد لا
       يجب أن تُصرخ. Do not alert on a transfer younger than this — a
       normal one-day lorry trip should not scream. */
    minDaysToAlert: 2,
    /* ارفع مستوى التنبيه إلى «خطر» إذا بلغ أقدم تحويل معلَّق هذه المدة */
    dangerDays: 7
    /* ملاحظة: الجزء الثالث (اشتراط الوصول قبل إغلاق التحويل — محجوز، ينتظر
       إجابة هشام) سيضيف هنا لاحقاً علماً requireArrival دون الحاجة لإعادة
       بناء أي شيء آخر في هذا الملف. لم يُضَف الآن لأنه خارج نطاق هذه الدفعة.
       NOTE: Part 3 (requiring arrival before a transfer can close — parked,
       waiting on هشام's answer) will add a requireArrival flag here later
       with no rebuild needed elsewhere in this file. Not added now — out
       of scope for this batch. */
  };
  /* ═══════════════════════════════════════════════════════════════════ */

  var LEVEL = { danger: 3, warn: 2, info: 1 };

  /* ----------------------------------------------------------------------
     ١ · الحساب المصحَّح · THE CORRECTED COMPUTATION
     نفس pages/dashboard.js:93-119 حرفاً بحرف، بفرق سطر واحد فقط (مُعلَّم
     أدناه) — الوجهة تُقيَّد فقط إذا سُجِّل تاريخ الوصول فعلاً.
     Byte-for-byte pages/dashboard.js:93-119, with exactly one line
     different (marked below) — the destination is credited only once the
     arrival date is actually recorded.
     -------------------------------------------------------------------- */
  function posted(table) {
    return Store.all(table).filter(function (r) { return r.status === 'approved' || r.status === 'reversed'; });
  }

  function qty(itemId, warehouseId) {
    var q = 0;
    posted('goodsReceipts').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) { if (l.item === itemId) q += Number(l.qtyAccepted) || 0; });
    });
    posted('stockIssues').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) { if (l.item === itemId) q -= Number(l.qty) || 0; });
    });
    posted('stockTransfers').forEach(function (d) {
      (d.lines || []).forEach(function (l) {
        if (l.item !== itemId) return;
        var lq = Number(l.qty) || 0;
        if (!warehouseId) return; /* شركة بأكملها: التحويل لا يغيّر الإجمالي — نفس dashboard.js:107 */
        if (d.fromWarehouse === warehouseId) q -= lq; /* المصدر يُخصَم عند الاعتماد فوراً — البضاعة خرجت فعلاً */
        /* ★ الفرق الوحيد عن dashboard.js:109 — كل هذا الملف هو هذا السطر:
           الوجهة تُقيَّد فقط إذا وُجد تاريخ وصول فعلي، لا بمجرد الاعتماد.
           ★ THE ONLY DIFFERENCE from dashboard.js:109 — this whole file is
           this one line: the destination is credited only if a real
           arrival date exists, not merely on approval. */
        if (d.toWarehouse === warehouseId && d.arrivalDate) q += lq;
      });
    });
    posted('stockCounts').forEach(function (d) {
      if (warehouseId && d.warehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) {
        if (l.item === itemId) q += (Number(l.countedQty) || 0) - (Number(l.bookQty) || 0);
      });
    });
    return q;
  }

  /* التحويلات المعتمدة التي لم يصل شيء منها بعد — الأساس لهذا الملف
     وللجزء الثالث لاحقاً. حُصر بـ !isReversal لأن المستند العكسي نفسه سطر
     منفصل يحمل isReversal:true (dashboard.js:16 يستثنيه بنفس الطريقة). A
     transfer that was itself reversed changes status to 'reversed', not
     'approved', فيخرج من هذه القائمة تلقائياً — لا شيء ينتظر وصوله بعد
     إلغائه. */
  function pendingRows() {
    return Store.all('stockTransfers').filter(function (r) {
      return r.status === 'approved' && !r.isReversal && !r.arrivalDate;
    });
  }

  /* منذ متى هذا التحويل معلَّق؟ من تاريخ الاعتماد الحقيقي في مسار
     الاعتماد (trail)، لا من حقل "التاريخ" الذي قد يُكتب وقت الإنشاء ولا
     يعكس لحظة الاعتماد الفعلية. Age is measured from the real approval
     timestamp in the workflow trail, not the document's own "date" field,
     which may be set at creation and not reflect the actual approval
     moment. */
  function approvedAt(r) {
    var trail = r.trail || [];
    for (var i = trail.length - 1; i >= 0; i--) {
      if (trail[i].action === 'approve') return trail[i].at;
    }
    return r.updatedAt || r.date; /* احتياط لو غاب المسار لأي سبب */
  }
  function daysSince(d) { return Math.round((new Date() - new Date(d)) / 86400000); }

  function pending() {
    return pendingRows().map(function (r) { return { record: r, days: daysSince(approvedAt(r)) }; });
  }

  /* كمية "في الطريق" — لصنف بعينه و/أو لمخزن وجهة بعينه؛ اختياريان معاً.
     هذا هو الرقم الذي ستبني عليه الشاشات والجزء الثالث لاحقاً (لا يستهلكه
     أحد في هذه الدفعة بعد). "In transit" quantity — for a given item
     and/or a given destination warehouse, both optional. This is the
     number future screens and Part 3 will build on (nothing in THIS batch
     consumes it yet). */
  function inTransit(itemId, warehouseId) {
    var q = 0;
    pendingRows().forEach(function (d) {
      if (warehouseId && d.toWarehouse !== warehouseId) return;
      (d.lines || []).forEach(function (l) {
        if (itemId && l.item !== itemId) return;
        q += Number(l.qty) || 0;
      });
    });
    return q;
  }

  /* ----------------------------------------------------------------------
     ٢ · التنبيه المجمَّع · THE AGGREGATED ALERT
     صف واحد، لا صف لكل تحويل — الامتثال المتعمَّد لقاعدة frontend.md
     «لا تُصعِّد تنبيهاً على خانة اختيارية فارغة»: عدد مجمَّع، لا جدار أحمر.
     One row, not one per transfer — deliberate compliance with frontend.
     md's rule "never alarm on an empty optional box": an aggregate count,
     not a wall of red.
     -------------------------------------------------------------------- */
  function mk(list, level, moduleId, icon, ar, en, recId) {
    list.push({ level: level, module: moduleId, icon: icon, text: L({ ar: ar, en: en }), recordId: recId || null });
  }

  function buildInTransitAlert(out) {
    if (!Auth.canSee('stockTransfers')) return; /* أمين المخزن وحده يتصرّف بهذا */
    var rows = pending().filter(function (p) { return p.days >= SETTINGS.minDaysToAlert; });
    if (rows.length) {
      var oldest = rows.reduce(function (m, p) { return Math.max(m, p.days); }, 0);
      mk(out, oldest >= SETTINGS.dangerDays ? 'danger' : 'warn', 'stockTransfers', 'shuffle',
        rows.length + ' تحويلات معتمدة لم يُسجَّل وصولها — أقدمها منذ ' + oldest +
          ' يوم. الكميات لا تُحتسب في مخزن الوجهة حتى يُسجَّل تاريخ الوصول من شاشة التحويل.',
        rows.length + ' approved transfer(s) have no recorded arrival — the oldest is ' + oldest +
          ' day(s) old. Quantities are not counted at the destination warehouse until the arrival date is recorded on the transfer screen.');
    }
  }

  /* نصف إصلاح فقط: هذا الملف حاضر لكن stock-arrival-gate.js غائب أو فشل في
     إلصاق Dashboard.analytics — انظر شرح "نصف الإصلاح" في رأس الملف.
     Only half of the fix: this file is present but stock-arrival-gate.js
     is missing or failed to patch Dashboard.analytics — see the "the
     dangerous half-state" note in the file header. */
  function buildHalfStateAlert(out) {
    if (!Auth.canSee('stockTransfers')) return;
    if (global.StockInTransit && global.StockInTransit.__gatePatched) return; /* سليم */
    mk(out, 'danger', 'stockTransfers', 'alert',
      'نصف إصلاح التحويلات فقط مُحمَّل — أعد رفع الملفين معاً (stock-in-transit.js وstock-arrival-gate.js).',
      'Only half of the stock-transfer fix is loaded — re-upload both files together (stock-in-transit.js and stock-arrival-gate.js).');
  }

  function buildAll() {
    var out = [];
    if (!Auth.current || !Auth.current()) return out;
    buildInTransitAlert(out);
    buildHalfStateAlert(out);
    return out;
  }

  var origList = Alerts.list;
  function mergedList() {
    var base = origList.apply(Alerts, arguments) || [];
    var extra = buildAll();
    if (!extra.length) return base;
    var merged = base.concat(extra);
    merged.sort(function (a, b) { return LEVEL[b.level] - LEVEL[a.level]; });
    return merged;
  }
  /* نلفّ Alerts.list وحدها فقط — بالضبط أسلوب hr-alerts.js. dc-alerts.js
     المحمَّل بعدنا هو من يعيد بناء الخمس دوالّ الأخرى من هذه القائمة.
     We wrap Alerts.list only — exactly hr-alerts.js's technique.
     dc-alerts.js, loaded after us, rebuilds the other four exported
     functions from this list. */
  Alerts.list = mergedList;

  /* ----------------------------------------------------------------------
     ٣ · حارس الرصيد السالب: يُغلق بدل أن يفشل صامتاً + يفحص التحويلات
        THE NEGATIVE-STOCK GUARD: fails CLOSED instead of silently open,
        and now checks transfers too
     -------------------------------------------------------------------- */
  function failClosedMsg(e) {
    var reason = (e && e.message) ? e.message : String(e);
    return L({
      ar: 'تعذّر التحقق من الرصيد المخزني — لم يُحفظ المستند. أبلغ مسؤول النظام (السبب: ' + reason + ').',
      en: 'Could not verify stock availability — the document was not saved. Tell the system administrator (reason: ' + reason + ').'
    });
  }

  /* رسالة رفض التحويل: تُشخِّص، لا تتّهم — تذكر الرصيد الدفتري الحالي
     وتقترح العلاج الحقيقي وقت افتتاح بيانات حقيقية (٨ سبتمبر). The
     transfer-refusal message diagnoses, never accuses — it states the
     current book balance and names the real-data-era cure. */
  function transferShortfallMsg(it, ln, avail) {
    return L({
      ar: 'الكمية المطلوب تحويلها من «' + (it ? it.name : '') + '» (' + I18N.num(ln.qty, 2) +
          ') أكبر من الرصيد المتاح بمخزن المصدر (' + I18N.num(avail, 2) + '). ' +
          'لو البضاعة موجودة فعلاً فالأرصدة الافتتاحية لم تُسجَّل بعد — سجِّل جرد افتتاحي (شاشة الجرد والتسويات) أولاً.',
      en: 'The quantity requested to transfer of "' + (it ? it.name : '') + '" (' + I18N.num(ln.qty, 2) +
          ') exceeds the available balance at the source warehouse (' + I18N.num(avail, 2) + '). ' +
          'If the goods really are there, opening balances have not been recorded yet — record an opening stock count (Stock count & adjustments screen) first.'
    });
  }

  var origValidateSave = Rules.validateSave;
  Rules.validateSave = function (mod, draft, editingId) {
    var check = origValidateSave(mod, draft, editingId);

    /* assistant-pro.js:147 (عطل قائم مسبقاً) ينادي Rules.validateSave
       بمُعامل أول نصّي لا كائن — mod.lines على نصّ = undefined، فكل ما يلي
       يمرّ بأمان دون استثناء، تماماً كما تتصرّف الدالة الأصلية.
       assistant-pro.js:147 (a pre-existing bug) calls Rules.validateSave
       with a STRING first argument, not an object — mod.lines on a string
       is undefined, so every branch below falls through harmlessly with no
       throw, exactly like the original function's own behaviour. */
    if (Rules.SETTINGS.blockNegativeStock && mod && mod.lines && Array.isArray(draft.lines)) {

      /* أ) إغلاق الحارس بدل فشله الصامت — rules.js:132 يبتلع أي استثناء
         بصمت (catch(e){return;}). نعيد نفس الحساب هنا بنفس الوسائط؛ لو
         انفجر عندنا فقد انفجر هناك أيضاً وابتُلع دون أن يعلم أحد. إعادة
         حساب حتمية بنفس الوسائط تعني عدم تكرار الرسالة عند النجاح.
         a) Fail CLOSED instead of the original's silent failure —
         rules.js:132 swallows any exception silently (catch(e){return;}).
         We re-run the identical computation with the identical arguments;
         if it throws here, it threw there too and nobody was told.
         Deterministic same-args re-run means no duplicate message when
         both succeed. */
      if (mod.lines.stockEffect === 'out') {
        draft.lines.forEach(function (ln) {
          if (!ln.item || !(Number(ln.qty) > 0)) return;
          try { qty(ln.item, draft.warehouse || null); }
          catch (e) { check.errors.push(failClosedMsg(e)); }
        });
      }

      /* ب) رصيد المصدر على التحويلات — لم يكن موجوداً إطلاقاً من قبل.
         rules.js:127 يفحص stockEffect==='out' فقط (إذون الصرف)، فتحويل
         ٢٠٠ شيكارة من مخزن به ١٠ يمرّ بلا أي فحص. نفحصه هنا بنفس منطق
         الحارس الأصلي، مفتاحه fromWarehouse لا warehouse (اسم الحقل
         الحقيقي على شاشة التحويلات — schema.js:523).
         b) Source-balance check on transfers — did not exist at all
         before. rules.js:127 only checks stockEffect==='out' (issue
         notes), so transferring 200 bags out of a warehouse holding 10
         passed with no check whatsoever. Checked here with the same
         guard-clause shape as the original, keyed on fromWarehouse (the
         real field name on the transfers screen — schema.js:523). */
      if (mod.lines.stockEffect === 'transfer') {
        draft.lines.forEach(function (ln) {
          if (!ln.item || !(Number(ln.qty) > 0)) return;
          var avail;
          try { avail = qty(ln.item, draft.fromWarehouse || null); }
          catch (e) { check.errors.push(failClosedMsg(e)); return; }
          if (Number(ln.qty) > avail) {
            check.errors.push(transferShortfallMsg(Store.find('items', ln.item), ln, avail));
          }
        });
      }
    }

    return check;
  };

  global.StockInTransit = {
    SETTINGS: SETTINGS,
    qty: qty, inTransit: inTransit, pending: pending,
    /* يضبطه stock-arrival-gate.js إلى true بعد إلصاق Dashboard.analytics
       بنجاح — الفحص الذاتي أعلاه يقرأه. Set to true by stock-arrival-
       gate.js once it has successfully patched Dashboard.analytics — the
       self-check above reads it. */
    __gatePatched: false
  };

  console.info('stock-in-transit.js ready — destination warehouses are credited only on ' +
    'recorded arrival; the negative-stock guard now fails closed and checks transfer ' +
    'sources too. Needs stock-arrival-gate.js to finish the fix (Dashboard.analytics).');
})(window);

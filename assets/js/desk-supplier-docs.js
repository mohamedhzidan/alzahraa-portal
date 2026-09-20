/* =========================================================================
   desk-supplier-docs.js — فواتير/مستخلصات الموردين + توزيع سندات الصرف
                          Supplier invoices/certificates + payment
                          voucher allocations (plan §2 J-B/J-C/J-D/J-E,
                          §5.1 rows سند صرف / فاتورة-مستخلص, DATA CONTRACT
                          19 Sept — الشريحة ٣)
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٣).

   لماذا ملف مستقل، لا تعديل desk-finance-modules.js أو desk-settlement-lines.js
   WHY A SEPARATE FILE, NOT AN EDIT TO THE SLICE 1/2 FILES
   -------------------------------------------------------------------------
   نفس منطق desk-settlement-lines.js بالحرف: تلك الملفات مُختبَرة وخضراء
   بالفعل (t02/t03/t04/t05/t06/t07). نتبع نمطها نفسه — Schema.get يعيد
   نفس مرجع الكائن دائماً (desk-finance-modules.js:280-287)، فنُحضر
   الوحدة ونُضيف إليها حقولاً و.lines/.quickEntry بعد التحميل. إضافيّ بحت:
   حذف هذا الملف وحده يعيد «سند صرف» و«فاتورة/مستخلص مورد» إلى حقول رأس
   فقط (بلا توزيع، بلا روابط مستخلص، بلا كشف تكرار) بالضبط كما كانا في
   الشريحة ١، بلا أي أثر على العهدة (الشريحة ٢) أو الإحصائيات (desk-
   statements.js/desk-ledgers.js — لا يُلمَسان هنا إطلاقاً).
   Exactly desk-settlement-lines.js's own logic: those files are already
   tested and green. We follow the SAME pattern — Schema.get always
   returns the SAME object reference (desk-finance-modules.js:280-287), so
   we fetch the module and add fields/.lines/.quickEntry onto it after
   load. Purely additive: deleting only this file returns "سند صرف" and
   "فاتورة/مستخلص مورد" to header-fields-only, exactly slice 1's shape,
   with zero effect on custody (slice 2) or the statements files (desk-
   statements.js/desk-ledgers.js — never touched here at all).

   ما هذا الملف يعتمد عليه، وما لا يعتمد عليه · WHAT THIS FILE DOES AND
   DOES NOT DEPEND ON
   -------------------------------------------------------------------------
   يعتمد على: schema.js، desk-finance-modules.js (الحقول الأساسية على
   payments/supplierInvoices)، desk-grid.js (عقد لوحة المفاتيح — يقرأ
   mod.quickEntry فقط، لا يُستدعى مباشرة من هنا)، desk-cell-picker.js
   (المنتقي العائم — يقرأ خيارات <select> مباشرة من الـDOM، لا يُستدعى
   مباشرة من هنا أيضاً)، DeskSettlementLines.newLineId (احتياطي محلي إن
   غاب). لا يعتمد على desk-ledgers.js/desk-statements.js وقت التحميل —
   هذا الملف يبحث عن DeskLedgers.invoiceOpen **وقت الاستعمال فقط** (عند
   فتح نموذج أو منتقٍ)، فترتيب التحميل بينهما لا يهم إطلاقاً.
   Depends on: schema.js, desk-finance-modules.js (the base fields on
   payments/supplierInvoices), desk-grid.js (the keyboard contract — reads
   mod.quickEntry only, never called directly from here), desk-cell-
   picker.js (the floating picker — reads <select> options straight from
   the DOM, also never called directly from here), DeskSettlementLines.
   newLineId (a local fallback if absent). Does NOT depend on desk-
   ledgers.js/desk-statements.js at LOAD time — this file looks for
   DeskLedgers.invoiceOpen only AT USE time (when a form/picker opens), so
   load order between the two files does not matter at all.

   🔴 عطلٌ حقيقيّ عُمِّم في desk-grid.js (وُجد بالقراءة، أُثبت بتشغيل t10)
   🔴 A REAL DEFECT GENERALISED IN desk-grid.js (found by reading, proven
   by running t10)
   -------------------------------------------------------------------------
   desk-grid.js's validateRow/clearRowErrors/computeCounts كانت تفحص
   أسماء ثابتة 'account'/'amount'/'description' — لا يوجد لهذه الشبكتين
   (توزيع: invoice+amount؛ روابط: linkedDoc+linkedAmount) حقل اسمه
   «account» إطلاقاً، فكانت Enter لن تُنشئ سطراً جديداً أبداً على آخر خطوة،
   بلا أي رسالة خطأ ظاهرة. عُمِّمت الدوال الثلاث في desk-grid.js لتقرأ
   m.quickEntry.requiredFields (القائمة أدناه) بدل الأسماء الثابتة —
   القيمة الافتراضية (غير المُعرَّفة) تبقى الثلاثة الأصلية بالحرف، فتسوية
   العهدة والقيد اليومي يعملان بلا أي تغيير في السلوك (مُثبَت: t04 73/73،
   t05 69/69، t06 55/56 [العطل الوحيد F1 عطلٌ زمنيٌّ قائمٌ من قبل، أُثبت
   بإعادة تشغيل نفس التجربة على النسخة الأصلية غير المُعدَّلة من desk-
   grid.js فأعطت نفس الفشل بالحرف]، t07 19/19 — كلها أُعيد تشغيلها بعد هذا
   التعميم).
   desk-grid.js's validateRow/clearRowErrors/computeCounts checked the
   FIXED names 'account'/'amount'/'description' — neither of these two
   grids (allocations: invoice+amount; links: linkedDoc+linkedAmount) has
   any field named "account" at all, so Enter could never create a new row
   on the last step, with no visible error at all. The three functions in
   desk-grid.js were generalised to read m.quickEntry.requiredFields (the
   list below) instead of the fixed names — the DEFAULT (when undefined)
   stays the original three, verbatim, so custody settlements and the
   journal run with zero behaviour change (proven: t04 73/73, t05 69/69,
   t06 55/56 [the one failure, F1, is a PRE-EXISTING timing flake — proven
   by re-running the SAME trial against the ORIGINAL, unpatched desk-
   grid.js, which produced the exact same failure], t07 19/19 — all
   re-run after this generalisation).

   🔴 مُصلَح — اعتماد invoiceOpenAmount() صار تعريفاً واحداً لا اثنين
   🔴 RESOLVED — invoiceOpenAmount() is now ONE definition, not two
   -------------------------------------------------------------------------
   الخطة تنصّ على «تعريفٌ واحدٌ» لـ«المتبقّي على الفاتورة» — DeskLedgers.
   invoiceOpen (desk-ledgers.js) اكتملت الآن، فحُذف الاحتياط المحلّي
   (invoiceOpenAmountFallback) بالكامل، كما طلب المنسّق فور اكتمالها —
   لا نسخة ثانية تُبقى حيّة بجانب الحقيقية أبداً. غياب DeskLedgers نفسه
   (ملفٌ لم يُحمَّل، لا اختلافٌ في القاعدة) حالةٌ تُصرَّح بها بصراحة —
   invoiceOpenAmount() تعيد null، وكل مستدعٍ يعرض «غير متاح» أو يرفض
   الحفظ صراحةً، لا يحسب رقماً ثانياً قد ينحرف عن desk-ledgers.js.
   The plan states ONE definition for an invoice's "open amount" —
   DeskLedgers.invoiceOpen (desk-ledgers.js) is now complete, so the LOCAL
   FALLBACK (invoiceOpenAmountFallback) has been deleted entirely, as the
   coordinator asked the moment it landed — never a second copy kept
   alive beside the real one. DeskLedgers itself being absent (a file
   that failed to load, not a database difference) is reported HONESTLY —
   invoiceOpenAmount() returns null, and every caller either shows "not
   available" or explicitly refuses to save, rather than computing a
   second figure that could drift from desk-ledgers.js.

   يُحمَّل بعد desk-finance-modules.js (يحتاج S.get('payments')/S.get(
   'supplierInvoices') جاهزتين) — أيّ موضع بعده يعمل؛ رُشِّح الموضع مباشرةً
   بعد desk-settlement-lines.js (نفس دوره: تسجيل .lines/.quickEntry على
   وحدات موجودة).
   Loads after desk-finance-modules.js (needs S.get('payments')/S.get(
   'supplierInvoices') ready) — any position after that works; suggested
   slot is directly after desk-settlement-lines.js (the same role:
   registering .lines/.quickEntry on already-existing modules).
   ========================================================================= */
(function (global) {
  'use strict';

  /* 🔴 تحميل مرّة واحدة فقط: t10 كان يحقن هذا الملف ثانيةً فوق نسخة المحمِّل. أعلام كل لفّة موضوعة على الدالة
     نفسها، فإذا لفّ ملفٌّ لاحق UI.modal فوقها (desk-grid.js · desk-side-panel.js) لم يعد العلم ظاهراً وقد تُلفّ
     مرّةً ثانية. هذا الحارس يوقف كل تكرار عند الباب.
     Load ONCE only: t10 used to inject this file a second time over the loader's copy. Each wrapper's flag sits
     on the function itself, so once a later file wraps UI.modal on top (desk-grid.js · desk-side-panel.js) the
     flag is no longer visible and it can be wrapped twice. This guard stops every repeat at the door. */
  if (global.DeskSupplierDocs) { console.info('desk-supplier-docs.js already loaded — second load ignored'); return; }

  if (!global.Schema) { console.error('desk-supplier-docs.js needs schema.js first — not installed'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }
  function esc(s) { return (global.UI && UI.esc) ? UI.esc(s) : String(s == null ? '' : s); }
  function L2(o) { return (global.L ? L(o) : (o.ar || o.en)); }
  function money(v) { return (global.I18N && I18N.money) ? I18N.money(v || 0) : String(v || 0); }
  function num(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  var SEC = {
    main:  { ar: 'البيانات الأساسية', en: 'Main information' },
    link:  { ar: 'الربط', en: 'Links' },
    money: { ar: 'البيانات المالية', en: 'Financial details' }
  };
  /* مصدرٌ واحد لهذا النصّ — يظهر في الملخّص الحيّ وعلى زرّ الإرسال المعطَّل
     معاً (تحديث المنسِّق، ١٩ سبتمبر). ONE source for this text — shown on
     the live summary AND on the disabled Send button (coordinator update,
     19 Sept). */
  var SUMMARY_NO_SEND_MSG = { ar: 'مستخلص ملخّص — يُحفظ مرجعاً ولا يُرسل؛ لا قيد له',
    en: 'A summary certificate — saved as a reference only, never sent; it carries no entry' };

  /* ── lineId — يُفوَّض إلى DeskSettlementLines.newLineId (نفس الخوارزمية
     الآمنة من التصادم — لا نسخة ثانية منها)، واحتياطي محلي بديد أقل حظاً
     فقط إن غاب ذلك الملف كلياً.
     lineId — delegates to DeskSettlementLines.newLineId (the same
     collision-safe algorithm — no second copy of it), with a
     lower-quality local fallback ONLY if that file is entirely absent. */
  function newLineId() {
    if (global.DeskSettlementLines && typeof DeskSettlementLines.newLineId === 'function') return DeskSettlementLines.newLineId();
    if (global.crypto && typeof global.crypto.randomUUID === 'function') return 'l' + global.crypto.randomUUID();
    return 'l' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  /* ═══════════════════════════════════════════════════════════════════
     ١ · حقول جديدة على payments/supplierInvoices — بنفس حراسة عدم التكرار
        NEW FIELDS on payments/supplierInvoices — same duplicate guard
     ═══════════════════════════════════════════════════════════════════ */
  function pushIfMissing(mod, name, build) {
    if (mod.fields.some(function (f) { return f.name === name; })) return false;
    mod.fields.push(build());
    return true;
  }

  var PAYMENTS = S.get('payments');
  var SUPPLIER_INVOICES = S.get('supplierInvoices');
  if (!PAYMENTS || !SUPPLIER_INVOICES) {
    console.error('desk-supplier-docs.js: "payments" or "supplierInvoices" not found (desk-finance-modules.js not loaded first?) — nothing added');
    return;
  }

  /* 🔴 حُذِف (تكامل ١٩ سبتمبر) — payments.equipment كان حقلاً وهمياً بلا
     عمود حقيقي على payments في العقد (equipment موجودٌ على supplierInvoices
     فقط، السطر التالي) — اختيار معدة على سند صرفٍ كان يُسقِط الحفظ كلياً
     («عمود غير معروف»، فخّ notes/description المُسجَّل)، ولا كودٌ آخر
     يقرأ هذا الحقل أصلاً. حُذف الدفع بالكامل — لا بديل، لأن لا حاجة إليه.
     🔴 REMOVED (integrator, 19 Sept) — payments.equipment was a PHANTOM
     field with no real column on payments in the contract (equipment
     exists on supplierInvoices ONLY, next block) — picking an equipment
     on a سند صرف killed the save entirely ("unknown column", the
     recorded notes/description trap), and no other code ever read this
     field at all. The push is removed outright — no replacement, because
     none is needed. */

  /* supplierInvoices.kind / certifiedToDate / equipment (DATA CONTRACT) */
  var KIND_OPTIONS = [
    { value: 'invoice',     label: { ar: 'فاتورة', en: 'Invoice' } },
    { value: 'certificate', label: { ar: 'مستخلص', en: 'Certificate' } },
    { value: 'credit',      label: { ar: 'إشعار دائن', en: 'Credit note' } }
  ];
  pushIfMissing(SUPPLIER_INVOICES, 'kind', function () {
    return F('kind', 'النوع', 'Kind', 'select', { options: KIND_OPTIONS, default: 'invoice', required: true, section: SEC.main });
  });
  pushIfMissing(SUPPLIER_INVOICES, 'certifiedToDate', function () {
    return F('certifiedToDate', 'إجمالي المستخلص حتى تاريخه', 'Certified to date', 'money', {
      section: SEC.money,
      help: { ar: 'للمستخلصات فقط — الأعمال الجديدة = هذا المبلغ ناقص المُعتمَد سابقاً (مجموع الروابط أدناه)',
              en: 'Certificates only — new work = this amount minus previously certified (the sum of the links below)' }
    });
  });
  pushIfMissing(SUPPLIER_INVOICES, 'equipment', function () {
    return F('equipment', 'المعدة', 'Equipment', 'ref', {
      ref: 'equipment', refLabel: 'name', section: SEC.link,
      help: { ar: 'مطلوبة إن كان بند التكلفة من نوع «معدات»', en: 'Required when the cost item is of type "equipment"' }
    });
  });
  /* previouslyCertified — عمود حقيقي (DATA CONTRACT) لكن للقراءة فقط على
     الشاشة: قيمته الحيّة تُحسَب من مجموع lines.linkedAmount عبر آلية
     mod.lines.totals العامة في entity.js (recalc)، فلا حاجة لحقل إدخال. */
  pushIfMissing(SUPPLIER_INVOICES, 'previouslyCertified', function () {
    return F('previouslyCertified', 'مُعتمَد سابقاً', 'Previously certified', 'money', { readonly: true, section: SEC.money });
  });

  /* ═══════════════════════════════════════════════════════════════════
     ٢ · payments.lines — شبكة توزيع المبلغ على فواتير المورد المفتوحة
        payments.lines — the ALLOCATION grid
     ═══════════════════════════════════════════════════════════════════ */
  var PAYMENT_LINE_FIELDS = [
    F('lineId', '', '', 'text', { width: '0' }),
    F('invoice', 'الفاتورة', 'Invoice', 'ref', { ref: 'supplierInvoices', refLabel: 'docNo', required: true, width: '260px' }),
    F('amount', 'المبلغ المخصَّص', 'Allocated amount', 'money', { required: true, width: '140px' })
  ];
  function paymentBlankLine() { var o = {}; PAYMENT_LINE_FIELDS.forEach(function (f) { o[f.name] = f.type === 'money' ? null : ''; }); o.lineId = newLineId(); return o; }

  /* ── الرصيد المفتوح على فاتورة — تعريفٌ واحد الآن: DeskLedgers.invoiceOpen
     (desk-ledgers.js) فقط. لا حساب ثانٍ محلّي بعد الآن — الاحتياط المؤقّت
     حُذف فور اكتمال الدالّة الحقيقية (تعليق المنسّق، ١٩ سبتمبر). غياب
     DeskLedgers نفسه (ملفٌ لم يُحمَّل) يُصرَّح به صراحةً (null) بدل حسابٍ
     ثانٍ قد ينحرف عن القاعدة — كل مستدعٍ يعرض «غير متاح» أو يرفض الحفظ
     صراحةً عندها (انظر openAmountLabel وvalidatePaymentAllocations أدناه).
     ONE definition now: DeskLedgers.invoiceOpen (desk-ledgers.js) only. No
     second local computation any more — the temporary fallback was
     deleted the moment the real function was ready (coordinator comment,
     19 Sept). DeskLedgers itself being absent (the file failed to load)
     is reported HONESTLY as null rather than a second computation that
     could drift — every caller shows "not available" or explicitly
     refuses to save then (see openAmountLabel and
     validatePaymentAllocations below). */
  function invoiceOpenAmount(invoiceId) {
    if (global.DeskLedgers && typeof DeskLedgers.invoiceOpen === 'function') {
      return num(DeskLedgers.invoiceOpen(invoiceId));
    }
    return null;
  }
  /* عرضٌ صادق فقط — لا يُستعمَل في أيّ حسابٍ أو قرار، مجرّد نصٍّ للمستخدم.
     A DISPLAY-ONLY label — never used in any calculation or decision, just
     the text shown to the user. */
  function openAmountLabel(invoiceId) {
    var v = invoiceOpenAmount(invoiceId);
    return v === null ? L2({ ar: 'غير متاح', en: 'not available' }) : money(v);
  }

  function approvedOpenInvoicesForSupplier(supplierId, excludeId) {
    if (!supplierId || !global.Store) return [];
    return Store.all('supplierInvoices').filter(function (inv) {
      if (inv.id === excludeId) return false;
      if (inv.supplier !== supplierId) return false;
      if (inv.status !== 'approved') return false;
      if (inv.kind === 'credit') return false;
      /* null (DeskLedgers غائبة) > 0.004 == false — الفاتورة تُستبعَد من
         الاختيار بدل عرض رقمٍ غير موثوق؛ فشلٌ آمن، لا فشلٌ صامت.
         null (DeskLedgers absent) > 0.004 == false — the invoice is
         EXCLUDED from selection rather than showing an untrustworthy
         figure; fail-safe, not fail-silent. */
      return invoiceOpenAmount(inv.id) > 0.004;
    });
  }

  if (PAYMENTS.lines) {
    console.info('desk-supplier-docs.js: payments.lines already present — nothing to add (idempotent re-run)');
  } else {
    /* لا totals هنا عمداً — لا عمود «allocatedTotal» حقيقي على payments
       (العقد لا يذكره)، وmod.lines.totals يرسل target كمفتاحٍ إضافي في
       الحفظ عبر Store.create — إضافة واحد وهميّ كانت ستُسقِط الصفّ كله
       بعمودٍ غير معروف (نفس فخّ notes/description وpaperRef/linePaperRef
       المُسجَّلين في desk-finance-modules.js/desk-settlement-lines.js).
       الملخّص الحيّ (مخصَّص/غير مخصَّص) يُبنى بصرياً فقط في enhanceSupplierFoot
       أدناه، لا كحقلٍ يُحفَظ.
       NO totals here, deliberately — there is no real "allocatedTotal"
       column on payments (the contract never names one), and
       mod.lines.totals sends its target as an EXTRA key at save via
       Store.create — one invented column would drop the WHOLE row with
       an unknown-column error (the exact same trap already recorded for
       notes/description and paperRef/linePaperRef in desk-finance-
       modules.js/desk-settlement-lines.js). The live summary
       (allocated/unallocated) is built PURELY VISUALLY in
       enhanceSupplierFoot below — never as a field that gets saved. */
    PAYMENTS.lines = {
      label: { ar: 'توزيع المبلغ على فواتير المورد المفتوحة', en: 'Allocate the amount to the supplier\'s open invoices' },
      fields: PAYMENT_LINE_FIELDS,
      validate: validatePaymentAllocations
    };
    PAYMENTS.quickEntry = {
      steps: ['invoice', 'amount'],
      requiredFields: [
        { name: 'invoice', kind: 'ref', msg: { ar: 'اختر الفاتورة', en: 'Choose the invoice' } },
        { name: 'amount', kind: 'amount' }
      ],
      newLine: paymentBlankLine
    };
    console.info('desk-supplier-docs.js: mod.lines + mod.quickEntry attached to payments (allocations).');
  }

  /* ── التحقّق عند الحفظ — توزيع سند الصرف ──────────────────────────────
     رفضان فقط، بالضبط كما ينصّ العقد: المخصَّص > قيمة السند، والمخصَّص لكل
     فاتورة > المتبقّي عليها لحظة الإرسال. لا يُطبَّق إلا حين payeeType=
     supplier — غير ذلك، القسم مخفيٌّ أصلاً (enhancePaymentVisibility) وأي
     بيانات متروكة فيه من اختيارٍ سابق تُمسَح عند تبديل النوع (نفس الدالّة). */
  /* 🔴 عطلٌ حقيقيّ وُجد بالتشغيل الفعلي (t10) — لا بالقراءة وحدها. كانت
     validate() تُصفِّي الأسطر الناقصة محلياً لغرض التحقّق فقط، ولا تكتب
     ذلك فوق draft.lines — فسطرٌ فارغٌ زائد (الصفّ الذي يخلقه Enter بعد آخر
     سطر مكتمل ولا يُملأ أبداً) كان يصل الخادم كما هو ضمن lines، ويرفضه
     az_acc_payment_allocation_guard بـ«سطر تخصيص بمبلغ غير صحيح» — فيفشل
     الإرسال بصمت (toast فقط، لا استثناء JS)، والحالة تبقى draft. مُثبَت:
     PV_1 (t10) كانت تُحفَظ بسطرين (١٠،٠٠٠ صحيح + فارغ) ويفشل «إرسال
     للمراجعة» تماماً لهذا السبب. الإصلاح: نُعيد كتابة draft.lines نفسها
     هنا — لا نكتفي بنسخة محلية للتحقّق — فتصل السطور المكتملة فقط دائماً.
     🔴 A REAL DEFECT found by actually running this (t10) — not by
     reading alone. validate() filtered incomplete lines into a LOCAL copy
     for validation only, never writing that back onto draft.lines — so
     an extra blank row (the one Enter creates after the last complete
     row, never filled in) reached the server as-is inside lines, and
     az_acc_payment_allocation_guard refused it with "an allocation line
     has an invalid amount" — the SUBMIT failed silently (a toast only, no
     JS exception) and the status stayed draft. PROVEN: PV_1 (t10) saved
     with two lines (a valid 10,000 + a blank one) and «إرسال للمراجعة»
     failed for exactly this reason. THE FIX: reassign draft.lines itself
     here — never just a local validation copy — so only complete lines
     ever reach the server. */
  function validatePaymentAllocations(draft) {
    draft.lines = (draft.lines || []).filter(function (l) { return l && l.invoice && num(l.amount) > 0; });
    if (draft.payeeType !== 'supplier') { draft.lines = []; return null; }
    var lines = draft.lines;
    if (!lines.length) return null; /* التوزيع اختياري — دفعة كاملة غير مخصَّصة (مقدَّمة) تبقى صحيحة */
    var sum = 0;
    lines.forEach(function (l) { sum += num(l.amount); });
    var voucherAmount = num(draft.amount);
    if (voucherAmount > 0 && sum > voucherAmount + 0.004) {
      return { ar: 'المخصَّص يزيد عن قيمة السند', en: 'The allocated amount exceeds the voucher amount' };
    }
    var byInvoice = {};
    lines.forEach(function (l) { byInvoice[l.invoice] = (byInvoice[l.invoice] || 0) + num(l.amount); });
    for (var invId in byInvoice) {
      if (!Object.prototype.hasOwnProperty.call(byInvoice, invId)) continue;
      var open = invoiceOpenAmount(invId);
      /* غياب DeskLedgers يعني تعذّر التحقّق من المتبقّي — نرفض صراحةً هنا
         (فشلٌ آمن) بدل «open + 0.004» = NaN التي كانت ستجعل أيّ مقارنة
         false فتُمرِّر أيّ تخصيصٍ بصمت (فشلٌ مفتوح، أخطر رقمين قد يتصادما).
         DeskLedgers missing means the open balance could not be verified —
         REFUSE explicitly here (fail-safe) instead of "open + 0.004" =
         NaN, which would make every comparison false and silently let any
         allocation through (fail-open — the more dangerous of two numbers
         that could disagree). */
      if (open === null) {
        return { ar: 'تعذّر التحقّق من المتبقّي على الفاتورة — تعذّر تحميل desk-ledgers.js', en: 'Could not verify the invoice\'s open balance — desk-ledgers.js failed to load' };
      }
      if (byInvoice[invId] > open + 0.004) {
        var inv = global.Store ? Store.find('supplierInvoices', invId) : null;
        return {
          ar: 'المخصَّص يزيد عن المتبقّي على الفاتورة ' + (inv ? inv.docNo : invId) + ' (المتبقّي ' + money(open) + ')',
          en: 'The allocated amount exceeds the remaining open balance on invoice ' + (inv ? inv.docNo : invId) + ' (open ' + money(open) + ')'
        };
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٣ · supplierInvoices.lines — روابط المستخلص (فقط لِـkind=مستخلص)
        supplierInvoices.lines — CERTIFICATE LINKS (kind=certificate only)
     ═══════════════════════════════════════════════════════════════════ */
  var INVOICE_LINK_FIELDS = [
    F('lineId', '', '', 'text', { width: '0' }),
    F('linkedDoc', 'المستند', 'Document', 'ref', { ref: 'supplierInvoices', refLabel: 'docNo', required: true, width: '260px' }),
    F('linkedAmount', 'القيمة', 'Value', 'money', { required: true, width: '140px' })
  ];
  function invoiceLinkBlank() { var o = {}; INVOICE_LINK_FIELDS.forEach(function (f) { o[f.name] = f.type === 'money' ? null : ''; }); o.lineId = newLineId(); return o; }

  if (SUPPLIER_INVOICES.lines) {
    console.info('desk-supplier-docs.js: supplierInvoices.lines already present — nothing to add (idempotent re-run)');
  } else {
    SUPPLIER_INVOICES.lines = {
      label: { ar: 'مستندات سابقة مرتبطة (فواتير/مستخلصات لهذا المورد)', en: 'Previously recorded documents (invoices/certificates of this supplier)' },
      fields: INVOICE_LINK_FIELDS,
      /* previouslyCertified = مجموع linkedAmount — عمود حقيقي، آمن الحفظ
         (بخلاف payments أعلاه). previouslyCertified = the sum of
         linkedAmount — a REAL column, safe to save (unlike payments above). */
      totals: [{ field: 'linkedAmount', target: 'previouslyCertified', label: { ar: 'مُعتمَد سابقاً', en: 'Previously certified' } }],
      validate: validateSupplierInvoice
    };
    SUPPLIER_INVOICES.quickEntry = {
      steps: ['linkedDoc', 'linkedAmount'],
      requiredFields: [
        { name: 'linkedDoc', kind: 'ref', msg: { ar: 'اختر المستند', en: 'Choose the document' } },
        { name: 'linkedAmount', kind: 'amount' }
      ],
      newLine: invoiceLinkBlank
    };
    console.info('desk-supplier-docs.js: mod.lines + mod.quickEntry attached to supplierInvoices (certificate links).');
  }

  /* ── التحقّق عند الحفظ — الفاتورة/المستخلص ────────────────────────────
     ١) المعدة مطلوبة إن كان بند التكلفة من نوع «معدات» (K05، على مستوى
        الرأس لا الشبكة — لا محرّك ثانٍ، فحصٌ عادي فقط).
     ٢) لِـkind=مستخلص فقط: subTotal يساوي (certifiedToDate − previouslyCertified)
        بدقّة القرش. previouslyCertified هنا draft.previouslyCertified —
        محسوبة أصلاً بواسطة recalc العامة في entity.js من totals أعلاه،
        فلا حساب مواز. */
  function validateSupplierInvoice(draft) {
    /* نفس عطل السطر الفارغ الزائد أعلاه (validatePaymentAllocations) —
       ينطبق هنا حرفياً على روابط المستخلص: az_acc_invoice_kind_guard
       يرفض أيّ سطر بـlinkedDoc فارغ بـ«مستند مرتبط غير موجود». نُصفِّي
       draft.lines نفسها هنا أيضاً، لا نسخة محلية فقط.
       The SAME trailing-blank-row defect as validatePaymentAllocations
       above — applies verbatim to certificate links:
       az_acc_invoice_kind_guard refuses any line with an empty linkedDoc
       with "a linked document was not found". draft.lines itself is
       filtered here too, never only a local copy. */
    if (Array.isArray(draft.lines)) {
      draft.lines = draft.lines.filter(function (l) { return l && l.linkedDoc && num(l.linkedAmount) > 0; });
    }
    var ci = draft.costItem ? (global.Store ? Store.find('costItems', draft.costItem) : null) : null;
    if (ci && ci.type === 'equipment' && !draft.equipment) {
      return { ar: 'اختر المعدة — بند التكلفة المختار من نوع معدات', en: 'Choose the equipment — the selected cost item is of type equipment' };
    }
    if (draft.kind === 'certificate') {
      var certToDate = num(draft.certifiedToDate);
      var prevCert = num(draft.previouslyCertified);
      var newWork = certToDate - prevCert;
      var subTotal = num(draft.subTotal);
      if (Math.abs(subTotal - newWork) > 0.004) {
        return {
          ar: 'الجديد لا يساوي الإجمالي ناقص السابق: المحسوب ' + money(newWork) + '، المُدخَل ' + money(subTotal),
          en: 'The new amount does not equal certified-to-date minus previously certified: computed ' + money(newWork) + ', entered ' + money(subTotal)
        };
      }
    }
    return null;
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٤ · تقليم خيارات <select> داخل الشبكتين (invoice/linkedDoc)
        PRUNE the <select> OPTIONS inside both grids
     -----------------------------------------------------------------
     lineInput العامة في entity.js (للقراءة فقط) تعرض كل supplierInvoices
     بلا أي فلترة — status ليس أبداً 'inactive' على هذا الجدول (حالات
     تدفّق العمل فقط)، فالفلتر الوحيد الموجود هناك عديم الأثر هنا. هذا
     القسم يُقصّ الخيارات إلى: نفس المورد المختار + معتمدة + (توزيع: متبقٍّ
     > 0 | روابط: أيّ نوع فاتورة/مستخلص، لا إشعار دائن، لا المستند نفسه).
     الخيار المختار حالياً يبقى ظاهراً دائماً حتى لو لم يعد ضمن المسموح
     (K05: لا شيء يُمحى بصمت) — مع علامة خطأ توضّح السبب.
     entity.js's generic lineInput (read-only) shows EVERY supplierInvoices
     row with no filtering — status is never 'inactive' on this table
     (workflow states only), so the one filter that exists there is a
     no-op here. This section prunes options down to: the CHOSEN supplier
     + approved + (allocations: open > 0 | links: any invoice/certificate
     kind, never a credit note, never the document itself). The CURRENTLY
     SELECTED option always stays visible even if no longer allowed (K05:
     nothing vanishes silently) — with an error mark explaining why. */
  function currentSupplierId() {
    var el = document.querySelector('#entForm [name="supplier"]');
    return el ? el.value : '';
  }
  /* 🔴 عطلٌ حقيقيّ وُجد بالتشغيل الفعلي (t10) — لا بالقراءة وحدها.
     كانت هذه الدالّة تُقصّي الخيارات بـopt.remove() — حذفٌ نهائيّ من الـDOM.
     نداءٌ مبكر (قبل اختيار المورد بعد؛ مثلاً حين يتغيّر payeeType أولاً)
     كان يمرّر allowedIds=[] فيحذف كل الخيارات الحقيقية فوراً، ولا رجعة —
     فحين يُختار المورد لاحقاً ويُعاد النداء بقائمة صحيحة، لا خيارات باقية
     في الـDOM ليُعاد بناء تسميتها منها (pruneRefSelect القديمة كانت تُعدِّل
     خياراتٍ موجودة فقط، لا تُنشئ خياراتٍ جديدة أبداً) — فتبقى الخانة فارغة
     إلى الأبد، ولا يعمل أيّ اختيار عبر لوحة المفاتيح إطلاقاً. مُثبَت:
     PV_1 (t10) كانت تفشل بـ«لا نتيجة» رغم أنّ SI_A معتمدة وتخصّ نفس المورد.
     الإصلاح: إعادة بناء الخيارات من الصفر في كل نداء (idempotent) — لا
     نعتمد أبداً على ما تبقّى من نداءٍ سابق، فنداءٌ مبكر لا يُتلف نداءً
     لاحقاً صحيحاً.
     🔴 A REAL DEFECT found by actually running this (t10) — not by
     reading alone. This function used to prune options with opt.remove()
     — a PERMANENT DOM deletion. An early call (before the supplier is
     chosen yet — e.g. when payeeType changes first) passed allowedIds=[]
     and immediately deleted every real option, with no way back — so
     when the supplier is chosen afterward and this runs again with the
     CORRECT list, there are no options LEFT in the DOM to relabel from
     (the old pruneRefSelect only ever EDITED existing options, never
     CREATED new ones) — leaving the cell permanently empty and no
     keyboard selection possible at all. PROVEN: PV_1 (t10) failed with
     "no match" even though SI_A was approved and belonged to the exact
     same supplier. THE FIX: rebuild the option list FROM SCRATCH on
     every call (idempotent) — never depending on what a previous call
     left behind, so an early, premature call can never poison a later,
     correct one. */
  /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (t10) — تجميد كامل للمتصفح، بلا أي
     استثناء يُرمى، بلا أي ردّ من CDP — نفس فخّ markStaleEquipment بالحرف
     (desk-grid.js، تعليقه الكامل هناك) لكن هنا في هذا الملف. كانت
     rebuildRefSelect تحذف وتُعيد إنشاء كل الخيارات بلا شرط في كل نداء —
     وحذف/إنشاء <option> هو طفرة DOM (childList) داخل #linesWrap الذي
     يراقبه المراقب في bindFormReactivity. نداءٌ من مستمع 'change' العادي
     (لا من داخل دالّة المراقب نفسها، فهي تفصل المراقب قبل تنفيذها) —
     مثل enhanceInvoiceVisibility عند تغيّر kind — يُنتج طفرةً حقيقية دائماً
     (حتى لو كانت القائمة الجديدة مطابقة تماماً للقديمة)، فيُشغِّل المراقب
     الذي يستدعي pruneLinksGrid من جديد، الذي يستدعي rebuildRefSelect من
     جديد، التي تحذف وتُنشئ من جديد... حلقة لا نهائية بلا أي فاصل زمني.
     مُثبَت: t10 تجمّد بعد اعتماد SI_D1 مباشرةً، عند فتح نموذج SI_D2 وتبديل
     kind إلى «مستخلص» — بالضبط حيث pruneLinksGrid تُستدعى أول مرة من
     مستمع 'change' لا من المراقب. الإصلاح: لا نكتب <option> جديدة إلا إذا
     تغيّرت القائمة المطلوبة فعلاً (مقارنة بعلامة data-azd-sig محفوظة على
     الـselect نفسه) — يكسر الحلقة من مصدرها، بنفس منطق desk-grid.js
     بالحرف (مقارنة data-eq-name).
     🔴 A SERIOUS defect found by actually running this (t10) — a complete
     browser freeze, no exception thrown, no reply from CDP at all — the
     EXACT SAME trap as markStaleEquipment (desk-grid.js, see its full
     comment there), but in this file. rebuildRefSelect used to delete and
     recreate every option UNCONDITIONALLY on every call — and deleting/
     creating <option> elements IS a DOM (childList) mutation inside
     #linesWrap, which the observer in bindFormReactivity watches. A call
     from an ORDINARY 'change' listener (not from inside the observer's
     own callback, which disconnects itself first) — such as
     enhanceInvoiceVisibility when "kind" changes — always produces a REAL
     mutation (even when the new list is IDENTICAL to the old one), which
     re-triggers the observer, which calls pruneLinksGrid again, which
     calls rebuildRefSelect again, which deletes and recreates again... an
     infinite loop with no time gap at all. PROVEN: t10 froze right after
     SI_D1 was approved, opening the SI_D2 form and switching kind to
     "certificate" — exactly where pruneLinksGrid is first called from a
     'change' listener, not from the observer. THE FIX: never write new
     <option> elements unless the requested list actually changed
     (compared against a data-azd-sig marker stored on the select itself)
     — closes the loop at its source, the SAME logic desk-grid.js already
     uses (comparing data-eq-name), verbatim. */
  function rebuildRefSelect(select, candidates /* [{id, label}] */) {
    if (!select) return;
    var sig = JSON.stringify(candidates.map(function (c) { return [c.id, c.label]; })) + '|' + select.value;
    if (select.getAttribute('data-azd-sig') === sig) return;
    select.setAttribute('data-azd-sig', sig);
    var current = select.value;
    var currentOpt = current ? select.querySelector('option[value="' + current.replace(/"/g, '\\"') + '"]') : null;
    var currentLabel = currentOpt ? currentOpt.textContent : null;
    Array.prototype.slice.call(select.querySelectorAll('option[value]:not([value=""])')).forEach(function (opt) { opt.remove(); });
    var seenCurrent = false;
    candidates.forEach(function (c) {
      var opt = document.createElement('option');
      opt.value = c.id; opt.textContent = c.label;
      select.appendChild(opt);
      if (c.id === current) seenCurrent = true;
    });
    if (current && !seenCurrent) {
      /* K05 — القيمة المختارة سابقاً لم تعد ضمن المسموح: تبقى ظاهرة، لا
         تُمحى بصمت. K05 — a previously chosen value no longer allowed:
         stays visible, never silently erased. */
      var opt2 = document.createElement('option');
      opt2.value = current; opt2.textContent = currentLabel || current;
      select.appendChild(opt2);
    }
    select.value = current;
    var td = select.closest('td');
    if (td) {
      var err = td.querySelector('.err-msg');
      if (current && !seenCurrent) {
        if (!err) { err = document.createElement('span'); err.className = 'err-msg'; td.appendChild(err); }
        err.hidden = false;
        err.textContent = L2({ ar: 'لم يعد ضمن الخيارات المتاحة — اختر غيره', en: 'No longer among the available choices — choose another' });
        select.classList.add('input-error');
      } else if (err) { err.hidden = true; select.classList.remove('input-error'); }
    }
  }
  function pruneAllocationGrid() {
    var mod = document.getElementById('entForm');
    if (!mod || mod.getAttribute('data-module') !== 'payments') return;
    var supplierId = currentSupplierId();
    var open = approvedOpenInvoicesForSupplier(supplierId, null);
    var candidates = open.map(function (i) {
      return { id: i.id, label: (i.docNo || i.id) + ' · ' + L2({ ar: 'متبقٍّ', en: 'open' }) + ' ' + openAmountLabel(i.id) };
    });
    document.querySelectorAll('#linesWrap [name="invoice"]').forEach(function (sel) { rebuildRefSelect(sel, candidates); });
  }
  /* 🔴 وُسِّع (البند ٤ب) — لإشعار الدائن، المرشَّحون فواتير المورّد نفسه
     المفتوحة فقط (متبقٍّ > ٠) — تماماً approvedOpenInvoicesForSupplier
     أعلاه، لا نسخة ثانية من نفس الفحص. للمستخلص يبقى السلوك بالحرف: أيّ
     فاتورة/مستخلص معتمد لنفس المورّد، بلا شرط المتبقّي (الروابط هناك
     تراكمية «مُعتمَد سابقاً»، لا سداداً).
     🔴 WIDENED (item 4b) — for a credit note, candidates are the SAME
     supplier's OPEN invoices only (open > 0) — exactly
     approvedOpenInvoicesForSupplier above, not a second copy of the same
     check. For a certificate the behaviour stays byte-identical: any
     approved invoice/certificate of the same supplier, no open-balance
     condition (its links are a cumulative "previously certified", not a
     payment). */
  function pruneLinksGrid() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return;
    var kindEl = document.querySelector('#entForm [name="kind"]');
    var isCredit = kindEl && kindEl.value === 'credit';
    var supplierId = currentSupplierId();
    var editingId = form.getAttribute('data-record-id') || null;
    var candidates;
    if (isCredit) {
      candidates = approvedOpenInvoicesForSupplier(supplierId, editingId).map(function (i) {
        return { id: i.id, label: (i.docNo || i.id) + ' · ' + L2({ ar: 'متبقٍّ', en: 'open' }) + ' ' + openAmountLabel(i.id) };
      });
    } else {
      candidates = (global.Store ? Store.all('supplierInvoices') : []).filter(function (inv) {
        if (inv.id === editingId) return false;
        if (inv.supplier !== supplierId) return false;
        if (inv.status !== 'approved') return false;
        if (inv.kind === 'credit') return false;
        return true;
      }).map(function (i) {
        return { id: i.id, label: (i.docNo || i.id) + ' · ' + money(i.grandTotal != null ? i.grandTotal : i.subTotal) };
      });
    }
    document.querySelectorAll('#linesWrap [name="linkedDoc"]').forEach(function (sel) { rebuildRefSelect(sel, candidates); });
  }

  /* ── auto-fill: اختيار مستند رابط يملأ linkedAmount بقيمته (تُنقَص لاحقاً
     فقط — لا تُرفَض هنا، الحارس عند الحفظ فقط عبر validateSupplierInvoice
     غير المباشر: previouslyCertified محسوبة من نفس هذا الحقل) ──────────── */
  /* 🔴 عطلٌ حقيقيّ وُجد بالتشغيل الفعلي (t10) — لا بالقراءة وحدها. افترضتُ
     أنّ سطراً فارغاً جديداً يحمل linkedAmount فارغاً (''/null) — لكنّ سطر
     الإضافة الحقيقي («+ إضافة سطر») ينفّذه entity.js's blankLine() (لا
     mod.quickEntry.newLine الذي كتبته هنا — لا يستدعيه أحد أبداً، تحقّقتُ
     بالبحث؛ كودٌ ميتٌ حالياً)، وblankLine() تُصفِّر حقول money/number إلى
     الرقم صفر حرفياً لا إلى فارغ: `f.type==='number'||f.type==='money' ?
     0 : ''`. فكانت linkedAmount تصل الخانة الجديدة بالقيمة النصّية "0"،
     لا ""، فشرط «فارغ» هنا لم يتحقّق أبداً، وautoFillLinkedAmount لم
     تملأ شيئاً قط. مُثبَت: CERT_1 (t10) أظهرت amount:"0" بعد قبول الرابط
     بلوحة المفاتيح تماماً. الإصلاح: نعامل صفراً كفارغ هنا أيضاً — سطرٌ
     linkedAmount=0 حقيقي لن يجتاز requiredFields (amount>0) أصلاً، فلا
     خسارة لحالة مشروعة.
     🔴 A REAL DEFECT found by actually running this (t10) — not by
     reading alone. I assumed a fresh blank row carries an empty
     linkedAmount ('' /null) — but the REAL "+ Add row" action runs
     entity.js's OWN blankLine() (never mod.quickEntry.newLine, which I
     wrote here but nothing ever calls — checked by searching; dead code
     today), and blankLine() defaults money/number fields to the NUMBER
     zero, literally: `f.type==='number'||f.type==='money' ? 0 : ''`. So a
     fresh linkedAmount cell arrived holding the STRING "0", not "", so
     the "empty" check here never matched, and autoFillLinkedAmount never
     filled anything at all. PROVEN: CERT_1 (t10) showed amount:"0" right
     after accepting a link via the keyboard. THE FIX: treat zero as
     empty here too — a genuine linkedAmount of 0 would never pass
     requiredFields (amount>0) anyway, so no legitimate case is lost. */
  /* ── قيمة الإشعار الرأسية — subTotal مباشرةً، لا grandTotal ────────────
     🔴 عطلٌ حقيقيّ وُجد بالتشغيل (t10، ١٩ سبتمبر) — القراءة الأولى هنا
     كانت تُفضِّل grandTotal (حقل "calc" يُعاد حسابه بواسطة recalc العامة
     في entity.js عند تغيّر subTotal) على subTotal نفسه — بنفس ترتيب
     invoiceBase في desk-ledgers.js، الصحيح لمستندٍ محفوظٍ فعلاً (عمودٌ
     حقيقي متزامن دوماً)، لكن غير الموثوق هنا: أثناء التحرير الحيّ قد
     يقرأ العنصر "0" (قيمته قبل إعادة الحساب) للحظةٍ بعد dispatchEvent
     مباشرة على subTotal — فيُقرأ "0" (قيمة غير فارغة) بدل الانتقال لقراءة
     subTotal الصحيحة (١,٥٠٠)، فيُنتج مِلءً تلقائياً بصفرٍ دائماً. الإصلاح:
     قيمة إشعار الدائن تُكتَب يدوياً في subTotal مباشرةً (لا تُحسَب من
     الروابط كالمستخلص) — فهي المصدر الوحيد الموثوق هنا، تماماً كما
     تعامله refreshCertMath نفسها مصدراً حيّاً وحيداً للمستخلص.
     🔴 A REAL DEFECT found by running it (t10, 19 Sept) — the first
     reading here PREFERRED grandTotal (a "calc" field recomputed by
     entity.js's generic recalc when subTotal changes) over subTotal
     itself — the SAME precedence as desk-ledgers.js's invoiceBase, which
     is correct for an ALREADY-SAVED document (a real, always-synchronous
     column) but unreliable HERE: during live editing the element can
     still read "0" (its value from before the recalc) for a moment right
     after dispatching the event on subTotal — reading "0" (a non-empty
     value) instead of falling through to the correct subTotal (1,500),
     always producing a zero auto-fill. THE FIX: a credit note's value is
     TYPED DIRECTLY into subTotal (never computed from the links, unlike a
     certificate) — it is the only trustworthy source here, exactly how
     refreshCertMath itself already treats subTotal as the certificate's
     one live source. */
  function creditHeaderTotal() {
    var s = document.querySelector('#entForm [name="subTotal"]');
    return s ? num(s.value) : 0;
  }
  /* المتبقّي غير المربوط من قيمة الإشعار — كل الأسطر الأخرى، لا هذا السطر ·
     the credit's REMAINING UNLINKED value — every OTHER row, never this
     one (its own linkedAmount is what we are about to set). */
  function creditRemainingUnlinked(excludeRow) {
    var total = creditHeaderTotal();
    var linked = 0;
    document.querySelectorAll('#linesWrap [data-li] [name="linkedAmount"]').forEach(function (el) {
      if (excludeRow && el.closest('[data-li]') === excludeRow) return;
      linked += num(el.value);
    });
    return total - linked;
  }
  /* 🔴 وُسِّع (البند ٤ب) — لإشعار الدائن، القيمة الكاملة للفاتورة (السلوك
     القديم، لا يزال صحيحاً للمستخلص) قد تتجاوز مرتين: متبقّي تلك الفاتورة
     وحدها، أو ما تبقّى من قيمة الإشعار نفسه غير المربوط بعد. المِلء
     التلقائي هنا الأصغر بينهما — لا يُرفَض شيء، مجرّد اقتراحٍ يمكن تعديله.
     🔴 WIDENED (item 4b) — for a credit note, the invoice's FULL value
     (the old behaviour, still correct for a certificate) could exceed
     TWO different ceilings: that invoice's OWN open balance, or the
     credit note's OWN remaining unlinked value. The auto-fill here is the
     SMALLER of the two — nothing is refused, this is only a proposal the
     user may still edit. */
  function autoFillLinkedAmount(rowSelect) {
    var tr = rowSelect.closest('[data-li]'); if (!tr) return;
    var amtEl = tr.querySelector('[name="linkedAmount"]');
    if (!amtEl) return;
    var inv = rowSelect.value ? (global.Store ? Store.find('supplierInvoices', rowSelect.value) : null) : null;
    if (!inv || !(amtEl.value === '' || amtEl.value === null || num(amtEl.value) === 0)) return;
    var kindEl = document.querySelector('#entForm [name="kind"]');
    if (kindEl && kindEl.value === 'credit') {
      var openVal = invoiceOpenAmount(inv.id);
      if (openVal === null) openVal = 0; /* DeskLedgers غائبة — فشلٌ آمن، لا رقمٌ غير موثوق · DeskLedgers absent — fail-safe, not an untrustworthy number */
      var remaining = creditRemainingUnlinked(tr);
      amtEl.value = Math.max(0, Math.min(openVal, remaining));
    } else {
      amtEl.value = num(inv.grandTotal != null ? inv.grandTotal : inv.subTotal);
    }
    amtEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
  /* ── ملخّص حيّ لإشعار الدائن — «مربوط X من Y» ─────────────────────────────
     LIVE credit-note summary — «مربوط X من Y» (linked X of Y), the SAME
     idempotent data-azd-sig guard as renderCertFoot above (no new DOM
     mutation unless the content actually changed — the SAME infinite-loop
     immunity, not a second copy of the technique). */
  function renderCreditFoot(total, linked) {
    var foot = document.getElementById('linesFoot');
    if (!foot) return;
    var sig = 'credit:' + total + ':' + linked;
    var old = foot.querySelector('.azd-sup-foot');
    if (old && old.getAttribute('data-azd-sig') === sig) return;
    if (old) old.remove();
    var colspan = INVOICE_LINK_FIELDS.length;
    var row = document.createElement('tr');
    row.className = 'azd-sup-foot';
    row.setAttribute('data-azd-sig', sig);
    row.innerHTML = '<td colspan="' + colspan + '" class="text-e small">' +
      esc(L2({ ar: 'مربوط', en: 'Linked' })) + ' <b>' + money(linked) + '</b> ' +
      esc(L2({ ar: 'من', en: 'of' })) + ' <b>' + money(total) + '</b></td><td></td><td></td>';
    foot.appendChild(row);
  }
  function refreshCreditMath() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return;
    var kindEl = document.querySelector('#entForm [name="kind"]');
    if (!kindEl || kindEl.value !== 'credit') { removeCertFoot(); return; }
    renderCreditFoot(creditHeaderTotal(), sumLinkedAmounts());
  }
  /* ── مُوزِّع حساب الروابط حسب النوع — لا محرّك ثالث ──────────────────────
     DISPATCHES the links math by kind — never a third engine; certificate
     keeps its own function verbatim (its inputs/refusal-testing separation
     comment above still applies to it alone). */
  function refreshLinksMath() {
    var kindEl = document.querySelector('#entForm [name="kind"]');
    var kind = kindEl ? kindEl.value : '';
    if (kind === 'certificate') refreshCertMath();
    else if (kind === 'credit') refreshCreditMath();
    else removeCertFoot();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٥ · إظهار/إخفاء الأقسام حسب payeeType/kind — بلا محرّك ثانٍ، مجرّد
        style.display على .form-section/[data-fname]
        SHOW/HIDE sections by payeeType/kind — no second engine, plain
        style.display on .form-section/[data-fname]
     ═══════════════════════════════════════════════════════════════════ */
  function linesSection() {
    var wrap = document.getElementById('linesWrap');
    return wrap ? wrap.closest('.form-section') : null;
  }
  function fieldLabel(name) {
    return document.querySelector('#entForm [data-fname="' + name + '"]');
  }

  function enhancePaymentVisibility() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'payments') return;
    var payeeTypeEl = document.querySelector('#entForm [name="payeeType"]');
    var isSupplier = !!payeeTypeEl && payeeTypeEl.value === 'supplier';
    var sec = linesSection();
    if (sec) sec.hidden = !isSupplier;
    if (isSupplier) { pruneAllocationGrid(); enhancePaymentFoot(); }
  }

  /* 🔴 وُسِّع (البند ٤ب، Fable ١٩ سبتمبر) — شبكة الروابط كانت حصراً على
     kind=مستخلص. إشعار الدائن (kind=credit) يحتاجها بالضبط لنفس السبب:
     ربط قيمته بفاتورةٍ بعينها للمورّد نفسه (DeskLedgers.invoiceOpen
     يقرأ credit.lines بهذا الشكل بالفعل، منذ إصلاح desk-ledgers.js — لا
     شيء جديد على القاعدة). certifiedToDate يبقى حصراً على المستخلص —
     الإشعار له قيمته الخاصة في subTotal مباشرةً، لا حساباً تراكمياً.
     🔴 WIDENED (item 4b, Fable 19 Sept) — the links grid used to be
     certificate-only. A credit note (kind=credit) needs it for exactly
     the same reason: linking its value to ONE specific invoice of the
     same supplier (DeskLedgers.invoiceOpen already reads credit.lines in
     this exact shape — nothing new on the database). certifiedToDate
     stays certificate-only — a credit note's own value is entered
     directly in subTotal, never a cumulative certificate computation. */
  function enhanceInvoiceVisibility() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return;
    var kindEl = document.querySelector('#entForm [name="kind"]');
    var kind = kindEl ? kindEl.value : '';
    var isCert = kind === 'certificate';
    var isCredit = kind === 'credit';
    var sec = linesSection();
    if (sec) sec.hidden = !(isCert || isCredit);
    var certField = fieldLabel('certifiedToDate');
    if (certField) certField.hidden = !isCert;
    if (isCert) { pruneLinksGrid(); refreshCertMath(); }
    else if (isCredit) { pruneLinksGrid(); refreshCreditMath(); }
    else { removeCertFoot(); }
    refreshDuplicateHint();
  }

  /* ── ملخّص حيّ لتوزيع سند الصرف (المخصَّص/غير المخصَّص) — صفٌّ بصريٌّ بحت،
     يُلحَق دائماً في #linesFoot عبر appendChild (يبقى في آخر الجدول مهما
     كان ترتيب مراقبات desk-grid.js نفسها)، ولا يُحفَظ كحقل إطلاقاً (انظر
     تعليق «لا totals هنا» أعلاه).
     LIVE summary of the payment allocation (allocated/unallocated) — a
     PURELY VISUAL row, always appended to #linesFoot via appendChild
     (stays at the very end regardless of desk-grid.js's own observer
     ordering), and never saved as a field at all (see the "NO totals
     here" comment above). */
  function paymentAllocSummary() {
    var amtEl = document.querySelector('#entForm [name="amount"]');
    var voucherAmount = amtEl ? num(amtEl.value) : 0;
    var allocated = 0;
    document.querySelectorAll('#linesWrap [data-li] [name="amount"]').forEach(function (el) { allocated += num(el.value); });
    return { voucherAmount: voucherAmount, allocated: allocated, remainder: voucherAmount - allocated };
  }
  /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (t10، انظر تعليق renderCertFoot أدناه
     للتفصيل الكامل لنفس الفخّ) — تجميد كامل، لا استثناء، لا ردّ من CDP.
     entity.js's updateLineTotals تكتب foot.innerHTML='' فارغةً في كل
     recalc() لوحدة payments (لا mod.lines.totals معرَّفة هنا عمداً — انظر
     تعليق «لا totals هنا» أعلاه) — فتمحو صفّنا `.azd-sup-foot` مع كل
     ضغطة، ودالّتنا كانت تُعيد إنشاءه بلا شرط أيضاً، فيتصادم مع علامة
     desk-grid.js الخاصّة (.azd-linecounts) التي تُمحى بنفس الطفرة أيضاً،
     فتُعاد إضافتها هي الأخرى، وهكذا حلقة لا نهائية بين الملفّين. الإصلاح:
     لا نكتب <tr> جديداً إلا إن تغيّر محتواه فعلاً (data-azd-sig)، بنفس
     منطق desk-grid.js (data-eq-name) حرفياً.
     🔴 A SERIOUS defect found by actually running this (t10, see
     renderCertFoot's comment below for the full trace of the same trap)
     — a complete freeze, no exception, no CDP reply. entity.js's
     updateLineTotals writes foot.innerHTML='' on every recalc() for the
     payments module (no mod.lines.totals is defined here on purpose —
     see the "NO totals here" comment above), wiping our own
     `.azd-sup-foot` row on every keystroke, and this function used to
     recreate it unconditionally too — colliding with desk-grid.js's own
     marker (.azd-linecounts), which is wiped by the SAME mutation and
     re-added too, forming an infinite loop between the two files. THE
     FIX: never write a new <tr> unless its content actually changed
     (data-azd-sig) — the exact same logic desk-grid.js already uses
     (data-eq-name), verbatim. */
  function enhancePaymentFoot() {
    var foot = document.getElementById('linesFoot');
    if (!foot) return;
    var s = paymentAllocSummary();
    var over = s.voucherAmount > 0 && s.allocated > s.voucherAmount + 0.004;
    var sig = 'alloc:' + s.voucherAmount + ':' + s.allocated + ':' + s.remainder + ':' + over;
    var old = foot.querySelector('.azd-sup-foot');
    if (old && old.getAttribute('data-azd-sig') === sig) return;
    if (old) old.remove();
    var colspan = PAYMENT_LINE_FIELDS.length;
    var row = document.createElement('tr');
    row.className = 'azd-sup-foot' + (over ? ' azd-sup-foot-danger' : '');
    row.setAttribute('data-azd-sig', sig);
    row.innerHTML = '<td colspan="' + colspan + '" class="text-e small">' +
      (over
        ? esc(L2({ ar: 'المخصَّص يزيد عن قيمة السند', en: 'The allocated amount exceeds the voucher amount' }))
        : esc(L2({ ar: 'المخصَّص', en: 'Allocated' })) + ' <b>' + money(s.allocated) + '</b>' +
          (s.remainder > 0 && s.allocated > 0 ? ' · ' + esc(L2({ ar: 'غير مخصّص (دفعة مقدمة)', en: 'Unallocated (advance)' })) + ' <b>' + money(s.remainder) + '</b>' : '')
      ) + '</td><td></td><td></td>';
    foot.appendChild(row);
  }

  /* ── ملخّص حيّ لحساب المستخلص + auto-fill لـsubTotal ─────────────────────
     LIVE certificate math summary + subTotal auto-fill
     -----------------------------------------------------------------
     يُعاد الحساب فقط عند تغيّر مُدخَلاته (certifiedToDate أو أيّ سطر رابط)
     — لا عند تعديل subTotal نفسه، حتى يبقى ممكناً كتابة قيمة مغايرة عمداً
     تُرفَض عند الحفظ (سيناريو «مستخلص مختلط ١٦٬٠٠٠ يُرفَض» في العقد). لولا
     هذا الفصل لصار اختبار الرفض مستحيلاً — أيّ رقمٍ يكتبه المستخدم كان
     سيُستبدَل فوراً بالمحسوب.
     Recomputed ONLY when its OWN inputs change (certifiedToDate or any
     linked row) — never when subTotal itself is edited, so it stays
     possible to deliberately type a different value that gets refused at
     save (the contract's "a mixed 16,000 certificate is refused"
     scenario). Without this separation that refusal could never be
     tested — any number the user typed would be overwritten instantly by
     the computed one. */
  function sumLinkedAmounts() {
    var s = 0;
    document.querySelectorAll('#linesWrap [data-li] [name="linkedAmount"]').forEach(function (el) { s += num(el.value); });
    return s;
  }
  /* 🔴 عطلٌ ثانٍ حقيقيّ وُجد بالتشغيل الفعلي (t10)، بعد إصلاح التجميد
     أعلاه — طريقٌ غير مباشر كان يُبطِل عمداً السماح بكتابة subTotal
     يدوياً (تعليق الدالّة الأصلي أعلاه، «لا نعيد الحساب عند تعديل
     subTotal نفسه»): تغيير subTotal بأي طريقة (حتى الكتابة اليدوية
     المباشرة لاختبار الرفض) يُطلِق recalc() (لأنّ subTotal حقل رأس
     عادي، وbindForm يستدعي recalc عند أيّ تغيير) — وrecalc تستدعي
     updateLineTotals التي تكتب foot.innerHTML دائماً، وهذه طفرة داخل
     #linesWrap تُشغِّل مراقبنا (bindFormReactivity)، الذي يستدعي
     refreshCertMath من جديد — فكانت الشرط أعلاه (مقارنة القيمة المحسوبة
     بقيمة subTotal الحالية) يجد فرقاً (القيمة المكتوبة يدوياً تخالف
     المحسوبة، وهذا مقصودٌ في اختبار الرفض!) ويُعيد الكتابة فوق ما كتبه
     المستخدم للتوّ — يُبطِل بالضبط الحالة التي صُمِّم الفصل من أجلها.
     مُثبَت: كتابة subTotal=16000 يدوياً (لاختبار مستخلص مختلط) كانت
     تعود تلقائياً إلى 15000 المحسوب، فلا يحدث الرفض المتوقَّع أبداً.
     الإصلاح: لا نقارن بقيمة subTotal الحالية بعد الآن — بل نتذكّر آخر
     «مُدخَلات» حُسِبَ منها (certifiedToDate + مجموع الروابط) بعلامة
     lastCertInputsSig، ونكتب subTotal فقط حين تتغيّر هذه المُدخَلات هي
     نفسها، لا حين يتغيّر subTotal بفعل أيّ سببٍ آخر (كطفرة الفقاعان من
     مراقبنا نفسه). سطرٌ جديد فارغ (بلا روابط) لا يُغيِّر المُدخَلات
     فيبقى subTotal كما كتبه المستخدم آخر مرّة.
     🔴 A SECOND real defect found by actually running this (t10), after
     the freeze fix above — an INDIRECT path was defeating the
     deliberate allowance for typing subTotal by hand (this function's
     own original comment above, "never recompute when subTotal itself is
     edited"): changing subTotal AT ALL (even a deliberate manual edit,
     to test the refusal) fires recalc() (subTotal is an ordinary header
     field, and bindForm calls recalc on any change) — and recalc calls
     updateLineTotals, which ALWAYS writes foot.innerHTML — a mutation
     inside #linesWrap that triggers OUR OWN observer
     (bindFormReactivity), which calls refreshCertMath again — so the
     guard above (comparing the computed value against subTotal's CURRENT
     value) found a difference (the manually typed value deliberately
     disagrees with the computed one!) and immediately overwrote what the
     user had just typed — defeating the EXACT scenario the separation
     was built for. PROVEN: typing subTotal=16000 by hand (to test the
     mixed-certificate refusal) silently reverted to the computed 15,000,
     so the expected refusal never fired at all. THE FIX: stop comparing
     against subTotal's current value entirely — instead remember the
     last INPUTS a computation was made from (certifiedToDate + the sum
     of links) via lastCertInputsSig, and only write subTotal when THOSE
     inputs actually change, never when subTotal changes for any other
     reason (such as our own observer's bubble-through). An empty new row
     (no links yet) does not change the inputs, so subTotal stays exactly
     as the user last typed it. */
  var lastCertInputsSig = null;
  function refreshCertMath() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return;
    var kindEl = document.querySelector('#entForm [name="kind"]');
    if (!kindEl || kindEl.value !== 'certificate') { removeCertFoot(); return; }
    var certToDateEl = document.querySelector('#entForm [name="certifiedToDate"]');
    var certToDate = certToDateEl ? num(certToDateEl.value) : 0;
    var prevCert = sumLinkedAmounts();
    var newWork = certToDate - prevCert;
    var inputsSig = certToDate + ':' + prevCert;
    var subTotalEl = document.querySelector('#entForm [name="subTotal"]');
    if (subTotalEl && inputsSig !== lastCertInputsSig) {
      lastCertInputsSig = inputsSig;
      subTotalEl.value = newWork;
      subTotalEl.dispatchEvent(new Event('input', { bubbles: true }));
    }
    refreshPreviouslyCertifiedDisplay(prevCert);
    renderCertFoot(certToDate, prevCert, newWork);
  }
  /* 🔴 عطلٌ وُجد بالقراءة (تنظيف ١٩ سبتمبر) — previouslyCertified حقلٌ
     للقراءة فقط، وقيمته الحيّة (mod.lines.totals) تُكتَب على draft فقط
     (entity.js's recalc) — لا تُكتَب أبداً فوق عنصر <input> الرأس نفسه،
     فتبقى الخانة المعروضة على الشاشة فارغة/قديمة مهما أُضيفت أو حُذفت
     روابط. الإصلاح: كتابةٌ صريحة، إديمبوتنتية (لا تكتب إلا حين تتغيّر
     القيمة فعلاً — بنفس منطق ملخّص القدم أعلاه)، بلا إطلاق أيّ حدث (عرضٌ
     بصريٌّ بحت، draft.previouslyCertified محسوبةٌ أصلاً بمعزلٍ عن هذا).
     رقمٌ خامٌ بلا تنسيق فواصل الآلاف عمداً — الحقل type="number" (money،
     غير calc)، وأيّ فاصلة تجعل المتصفّح يرفض القيمة صامتاً ويُفرِغ الخانة.
     A DEFECT found by reading (19 Sept cleanup) — previouslyCertified is
     a read-only field, and its live value (mod.lines.totals) is written
     onto the draft ONLY (entity.js's recalc) — never onto the header
     <input> element itself, so the box shown on screen stays
     blank/stale no matter how many links are added or removed. THE FIX:
     an explicit, IDEMPOTENT write (only when the value actually changes —
     the same logic as the foot summary above), firing no event at all (a
     purely visual refresh; draft.previouslyCertified is already computed
     independently of this). Deliberately a RAW number with no thousands
     separator — the field is type="number" (money, not calc), and a
     comma makes the browser silently reject the value and blank the box. */
  function refreshPreviouslyCertifiedDisplay(prevCert) {
    var el = document.querySelector('#entForm [name="previouslyCertified"]');
    if (!el) return;
    if (Number(el.value) === prevCert) return;
    el.value = prevCert;
  }
  /* 🔴 نصّ الملخّص — تحديث المنسِّق (١٩ سبتمبر، الوكيل يبني جانب القاعدة
     الآن): مستخلص ملخّص (الجديد = صفر) يُحفظ مرجعاً فقط ولا يُرسل أبداً
     (القاعدة الأساسية ترفض فاتورة/مستخلص بقيمة صفر عند الإرسال، ونُبقيها).
     النصّ هنا يطابق ما سيراه المستخدم على زرّ الإرسال المعطَّل أيضاً —
     مصدرٌ واحد للنصّ، انظر SUMMARY_NO_SEND_MSG أدناه.
     🔴 SUMMARY WORDING — coordinator update (19 Sept, the DB side is
     being built now): a summary certificate (new work = 0) is saved as a
     reference ONLY and never sent (the base rule refuses a zero-value
     invoice/certificate at submit, and we keep it). The text here matches
     what the user sees on the disabled Send button too — one source of
     the wording, see SUMMARY_NO_SEND_MSG below. */
  /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (t10) — تجميد كامل للمتصفّح، بلا أي
     استثناء يُرمى، بلا أي ردّ من CDP. نفس فخّ markStaleEquipment بالحرف
     (desk-grid.js) لكن بين ملفَّين مختلفَين هذه المرّة:
     entity.js's recalc() يستدعي updateLineTotals التي تكتب
     foot.innerHTML=h في كل تغيير على حقل رأسٍ محسوب أو أيّ سطر — وكانت
     هذه الدالّة تُعيد إنشاء <tr> جديداً بلا شرط في كل نداء. فحين تُطلِق
     refreshCertMath حدث input على subTotal (ليُحدَّث draft.subTotal)،
     يستدعي ذلك recalc → updateLineTotals → foot.innerHTML='...' التي
     تمحو علامة desk-grid.js الخاصّة (.azd-linecounts) أيضاً — فيُعيد
     مراقب desk-grid.js إضافتها (طفرة أخرى)، وهذه الطفرة تُشغِّل مراقبنا
     نحن (bindFormReactivity)، الذي يستدعي refreshCertMath من جديد، التي
     تكتب subTotal من جديد (نفس القيمة، لكن بلا شرط) وتُطلِق الحدث من
     جديد... حلقة لا نهائية بين ثلاثة أطراف (recalc، مراقب desk-grid.js،
     مراقبنا) بلا أي فاصل زمني. مُثبَت بالتشغيل: t10 تجمّد تماماً عند أول
     تبديل kind إلى «مستخلص» بعد اعتماد فاتورة واحدة على الأقلّ لنفس
     المورّد (SI_D2، بعد SI_D1). الإصلاح هنا (١) لا نكتب <tr> جديداً إلا
     عند تغيّر محتواه فعلاً (data-azd-sig، نفس منطق desk-grid.js's
     data-eq-name)، و(٢) refreshCertMath (أعلاه) لا تُطلِق الحدث أصلاً ما
     لم تتغيّر القيمة — طبقتا حماية، لا طبقة واحدة، لضمان كسر الحلقة من
     أكثر من نقطة.
     🔴 A SERIOUS defect found by actually running this (t10) — a complete
     browser freeze, no exception thrown, no CDP reply at all. The EXACT
     SAME trap as markStaleEquipment (desk-grid.js), but between TWO
     DIFFERENT FILES this time: entity.js's recalc() calls
     updateLineTotals, which writes foot.innerHTML=h on every change to a
     computed header field or any line — and this function used to create
     a fresh <tr> unconditionally on every call. So when refreshCertMath
     fired an input event on subTotal (to update draft.subTotal), that
     triggered recalc → updateLineTotals → foot.innerHTML='...', which ALSO
     wiped desk-grid.js's own marker (.azd-linecounts) — so desk-grid.js's
     OWN observer re-added it (another mutation), which triggered OUR OWN
     observer (bindFormReactivity), which called refreshCertMath again,
     which wrote subTotal again (the SAME value, but unconditionally) and
     fired the event again... an infinite loop across three parties
     (recalc, desk-grid.js's observer, our own observer) with no time gap
     at all. PROVEN by running it: t10 froze completely the FIRST time
     kind switched to "certificate" after at least one invoice had already
     been approved for the same supplier (SI_D2, right after SI_D1). THE
     FIX here is (1) never write a new <tr> unless its content actually
     changed (data-azd-sig, the exact same logic as desk-grid.js's
     data-eq-name), and (2) refreshCertMath (above) never fires the event
     at all unless the value actually changed — TWO layers, not one, to
     make sure the loop is broken from more than one point. */
  function renderCertFoot(certToDate, prevCert, newWork) {
    var foot = document.getElementById('linesFoot');
    if (!foot) return;
    var isSummary = Math.abs(newWork) < 0.005;
    var sig = 'cert:' + certToDate + ':' + prevCert + ':' + newWork;
    var old = foot.querySelector('.azd-sup-foot');
    if (old && old.getAttribute('data-azd-sig') === sig) return;
    if (old) old.remove();
    var colspan = INVOICE_LINK_FIELDS.length;
    var row = document.createElement('tr');
    row.className = 'azd-sup-foot' + (isSummary ? ' azd-sup-foot-summary' : '');
    row.setAttribute('data-azd-sig', sig);
    row.innerHTML = '<td colspan="' + colspan + '" class="text-e small">' +
      esc(L2({ ar: 'سابقاً', en: 'Previously' })) + ' <b>' + money(prevCert) + '</b> · ' +
      esc(L2({ ar: 'الجديد', en: 'New' })) + ' <b>' + money(newWork) + '</b>' +
      (isSummary ? ' — ' + esc(L2(SUMMARY_NO_SEND_MSG)) : '') +
      '</td><td></td><td></td>';
    foot.appendChild(row);
  }
  function removeCertFoot() {
    var foot = document.getElementById('linesFoot');
    var old = foot && foot.querySelector('.azd-sup-foot'); if (old) old.remove();
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٦ · تنبيه تكرار رقم الفاتورة — عند الكتابة (تلميح بصري)، وعند الحفظ
        (تحذير Rules.validateSave)
        DUPLICATE INVOICE NUMBER — a typing-time hint, and a
        Rules.validateSave warning
     -----------------------------------------------------------------
     🔴 ملاحظة صادقة عن السلوك القائم فعلاً: rules.js:218-234 يرفض بالفعل
     (خطأ، لا تحذير) نفس المورد + نفس الرقم عند الحفظ، وSETTINGS.
     blockDuplicateInvoice=true افتراضياً — هذا سابقٌ على هذا الملف
     ويبقى كما هو (لا نلمس Rules.SETTINGS، قرار عمل ليس لنا). فالتحذير
     المُضاف هنا في مسار warnings لن يظهر إطلاقاً لهذه الحالة بالذات طالما
     الإعداد مفعَّل (الأخطاء تُقدَّم قبل التحذيرات في entity.js:851-858) —
     ويبقى مفيداً لو عُطِّل الإعداد يوماً. التلميح البصري عند الكتابة
     يعمل في الحالتين لأنه مستقلٌّ تماماً عن Rules.validateSave.
     🔴 An honest note on the CURRENTLY LIVE behaviour: rules.js:218-234
     ALREADY refuses (an ERROR, not a warning) the same supplier + same
     number at save, and SETTINGS.blockDuplicateInvoice=true by default —
     this predates this file and is left exactly as it is (Rules.SETTINGS
     is never touched here — a business decision that is not mine to
     make). So the warning added here in the warnings path will NEVER
     surface for this exact case as long as that setting stays on (errors
     are shown before warnings, entity.js:851-858) — it remains useful if
     that setting is ever turned off. The typing-time visual hint works in
     BOTH cases because it is entirely independent of Rules.validateSave. */
  function duplicateInvoiceMatch() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return null;
    var noEl = document.querySelector('#entForm [name="supplierInvoiceNo"]');
    var supEl = document.querySelector('#entForm [name="supplier"]');
    if (!noEl || !supEl || !noEl.value || !supEl.value) return null;
    var editingId = form.getAttribute('data-record-id') || null;
    var typed = String(noEl.value).trim().toLowerCase();
    var dup = (global.Store ? Store.all('supplierInvoices') : []).filter(function (r) {
      return r.id !== editingId && r.supplier === supEl.value &&
        String(r.supplierInvoiceNo || '').trim().toLowerCase() === typed;
    })[0];
    return dup || null;
  }
  function refreshDuplicateHint() {
    var lab = fieldLabel('supplierInvoiceNo');
    if (!lab) return;
    var hint = lab.querySelector('.azd-dup-hint');
    var dup = duplicateInvoiceMatch();
    if (!dup) { if (hint) hint.remove(); return; }
    if (!hint) { hint = document.createElement('div'); hint.className = 'azd-dup-hint'; lab.appendChild(hint); }
    hint.textContent = L2({
      ar: 'رقم الفاتورة «' + dup.supplierInvoiceNo + '» مُسجَّل من قبل لهذا المورد — تحقّق قبل الحفظ',
      en: 'Invoice number "' + dup.supplierInvoiceNo + '" is already recorded for this supplier — check before saving'
    });
  }

  function installValidateSaveWrap() {
    if (!global.Rules || typeof Rules.validateSave !== 'function' || Rules.validateSave.__azdSupplierWrapped) return;
    var orig = Rules.validateSave;
    var wrapped = function (mod, draft, editingId) {
      var res = orig(mod, draft, editingId);
      if (mod && mod.id === 'supplierInvoices' && draft.supplier && draft.supplierInvoiceNo) {
        var typed = String(draft.supplierInvoiceNo).trim().toLowerCase();
        var dup = (global.Store ? Store.all('supplierInvoices') : []).filter(function (r) {
          return r.id !== editingId && r.supplier === draft.supplier &&
            String(r.supplierInvoiceNo || '').trim().toLowerCase() === typed;
        })[0];
        if (dup) {
          res.warnings.push(L2({
            ar: 'رقم الفاتورة «' + draft.supplierInvoiceNo + '» مُسجَّل من قبل لهذا المورد في المستند ' + (dup.docNo || '') + '. تحقّق قبل المتابعة.',
            en: 'Invoice number "' + draft.supplierInvoiceNo + '" is already recorded for this supplier on ' + (dup.docNo || '') + '. Check before continuing.'
          }));
        }
      }
      return res;
    };
    wrapped.__azdSupplierWrapped = true;
    Rules.validateSave = wrapped;
  }
  installValidateSaveWrap();

  /* ── مستخلص ملخّص — «إرسال للمراجعة» يُستبدَل بزرٍّ معطَّل يشرح السبب ─────
     تحديث المنسِّق (١٩ سبتمبر): الجديد = صفر يعني لا قيد له إطلاقاً —
     يُحفظ مرجعاً فقط ولا يُرسل أبداً (القاعدة الأساسية ترفض فاتورة/مستخلص
     بقيمة صفر عند الإرسال من طرف القاعدة أيضاً — هذا زرٌّ يمنع محاولة لن
     تنجح، لا اختراعاً لقاعدة عملٍ جديدة). نفس نمط «_blockedReview»/
     «_blockedApprove» في workflow.js — مفتاحٌ خاصّ، معطَّل، نصّه هو السبب.
     A SUMMARY CERTIFICATE — «إرسال للمراجعة» (Send) is REPLACED by a
     disabled button explaining why. Coordinator update (19 Sept): new
     work = 0 means it carries NO entry at all — saved as a reference
     only and never sent (the base rule also refuses a zero-value
     invoice/certificate at submit on the DATABASE side — this button
     only stops an attempt that could never succeed; it invents no new
     business rule). Same pattern as workflow.js's own "_blockedReview"/
     "_blockedApprove" — a distinctly-keyed, disabled entry whose LABEL
     IS the reason. */
  function isSummaryCertificateDraft(rec) {
    if (!rec || rec.kind !== 'certificate' || rec.status !== 'draft') return false;
    var newWork = num(rec.certifiedToDate) - num(rec.previouslyCertified);
    return Math.abs(newWork) < 0.005;
  }
  function installWorkflowActionsWrap() {
    if (!global.Workflow || typeof Workflow.actions !== 'function' || Workflow.actions.__azdSupplierWrapped) return;
    var orig = Workflow.actions;
    var wrapped = function (moduleId, rec) {
      var out = orig(moduleId, rec);
      if (moduleId === 'supplierInvoices' && isSummaryCertificateDraft(rec)) {
        out = out.map(function (a) {
          if (a.key !== 'submit') return a;
          return { key: '_summaryNoSend', label: L2(SUMMARY_NO_SEND_MSG), disabled: true, cls: 'btn-outline' };
        });
      }
      return out;
    };
    wrapped.__azdSupplierWrapped = true;
    Workflow.actions = wrapped;
  }
  installWorkflowActionsWrap();

  /* ── تلميح المعدة المطلوبة (بصري، ليس K05 — حقل رأس لا خليّة شبكة) ──────
     A required-equipment HINT (visual, not K05 — a header field, not a
     grid cell). */
  function refreshEquipmentHint() {
    var form = document.getElementById('entForm');
    if (!form || form.getAttribute('data-module') !== 'supplierInvoices') return;
    var ciEl = document.querySelector('#entForm [name="costItem"]');
    var eqLabel = fieldLabel('equipment');
    if (!eqLabel) return;
    var ci = ciEl && ciEl.value && global.Store ? Store.find('costItems', ciEl.value) : null;
    var needs = !!(ci && ci.type === 'equipment');
    var hint = eqLabel.querySelector('.azd-equip-required-hint');
    if (needs) {
      if (!hint) { hint = document.createElement('div'); hint.className = 'azd-equip-required-hint'; eqLabel.appendChild(hint); }
      hint.textContent = L2({ ar: 'مطلوبة — بند التكلفة من نوع معدات', en: 'Required — this cost item is of type equipment' });
    } else if (hint) { hint.remove(); }
  }

  /* ═══════════════════════════════════════════════════════════════════
     ٧ · الحقن في UI.modal — طور فتح النموذج (نفس نمط desk-grid.js/desk-
        cell-picker.js/desk-side-panel.js: كل ملف يلفّ UI.modal بشكل
        مستقلّ، والتسلسل معروفٌ آمناً في هذا المشروع)
        INJECT via UI.modal — form-open time (the SAME pattern as desk-
        grid.js/desk-cell-picker.js/desk-side-panel.js: every file wraps
        UI.modal independently, and this chaining is a proven-safe
        sequence on this project)
     ═══════════════════════════════════════════════════════════════════ */
  function bindFormReactivity() {
    var form = document.getElementById('entForm');
    if (!form) return;
    if (form.__azdSupplierBound) return;
    form.__azdSupplierBound = true;
    form.addEventListener('change', function (e) {
      var name = e.target && e.target.getAttribute && e.target.getAttribute('name');
      if (!name) return;
      if (name === 'payeeType' || name === 'supplier') enhancePaymentVisibility();
      if (name === 'kind') enhanceInvoiceVisibility();
      if (name === 'supplier') { pruneLinksGrid(); refreshDuplicateHint(); }
      if (name === 'costItem') refreshEquipmentHint();
      if (name === 'amount' || name === 'invoice') enhancePaymentFoot();
      if (name === 'certifiedToDate') refreshCertMath();
      if (name === 'linkedDoc') { autoFillLinkedAmount(e.target); pruneLinksGrid(); refreshLinksMath(); }
      if (name === 'linkedAmount') refreshLinksMath();
      /* البند ٤ب — قيمة إشعار الدائن نفسها (subTotal/grandTotal) تُدخَل يدوياً
         (لا تُحسَب من الروابط كما في المستخلص) — الملخّص «مربوط X من Y» يجب
         أن يتحدّث فور كتابتها أيضاً. item 4b — the credit note's OWN value
         (subTotal/grandTotal) is typed by hand (never computed from the
         links, unlike a certificate) — the «linked X of Y» summary must
         refresh the moment it changes too. */
      if ((name === 'subTotal' || name === 'grandTotal') && form.getAttribute('data-module') === 'supplierInvoices') refreshLinksMath();
    });
    form.addEventListener('input', function (e) {
      var name = e.target && e.target.getAttribute && e.target.getAttribute('name');
      if (name === 'supplierInvoiceNo') refreshDuplicateHint();
      if (name === 'amount') enhancePaymentFoot();
      if ((name === 'subTotal' || name === 'grandTotal') && form.getAttribute('data-module') === 'supplierInvoices') refreshLinksMath();
    });
    /* إضافة/حذف سطر تُعيد بناء #linesWrap بالكامل (renderLines) — تقليم
       الخيارات وتحديث الملخّص يجب أن يُعادا بعدها، عبر مراقب مستقلّ بنفس
       حصانة desk-grid.js ضدّ الحلقة اللانهائية (فصل المراقب أثناء عمله).
       Add/remove-line fully rebuilds #linesWrap (renderLines) — pruning
       and the summary must be redone after that, via an OWN observer with
       the SAME immunity desk-grid.js uses against the infinite loop
       (disconnect the observer while it runs). */
    var wrap = document.getElementById('linesWrap');
    if (wrap && !wrap.__azdSupplierObserved) {
      wrap.__azdSupplierObserved = true;
      var obs = new MutationObserver(function () {
        obs.disconnect();
        var mid = form.getAttribute('data-module');
        if (mid === 'payments') { pruneAllocationGrid(); enhancePaymentFoot(); }
        else if (mid === 'supplierInvoices') { pruneLinksGrid(); refreshLinksMath(); }
        obs.observe(wrap, { childList: true, subtree: true });
      });
      obs.observe(wrap, { childList: true, subtree: true });
    }
    /* 🔴 عطلٌ حقيقيّ خطير وُجد بالتشغيل الفعلي (t10) — لا بالقراءة وحدها.
       نفس فخّ paperRef/linePaperRef (desk-settlement-lines.js) لكن هنا في
       سند الصرف بالذات: عقد البيانات يُلزم بأن يحمل كل سطر توزيع مفتاح
       JSON اسمه «amount» بالحرف (az_acc_payment_allocation_guard/
       az_acc_invoice_open تقرآن l->>'amount')، وحقل رأس سند الصرف نفسه
       اسمه «amount» أيضاً (schema.js، لا نغيّره). فحقلا name="amount"
       يتعايشان داخل نفس <form id="entForm"> — أحدهما في الرأس، والآخر
       داخل #linesWrap. entity.js's bindForm() يُركِّب مستمعاً على #entForm
       نفسه يلتقط أيّ حدث input/change فقاعيّ (bubbling) من أيّ عنصر، ويحلّ
       الحقل بـfieldByName(mod, el.name) — التي تبحث في mod.fields (حقول
       الرأس) فقط، فتجد دائماً حقل الرأس، فتكتب draft.amount (الرأس) فوق
       ما يكتبه onLineChange في draft.lines[i].amount بصمت — عند أيّ تغيير
       على خليّة المبلغ داخل الشبكة. مُثبَت بالتشغيل: PV_2 (t10) كان
       amount المحفوظ فعلياً على الخادم = 8,000 (قيمة سطر التخصيص) بدل
       ١٥،٠٠٠ (القيمة المكتوبة في حقل الرأس) — لأنّ خليّة السطر كُتبت بعد
       حقل الرأس زمنياً فغلبت عليه.
       الإصلاح: لا نُعيد تسمية أيّ حقل (كلاهما مُلزَمان بالاسم — الرأس من
       schema.js، السطر من عقد قاعدة البيانات) — بل نمنع الحدث من
       الفقاعان (bubble) متجاوزاً #linesWrap إلى #entForm أصلاً، بـ
       e.stopPropagation() على مستمعٍ مُلحَق على #linesWrap نفسه (يبقى حيّاً
       عبر كل إعادة رسم للشبكة، فهو عنصرٌ واحد لا يُستبدَل — renderLines
       تستبدل .innerHTML فقط). ترتيب المراحل يضمن أنّ onLineChange
       (مُلحَق مباشرةً على خليّة السطر، طور «عند الهدف») يعمل أولاً بلا أي
       تغيير، ثم يُوقَف الحدث هنا قبل أن يصل مستمع #entForm الفقاعيّ إطلاقاً.
       🔴 A SERIOUS real defect found by actually running this (t10) — not
       by reading alone. The SAME trap as paperRef/linePaperRef (desk-
       settlement-lines.js), but here on the payment voucher itself: the
       data contract requires every allocation line to carry a JSON key
       literally named "amount" (az_acc_payment_allocation_guard/
       az_acc_invoice_open both read l->>'amount'), and the payment
       voucher's OWN header field is ALSO named "amount" (schema.js,
       never changed here). Both name="amount" elements coexist inside
       the SAME <form id="entForm"> — one in the header, one inside
       #linesWrap. entity.js's bindForm() installs a listener on #entForm
       ITSELF that catches any BUBBLING input/change event from any
       element and resolves the field with fieldByName(mod, el.name) —
       which searches mod.fields (HEADER fields) ONLY, so it always finds
       the HEADER's own field, silently overwriting draft.amount (header)
       with whatever onLineChange just wrote into
       draft.lines[i].amount — on EVERY change to an allocation line's
       amount cell. PROVEN by running it: PV_2 (t10) had its SERVER-SIDE
       amount actually saved as 8,000 (the allocation LINE's value)
       instead of 15,000 (what was typed into the header field) — because
       the line cell was written to AFTER the header field, and won the
       race for the shared draft key.
       THE FIX: neither field can be renamed (the header is bound by
       schema.js, the line by the database contract) — so the event is
       stopped from ever bubbling PAST #linesWrap to #entForm at all, via
       e.stopPropagation() on a listener attached to #linesWrap itself
       (a single, persistent element that survives every grid re-render —
       renderLines() only replaces its .innerHTML). Phase ordering
       guarantees onLineChange (attached directly to the line cell, fires
       "at target") runs first, completely unaffected; the event is
       stopped here BEFORE it would ever reach #entForm's bubbling
       listener at all. */
    if (wrap && !wrap.__azdAmountCollisionGuard && form.getAttribute('data-module') === 'payments') {
      wrap.__azdAmountCollisionGuard = true;
      ['input', 'change'].forEach(function (evt) {
        wrap.addEventListener(evt, function (e) {
          if (!(e.target && e.target.getAttribute && e.target.getAttribute('name') === 'amount')) return;
          e.stopPropagation();
          /* الحدث لن يصل الآن مستمع #entForm الذي كان يُحدِّث الملخّص —
             نُحدِّثه من هنا مباشرةً بدلاً منه. This event will no longer
             reach #entForm's own listener (which used to refresh the
             foot) — refresh it directly from here instead. */
          enhancePaymentFoot();
        });
      });
    }
  }

  function onFormOpen() {
    var form = document.getElementById('entForm');
    if (!form) return;
    var mid = form.getAttribute('data-module');
    if (mid !== 'payments' && mid !== 'supplierInvoices') return;
    /* 🔴 يجب إعادة تصفير علامة آخر «مُدخَلات» عند كل فتحٍ جديد للنموذج —
       وإلا يبقى مستخلصٌ جديدٌ بنفس رقمَي certifiedToDate ومجموع الروابط
       مثل مستخلصٍ سابق (مثلاً اختبار «مستخلص خاطئ» يكرّر نفس أرقام
       المستخلص الصحيح عمداً) يظنّ مُدخَلاته «لم تتغيّر» فلا يملأ subTotal
       تلقائياً من الأصل — عطلٌ وُجد بالتشغيل الفعلي أثناء إصلاح الحلقة
       أعلاه، لا افتراضاً.
       🔴 lastCertInputsSig MUST be reset on every fresh form open — or a
       NEW certificate that happens to share the same certifiedToDate and
       link total as a PREVIOUS one (e.g. a deliberately "wrong" test
       certificate reusing the correct certificate's own numbers) would
       see its inputs as "unchanged" and never auto-fill subTotal at all.
       Found while fixing the loop above, not assumed. */
    lastCertInputsSig = null;
    bindFormReactivity();
    if (mid === 'payments') enhancePaymentVisibility();
    if (mid === 'supplierInvoices') { enhanceInvoiceVisibility(); refreshEquipmentHint(); refreshDuplicateHint(); }
  }
  function installModalWrap() {
    if (!global.UI || !UI.modal || UI.modal.__azdSupplierWrapped) return;
    var orig = UI.modal;
    var wrapped = function (opts) {
      opts = opts || {};
      var origOnOpen = opts.onOpen;
      opts.onOpen = function () {
        if (origOnOpen) origOnOpen();
        setTimeout(onFormOpen, 30); /* بعد desk-grid.js/desk-cell-picker.js (setTimeout(fn,0)) */
      };
      return orig.call(UI, opts);
    };
    wrapped.__azdSupplierWrapped = true;
    UI.modal = wrapped;
  }
  installModalWrap();

  /* ═══════════════════════════════════════════════════════════════════
     ٨ · «تخصيص لاحق» — على مستند سند صرف مُعتمَد له مخصَّص غير مكتمل
        "تخصيص لاحق" (LATER ALLOCATION) — on an APPROVED payment voucher
        with an unallocated remainder
     -----------------------------------------------------------------
     لا نستبدل EntityPage.openDetail — نلحق زرّاً/لوحة صغيرة داخل الشاشة
     العامة نفسها (نمط attachments.js:480-544: عدّاد نافذة يمنع اللوحة من
     الهبوط في نافذة غير نافذتها على اتصال بطيء — نفس الفخّ، نفس العلاج).
     We do NOT replace EntityPage.openDetail — we append a button/small
     panel INSIDE the same generic screen (the attachments.js:480-544
     pattern: a window-generation counter stops the panel landing in the
     wrong window on a slow connection — same trap, same cure). */
  var winGen = 0;
  function trackWindows() {
    if (!global.UI || typeof UI.modal !== 'function' || UI.__azdSupplierWinGen) return;
    var realModal = UI.modal;
    UI.modal = function () { winGen++; return realModal.apply(this, arguments); };
    UI.__azdSupplierWinGen = true;
  }
  trackWindows();
  function sameWindow(gen) {
    if (gen !== winGen) return false;
    var host = document.getElementById('modalHost');
    return !!(host && !host.hidden);
  }

  function unallocatedRemainder(rec) {
    var lines = (rec.lines || []).filter(function (l) { return l && l.invoice && num(l.amount) > 0; });
    var sum = 0; lines.forEach(function (l) { sum += num(l.amount); });
    return num(rec.amount) - sum;
  }
  /* 🔴 مُصلَح (تكامل ١٩ سبتمبر) — الزرّ كان يظهر لأي مؤلِّفٍ للمستند
     («u.id === rec.createdBy» بلا شرط على دوره)، حتى لو كان دوره «admin»
     — بينما الباب نفسه على القاعدة (az_acc_allocate) يقبل فقط
     finance_manager/gm أو المحاسب المؤلِّف (العقد، السطر ١٥) ويرفض غيرهم.
     فكان يظهر زرٌّ يعمل شكلاً ثم يُرفَض فعلاً عند الضغط — وعدٌ كاذب. الآن
     يتّفق الشرطان: finance_manager/gm دائماً، أو المؤلِّف حين يكون دوره
     accountant تحديداً.
     🔴 FIXED (integrator, 19 Sept) — the button used to show for ANY
     author of the document ("u.id === rec.createdBy" with no role check
     at all), even an "admin" — while the DATABASE door itself
     (az_acc_allocate) accepts ONLY finance_manager/gm or the AUTHOR
     ACCOUNTANT (contract, line 15) and refuses everyone else. So the
     button appeared to work and then was genuinely refused on click — a
     false promise. Now both agree: finance_manager/gm always, or the
     author ONLY when their role is specifically accountant. */
  function canAllocateLater(rec) {
    if (rec.status !== 'approved' || rec.payeeType !== 'supplier') return false;
    if (unallocatedRemainder(rec) <= 0.004) return false;
    var u = global.Auth ? Auth.current() : null;
    if (!u) return false;
    return u.role === 'finance_manager' || u.role === 'gm' || (u.id === rec.createdBy && u.role === 'accountant');
  }

  function allocateLaterPanelHTML(rec) {
    var lines = (rec.lines || []).slice();
    var open = approvedOpenInvoicesForSupplier(rec.supplier, null);
    var byId = {}; open.forEach(function (i) { byId[i.id] = i; });
    var rowsHtml = lines.map(function (l, i) { return allocateLaterRowHTML(l, i, byId); }).join('');
    return '<div class="form-section" id="azdAllocateLaterSection"><div class="form-section-title">' +
      esc(L2({ ar: 'تخصيص لاحق', en: 'Later allocation' })) +
      '<button type="button" class="btn btn-outline btn-sm" id="azdAllocLaterAdd" style="margin-inline-start:auto">' +
      (global.UI && UI.icon ? UI.icon('plus', 14) : '+') + ' ' + esc(L2({ ar: 'إضافة سطر', en: 'Add row' })) + '</button></div>' +
      '<p class="small muted">' + esc(L2({ ar: 'غير مخصَّص حالياً', en: 'Currently unallocated' })) + ': <b>' + money(unallocatedRemainder(rec)) + '</b></p>' +
      '<table class="data-table lines-table"><thead><tr><th>#</th><th>' + esc(L2({ ar: 'الفاتورة', en: 'Invoice' })) + '</th><th>' + esc(L2({ ar: 'المبلغ', en: 'Amount' })) + '</th><th></th></tr></thead>' +
      '<tbody id="azdAllocLaterBody">' + rowsHtml + '</tbody></table>' +
      '<div style="margin-top:8px;display:flex;gap:8px">' +
      '<button type="button" class="btn btn-primary btn-sm" id="azdAllocLaterSave">' + esc(L2({ ar: 'حفظ التخصيص', en: 'Save allocation' })) + '</button>' +
      '</div></div>';
  }
  function allocateLaterRowHTML(l, i, byId) {
    var options = '<option value="">' + esc(L2({ ar: '— اختر —', en: '— choose —' })) + '</option>';
    var seen = {};
    Object.keys(byId).forEach(function (id) { seen[id] = true; });
    if (l.invoice && !seen[l.invoice]) {
      var inv = global.Store ? Store.find('supplierInvoices', l.invoice) : null;
      options += '<option value="' + esc(l.invoice) + '" selected>' + esc(inv ? inv.docNo : l.invoice) + '</option>';
    }
    Object.keys(byId).forEach(function (id) {
      var i2 = byId[id];
      options += '<option value="' + esc(id) + '"' + (id === l.invoice ? ' selected' : '') + '>' +
        esc(i2.docNo) + ' · ' + esc(L2({ ar: 'متبقٍّ', en: 'open' })) + ' ' + esc(openAmountLabel(id)) + '</option>';
    });
    return '<tr data-alrow="' + i + '"><td class="num">' + (i + 1) + '</td>' +
      '<td><select class="select input-sm" data-alfield="invoice">' + options + '</select></td>' +
      '<td><input type="number" step="0.01" class="input input-sm" data-alfield="amount" value="' + (l.amount != null ? esc(l.amount) : '') + '"></td>' +
      '<td><button type="button" class="row-btn danger" data-alrm="' + i + '">✕</button></td></tr>';
  }
  function readAllocateLaterRows() {
    var rows = [];
    document.querySelectorAll('#azdAllocLaterBody [data-alrow]').forEach(function (tr) {
      var inv = tr.querySelector('[data-alfield="invoice"]');
      var amt = tr.querySelector('[data-alfield="amount"]');
      var lineIdEl = tr.getAttribute('data-lineid');
      rows.push({ lineId: lineIdEl || newLineId(), invoice: inv ? inv.value : '', amount: amt ? num(amt.value) : 0 });
    });
    return rows;
  }
  function bindAllocateLaterPanel(rec) {
    var section = document.getElementById('azdAllocateLaterSection');
    if (!section) return;
    document.querySelectorAll('#azdAllocLaterBody [data-alrow]').forEach(function (tr, i) {
      var l = (rec.lines || [])[i];
      if (l && l.lineId) tr.setAttribute('data-lineid', l.lineId);
    });
    var add = document.getElementById('azdAllocLaterAdd');
    if (add) add.addEventListener('click', function () {
      var body = document.getElementById('azdAllocLaterBody');
      var open = approvedOpenInvoicesForSupplier(rec.supplier, null);
      var byId = {}; open.forEach(function (i) { byId[i.id] = i; });
      var idx = body.querySelectorAll('[data-alrow]').length;
      body.insertAdjacentHTML('beforeend', allocateLaterRowHTML({}, idx, byId));
    });
    section.querySelectorAll('[data-alrm]').forEach(function (b) {
      b.addEventListener('click', function () { b.closest('tr').remove(); });
    });
    var save = document.getElementById('azdAllocLaterSave');
    if (save) save.addEventListener('click', function () {
      if (!global.Auth || typeof Auth.client !== 'function') return;
      var rows = readAllocateLaterRows().filter(function (r) { return r.invoice && r.amount > 0; });
      Auth.client().rpc('az_acc_allocate', { p_payment: rec.id, p_lines: rows }).then(function (res) {
        if (res.error) { if (global.UI) UI.toast(res.error.message || L2({ ar: 'تعذّر التخصيص', en: 'Allocation failed' }), 'error', 6000); return; }
        if (global.UI) UI.toast(L2({ ar: 'تمّ التخصيص', en: 'Allocated' }), 'success');
        var reload = (global.Store && Store.reload) ? Store.reload() : Promise.resolve();
        reload.then(function () { setTimeout(function () { EntityPage.openDetail('payments', rec.id); }, 60); });
      }).catch(function (e) { if (global.UI) UI.toast(String(e && e.message || e), 'error', 6000); });
    });
  }

  function installOpenDetailInject() {
    if (!global.EntityPage || EntityPage.__azdSupplierInjected) return;
    var orig = EntityPage.openDetail;
    EntityPage.openDetail = function (moduleId, id) {
      orig.apply(EntityPage, arguments);
      if (moduleId !== 'payments') return;
      var gen = winGen;
      setTimeout(function () { injectAllocateLater(id, gen); }, 150);
    };
    EntityPage.__azdSupplierInjected = true;

    function injectAllocateLater(id, gen) {
      var body = document.getElementById('modalBody');
      if (!body || document.getElementById('azdAllocateLaterSection')) return;
      if (!sameWindow(gen)) return;
      var rec = global.Store ? Store.find('payments', id) : null;
      if (!rec || !canAllocateLater(rec)) return;
      var div = document.createElement('div');
      div.innerHTML = allocateLaterPanelHTML(rec);
      body.insertBefore(div.firstChild, body.firstChild.nextSibling || null);
      bindAllocateLaterPanel(rec);
    }
  }
  installOpenDetailInject();

  global.DeskSupplierDocs = {
    invoiceOpenAmount: invoiceOpenAmount,
    approvedOpenInvoicesForSupplier: approvedOpenInvoicesForSupplier,
    canAllocateLater: canAllocateLater,
    unallocatedRemainder: unallocatedRemainder
  };
  console.info('desk-supplier-docs.js ready — payments.lines (allocations) + supplierInvoices.lines (certificate links) + «تخصيص لاحق».');
})(window);

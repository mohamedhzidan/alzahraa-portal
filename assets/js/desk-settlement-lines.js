/* =========================================================================
   desk-settlement-lines.js — تسجيل بنود «تسوية عهدة» (lines) وquickEntry
                              Registers "custody settlement" LINES (mod.lines)
                              and its quickEntry contract
   -------------------------------------------------------------------------
   مكتب المحاسب — v2.0.38 · ACCOUNTANT'S DESK — v2.0.38. جزء من «مكتب المحاسب» (الشريحة ٢: العهدة +
      لوحة المفاتيح).

   لماذا ملف مستقل، لا تعديل desk-finance-modules.js · WHY A SEPARATE FILE,
   NOT AN EDIT TO desk-finance-modules.js
   -------------------------------------------------------------------------
   desk-finance-modules.js (الشريحة ١) يقول صراحةً في رأسه: «لا quickEntry
   ولا lines ولا validate على الوحدتين الجديدتين — هذه أعمال الشريحة ٢».
   ذلك الملف مُختبَر وأخضر بالفعل (t02/t03/t04) بشكله الحالي؛ إضافة كتلة
   ضخمة إليه تُخاطر بكسر شيء أخضر بلا داعٍ. بدلاً من ذلك نتبع نمط الملف
   نفسه (S.get يعيد نفس مرجع الكائن دائماً — انظر desk-finance-modules.js:
   240-244) فنُحضر الوحدة بـ Schema.get ونُضيف إليها .lines و.quickEntry
   بعد التحميل — إضافيّ بحت، وحذف هذا الملف وحده يعيد الشاشة إلى حقول رأس
   فقط (بلا أسطر) بالضبط كما كانت في الشريحة ١.
   desk-finance-modules.js (slice 1) says in its own header: "no
   quickEntry/lines/validate on the two new modules — slice 2's job." That
   file is already tested green (t02/t03/t04) as it stands; adding a large
   block to it risks breaking something green for no reason. Instead we
   follow its OWN pattern (Schema.get always returns the SAME object
   reference — see desk-finance-modules.js:240-244) and fetch the module,
   then add .lines/.quickEntry onto it after load — purely additive, and
   deleting only this file returns the screen to header-fields-only, no
   lines at all, exactly slice 1's shape.

   شكل الأسطر مطابق لعمود قاعدة البيانات الحقيقي · LINE SHAPE MATCHES THE
   REAL DATABASE COLUMN
   -------------------------------------------------------------------------
   الملف 87 · 87-CUSTODY-DOCUMENTS.sql (az_acc_settlement_guard، az_acc_review_lines)
   يقرأ من كل بند: lineId, account, amount, description, decision,
   decisionReason, history — بالحرف. lineId يُولَّد هنا محلياً (نصّ فريد
   داخل هذا المستند وحده يكفي — القرار لا يُضبط قبل الإرسال، فلا تعارض
   ممكناً في az_acc_settlement_guard's uniqueness check قبل ذلك) ويُخفى
   بصرياً (desk.css) لأنه ليس بيانات يكتبها المحاسب.
   file 87 · 87-CUSTODY-DOCUMENTS.sql (az_acc_settlement_guard, az_acc_review_lines)
   reads from every line: lineId, account, amount, description, decision,
   decisionReason, history — verbatim. lineId is generated here, locally
   (unique within THIS document alone is enough — no decision is ever set
   before submit, so az_acc_settlement_guard's uniqueness check cannot
   conflict before then) and hidden visually (desk.css) because it is not
   something the accountant types.

   يُحمَّل بعد desk-finance-modules.js وقبل desk-grid.js (كتلة الملفات
   بعد design-b-search.js، خطة الملفات §9.1).
   Loads after desk-finance-modules.js and before desk-grid.js (the file
   block after design-b-search.js, file plan §9.1).
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('desk-settlement-lines.js needs schema.js first — not installed'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var _seq = 0;
  /* توليد lineId جديد لكل سطر فارغ — يُستدعى من desk-grid.js أيضاً عند
     إضافة سطر (نفس الدالّة، لا نسخة ثانية).
     Generate a fresh lineId for every blank line — also called from
     desk-grid.js when a row is added (the SAME function, no second copy).

     🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (الشريحة ٢، صيد الأخطاء) — كان
     التوليد القديم 'l' + Date.now().toString(36) + '_' + seq مع seq
     يبدأ من صفر في كل تحميل صفحة جديد (متغيّر _seq محليّ للإغلاق). فجهازان
     يفتحان أول تسوية عهدة في نفس المللي‌ثانية (حالة واقعية: محاسبان في
     موقعين يبدآن العمل معاً صباحاً) يولّدان lineId مطابقاً تماماً — والقيد
     UNIQUE في az_acc_settlement_guard (الملف 87) يرفض
     حينها المستند الثاني بالكامل، لكل الشركة، لسببٍ لا علاقة له بمحتواه.
     الإصلاح: crypto.randomUUID() لا يعتمد على الوقت إطلاقاً، فتصادمه غير
     ممكن عملياً حتى لو تطابق التوقيت تماماً. الاحتياطي (لا Web Crypto
     كاملاً — متصفّحات قديمة جداً أو صفحات غير HTTPS) يستعمل ١٦ بايت عشوائياً
     من crypto.getRandomValues بدل عدّاد الوقت القديم؛ والاحتياطي الأخير
     (لا Web Crypto إطلاقاً) يبقي العدّاد القديم لكن يضيف كسراً عشوائياً
     إضافياً فوقه، فيبقى أفضل من السابق حتى في أسوأ الأحوال.
     🔴 A SERIOUS defect found by actually running this (slice 2, bug
     hunt) — the OLD generator was 'l' + Date.now().toString(36) + '_' +
     seq, with seq starting at ZERO on every fresh page load (the _seq
     variable lives only in this closure). Two devices opening their
     FIRST custody settlement in the same millisecond (a realistic case:
     two site accountants both starting work at the same moment) produce
     an IDENTICAL lineId — and az_acc_settlement_guard's UNIQUE constraint
     (file 87) then refuses the SECOND document entirely,
     company-wide, for a reason that has nothing to do with its content.
     THE FIX: crypto.randomUUID() has no time dependency at all, so a
     collision is not practically possible even with identical timing.
     The fallback (no Web Crypto at all — very old browsers or non-HTTPS
     pages) uses 16 random bytes from crypto.getRandomValues instead of
     the old time counter; the last-resort fallback (no Web Crypto
     whatsoever) keeps the old counter but adds an extra random fraction
     on top, so even the worst case is better than before. */
  function newLineId() {
    if (global.crypto && typeof global.crypto.randomUUID === 'function') {
      return 'l' + global.crypto.randomUUID();
    }
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      var bytes = new Uint8Array(16);
      global.crypto.getRandomValues(bytes);
      var hex = '';
      for (var i = 0; i < bytes.length; i++) { hex += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16); }
      return 'l' + hex;
    }
    _seq += 1;
    return 'l' + Date.now().toString(36) + '_' + _seq + '_' + Math.random().toString(36).slice(2, 10);
  }

  var LINE_FIELDS = [
    /* مخفيّ بصرياً (desk.css: nth-child على الخلية الثانية) — انظر رأس
       الملف. Hidden visually (desk.css targets the 2nd cell) — see header. */
    F('lineId', '', '', 'text', { width: '0' }),
    F('account', 'الحساب', 'Account', 'ref', { ref: 'accounts', refLabel: 'name', required: true, width: '190px' }),
    F('costItem', 'بند التكلفة', 'Cost item', 'ref', { ref: 'costItems', refLabel: 'name', width: '160px' }),
    F('equipment', 'المعدة', 'Equipment', 'ref', { ref: 'equipment', refLabel: 'name', width: '150px' }),
    F('amount', 'المبلغ', 'Amount', 'money', { required: true, width: '120px' }),
    F('description', 'البيان', 'Description', 'text', { required: true, width: '180px' }),
    /* 🔴 عطلٌ خطير وُجد بالتشغيل الفعلي (job3) — كان هذا الحقل يحمل الاسم
       «paperRef» نفسه بالحرف الذي يحمله حقل رأس النموذج (desk-finance-
       modules.js:109، مرجع ورقة الإدخال المركزي «نيابةً عن موقع») — واسمان
       متطابقان لعنصرين داخل نفس <form id="entForm"> يعني أنّ حقل الرأس
       وحقول كل سطر تتشارك name="paperRef" جميعاً. أثبتُّ بالتشغيل
       (zz-paperref-collision.js): حقل الرأس نفسه (فارغ في الشاشة، بلا أي
       لمسة من المستخدم) كان يُحفَظ بقيمة آخر سطرٍ لمسه المستخدم فعلياً —
       فتلوّث حقل الرأس بصمت من بيانات سطر لا علاقة له به. النتيجة
       العملية الأخطر: az_acc_start_correction ينسخ حقل الرأس هذا حرفياً
       إلى مسودة التصحيح الجديدة، فيرفضها az_acc_paper_identity_guard
       فوراً بحجة «هذا المرجع مسجَّل من قبل بنفس المستند» — أي مستند فيه
       أي سطرٍ يحمل مرجع ورقة (الحالة الطبيعية دائماً) كان سيفشل في فتح
       تصحيحه إلى الأبد. الإصلاح: تسمية مستقلة كلياً لحقل السطر
       (linePaperRef) — لا تصادم اسمٍ ممكن بعدها، ولا تُقرأ هذه السلسلة من
       أي دالّة SQL إطلاقاً (بحثتُ: az_acc_… / az_p12_… لا تلمس مفتاح
       'paperRef' داخل JSON بند واحد قط، فالتغيير آمن بلا أي أثر آخر).
       التسمية الظاهرة للمستخدم (العربي/الإنجليزي) لم تتغيّر — فقط المفتاح
       الداخلي، تماماً كما lineId مخفيّ داخلياً أعلاه.
       🔴 A SERIOUS defect found by actually running this (job3) — this
       field carried the EXACT same name, "paperRef", as the FORM
       HEADER's own field (desk-finance-modules.js:109, the paper
       reference for a central "on behalf of site" entry) — two identical
       `name` attributes inside the SAME `<form id="entForm">` means the
       header field and every line's field all share name="paperRef".
       PROVEN by running it (zz-paperref-collision.js): the header field
       itself (empty on screen, never touched by the user) got SAVED with
       whatever value the user last typed into ANY line — silently
       corrupted by data belonging to an unrelated field. The worst
       practical consequence: az_acc_start_correction copies this header
       field VERBATIM into the new correction draft, which
       az_acc_paper_identity_guard then immediately refuses with "this
       reference is already recorded on this same document" — meaning
       ANY document where any line ever carried a paper reference (the
       normal case, always) could never have its correction opened, at
       all. The fix: give the LINE field its own, wholly distinct
       internal name (linePaperRef) — no name collision is possible
       afterward, and no SQL function ever reads a 'paperRef' key inside
       a single line's JSON at all (checked: none of az_acc_… / az_p12_…
       touch it), so this rename is safe with no other effect. The
       user-visible label (Arabic/English) is unchanged — only the
       internal key, exactly like lineId is already internal above. */
    F('linePaperRef', 'مرجع الورقة', 'Paper reference', 'text', { width: '120px' }),
    /* حقول اختيارية — البند الصغير ٧ في المعاينة: موجودة دائماً، تظهر خلف
       تبديل «▸ المزيد» فقط (desk-grid.js يبنيه) حتى لا تُثقِل الشبكة.
       Optional fields — small item 7 in the preview: always present,
       shown only behind a "▸ More" toggle (desk-grid.js builds it) so
       they never crowd the fast grid. */
    F('supplier', 'المورد', 'Supplier', 'ref', { ref: 'suppliers', refLabel: 'name', more: true }),
    F('supplierInvoice', 'فاتورة المورد', 'Supplier invoice', 'ref', { ref: 'supplierInvoices', refLabel: 'docNo', more: true }),
    F('lineDate', 'تاريخ الورقة', 'Paper date', 'date', { more: true }),
    F('project', 'المشروع', 'Project', 'ref', { ref: 'projects', refLabel: 'name', more: true }),
    F('liters', 'لترات', 'Litres', 'number', { more: true })
  ];

  /* ── التحقّق عند الحفظ (كل ضغطة حفظ، مسودة أو غيرها) ─────────────────────
     VALIDATION AT SAVE (every Save press, draft or otherwise)
     -------------------------------------------------------------------------
     لا نمنع حفظ مسودة بها سطور ناقصة — هذا عمل مشروع (حفظ نصف شغل) ويطابق
     فلسفة الأزرار الثلاثة في save-modes.js. المُمنَع فقط: مستند بلا سطر
     واحد مكتمل إطلاقاً (لا حساب+مبلغ+بيان في أي سطر) — تطابق القاعدة
     نفسها (az_acc_settlement_guard الفقرة أ تفحص عند الإرسال فقط، فهذا
     تحقّق أبكر بنفس الرسالة، لا بديلاً عنه).
     We do NOT block saving a draft with incomplete lines — that is
     legitimate (saving half a day's work) and matches the three-button
     philosophy in save-modes.js. The ONLY thing blocked: a document with
     not even ONE fully complete line (no account+amount+description on
     any line) — matching the DATABASE's own rule (az_acc_settlement_guard
     paragraph (a) checks only at submit) — this is an EARLIER check with
     the same message, not a replacement for it. */
  function lineIsComplete(ln) {
    return !!(ln && ln.account && Number(ln.amount) > 0 && ln.description && String(ln.description).trim());
  }
  function lineIsStarted(ln) {
    return !!(ln && (ln.account || (ln.description && String(ln.description).trim()) ||
      (ln.amount !== null && ln.amount !== undefined && ln.amount !== '' && Number(ln.amount) !== 0)));
  }
  function validateSettlement(draft) {
    var lines = draft.lines || [];
    var any = lines.some(lineIsComplete);
    if (!any) {
      return { ar: 'لا يوجد سطر مكتمل — أضف سطراً واحداً على الأقل (حساب + مبلغ + بيان)',
                en: 'No complete line yet — add at least one (account + amount + description)' };
    }
    return null;
  }

  var MOD = S.get('custodySettlements');
  if (!MOD) {
    console.error('desk-settlement-lines.js: module "custodySettlements" not found (desk-finance-modules.js not loaded first?) — no lines added');
  } else if (MOD.lines) {
    console.info('desk-settlement-lines.js: mod.lines already present — nothing to add (idempotent re-run)');
  } else {
    MOD.lines = {
      label: { ar: 'سطور التسوية', en: 'Settlement lines' },
      fields: LINE_FIELDS,
      /* الإجمالي المُطالَب به حيّاً — نفس ما تُثبِّته القاعدة عند الإرسال،
         محسوب هنا أولاً بأول لعرضه قبل أي حفظ (recalc عامة، entity.js:682-686).
         The claimed total, LIVE — the same figure the database pins at
         submit, computed here first for on-screen display before any save
         (the generic recalc, entity.js:682-686). */
      totals: [{ field: 'amount', target: 'totalAmount', label: { ar: 'الإجمالي المُطالَب به', en: 'Claimed total' } }],
      validate: validateSettlement
    };
    /* عقد الإدخال السريع — يقرأه desk-grid.js فقط، لا يُغيّر شيئاً في
       entity.js. steps: ترتيب Enter الأساسي؛ equipmentWhen: دالّة تقرّر
       هل خانة المعدة مطلوبة الآن بحسب بند التكلفة (K05 وبند الخطة ١).
       The quick-entry CONTRACT — read only by desk-grid.js, changes
       nothing in entity.js. steps: the base Enter order; equipmentWhen: a
       function deciding whether the equipment cell is needed NOW, based
       on the cost item (K05 / plan item 1). */
    MOD.quickEntry = {
      steps: ['account', 'costItem', 'equipment', 'amount', 'description', 'linePaperRef'],
      moreFields: ['supplier', 'supplierInvoice', 'lineDate', 'project', 'liters'],
      equipmentWhen: function (line) {
        /* 🔴 القيمة المحفوظة هي 'equipment' (المفتاح الإنجليزي)، لا 'معدات'
           (تسمية العرض فقط) — schema.js:39 COST_TYPES. عُثر عليه بقراءة
           schema.js قبل الاستعمال، لا بتجربة فاشلة — المعاينة استعملت
           'معدات' لأن بياناتها الوهمية بُنيت هكذا محلياً فقط، وهذا لا
           ينطبق على شاشة حقيقية.
           🔴 The STORED value is 'equipment' (the English key), not
           'معدات' (its display label only) — schema.js:39 COST_TYPES.
           Found by reading schema.js before use, not by a failed trial —
           the preview used 'معدات' because its own mock data was built
           that way locally only; that does not carry over to a real screen. */
        var ci = line && line.costItem ? (global.Store && Store.find ? Store.find('costItems', line.costItem) : null) : null;
        return !!(ci && ci.type === 'equipment');
      },
      newLine: function () {
        var o = {};
        LINE_FIELDS.forEach(function (f) { o[f.name] = f.default !== undefined ? f.default : (f.type === 'number' || f.type === 'money' ? null : ''); });
        o.lineId = newLineId();
        return o;
      }
    };
    console.info('desk-settlement-lines.js: mod.lines + mod.quickEntry attached to custodySettlements (' +
      LINE_FIELDS.length + ' line fields, steps: ' + MOD.quickEntry.steps.join(' → ') + ').');
  }

  global.DeskSettlementLines = { LINE_FIELDS: LINE_FIELDS, newLineId: newLineId, lineIsComplete: lineIsComplete, lineIsStarted: lineIsStarted };
})(window);

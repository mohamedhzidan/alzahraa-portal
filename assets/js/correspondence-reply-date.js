/* =========================================================================
   correspondence-reply-date.js — تاريخ الرد الفعلي على المراسلات
   -------------------------------------------------------------------------
   المشكلة · THE PROBLEM

   شاشة المراسلات (correspondence, departments.js:640) تحمل «موعد الرد»
   (replyDue) و«تم الرد» (replied، مربع اختيار) — لكن لا تاريخ فعلياً لمتى
   وصل الرد. فسؤال «الاستشاري بيرد على خطاباتنا في كام يوم» يبقى بلا رقم
   حقيقي على الخطابات، رغم أن نفس السؤال له إجابة على طلبات المعلومات
   والاعتمادات لأن الحقل موجود هناك أصلاً.
   The correspondence screen carries a reply-DUE date and a replied
   CHECKBOX, but no date for when the reply actually arrived. "How many
   days does the consultant take to reply to our letters" has no real
   number on letters — even though the identical question already has an
   answer on RFIs and submittals, because the field already exists there.

   لماذا حقل جديد بهذا الاسم بالضبط · WHY A NEW FIELD, WITH THIS EXACT NAME

   بحثتُ كتلة حقول correspondence كاملة (departments.js:645-673): صفر
   تكرار لـ replyDate اليوم — لا تصادم، لا تكرار (فخ trade/trades لا ينطبق).
   الاسم والنص العربي منسوخان حرفياً من rfi.replyDate (departments.js:586:
   «تاريخ الرد الفعلي» / "Actual reply date") لا من نص submittals الأقصر
   («تاريخ الرد»، :630) — هذا مقصود من الخطة تحديداً، لأنه الأوضح في نفي
   الالتباس مع «موعد الرد» (replyDue): «الفعلي» هو ما يميّزهما.
   Searched the whole correspondence field block: replyDate occurs zero
   times today — no collision, no duplicate. Name and Arabic wording are
   copied verbatim from rfi.replyDate ("تاريخ الرد الفعلي" / "Actual reply
   date"), not submittals' shorter wording ("تاريخ الرد") — a deliberate
   choice from the plan, since "الفعلي" (actual) is what keeps it from being
   confused with replyDue (due).

   لا شيء على transmittals · NOTHING ON transmittals

   نفس الفراغ موجود هناك أيضاً، لكن الموافقة كانت صراحة على المراسلات فقط.
   لم يُلمَس transmittals هنا إطلاقاً — لا في هذا الملف ولا في أي مكان آخر.
   The identical gap exists there too, but approval was explicit for
   correspondence only. transmittals is not touched — not here, not
   anywhere else.

   الموضع البصري · VISUAL PLACEMENT — تحقّق حقيقي لا افتراض

   يُدرَج بعد replied في المصفوفة. تحقّقتُ من دالة التجميع الحقيقية
   pages/entity.js:470-478 (groupFields): التجميع بمفتاح النص المُترجَم
   لـ section لا بمرجع الكائن، فيندمج «التواريخ» هنا تلقائياً مع
   noticeDeadline/replyDue/replied — فيظهر الحقل آخر عنصر داخل قسم
   «التواريخ»، مباشرة بعد «تم الرد»، رغم وجود replyRef (قسم آخر: الربط)
   بينهما في ترتيب المصفوفة الخام.
   Inserted after replied in the array. Verified against the real grouping
   function, pages/entity.js:470-478: it keys on the section's TRANSLATED
   TEXT, not object identity, so a fresh { ar:'التواريخ', en:'Dates' }
   literal here merges into the same "Dates" heading as noticeDeadline/
   replyDue/replied. The field renders as the last item under "Dates",
   directly below "تم الرد" — even though replyRef (a different section)
   sits between them in the raw array.

   إضافي بالكامل · ADDITIVE. احذف هذا الملف ويعود correspondence لسابق
   عهده تماماً — الحقل يختفي من الشاشة والمصفوفة. لا يُفقَد شيء حتى لو كان
   عمود القاعدة قد أُضيف من قبل (ملف SQL منفصل، وله رجعته الخاصة).
   Delete this file and correspondence reverts exactly. The field
   disappears from the screen and the array. Nothing is lost even if the
   database column was already added (a separate SQL file, its own undo).

   ⚠️ يُحمَّل بعد departments.js حصراً · MUST LOAD AFTER departments.js
   SPECIFICALLY — not merely after schema.js

   خلافاً لـ expected-collection-field.js (يعمل على clientIPCs من schema.js
   نفسه، فيُحمَّل قبل departments.js اليوم): correspondence يسجّله
   departments.js وحده داخل extraById الخاصة به، وS.get('correspondence')
   لا يُرجِع شيئاً قبل تحميل ذلك الملف. الحارس أدناه يتجاهل الوضع بصمت لو
   حُمِّل هذا الملف مبكراً جداً — لا خطأ صارخ، لكن الحقل لن يُضاف. راجع
   WIRING-NOTES.md لموضع loader.js الدقيق.
   Unlike expected-collection-field.js (operates on a schema.js module, so
   it loads BEFORE departments.js today): correspondence is registered by
   departments.js alone. S.get('correspondence') resolves to nothing before
   that file has run. The guard below silently no-ops if loaded too early —
   no loud error, the field just never gets added. See WIRING-NOTES.md.
   ========================================================================= */
(function (global) {
  'use strict';

  if (!global.Schema) { console.error('correspondence-reply-date.js: schema.js must load first'); return; }
  var S = global.Schema;

  function F(name, ar, en, type, extra) {
    return Object.assign({ name: name, label: { ar: ar, en: en }, type: type || 'text' }, extra || {});
  }

  var corr = S.get('correspondence');
  if (corr && corr.fields && !corr.fields.some(function (f) { return f.name === 'replyDate'; })) {
    /* إدراج بعد replied مباشرة — بحث بالاسم كما يفعل expected-collection-
       field.js، لا رقم ثابت قد ينزلق لو تغيّر ترتيب حقول أخرى مستقبلاً.
       Insert right after replied — find-by-name, same as expected-
       collection-field.js, not a fixed index that could drift later. */
    var i = corr.fields.findIndex(function (f) { return f.name === 'replied'; });
    var field = F('replyDate', 'تاريخ الرد الفعلي', 'Actual reply date', 'date', {
      section: { ar: 'التواريخ', en: 'Dates' }
    });
    if (i === -1) corr.fields.push(field); else corr.fields.splice(i + 1, 0, field);
    console.info('correspondence-reply-date.js: replyDate added to correspondence.');
  }
})(window);

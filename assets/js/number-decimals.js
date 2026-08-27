/* ─────────────────────────────────────────────────────────────────────────
   number-decimals.js — لا تُقرَّب الأرقام العشرية إلى صحيح عند العرض والطباعة

   العلّة: ui.js:201-202 يعرض كل حقل type:'number' عبر I18N.num(v, 0)،
   وi18n.js:309-313 يقرّب هذا الرقم لصفر منازل عشرية دائماً. هذا المسار
   يغذّي خلايا القوائم (pages/entity.js:153)، وسطر التفاصيل
   (pages/entity.js:349/362)، وأهم من ذلك: الورقة المطبوعة نفسها
   (print.js:207 و222). فمنسوب مساحي حقيقي 98.76 يظهر ويُطبَع «99» — فرق
   24 سم على شيت مناسيب موقَّع من المهندس. حجم خرسانة 7.5 م³ يظهر «8»،
   والسقوط الخرساني (slump) 8.5 يظهر «9» — بينما النموذج المفتوح والقيمة
   المحفوظة فعلياً في القاعدة تظلان صحيحتين طوال الوقت؛ العطل في العرض
   فقط، لكنه يصل الورق الموقَّع.

   الإصلاح إضافي بحت: نلفّ UI.displayValue (كائن UI عادي غير مجمَّد، يُقرأ
   حيّاً في كل نداء بواسطة القوائم/التفاصيل/الطباعة الثلاثة) ونتعامل مع
   type:'number' فقط بمنازل عشرية حتى 3 بلا حشو أصفار — فالعدد الصحيح 98
   يبقى «98» تماماً كما كان. money/percent/calc لا تُلمَس إطلاقاً؛ لها
   تنسيقها الخاص (I18N.money وI18N.pct) ولم يكن فيها هذا العطل أصلاً.

   BUG: ui.js:201-202 renders every type:'number' field through
   I18N.num(v, 0), and i18n.js:309-313 always rounds that to zero decimal
   places. That one path feeds list cells (pages/entity.js:153), the
   detail-view line (pages/entity.js:349/362), and — worse — the PRINTED
   document itself (print.js:207 and :222). A real survey level of 98.76
   displays AND PRINTS as "99" — a 24cm gap on a levels sheet an engineer
   signs. A concrete volume of 7.5 m³ shows "8", a slump of 8.5 shows "9"
   — while the open form and the value actually saved to the server stay
   correct the whole time; the bug is display-only, but it reaches signed
   paper.

   FIX is purely additive: wrap UI.displayValue (a plain, unfrozen object
   read live on every call by all three of list/detail/print) and handle
   only type:'number' with up to 3 decimal places and no zero-padding, so
   a whole number like 98 still renders exactly as "98" as before.
   money/percent/calc are left completely untouched — they already have
   their own formatting (I18N.money / I18N.pct) and never had this bug.
   ───────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* لو ui.js لم يُحمَّل بعد (ترتيب تحميل خاطئ) لا يوجد شيء نلفّه — لا نكسر شيئاً
     If ui.js has not loaded yet (a load-order mistake) there is nothing to
     wrap — fail silently rather than break the page. */
  if (typeof window === 'undefined' || !window.UI || typeof window.UI.displayValue !== 'function') return;

  var originalDisplayValue = window.UI.displayValue;

  /* منفصل عمداً عن I18N.num(v, 0): يسمح بثلاث منازل عشرية دون حشو أصفار،
     فـ 98 تبقى «98»، و98.76 تبقى «98.76»، و7.50 تُختصر إلى «7.5».
     Deliberately separate from I18N.num(v, 0): allows up to 3 decimal
     places with no zero-padding, so 98 stays "98", 98.76 stays "98.76",
     and 7.50 shortens to "7.5". */
  function formatDecimal(v) {
    var n = Number(v);
    if (!isFinite(n)) n = 0;
    return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
  }

  window.UI.displayValue = function (f, rec) {
    if (f && f.type === 'number') {
      var v = rec ? rec[f.name] : undefined;
      return '<span class="num">' + formatDecimal(v) + '</span>';
    }
    /* كل الأنواع الأخرى (money · percent · calc · date · select · ...) تمرّ
       كما كانت تماماً، بلا أي تغيير في تنسيقها.
       Every other type (money · percent · calc · date · select · ...) is
       passed straight through, unchanged. */
    return originalDisplayValue(f, rec);
  };
})();
